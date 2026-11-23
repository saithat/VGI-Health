import { LeanLayoutRefusal } from './lean-layout-refusal.js';
import { scoredPair,releaseScoringSchema,RELEASE_SCORING_POLICY } from './release-scoring.js';
import { type InformationEffort } from './hotspots.js';
import { sha256,stableStringify } from './program.js';
import { retryInfrastructure } from './infrastructure.js';
import { retryScreens } from './retry-boundaries.js';
import { ReplayDivergedError,ReplayMissingError } from './backends/replay.js';
import { InfrastructureError } from './errors.js';
import { calibrationPartition,validationSeed,trainEstimateWindow } from './protocol.js';
import { expandProgram } from './composites.js';
import path from 'node:path';
import { bindBuild,installedBuild } from './build-binding.js';
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
import type { AgentBackend } from './agent.js';
import type { EhrClient } from './ehr.js';
import { addMetrics,pairedMetrics,pctAboveFloor,saving,sumMetrics,type TrainDay } from './observe.js';
import { applyToProgram,componentsMoved } from './program.js';
import { type HistoryItem,type PersonaView } from './prompts.js';
import type { Release } from './releases.js';
import {
violationOf,type Candidate,type CheckResult,type DayResult,type DaySchedule,type DecisionRecord,type EvaluatedCandidate,
type UserMemory,type JsonPatchOp,type LlmCallRef,type Program,type ReplayDay,type Savings,type Spec,type ScreenCheckResult,type TrainSummary,type Verdict
} from '../../app/src/dashboard/agent-evidence.js';
import { rejectionKind,type SeedState } from './seeded.js';
import { noAgentReference } from './vendor-reference.js';
import { screenCheckRejection,type ScreenChecker } from './screen-gate.js';
import type { RunStore } from './store.js';
import { errorMessage,hash32,pad2,rng } from './util.js';

export const MAX_REPAIRS = 3;

/** Opaque access to the past validation partition. Returns aggregates only; never feeds a prompt. */
export interface Holdout {
  readonly day: number | null;
  validate(before: Program, after: Program, specVersion: string, canonical?: Program): Promise<ReplayDay | null>;
}

export interface LoopDeps {
  runId: string;
  store: RunStore;
  ehr: EhrClient;
  /** Offline per-version screen check; must pass before any `ehr deploy`. */
  screens: ScreenChecker;
  agent: AgentBackend;

  seedState: SeedState;
  worldDir: string;
  worldSeed: number;
  incompletePenalty?: number;
}

export interface NightInput {
  /** Field-only workload declaration; never included in agent prompts. */
  declaredWorkload?: DaySchedule['tasks'];
  night: number;
  informationEffort?: readonly InformationEffort[];
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
  workspace?:{schedule:DaySchedule;worldDir:string};
  referenceProgram?: Program;
  workload?: DaySchedule['tasks'];
  specVersion: string;
  /** Previous version bound into certification. */
  prev: Program;
  canonical: Program;
  nextVersion: number;
  night?: number;
  validation?: ReplayDay | null;
}

/** Apply a patch to `base` and run `ehr check`. */
export async function checkPatch(ehr: EhrClient, base: Program, patch: readonly JsonPatchOp[], gate: Gate, screens?:ScreenChecker): Promise<{ program: Program | null; check: CheckResult }> {
  const prepared = preparePatch(base, patch, gate);
  if (!prepared.program) return prepared;
  return certifyPatch(ehr, prepared.program, gate, screens);
}

export function preparePatch(base: Program, patch: readonly JsonPatchOp[], gate: Gate) {
  let program: Program;
  try {
    program = applyToProgram(base, patch, { version: gate.nextVersion, specVersion: gate.specVersion }).program;
    expandProgram(program);
    return { program };
  } catch (e) {
    if(e instanceof InfrastructureError || e instanceof ReplayDivergedError || e instanceof ReplayMissingError)throw e;
    return { program: null, check: invalidPatch(e) };
  }
}

export async function certifyPatch(ehr: EhrClient, program: Program, gate: Gate, screens?: ScreenChecker) {
  const verdict = await ehr.check({ specVersion: gate.specVersion, program, prev: gate.prev, canonical: gate.canonical, ...(gate.workload ? {workload:gate.workload} : {}) });
  if(verdict==='ok'&&screens?.mode==='lean'){
    const screen=await retryScreens(screens).check({specVersion:gate.specVersion,program,...gate.workspace});
    if(screen.status!=='pass')return {program,check:screenCheckRejection(screen)};
  }
  return { program, check: toCheckResult(verdict) };
}

/** Simulate train schedules on the current program and a candidate; saving per train day. */
export class TrainEstimator {
  private readonly baseline = new Map<number, DayResult>();
  private readonly vendor = new Map<number, DayResult>();
  constructor(private readonly deps: LoopDeps, private readonly input: NightInput, private readonly specVersion: string, private readonly canonical: Program = input.release.canonical) {}

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
      // Both candidates start from the same experienced actor snapshot.
      ...(persona.policy === 'bounded' && day.result.memory ? {memory:day.result.memory} : {}),
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
      let vendor=this.vendor.get(d.schedule.day);
      if(!vendor) {
        vendor=await this.run({...this.canonical,owner:this.input.current.owner,id:this.input.current.id},d);
        this.vendor.set(d.schedule.day,vendor);
      }
      const pair = scoredPair(b, await this.run(candidate, d), vendor, this.deps.incompletePenalty);
      before = addMetrics(before, pair.before);
      after = addMetrics(after, pair.after);
    }
    return { days: days.map((d) => d.schedule.day), before, after, saving: saving(before, after, days.length) };
  }
}

export async function evaluateCandidate(deps: LoopDeps, base: Program, c: Candidate, gate: Gate, estimator: TrainEstimator | null): Promise<EvaluatedCandidate> {
  const { program, check } = await checkPatch(deps.ehr, base, c.patch, gate,deps.screens);
  try {
    const trainEstimate = program && check.status === 'pass' && !c.seeded && estimator ? await estimator.estimate(program) : null;
    return { candidate: c, check, trainEstimate, componentsMoved: program ? componentsMoved(base, program) : null };
  }catch(error){
    if(!(error instanceof LeanLayoutRefusal))throw error;
    return {candidate:c,check:screenCheckRejection(error.result),trainEstimate:null,componentsMoved:program?componentsMoved(base,program):null};
  }
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

export function replayDay(day: number, load: string, before: DayResult, after: DayResult): Omit<ReplayDay,'bounded'> {
  const { before: b, after: a } = pairedMetrics(before, after);
  return { day, load, before: b, after: a, saving: saving(b, a), pctAboveFloor: { before: pctAboveFloor(before), after: pctAboveFloor(after) } };
}

/** R2 policy change: independent expert and bounded validation, all past holdouts.
 * Each arm starts each dated schedule from the same cloned train-only snapshot.
 * No validation output is carried into the actor or a later replay. */
export function makeHoldout(deps: LoopDeps, persona: PersonaView, schedules: DaySchedule | readonly DaySchedule[] | null,
  memory?: UserMemory): Holdout {
  const past=(schedules ? (Array.isArray(schedules)?schedules:[schedules]) : [])
    .map(s=>calibrationPartition(s,'validation')).filter(s=>s.tasks.length>0);
  if(past.some(s=>s.day%2===0 || s.persona!==persona.id) || new Set(past.map(s=>s.day)).size!==past.length)
    throw Error('Validation requires unique odd calibration days for this clinician');
  const snapshot=structuredClone(memory);
  const penalty=releaseScoringSchema.parse({incompletePenalty:deps.incompletePenalty}).incompletePenalty;
  return {
    day: past.at(-1)?.day ?? null,
    async validate(before, after, specVersion, canonical=before) {
      const latest=past.at(-1);
      if (!latest) return null;
      for (const program of [before, after, canonical]) {
        const verdict = await deps.ehr.check({ specVersion, program, prev: program, canonical: program });
        if (verdict !== 'ok') throw new Error(`Refusing uncertified validation replay: ${JSON.stringify(verdict)}`);
      }
      if(snapshot && snapshot.actor!==before.owner)throw Error('Foreign clinician train memory');
      const initial=snapshot ?? {actor:before.owner,entries:[]};
      const totals={expert:{before:sumMetrics([]),after:sumMetrics([])},bounded:{before:sumMetrics([]),after:sumMetrics([])}};
      for (const schedule of past) {
        for(const policy of ['expert','bounded'] as const) {
          const run=async(program:Program)=>{
            const result=await deps.ehr.simulate({specVersion,persona:persona.params,schedule,worldDir:deps.worldDir,
              seed:validationSeed(deps.worldSeed,schedule.day),program,policy,
              ...(policy==='bounded'?{memory:structuredClone(initial)}:{})});
            const expected=schedule.tasks.map(t=>t.id).sort();
            if(result.day!==schedule.day || result.persona!==persona.id || result.programVersion!==program.version ||
              JSON.stringify(result.tasks.map(t=>t.task).sort())!==JSON.stringify(expected))
              throw Error('Validation simulator omitted or substituted scheduled tasks or identity');
            if(policy==='bounded' && (result.policy!=='bounded'||!result.memory||result.memory.actor!==before.owner))
              throw Error('Missing bounded validation evidence');
            return result;
          };
          const b=await run(before),a=await run(after),vendor=await run(canonical);
          const pair=scoredPair(b,a,vendor,penalty);
          totals[policy].before=addMetrics(totals[policy].before,pair.before);
          totals[policy].after=addMetrics(totals[policy].after,pair.after);
        }
      }
      const bounded={...totals.bounded,saving:saving(totals.bounded.before,totals.bounded.after,past.length)};
      const reasons=boundedRefusals(bounded);
      return {day:latest.day,load:'pooled past calibration holdouts',days:past.map(s=>s.day),
        taskCounts:past.map(s=>({day:s.day,tasks:s.tasks.length})),...totals.expert,
        saving:saving(totals.expert.before,totals.expert.after,past.length),
        pctAboveFloor:{before:null,after:null},scoring:{policy:RELEASE_SCORING_POLICY,incompletePenalty:penalty},
        bounded:{...bounded,policy:'bounded',memorySha256:sha256(stableStringify(initial)),memorySource:'train-only',accepted:reasons.length===0,reasons}};
    },
  };
}

export const BOUNDED_KEYS=['clicks','scrolls','keystrokes','klmDeciSec'] as const;
/** The bounded learner's replay is noisier than the expert's: allow 2% on every
 * bounded effort measure, so single-action jitter does not refuse a release. */
export const BOUNDED_TOLERANCE={clicks:2,scrolls:2,keystrokes:2,klmDeciSec:2} as const;
export function boundedRefusals(r:Pick<ReplayDay,'before'|'after'>):string[] {
  const reasons:string[]=[];
  if(!completionOk(r))reasons.push('full bounded task completion required');
  for(const key of BOUNDED_KEYS) {
    const b=r.before[key],a=r.after[key];
    if(!Number.isFinite(b)||!Number.isFinite(a)||a>b*(1+BOUNDED_TOLERANCE[key]/100))
      reasons.push(`${key}: ${b} → ${a} exceeds ${BOUNDED_TOLERANCE[key]}%`);
  }
  return reasons;
}
export function learnabilityOk(replay:ReplayDay|null):boolean {
  const bounded=replay?.bounded;
  return !!bounded && boundedRefusals(bounded).length===0 && (bounded.memorySource!=='all-past' ||
    (bounded.after.clicks<=bounded.before.clicks && bounded.after.scrolls<=bounded.before.scrolls));
}

export function completionOk(r: Pick<ReplayDay,'before'|'after'> | null): boolean {
  return r !== null && r.after.tasks > 0 && r.after.tasks === r.before.tasks && r.after.completed === r.after.tasks && r.after.completed >= r.before.completed;
}

// R1 policy change: constrain typing and modeled time as well as physical effort.
export const INTERACTION_TOLERANCE={clicks:0,scrolls:0,scrollPx:2,mouseTravelPx:2,keystrokes:2,klmDeciSec:2};
export const INTERACTION_KEYS=['clicks','scrolls','scrollPx','mouseTravelPx','keystrokes','klmDeciSec'] as const;
/** Full completion; no click/scroll regression; 2% pixels, typing and time tolerance.
 * The extra one-unit rounding allowance applies only to measured pixels. */
export function interactionAcceptable(r:ReplayDay):boolean{
 if(!completionOk(r))return false;
 return INTERACTION_KEYS.every(key=>{
  const before=r.before[key],after=r.after[key];if(typeof before!=='number'||typeof after!=='number'||!Number.isFinite(before)||!Number.isFinite(after))return false;
  return after<=before*(1+INTERACTION_TOLERANCE[key]/100)+((key==='mouseTravelPx'||key==='scrollPx')?1:0);
 });
}
/** Exact daily effect for pooled validation; display savings are rounded. */
export function validationGross(r:ReplayDay):number {
  return (r.before.clicks+r.before.scrolls-r.after.clicks-r.after.scrolls)/(r.days?.length??1);
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
  const name = agent.name === 'claude' || agent.name === 'codex' || agent.name === 'openai-compat' || agent.name === 'replay' || agent.name === 'scripted' ? agent.name : 'scripted';
  if (first?.replayOf) return { name, model: first.replayOf.model, replayOf: first.replayOf };
  return { name, model: first?.model ?? agent.model, replayOf: null };
}

export function userResponse(deps: LoopDeps, night: number, persona: string): DecisionRecord['userResponse'] {
  const probability = 0.05;
  const draw = rng(hash32(`${deps.worldSeed}:${night}:${persona}:user`))();
  return draw < probability
    ? { response: 'reverted', probability, reason: `simulated user reverted the change at login (p=${probability.toFixed(2)})` }
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
  if (gate.night !== undefined && (!completionOk(gate.validation ?? null) || !learnabilityOk(gate.validation ?? null))) throw new Error('Full expert completion and R2 bounded validation required before deploy');
  stage='build';
  const build = deps.ehr.mode === 'real' ? await retryInfrastructure('deploy:build',()=>installedBuild(undefined, deps.ehr.binary ?? undefined),true) : undefined;
  stage='screen-check';
  const referenceProgram=gate.referenceProgram ?? await noAgentReference(deps.store.dir,gate.night===undefined?Infinity:gate.night+1)({specVersion:gate.specVersion,program});
  screenCheck = await retryScreens(deps.screens).check({ specVersion: gate.specVersion, program, ...gate.workspace, ...(referenceProgram?{referenceProgram}:{}) });
  if (screenCheck.status === 'error') throw new InfrastructureError(screenCheck.message);
  if (screenCheck.status !== 'pass') return { ok: false, reason: 'screen-check', check: screenCheckRejection(screenCheck), screenCheck };
  stage='native-deploy';
  const res = await deps.ehr.deploy({ specVersion: gate.specVersion, program, prev: gate.prev, canonical: gate.canonical, ...(gate.workload ? {workload:gate.workload} : {}), outDir: path.join(deps.store.dir, 'native', persona, `v${program.version}`) });
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
