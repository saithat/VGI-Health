import { assertRecordingMode } from './recording-mode.js';
import { GEOMETRY_STORAGE_VERSION } from './geometry-store.js';
import { referenceGeneratorVersion,summarizeReferenceUsage } from './lean-reference.js';
import { LeanScreenChecker,type LeanCheckerOptions } from './lean-screencheck.js';
import { leanLayoutPrompt,leanTrainingLog } from './lean-layout-prompt.js';
import { releaseScoringSchema,RELEASE_SCORING_POLICY } from './release-scoring.js';
import { simulationModesSchema,resolvedSimulationModes,realWorkModes,legacyModes,withSimulationModes,type SimulationModes } from './simulation-modes.js';
import { ReplayLlm } from './backends/replay.js';
import { armCrashHook } from './crash-hook.js';
import { retryEhr } from './retry-boundaries.js';
import { retryInfrastructure,infrastructureContext,type InfrastructureRetry } from './infrastructure.js';
import { contentDigest,writeDayDigest,writeNightDigest } from './content-digest.js';
import { geometryEhr } from './geometry.js';
import { InfrastructureError } from './night.js';
import { noAgentDay } from './no-agent.js';
import { compareDays,type BenefitComparison } from '../../app/src/dashboard/benefit-metrics.mjs';
import { assertCertified } from './certification.js';
import { fileHash,runFingerprints,leanFingerprints } from './fingerprints.js';
import { validationSchedules,calibrationPartition,isMeasurementDay } from './protocol.js';
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
import { RELEASE_IDS,RELEASE_DAYS } from './release-config.js';
import { mkdir,readFile,readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { recordingEhr } from './recording-ehr.js';
import { LlmAgent } from './agent.js';
import { RecordingLlm } from './backends/recording.js';
import type { JsonLlm } from './backends/types.js';
import { createEhr,type EhrClient } from './ehr.js';
import { runMigration,runSurfaceFeature } from './modes.js';
import { daySeed,deployVersion,makeHoldout,replayDay,type LoopDeps,type NightResult } from './night.js';
import { sha256,stableStringify,personalize } from './program.js';
import type { HistoryItem,PersonaView } from './prompts.js';
import { loadRelease,releaseForPersona,type Release } from './releases.js';
import { dayResultSchema,programSchema,type DecisionRecord,type Program } from '../../app/src/dashboard/agent-evidence.js';
import { rejectionKind,type SeedState } from './seeded.js';
import { RunStore } from './store.js';
import { loadWorld } from './world.js';
import { REPO_ROOT,readJson,writeJson } from './util.js';

import { CLIMB_WALL_MS,runHillclimb } from './hillclimb.js';
import { hillclimbProtocol } from './protocol.js';
import { contextWindowSchema, DEFAULT_CONTEXT_WINDOW, DEFAULT_LOCAL_MODEL, DEFAULT_MODEL_URL, modelEndpoint, nightProvider, nightSearch, recordedClimb } from './harness/night-provider.js';
import type { ClimbSessionOptions } from './harness/climb-session.js';

export interface RunOptions {
  nightMode?:'hillclimb';
  hillclimb?: Partial<Omit<ClimbSessionOptions,'replayFrom'>>;
  screenMode?:'lean';
  leanOptions?:LeanCheckerOptions;
  simulationModes?: SimulationModes;
  incompletePenalty?: number;
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

  /** Day on which each release takes effect at login. */
  releaseDays?: { v2: number; v3: number };
  ehr?: EhrClient;
  /** Sample FHIR bundles for render-screens (default: EHR_SAMPLE_FHIR). */
  fhirBundles?: string[];
  log?: (line: string) => void;
}

export interface PersonaTimeline {
  persona: string;
  days: { day: number; programVersion: number; specVersion: string; load: string; clicks: number; keystrokes: number; scrolls: number; klmDeciSec:number; tasks:number; completed:number; vsCanonical:BenefitComparison; vsNoAgent:BenefitComparison|null; scrollPx:number|null;mouseTravelPx:number|null }[];
  nights: { night: number; mode: string; outcome: string; versionBefore: number; versionAfter: number; rejected: number; seeded: number; hillclimb?: DecisionRecord['hillclimb'] }[];
}

export interface RunSummary {
  runId: string;
  dir: string;
  timelines: PersonaTimeline[];
  screenFailures: {night:number;persona:string;message:string}[];
  rejections: { night: number; persona: string; candidate: string; seeded: boolean; property: string | null; message: string | null }[];
  seededRejectedKinds: string[];
  invalidPatches: {persona:string;night:number;candidate:string}[];
  hillclimb?:{nights:number;backstops:number;passingMeasures:number;results:{persona:string;night:number;passingMeasures:number;bestNet:number|null}[]};
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
    ...(r.certification.attempts.some(a=>a.source==='screen-check'&&a.check.message)?{screenFailures:r.certification.attempts.filter(a=>a.source==='screen-check'&&a.check.message).map(a=>({message:a.check.message??'',screens:a.check.screens??[],patch:a.patch}))}:{}),
  };
}

/** Real parallel runs share at most four persona workers (memory bound); more personas queue. */
export const PERSONA_WORKER_LIMIT=4;
export async function personaPhase<T>(items:readonly T[],parallel:boolean,work:(item:T)=>Promise<void>,limit=Infinity):Promise<void>{
 if(!parallel){for(const item of items)await work(item);return;}
 const results:PromiseSettledResult<void>[]=new Array(items.length);
 let next=0;
 const worker=async()=>{for(let i=next++;i<items.length;i=next++){const item=items[i];if(item===undefined)continue;results[i]=await work(item).then(()=>({status:'fulfilled',value:undefined}) as const,(reason:unknown)=>({status:'rejected',reason}) as const);}};
 await Promise.all(Array.from({length:Math.max(1,Math.min(limit,items.length))},worker));
 const failure=results.find((r):r is PromiseRejectedResult=>r.status==='rejected');
 if(failure)throw failure.reason;
}

const resumeManifestSchema = z.object({
  measurementProtocol:z.object({name:z.string()}).optional(),hillclimb:recordedClimb,
  screenGate:z.string().optional(),
  referenceUsage:z.array(z.custom<LeanScreenChecker['referenceUsage'][number]>()).optional(),
  referenceStats:z.array(z.custom<LeanScreenChecker['referenceStats']>()).optional(),
  scoring:z.unknown().optional(),
  simulationModes:simulationModesSchema.optional(),
  nightlyDiscovery:z.unknown().optional(),
  releasePolicy:z.unknown().optional(),
  infrastructureRetries:z.array(z.custom<InfrastructureRetry>()).optional(), replayAllowDrift:z.boolean().optional(),driftedCallIds:z.array(z.string()).optional(),
  fingerprints: z.unknown(),parallel:z.boolean().optional(),
  releaseIds: z.object({ base: z.string(), feature: z.string(), migration: z.string() }).optional(),
  createdAt: z.string(), world: z.string(), backend: z.string(), model: z.string(), personas: z.array(z.string()),
  ehr: z.object({ mode: z.string() }), resumes: z.array(z.string()).optional(),
  releaseDays: z.object({ v2: z.number(), v3: z.number() }),
});

async function readRecording(file: string) {
  const manifest = await readJson(file, z.unknown());
  assertRecordingMode(manifest);
  return manifest;
}

const climbManifest = z.object({model: z.string(), hillclimb: recordedClimb});
type ClimbManifest = z.infer<typeof climbManifest>;

function resolveClimbSettings(requested: RunOptions['hillclimb'], backendModel: string,
  previous: ClimbManifest | null, source: ClimbManifest | null) {
  const prior = previous ?? source;
  const providerChoice = nightProvider.parse(requested?.provider ?? prior?.hillclimb.provider ?? 'codex');
  const local = providerChoice === 'local';
  const {hostPort, contextWindow: priorWindow} = prior?.hillclimb ?? {};
  const baseUrl = requested?.baseUrl ?? (hostPort ? `http://${hostPort}/v1` : DEFAULT_MODEL_URL);
  const endpoint = local ? modelEndpoint(baseUrl) : null;
  if (!local && (requested?.baseUrl !== undefined || requested?.contextWindow !== undefined))
    throw Error('Night base URL and context window require the local provider');
  const model = requested?.model ?? prior?.hillclimb.model ?? (local ? DEFAULT_LOCAL_MODEL : source?.model ?? backendModel);
  const contextWindow = contextWindowSchema.parse(requested?.contextWindow ?? priorWindow ?? DEFAULT_CONTEXT_WINDOW);
  const climb = {
    ...requested, provider: providerChoice, model, baseUrl, contextWindow,
    search: nightSearch.parse(requested?.search ?? prior?.hillclimb.search ?? 'first'),
    wallMs: requested?.wallMs ?? prior?.hillclimb.wallMs ?? CLIMB_WALL_MS,
    serviceTier: requested?.serviceTier ?? prior?.hillclimb.serviceTier ?? process.env['CODEX_SERVICE_TIER'] ?? 'default',
    reasoningEffort: requested?.reasoningEffort ?? prior?.hillclimb.reasoningEffort ?? process.env['CODEX_REASONING_EFFORT'] ?? 'high',
  };
  // The path can contain private routing information. Bind custom paths by digest.
  const pathDigest = source && requested?.baseUrl === undefined ? source.hillclimb.basePathSha256
    : endpoint && endpoint.pathname !== '/v1' ? sha256(endpoint.pathname) : undefined;
  if (local && !source && previous?.hillclimb.basePathSha256 && requested?.baseUrl === undefined)
    throw Error('Resuming this run requires its original --night-base-url (custom path)');
  const climbBinding = {
    objective: 'modeled-time-v1' as const,
    search: climb.search, wallMs: climb.wallMs, reasoningEffort: climb.reasoningEffort, provider: providerChoice, model,
    ...(endpoint ? {hostPort: endpoint.hostPort, contextWindow,
      ...(pathDigest ? {basePathSha256:pathDigest} : {})}
      : {serviceTier: climb.serviceTier}),
  };
  for (const [operation, recorded] of [['Resume', previous], ['Replay', source]] as const) {
    if (!recorded) continue;
    if (recorded.hillclimb.objective !== 'modeled-time-v1')
      throw Error(`${operation} requires the original revision for a recording with an older hillclimb objective; start a new run for modeled-time-v1`);
    // Manifests predating provider selection used the top-level model with hosted Codex.
    const binding = {provider:'codex', model:recorded.model, ...recorded.hillclimb};
    if (stableStringify(binding) !== stableStringify(climbBinding))
      throw Error(`${operation} hillclimb configuration must match (provider, model, endpoint, context, search and launch settings)`);
  }
  return {climb, climbBinding};
}

export async function runDays(opts: RunOptions): Promise<RunSummary> {

  const llm = opts.llm;
  const runsRoot = opts.runsRoot ?? path.join(REPO_ROOT, 'runs');
  const world = await loadWorld(opts.worldDir);
  const runId = opts.runId ?? `${llm.name}-w${world.manifest.seed}-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
  const dir = path.join(runsRoot, runId);
  const manifestFile = path.join(dir, 'manifest.json');
  if (!opts.resume && existsSync(manifestFile)) throw new Error('Run already exists; use --resume or a new run id');
  if (opts.resume && (!opts.runId || !existsSync(manifestFile))) throw new Error('--resume requires an existing --run-id');
  const previous = opts.resume ? resumeManifestSchema.parse(await readRecording(manifestFile)) : null;
  const source = llm instanceof ReplayLlm ? climbManifest.parse(await readRecording(path.join(llm.sourceRunDir, 'manifest.json'))) : null;
  const {climb, climbBinding} = resolveClimbSettings(opts.hillclimb, llm.model, previous, source);
  if(!(opts.llm.name==='codex'&&!climb.fixture || opts.llm instanceof ReplayLlm&&!climb.fixture || opts.llm.name==='scripted'&&climb.fixture))throw Error('Hill climbing requires Lean screens and a Codex session, recorded replay or scripted fixture');
  if(!Number.isSafeInteger(climb.wallMs)||climb.wallMs<=0||climb.wallMs>2147483647)throw Error('Invalid hill-climbing wall-clock backstop');
  const scoring={policy:RELEASE_SCORING_POLICY,...releaseScoringSchema.parse({incompletePenalty:opts.incompletePenalty})};
  if(opts.leanOptions&&['codex','claude','openai-compat'].includes(llm.name))throw Error('Live Lean runs require the native runner, native states and recorded vendor limits');
  armCrashHook(llm.name);
  if(opts.verificationRelease&&llm.name!=='scripted'&&llm.name!=='replay')throw new Error('Verification release refuses live models');
  const log = opts.log ?? (() => undefined);
  const requestedModes=simulationModesSchema.parse(opts.simulationModes??realWorkModes);
  // Lean-painted screens page bounded lists (Layout.Window): the simulated
  // clinician pages to the records it reads, and each page action is a click.
  const simulationModes:SimulationModes=requestedModes.lists===undefined?{...requestedModes,lists:'paged'}:requestedModes;
  const underlyingEhr = withSimulationModes(opts.ehr ?? createEhr(),simulationModes);
  if (['codex','claude','openai-compat'].includes(llm.name) && (underlyingEhr.mode === 'fake' || world.manifest.fake)) throw new Error('Live LLM runs require a real EHR and real world; fake/replay verification uses no live backend');
  const personaIds = opts.personas ?? world.manifest.personas;
  if (personaIds.length === 0 || new Set(personaIds).size !== personaIds.length || personaIds.some((id) => !world.personas.has(id)))
    throw new Error('Every requested persona must occur exactly once in the world');
  // Real parallel runs queue personas onto at most four concurrent workers.
  const personaWorkerLimit=opts.parallel&&underlyingEhr.mode==='real'?PERSONA_WORKER_LIMIT:Infinity;
  const concurrentPersonas=opts.parallel?Math.min(personaIds.length,personaWorkerLimit):1;
  const releaseDays = opts.releaseDays ?? RELEASE_DAYS;
  await mkdir(dir, { recursive: true });
  const nativeEhr = underlyingEhr.mode === 'real' ? retryEhr(recordingEhr(underlyingEhr, path.join(dir, 'ehr/run'), 'run')) : retryEhr(underlyingEhr);
  const store = new RunStore(dir,path.join(dir,'custom'),true);
  const recorder = new RecordingLlm(llm, dir, opts.resume ?? false);
  const seedState: SeedState = { rejected: new Set() };
  const screens = new LeanScreenChecker(nativeEhr,{artifactsDir:path.join(dir,'reports/lean-screens'),...(opts.fhirBundles?{bundles:opts.fhirBundles}:{}),...opts.leanOptions});
  const rawProvider=screens.geometry;
  const provider=rawProvider?((input:Parameters<typeof rawProvider>[0])=>retryInfrastructure('geometry',()=>rawProvider(input),false)):undefined;
  const ehr=provider?geometryEhr(nativeEhr,provider,dir,true):nativeEhr;
  const deps: LoopDeps = {
    runId, store, ehr, screens, agent: new LlmAgent(recorder), seedState,
    worldDir: world.dir, worldSeed: world.manifest.seed, incompletePenalty:scoring.incompletePenalty,
  };
  const fingerprints = {...await leanFingerprints(),...await runFingerprints(ehr, world.dir),...(opts.verificationRelease?{verificationRelease:sha256(stableStringify(opts.verificationRelease)),scripted:await fileHash(path.join(REPO_ROOT,'agent/test/scripted.ts'))}:{})};
  if (previous) {
    if(stableStringify(previous.scoring)!==stableStringify(scoring))throw Error('Resume release scoring policy must match');
    if (JSON.stringify(previous.fingerprints) !== JSON.stringify(fingerprints)) throw new Error('Resume refused: ehr/release/world/app/WASM fingerprints changed');
    if (previous.releaseIds && JSON.stringify(previous.releaseIds) !== JSON.stringify(RELEASE_IDS)) throw new Error('Release identities changed; start a new run after the rename');
    if(stableStringify(resolvedSimulationModes(previous.simulationModes??legacyModes))!==stableStringify(resolvedSimulationModes(simulationModes)))throw Error('Resume simulation modes must match the recording');
    if((previous.parallel??false)!==(opts.parallel??false))throw new Error('Resume parallel mode must match the recorded run');
    if((previous.replayAllowDrift??false)!==(llm instanceof ReplayLlm?llm.options.allowDrift??false:false))throw new Error('Resume replay drift policy must match');
    if (previous.world !== world.dir || previous.backend !== llm.name || previous.model !== llm.model || previous.ehr.mode !== ehr.mode ||
        JSON.stringify(previous.personas) !== JSON.stringify(personaIds) ||
        JSON.stringify(previous.releaseDays) !== JSON.stringify(releaseDays)) {
      throw new Error('resume world/backend/ehr/personas/release days must match the recorded run');
    }
  }
  const manifestData = {
    geometryStorageVersion:GEOMETRY_STORAGE_VERSION,screenReportStorageVersion:2,
    screenGate:'lean',browserCertified:false,geometrySource:'Lean dense reference, admitted fixed-shell fallback or custom family',referenceGeneratorVersion,referenceUsage:previous?.referenceUsage??z.array(z.custom<LeanScreenChecker['referenceUsage'][number]>()).parse([]),referenceStats:previous?.referenceStats??z.array(z.custom<LeanScreenChecker['referenceStats']>()).parse([]),leanFixtureOverrides:Boolean(opts.leanOptions),layoutExecutableSha256:await fileHash(path.join(REPO_ROOT,'lean/.lake/build/bin/ui-layout')),
    protocol: 'core-10day', scoring, simulationModes,
    verificationFixture:opts.verificationRelease?'native-tiny-v1':null,
    replayAllowDrift:llm instanceof ReplayLlm?llm.options.allowDrift??false:false,
    driftedCallIds:previous?.driftedCallIds??[],
    infrastructureRetries:previous?.infrastructureRetries??[],
    interactionModel:{viewport:[1440,900],pointer:'Straight-line component-center travel; one center start per day trace; scroll positions reset on screen navigation',scroll:'Native scroll events page down one Lean viewport; off-screen targets use Lean clip-chain offsets',time:'R1/R2 validation constraint; release score uses penalized clicks plus scrolls'},
    completionProtocol: 'atomic-prefix-v1', status: 'initializing',parallel:opts.parallel??false,personaWorkers:concurrentPersonas,fingerprints, measurementProtocol:hillclimbProtocol, hillclimb:climbBinding,fhirBundles:opts.fhirBundles,
    mode: llm.name === 'replay' ? 'REPLAY' : llm.name === 'scripted' || ehr.mode === 'fake' ? 'FAKE' : 'REAL',
    releaseIds: RELEASE_IDS,
    noAgentRequired:true,
    buildBindingRequired: ehr.mode === "real",
    runId, createdAt: previous?.createdAt ?? new Date().toISOString(),
    resumes: [...(previous?.resumes ?? []), ...(opts.resume ? [new Date().toISOString()] : [])], days: opts.days, personas: personaIds, world: world.dir, worldSeed: world.manifest.seed,
    worldIsFake: world.manifest.fake ?? false, backend: llm.name, model: llm.model, ehr: { mode: ehr.mode, binary: ehr.binary },
    releaseDays,
    warning: ehr.mode === 'fake' ? 'Synthetic fixture; no clinical certification' : null,
  };
  await writeJson(manifestFile, manifestData);
  let retryWrites=Promise.resolve();
  const recordRetry=async(entry:InfrastructureRetry)=>{
    manifestData.infrastructureRetries.push(entry);
    retryWrites=retryWrites.then(async()=>writeJson(manifestFile,{...JSON.parse(await readFile(manifestFile,'utf8')),infrastructureRetries:manifestData.infrastructureRetries}));
    await retryWrites;
  };
  const context=async <T>(persona:string|null,day:number|null,night:number|null,work:()=>Promise<T>)=>{const started=performance.now();try{return await infrastructureContext({dir,persona,day,night,record:recordRetry,drift:async callId=>{
    manifestData.driftedCallIds=[...new Set([...manifestData.driftedCallIds,callId])].sort();
    retryWrites=retryWrites.then(async()=>writeJson(manifestFile,{...JSON.parse(await readFile(manifestFile,'utf8')),driftedCallIds:manifestData.driftedCallIds}));await retryWrites;
  }},work);}finally{const {appendFile}=await import('node:fs/promises');await appendFile(path.join(dir,'lean-timings.jsonl'),JSON.stringify({persona,day,night,elapsedMs:performance.now()-started})+'\n');}};
  const workerDeps=new Map<string,LoopDeps>();
  const states:SeedState[]=[];
  for(const id of personaIds){

    const workerNative=underlyingEhr.mode==='real'?retryEhr(recordingEhr(underlyingEhr,path.join(dir,'ehr',id),id)):retryEhr(underlyingEhr);
    const workerScreens=new LeanScreenChecker(workerNative,{artifactsDir:path.join(dir,'reports/lean-screens'),...(opts.fhirBundles?{bundles:opts.fhirBundles}:{}),...opts.leanOptions});
    const rawGeometry=workerScreens.geometry;
    const geometry=rawGeometry?((input:Parameters<typeof rawGeometry>[0])=>retryInfrastructure('geometry',()=>rawGeometry(input),false)):undefined;
    const workerEhr=geometry?geometryEhr(workerNative,geometry,dir,true):workerNative;
    const state:SeedState={rejected:new Set()};states.push(state);
    const agent={
      name:deps.agent.name,model:deps.agent.model,
      proposeCandidates:async (ctx:Parameters<typeof deps.agent.proposeCandidates>[0])=>deps.agent.proposeCandidates({...ctx,parts:leanLayoutPrompt(ctx.parts,await workerScreens.promptDesign((await store.login(id)).program),await leanTrainingLog(dir,id,Number(/^night-(\d+)/.exec(ctx.callId)?.[1]??0)))}),
    };
    workerDeps.set(id,{...deps,agent,ehr:workerEhr,screens:workerScreens,seedState:state});
  }


  const collectReferenceTelemetry=()=>{const checkers=[screens,...[...workerDeps.values()].map(d=>d.screens)].filter((c):c is LeanScreenChecker=>c instanceof LeanScreenChecker);manifestData.referenceUsage=summarizeReferenceUsage([...(previous?.referenceUsage??[]),...checkers.flatMap(c=>c.referenceUsage)]);manifestData.referenceStats=[...(previous?.referenceStats??[]),...checkers.map(c=>c.referenceStats)];};

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
  const trainDays = new Map<string, number[]>();
  const trainMemory = new Map<string, import('./schema.js').UserMemory>();
  const history = new Map<string, HistoryItem[]>();
  const recordKeys: {night:number;persona:string}[] = [];
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
    trainDays.set(id, []);
    history.set(id, []);
    timelines.set(id, { persona: id, days: [], nights: [] });
  }),personaWorkerLimit);

  const pastMemory=new Map<string,import('./schema.js').UserMemory>();
  const boundedTrainMemory=new Map<string,import('./schema.js').UserMemory>();
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
      // Preserve the historical checkpoints only for vendor-release nights in
      // this mode. Discretionary decisions use the committed day result below.
      const needsCalibration=Object.values(releaseDays).some(login=>login>day&&login<=opts.days);
      if (needsCalibration && !isMeasurementDay(day)) {
        const trainingSchedule = calibrationPartition(schedule, 'train');
        const trainingFile = path.join(dir,'training',`day-${day}`,`${id}.json`);
        const trainingMemory = trainMemory.get(id);
        const trainingResult = existsSync(trainingFile) ? await readJson(trainingFile, dayResultSchema) : await ehr.simulate({ specVersion: inForce.specVersion, program: resultProgram, persona: view.params, schedule: trainingSchedule, worldDir: world.dir, seed: daySeed(world.manifest.seed, day), ...(trainingMemory ? {memory:trainingMemory} : {}) });
        if (!existsSync(trainingFile)) await writeJson(trainingFile, trainingResult);
        if(trainingResult.memory)trainMemory.set(id,trainingResult.memory);else trainMemory.delete(id);
        trainDays.get(id)?.push(day);
        const boundedFile=path.join(dir,'bounded-training',`day-${day}`,`${id}.json`);
        const bounded=existsSync(boundedFile)?await readJson(boundedFile,dayResultSchema):await ehr.simulate({
          specVersion:inForce.specVersion,program:resultProgram,persona:view.params,policy:'bounded',schedule:trainingSchedule,
          worldDir:world.dir,seed:daySeed(world.manifest.seed,day),
          memory:structuredClone(boundedTrainMemory.get(id)??{actor:resultProgram.owner,entries:[]}),
        });
        if(bounded.policy!=='bounded'||!bounded.memory||bounded.memory.actor!==resultProgram.owner)throw Error('Missing bounded train-only memory');
        if(!existsSync(boundedFile))await writeJson(boundedFile,bounded);
        boundedTrainMemory.set(id,bounded.memory);
        if(deps.screens instanceof LeanScreenChecker)deps.screens.setTrainingWorkspace(trainingSchedule,world.dir);
      }
      if(day<opts.days){
        const file=path.join(dir,'bounded-history',`day-${day}`,`${id}.json`);
        const bounded=existsSync(file)?await readJson(file,dayResultSchema):result.policy==='bounded'?result:await ehr.simulate({specVersion:inForce.specVersion,
          program:resultProgram,persona:view.params,policy:'bounded',schedule,worldDir:world.dir,seed:daySeed(world.manifest.seed,day),
          memory:pastMemory.get(id)??{actor:resultProgram.owner,entries:[]}});
        if(bounded.policy!=='bounded'||bounded.memory?.actor!==resultProgram.owner||bounded.day!==day||bounded.persona!==id||bounded.programVersion!==resultProgram.version)throw Error('Invalid all-past memory checkpoint');
        if(!existsSync(file))await writeJson(file,bounded);
        pastMemory.set(id,bounded.memory);
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
      await noAgentDay(deps,view,await releaseForPersona(inForce,id),schedule,!Object.values(releaseDays).includes(day)?null:makeHoldout(deps,view,await validationSchedules(Math.max(1,day-1),d=>world.schedule(d,id)),boundedTrainMemory.get(id)));
      const m = result.tasks.reduce((a, t) => ({ c: a.c + t.clicks, k: a.k + t.keystrokes, s: a.s + t.scrolls, t: a.t + t.klmDeciSec }), { c: 0, k: 0, s: 0, t: 0 });
      const baseline = await readJson(baselineFile, dayResultSchema);
      const controlFile = path.join(dir,'no-agent/days',`day-${String(day).padStart(2,'0')}`,`${id}.json`);
      const vsCanonical = compareDays([{before:baseline,after:result}]);
      const vsNoAgent = existsSync(controlFile) ? compareDays([{before:await readJson(controlFile,dayResultSchema),after:result}]) : null;
      const completed = result.tasks.filter(t=>t.completed).length;
      timelines.get(id)?.days.push({ day, programVersion: result.programVersion, specVersion: inForce.specVersion, load: schedule.load, clicks: m.c, keystrokes: m.k, scrolls: m.s,klmDeciSec:m.t,tasks:result.tasks.length,completed,vsCanonical,vsNoAgent,scrollPx:result.tasks.every(t=>typeof t.scrollPx==='number')?result.tasks.reduce((n,t)=>n+(t.scrollPx??0),0):null,mouseTravelPx:result.tasks.every(t=>typeof t.mouseTravelPx==='number')?result.tasks.reduce((n,t)=>n+(t.mouseTravelPx??0),0):null });
      log(`${recorded ? 'recorded ' : ''}day ${day} ${id}: v${result.programVersion} ${m.c} clicks, ${m.k} keys, ${m.s} scrolls, ${m.t} klmDeciSec, completed ${completed}/${result.tasks.length}; paired gap captured vs no-agent: actions ${vsNoAgent?.gapCapturedPct.actions?.toFixed(1)??'unavailable'}%, time ${vsNoAgent?.gapCapturedPct.klmDeciSec?.toFixed(1)??'unavailable'}%`);
    }),personaWorkerLimit);
    await writeDayDigest(dir,day,personaIds);
    if (day === opts.days) break;

    // Night `day`: the release (if any) takes effect at the next login.
    const nextRelease = day + 1 === releaseDays.v2 ? await release(RELEASE_IDS.feature) : day + 1 === releaseDays.v3 ? await release(RELEASE_IDS.migration) : null;
    await personaPhase([...views],opts.parallel??false,async ([id,view])=>context(id,null,day,async()=>{
      const deps=workerDeps.get(id);if(!deps)throw new Error(`Missing worker ${id}`);
      const seedState=deps.seedState;
      const { program: current } = await store.login(id);
      const declaredWorkload = (await Promise.all(Array.from({length: world.manifest.days}, (_, i) => world.schedule(i + 1, id)))).flatMap(s => s?.tasks ?? []);
      const commonInput={declaredWorkload,night:day,persona:view,release:await releaseForPersona(inForce,id),current};
      const calibrationInput=async()=>({
        ...commonInput,train:store.training(id,trainDays.get(id)??[],world.dir),
        programs:programs.get(id)??new Map<number,Program>(),history:[...(history.get(id)??[])],
        holdout:makeHoldout(deps,view,await validationSchedules(day,d=>world.schedule(d,id)),boundedTrainMemory.get(id)),
      });
      let res: NightResult;
      const next = nextRelease ? await releaseForPersona(nextRelease, id) : null;
      // Prepare tomorrow's independent control before gating this release's
      // candidates, so R5 uses the exact merged no-agent layout. This result
      // stays outside the agent prompt; the following day reuses its checkpoint.
      if(next) {
        const nextSchedule=await world.schedule(day+1,id);
        if(!nextSchedule)throw Error(`Missing no-agent reference schedule ${id}/${day+1}`);
        await noAgentDay(deps,view,next,nextSchedule,makeHoldout(deps,view,await validationSchedules(day,d=>world.schedule(d,id)),boundedTrainMemory.get(id)));
      }
      if (opts.resume && existsSync(store.decisionPath(day, id))) {
        const record = await store.readDecision(day, id);
        for (const candidate of record.candidates) {
          const kind = rejectionKind(candidate.check);
          if (kind) seedState.rejected.add(kind);
        }
        res = { record, deployed: record.deployed ? programs.get(id)?.get(record.versionAfter) ?? null : null };
      } else if (next?.id === RELEASE_IDS.feature) res = await runSurfaceFeature(deps, { ...await calibrationInput(), next });
      else if (next) res = await runMigration(deps, { ...await calibrationInput(), next });
      else {
        const memory=pastMemory.get(id);
        if(!memory)throw Error('Missing bounded all-past memory');
        const past=[];
        const versions=new Map<number,Program>();
        for(let d=1;d<=day;d++){
          const result=await readJson(store.dayPath(d,id),dayResultSchema),schedule=await world.schedule(d,id);
          if(!schedule)throw Error(`Missing day ${d}/${id}`);
          past.push({result,schedule});
          if(!versions.has(result.programVersion))versions.set(result.programVersion,await store.readProgram(id,result.programVersion));
        }
        res=await runHillclimb(deps,commonInput,past,versions,memory,{...climb,...(llm instanceof ReplayLlm?{
          replayFrom:path.join(llm.sourceRunDir,'hillclimb',`night-${String(day).padStart(2,'0')}`,id)}:{})});
      }
      const r = res.record;
      recordKeys.push({night:r.night,persona:r.persona});
      const streak = r.outcome === 'llm-error' ? (failures.get(id) ?? 0) + 1 : 0;
      failures.set(id, streak);
      if (streak >= 3) throw new Error(`ABORT ${id}: 3 consecutive LLM failures`);
      history.get(id)?.push(historyItem(r));
      if (res.deployed) programs.get(id)?.set(res.deployed.version, res.deployed);
      timelines.get(id)?.nights.push({
        night: day, mode: r.mode, outcome: r.outcome, versionBefore: r.versionBefore, versionAfter: r.versionAfter,
        ...(r.hillclimb ? {hillclimb:r.hillclimb} : {}),
        rejected: r.candidates.filter((e) => e.check.status === 'fail').length, seeded: r.candidates.filter((e) => e.candidate.seeded).length,
      });
      log(`night ${day} ${id}: ${r.mode} -> ${r.outcome} (v${r.versionBefore} -> v${r.versionAfter}); ${r.candidates.length} candidates, ${r.candidates.filter((e) => e.check.status === 'fail').length} rejected`);
    }),personaWorkerLimit);
    await writeNightDigest(dir,day,personaIds);
    if (nextRelease) inForce = nextRelease;
  }

  recordKeys.sort((a,b)=>a.night-b.night||personaIds.indexOf(a.persona)-personaIds.indexOf(b.persona));
  const records=store.decisions(recordKeys);
  for(const state of states){for(const kind of state.rejected)seedState.rejected.add(kind);}
  // Blind tests use recorded actual even-day measurements and their active-release canonicals.
  for (const r of records) {
    if (!r.deployed || r.versionAfter === r.versionBefore) continue;
    const testDay = r.night + 1;
    const file = store.dayPath(testDay, r.persona);
    if (testDay <= opts.days && existsSync(file)) {
      const actual = await readJson(file, dayResultSchema);
      if (actual.programVersion === r.versionAfter) {
        const baseline = await readJson(path.join(dir, 'baselines', `day-${String(testDay).padStart(2,'0')}`, `${r.persona}.json`), dayResultSchema);
        r.measured.test = replayDay(testDay, 'next-day', baseline, actual);
        const control=await readJson(path.join(dir,'no-agent','days',`day-${String(testDay).padStart(2,'0')}`,`${r.persona}.json`),dayResultSchema);
        r.measured.testNoAgent=replayDay(testDay,'next-day-no-agent',control,actual);
      } else r.flags.push(`test-unmeasured: v${r.versionAfter} superseded before blind day ${testDay}`);
    } else r.flags.push(`test-unmeasured: blind day ${testDay} outside this run`);
    await store.writeDecision(r);
  }

  const summary: RunSummary = {
    runId,
    dir,
    hillclimb:{nights:records.filter(r=>r.mode==='hillclimb').length,backstops:records.filter(r=>r.outcome==='backstop'||r.hillclimb?.completion==='backstop-best').length,
      passingMeasures:records.reduce((sum,r)=>sum+(r.hillclimb?.passingMeasures??0),0),
      results:records.filter(r=>r.mode==='hillclimb').map(r=>({persona:r.persona,night:r.night,passingMeasures:r.hillclimb?.passingMeasures??0,bestNet:r.hillclimb?.bestNet??null}))},
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
  collectReferenceTelemetry();
  await writeJson(path.join(dir, 'summary.json'), summary);
  await writeJson(manifestFile, { ...manifestData, status: summary.infrastructureErrors.length ? 'infrastructure-error' : summary.llmErrors.length ? 'completed-with-llm-errors' : 'completed', nightDeploys: records.filter(r=>r.deployed).length, infrastructureErrors:summary.infrastructureErrors, llmErrors: summary.llmErrors, transcriptAudit: await auditRunTranscripts(dir) });
  const digest=await contentDigest(dir);
  await writeJson(manifestFile,{...JSON.parse(await readFile(manifestFile,'utf8')),contentDigest:digest.contentDigest});
  return summary;
  } catch (error) {
    if(llm instanceof ReplayLlm)manifestData.driftedCallIds=[...new Set([...manifestData.driftedCallIds,...llm.driftedCallIds])].sort();
    collectReferenceTelemetry();
    if(JSON.parse(await readFile(manifestFile,'utf8')).status!=='blocked')await writeJson(manifestFile, { ...manifestData, status: error instanceof InfrastructureError ? 'infrastructure-error' : 'aborted', error: error instanceof Error ? error.message : String(error), transcriptAudit: await auditRunTranscripts(dir) });
    throw error;
  }
}
