import { calibrationPartition, validationSeed } from './protocol.js';
import { expandProgram } from './composites.js';
import { compilePresentations } from './presentation-compiler.js';
import path from 'node:path';
import { bindBuild, installedBuild } from './build-binding.js';
import { promptContext } from './manual.js';
/**
 * The nightly loop for one persona (BRIEF section 9):
 *   1 observe -> 2 hypothesize -> 3 generate 3-5 candidates -> 4 pre-screen
 *   (ehr check + ehr simulate on train days) -> 5 choose -> 6 certify (<= 3
 *   repairs with counterexamples) -> 7 validate on past calibration tasks -> 8 simulated user
 *   response -> 9 decision record + ehr deploy.
 *
 * EVALUATION INTEGRITY (BRIEF 8.4): prompts are built only from `NightInput.train`
 * (days <= d). Past calibration data is reachable only through `Holdout.validate`, which
 * returns aggregate metrics to the loop and is never passed to a prompt
 * builder; the LLM sees only accept/reject outcomes of earlier nights.
 */
import type { AgentBackend, Proposal } from './agent.js';
import type { EhrClient } from './ehr.js';
import { touchedPaths } from './jsonpatch.js';
import { addMetrics, pairedMetrics, pctAboveFloor, saving, sumMetrics, summarizeTrain, type TrainDay } from './observe.js';
import { applyToProgram, componentsMoved } from './program.js';
import { choosePrompt, nightlyPrompt, repairPrompt, type HistoryItem, type PersonaView } from './prompts.js';
import type { Release } from './releases.js';
import {
  violationOf, type Candidate, type CertAttempt, type CheckResult, type DayResult, type DaySchedule, type DecisionRecord, type EvaluatedCandidate,
  type JsonPatchOp, type LlmCallRef, type Metrics, type Program, type ReplayDay, type Savings, type Spec, type ScreenCheckResult, type TrainSummary, type Verdict,
} from './schema.js';
import { pickSeeded, rejectionKind, type SeedPolicy, type SeedState } from './seeded.js';
import { screenCheckRejection, type ScreenChecker } from './screencheck.js';
import type { RunStore } from './store.js';
import { errorMessage, hash32, pad2, rng } from './util.js';

export const MAX_REPAIRS = 3;
const TRAIN_ESTIMATE_DAYS = 2;

/** Opaque access to the past validation partition. Returns aggregates only; never feeds a prompt. */
export interface Holdout {
  readonly day: number | null;
  validate(before: Program, after: Program, specVersion: string): Promise<ReplayDay | null>;
}

export interface LoopDeps {
  runId: string;
  store: RunStore;
  ehr: EhrClient;
  /** Offline per-version screen check; must pass before any `ehr deploy`. */
  screens: ScreenChecker;
  agent: AgentBackend;
  seedPolicy: SeedPolicy;
  seedState: SeedState;
  worldDir: string;
  worldSeed: number;
}

export interface NightInput {
  night: number;
  persona: PersonaView;
  release: Release;
  current: Program;
  train: readonly TrainDay[];
  programs: ReadonlyMap<number, Program>;
  history: readonly HistoryItem[];
  holdout: Holdout;
}

export interface NightResult {
  record: DecisionRecord;
  deployed: Program | null;
}

export const daySeed = (worldSeed: number, day: number): number => worldSeed * 1000 + day;

// ---------------------------------------------------------------- shared machinery
export function toCheckResult(verdict: Verdict): CheckResult {
  const v = violationOf(verdict);
  if (!v) return { status: 'pass', property: null, message: null, counterexample: null, screens: null, verdict };
  return { status: 'fail', property: v.property, message: v.message, counterexample: v.counterexample, screens: v.screens, verdict };
}

export function invalidPatch(error: unknown): CheckResult {
  return { status: 'invalid-patch', property: null, message: errorMessage(error), counterexample: null, screens: null, verdict: null };
}

export interface Gate {
  specVersion: string;
  /** Previous version for the stability budget. */
  prev: Program;
  canonical: Program;
  nextVersion: number;
  night?: number;
  validation?: ReplayDay | null;
}

/** Apply a patch to `base` and run `ehr check`. */
export async function checkPatch(ehr: EhrClient, base: Program, patch: readonly JsonPatchOp[], gate: Gate): Promise<{ program: Program | null; check: CheckResult }> {
  let program: Program;
  try {
    program = applyToProgram(base, patch, { version: gate.nextVersion, specVersion: gate.specVersion }).program;
    expandProgram(program);
    compilePresentations(program);
  } catch (e) {
    return { program: null, check: invalidPatch(e) };
  }
  const verdict = await ehr.check({ specVersion: gate.specVersion, program, prev: gate.prev, canonical: gate.canonical });
  return { program, check: toCheckResult(verdict) };
}

/** Simulate train schedules on the current program and a candidate; saving per train day. */
export class TrainEstimator {
  private readonly baseline = new Map<number, DayResult>();
  constructor(private readonly deps: LoopDeps, private readonly input: NightInput, private readonly specVersion: string) {}

  private days(): readonly TrainDay[] {
    return this.input.train.slice(-TRAIN_ESTIMATE_DAYS);
  }

  private async run(program: Program, day: TrainDay): Promise<DayResult> {
    const verdict = await this.deps.ehr.check({specVersion:this.specVersion, program, prev:program, canonical:program});
    if (verdict !== 'ok') throw new Error('Uncertified training simulation refused');
    const persona = this.input.persona.params;
    const res = await this.deps.ehr.simulate({
      specVersion: this.specVersion, program, persona, schedule: day.schedule, worldDir: this.deps.worldDir,
      seed: daySeed(this.deps.worldSeed, day.schedule.day),
    });
    return res;
  }

  async estimate(candidate: Program): Promise<EvaluatedCandidate['trainEstimate']> {
    const days = this.days();
    if (days.length === 0) return null;
    let before = sumMetrics([]);
    let after = sumMetrics([]);
    for (const d of days) {
      let b = this.baseline.get(d.schedule.day);
      if (!b) {
        b = await this.run(this.input.current, d);
        this.baseline.set(d.schedule.day, b);
      }
      const pair = pairedMetrics(b, await this.run(candidate, d));
      before = addMetrics(before, pair.before);
      after = addMetrics(after, pair.after);
    }
    return { days: days.map((d) => d.schedule.day), before, after, saving: saving(before, after, days.length) };
  }
}

export async function evaluateCandidate(deps: LoopDeps, base: Program, c: Candidate, gate: Gate, estimator: TrainEstimator | null): Promise<EvaluatedCandidate> {
  const { program, check } = await checkPatch(deps.ehr, base, c.patch, gate);
  const trainEstimate = program && check.status === 'pass' && !c.seeded && estimator ? await estimator.estimate(program) : null;
  return { candidate: c, check, trainEstimate, componentsMoved: program ? componentsMoved(base, program) : null };
}

/** Record rejections that count toward the "tempting bad proposals" criterion. */
export function noteRejections(state: SeedState, evaluated: readonly EvaluatedCandidate[]): string[] {
  const flags: string[] = [];
  for (const e of evaluated) {
    const kind = rejectionKind(e.check);
    if (kind) state.rejected.add(kind);
    if (e.candidate.seeded && e.check.status === 'pass') {
      flags.push(`OWNER REVIEW: seeded unsafe candidate ${e.candidate.id} (${e.candidate.seededKind ?? '?'}) PASSED the checker`);
    }
  }
  return flags;
}

export function replayDay(day: number, load: string, before: DayResult, after: DayResult): ReplayDay {
  const { before: b, after: a } = pairedMetrics(before, after);
  return { day, load, before: b, after: a, saving: saving(b, a), pctAboveFloor: { before: pctAboveFloor(before), after: pctAboveFloor(after) } };
}

/** Holdout backed by the world's schedule for past calibration tasks. */
export function makeHoldout(deps: LoopDeps, persona: PersonaView, schedule: DaySchedule | null): Holdout {
  const past = schedule ? calibrationPartition(schedule, 'validation') : null;
  return {
    day: past?.day ?? null,
    async validate(before, after, specVersion) {
      if (!past || !past.tasks.length) return null;
      for (const program of [before, after]) {
        const verdict = await deps.ehr.check({ specVersion, program, prev: program, canonical: program });
        if (verdict !== 'ok') throw new Error(`Refusing uncertified validation replay: ${JSON.stringify(verdict)}`);
      }
      const args = { specVersion, persona: persona.params, schedule: past, worldDir: deps.worldDir, seed: validationSeed(deps.worldSeed, past.day) };
      const b = await deps.ehr.simulate({ ...args, program: before });
      const a = await deps.ehr.simulate({ ...args, program: after });
      return replayDay(past.day, past.load, b, a);
    },
  };
}

export function completionOk(r: ReplayDay | null): boolean {
  return r !== null && r.after.tasks > 0 && r.after.completed === r.after.tasks && r.after.completed >= r.before.completed;
}

export function improved(r: ReplayDay): boolean {
  const interactions = (m: Metrics) => m.clicks + m.keystrokes + m.scrolls;
  return r.after.klmDeciSec < r.before.klmDeciSec && interactions(r.after) <= interactions(r.before) && completionOk(r);
}

export function sumSavings(cs: readonly Candidate[]): Savings {
  return cs.reduce((acc, c) => ({
    clicks: acc.clicks + c.predicted.clicks, keystrokes: acc.keystrokes + c.predicted.keystrokes,
    scrolls: acc.scrolls + c.predicted.scrolls, klmDeciSec: acc.klmDeciSec + c.predicted.klmDeciSec,
  }), { clicks: 0, keystrokes: 0, scrolls: 0, klmDeciSec: 0 });
}

export function predictionVerdict(predicted: Savings | null, measured: ReplayDay | null): { held: boolean | null; note: string } {
  if (!predicted || !measured) return { held: null, note: 'no prediction or no validation replay' };
  const got = measured.saving.klmDeciSec;
  const want = predicted.klmDeciSec;
  const held = want > 0 ? got > 0 && got >= 0.5 * want : got >= 0;
  return { held, note: `predicted ${want / 10}s/day saved; validation replay measured ${got / 10}s (held = measured >= 50% of predicted)` };
}

export async function minClicksByWorkflow(deps: LoopDeps, specVersion: string, before: Program, after: Program, day: TrainDay | undefined): Promise<DecisionRecord['measured']['minClicks']> {
  if (!day) return [];
  const args = { specVersion, schedule: day.schedule, worldDir: deps.worldDir };
  // The pre-migration program may be intentionally non-conforming under the
  // new spec. Measure its old valid workflow rather than searching an impossible task.
  const b = await deps.ehr.minClicks({ ...args, specVersion: before.specVersion, program: before });
  const a = await deps.ehr.minClicks({ ...args, program: after });
  const wf = new Map(day.schedule.tasks.map((t) => [t.id, t.workflow]));
  const agg = new Map<string, { b: number; a: number; n: number }>();
  for (const row of b.tasks) {
    const w = row.workflow ?? wf.get(row.task) ?? '?';
    const x = agg.get(w) ?? { b: 0, a: 0, n: 0 };
    x.b += row.clicks;
    x.n += 1;
    agg.set(w, x);
  }
  for (const row of a.tasks) {
    const w = row.workflow ?? wf.get(row.task) ?? '?';
    const x = agg.get(w) ?? { b: 0, a: 0, n: 0 };
    x.a += row.clicks;
    agg.set(w, x);
  }
  return [...agg.entries()].map(([workflow, x]) => ({
    workflow, before: Math.round((x.b / Math.max(1, x.n)) * 10) / 10, after: Math.round((x.a / Math.max(1, x.n)) * 10) / 10,
  })).filter((r) => r.before !== r.after);
}

export function backendInfo(agent: AgentBackend, calls: readonly LlmCallRef[]): DecisionRecord['backend'] {
  const first = calls[0];
  const name = agent.name === 'claude' || agent.name === 'codex' || agent.name === 'replay' || agent.name === 'scripted' ? agent.name : 'scripted';
  if (first?.replayOf) return { name, model: first.replayOf.model, replayOf: first.replayOf };
  return { name, model: first?.model ?? agent.model, replayOf: null };
}

export function userResponse(deps: LoopDeps, night: number, persona: string, moved: number): DecisionRecord['userResponse'] {
  const probability = Math.min(0.3, 0.05 + 0.03 * moved);
  const draw = rng(hash32(`${deps.worldSeed}:${night}:${persona}:user`))();
  return draw < probability
    ? { response: 'reverted', probability, reason: `simulated user reverted the change at login (p=${probability.toFixed(2)}, ${moved} components moved)` }
    : { response: 'accepted', probability, reason: `simulated user kept the change (revert p=${probability.toFixed(2)})` };
}

export const callId = (night: number, persona: string, step: string): string => `night-${pad2(night)}/${persona}/${step}`;

export function emptyRecord(deps: LoopDeps, input: { night: number; persona: PersonaView; specVersion: string; current: Program; spec: Spec }, evidence: TrainSummary): DecisionRecord {
  return {
    schemaVersion: 1,
    context: (({ manualHash, ruleContextHash, ruleProfile }) => ({ manualHash, ruleContextHash, ruleProfile }))(promptContext(input.spec, input.current)),
    runId: deps.runId,
    night: input.night,
    persona: input.persona.id,
    owner: input.persona.userId,
    mode: 'nightly',
    specVersion: input.specVersion,
    versionBefore: input.current.version,
    versionAfter: input.current.version,
    backend: { name: 'scripted', model: deps.agent.model, replayOf: null },
    ehr: { mode: deps.ehr.mode, binary: deps.ehr.binary },
    evidence,
    hypothesis: '',
    candidates: [],
    chosen: null,
    predicted: null,
    certification: { attempts: [], result: 'skipped' },
    validation: { replay: null, improved: null, stabilityOk: null, accepted: false, reason: 'not reached' },
    measured: { validation: null, test: null, minClicks: [], predictionHeld: null, predictionNote: '' },
    userResponse: { response: 'not-offered', probability: 0, reason: 'no change to offer' },
    certificate: null,
    screenCheck: null,
    deployed: null,
    outcome: 'no-change',
    release: null,
    flags: [],
    llmCalls: [],
    createdAt: new Date().toISOString(),
  };
}

export type DeployOutcome =
  | { ok: true; certificate: NonNullable<DecisionRecord['certificate']>; deployed: NonNullable<DecisionRecord['deployed']>; screenCheck: ScreenCheckResult }
  | { ok: false; reason: 'screen-check' | 'deploy-refused'; check: CheckResult; screenCheck: ScreenCheckResult };

/**
 * The ONLY deploy path. Order (owner principle: everything verified before
 * login): the caller has already passed `ehr check`; then the offline screen
 * check (render-screens + app screen-check); then `ehr deploy`, which re-checks
 * (T4) and publishes. A version failing either gate is never deployed.
 */
export async function deployVersion(deps: LoopDeps, persona: string, program: Program, gate: Gate): Promise<DeployOutcome> {
  try {
  if (gate.night !== undefined && !completionOk(gate.validation ?? null)) throw new Error('Full validation completion required before deploy');
  const build = deps.ehr.mode === 'real' ? await installedBuild(undefined, deps.ehr.binary ?? undefined) : undefined;
  const screenCheck = await deps.screens.check({ specVersion: gate.specVersion, program });
  if (screenCheck.status !== 'pass') return { ok: false, reason: 'screen-check', check: screenCheckRejection(screenCheck), screenCheck };
  const res = await deps.ehr.deploy({ specVersion: gate.specVersion, program, prev: gate.prev, canonical: gate.canonical, outDir: path.join(deps.store.dir, 'native', persona, `v${program.version}`) });
  if (!res.deployed) return { ok: false, reason: 'deploy-refused', check: toCheckResult(res.verdict), screenCheck };
  const specFile = gate.specVersion.endsWith('.json') ? gate.specVersion : path.join((await import('./util.js')).REPO_ROOT, 'releases', gate.specVersion, 'spec.json');
  const spec = deps.ehr.mode === 'real' ? JSON.parse(await (await import('node:fs/promises')).readFile(specFile, 'utf8')) : await deps.ehr.specExport(gate.specVersion);
  const inputsDir = path.join(deps.store.dir, 'certifications', persona, `v${program.version}`);
  await (await import('./util.js')).writeJson(path.join(inputsDir, 'spec.json'), spec);
  const inputs = { specVersion: res.certificate.specVersion, prev: gate.prev, canonical: gate.canonical, program, night: gate.night ?? null };
  await (await import('./util.js')).writeJson(path.join(inputsDir, 'inputs.json'), inputs);
  const deployed = await deps.store.deploy(persona, program, res.certificate, build ? { ...bindBuild(build, program, res.certificate), certificationInputsSha256: (await import('./program.js')).sha256((await import('./program.js')).stableStringify({spec,inputs})) } : undefined, gate.night);
  return { ok: true, certificate: res.certificate, deployed, screenCheck };
  } catch (error) {
    const screenCheck: ScreenCheckResult = { status:'error', mode:deps.screens.mode, bundles:[], pages:0, failingScreens:[], failingFiles:[], message:`Deployment infrastructure error: ${errorMessage(error)}` };
    return { ok:false, reason:'screen-check', check:screenCheckRejection(screenCheck), screenCheck };
  }
}

/** Put a deploy outcome into the record; a screen-check failure is logged like a rejection. */
export function recordDeploy(rec: DecisionRecord, dep: DeployOutcome, attempt: { candidateIds: string[]; patch: JsonPatchOp[] }): void {
  rec.screenCheck = dep.screenCheck;
  if (dep.ok) {
    rec.certificate = dep.certificate;
    rec.deployed = dep.deployed;
    return;
  }
  if (dep.reason === 'screen-check') {
    rec.certification.attempts.push({ attempt: rec.certification.attempts.length, candidateIds: attempt.candidateIds, source: 'screen-check', patch: attempt.patch, check: dep.check });
    rec.certification.result = 'rejected';
    rec.flags.push(`screen check failed on ${dep.screenCheck.failingScreens.join(', ') || 'unknown screens'}; not deployed`);
  } else {
    rec.flags.push(`ehr deploy refused a version that passed check: ${dep.check.property ?? ''} ${dep.check.message ?? ''}`);
  }
}

function compatible(a: Candidate, b: Candidate): boolean {
  const key = (p: string) => p.split('/').slice(0, 5).join('/');
  const ta = new Set(touchedPaths(a.patch).map(key));
  return touchedPaths(b.patch).every((p) => !ta.has(key(p)));
}

// ---------------------------------------------------------------- the nightly loop
export async function runNight(deps: LoopDeps, input: NightInput): Promise<NightResult> {
  const { night, persona, release, current } = input;
  const specVersion = release.specVersion;
  const gate: Gate = { specVersion, prev: current, canonical: release.canonical, nextVersion: current.version + 1, night };

  // 1. Observe (train days only).
  const evidence = summarizeTrain(persona.id, current, input.train, input.programs);
  const rec = emptyRecord(deps, { night, persona, specVersion, current, spec: input.release.spec }, evidence);
  const calls: LlmCallRef[] = [];
  let noted = 0;
  const note = () => {
    rec.flags.push(...noteRejections(deps.seedState, rec.candidates.slice(noted)));
    noted = rec.candidates.length;
  };
  const finish = async (deployed: Program | null): Promise<NightResult> => {
    note();
    rec.llmCalls = calls;
    rec.backend = backendInfo(deps.agent, calls);
    await deps.store.writeDecision(rec);
    return { record: rec, deployed };
  };

  // 2-3. Hypothesize and generate.
  let proposal: Proposal;
  try {
    proposal = await deps.agent.proposeCandidates({
      callId: callId(night, persona.id, 'propose-0'), purpose: 'propose', source: 'llm',
      parts: nightlyPrompt({ night, persona, spec: release.spec, program: current, evidence, history: input.history }),
    });
  } catch (e) {
    rec.hypothesis = '(no hypothesis: the LLM call failed)';
    rec.flags.push(`llm-error: ${errorMessage(e)}`);
    rec.outcome = 'llm-error';
    return finish(null);
  }
  calls.push(proposal.call);
  rec.hypothesis = proposal.hypothesis;
  if (proposal.candidates.length + proposal.undecodable.length < 3 && proposal.decision === 'change') {
    rec.flags.push(`LLM returned ${proposal.candidates.length + proposal.undecodable.length} candidates (3-5 requested)`);
  }

  // 4. Pre-screen each candidate: ehr check, then ehr simulate on train days.
  const estimator = new TrainEstimator(deps, input, specVersion);
  for (const u of proposal.undecodable) {
    rec.candidates.push({
      candidate: { id: u.id, summary: u.summary, moveType: 'reorder', rationale: '', targets: [], patch: [], predicted: { clicks: 0, keystrokes: 0, scrolls: 0, klmDeciSec: 0 }, source: 'llm', seeded: false, seededKind: null },
      check: invalidPatch(u.error), trainEstimate: null, componentsMoved: null,
    });
  }
  for (const c of proposal.candidates) rec.candidates.push(await evaluateCandidate(deps, current, c, gate, estimator));

  // Tempting-but-unsafe moves: inject one if the LLM did not produce the rejection itself.
  note();
  const seeded = pickSeeded(deps.seedPolicy, deps.seedState, current, release.spec, night);
  if (seeded) {
    deps.seedState.injected++;
    rec.candidates.push(await evaluateCandidate(deps, current, seeded, gate, null));
  }

  const eligible = rec.candidates.filter((e) => e.check.status === 'pass' && !e.candidate.seeded);
  if (eligible.length === 0) {
    rec.outcome = proposal.decision === 'noChange' && proposal.candidates.length === 0 ? 'no-change' : 'no-passing-candidate';
    rec.validation.reason = 'no certified candidate to validate';
    return finish(null);
  }

  // 5. Choose (LLM), with a deterministic fallback if the choice is unusable.
  let chosen: Candidate[] = [];
  try {
    const choice = await deps.agent.chooseCandidates({
      callId: callId(night, persona.id, 'choose-0'),
      parts: choosePrompt({ night, persona, spec: release.spec, program: current, stabilityBudget: release.spec.design.stabilityBudget, hypothesis: proposal.hypothesis, candidates: rec.candidates }),
    });
    calls.push(choice.call);
    const byId = new Map(eligible.map((e) => [e.candidate.id, e.candidate]));
    const picked = choice.chosen.flatMap((id) => (byId.has(id) ? [byId.get(id)] : [])).filter((x): x is Candidate => x !== undefined);
    const dropped: string[] = [];
    for (const c of picked) {
      if (chosen.every((x) => compatible(x, c))) chosen.push(c);
      else dropped.push(c.id);
    }
    if (choice.chosen.length === 0) {
      rec.chosen = { candidateIds: [], rationale: choice.rationale, rejectedAlternatives: choice.rejected, choiceBy: 'llm' };
      rec.outcome = 'no-change';
      rec.validation.reason = 'agent chose not to change anything';
      return finish(null);
    }
    if (chosen.length > 0) {
      const note = dropped.length > 0 ? ` [loop dropped ${dropped.join(', ')}: patches overlap]` : '';
      rec.chosen = { candidateIds: chosen.map((c) => c.id), rationale: choice.rationale + note, rejectedAlternatives: choice.rejected, choiceBy: 'llm' };
    }
  } catch (e) {
    rec.flags.push(`llm-error (choose): ${errorMessage(e)}`);
    rec.outcome = 'llm-error';
    return finish(null);
  }
  if (chosen.length === 0) {
    const best = [...eligible].sort((a, b) => (b.trainEstimate?.saving.klmDeciSec ?? 0) - (a.trainEstimate?.saving.klmDeciSec ?? 0))[0];
    if (!best) return finish(null);
    chosen = [best.candidate];
    rec.chosen = {
      candidateIds: [best.candidate.id],
      rationale: `loop fallback: the LLM choice was unusable, so the passing candidate with the largest train-day KLM saving (${(best.trainEstimate?.saving.klmDeciSec ?? 0) / 10}s/day) was taken`,
      rejectedAlternatives: eligible.filter((e) => e !== best).map((e) => ({ id: e.candidate.id, reason: 'smaller train-day saving' })),
      choiceBy: 'loop-fallback',
    };
  }
  rec.predicted = sumSavings(chosen);

  // 6. Certify the merged program; feed counterexamples back (max 3 repairs).
  const mergedPatch = chosen.flatMap((c) => c.patch);
  let attempt = await checkPatch(deps.ehr, current, mergedPatch, gate);
  rec.certification.attempts.push({ attempt: 0, candidateIds: chosen.map((c) => c.id), source: 'merged', patch: mergedPatch, check: attempt.check });
  let finalProgram = attempt.check.status === 'pass' ? attempt.program : null;
  let failed: { ids: { id: string; summary: string; moveType: string }[]; patch: JsonPatchOp[]; check: CheckResult } = {
    ids: chosen.map((c) => ({ id: c.id, summary: c.summary, moveType: c.moveType })), patch: mergedPatch, check: attempt.check,
  };
  for (let r = 1; !finalProgram && r <= MAX_REPAIRS; r++) {
    let repair: Proposal;
    try {
      repair = await deps.agent.proposeCandidates({
        callId: callId(night, persona.id, `repair-${r}`), purpose: 'repair', source: 'repair',
        parts: repairPrompt({ night, persona, spec: release.spec, program: current, attempt: r, maxAttempts: MAX_REPAIRS, failedSummaries: failed.ids, failedPatch: failed.patch, check: failed.check }),
      });
    } catch (e) {
      rec.flags.push(`llm-error (repair ${r}): ${errorMessage(e)}`);
      rec.outcome = 'llm-error';
      return finish(null);
    }
    calls.push(repair.call);
    for (const c of repair.candidates) {
      const ev = await evaluateCandidate(deps, current, { ...c, id: `${c.id}@repair${r}` }, gate, estimator);
      rec.candidates.push(ev);
      const certAttempt: CertAttempt = { attempt: r, candidateIds: [ev.candidate.id], source: 'repair', patch: ev.candidate.patch, check: ev.check };
      rec.certification.attempts.push(certAttempt);
      if (ev.check.status === 'pass') {
        attempt = await checkPatch(deps.ehr, current, ev.candidate.patch, gate);
        finalProgram = attempt.program;
        chosen = [ev.candidate];
        rec.predicted = sumSavings(chosen);
        break;
      }
      failed = { ids: [{ id: ev.candidate.id, summary: ev.candidate.summary, moveType: ev.candidate.moveType }], patch: ev.candidate.patch, check: ev.check };
    }
  }
  if (!finalProgram) {
    rec.certification.result = 'rejected';
    rec.outcome = 'certification-failed';
    rec.validation.reason = `not certified after ${MAX_REPAIRS} repairs`;
    return finish(null);
  }
  rec.certification.result = 'certified';

  // 7. Validate: replay past calibration tasks (same patients, events, choices) on the old and new versions.
  const moved = componentsMoved(current, finalProgram);
  const replay = await input.holdout.validate(current, finalProgram, specVersion);
  const stabilityOk = moved <= release.spec.design.stabilityBudget;
  rec.validation.replay = replay;
  rec.measured.validation = replay;
  rec.validation.stabilityOk = stabilityOk;
  rec.validation.improved = replay ? improved(replay) : null;
  const pv = predictionVerdict(rec.predicted, replay);
  rec.measured.predictionHeld = pv.held;
  rec.measured.predictionNote = pv.note;
  rec.measured.minClicks = await minClicksByWorkflow(deps, specVersion, current, finalProgram, input.train[input.train.length - 1]);
  if (!replay) {
    rec.validation.reason = 'no validation day available';
    rec.outcome = 'validation-rejected';
    return finish(null);
  }
  if (!rec.validation.improved || !stabilityOk) {
    rec.validation.reason = !stabilityOk ? `stability budget exceeded (${moved} moved)` : 'validation replay did not improve';
    rec.outcome = 'validation-rejected';
    return finish(null);
  }
  rec.validation.accepted = true;
  rec.validation.reason = `validation day ${replay.day}: ${replay.saving.klmDeciSec / 10}s saved, ${replay.saving.clicks} clicks, ${replay.saving.keystrokes} keystrokes, ${replay.saving.scrolls} scrolls`;

  // 8. Simulated user response.
  rec.userResponse = userResponse(deps, night, persona.id, moved);
  if (rec.userResponse.response === 'reverted') {
    rec.outcome = 'user-reverted';
    return finish(null);
  }

  // 9. Screen check, then deploy (ehr deploy re-checks; only certified, screen-checked versions are published).
  const dep = await deployVersion(deps, persona.id, finalProgram, { ...gate, validation: replay });
  recordDeploy(rec, dep, { candidateIds: chosen.map((c) => c.id), patch: chosen.flatMap((c) => c.patch) });
  if (!dep.ok) {
    rec.outcome = dep.reason === 'screen-check' ? 'screen-check-failed' : 'certification-failed';
    return finish(null);
  }
  rec.versionAfter = finalProgram.version;
  rec.outcome = 'deployed';
  return finish(finalProgram);
}
