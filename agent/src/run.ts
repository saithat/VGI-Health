import { generatorOnlyBackend } from './generator-only.js';
import { BOUNDED_COST_MODEL } from './bounded-tailoring.js';
import { SESSION_GATE_ID } from './session-gate.js';
import { CADENCE_PROTOCOL, autoApprove, cadenceSchema, type ReleaseCadence, type ReviewGate, type SwitchCost } from './cadence.js';
import { ReplayLlm } from './backends/replay.js';
import { armCrashHook } from './crash-hook.js';
import { retryEhr } from './retry-boundaries.js';
import { retryInfrastructure,infrastructureContext,type InfrastructureRetry } from './infrastructure.js';
import { contentDigest,writeDayDigest } from './content-digest.js';
import {geometryEhr,type GeometryProvider} from './geometry.js';
import {InfrastructureError} from './night.js';
import {noAgentDay} from './no-agent.js';
import { assertCertified } from './certification.js';
import { fileHash,runFingerprints,treeHash } from './fingerprints.js';
import { calibrationDay, calibrationPartition, isMeasurementDay, measurementProtocol } from './protocol.js';
import { auditRunTranscripts } from './backends/isolation.js';
/**
 * Run orchestrator: N work-days x personas (BRIEF 8.1).
 *
 *   for each day d, for each persona:
 *     login (load the deployed program) -> simulate the shift -> logout
 *   then, unless d is the last day, the night: vendor release v2 before
 *   Day 4 (surface-feature), v3 before Day 7 (migrate), else the nightly loop.
 *   Only certified versions are deployed; they take effect at the next login.
 *
 * After the last day, accepted versions get their recorded blind even-day test
 * measurement versus the certified active-release canonical.
 */
import { RELEASE_IDS, RELEASE_DAYS } from './release-config.js';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { recordingEhr } from './recording-ehr.js';
import { LlmAgent } from './agent.js';
import { RecordingLlm } from './backends/recording.js';
import type { JsonLlm } from './backends/types.js';
import { createEhr, type EhrClient } from './ehr.js';
import { runMigration, runSurfaceFeature } from './modes.js';
import { daySeed, deployVersion, makeHoldout, replayDay, runNight, type LoopDeps, type NightResult } from './night.js';
import { createScreenChecker, type ScreenChecker } from './screencheck.js';
import type { TrainDay } from './observe.js';
import { sha256,stableStringify,personalize } from './program.js';
import type { HistoryItem, PersonaView } from './prompts.js';
import { loadRelease, releaseForPersona, type Release } from './releases.js';
import { dayResultSchema, programSchema, type DecisionRecord, type Program } from './schema.js';
import { rejectionKind, type SeedPolicy, type SeedState } from './seeded.js';
import { RunStore } from './store.js';
import { loadWorld } from './world.js';
import { REPO_ROOT, readJson, writeJson } from './util.js';

export interface RunOptions {
  /** Omit for the historical nightly protocol. Cadence runs have a separate name. */
  protocol?: 'core-10day-live' | typeof CADENCE_PROTOCOL;
  cadence?: ReleaseCadence;
  departments?: Record<string, string>;
  generatorOnly?: boolean;
  /** Generator-only discovery cutoff; retained bundles are still rescored/reviewed. */
  discoveryNights?: number;
  boundedCosts?: boolean;
  tailoringSessions?: boolean;
  frictionFlags?: readonly import('./session-schema.js').FrictionFlag[];
  reviewGate?: ReviewGate;
  switchCost?: SwitchCost;
  /** Stable identity for a supplied switch-cost implementation (resume provenance). */
  switchCostModel?: string;
  /** Explicit synthetic fixture for the native determinism harness; never a live run. */
  verificationRelease?: Release;
  days: number;
  parallel?:boolean;
  llm: JsonLlm;
  worldDir: string;
  runsRoot?: string;
  runId?: string;
  /** Reuse completed days/decisions and certified programs; retry only the unfinished night. */
  resume?: boolean;
  personas?: string[];
  seedPolicy?: SeedPolicy;
  /** Day on which each release takes effect at login. */
  releaseDays?: { v2: number; v3: number };
  ehr?: EhrClient;
  /** Offline screen check (default: fake under EHR_FAKE=1, else render-screens + app screen-check). */
  screens?: ScreenChecker;
  geometry?:GeometryProvider;
  /** Sample FHIR bundles for render-screens (default: EHR_SAMPLE_FHIR). */
  fhirBundles?: string[];
  log?: (line: string) => void;
}

export interface PersonaTimeline {
  persona: string;
  days: { day: number; programVersion: number; specVersion: string; load: string; clicks: number; keystrokes: number; scrolls: number; scrollPx:number|null;mouseTravelPx:number|null }[];
  nights: { night: number; mode: string; outcome: string; versionBefore: number; versionAfter: number; rejected: number; seeded: number }[];
}

export interface RunSummary {
  runId: string;
  dir: string;
  timelines: PersonaTimeline[];
  screenFailures: {night:number;persona:string;message:string}[];
  rejections: { night: number; persona: string; candidate: string; seeded: boolean; property: string | null; message: string | null }[];
  seededRejectedKinds: string[];
  invalidPatches: {persona:string;night:number;candidate:string}[];
  infrastructureErrors: {persona:string;night:number;message:string}[];
  llmErrors: { persona: string; night: number; message: string }[];
}

export function deployedPatch(r: DecisionRecord): HistoryItem['patch'] {
  if (!r.deployed || r.outcome === 'migration-fallback' || r.outcome === 'recertified' || r.outcome === 'not-surfaced') return [];
  const ok = [...r.certification.attempts].reverse().find((a) => a.check.status === 'pass');
  return ok?.patch ?? [];
}

export function historyItem(r: DecisionRecord): HistoryItem {
  const byId = new Map(r.candidates.map((e) => [e.candidate.id, e.candidate]));
  const outcome = r.outcome === 'deployed' || r.outcome === 'surfaced' || r.outcome === 'migrated' ? 'accepted' : r.outcome;
  return {
    night: r.night,
    mode: r.mode,
    outcome,
    chosen: (r.chosen?.candidateIds ?? []).map((id) => {
      const c = byId.get(id);
      return { id, summary: c?.summary ?? '', moveType: c?.moveType ?? '' };
    }),
    patch: deployedPatch(r),
  };
}

async function personaPhase<T>(items:readonly T[],parallel:boolean,work:(item:T)=>Promise<void>):Promise<void>{
 if(!parallel){for(const item of items)await work(item);return;}
 const results=await Promise.allSettled(items.map(work));
 const failure=results.find((r):r is PromiseRejectedResult=>r.status==='rejected');
 if(failure)throw failure.reason;
}

export async function runDays(opts: RunOptions): Promise<RunSummary> {
  const llm=opts.generatorOnly ? generatorOnlyBackend : opts.llm;
  const archiveMode = opts.protocol === CADENCE_PROTOCOL;
  if (!archiveMode && (opts.cadence || opts.departments || opts.reviewGate || opts.switchCost || opts.switchCostModel || opts.generatorOnly || opts.discoveryNights !== undefined || opts.boundedCosts || opts.tailoringSessions || opts.frictionFlags))
    throw Error(`Archive options require protocol ${CADENCE_PROTOCOL}`);
  if (opts.discoveryNights !== undefined && (!opts.generatorOnly || !Number.isSafeInteger(opts.discoveryNights) || opts.discoveryNights<1)) throw Error('discoveryNights requires generator-only mode and a positive integer');
  if (opts.switchCost && !opts.switchCostModel?.trim()) throw Error('Custom switch cost requires switchCostModel');
  const releasePolicy = archiveMode ? {
    protocol: CADENCE_PROTOCOL, cadence: cadenceSchema.parse(opts.cadence ?? { kind: 'nightly' }),
    departments: opts.departments ?? {}, reviewGate: opts.reviewGate?.id ?? (opts.tailoringSessions ? SESSION_GATE_ID : autoApprove.id),
    ...(opts.generatorOnly ? {discovery:'admitted-generator-only-v1',...(opts.discoveryNights !== undefined ? {discoveryNights:opts.discoveryNights}:{})}:{}),
    ...(opts.tailoringSessions ? {tailoring:'bounded-session-v1',friction:opts.frictionFlags??[]}:{}),
    switchCostModel: opts.switchCostModel ?? (opts.boundedCosts ? BOUNDED_COST_MODEL : 'usage-weighted-movement-v1'),
    vendorReleases: 'Mandatory recertification/migration bypasses discretionary cadence and review; archive candidates from older specs cannot ship',
  } : null;
  armCrashHook(llm.name);
  if(opts.verificationRelease&&llm.name!=='scripted'&&llm.name!=='replay')throw new Error('Verification release refuses live models');
  const log = opts.log ?? (() => undefined);
  const underlyingEhr = opts.ehr ?? createEhr();
  const world = await loadWorld(opts.worldDir);
  if (['codex','claude'].includes(llm.name) && (underlyingEhr.mode === 'fake' || world.manifest.fake)) throw new Error('Live LLM runs require a real EHR and real world; fake/replay verification uses no live backend');
  const personaIds = opts.personas ?? world.manifest.personas;
  if (personaIds.length === 0 || new Set(personaIds).size !== personaIds.length || personaIds.some((id) => !world.personas.has(id)))
    throw new Error('Every requested persona must occur exactly once in the world');
  if(opts.parallel&&opts.screens?.mode==='real')throw new Error('Parallel real runs require per-persona screen checkers; omit the shared screen override');
  if(opts.parallel&&underlyingEhr.mode==='real'&&personaIds.length>4)throw new Error('Parallel real mode permits at most four persona workers');
  if(underlyingEhr.mode==='real'){
    const requested=Number(process.env['EHR_SCREEN_WORKERS']??1);
    const maximum=opts.parallel?Math.max(1,Math.floor(4/personaIds.length)):4;
    if(!Number.isSafeInteger(requested)||requested<1||requested>maximum)throw new Error(`EHR_SCREEN_WORKERS must be between 1 and ${maximum} for this run`);
  }
  const releaseDays = opts.releaseDays ?? RELEASE_DAYS;
  const runId = opts.runId ?? `${llm.name}-w${world.manifest.seed}-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
  const dir = path.join(opts.runsRoot ?? path.join(REPO_ROOT, 'runs'), runId);
  await mkdir(dir, { recursive: true });
  const nativeEhr = underlyingEhr.mode === 'real' ? retryEhr(recordingEhr(underlyingEhr, path.join(dir, 'ehr/run'), 'run')) : retryEhr(underlyingEhr);
  const store = new RunStore(dir,opts.verificationRelease || opts.generatorOnly ? path.join(dir,'custom'):undefined);
  const recorder = new RecordingLlm(llm, dir, opts.resume ?? false);
  const seedState: SeedState = { rejected: new Set(), injected: 0 };
  const screens = opts.screens ?? createScreenChecker(nativeEhr, { ...(opts.fhirBundles ? { bundles: opts.fhirBundles } : {}), artifactsDir: path.join(dir, 'reports/screens') });
  const rawProvider=opts.geometry??screens.geometry;
  const provider=rawProvider?((input:Parameters<typeof rawProvider>[0])=>retryInfrastructure('geometry',()=>rawProvider(input),true)):undefined;
  const ehr=provider?geometryEhr(nativeEhr,provider,dir):nativeEhr;
  const deps: LoopDeps = {
    runId, store, ehr, screens, agent: new LlmAgent(recorder), seedPolicy: opts.seedPolicy ?? 'until-each-rejected', seedState,
    worldDir: world.dir, worldSeed: world.manifest.seed,
  };
  const fingerprints = {...await runFingerprints(ehr, world.dir),...(archiveMode?{explore:await treeHash(path.join(REPO_ROOT,'explore'))}:{}),...(opts.verificationRelease?{verificationRelease:sha256(stableStringify(opts.verificationRelease)),scripted:await fileHash(path.join(REPO_ROOT,'agent/test/scripted.ts'))}:{})};
  const manifestFile = path.join(dir, 'manifest.json');
  const resumeManifestSchema = z.object({
    releasePolicy:z.unknown().optional(),
    infrastructureRetries:z.array(z.custom<InfrastructureRetry>()).optional(), replayAllowDrift:z.boolean().optional(),driftedCallIds:z.array(z.string()).optional(),
    fingerprints: z.unknown(),parallel:z.boolean().optional(),
    releaseIds: z.object({ base: z.string(), feature: z.string(), migration: z.string() }).optional(),
    createdAt: z.string(), world: z.string(), backend: z.string(), model: z.string(), personas: z.array(z.string()),
    ehr: z.object({ mode: z.string() }), resumes: z.array(z.string()).optional(),
    releaseDays: z.object({ v2: z.number(), v3: z.number() }), seedPolicy: z.string(),
  });
  let previous: z.infer<typeof resumeManifestSchema> | null = null;
  if (!opts.resume && existsSync(manifestFile)) throw new Error('Run already exists; use --resume or a new run id');
  if (opts.resume) {
    if (!opts.runId || !existsSync(manifestFile)) throw new Error('--resume requires an existing --run-id');
    previous = resumeManifestSchema.parse(JSON.parse(await readFile(manifestFile, 'utf8')));
    if (stableStringify(previous.releasePolicy ?? null) !== stableStringify(releasePolicy)) throw Error('Resume release cadence/department/review/switch-cost policy must match');
    if (JSON.stringify(previous.fingerprints) !== JSON.stringify(fingerprints)) throw new Error('Resume refused: ehr/release/world/app/WASM fingerprints changed');
    if (previous.releaseIds && JSON.stringify(previous.releaseIds) !== JSON.stringify(RELEASE_IDS)) throw new Error('Release identities changed; start a new run after the rename');
    if((previous.parallel??false)!==(opts.parallel??false))throw new Error('Resume parallel mode must match the recorded run');
    if((previous.replayAllowDrift??false)!==(llm instanceof ReplayLlm?llm.options.allowDrift??false:false))throw new Error('Resume replay drift policy must match');
    if (previous.world !== world.dir || previous.backend !== llm.name || previous.model !== llm.model || previous.ehr.mode !== ehr.mode ||
        JSON.stringify(previous.personas) !== JSON.stringify(personaIds) ||
        JSON.stringify(previous.releaseDays) !== JSON.stringify(releaseDays) || previous.seedPolicy !== deps.seedPolicy) {
      throw new Error('resume world/backend/ehr/personas/release days/seed policy must match the recorded run');
    }
  }
  const manifestData = {
    protocol: archiveMode ? CADENCE_PROTOCOL : 'core-10day-live', releasePolicy,
    verificationFixture:opts.verificationRelease?'native-tiny-v1':null,
    replayAllowDrift:llm instanceof ReplayLlm?llm.options.allowDrift??false:false,
    driftedCallIds:previous?.driftedCallIds??[],
    infrastructureRetries:previous?.infrastructureRetries??[],
    interactionModel:{viewport:[1440,900],pointer:'Straight-line component-center travel; one center start per day trace; scroll positions reset on screen navigation',scroll:'Native scroll events page down one measured container viewport; off-screen targets reveal with measured browser offsets',time:'raw only; not used'},
    status: 'initializing',parallel:opts.parallel??false,personaWorkers:opts.parallel?personaIds.length:1,screenWorkersPerPersona:Math.max(1,Number.parseInt(process.env['EHR_SCREEN_WORKERS']??'1',10)||1),fingerprints, measurementProtocol,
    mode: opts.generatorOnly ? 'OFFLINE' : llm.name === 'replay' ? 'REPLAY' : llm.name === 'scripted' || ehr.mode === 'fake' ? 'FAKE' : 'REAL',
    releaseIds: RELEASE_IDS,
    noAgentRequired:true,
    buildBindingRequired: ehr.mode === 'real',
    runId, createdAt: previous?.createdAt ?? new Date().toISOString(),
    resumes: [...(previous?.resumes ?? []), ...(opts.resume ? [new Date().toISOString()] : [])], days: opts.days, personas: personaIds, world: world.dir, worldSeed: world.manifest.seed,
    worldIsFake: world.manifest.fake ?? false, backend: llm.name, model: llm.model, ehr: { mode: ehr.mode, binary: ehr.binary },
    seedPolicy: deps.seedPolicy, releaseDays,
    warning: ehr.mode === 'fake' ? 'EHR_FAKE=1: checker and simulator are fakes; nothing in this run is certified' : null,
  };
  await writeJson(manifestFile, manifestData);
  let retryWrites=Promise.resolve();
  const recordRetry=async(entry:InfrastructureRetry)=>{
    manifestData.infrastructureRetries.push(entry);
    retryWrites=retryWrites.then(async()=>writeJson(manifestFile,{...JSON.parse(await readFile(manifestFile,'utf8')),infrastructureRetries:manifestData.infrastructureRetries}));
    await retryWrites;
  };
  const context=<T>(persona:string|null,day:number|null,night:number|null,work:()=>Promise<T>)=>infrastructureContext({dir,persona,day,night,record:recordRetry,drift:async callId=>{
    manifestData.driftedCallIds=[...new Set([...manifestData.driftedCallIds,callId])].sort();
    retryWrites=retryWrites.then(async()=>writeJson(manifestFile,{...JSON.parse(await readFile(manifestFile,'utf8')),driftedCallIds:manifestData.driftedCallIds}));await retryWrites;
  }},work);
  const workerDeps=new Map<string,LoopDeps>();
  const states:SeedState[]=[];
  for(const id of personaIds){

    const workerNative=underlyingEhr.mode==='real'?retryEhr(recordingEhr(underlyingEhr,path.join(dir,'ehr',id),id)):retryEhr(underlyingEhr);
    const workerScreens=opts.screens??createScreenChecker(workerNative,{...(opts.fhirBundles?{bundles:opts.fhirBundles}:{}),artifactsDir:path.join(dir,'reports/screens'),cacheDir:path.join(dir,'screen-cache',id)});
    const rawGeometry=opts.geometry??workerScreens.geometry;
    const geometry=rawGeometry?((input:Parameters<typeof rawGeometry>[0])=>retryInfrastructure('geometry',()=>rawGeometry(input),true)):undefined;
    const workerEhr=geometry?geometryEhr(workerNative,geometry,dir):workerNative;
    const state:SeedState={rejected:new Set(),injected:0};states.push(state);
    workerDeps.set(id,{...deps,ehr:workerEhr,screens:workerScreens,seedState:state});
  }


  const releases = new Map<string, Release>();
  const release = async (id: string) => {
    const hit = releases.get(id);
    if (hit) return hit;
    const r = opts.verificationRelease ?? await loadRelease(id, ehr);
    releases.set(id, r);
    return r;
  };
  let inForce:Release;

  try {
  inForce=await context(null,null,null,()=>release(RELEASE_IDS.base));
  // Fail with every initial obstruction before spending browser/model time. No bypass.
  if (ehr.mode === 'real') {
    const blocked: string[] = [];
    for (const id of personaIds) {
      const params = world.personas.get(id);
      if (!params) continue;
      const initial = await releaseForPersona(inForce, id);
      const program = personalize(initial.canonical, params, world.userId(id));
      const verdict = await context(id,null,null,()=>ehr.check({ specVersion: inForce.specVersion, program, prev: program, canonical: initial.canonical }));
      await writeJson(path.join(dir, 'preflight', `${id}.json`), { program, verdict });
      if (verdict !== 'ok') blocked.push(`${id}: ${verdict.violation.property}: ${verdict.violation.message}`);
    }
    if (blocked.length) {
      await writeJson(manifestFile, { ...manifestData, status: 'blocked', blockers: blocked });
      throw new Error(`Initial certification blocked (nothing deployed):\n${blocked.join('\n')}`);
    }
  }

  // Day-1 programs: the canonical program personalized per user (version 0), deployed with a certificate.
  const views = new Map<string, PersonaView>();
  const programs = new Map<string, Map<number, Program>>();
  const train = new Map<string, TrainDay[]>();
  const history = new Map<string, HistoryItem[]>();
  const records: DecisionRecord[] = [];
  const timelines = new Map<string, PersonaTimeline>();
  await personaPhase(personaIds,opts.parallel??false,async id=>context(id,null,null,async()=>{
    const deps=workerDeps.get(id);if(!deps)throw new Error(`Missing worker ${id}`);
    const params = world.personas.get(id);
    if (!params) return;
    const view: PersonaView = { id, userId: world.userId(id), params };
    views.set(id, view);
    if (opts.resume && existsSync(path.join(dir, 'programs', id, 'deployed.json'))) {
      await store.recover(id,true);
      const versions = new Map<number, Program>();
      for (const file of await readdir(path.join(dir, 'programs', id))) {
        if (!/^v\d+\.json$/.test(file)) continue;
        const program = await readJson(path.join(dir, 'programs', id, file), programSchema);
        versions.set(program.version, program);
      }
      const deployed = await store.login(id);
      if (deployed.certificate.verdict !== 'ok' || !versions.has(0)) throw new Error(`resume ${id}: missing certified version`);
      programs.set(id, versions);
    } else {
      const initialRelease = await releaseForPersona(inForce, id);
      const v0 = personalize(initialRelease.canonical, params, view.userId);
      const dep = await deployVersion(deps, id, v0, { specVersion: inForce.specVersion, prev: v0, canonical: initialRelease.canonical, nextVersion: 0 });
      if (!dep.ok) throw new InfrastructureError(`day-1 canonical program for ${id} was not deployed (${dep.reason}): ${dep.check.property ?? ''} ${dep.check.message ?? ''}`);
      programs.set(id, new Map([[0, v0]]));
    }
    train.set(id, []);
    history.set(id, []);
    timelines.set(id, { persona: id, days: [], nights: [] });
  }));

  const failures = new Map<string, number>();
  await writeJson(manifestFile, { ...manifestData, status: 'running' });
  for (let day = 1; day <= opts.days; day++) {
    // Login -> shift -> logout.
    await personaPhase([...views],opts.parallel??false,async ([id,view])=>context(id,day,null,async()=>{
      const deps=workerDeps.get(id);if(!deps)throw new Error(`Missing worker ${id}`);
      const ehr=deps.ehr;
      const schedule = await world.schedule(day, id);
      if (!schedule) throw new Error(`world has no schedule for day ${day} / ${id}`);
      const { program, certificate } = await store.login(id);
      programs.get(id)?.set(program.version, program);
      const recorded = opts.resume && existsSync(store.dayPath(day, id));
      if (!recorded) assertCertified(program, certificate, inForce.specVersion, ehr.mode);
      // Read the prior committed day on every invocation: resume and crashes
      // preserve actor memory; speculative evaluations never write this state.
      const memory = view.params.policy === 'bounded' && day > 1
        ? (await readJson(store.dayPath(day - 1, id), dayResultSchema)).memory : undefined;
      const result = recorded ? await readJson(store.dayPath(day, id), dayResultSchema) : await ehr.simulate({ specVersion: inForce.specVersion, program, persona: view.params, schedule, worldDir: world.dir, seed: daySeed(world.manifest.seed, day), ...(memory ? {memory} : {}) });
      if (!recorded) await store.writeDay(result);
      const resultProgram = await store.readProgram(id, result.programVersion);
      const recordedCert = await readJson(store.certPath(id, result.programVersion), (await import('./schema.js')).certificateSchema);
      assertCertified(resultProgram, recordedCert, inForce.specVersion, ehr.mode);
      if (!isMeasurementDay(day)) {
        const trainingSchedule = calibrationPartition(schedule, 'train');
        const trainingFile = path.join(dir,'training',`day-${day}`,`${id}.json`);
        const trainingMemory = opts.boundedCosts || opts.tailoringSessions ? train.get(id)?.at(-1)?.result.memory : memory;
        const trainingResult = existsSync(trainingFile) ? await readJson(trainingFile, dayResultSchema) : await ehr.simulate({ specVersion: inForce.specVersion, program: resultProgram, persona: view.params, schedule: trainingSchedule, worldDir: world.dir, seed: daySeed(world.manifest.seed, day), ...(trainingMemory ? {memory:trainingMemory} : {}) });
        if (!existsSync(trainingFile)) await writeJson(trainingFile, trainingResult);
        train.get(id)?.push({ result: trainingResult, schedule: trainingSchedule });
      }
      const baselineFile = path.join(dir, 'baselines', `day-${String(day).padStart(2,'0')}`, `${id}.json`);
      if (!existsSync(baselineFile)) {
        const roleRelease = await releaseForPersona(inForce, id);
        const canonical = personalize(roleRelease.canonical, view.params, view.userId);
        const verdict = await ehr.check({ specVersion: inForce.specVersion, program: canonical, prev: canonical, canonical: roleRelease.canonical });
        if (verdict !== 'ok') throw new Error(`Uncertified canonical baseline ${id}/${day}`);
        const priorBaseline = view.params.policy === 'bounded' && day > 1
          ? await readJson(path.join(dir, 'baselines', `day-${String(day-1).padStart(2,'0')}`, `${id}.json`), dayResultSchema) : undefined;
        const baseline = await ehr.simulate({ specVersion: inForce.specVersion, program: canonical, persona: view.params, schedule, worldDir: world.dir, seed: daySeed(world.manifest.seed, day), ...(priorBaseline?.memory ? {memory:priorBaseline.memory} : {}) });
        await writeJson(baselineFile.replace('.json','.program.json'), canonical);
        await writeJson(baselineFile, baseline);
      }
      await noAgentDay(deps,view,await releaseForPersona(inForce,id),schedule,makeHoldout(deps,view,await world.schedule(calibrationDay(day-1)||1,id)));
      const m = result.tasks.reduce((a, t) => ({ c: a.c + t.clicks, k: a.k + t.keystrokes, s: a.s + t.scrolls, t: a.t + t.klmDeciSec }), { c: 0, k: 0, s: 0, t: 0 });
      timelines.get(id)?.days.push({ day, programVersion: result.programVersion, specVersion: inForce.specVersion, load: schedule.load, clicks: m.c, keystrokes: m.k, scrolls: m.s,scrollPx:result.tasks.every(t=>typeof t.scrollPx==='number')?result.tasks.reduce((n,t)=>n+(t.scrollPx??0),0):null,mouseTravelPx:result.tasks.every(t=>typeof t.mouseTravelPx==='number')?result.tasks.reduce((n,t)=>n+(t.mouseTravelPx??0),0):null });
      log(`${recorded ? 'recorded ' : ''}day ${day} ${id}: v${result.programVersion} ${m.c} clicks, ${m.k} keys, ${m.s} scrolls`);
    }));
    await writeDayDigest(dir,day,personaIds);
    if (day === opts.days) break;

    // Night `day`: the release (if any) takes effect at the next login.
    const nextRelease = day + 1 === releaseDays.v2 ? await release(RELEASE_IDS.feature) : day + 1 === releaseDays.v3 ? await release(RELEASE_IDS.migration) : null;
    await personaPhase([...views],opts.parallel??false,async ([id,view])=>context(id,null,day,async()=>{
      const deps=workerDeps.get(id);if(!deps)throw new Error(`Missing worker ${id}`);
      const seedState=deps.seedState;
      const { program: current } = await store.login(id);
      const nightInput = {
        night: day, persona: view, release: await releaseForPersona(inForce, id), current,
        train: [...(train.get(id) ?? [])], programs: programs.get(id) ?? new Map<number, Program>(), history: [...(history.get(id) ?? [])],
        holdout: makeHoldout(deps, view, await world.schedule(calibrationDay(day), id)),
      };
      let res: NightResult;
      const next = nextRelease ? await releaseForPersona(nextRelease, id) : null;
      if (opts.resume && existsSync(store.decisionPath(day, id))) {
        const record = await store.readDecision(day, id);
        for (const candidate of record.candidates) {
          const kind = rejectionKind(candidate.check);
          if (kind) seedState.rejected.add(kind);
          if (candidate.candidate.seeded) seedState.injected++;
        }
        res = { record, deployed: record.deployed ? programs.get(id)?.get(record.versionAfter) ?? null : null };
      } else if (next?.id === RELEASE_IDS.feature) res = await runSurfaceFeature(deps, { ...nightInput, next });
      else if (next) res = await runMigration(deps, { ...nightInput, next });
      else res = await runNight(deps, nightInput, releasePolicy ? { cadence: {
        cadence: releasePolicy.cadence, department: releasePolicy.departments[id] ?? 'unspecified',
        ...(opts.generatorOnly ? {generatorOnly:true}:{}),
        ...(opts.discoveryNights !== undefined ? {discoveryNights:opts.discoveryNights}:{}),
        ...(opts.boundedCosts ? {boundedCosts:true}:{}),
        ...(opts.tailoringSessions ? {tailoringSessions:true}:{}),
        ...(opts.frictionFlags ? {frictionFlags:opts.frictionFlags}:{}),
        ...(opts.reviewGate ? { reviewGate: opts.reviewGate } : {}),
        ...(opts.switchCost ? { switchCost: opts.switchCost } : {}),
      } } : {});
      const r = res.record;
      records.push(r);
      const streak = r.outcome === 'llm-error' ? (failures.get(id) ?? 0) + 1 : 0;
      failures.set(id, streak);
      if (streak >= 3) throw new Error(`ABORT ${id}: 3 consecutive LLM failures`);
      history.get(id)?.push(historyItem(r));
      if (res.deployed) programs.get(id)?.set(res.deployed.version, res.deployed);
      timelines.get(id)?.nights.push({
        night: day, mode: r.mode, outcome: r.outcome, versionBefore: r.versionBefore, versionAfter: r.versionAfter,
        rejected: r.candidates.filter((e) => e.check.status === 'fail').length, seeded: r.candidates.filter((e) => e.candidate.seeded).length,
      });
      log(`night ${day} ${id}: ${r.mode} -> ${r.outcome} (v${r.versionBefore} -> v${r.versionAfter}); ${r.candidates.length} candidates, ${r.candidates.filter((e) => e.check.status === 'fail').length} rejected`);
    }));
    if (nextRelease) inForce = nextRelease;
  }

  records.sort((a,b)=>a.night-b.night||personaIds.indexOf(a.persona)-personaIds.indexOf(b.persona));
  for(const state of states){for(const kind of state.rejected)seedState.rejected.add(kind);seedState.injected+=state.injected;}
  // Blind tests use recorded actual even-day measurements and their active-release canonicals.
  for (const r of records) {
    if (!r.deployed || r.versionAfter === r.versionBefore) continue;
    const testDay = r.night % 2 ? r.night + 1 : r.night + 2;
    const file = store.dayPath(testDay, r.persona);
    if (testDay <= opts.days && existsSync(file)) {
      const actual = await readJson(file, dayResultSchema);
      if (actual.programVersion === r.versionAfter) {
        const baseline = await readJson(path.join(dir, 'baselines', `day-${String(testDay).padStart(2,'0')}`, `${r.persona}.json`), dayResultSchema);
        r.measured.test = replayDay(testDay, 'blind-measurement', baseline, actual);
        const control=await readJson(path.join(dir,'no-agent','days',`day-${String(testDay).padStart(2,'0')}`,`${r.persona}.json`),dayResultSchema);
        r.measured.testNoAgent=replayDay(testDay,'blind-measurement-no-agent',control,actual);
      } else r.flags.push(`test-unmeasured: v${r.versionAfter} superseded before blind day ${testDay}`);
    } else r.flags.push(`test-unmeasured: blind day ${testDay} outside this run`);
    await store.writeDecision(r);
  }

  const summary: RunSummary = {
    runId,
    dir,
    timelines: personaIds.flatMap(id=>{const timeline=timelines.get(id);return timeline?[timeline]:[];}),
    rejections: records.flatMap((r) => [
      ...r.candidates.filter((e) => e.check.status === 'fail').map((e) => ({
        night: r.night, persona: r.persona, candidate: e.candidate.id, seeded: e.candidate.seeded, property: e.check.property, message: e.check.message,
      })),

    ]),
    screenFailures:records.flatMap(r=>r.certification.attempts.filter(a=>a.source==='screen-check'&&a.check.status==='fail').map(a=>({night:r.night,persona:r.persona,message:a.check.message??''}))),
    seededRejectedKinds: [...seedState.rejected].sort(),
    invalidPatches: records.flatMap((r)=>r.candidates.filter((c)=>c.check.status==='invalid-patch').map((c)=>({persona:r.persona,night:r.night,candidate:c.candidate.id}))),
    infrastructureErrors: records.flatMap((r)=>(['error','infrastructure-error'].includes(r.outcome)||r.flags.some(f=>f.startsWith('infrastructure-error')))?[{persona:r.persona,night:r.night,message:r.screenCheck?.message??r.flags.join('; ')}]:[]),
    llmErrors: records.flatMap((r) => r.flags.filter((flag) => flag.startsWith('llm-error')).map((message) => ({ persona: r.persona, night: r.night, message }))),
  };
  if(llm instanceof ReplayLlm)manifestData.driftedCallIds=[...new Set([...manifestData.driftedCallIds,...llm.driftedCallIds])].sort();
  await writeJson(path.join(dir, 'summary.json'), summary);
  await writeJson(manifestFile, { ...manifestData, status: summary.infrastructureErrors.length ? 'infrastructure-error' : summary.llmErrors.length ? 'completed-with-llm-errors' : 'completed', nightDeploys: records.filter(r=>r.deployed).length, infrastructureErrors:summary.infrastructureErrors, llmErrors: summary.llmErrors, transcriptAudit: await auditRunTranscripts(dir) });
  const digest=await contentDigest(dir);
  await writeJson(manifestFile,{...JSON.parse(await readFile(manifestFile,'utf8')),contentDigest:digest.contentDigest});
  return summary;
  } catch (error) {
    if(llm instanceof ReplayLlm)manifestData.driftedCallIds=[...new Set([...manifestData.driftedCallIds,...llm.driftedCallIds])].sort();
    if(JSON.parse(await readFile(manifestFile,'utf8')).status!=='blocked')await writeJson(manifestFile, { ...manifestData, status: error instanceof InfrastructureError ? 'infrastructure-error' : 'aborted', error: error instanceof Error ? error.message : String(error), transcriptAudit: await auditRunTranscripts(dir) });
    throw error;
  }
}
