import { ToolNightAgent, nightToolSession } from './agent-loop.js';
import { RlmNightAgent } from './rlm/loop.js';
import { DEFAULT_RLM_BUDGET, type RlmBudget } from './rlm/stats.js';
import { DEFAULT_TOOL_BUDGET, type ToolBudget } from './tool-session.js';
import { frozenGeometry } from './frozen-geometry.js';
import { applyToProgram } from './program.js';
import { trainEstimateWindow } from './protocol.js';
import { defaultStructurePolicy, scoreStructure } from './structure-policy.js';
import { structuralDistance } from '../../explore/structure.js';
/** Frozen one-night experiment. No deployment, screen gate, or model calls on import. */
import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { tmpdir } from 'node:os';
import { z } from 'zod';
import { LlmAgent } from './agent.js';
import { createBackend, type BackendChoice } from './backends/index.js';
import { RecordingLlm, llmRecordSchema, llmRecordPath } from './backends/recording.js';
import type { JsonLlm, JsonResponse } from './backends/types.js';
import { browserGeometry } from './browser-geometry.js';
import { createEhr, type EhrClient } from './ehr.js';
import { fileHash, treeHash } from './fingerprints.js';
import { geometryComponentsHash, geometryEhr, geometryProgramHash, loadGeometry } from './geometry.js';
import { localityDigest } from './locality.js';
import { retryInfrastructure } from './infrastructure.js';
import { daySeed, makeHoldout, runNight, TrainEstimator, type LoopDeps, type NightInput } from './night.js';
import { auditedOperation } from './operation-manifest.js';
import { queryUsage } from './backends/query-audit.js';
import { usageOf } from './backends/usage.js';
import { trainingQueryBundle, writeQueryDirectory } from './quality-queries.js';
import { loadMeasuredSavings, recomputedSavings } from './quality-ledger.js';
import { measuredLedger, physicalKeys } from './quality-context.js';
import { OFFLINE_LABEL, offlineRecordSchema, repetitionCount, writeQualityReport, type OfflineRecord, type QualityArm, type TokenCounts } from './quality-report.js';
import { calibrationDay, calibrationPartition, isMeasurementDay } from './protocol.js';
import { recordingEhr } from './recording-ehr.js';
import { loadRelease, releaseForPersona } from './releases.js';
import { retryEhr } from './retry-boundaries.js';
import { historyItem } from './run.js';
import { dayResultSchema, decisionRecordSchema, programSchema, specSchema, type DecisionRecord, type Program } from '../../app/src/dashboard/agent-evidence.js';
import { RunStore } from './store.js';
import { REPO_ROOT, pad2, readJson, writeJson } from './util.js';
import { loadWorld, type World } from './world.js';

export const decisionId = (r: Pick<DecisionRecord,'night'|'persona'>) => `night-${pad2(r.night)}/${r.persona}`;
export async function historicalDecisions(runDir:string):Promise<DecisionRecord[]> {
  const rows:DecisionRecord[]=[];
  for(const night of (await readdir(path.join(runDir,'decisions'))).filter(n=>/^night-\d+$/.test(n)).sort()) {
    for(const file of (await readdir(path.join(runDir,'decisions',night))).filter(f=>f.endsWith('.json')).sort()) rows.push(await readJson(path.join(runDir,'decisions',night,file),decisionRecordSchema));
  }
  return rows.sort((a,b)=>a.night-b.night||a.persona.localeCompare(b.persona));
}
export function selectDecisions(records:readonly DecisionRecord[],selection?:readonly string[]) {
  const nightly=records.filter(r=>r.mode==='nightly');
  if(!selection)return nightly;
  const ids=new Set(selection);
  for(const id of ids)if(!nightly.some(r=>decisionId(r)===id))throw new Error(`Not a nightly decision: ${id}; use night-01/P1`);
  return nightly.filter(r=>ids.has(decisionId(r)));
}

/** Keep the logical release id in programs/prompts; only native file resolution changes. */
export function archivedSpecEhr(inner:EhrClient,specs:ReadonlyMap<string,string>):EhrClient {
  const location=(version:string)=>{const file=specs.get(version);if(!file)throw new Error(`No frozen spec for ${version}`);return file;};
  return {...inner,
    check:i=>inner.check({...i,specVersion:location(i.specVersion)}),
    simulate:i=>inner.simulate({...i,specVersion:location(i.specVersion)}),
    renderScreens:i=>inner.renderScreens({...i,specVersion:location(i.specVersion)}),
    minClicks:i=>inner.minClicks({...i,specVersion:location(i.specVersion)}),
    specExport:version=>readJson(location(version),specSchema),
    async deploy(){throw new Error('Offline deployment prohibited');},
  };
}
export async function frozenSpecs(runDir:string,persona:string):Promise<Map<string,string>> {
  const directory=path.join(runDir,'certifications',persona),specs=new Map<string,string>();
  for(const version of (await readdir(directory)).filter(v=>/^v\d+$/.test(v)).sort()) {
    const inputs=await readJson(path.join(directory,version,'inputs.json'),z.object({specVersion:z.string()}));
    const file=path.join(directory,version,'spec.json'),prior=specs.get(inputs.specVersion);
    if(prior&&await fileHash(prior)!==await fileHash(file))throw new Error(`Conflicting frozen specs for ${persona}/${inputs.specVersion}`);
    specs.set(inputs.specVersion,file);
  }
  return specs;
}

/** versionBefore is authoritative; never infer from current deployment or an arm output. */
export async function frozenNight(runDir:string,record:DecisionRecord,records:readonly DecisionRecord[],world:World,deps:LoopDeps):Promise<NightInput> {
  const store=new RunStore(runDir),params=world.personas.get(record.persona);
  if(!params)throw new Error(`Missing persona ${record.persona}`);
  const persona={id:record.persona,userId:world.userId(record.persona),params};
  const programs=new Map<number,Program>();
  for(const file of (await readdir(path.join(runDir,'programs',record.persona))).filter(f=>/^v\d+\.json$/.test(f))) {
    const version=Number(file.slice(1,-5));programs.set(version,await store.readProgram(record.persona,version));
  }
  const current=programs.get(record.versionBefore);if(!current)throw new Error(`Missing versionBefore ${record.versionBefore}`);
  const certification=path.join(runDir,'certifications',record.persona,`v${record.versionBefore}`);
  const release=deps.ehr.mode==='fake'?await releaseForPersona(await loadRelease(record.specVersion,deps.ehr),record.persona):{
    id:record.specVersion,specVersion:record.specVersion,
    spec:await readJson(path.join(certification,'spec.json'),specSchema),
    canonical:(await readJson(path.join(certification,'inputs.json'),z.object({canonical:programSchema}))).canonical,
    notes:'Frozen certification inputs',leanSpecSource:null,fake:false,
  };
  const train=[];
  for(const day of record.evidence.trainDays) {
    if(day>record.night||isMeasurementDay(day))throw new Error(`Non-training evidence day ${day}`);
    const full=await world.schedule(day,record.persona);if(!full)throw new Error(`Missing schedule ${day}`);
    const recorded=await readJson(store.dayPath(day,record.persona),dayResultSchema);
    const program=programs.get(recorded.programVersion);if(!program)throw new Error(`Missing historical train program ${recorded.programVersion}`);
    const schedule=calibrationPartition(full,'train');
    const check=await deps.ehr.check({specVersion:program.specVersion,program,prev:program,canonical:program});
    if(check!=='ok')throw new Error('Historical training program no longer certified');
    const result=await deps.ehr.simulate({specVersion:program.specVersion,program,persona:params,schedule,worldDir:world.dir,seed:daySeed(world.manifest.seed,day)});
    if(JSON.stringify(result.tasks.map(t=>t.task).sort())!==JSON.stringify(schedule.tasks.map(t=>t.id).sort()))throw new Error('Training replay changed scheduled tasks');
    train.push({schedule,result});
  }
  return {night:record.night,persona,current,programs,train,
    release,
    history:records.filter(r=>r.persona===record.persona&&r.night<record.night).map(historyItem),
    holdout:makeHoldout(deps,persona,await world.schedule(calibrationDay(record.night),record.persona))};
}

export async function frozenLocality(input:Pick<NightInput,'train'|'programs'>,geometryDir:string) {
  return localityDigest(await frozenTrainAtlases(input,geometryDir));
}
export async function frozenTrainAtlases(input:Pick<NightInput,'train'|'programs'>,geometryDir:string) {
  return Promise.all(input.train.map(async day=>{
    const program=input.programs.get(day.result.programVersion);if(!program)throw new Error('Missing train program');
    const hash=geometryProgramHash(program),components=geometryComponentsHash(program);
    const atlas=await loadGeometry(path.join(geometryDir,'geometry',`${hash}.${components}.json`));
    if(atlas.programHash!==hash||atlas.componentsSha256!==components)throw new Error('Frozen train atlas belongs to different program inputs');
    if(day.result.geometry?.programHash!==hash||day.result.geometry.componentsSha256!==components||day.result.geometry.appSha256!==atlas.appSha256)throw new Error('Frozen train trace and atlas bindings differ');
    return {result:day.result,atlas:{...atlas,aliases:atlas.aliases??{}}};
  }));
}

export function meteredLlm(inner:JsonLlm,source:string) {
  const calls:{callId:string;promptMatched:boolean|null;tokens:TokenCounts}[]=[];
  let attempts=0,unknownAttemptUsage=false;
  const queries={count:0,tally:new Map<string,number>()};
  const collect=(usage:unknown)=>{if(inner.name==='replay')return;const q=queryUsage(usage);queries.count+=q.count;for(const [name,n]of Object.entries(q.tally))queries.tally.set(name,(queries.tally.get(name)??0)+n);};
  const llm:JsonLlm={name:inner.name,model:inner.model,async complete(req){
    attempts++;
    const beforeToolUsage=req.toolSession?.stats();
    let response:JsonResponse;
    try {response=await inner.complete(req);}catch(error){
      const failed=req.toolSession?.stats();
      if(failed?.exceeded==='token budget exhausted'&&beforeToolUsage&&failed.inputTokens>beforeToolUsage.inputTokens)calls.push({callId:req.callId,promptMatched:null,tokens:{input:failed.inputTokens-beforeToolUsage.inputTokens,output:failed.outputTokens-beforeToolUsage.outputTokens,cachedInput:null,source:inner.name==='replay'?'recorded-reference':'backend'}});
      else unknownAttemptUsage=true;
      if(error&&typeof error==='object'&&'audit' in error)collect({isolationAudit:error.audit});throw error;
    }
    collect(response.usage);
    const reference=inner.name==='replay'&&!req.toolSession?await readJson(llmRecordPath(source,req.callId),llmRecordSchema):response;
    const usage=usageOf(reference);
    calls.push({callId:req.callId,promptMatched:response.promptMatched,tokens:usage?{...usage,source:inner.name==='replay'?'recorded-reference':'backend'}:{input:null,output:null,cachedInput:null,source:'unavailable'}});
    return response;
  }};
  const tokens=():TokenCounts=>unknownAttemptUsage?{input:null,output:null,cachedInput:null,source:'unavailable'}:({
    input:calls.every(c=>c.tokens.input!==null)?calls.reduce((n,c)=>n+(c.tokens.input??0),0):null,
    output:calls.every(c=>c.tokens.output!==null)?calls.reduce((n,c)=>n+(c.tokens.output??0),0):null,
    cachedInput:calls.every(c=>c.tokens.cachedInput!==null)?calls.reduce((n,c)=>n+(c.tokens.cachedInput??0),0):null,
    source:calls.some(c=>c.tokens.source==='unavailable')?'unavailable':inner.name==='replay'?'recorded-reference':'backend'});
  return {llm,calls,tokens,callCount:()=>attempts,queries:()=>({count:queries.count,tally:Object.fromEntries(queries.tally)})};
}

function sumTokens(a:TokenCounts,b:TokenCounts):TokenCounts {
  const add=(x:number|null,y:number|null)=>x===null||y===null?null:x+y;
  return {input:add(a.input,b.input),output:add(a.output,b.output),cachedInput:add(a.cachedInput,b.cachedInput),source:a.source==='unavailable'||b.source==='unavailable'?'unavailable':a.source};
}
export function candidateDiffs(before:DecisionRecord,after:DecisionRecord) {
  return before.candidates.filter(e=>!e.candidate.seeded).map(old=>{
    const now=after.candidates.find(e=>e.candidate.id===old.candidate.id);
    const deltas:Record<string,number|null>={};
    for(const side of ['before','after','saving'] as const)for(const key of physicalKeys) {
      const a=old.trainEstimate?.[side][key],b=now?.trainEstimate?.[side][key];
      deltas[`${side}.${key}`]=typeof a==='number'&&typeof b==='number'?Math.round((b-a)*100)/100:null;
    }
    for(const side of ['before','after'] as const)for(const key of ['tasks','completed'] as const) {
      const a=old.trainEstimate?.[side][key],b=now?.trainEstimate?.[side][key];
      deltas[`${side}.${key}`]=typeof a==='number'&&typeof b==='number'?b-a:null;
    }
    return {id:old.candidate.id,recorded:old.trainEstimate,recomputed:now?.trainEstimate??null,
      recordedCheck:old.check.status,recomputedCheck:now?.check.status??'missing',deltas,
      countMismatch:['before.clicks','after.clicks','before.keystrokes','after.keystrokes','before.tasks','after.tasks','before.completed','after.completed'].some(k=>deltas[k]!==0 && deltas[k]!==null),
      daysMismatch:old.trainEstimate!==null&&JSON.stringify(old.trainEstimate.days)!==JSON.stringify(now?.trainEstimate?.days),
      missing:!now||(old.trainEstimate!==null&&now.trainEstimate===null)};
  });
}
export interface QualityOptions {
  runDir:string;outDir:string;arms:readonly QualityArm[];samples:number;backend:BackendChoice;workers:number;
  decisions?:readonly string[];worldDir?:string;model?:string;reasoningEffort?:string;serviceTier?:string;ledgerFrom?:string;
  /** Continue an interrupted run in the same --out: identical inputs, build and options required. */
  resume?:boolean;
  toolBudget?:ToolBudget;geometryFrom?:string;appBuild?:string;toolReplayFrom?:string;
  /** Arm R only: per-decision RLM budget and optional cheaper sub-call model. */
  rlmBudget?:RlmBudget;rlmSubModel?:string;rlmSubReasoningEffort?:string;
}
export async function freshOutput(runDir:string,outDir:string) {
  const runs=path.resolve(REPO_ROOT,'runs'),source=await realpath(runDir);
  const target=path.resolve(outDir);
  if(![runs,await realpath(tmpdir())].includes(path.dirname(target))||target===source||existsSync(target))throw new Error('--out must be a NEW direct child of this worktree runs/ or TMPDIR');
  await mkdir(target);return target;
}

export async function resumedOutput(outDir:string) {
  const target=path.resolve(outDir);
  const state=await readJson(path.join(target,'manifest.json'),z.object({status:z.string()}).passthrough());
  if(state.status==='completed')throw new Error('--resume: run already completed');
  if(!existsSync(path.join(target,'inputs/binding.json')))throw new Error('--resume: no inputs/binding.json in --out');
  return target;
}

export async function evaluateQuality(opts:QualityOptions) {
  if(opts.backend==='codex'&&opts.serviceTier==='fast')throw new Error('Codex fast mode is prohibited; use --service-tier default');
  if(!Number.isInteger(opts.workers)||opts.workers<1||opts.workers>2)throw new Error('--workers must be 1 or 2 (14 GB budget)');
  if(!Number.isInteger(opts.samples)||opts.samples<1)throw new Error('--samples must be positive');
  if(!opts.arms.length||new Set(opts.arms).size!==opts.arms.length||opts.arms.some(a=>!['A','B','C','D','E','R','sanity'].includes(a)))throw new Error('Implemented arms: A, B, C, D, E, R, sanity');
  if(opts.arms.includes('sanity')&&opts.backend!=='replay')throw new Error('Sanity requires replay; no new proposals');
  if(opts.arms.includes('C')&&!['codex','replay'].includes(opts.backend))throw new Error('Query-tool arm C requires codex or replay');
  const source=await realpath(opts.runDir),historical=await historicalDecisions(source),selected=selectDecisions(historical,opts.decisions);
  if(!selected.length)throw new Error('No nightly decisions selected');
  // An empty earlier ledger has no measured values to import or rebind. All
  // other comparisons still require the fully bound recomputed sanity ledger.
  if(opts.arms.some(a=>a!=='sanity')&&!opts.ledgerFrom&&selected.some(r=>historical.some(h=>h.persona===r.persona&&h.night<r.night&&h.candidates.length)))throw new Error('Comparative arms with history require --ledger-from <completed current sanity run>');
  const manifest=await readJson(path.join(source,'manifest.json'),z.object({world:z.string(),model:z.string().optional(),
    fingerprints:z.object({world:z.string(),fixtures:z.string()}).optional()}));
  const worldSource=await realpath(opts.worldDir??manifest.world);
  const worldSha256=await treeHash(worldSource);
  const worldManifest=await readJson(path.join(worldSource,'manifest.json'),z.object({fixtures:z.object({index:z.string()}).passthrough()}).passthrough());
  const fixtureIndex=path.resolve(REPO_ROOT,worldManifest.fixtures.index),fixtureSource=path.dirname(fixtureIndex);
  const fixturesSha256=await treeHash(fixtureSource);
  if(manifest.fingerprints&&(worldSha256!==manifest.fingerprints.world||fixturesSha256!==manifest.fingerprints.fixtures))throw new Error('World/fixtures differ from the frozen run fingerprints; supply the original inputs');
  const out=opts.resume?await resumedOutput(opts.outDir):await freshOutput(source,opts.outDir),inputs=path.join(out,'inputs');
  if(!opts.resume){
  await mkdir(inputs);
  // Copy only read-only inputs. No source login/recover/write methods are called.
  await cp(worldSource,path.join(inputs,'world'),{recursive:true});
  if(await treeHash(path.join(inputs,'world'))!==worldSha256)throw new Error('World changed while snapshotting');
  await cp(fixtureSource,path.join(inputs,'fixtures'),{recursive:true});
  if(await treeHash(path.join(inputs,'fixtures'))!==fixturesSha256)throw new Error('Fixtures changed while snapshotting');
  // Only the copied index location changes; all clinical/world bytes stay frozen.
  await writeJson(path.join(inputs,'world/manifest.json'),{...worldManifest,fixtures:{...worldManifest.fixtures,index:path.join(inputs,'fixtures',path.basename(fixtureIndex))}});
  await cp(path.join(source,'manifest.json'),path.join(inputs,'source-manifest.json'));
  await cp(path.join(source,'programs'),path.join(inputs,'programs'),{recursive:true});
  await cp(path.join(source,'days'),path.join(inputs,'days'),{recursive:true});
  await cp(path.join(source,'decisions'),path.join(inputs,'decisions'),{recursive:true});
  await cp(path.join(source,'llm'),path.join(inputs,'llm'),{recursive:true});
  await cp(path.join(source,'certifications'),path.join(inputs,'certifications'),{recursive:true});
  }
  const native=createEhr({fake:false});
  const binding={source,worldSource,originalWorldSha256:worldSha256,fixturesSha256,worldSha256:await treeHash(path.join(inputs,'world')),sourceDecisionsSha256:await treeHash(path.join(inputs,'decisions')),
    sourceProgramsSha256:await treeHash(path.join(inputs,'programs')),sourceDaysSha256:await treeHash(path.join(inputs,'days')),sourceLlmSha256:await treeHash(path.join(inputs,'llm')),sourceCertificationsSha256:await treeHash(path.join(inputs,'certifications')),
    ehrSha256:native.binary?await fileHash(native.binary):null,agentSha256:await treeHash(path.join(REPO_ROOT,'agent/src')),
    app:JSON.parse(await readFile(opts.appBuild??path.join(REPO_ROOT,'app/dist/build.json'),'utf8')),selected:selected.map(decisionId),options:opts,label:OFFLINE_LABEL,
    ...(opts.ledgerFrom?{ledgerSource:{directory:path.resolve(opts.ledgerFrom),recordsSha256:await fileHash(path.join(opts.ledgerFrom,'records.json'))}}:{}),
    geometryCache:path.join(tmpdir(),'vgi-proposal-quality-geometry-cache')};
  if(opts.resume){
    // Every input, the native binary, agent sources, app build and options must match the
    // interrupted run, so resumed samples are exchangeable with the ones already recorded.
    const previous:unknown=JSON.parse(await readFile(path.join(inputs,'binding.json'),'utf8'));
    const comparable=(b:unknown)=>{const {options,...rest}=z.object({options:z.record(z.string(),z.unknown())}).passthrough().parse(b);return JSON.stringify({...rest,options:Object.fromEntries(Object.entries(options).filter(([key])=>key!=='resume'))});};
    if(comparable(previous)!==comparable(binding))throw new Error('--resume: inputs, build, agent sources or options differ from the interrupted run');
  }
  else await writeJson(path.join(inputs,'binding.json'),binding);
  const measured=opts.ledgerFrom?await loadMeasuredSavings(opts.ledgerFrom,historical,binding):null;
  const world=await loadWorld(path.join(inputs,'world')),records:OfflineRecord[]=[];
  const sanity:{decisionId:string;candidates:ReturnType<typeof candidateDiffs>}[]=[];
  const state:{status:string;label:string;error:string|null;completed:number;planned:number}={status:'running',label:OFFLINE_LABEL,error:null,completed:0,planned:selected.length*opts.arms.reduce((n,a)=>n+(a==='sanity'?1:opts.samples),0)};
  await writeJson(path.join(out,'manifest.json'),state);
  let cursor=0,stopped=false;
  async function worker(index:number) {
    const workerDir=path.join(out,`worker-${index}`),ehrNative=retryEhr(recordingEhr(native,path.join(workerDir,'ehr')));
    const specFiles=new Map<string,string>(),boundNative=archivedSpecEhr(ehrNative,specFiles);
    const catalog=await readJson(path.join(inputs,'fixtures',path.basename(fixtureIndex)),z.object({patients:z.array(z.object({file:z.string(),flags:z.object({pediatric:z.boolean(),surgical:z.boolean()})}))}));
    const browser=opts.geometryFrom?{provider:await frozenGeometry(opts.geometryFrom,z.object({appSha256:z.string()}).parse(binding.app).appSha256),close:async()=>{}}:browserGeometry(boundNative,input=>{
      const sample=input.program.role==='np'?catalog.patients.find(p=>p.flags.pediatric):input.program.role==='surgeon'?catalog.patients.find(p=>p.flags.surgical):{file:'Ashly_Rippin_149fcc1f.json'};
      if(!sample)throw new Error('Missing mandatory geometry fixture');return [path.join(inputs,'fixtures',sample.file)];
    },binding.geometryCache);
    try {
      while(!stopped) {
        const original=selected[cursor++];if(!original)break;
        specFiles.clear();for(const [version,file] of await frozenSpecs(inputs,original.persona))specFiles.set(version,file);
        // A new namespace prevents a prior sample's persisted validation atlas from
        // contributing states to this decision's train-only locality digest.
        const geometryDir=path.join(workerDir,decisionId(original));
        const ehr=geometryEhr(boundNative,input=>retryInfrastructure('geometry',()=>browser.provider(input),true),geometryDir);
        const started=performance.now();
        const deps:LoopDeps={runId:path.basename(out),store:new RunStore(workerDir),ehr,
          screens:{mode:'real',async check(){throw new Error('Offline screen check prohibited');}},
          agent:new LlmAgent(new RecordingLlm(createBackend('replay',{replayFrom:inputs,replayAllowDrift:true}),workerDir)),
          seedPolicy:'none',seedState:{injected:0,rejected:new Set()},worldDir:world.dir,worldSeed:world.manifest.seed};
        const input=await frozenNight(inputs,original,historical,world,deps);
        const inputDir=path.join(out,'frozen',decisionId(original));
        await writeJson(path.join(inputDir,'input.json'),{...input,programs:Object.fromEntries(input.programs),holdout:{day:input.holdout.day}});
        const prepareMs=performance.now()-started;
        const contextStarted=performance.now();
        const locality=opts.arms.some(a=>a==='B'||a==='C'||a==='D'||a==='E'||a==='R')?await frozenLocality(input,geometryDir):null;
        const quality=locality?{ledger:measuredLedger(historical,original.persona,original.night,measured??new Map()),locality}:null;
        const qualityContextMs=performance.now()-contextStarted;
        const queryBundle=opts.arms.some(a=>a==='C'||a==='E'||a==='R')&&quality?trainingQueryBundle(input,(await frozenTrainAtlases(input,geometryDir)).map(d=>d.atlas),quality):null;
        if(queryBundle){const files=path.join(inputDir,'query-files');await rm(files,{recursive:true,force:true});await mkdir(files);await writeQueryDirectory(files,queryBundle);}
        const queryContextMs=performance.now()-contextStarted-qualityContextMs;
        for(const arm of opts.arms)for(let sample=1;sample<=(arm==='sanity'?1:opts.samples);sample++) {
          if(stopped)break;
          const sampleDir=path.join(out,'samples',decisionId(original),arm,String(sample));
          if(opts.resume&&existsSync(path.join(sampleDir,'record.json'))){
            const done=offlineRecordSchema.parse(JSON.parse(await readFile(path.join(sampleDir,'record.json'),'utf8')));
            if(arm==='sanity')throw new Error('--resume does not support the sanity arm');
            records.push(done);state.completed++;await writeJson(path.join(out,'manifest.json'),state);continue;
          }
          // An interrupted sample restarts from scratch; keep its partial files for audit.
          if(opts.resume&&existsSync(sampleDir)){let n=1;while(existsSync(`${sampleDir}.partial-${n}`))n++;await rename(sampleDir,`${sampleDir}.partial-${n}`);}
          const first=await readJson(llmRecordPath(inputs,`night-${pad2(original.night)}/${original.persona}/propose-0`),llmRecordSchema);
          const usage=z.object({reasoningEffort:z.string().optional(),serviceTier:z.string().nullable().optional()}).safeParse(first.usage);
          // E and R replay from their own recorded sample; R allows no prompt drift at all.
          const ownReplay=(arm==='E'||arm==='R')&&opts.toolReplayFrom?path.join(opts.toolReplayFrom,'samples',decisionId(original),arm,String(sample)):null;
          const backendOptions={replayFrom:ownReplay??inputs,replayAllowDrift:arm!=='R',queryMode:arm==='C',model:opts.model??(['codex','replay'].includes(opts.backend)?manifest.model??first.model:undefined),
            reasoningEffort:opts.reasoningEffort??(usage.success?usage.data.reasoningEffort:undefined)??'high',serviceTier:opts.backend==='codex'?(opts.serviceTier??'default'):opts.serviceTier??(usage.success?usage.data.serviceTier:undefined)??'default'};
          const meter=meteredLlm(createBackend(arm==='sanity'?'replay':opts.backend,backendOptions),arm==='R'&&ownReplay?ownReplay:inputs);
          const separateSub=arm==='R'&&opts.backend!=='replay'&&((opts.rlmSubModel!==undefined&&opts.rlmSubModel!==backendOptions.model)||(opts.rlmSubReasoningEffort!==undefined&&opts.rlmSubReasoningEffort!==backendOptions.reasoningEffort));
          const subMeter=separateSub?meteredLlm(createBackend(opts.backend,{...backendOptions,model:opts.rlmSubModel??backendOptions.model,reasoningEffort:opts.rlmSubReasoningEffort??backendOptions.reasoningEffort}),inputs):meter;
          const sampleDeps:LoopDeps={...deps,store:new RunStore(sampleDir),agent:new LlmAgent(new RecordingLlm(meter.llm,sampleDir)),seedState:{injected:0,rejected:new Set()}};
          const session=arm==='E'&&queryBundle?nightToolSession(input,sampleDeps,queryBundle,opts.toolBudget??DEFAULT_TOOL_BUDGET,async event=>{
            await writeJson(path.join(sampleDir,'tools',`${String(event.index).padStart(3,'0')}.json`),event);
          }):null;
          if(session)sampleDeps.agent=new ToolNightAgent(new RecordingLlm(meter.llm,sampleDir),session,input);
          if(arm==='R'&&!queryBundle)throw new Error('Arm R requires the train-only query bundle');
          let rlmTurns=0;
          const rlm=arm==='R'&&queryBundle?new RlmNightAgent(input,sampleDeps,queryBundle,{root:new RecordingLlm(meter.llm,sampleDir),sub:new RecordingLlm(subMeter.llm,sampleDir),runDir:sampleDir,
            budget:opts.rlmBudget??DEFAULT_RLM_BUDGET,...(ownReplay?{replayFrom:ownReplay}:{}),persist:async entry=>{await writeJson(path.join(sampleDir,'rlm',`${String(rlmTurns++).padStart(3,'0')}.json`),entry);}}):null;
          if(rlm)sampleDeps.agent=rlm;
          const tick=performance.now();
          let result;
          try {
            result=await auditedOperation(sampleDir,meter.llm,original.persona,original.night,()=>runNight(sampleDeps,input,{offline:true,
              ...((arm==='B'||arm==='C'||arm==='D')&&quality?{quality}:{}),...(arm==='D'?{structure:defaultStructurePolicy()}:{}),...(arm==='C'&&queryBundle?{queryBundle}:{})}));
          } finally {await rlm?.close();}
          const certified=arm==='sanity'?undefined:result.record.certification.attempts.filter(a=>a.check.status==='pass').at(-1);
          const program=certified?applyToProgram(input.current,certified.patch,{version:input.current.version+1,specVersion:input.current.specVersion}).program:null;
          const singleton=certified?.candidateIds.length===1?result.record.candidates.find(e=>e.candidate.id===certified.candidateIds[0])?.trainEstimate:null;
          const estimate=program?(singleton??await new TrainEstimator(sampleDeps,input,input.release.specVersion).estimate(program)):null;
          const effect=program?await scoreStructure(input.current,program,estimate,{clinician:input.persona.id,department:'offline',role:input.current.role,train:trainEstimateWindow(input.train)}):null;
          const effects={train:effect?.gross??null,netTrain:effect?.net??null,validation:result.record.validation.replay?result.record.validation.replay.saving.clicks+result.record.validation.replay.saving.scrolls:null,
            structuralDistance:program?structuralDistance(input.current,program):null};
          const record:OfflineRecord={...result.record,effects,offline:true,screenCheck:'skipped',label:OFFLINE_LABEL,decisionId:decisionId(original),arm,sample,
            ...(session?{toolLoop:session.stats(),toolEvents:session.events}:{}),...(rlm?{rlmLoop:rlm.stats()}:{}),
            queries:session?{count:session.events.length,tally:session.stats().tally}:rlm?{count:Object.entries(rlm.stats().tally).filter(([k])=>k!=='root_turn').reduce((n,[,v])=>n+v,0),tally:rlm.stats().tally}:meter.queries(),
            tokens:subMeter===meter?meter.tokens():sumTokens(meter.tokens(),subMeter.tokens()),callCount:meter.callCount()+(subMeter===meter?0:subMeter.callCount()),wallTimeMs:performance.now()-tick+prepareMs+(arm==='B'||arm==='D'?qualityContextMs:arm==='C'||arm==='E'||arm==='R'?qualityContextMs+queryContextMs:0),frozenInputs:path.relative(out,path.join(inputDir,'input.json')),
            repeatedMeasuredBad:measured?repetitionCount(result.record,historical,measured):0,proposedCandidates:result.record.candidates.filter(e=>!e.candidate.seeded).length};
          await writeJson(path.join(sampleDir,'record.json'),offlineRecordSchema.parse(record));await writeJson(path.join(sampleDir,'calls.json'),meter.calls);
          if(arm==='sanity') {
            const diff=candidateDiffs(original,result.record);
            await writeJson(path.join(sampleDir,'candidate-diffs.json'),{label:OFFLINE_LABEL,decisionId:record.decisionId,candidates:diff});
            sanity.push({decisionId:record.decisionId,candidates:diff});
            await writeJson(path.join(out,'sanity-diffs.json'),{label:OFFLINE_LABEL,decisions:sanity});
            if(diff.some(d=>d.countMismatch||d.missing||d.daysMismatch)) {stopped=true;throw new Error(`Unexplained click/keystroke/task count, changed train days or missing estimate in ${record.decisionId}; inspect candidate-diffs.json; results suppressed`);}
          }
          records.push(record);state.completed++;
          await writeJson(path.join(out,'manifest.json'),state);
          console.log(`${record.decisionId} ${arm}/${sample}: ${record.outcome}, ${Math.round(record.wallTimeMs/1000)}s, ${meter.calls.filter(c=>c.promptMatched===false).length} prompt mismatches`);
        }
      }
    } catch(error){stopped=true;throw error;} finally {await browser.close();}
  }
  try {
  const workers=await Promise.allSettled(Array.from({length:Math.min(opts.workers,selected.length)},(_,i)=>worker(i)));
  const failed=workers.find(w=>w.status==='rejected');
  if(failed?.status==='rejected') throw failed.reason;
  // The frozen copy, including world bytes, must remain unchanged during evaluation.
  if(await treeHash(path.join(inputs,'world'))!==binding.worldSha256)throw new Error('Frozen world changed');
  if(await treeHash(path.join(inputs,'fixtures'))!==binding.fixturesSha256)throw new Error('Frozen fixtures changed');
  for(const [directory,expected] of [['programs',binding.sourceProgramsSha256],['days',binding.sourceDaysSha256],['decisions',binding.sourceDecisionsSha256],['llm',binding.sourceLlmSha256],['certifications',binding.sourceCertificationsSha256]]) {
    if(!directory||!expected||await treeHash(path.join(inputs,directory))!==expected)throw new Error(`Frozen ${directory} changed`);
  }
  if(sanity.length===historical.filter(r=>r.mode==='nightly').length){const current=recomputedSavings(historical,records.filter(r=>r.arm==='sanity').map(r=>({...r,screenCheck:null})));for(const r of records)if(r.arm==='sanity'){r.repeatedMeasuredBad=repetitionCount({...r,screenCheck:null},historical,current);await writeJson(path.join(out,'samples',r.decisionId,r.arm,String(r.sample),'record.json'),offlineRecordSchema.parse(r));}}
  records.sort((a,b)=>a.decisionId.localeCompare(b.decisionId)||a.arm.localeCompare(b.arm)||a.sample-b.sample);
  await writeJson(path.join(out,'records.json'),records);const report=await writeQualityReport(out,records);
  if(sanity.length) {
    await writeJson(path.join(out,'sanity-diffs.json'),{label:OFFLINE_LABEL,decisions:sanity});
    const candidates=sanity.flatMap(d=>d.candidates),keys=Object.keys(candidates[0]?.deltas??{});
    const lines=[`# ${OFFLINE_LABEL}`,'',`Sanity: ${sanity.length} decisions, ${candidates.length} nonseeded historical candidates. Click/keystroke counts agree; every formerly measured candidate is present.`,
      '', '| Metric (recomputed − recorded) | Candidates changed | Largest absolute delta |','|---|---:|---:|',
      ...keys.map(key=>{const deltas=candidates.flatMap(c=>typeof c.deltas[key]==='number'?[c.deltas[key]]:[]);return `| ${key} | ${deltas.filter(d=>d!==0).length} | ${Math.max(0,...deltas.map(Math.abs))} |`;}),
      '', 'Full per-candidate estimates/deltas are in sanity-diffs.json. Geometry-derived scroll/pixel differences require interpretation against renderer/capture changes; this table alone does not establish their cause.'];
    await writeFile(path.join(out,'sanity.md'),lines.join('\n')+'\n');
  }
  state.status='completed';await writeJson(path.join(out,'manifest.json'),state);return report;
  } catch(error) {
    state.status='aborted';state.error=String(error);await writeJson(path.join(out,'manifest.json'),state);throw error;
  }
}

