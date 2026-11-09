/** Opt-in arm H: the real Codex or Claude Code CLI agent, run natively in a
 * per-decision workspace (files, shell, edit → check → fix), confined by bwrap with
 * model-API-only egress. It talks to the night through the `night` CLI only. */
import { existsSync } from 'node:fs';
import { chmod, copyFile, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import type { AgentBackend, Choice, ProposeContext } from '../agent.js';
import { decodeProposalResponse } from '../agent.js';
import { llmRecordPath, llmRecordSchema } from '../backends/recording.js';
import type { LoopDeps, NightInput } from '../night.js';
import type { RepairContext } from '../prompts.js';
import type { QueryBundle } from '../quality-queries.js';
import { llmChoiceSchema } from '../../../app/src/dashboard/agent-evidence.js';
import { stableStringify } from '../program.js';
import { readJson, writeJson } from '../util.js';
import { auditLaunch, claudeTokenValidityMs, launchUsage, prepareLaunch, type AgentConfig, type LaunchAudit, type LaunchUsage } from './agents.js';
import { startEgressProxy, type EgressEvent } from './egress.js';
import { HarnessBudgetError, HarnessHost, HarnessReplayError, serveHarnessSpool, type HarnessEvent } from './host.js';
import { harnessSandboxArgs, runSandboxed, type SandboxRun } from './sandbox.js';
import { DEFAULT_HARNESS_BUDGET, harnessBudgetSchema, harnessLoopSchema, type HarnessBudget, type HarnessLoopStats } from './stats.js';
import { harnessWorkspace, workspaceHash } from './workspace.js';
export { HarnessBudgetError } from './host.js';

export const HARNESS_SYSTEM = 'Arm H: native CLI agent in a per-decision workspace. Instructions are README.md in the workspace; the night CLI is the only channel to the harness.';
export function harnessPrompt(kind: 'propose' | 'repair' | 'continue') {
  const base = 'You are working in /work, a workspace prepared for one overnight interface-design decision. Read README.md first and follow it. Work natively: read files, write notes, scripts and patch files in /work, and use the `night` CLI to check, estimate and submit. The decision ends only when `night submit` succeeds; after that, stop.';
  if (kind === 'repair') return `${base}\n\nYou already submitted once. Final certification rejected the submitted combination; REPAIR.md describes the failure. Repair against the original current program (program.json), then submit again. Your earlier notes and files are still in /work.`;
  if (kind === 'continue') return `${base}\n\nAn earlier session in this workspace ended without a successful \`night submit\`. Its notes and files are still in /work. Run \`night status\`, finish quickly, and submit (or submit --no-change).`;
  return base;
}

export interface HarnessOptions extends AgentConfig {
  /** Sample directory: the summary record and per-launch transcripts are written here. */
  runDir: string;
  budget?: HarnessBudget;
  /** Re-verification: the recorded sample directory whose night commands must re-execute identically. */
  replayFrom?: string;
  persist?: (event: HarnessEvent) => Promise<void>;
  /** Test hook: wait for the host's Claude access token to cover a launch (default true for claude). */
  ensureToken?: (neededMs: number) => Promise<void>;
}
interface LaunchRecord { launch: number; prompt: string; args: string[]; code: number | null; signal: string | null; timedOut: boolean; stdoutTruncated: boolean; wallMs: number;
  usage: LaunchUsage; audit: LaunchAudit; egress: EgressEvent[]; stderrTail: string; transcript: string; final: string | null }

export class HarnessNightAgent implements AgentBackend {
  readonly budget: HarnessBudget;
  readonly host: HarnessHost;
  readonly launches: LaunchRecord[] = [];
  private readonly start = Date.now();
  private readonly files: Record<string, string>;
  private root: string | null = null;
  private choice: Choice | null = null;
  private repair: RepairContext | undefined;
  private exceeded: string | null = null;
  private changedFiles = 0;
  private replayTokens: HarnessLoopStats['tokens'] | null = null;
  constructor(private readonly input: NightInput, deps: LoopDeps, bundle: QueryBundle, private readonly opts: HarnessOptions) {
    this.budget = harnessBudgetSchema.parse(opts.budget ?? DEFAULT_HARNESS_BUDGET);
    this.host = new HarnessHost(input, deps, bundle, this.budget, opts.persist);
    this.files = harnessWorkspace(input, bundle, this.budget);
  }
  get name() { return this.opts.harness === 'script' ? 'scripted' : this.opts.harness; }
  get model() { return this.opts.model ?? `${this.opts.harness}-cli-default`; }
  get workspaceSha256() { return workspaceHash(this.files); }
  toolPrompt(repair?: RepairContext) { this.repair = repair; return { system: HARNESS_SYSTEM, prompt: this.header() }; }
  private header() {
    const i = this.input;
    return `Night ${i.night}; persona ${i.persona.id}; role ${i.current.role}; current version ${i.current.version}; spec ${i.release.spec.version}. Workspace sha256 ${this.workspaceSha256}. Budget ${JSON.stringify(this.budget)}.`;
  }

  /** Workspace, private home and control directory under one private temp root. */
  private async prepare() {
    if (this.root) return this.root;
    const root = this.root = await mkdtemp(path.join(tmpdir(), 'agent-harness-'));
    await chmod(root, 0o700);
    const ws = path.join(root, 'work'), home = path.join(root, 'home'), ctl = path.join(root, 'control');
    for (const d of [ws, home, ctl, path.join(root, 'spool'), path.join(ctl, 'bin')]) await mkdir(d, { recursive: true });
    for (const [name, text] of Object.entries(this.files)) {
      const file = path.join(ws, name); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, text, { mode: 0o444 });
    }
    await copyFile(new URL('./entry.mjs', import.meta.url), path.join(ctl, 'entry.mjs'));
    await copyFile(new URL('./night-cli.mjs', import.meta.url), path.join(ctl, 'bin', 'night'));
    await chmod(path.join(ctl, 'bin', 'night'), 0o555);
    return root;
  }
  private remainingMs() { return this.budget.wallMs - (Date.now() - this.start); }

  private async launch(kind: 'propose' | 'repair' | 'continue') {
    const root = await this.prepare(), ws = path.join(root, 'work'), home = path.join(root, 'home'), ctl = path.join(root, 'control'), spool = path.join(root, 'spool');
    const index = this.launches.length;
    this.host.launch = index;
    if (this.opts.harness === 'claude') await (this.opts.ensureToken ?? ensureClaudeToken)(Math.min(this.remainingMs(), this.budget.wallMs) + 60_000);
    const spec = await prepareLaunch(this.opts, home, ctl, index);
    const egress: EgressEvent[] = [];
    await rm(path.join(ctl, 'egress.sock'), { force: true });
    for (const f of await readdir(spool)) await rm(path.join(spool, f), { force: true });
    const stopEgress = await startEgressProxy(path.join(ctl, 'egress.sock'), spec.hosts, e => egress.push(e));
    const stopHost = await serveHarnessSpool(spool, this.host);
    const prompt = harnessPrompt(kind), started = Date.now();
    let run: SandboxRun;
    try {
      run = await runSandboxed(harnessSandboxArgs({ workspace: ws, home, control: ctl, spool, readOnly: spec.readOnly }, spec.command, spec.args, spec.env), prompt, Math.max(1000, this.remainingMs()));
    } finally { await stopHost(); await stopEgress(); }
    const finalFile = path.join(home, `final-${index}.txt`);
    const record: LaunchRecord = { launch: index, prompt, args: spec.args, code: run.code, signal: run.signal, timedOut: run.timedOut, stdoutTruncated: run.stdoutTruncated, wallMs: Date.now() - started,
      usage: launchUsage(this.opts.harness, run.stdout), audit: auditLaunch(this.opts.harness, run.stdout), egress, stderrTail: run.stderr.slice(-8000), transcript: `harness/launch-${index}.jsonl`,
      final: existsSync(finalFile) ? (await readFile(finalFile, 'utf8')).slice(0, 20_000) : null };
    await mkdir(path.join(this.opts.runDir, 'harness'), { recursive: true });
    await writeFile(path.join(this.opts.runDir, record.transcript), run.stdout);
    await writeJson(path.join(this.opts.runDir, 'harness', `launch-${index}.json`), record);
    this.launches.push(record);
  }

  async proposeCandidates(ctx: ProposeContext) {
    const firstEvent = this.host.events.length, firstLaunch = this.launches.length;
    if (ctx.purpose === 'repair') {
      this.host.beginLoop();
      const r = this.repair;
      if (!this.opts.replayFrom) { const root = await this.prepare(); await writeFile(path.join(root, 'work', 'REPAIR.md'), `# Final certification rejected the submission\n\n\`\`\`json\n${JSON.stringify(r ? { patch: r.failedPatch, check: r.check, attempt: r.attempt, maxAttempts: r.maxAttempts } : null, null, 1)}\n\`\`\`\n`); }
    }
    try {
      if (this.opts.replayFrom) await this.reverify(ctx);
      else {
        let kind: 'propose' | 'repair' | 'continue' = ctx.purpose === 'repair' ? 'repair' : 'propose';
        while (!this.host.done) {
          if (this.launches.length >= this.budget.maxLaunches) throw new HarnessBudgetError('agent ended without night submit (launch budget exhausted)');
          if (this.remainingMs() <= 5_000) throw new HarnessBudgetError('wall time budget exhausted');
          await this.launch(kind);
          kind = 'continue';
          if (this.launches.at(-1)?.timedOut && !this.host.done) throw new HarnessBudgetError('wall time budget exhausted');
        }
      }
    } catch (error) {
      if (error instanceof HarnessBudgetError) this.exceeded = error.message;
      await this.writeSummary(ctx, null, error instanceof Error ? error.message : String(error), firstEvent, firstLaunch);
      throw error;
    }
    const final = this.host.final;
    const call = await this.writeSummary(ctx, final, null, firstEvent, firstLaunch);
    this.choice = { ...llmChoiceSchema.parse(final), call };
    return { ...decodeProposalResponse(final, ctx.source, ctx.callId), call };
  }
  async chooseCandidates() { if (!this.choice) throw new Error('No submitted choice'); return this.choice; }

  /** Replay: same workspace bytes, every recorded night command re-executes to the same output, same submission. */
  private async reverify(ctx: ProposeContext) {
    const source = this.opts.replayFrom ?? '';
    const file = llmRecordPath(source, ctx.callId), failed = file.replace(/\.json$/, '.error.json');
    const recorded = existsSync(file) ? await readJson(file, llmRecordSchema) : existsSync(failed) ? await readJson(failed, llmRecordSchema) : null;
    const t = z.object({ harness: z.object({ workspaceSha256: z.string(), events: z.array(z.custom<HarnessEvent>()), error: z.string().nullable() }), stats: z.object({ tokens: harnessLoopSchema.shape.tokens }) }).safeParse(recorded?.transcript);
    if (!recorded || !t.success) throw new HarnessReplayError(`Harness replay: no recorded summary for ${ctx.callId}`);
    // Recorded usage is reported as a reference; replay itself makes no model calls.
    this.replayTokens = t.data.stats.tokens;
    if (t.data.harness.workspaceSha256 !== this.workspaceSha256) throw new HarnessReplayError('Harness replay: workspace inputs differ from the recording');
    await this.host.reverify(t.data.harness.events);
    if (t.data.harness.error !== null) throw new HarnessBudgetError(t.data.harness.error);
    if (!this.host.done || stableStringify(this.host.final) !== stableStringify(recorded.response)) throw new HarnessReplayError('Harness replay: re-executed submission differs');
  }

  private async agentFiles() {
    if (!this.root) return [];
    const ws = path.join(this.root, 'work'), found: string[] = [];
    const walk = async (dir: string) => { for (const e of await readdir(dir, { withFileTypes: true })) { const f = path.join(dir, e.name); if (e.isDirectory()) await walk(f); else if (e.isFile()) found.push(path.relative(ws, f)); } };
    await walk(ws);
    const changed: string[] = [];
    for (const name of found.sort()) if (this.files[name] === undefined || await readFile(path.join(ws, name), 'utf8') !== this.files[name]) changed.push(name);
    return changed;
  }
  /** Copy files the agent created or changed (bounded) next to the transcript. */
  async snapshot() {
    if (!this.root) return [];
    const changed = await this.agentFiles(), target = path.join(this.opts.runDir, 'harness', 'workspace');
    let total = 0;
    for (const name of changed) {
      const from = path.join(this.root, 'work', name), size = (await stat(from)).size;
      if (total + size > 20_000_000) break;
      total += size; await mkdir(path.dirname(path.join(target, name)), { recursive: true }); await copyFile(from, path.join(target, name));
    }
    this.changedFiles = changed.length;
    return changed;
  }

  stats(): HarnessLoopStats {
    const host = this.host.stats(), sum = (k: 'input' | 'output' | 'cachedInput') => this.launches.every(l => l.usage[k] !== null) ? this.launches.reduce((n, l) => n + (l.usage[k] ?? 0), 0) : null;
    const denied: Record<string, number> = {};
    for (const e of this.launches.flatMap(l => l.egress)) if (!e.allowed) denied[e.host] = (denied[e.host] ?? 0) + 1;
    const findings = this.launches.reduce((n, l) => n + l.audit.findings.length, 0);
    return { harness: this.opts.harness, model: this.model, servedModels: [...new Set(this.launches.flatMap(l => l.usage.servedModels))].sort(), budget: this.budget,
      launches: this.launches.length, turns: this.launches.length && this.launches.every(l => l.usage.turns !== null) ? this.launches.reduce((n, l) => n + (l.usage.turns ?? 0), 0) : null,
      commands: host.commands, checks: host.checks, estimates: host.estimates, tally: host.tally, complaints: host.complaints, wallMs: Date.now() - this.start, exceeded: this.exceeded,
      submitted: this.host.done, tokens: this.replayTokens ?? { input: sum('input'), output: sum('output'), cachedInput: sum('cachedInput') },
      egress: { allowed: this.launches.flatMap(l => l.egress).filter(e => e.allowed).length, denied },
      audit: { status: findings ? 'fail' : 'pass', findings, permissionDenials: this.launches.reduce((n, l) => n + l.audit.permissionDenials, 0) },
      workspaceSha256: this.workspaceSha256, agentFiles: this.changedFiles };
  }

  private async writeSummary(ctx: ProposeContext, final: unknown, error: string | null, firstEvent: number, firstLaunch: number) {
    const stats = this.stats();
    const launches = this.launches.slice(firstLaunch).map(({ transcript, launch, code, timedOut, usage, audit, wallMs }) => ({ transcript, launch, code, timedOut, usage, audit: { status: audit.status, findings: audit.findings.length }, wallMs }));
    const record = { callId: ctx.callId, purpose: ctx.purpose, backend: this.name, model: this.model, servedBy: stats.servedModels.join(',') || null, replayOf: null, promptMatched: null,
      schemaName: 'NightSubmission', system: HARNESS_SYSTEM, prompt: this.header(), response: final,
      usage: { input_tokens: stats.tokens.input, output_tokens: stats.tokens.output, cached_input_tokens: stats.tokens.cachedInput },
      transcript: { harness: { workspaceSha256: this.workspaceSha256, events: this.host.events.slice(firstEvent), launches, error }, stats }, createdAt: new Date().toISOString() };
    const file = llmRecordPath(this.opts.runDir, ctx.callId);
    await writeJson(error === null ? file : file.replace(/\.json$/, '.error.json'), record);
    return { callId: ctx.callId, purpose: ctx.purpose, backend: this.name, model: this.model, servedBy: record.servedBy,
      promptChars: record.system.length + record.prompt.length, promptMatched: null, replayOf: null, file: path.relative(this.opts.runDir, file) };
  }
  async close() {
    if (this.root) { await rm(this.root, { recursive: true, force: true }); this.root = null; }
  }
}

/** The sandboxed claude gets the access token only. If it will not outlast the launch,
 * wait for it to near expiry and let the host's own CLI refresh it with one trivial call. */
export async function ensureClaudeToken(neededMs: number) {
  const { spawnSync } = await import('node:child_process');
  for (let attempt = 0; attempt < 40; attempt++) {
    const valid = claudeTokenValidityMs();
    if (valid === null) throw new Error('Arm H claude harness: no Claude Code OAuth credentials on the host');
    if (valid >= neededMs) return;
    if (valid > 4 * 60_000) { await new Promise(r => setTimeout(r, Math.min(valid - 4 * 60_000, 60_000))); continue; }
    spawnSync(process.env['CLAUDE_BIN'] ?? 'claude', ['-p', 'Reply with the single word ok.', '--max-turns', '1', '--tools', '', '--no-session-persistence', '--output-format', 'json'], { stdio: 'ignore', timeout: 120_000 });
    if ((claudeTokenValidityMs() ?? 0) < neededMs) await new Promise(r => setTimeout(r, 30_000));
  }
  throw new Error('Arm H claude harness: host access token was not refreshed');
}
