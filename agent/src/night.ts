import { CADENCE_PROTOCOL, autoApprove, releaseDue, usageWeightedSwitchCost, type ReleaseCadence, type ReviewGate, type ReviewBundle, type ReviewChoices, type SwitchCost } from './cadence.js';
import { DesignArchiveStore, archiveFeedback, designHash, type ArchiveEntry, type ArchiveObservation } from './design-archive.js';
import { describeProgram, generate, validateCandidate } from '../../explore/generator.js';
import { seedPoints, niche, type Workflow } from '../../explore/design.js';
import { archiveFrom } from '../../explore/search.js';
import type { Evaluation } from '../../explore/archive.js';
import { programHash, sha256, stableStringify } from './program.js';
import { retryInfrastructure } from './infrastructure.js';
import { retryScreens } from './retry-boundaries.js';
import { ReplayDivergedError, ReplayMissingError } from './backends/replay.js';
import {InfrastructureError} from './errors.js';
import { calibrationPartition, validationSeed, trainEstimateWindow } from './protocol.js';
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
  violationOf, jsonPatchSchema, type Candidate, type CertAttempt, type CheckResult, type DayResult, type DaySchedule, type DecisionRecord, type EvaluatedCandidate,
  type JsonPatchOp, type LlmCallRef, type Program, type ReplayDay, type Savings, type Spec, type ScreenCheckResult, type TrainSummary, type Verdict,
} from './schema.js';
import { pickSeeded, rejectionKind, type SeedPolicy, type SeedState } from './seeded.js';
import { screenCheckRejection, type ScreenChecker } from './screencheck.js';
import type { RunStore } from './store.js';
import { errorMessage, hash32, pad2, rng } from './util.js';
import { withQueries, type QueryBundle } from './quality-queries.js';
import { withQuality, type QualityContext } from './quality-context.js';

export const MAX_REPAIRS = 3;

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
    if(e instanceof InfrastructureError || e instanceof ReplayDivergedError || e instanceof ReplayMissingError)throw e;
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
    return trainEstimateWindow(this.input.train);
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
      const expected = [...past.tasks.map((t)=>t.id)].sort();
      for (const result of [b,a]) if (JSON.stringify(result.tasks.map((t)=>t.task).sort()) !== JSON.stringify(expected)) throw new Error('Validation simulator omitted or substituted scheduled tasks');
      return replayDay(past.day, past.load, b, a);
    },
  };
}

export function completionOk(r: ReplayDay | null): boolean {
  return r !== null && r.after.tasks > 0 && r.after.tasks === r.before.tasks && r.after.completed === r.after.tasks && r.after.completed >= r.before.completed;
}

export const INTERACTION_TOLERANCE={clicks:0,scrolls:0,scrollPx:2,mouseTravelPx:2};
/** Strict improvement in at least one dimension; no count regression; 2% pixel noise tolerance. */
export function interactionAcceptable(r:ReplayDay):boolean{
 if(!completionOk(r))return false;
 return (['clicks','scrolls','scrollPx','mouseTravelPx'] as const).every(key=>{
  const before=r.before[key],after=r.after[key];if(typeof before!=='number'||typeof after!=='number')return false;
  return after<=before*(1+INTERACTION_TOLERANCE[key]/100)+((key==='mouseTravelPx'||key==='scrollPx')?1:0);
 });
}
export function improved(r: ReplayDay): boolean {
 return interactionAcceptable(r)&&(['clicks','scrolls','scrollPx','mouseTravelPx'] as const).some(key=>{
  const b=r.before[key],a=r.after[key];return typeof b==='number'&&typeof a==='number'&&a<b-((key==='mouseTravelPx'||key==='scrollPx')?1:0);
 });
}
export function sumSavings(cs: readonly Candidate[]): Savings {
 return cs.reduce<Savings>((acc,c)=>({clicks:acc.clicks+c.predicted.clicks,keystrokes:acc.keystrokes+c.predicted.keystrokes,scrolls:acc.scrolls+c.predicted.scrolls,klmDeciSec:0,
 mouseTravelPx:typeof acc.mouseTravelPx==='number'&&typeof c.predicted.mouseTravelPx==='number'?acc.mouseTravelPx+c.predicted.mouseTravelPx:null,
 scrollPx:typeof acc.scrollPx==='number'&&typeof c.predicted.scrollPx==='number'?acc.scrollPx+c.predicted.scrollPx:null}),{clicks:0,keystrokes:0,scrolls:0,klmDeciSec:0,mouseTravelPx:0,scrollPx:0});
}
export function predictionVerdict(predicted:Savings|null,measured:ReplayDay|null):{held:boolean|null;note:string}{
 if(!predicted||!measured)return {held:null,note:'No prediction or validation replay'};
 const keys=['clicks','scrolls','scrollPx','mouseTravelPx'] as const;
 const known=keys.filter(k=>typeof predicted[k]==='number'&&typeof measured.saving[k]==='number');
 const held=known.every(k=>(measured.saving[k]??0)>=(predicted[k]??0)*0.5);
 return {held:known.length?held:null,note:'Interaction counts and measured pixels only; prediction holds when every available predicted saving reaches 50%.'};
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
    flags: ['reporting: theoretical minima are post-run only; no search attempted overnight'],
    llmCalls: [],
    createdAt: new Date().toISOString(),
  };
}

export {InfrastructureError} from './errors.js';

export type DeployOutcome =
  | { ok: true; certificate: NonNullable<DecisionRecord['certificate']>; deployed: NonNullable<DecisionRecord['deployed']>; screenCheck: ScreenCheckResult }
  | { ok: false; reason: 'infrastructure-error' | 'screen-check' | 'deploy-refused'; check: CheckResult; screenCheck: ScreenCheckResult | null; stage?:string };

/**
 * The ONLY deploy path. Order (owner principle: everything verified before
 * login): the caller has already passed `ehr check`; then the offline screen
 * check (render-screens + app screen-check); then `ehr deploy`, which re-checks
 * (T4) and publishes. A version failing either gate is never deployed.
 */
export async function deployVersion(deps: LoopDeps, persona: string, program: Program, gate: Gate): Promise<DeployOutcome> {
  let stage='validation',screenCheck:ScreenCheckResult|null=null;
  try {
  if (gate.night !== undefined && !completionOk(gate.validation ?? null)) throw new Error('Full validation completion required before deploy');
  stage='build';
  const build = deps.ehr.mode === 'real' ? await retryInfrastructure('deploy:build',()=>installedBuild(undefined, deps.ehr.binary ?? undefined),true) : undefined;
  stage='screen-check';
  screenCheck = await retryScreens(deps.screens).check({ specVersion: gate.specVersion, program });
  if (screenCheck.status === 'error') throw new InfrastructureError(screenCheck.message);
  if (screenCheck.status !== 'pass') return { ok: false, reason: 'screen-check', check: screenCheckRejection(screenCheck), screenCheck };
  stage='native-deploy';
  const res = await deps.ehr.deploy({ specVersion: gate.specVersion, program, prev: gate.prev, canonical: gate.canonical, outDir: path.join(deps.store.dir, 'native', persona, `v${program.version}`) });
  if (!res.deployed) return { ok: false, reason: 'deploy-refused', check: toCheckResult(res.verdict), screenCheck };
  stage='snapshot';
  const {spec,inputs}=await retryInfrastructure('deploy:snapshot',async()=>{
  const specFile = gate.specVersion.endsWith('.json') ? gate.specVersion : path.join((await import('./util.js')).REPO_ROOT, 'releases', gate.specVersion, 'spec.json');
  const spec = deps.ehr.mode === 'real' ? JSON.parse(await (await import('node:fs/promises')).readFile(specFile, 'utf8')) : await deps.ehr.specExport(gate.specVersion);
  const inputsDir = path.join(deps.store.dir, 'certifications', persona, `v${program.version}`);
  await (await import('./util.js')).writeJson(path.join(inputsDir, 'spec.json'), spec);
  const inputs = { specVersion: res.certificate.specVersion, prev: expandProgram(gate.prev), canonical: expandProgram(gate.canonical), program, night: gate.night ?? null };
  await (await import('./util.js')).writeJson(path.join(inputsDir, 'inputs.json'), inputs);
  return {spec,inputs};
  },true);
  stage='publication';
  const deployed = await retryInfrastructure('deploy:publication',async()=>deps.store.deploy(persona, program, res.certificate, build ? { ...bindBuild(build, program, res.certificate), certificationInputsSha256: (await import('./program.js')).sha256((await import('./program.js')).stableStringify({spec,inputs})) } : undefined, gate.night),true);
  return { ok: true, certificate: res.certificate, deployed, screenCheck };
  } catch (error) {
    throw error instanceof InfrastructureError ? error : new InfrastructureError(`Deployment ${stage}: ${errorMessage(error)}`);
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
  if (dep.reason === 'infrastructure-error') {
    rec.flags.push(dep.check.message??'infrastructure-error');
  } else if (dep.reason === 'screen-check' && dep.screenCheck) {
    if(dep.screenCheck?.status==='error')rec.flags.push(`infrastructure-error [screen-check]: ${dep.screenCheck.message}`);
    rec.certification.attempts.push({ attempt: rec.certification.attempts.length, candidateIds: attempt.candidateIds, source: 'screen-check', patch: attempt.patch, check: dep.check });
    rec.certification.result = 'rejected';
    rec.flags.push(`screen check failed on ${dep.screenCheck.failingScreens.join(', ') || 'unknown screens'}; not deployed`);
  } else {
    rec.flags.push(`ehr deploy refused a version that passed check: ${dep.check.property ?? ''} ${dep.check.message ?? ''}`);
  }
}

export function compatible(a: Candidate, b: Candidate): boolean {
  const key = (p: string) => p.split('/').slice(0, 5).join('/');
  const ta = new Set(touchedPaths(a.patch).map(key));
  return touchedPaths(b.patch).every((p) => !ta.has(key(p)));
}

// ---------------------------------------------------------------- the nightly loop
export async function runNight(deps: LoopDeps, input: NightInput, options: { offline?: boolean; quality?: QualityContext; queryBundle?:QueryBundle; cadence?: CadenceNightOptions } = {}): Promise<NightResult> {
  if (options.cadence) {
    if (options.offline || options.quality || options.queryBundle) throw Error('Cadence uses its own protocol; offline quality arms remain unchanged');
    return runCadenceNight(deps, input, options.cadence);
  }
  if(options.queryBundle&&(!options.offline||!options.quality))throw new Error('Queries require offline arm C with train-only quality context');
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
    if (!options.offline) await deps.store.writeDecision(rec);
    return { record: rec, deployed };
  };

  // 2-3. Hypothesize and generate.
  let proposal: Proposal;
  try {
    proposal = await deps.agent.proposeCandidates({
      callId: callId(night, persona.id, 'propose-0'), purpose: 'propose', source: 'llm',
      parts: withQueries(withQuality(nightlyPrompt({ night, persona, spec: release.spec, program: current, evidence, history: input.history }), options.quality),options.queryBundle),
    });
  } catch (e) {
    if(e instanceof InfrastructureError || e instanceof ReplayDivergedError || e instanceof ReplayMissingError)throw e;
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
      parts: withQueries(withQuality(choosePrompt({ night, persona, spec: release.spec, program: current, stabilityBudget: release.spec.design.stabilityBudget, hypothesis: proposal.hypothesis, candidates: rec.candidates }), options.quality),options.queryBundle),
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
    if(e instanceof InfrastructureError || e instanceof ReplayDivergedError || e instanceof ReplayMissingError)throw e;
    rec.flags.push(`llm-error (choose): ${errorMessage(e)}`);
    rec.outcome = 'llm-error';
    return finish(null);
  }
  if (chosen.length === 0) {
    const best = [...eligible].sort((a, b) => (b.trainEstimate?.saving.clicks ?? 0) - (a.trainEstimate?.saving.clicks ?? 0))[0];
    if (!best) return finish(null);
    chosen = [best.candidate];
    rec.chosen = {
      candidateIds: [best.candidate.id],
      rationale: `loop fallback: the LLM choice was unusable, so the passing candidate with the largest train-day click saving (${best.trainEstimate?.saving.clicks ?? 0}/day) was taken`,
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
        parts: withQueries(withQuality(repairPrompt({ night, persona, spec: release.spec, program: current, attempt: r, maxAttempts: MAX_REPAIRS, failedSummaries: failed.ids, failedPatch: failed.patch, check: failed.check }), options.quality),options.queryBundle),
      });
    } catch (e) {
    if(e instanceof InfrastructureError || e instanceof ReplayDivergedError || e instanceof ReplayMissingError)throw e;
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
  rec.validation.reason = `validation day ${replay.day}: ${replay.saving.clicks} clicks, ${replay.saving.scrolls} scrolls, ${replay.saving.scrollPx??"unavailable"}px scroll, ${replay.saving.mouseTravelPx??"unavailable"}px mouse (keys secondary: ${replay.saving.keystrokes})`;

  if (options.offline) {
    rec.outcome = 'validation-accepted';
    rec.flags.push('offline, screen check skipped, simulator only; no user offer or deployment');
    return finish(null);
  }

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
    rec.outcome = dep.reason==='infrastructure-error'?(dep.stage==='screen-check'?'error':'infrastructure-error'):dep.screenCheck?.status==='error'?'error':dep.reason === 'screen-check' ? 'screen-check-failed' : 'certification-failed';
    return finish(null);
  }
  rec.versionAfter = finalProgram.version;
  rec.outcome = 'deployed';
  return finish(finalProgram);
}

export interface CadenceNightOptions {
  cadence?: ReleaseCadence;
  department: string;
  reviewGate?: ReviewGate;
  switchCost?: SwitchCost;
}

const replacementPatch = (program: Program): JsonPatchOp[] => jsonPatchSchema.parse([
  { op: 'replace', path: '/screens', value: program.screens },
  { op: 'replace', path: '/macros', value: program.macros },
]);

/** Finding is train-only. Only this function crosses into Holdout, after ranking
 * and review. Neither validation metrics nor outcomes return to archive feedback. */
async function runCadenceNight(deps: LoopDeps, input: NightInput, options: CadenceNightOptions): Promise<NightResult> {
  const { current, persona, night, release } = input;
  if (input.train.some(d => d.schedule.day > night || d.schedule.day % 2 === 0 || d.result.day !== d.schedule.day ||
    d.result.persona !== persona.id || d.schedule.persona !== persona.id))
    throw Error('Cadence archive accepts past odd train days only');
  if (!options.department.trim()) throw Error('Archive requires a department');
  if (deps.ehr.mode === 'real' && deps.screens.mode !== 'real') throw Error('Real archive requires real screen evidence');
  const cadence = options.cadence ?? { kind: 'nightly' };
  const due = releaseDue(night, cadence);
  const gate: Gate = { specVersion: release.specVersion, prev: current, canonical: release.canonical, nextVersion: current.version + 1, night };
  const archiveStore = new DesignArchiveStore(path.join(deps.store.dir, 'archives'), {
    clinician: persona.id, owner: persona.userId, department: options.department, role: current.role,
  });
  const snapshot = await archiveStore.before(night, deps.ehr.mode);
  const rec = emptyRecord(deps, { ...input, specVersion: release.specVersion, spec: release.spec },
    summarizeTrain(persona.id, current, input.train, input.programs));
  rec.mode = 'cadence';
  rec.cadence = { protocol: CADENCE_PROTOCOL, cadence: stableStringify(cadence), due,
    archive: path.relative(deps.store.dir, archiveStore.directory), niches: 0, offers: [], review: null };
  const reviewGate = options.reviewGate ?? autoApprove;
  const estimator = new TrainEstimator(deps, input, release.specVersion);
  const context = { clinician: persona.id, department: options.department, role: current.role, train: trainEstimateWindow(input.train) };
  const workflows: Workflow[] = [...new Set(context.train.flatMap(d => d.schedule.tasks.map(t => t.workflow)))];
  const newCandidates: Candidate[] = [];
  try {
    const parts = nightlyPrompt({ night, persona, spec: release.spec, program: current, evidence: rec.evidence, history: input.history });
    parts.prompt += `\nStanding quality-diversity archive (train evidence only):\n${JSON.stringify(archiveFeedback(snapshot))}`;
    const proposal = await deps.agent.proposeCandidates({ callId: callId(night, persona.id, 'propose-0'), purpose: 'propose', source: 'llm', parts });
    rec.llmCalls.push(proposal.call);
    rec.hypothesis = proposal.hypothesis;
    newCandidates.push(...proposal.candidates);
    for (const u of proposal.undecodable) {
      const c: Candidate = { id: u.id, summary: u.summary, moveType: 'reorder', rationale: '', targets: [], patch: [],
        predicted: sumSavings([]), source: 'llm', seeded: false, seededKind: null };
      snapshot.entries.push({ id: `${night}:${u.id}`, night, candidateIds: [u.id], candidate: c, program: null,
        observations: [{ night, baseHash: programHash(current), specHash: sha256(stableStringify(release.spec)), programHash: null, check: invalidPatch(u.error), trainEstimate: null, screen: null, switchCost: null, staticError: u.error }] });
      rec.candidates.push({ candidate: c, check: invalidPatch(u.error), trainEstimate: null, componentsMoved: null });
    }
  } catch (error) {
    if (error instanceof InfrastructureError || error instanceof ReplayDivergedError || error instanceof ReplayMissingError) throw error;
    // A discovery failure does not cancel a due release of the standing archive.
    rec.flags.push(`llm-error: ${errorMessage(error)}`);
  }
  rec.backend = backendInfo(deps.agent, rec.llmCalls);

  // Reuse the admitted explore generator; cycle across layouts, density and
  // input, skipping already evaluated designs. No additional model calls.
  if (workflows.length) {
    const points = seedPoints().flatMap(p => (['normal', 'compact'] as const).flatMap(density =>
      (['mouse', 'keyboard'] as const).map(input => ({ ...p, density, input }))));
    for (let offset = 0; offset < points.length; offset++) {
      const point = points[(night - 1 + offset) % points.length];
      if (!point) continue;
      try {
        const generated = generate(point, workflows, current, release.spec);
        if (designHash(generated.program) === designHash(current) || snapshot.entries.some(e => e.program && designHash(e.program) === designHash(generated.program))) continue;
        newCandidates.push({ id: `explore-${night}`, summary: `Explore ${niche(generated.point)}`, moveType: 'reorder',
          rationale: 'Fill an admitted design niche', targets: [], patch: replacementPatch(generated.program),
          predicted: sumSavings([]), source: 'explore', seeded: false, seededKind: null });
        break;
      } catch (error) {
        // Missing realizations (e.g. no clinical groups) are unsupported seeds,
        // not certified archive entries. LLM proposals are never discarded here.
        rec.flags.push(`explore seed ${niche(point)} unavailable: ${errorMessage(error)}`);
      }
    }
  }
  const seeded = pickSeeded(deps.seedPolicy, deps.seedState, current, release.spec, night);
  if (seeded) { deps.seedState.injected++; newCandidates.push(seeded); }
  // Small disjoint bundles are additional designs, certified as a whole. The
  // full merged stability budget is checked, never the sum of singleton claims.
  const prior = snapshot.entries.filter(e => e.candidateIds.length === 1 && e.program?.specVersion === release.specVersion &&
    !e.candidate.seeded && e.observations[0]?.baseHash === programHash(current) && e.observations.at(-1)?.check.status === 'pass' &&
    e.observations.at(-1)?.screen?.status === 'pass' && (() => {
      const o = e.observations.at(-1), t = o?.trainEstimate;
      return t && (t.before.clicks + t.before.scrolls - t.after.clicks - t.after.scrolls) / t.days.length > (o?.switchCost?.cost ?? 0);
    })())
    .sort((a,b) => (b.observations.at(-1)?.trainEstimate?.saving.clicks ?? 0) - (a.observations.at(-1)?.trainEstimate?.saving.clicks ?? 0));
  const singles = [...new Map([...prior.map(e => e.candidate), ...newCandidates.filter(c => !c.seeded)]
    .filter(c => c.patch.every(op => op.path !== '/screens' && op.path !== '/macros'))
    .map(c => [stableStringify(c.patch), c])).values()].slice(0, 6);
  const members = new Map<string, string[]>();
  for (let i = 0; i < singles.length; i++) for (let j = i+1; j < singles.length; j++) {
    const a = singles[i], b = singles[j];
    if (!a || !b || !compatible(a,b)) continue;
    const id = `${a.id}+${b.id}`;
    const patch = [...a.patch,...b.patch];
    if (snapshot.entries.some(e => e.candidate.source === 'archive-bundle' && e.observations[0]?.baseHash === programHash(current) &&
      stableStringify(e.candidate.patch) === stableStringify(patch))) continue;
    members.set(id, [a.id,b.id]);
    newCandidates.push({ ...a, id, source: 'archive-bundle', summary: `${a.summary}; ${b.summary}`, patch, predicted: sumSavings([a,b]) });
  }
  for (const candidate of newCandidates) {
    const attempt = await checkPatch(deps.ehr, current, candidate.patch, gate);
    const observation: ArchiveObservation = { night, baseHash: programHash(current), specHash: sha256(stableStringify(release.spec)),
      programHash: attempt.program ? programHash(attempt.program) : null, check: attempt.check, trainEstimate: null, screen: null, staticError: null, switchCost: null };
    const entry: ArchiveEntry = { id: `${night}:${candidate.id}`, night, candidateIds: members.get(candidate.id) ?? [candidate.id],
      candidate, program: attempt.program, observations: [observation] };
    snapshot.entries.push(entry);
    if (!entry.program || candidate.seeded) rec.candidates.push({ candidate, check: attempt.check, trainEstimate: null, componentsMoved: null });
  }

  const evaluations: Evaluation[] = [];
  const offers = new Map<string, ReviewBundle>();
  // Re-score all unique retained designs on THIS clinician's recent train
  // window, against the currently deployed baseline. Old specs remain recorded
  // but cannot ship into a new release; candidates are never silently rebased.
  const refreshed = new Map<string, ArchiveObservation>();
  for (const entry of snapshot.entries) {
    if (!entry.program || entry.candidate.seeded || entry.program.specVersion !== release.specVersion) continue;
    const program = { ...entry.program, version: current.version + 1 };
    if (program.owner !== current.owner || program.id !== current.id || program.role !== current.role) throw Error('Archive identity mismatch');
    const hash = designHash(program);
    let observation = refreshed.get(hash);
    if (!observation) {
      const check = toCheckResult(await deps.ehr.check({ specVersion: release.specVersion, program, prev: current, canonical: release.canonical }));
      observation = { night, baseHash: programHash(current), specHash: sha256(stableStringify(release.spec)), programHash: programHash(program), check, trainEstimate: null, screen: null, staticError: null, switchCost: null };
      try { validateCandidate(describeProgram(program, workflows), current, release.spec); }
      catch (error) { observation.staticError = errorMessage(error); }
      if (check.status === 'pass' && !observation.staticError) {
        observation.screen = await retryScreens(deps.screens).check({ specVersion: release.specVersion, program });
        if (observation.screen.status === 'pass') {
          observation.trainEstimate = await estimator.estimate(program);
          const cost = await (options.switchCost ?? usageWeightedSwitchCost)(structuredClone(current), structuredClone(program), structuredClone(context));
          if (!Number.isFinite(cost.cost) || cost.cost < 0) throw Error('Switch cost must be finite and nonnegative');
          observation.switchCost = cost;
        }
      }
      refreshed.set(hash, observation);
    }
    if (entry.observations.at(-1)?.night === night) entry.observations[entry.observations.length-1] = observation;
    else entry.observations.push(observation);
    if (entry.night === night) {
      rec.candidates.push({ candidate: entry.candidate, check: observation.check,
        trainEstimate: observation.trainEstimate, componentsMoved: componentsMoved(current, program) });
      if (observation.screen?.status === 'fail') rec.certification.attempts.push({
        attempt: rec.certification.attempts.length, candidateIds: entry.candidateIds, source: 'screen-check',
        patch: entry.candidate.patch, check: screenCheckRejection(observation.screen),
      });
    }
    const estimate = observation.trainEstimate, cost = observation.switchCost, screen = observation.screen;
    if (observation.check.status !== 'pass' || observation.staticError || !estimate || !cost || screen?.status !== 'pass' ||
      estimate.after.tasks < 1 || estimate.before.tasks !== estimate.after.tasks || estimate.after.completed !== estimate.after.tasks) continue;
    const candidate = describeProgram(program, workflows);
    const score = (estimate.before.clicks + estimate.before.scrolls - estimate.after.clicks - estimate.after.scrolls) / estimate.days.length - cost.cost;
    const id = hash;
    evaluations.push({ id, candidate, status: 'accepted', metrics: estimate.after, quality: score,
      evidence: { leanVerdict: 'ok', screenStatus: 'pass', trainDays: estimate.days } });
    offers.set(id, { id, candidateIds: entry.candidateIds, program,
      evidence: { train: estimate, switchCost: cost, score, moved: componentsMoved(current, program), leanVerdict: 'ok', screen, niche: niche(candidate.point) } });
  }
  const archive = archiveFrom(evaluations);
  snapshot.night = night;
  snapshot.cells = Object.fromEntries([...archive.cells].map(([key,e]) => [key,e.id]));
  rec.cadence.niches = archive.cells.size;
  rec.flags.push(...noteRejections(deps.seedState, rec.candidates));
  await archiveStore.save(snapshot);
  const finish = async (deployed: Program | null): Promise<NightResult> => {
    await deps.store.writeDecision(rec);
    return { record: rec, deployed };
  };
  if (!due) { rec.outcome = 'release-deferred'; rec.validation.reason = 'Candidates archived; next release slot pending'; return finish(null); }
  const ranked = [...archive.cells.values()].map(e => offers.get(e.id)).filter((b): b is ReviewBundle => Boolean(b && b.evidence.score > 0))
    .sort((a,b) => b.evidence.score-a.evidence.score || a.id.localeCompare(b.id)).slice(0,3);
  const [first, second, third] = ranked;
  if (!first) { rec.outcome = 'archived'; rec.validation.reason = 'No complete bundle with positive net train score'; return finish(null); }
  const choices: ReviewChoices = second ? third ? [first,second,third] : [first,second] : [first];
  rec.cadence.offers = choices.map(b => ({ id: b.id, candidateIds: b.candidateIds, score: b.evidence.score,
    switchCost: b.evidence.switchCost.cost, switchModel: b.evidence.switchCost.model, assumption: b.evidence.switchCost.assumption }));
  // Pass a clone: a UI hook can choose a bundle, never mutate certified bytes.
  const review = await reviewGate.review(structuredClone({ protocol: CADENCE_PROTOCOL, night, clinician: persona.id,
    department: options.department, role: current.role, bundles: choices }));
  if (typeof review.reason !== 'string' || !review.reason.trim() ||
    (review.chosenBundle !== null && !choices.some(b => b.id === review.chosenBundle))) throw Error('Review gate returned an invalid choice/reason');
  rec.cadence.review = { gate: reviewGate.id, ...review };
  if (review.chosenBundle === null) { rec.outcome = 'review-declined'; rec.validation.reason = review.reason; return finish(null); }
  const chosen = choices.find(b => b.id === review.chosenBundle);
  if (!chosen) throw Error('Review choice missing');
  const program = chosen.program;
  for (const id of chosen.candidateIds) {
    if (rec.candidates.some(e => e.candidate.id === id)) continue;
    const entry = snapshot.entries.find(e => e.candidate.id === id);
    const observation = entry?.observations.at(-1);
    if (entry && observation) rec.candidates.push({ candidate: entry.candidate, check: observation.check,
      trainEstimate: observation.trainEstimate, componentsMoved: entry.program ? componentsMoved(current,entry.program) : null });
  }
  rec.chosen = { candidateIds: chosen.candidateIds, rationale: review.reason, choiceBy: 'review-gate', rejectedAlternatives: [] };
  rec.predicted = { ...chosen.evidence.train.saving, klmDeciSec: 0 };
  const patch = replacementPatch(program);
  const check = toCheckResult(await deps.ehr.check({ specVersion: release.specVersion, program, prev: current, canonical: release.canonical }));
  rec.certification.attempts.push({ attempt: 0, candidateIds: chosen.candidateIds, source: 'merged', patch, check });
  rec.certification.result = check.status === 'pass' ? 'certified' : 'rejected';
  if (check.status !== 'pass') { rec.outcome = 'certification-failed'; return finish(null); }
  const replay = await input.holdout.validate(current, program, release.specVersion);
  rec.validation = { replay, stabilityOk: chosen.evidence.moved <= release.spec.design.stabilityBudget,
    improved: replay ? improved(replay) : null, accepted: false, reason: 'Release validation did not improve' };
  rec.measured.validation = replay;
  const prediction = predictionVerdict(rec.predicted, replay);
  rec.measured.predictionHeld = prediction.held; rec.measured.predictionNote = prediction.note;
  if (!rec.validation.stabilityOk || !rec.validation.improved) { rec.outcome = 'validation-rejected'; return finish(null); }
  rec.validation.accepted = true; rec.validation.reason = 'Reviewed bundle passed past-calibration replay';
  rec.userResponse = userResponse(deps, night, persona.id, chosen.evidence.moved);
  if (rec.userResponse.response === 'reverted') { rec.outcome = 'user-reverted'; return finish(null); }
  const deployed = await deployVersion(deps, persona.id, program, { ...gate, validation: replay });
  recordDeploy(rec, deployed, { candidateIds: chosen.candidateIds, patch });
  if (!deployed.ok) { rec.outcome = deployed.reason === 'screen-check' ? 'screen-check-failed' : 'certification-failed'; return finish(null); }
  rec.versionAfter = program.version; rec.outcome = 'deployed';
  return finish(program);
}
