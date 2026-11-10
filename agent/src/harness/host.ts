/** Arm H host: serves the night CLI over a private file spool with E/R's check,
 * estimate, query and submit code paths and per-decision quotas. Every request is
 * recorded with its arguments and its exact output. */
import { constants } from 'node:fs';
import { open, readdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { checkPatch, TrainEstimator, type LoopDeps, type NightInput } from '../night.js';
import { currentRenderSamples, validateSubmission, wirePatch } from '../agent-loop.js';
import { queryTraining } from '../query-engine.mjs';
import type { QueryBundle } from '../quality-queries.js';
import { geometryProgramHash } from '../geometry.js';
import type { HarnessBudget } from './stats.js';

export class HarnessBudgetError extends Error {}
export const EXIT = { ok: 0, error: 1, budget: 2, usage: 3 } as const;
export const COMMANDS = ['check', 'estimate', 'render', 'query', 'complain', 'submit', 'status'] as const;
/** What the CLI sends: its argv and, for check/estimate/submit, the named file's text. */
export const harnessRequestSchema = z.object({
  command: z.string().max(40), argv: z.array(z.string().max(8000)).max(40),
  file: z.object({ name: z.string().max(1000), text: z.string().max(4_000_000) }).nullable(),
}).strict();
export type HarnessRequest = z.infer<typeof harnessRequestSchema>;
export interface HarnessReply { exit: number; output: unknown }
export interface HarnessEvent { index: number; launch: number; request: HarnessRequest; exit: number; output: unknown }
const QUERY_FLAGS = ['--day', '--task', '--screen', '--target', '--limit', '--sort'];

class Refusal extends Error { constructor(message: string, readonly exit: number) { super(message); } }
const clean = (message: string) => message.replace(/\/(?:home|tmp|etc|usr|var|proc|run)\/[^\s"'<>]*/g, '[confined path]').slice(0, 2000);

export class HarnessHost {
  readonly events: HarnessEvent[] = [];
  readonly complaints: string[] = [];
  checks = 0; estimates = 0; launch = 0;
  private submission: unknown = undefined;
  private submitted = false;
  private tail: Promise<unknown> = Promise.resolve();
  private readonly current;
  private readonly gate;
  private readonly estimator;
  private readonly files: Readonly<Record<string, string>>;
  constructor(input: NightInput, private readonly deps: LoopDeps, bundle: QueryBundle, readonly budget: HarnessBudget,
    private readonly persist?: (event: HarnessEvent) => Promise<void>) {
    this.current = structuredClone(input.current);
    this.gate = { specVersion: input.release.specVersion, prev: this.current, canonical: input.release.canonical, nextVersion: this.current.version + 1 };
    this.estimator = new TrainEstimator(deps, input, input.release.specVersion);
    this.files = structuredClone(bundle.files);
  }
  get done() { return this.submitted; }
  get final() { if (!this.submitted) throw new Error('No night submit'); return this.submission; }
  beginLoop() { this.submitted = false; this.submission = undefined; }

  /** Serialized: indexes, quotas and results follow arrival order. */
  execute(raw: unknown): Promise<HarnessReply> {
    const pending = this.tail.then(() => this.invoke(raw)); this.tail = pending.catch(() => undefined); return pending;
  }
  private async invoke(raw: unknown): Promise<HarnessReply> {
    const parsed = harnessRequestSchema.safeParse(raw);
    const request: HarnessRequest = parsed.success ? parsed.data : { command: '(invalid)', argv: [], file: null };
    let reply: HarnessReply;
    try {
      if (!parsed.success) throw new Refusal('Invalid night request', EXIT.usage);
      reply = { exit: EXIT.ok, output: await this.dispatch(request) };
    } catch (error) {
      reply = { exit: error instanceof Refusal ? error.exit : EXIT.error, output: { error: clean(error instanceof Error ? error.message : 'night command failed') } };
    }
    const event: HarnessEvent = { index: this.events.length, launch: this.launch, request: structuredClone(request), exit: reply.exit, output: structuredClone(reply.output) };
    this.events.push(event); await this.persist?.(event);
    return reply;
  }
  private remaining() {
    return { commands: Math.max(0, this.budget.maxCommands - this.events.length), checks: Math.max(0, this.budget.maxChecks - this.checks), estimates: Math.max(0, this.budget.maxEstimates - this.estimates), submitted: this.submitted };
  }
  private patchOf(r: HarnessRequest) {
    if (!r.file) throw new Refusal(`usage: night ${r.command} <patch.json>`, EXIT.usage);
    let value: unknown;
    try { value = JSON.parse(r.file.text); } catch { throw new Refusal(`${r.file.name} is not valid JSON`, EXIT.error); }
    return wirePatch({ patch: Array.isArray(value) ? value : z.object({ patch: z.array(z.unknown()) }).passthrough().parse(value).patch });
  }
  private async dispatch(r: HarnessRequest): Promise<unknown> {
    if (!COMMANDS.some(c => c === r.command)) throw new Refusal(`Unknown command ${r.command}; use ${COMMANDS.join(', ')}`, EXIT.usage);
    if (r.command === 'status') return { remaining: this.remaining(), budget: this.budget };
    if (this.submitted) throw new Refusal('Already submitted; the decision has ended', EXIT.budget);
    // Submit stays available after the command budget, so an agent can always finish.
    if (r.command !== 'submit' && this.events.length >= this.budget.maxCommands) throw new Refusal('command budget exhausted; only night submit and night status remain', EXIT.budget);
    switch (r.command) {
      case 'check': case 'estimate': {
        const patch = this.patchOf(r);
        if (r.command === 'check' && this.checks >= this.budget.maxChecks) throw new Refusal('check budget exhausted', EXIT.budget);
        if (r.command === 'estimate' && this.estimates >= this.budget.maxEstimates) throw new Refusal('estimate budget exhausted', EXIT.budget);
        if (r.command === 'check') this.checks++; else this.estimates++;
        const checked = await checkPatch(this.deps.ehr, this.current, patch, this.gate);
        if (r.command === 'check') return checked.check;
        return { check: checked.check, estimate: checked.program && checked.check.status === 'pass' ? await this.estimator.estimate(checked.program) : null };
      }
      case 'render': {
        const id = r.argv[0];
        if (!id || r.argv.length !== 1) throw new Refusal('usage: night render <screenId>', EXIT.usage);
        if (!this.current.screens.some(s => s.id === id)) throw new Refusal(`Unknown current screen ${id}`, EXIT.error);
        const samples = currentRenderSamples(this.current, this.files, id);
        return { screen: id, source: 'frozen training Chromium atlas', programHash: geometryProgramHash(this.current), samples, totalSamples: samples.length,
          note: samples.length ? 'Exact current-program training geometry (pixels). No PNG.' : 'No exact current-program training atlas; historical layouts are not substituted.' };
      }
      case 'query': {
        const [name, ...rest] = r.argv;
        if (!name) throw new Refusal('usage: night query <screens|steps|targets|scroll-past|sequences|ledger> [--day N] [--task ID] [--screen ID] [--target ID] [--limit N] [--sort interactions|travel]', EXIT.usage);
        const options: Record<string, string> = {};
        for (let i = 0; i < rest.length; i += 2) {
          const key = rest[i] ?? '', value = rest[i + 1];
          if (!QUERY_FLAGS.includes(key) || value === undefined) throw new Refusal(`Expected ${QUERY_FLAGS.join(', ')} with a value`, EXIT.usage);
          options[key.slice(2)] = value;
        }
        return queryTraining(file => { const text = this.files[file]; if (text === undefined) throw new Error('Unknown train query projection'); return JSON.parse(text); }, name.replace('_', '-'), options);
      }
      case 'complain': {
        const text = r.argv.join(' ').trim();
        if (!text || text.length > 4000) throw new Refusal('usage: night complain <text, at most 4000 characters>', EXIT.usage);
        this.complaints.push(text); return { recorded: true };
      }
      case 'submit': {
        let value: unknown;
        if (r.argv[0] === '--no-change') {
          const [, hypothesis, rationale] = r.argv;
          if (!hypothesis || r.argv.length > 3) throw new Refusal('usage: night submit --no-change "<hypothesis>" ["<rationale>"]', EXIT.usage);
          value = { hypothesis, decision: 'noChange', candidates: [], chosen: [], rationale: rationale ?? hypothesis, rejected: [] };
        } else {
          if (!r.file) throw new Refusal('usage: night submit <submission.json> | --no-change "<hypothesis>" ["<rationale>"]', EXIT.usage);
          try { value = JSON.parse(r.file.text); } catch { throw new Refusal(`${r.file.name} is not valid JSON`, EXIT.error); }
        }
        this.submission = validateSubmission(value); this.submitted = true;
        return { submitted: true, note: 'Final certification, validation and gates now run independently. Stop working; end your session.' };
      }
    }
    throw new Refusal('Unknown command', EXIT.usage);
  }
  /** Re-execute recorded requests; every exit code and output must match byte for byte. */
  async reverify(events: readonly HarnessEvent[]) {
    for (const event of events) {
      this.launch = event.launch;
      const reply = await this.execute(event.request);
      const now = this.events.at(-1);
      if (!now || now.index !== event.index || reply.exit !== event.exit || JSON.stringify(reply.output) !== JSON.stringify(event.output))
        throw new HarnessReplayError(`night command ${event.index} (${event.request.command}) re-executed differently`);
    }
  }
  stats() {
    return { commands: this.events.length, checks: this.checks, estimates: this.estimates,
      tally: Object.fromEntries([...new Set(this.events.map(e => e.request.command))].map(n => [n, this.events.filter(e => e.request.command === n).length])),
      complaints: [...new Set(this.complaints)] };
  }
}
export class HarnessReplayError extends Error {}

/** File RPC: Codex's own command sandbox forbids socket connections, so the CLI writes
 * <id>.req.json into the spool (atomically, by rename) and waits for <id>.res.json.
 * Requests are served one at a time in discovery order; ids are only file names. */
export async function serveHarnessSpool(spool: string, host: Pick<HarnessHost, 'execute'>, pollMs = 50) {
  const seen = new Set<string>();
  let stopped = false, busy: Promise<void> = Promise.resolve();
  const tick = async () => {
    const names = (await readdir(spool)).filter(n => /^[A-Za-z0-9_-]{1,80}\.req\.json$/.test(n) && !seen.has(n)).sort();
    for (const name of names) {
      seen.add(name);
      const id = name.slice(0, -'.req.json'.length), file = path.join(spool, name);
      let raw: unknown = null;
      // The spool is agent-writable: never follow a symlink the agent planted, in either direction.
      try { raw = await readSpoolRequest(file); } catch { raw = null; }
      await rm(file, { force: true });
      const reply = await host.execute(raw);
      const tmp = path.join(spool, `${id}.res.tmp`);
      try {
        await rm(tmp, { force: true });
        await writeSpoolReply(tmp, JSON.stringify(reply));
        await rename(tmp, path.join(spool, `${id}.res.json`));
      } catch { /* a planted file or race: drop the reply; the CLI times out */ }
    }
  };
  const loop = async () => { while (!stopped) { busy = tick().catch(() => undefined); await busy; await new Promise(r => setTimeout(r, pollMs)); } };
  const running = loop();
  return async () => { stopped = true; await busy; await running; };
}

/** Read a regular, non-symlink request file of at most 5 MB. */
async function readSpoolRequest(file: string): Promise<unknown> {
  const fh = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const st = await fh.stat();
    if (!st.isFile() || st.size > 5_000_000) return null;
    return JSON.parse(await fh.readFile('utf8'));
  } finally { await fh.close(); }
}
/** Create the reply exclusively: O_EXCL fails on any existing entry, symlinks included. */
async function writeSpoolReply(file: string, text: string) {
  const fh = await open(file, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o644);
  try { await fh.writeFile(text); } finally { await fh.close(); }
}
