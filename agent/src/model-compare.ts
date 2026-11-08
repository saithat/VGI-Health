/** Reissue frozen recorded prompts, then run only the native proposal pre-screen.
 * Reuses the quality evaluator's frozen inputs and the production decoder/checker/
 * estimator. No prompt rebuilding, geometry capture, validation or deployment.
 */
import { existsSync } from 'node:fs';
import { cp, mkdir, realpath, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { isDeepStrictEqual, parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { decodeProposalResponse, type AgentBackend } from './agent.js';
import { BACKENDS, createBackend, type BackendChoice, type JsonLlm, type JsonRequest } from './backends/index.js';
import { validateReply } from './backends/openai-compat.js';
import { llmRecordPath, llmRecordSchema, RecordingLlm, type LlmRecord } from './backends/recording.js';
import { createEhr, type EhrClient } from './ehr.js';
import { fileHash, treeHash } from './fingerprints.js';
import { evaluateCandidate, TrainEstimator, type Gate, type LoopDeps, type NightInput } from './night.js';
import { applyToProgram, stableStringify } from './program.js';
import { archivedSpecEhr, decisionId, frozenNight, frozenSpecs, historicalDecisions, selectDecisions } from './quality.js';
import { sameIdea } from './quality-context.js';
import { recordingEhr } from './recording-ehr.js';
import { RunStore } from './store.js';
import { errorMessage, pad2, readJson, REPO_ROOT, resolveUserPath, writeJson } from './util.js';
import { loadWorld } from './world.js';
import {
  LLM_CHOICE_JSON_SCHEMA, LLM_PROPOSAL_JSON_SCHEMA, llmChoiceSchema, llmProposalSchema,
  type Candidate, type DecisionRecord, type EvaluatedCandidate,
} from '../../app/src/dashboard/agent-evidence.js';

export interface ModelCompareOptions {
  source: string;
  out: string;
  backend: BackendChoice;
  model?: string;
  nights?: string;
  personas?: string;
  choose?: boolean;
  world?: string;
}

export function parseNights(value: string): number[] {
  const nights = new Set<number>();
  for (const part of value.split(',')) {
    const match = /^(\d+)(?:-(\d+))?$/.exec(part.trim());
    if (!match) throw new Error('--nights must be a range/list such as 1-9 or 1,3,5');
    const first = Number(match[1]), last = Number(match[2] ?? match[1]);
    if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) || first < 1 || last < first || last > 10000) throw new Error('Invalid --nights range');
    for (let n = first; n <= last; n++) nights.add(n);
  }
  return [...nights].sort((a, b) => a - b);
}

const inside = (root: string, child: string) => child === root || child.startsWith(root + path.sep);
export async function comparisonOutput(source: string, out: string): Promise<string> {
  const scratch = await realpath(tmpdir()), target = path.resolve(out);
  if (!inside(scratch, target) || target === scratch || inside(source, target) || inside(target, source) || existsSync(target)) {
    throw new Error('--out must be a NEW directory below TMPDIR, outside the source run');
  }
  // Resolve the nearest existing ancestor before creating anything (symlink guard).
  let ancestor = path.dirname(target);
  while (!existsSync(ancestor)) ancestor = path.dirname(ancestor);
  const actual = await realpath(ancestor);
  if (!inside(scratch, actual) || inside(source, actual)) throw new Error('--out parent escapes TMPDIR or enters source through a symlink');
  await mkdir(path.dirname(target), { recursive: true });
  await mkdir(target);
  return target;
}

/** Recordings before request sidecars use the historical named wire schemas. */
export async function frozenRequest(inputs: string, rec: LlmRecord): Promise<JsonRequest> {
  if (!/^night-\d+\/[\w-]+\/(?:propose|choose)-\d+$/.test(rec.callId)) throw new Error(`Unsafe/unsupported call id: ${rec.callId}`);
  const file = llmRecordPath(inputs, rec.callId).replace(/\.json$/, '.request.json');
  if (existsSync(file)) {
    const req = await readJson(file, z.object({ callId: z.string(), purpose: z.string(), system: z.string(), prompt: z.string(), schemaName: z.string(), schema: z.record(z.string(), z.unknown()), queryBundle: z.unknown().optional() }));
    if (req.queryBundle) throw new Error('Recorded query-tool prompts are unsupported by the model comparison');
    for (const key of ['callId', 'purpose', 'system', 'prompt', 'schemaName'] as const) {
      if (req[key] !== rec[key]) throw new Error(`Recorded request/response disagree: ${rec.callId}/${key}`);
    }
    return { callId: req.callId, purpose: req.purpose, system: req.system, prompt: req.prompt, schemaName: req.schemaName, schema: req.schema };
  }
  const schema = rec.schemaName === 'LlmProposal' ? LLM_PROPOSAL_JSON_SCHEMA : rec.schemaName === 'LlmChoice' ? LLM_CHOICE_JSON_SCHEMA : null;
  if (!schema) throw new Error(`Missing request schema for ${rec.callId}/${rec.schemaName}`);
  return { callId: rec.callId, purpose: rec.purpose, system: rec.system, prompt: rec.prompt, schemaName: rec.schemaName, schema };
}

/** Detect the historical density-only dead-move class, including whole-object patches.
 * This is a syntactic flag, not a claim that density has zero effect today. */
export function densityOnly(base: NightInput['current'], candidate: Candidate): boolean {
  try {
    const next = applyToProgram(base, candidate.patch, { version: base.version, specVersion: base.specVersion }).program;
    const withoutSize = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(withoutSize);
      if (value !== null && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([k]) => k !== 'size').map(([k, v]) => [k, withoutSize(v)]));
      return value;
    };
    return stableStringify(base) !== stableStringify(next) && stableStringify(withoutSize(base)) === stableStringify(withoutSize(next));
  } catch { return false; }
}

export async function scoreProposal(json: unknown, req: JsonRequest, input: NightInput, deps: LoopDeps, history: readonly DecisionRecord[]) {
  const proposal = decodeProposalResponse(json, 'llm', req.callId);
  const estimator = new TrainEstimator(deps, input, input.release.specVersion);
  const gate: Gate = { specVersion: input.release.specVersion, prev: input.current, canonical: input.release.canonical, nextVersion: input.current.version + 1 };
  const earlier = history.filter(r => r.persona === input.persona.id && r.night < input.night).flatMap(r => r.candidates.filter(e => !e.candidate.seeded).map(e => ({ night: r.night, candidate: e.candidate })));
  const candidates = [];
  for (const c of proposal.candidates) {
    const evaluated = await evaluateCandidate(deps, input.current, c, gate, estimator);
    candidates.push({ ...evaluated, densityOnly: densityOnly(input.current, c),
      duplicates: earlier.filter(old => sameIdea(old.candidate, c)).map(old => ({ night: old.night, id: old.candidate.id })) });
  }
  return { hypothesis: proposal.hypothesis, decision: proposal.decision,
    candidateCount: llmProposalSchema.parse(json).candidates.length,
    // Production evaluates at most five; retain both counts and all decode failures.
    ignoredCandidates: Math.max(0, llmProposalSchema.parse(json).candidates.length - 5),
    undecodable: proposal.undecodable, candidates };
}

type ProposalScore = Awaited<ReturnType<typeof scoreProposal>>;
interface CallResult {
  callId: string;
  schemaValid: boolean | null;
  error: string | null;
  responseMatchesReference: boolean | null;
  model: string;
  servedBy: string | null;
  usage: unknown;
  finishReason: string | null;
  proposal: ProposalScore | null;
  choice: z.infer<typeof llmChoiceSchema> | null;
}
export interface ComparisonRow {
  decisionId: string;
  arm: 'model' | 'recorded-reference';
  calls: CallResult[];
  recordedOutcome: DecisionRecord['outcome'];
  recordedCandidates: EvaluatedCandidate[] | null;
}

// Frozen preparation never needs a designer, screen gate or deployment operation.
const unusedAgent: AgentBackend = { name: 'scripted', model: 'unused',
  async proposeCandidates() { throw new Error('Prompt rebuilding prohibited'); },
  async chooseCandidates() { throw new Error('Prompt rebuilding prohibited'); } };

async function snapshot(source: string, out: string, worldOverride?: string) {
  const inputs = path.join(out, 'inputs'), hashes: Record<string, string> = {};
  async function copy(from: string, to: string) {
    const before = await treeHash(from); // Reject symlinks and detect snapshot races.
    await cp(from, to, { recursive: true, errorOnExist: true, force: false });
    if (await treeHash(to) !== before) throw new Error(`Input changed while snapshotting: ${from}`);
    hashes[path.relative(inputs, to)] = before;
  }
  const manifest = await readJson(path.join(source, 'manifest.json'), z.object({ world: z.string(), fingerprints: z.object({ world: z.string(), fixtures: z.string() }).optional() }));
  const worldSource = await realpath(worldOverride ?? manifest.world);
  await mkdir(inputs);
  await cp(path.join(source, 'manifest.json'), path.join(inputs, 'source-manifest.json'));
  for (const dir of ['programs', 'days', 'decisions', 'llm', 'certifications']) await copy(path.join(source, dir), path.join(inputs, dir));
  await copy(worldSource, path.join(inputs, 'world'));
  const worldManifestFile = path.join(inputs, 'world/manifest.json');
  if (existsSync(worldManifestFile)) {
    const metadata = await readJson(worldManifestFile, z.object({ fixtures: z.object({ index: z.string() }).passthrough() }).passthrough());
    const index = path.resolve(source, '../..', metadata.fixtures.index);
    await copy(path.dirname(index), path.join(inputs, 'fixtures'));
    await writeJson(worldManifestFile, { ...metadata, fixtures: { ...metadata.fixtures, index: path.join(inputs, 'fixtures', path.basename(index)) } });
  }
  if (manifest.fingerprints && (hashes['world'] !== manifest.fingerprints.world || hashes['fixtures'] !== manifest.fingerprints.fixtures)) {
    throw new Error('World/fixtures differ from the source run fingerprints; restore the original inputs');
  }
  return { inputs, hashes, worldSource, frozenSha256: await treeHash(inputs) };
}

export function comparisonMarkdown(rows: readonly ComparisonRow[]): string {
  const lines = ['# Recorded-night model comparison', '',
    'Native proposal pre-screen only. Train estimates use the most recent two training days and native scroll counts; browser pixel metrics are unavailable. Density-only is the historical dead-move class, not a measured zero-effect assertion. Duplicates use the existing same-id OR same-move/nonempty-target-set rule against earlier nights for this persona.', '',
    'Recorded choose prompts retain the recorded candidate menu: chooser results are independent probes, not choices among the new model proposals. Reference rows are rescored through the same native pipeline; historical recorded estimates are retained separately in report.json. No screen gate, held-out validation, repair, deployment or long-run quality claim.', '',
    '| Night / persona | Arm | Schema (valid / calls) | Candidates | Native pass / fail / invalid | Density-only | Earlier duplicates | Train savings per candidate (clicks / scrolls) | Failure properties / errors |',
    '|---|---|---:|---:|---|---:|---:|---|---|'];
  const cell = (value: string) => value.replace(/\|/g, '\\|').replace(/[\r\n]/g, ' ');
  for (const row of rows) {
    const proposed = row.calls.flatMap(c => c.proposal ? [c.proposal] : []), candidates = proposed.flatMap(p => p.candidates);
    const count = (status: string) => candidates.filter(c => c.check.status === status).length;
    const failures = [...row.calls.flatMap(c => c.error ? [c.error] : []), ...candidates.flatMap(c => c.check.status !== 'pass' ? [`${c.candidate.id}: ${c.check.property ?? c.check.message ?? c.check.status}`] : [])];
    lines.push(`| ${cell(row.decisionId)} | ${row.arm} | ${row.calls.filter(c => c.schemaValid === true).length} / ${row.calls.length} | ${proposed.reduce((n, p) => n + p.candidateCount, 0)} | ${count('pass')} / ${count('fail')} / ${count('invalid-patch') + proposed.reduce((n, p) => n + p.undecodable.length, 0)} | ${candidates.filter(c => c.densityOnly).length} | ${candidates.filter(c => c.duplicates.length).length} | ${cell(candidates.map(c => `${c.candidate.id}: ${c.trainEstimate ? `${c.trainEstimate.saving.clicks} / ${c.trainEstimate.saving.scrolls}` : 'unmeasured'}`).join('; '))} | ${cell(failures.join('; '))} |`);
  }
  return lines.join('\n') + '\n';
}

export async function compareRecordedNights(opts: ModelCompareOptions, adapters: { ehr?: EhrClient; llm?: JsonLlm } = {}) {
  const source = await realpath(opts.source), history = await historicalDecisions(source);
  const nights = parseNights(opts.nights ?? '1-9'), personas = opts.personas?.split(',').map(p => p.trim()) ?? [...new Set(history.map(r => r.persona))];
  if (personas.some(p => !/^[\w-]+$/.test(p)) || new Set(personas).size !== personas.length) throw new Error('Invalid/duplicate --personas');
  const requested = nights.flatMap(night => personas.map(persona => {
    const r = history.find(r => r.night === night && r.persona === persona);
    if (!r) throw new Error(`Missing recorded decision: night-${pad2(night)}/${persona}`);
    return r;
  }));
  const selected = selectDecisions(history, requested.filter(r => r.mode === 'nightly').map(decisionId));
  if (!selected.length) throw new Error('No nightly propose decisions selected');
  // Configuration errors must precede copying inputs or making any model calls.
  const llm = adapters.llm ?? createBackend(opts.backend, { ...(opts.model ? { model: opts.model } : {}), replayFrom: source });
  const native = adapters.ehr ?? createEhr({ fake: false });
  if (native.binary && !existsSync(native.binary)) throw new Error('Set EHR_BIN to an already-built ehr binary; this harness never builds Lean');
  const out = await comparisonOutput(source, opts.out);
  const state: { status: string; error: string | null } = { status: 'preparing', error: null };
  await writeJson(path.join(out, 'manifest.json'), state);
  const rows: ComparisonRow[] = [];
  try {
    const frozen = await snapshot(source, out, opts.world), { inputs } = frozen;
    // Replay reads only our snapshot, never a source path after preparation.
    const backend = adapters.llm ?? (opts.backend === 'replay' ? createBackend('replay', { replayFrom: inputs }) : llm);
    const ehrSha256 = native.binary ? await fileHash(native.binary) : null;
    await writeJson(path.join(out, 'binding.json'), { ...frozen, source, options: opts, backend: backend.name, model: backend.model,
      agentSha256: await treeHash(path.join(REPO_ROOT, 'agent/src')), ehrSha256 });
    const world = await loadWorld(path.join(inputs, 'world')), frozenHistory = await historicalDecisions(inputs);
    if (selected.some(r => !isDeepStrictEqual(r, frozenHistory.find(f => decisionId(f) === decisionId(r))))) throw new Error('Selected decisions changed while snapshotting');
    state.status = 'running'; await writeJson(path.join(out, 'manifest.json'), state);
    for (const original of selected) {
      const id = decisionId(original), dir = path.join(out, 'samples', id);
      const ehr = archivedSpecEhr(recordingEhr(native, path.join(dir, 'ehr')), await frozenSpecs(inputs, original.persona));
      const deps: LoopDeps = { runId: path.basename(out), store: new RunStore(dir), ehr, agent: unusedAgent,
        screens: { mode: 'real', async check() { throw new Error('Browser checks prohibited'); } },
        seedPolicy: 'none', seedState: { injected: 0, rejected: new Set() }, worldDir: world.dir, worldSeed: world.manifest.seed };
      const input = await frozenNight(inputs, original, frozenHistory, world, deps);
      const proposalCalls = original.llmCalls.filter(c => c.purpose === 'propose');
      if (!proposalCalls.length) throw new Error(`No recorded propose call for ${id}`);
      const refs = [...proposalCalls, ...(opts.choose ? original.llmCalls.filter(c => c.purpose === 'choose') : [])];
      for (const arm of ['recorded-reference', 'model'] as const) {
        const calls: CallResult[] = [], recorder = new RecordingLlm(backend, path.join(dir, arm));
        for (const ref of refs) {
          const rec = await readJson(llmRecordPath(inputs, ref.callId), llmRecordSchema), req = await frozenRequest(inputs, rec);
          if ((rec.replayOf?.backend ?? rec.backend) !== 'codex') throw new Error(`Reference is not a recorded Codex call: ${req.callId}`);
          const call: CallResult = { callId: req.callId, schemaValid: null, error: null, responseMatchesReference: null,
            model: arm === 'model' ? backend.model : rec.model, servedBy: arm === 'model' ? null : rec.servedBy,
            usage: arm === 'model' ? null : rec.usage, finishReason: arm === 'model' ? null : rec.finishReason ?? null, proposal: null, choice: null };
          let json: unknown;
          try {
            const response = arm === 'model' ? await recorder.complete(req) : null;
            json = response ? response.json : rec.response;
            if (response) { call.model = response.model; call.servedBy = response.servedBy; call.usage = response.usage; call.finishReason = response.finishReason ?? null; }
            call.responseMatchesReference = isDeepStrictEqual(json, rec.response);
            validateReply(req.schema, json);
            call.schemaValid = true;
          } catch (error) {
            call.error = errorMessage(error);
            if (call.error.includes('request schema') || call.error.includes('not JSON')) call.schemaValid = false;
          }
          if (call.schemaValid) {
            // Native infrastructure failures abort rather than masquerading as model failures.
            if (req.purpose === 'choose') call.choice = llmChoiceSchema.parse(json);
            else call.proposal = await scoreProposal(json, req, input, deps, frozenHistory);
          }
          calls.push(call);
        }
        rows.push({ decisionId: id, arm, calls, recordedOutcome: original.outcome,
          recordedCandidates: arm === 'recorded-reference' ? original.candidates.filter(c => !c.candidate.seeded) : null });
      }
      await writeJson(path.join(out, 'rows.json'), rows);
      console.log(`${id}: native proposal pre-screen complete`);
    }
    const replayExact = opts.backend === 'replay' ? rows.filter(r => r.arm === 'model').every(row => {
      const reference = rows.find(r => r.decisionId === row.decisionId && r.arm === 'recorded-reference');
      return row.calls.every((call, i) => call.schemaValid === true && call.responseMatchesReference === true &&
        isDeepStrictEqual(call.proposal, reference?.calls[i]?.proposal) && isDeepStrictEqual(call.choice, reference?.calls[i]?.choice));
    }) : null;
    if (replayExact === false) throw new Error('Replay self-check differs from the recorded reference response or native score');
    if (await treeHash(inputs) !== frozen.frozenSha256) throw new Error('Frozen inputs changed during comparison');
    if (native.binary && await fileHash(native.binary) !== ehrSha256) throw new Error('Native binary changed during comparison');
    const report = { label: 'Recorded-night native proposal comparison', backend: backend.name, model: backend.model,
      replayExact, excluded: requested.filter(r => r.mode !== 'nightly').map(r => ({ decisionId: decisionId(r), mode: r.mode })), rows };
    await writeJson(path.join(out, 'report.json'), report);
    await writeFile(path.join(out, 'report.md'), comparisonMarkdown(rows));
    state.status = 'completed'; await writeJson(path.join(out, 'manifest.json'), state);
    return report;
  } catch (error) {
    state.status = 'aborted'; state.error = errorMessage(error); await writeJson(path.join(out, 'manifest.json'), state); throw error;
  }
}

export async function modelCompareCli(argv: string[]) {
  const { values } = parseArgs({ args: argv, options: { source: { type: 'string' }, out: { type: 'string' }, backend: { type: 'string' }, model: { type: 'string' }, nights: { type: 'string' }, personas: { type: 'string' }, choose: { type: 'boolean' }, world: { type: 'string' }, help: { type: 'boolean' } } });
  if (values.help) {
    console.log(`usage: tsx src/model-compare.ts --source RUN --backend ${BACKENDS.join('|')} [--model M] [--nights 1-9] [--personas P1,P5] [--choose] [--world DIR] --out $TMPDIR/model-compare/LABEL\nReissues recorded propose prompts; --choose also probes the frozen reference chooser menu. No browser, validation or deployment. Replay is an exact response/native-score self-check. Non-nightly migration/surface decisions are reported as excluded.`);
    return;
  }
  const backend = BACKENDS.find(b => b === values.backend);
  if (!values.source || !values.out || !backend) throw new Error(`--source, --out and --backend (${BACKENDS.join(', ')}) are required`);
  await compareRecordedNights({ source: resolveUserPath(values.source), out: resolveUserPath(values.out), backend,
    ...(values.model !== undefined ? { model: values.model } : {}), ...(values.nights ? { nights: values.nights } : {}),
    ...(values.personas ? { personas: values.personas } : {}), ...(values.choose ? { choose: true } : {}), ...(values.world ? { world: resolveUserPath(values.world) } : {}) });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  modelCompareCli(process.argv.slice(2)).catch(error => { console.error(errorMessage(error)); process.exitCode = 1; });
}
