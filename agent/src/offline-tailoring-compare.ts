import { BOUNDED_POINT_ASSUMPTION } from '../../app/src/dashboard/bounded-pointing.js';
/** Native, model-free A/B/C comparison. Outputs data only; fixed v1 isolates discretionary releases. */
import { mkdir, readFile, readdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { runDays } from './run.js';
import { CADENCE_PROTOCOL } from './cadence.js';
import { generatorOnlyBackend } from './generator-only.js';
import { dayResultSchema, dayScheduleSchema, programSchema, decisionRecordSchema, personaParamsSchema, type DayResult } from '../../app/src/dashboard/measurement-schema.js';
import { effortCost } from './bounded-tailoring.js';
import { pastSessions } from './session-gate.js';
import { RunStore } from './store.js';
import { writeJson, REPO_ROOT } from './util.js';
import { fileHash } from './fingerprints.js';
import { createEhr, DEFAULT_EHR_BIN } from './ehr.js';
import { createScreenChecker } from './screencheck.js';
import { immutableScreenChecks } from './offline-screen-cache.js';
import { primaryV1Schedule } from './offline-workload.js';
import { reuseOfflineScreens } from './offline-screen-evidence.js';
import { offlinePersonaParams, OFFLINE_PREFERENCE_ASSUMPTION, offlineRoleProfiles } from './offline-preferences.js';
const {values}=parseArgs({options:{world:{type:'string'},out:{type:'string'},days:{type:'string'},resume:{type:'boolean',default:false},'preflight-only':{type:'boolean',default:false},'reuse-evidence':{type:'string'},'reuse-source':{type:'string'}}});
const out=path.resolve(values.out??path.join(process.env['TMPDIR']??'', 'wire-comparison'));
const source=path.resolve(values.world??path.join(REPO_ROOT,'runs/world/2'));
const days=Number(values.days??8);
if(!Number.isInteger(days)||days<8||days>10)throw Error('Use 8..10 days (native dated workload limit); weekly slot is night 7');
const world=path.join(out,'world');
const seed=1, personas=['P1','P2'];
if(!existsSync(world)) {
  await mkdir(world,{recursive:true});
  await copyFile(path.join(source,'manifest.json'),path.join(world,'manifest.json'));
  await writeJson(path.join(world,'world.json'),{seed,days,personas});
  for(const id of ['P1','P2'] as const) {
    await writeJson(path.join(world,'personas',`${id}.json`),offlinePersonaParams(id,seed));
    for(let day=1;day<=days;day++) {
      const schedule=dayScheduleSchema.parse(JSON.parse(await readFile(path.join(source,'schedules',`day-${String(day).padStart(2,'0')}`,`${id}.json`),'utf8')));
      await writeJson(path.join(world,'schedules',`day-${String(day).padStart(2,'0')}`,`${id}.json`),primaryV1Schedule(schedule));
    }
  }
}
for (const id of ['P1','P2'] as const) {
  const saved=JSON.parse(await readFile(path.join(world,'personas',`${id}.json`),'utf8'));
  if(JSON.stringify(saved)!==JSON.stringify(offlinePersonaParams(id,seed)))throw Error('Offline persona seed differs from the declared assumption; use a new output directory');
}
const reports=[];
const ehr=createEhr();
if(ehr.mode!=='real')throw Error('Offline comparison requires the native EHR');
// Catch unsupported clinical goals before a multi-night run, without using costs to select cases.
for(const id of ['P1','P2']) {
  const program=programSchema.parse(JSON.parse(await readFile(path.join(REPO_ROOT,'releases/v1/personas',`${id}.json`),'utf8')));
  const persona=personaParamsSchema.parse(JSON.parse(await readFile(path.join(world,'personas',`${id}.json`),'utf8')));
  for(let day=1;day<=days;day++) {
    const schedule=dayScheduleSchema.parse(JSON.parse(await readFile(path.join(world,'schedules',`day-${String(day).padStart(2,'0')}`,`${id}.json`),'utf8')));
    const reference=await ehr.simulate({specVersion:'v1',program,persona,schedule,worldDir:world,seed:1000+day,policy:'expert'});
    if(reference.tasks.length!==2 || reference.tasks.some(t=>!t.completed))throw Error(`Expert preflight failed: ${id} day ${day}: ${reference.complaints.join('; ')}`);
  }
}
console.log('Expert preflight: all selected clinical goals complete in v1');
if(values['preflight-only'])process.exit(0);
// Exact rendered-tree/context fingerprints govern reuse; every new state still passes the full screen gate.
const realScreens=createScreenChecker(ehr,{artifactsDir:path.join(out,'screens')});
const reused=values['reuse-evidence'] ? await reuseOfflineScreens({previous:values['reuse-evidence'],sourceRef:values['reuse-source']??'',world,ehr,inner:realScreens}):null;
const screens=immutableScreenChecks(reused?.screens??realScreens);
for(const arm of ['A','B','C'] as const) {
  const dir=path.join(out,'runs',arm);
  const summary=await runDays({structurePolicy:false,protocol:CADENCE_PROTOCOL,days,worldDir:world,runsRoot:path.join(out,'runs'),runId:arm,
    resume:values.resume && existsSync(path.join(dir,'manifest.json')),personas,ehr,screens,llm:generatorOnlyBackend,generatorOnly:true,discoveryNights:3,boundedCosts:true,
    cadence:arm==='A'?{kind:'nightly'}:{kind:'weekly'},tailoringSessions:arm==='C',seedPolicy:'none',releaseDays:{v2:100,v3:101},
    log:line=>console.log(`${arm}: ${line}`)});
  const results:DayResult[]=[];
  for(let day=1;day<=days;day++)for(const id of personas)results.push(dayResultSchema.parse(JSON.parse(await readFile(path.join(dir,'days',`day-${String(day).padStart(2,'0')}`,`${id}.json`),'utf8'))));
  const sessions=await pastSessions(path.join(dir,'runs'),days+1);
  const decisions=[];
  for(let night=1;night<days;night++)for(const id of personas)decisions.push(decisionRecordSchema.parse(JSON.parse(await readFile(path.join(dir,'decisions',`night-${String(night).padStart(2,'0')}`,`${id}.json`),'utf8'))));
  const preferences=[];
  const store=new RunStore(dir,path.join(dir,'custom'));
  for(const id of ['P1','P2'] as const) {
    const final=(await store.login(id)).program;
    const initial=programSchema.parse(JSON.parse(await readFile(store.programPath(id,0),'utf8')));
    const distance=(program:typeof final,tag:string,nearTag:string)=>{
      const locations=program.screens.flatMap(s=>s.components.map((c,i)=>({tag:c.tag||c.id,screen:s.id,position:i})));
      const a=locations.find(c=>c.tag===tag),b=locations.find(c=>c.tag===nearTag);
      return a&&b?(a.screen===b.screen?0:400)+40*Math.abs(a.position-b.position):null;
    };
    const prefs=personaParamsSchema.parse(JSON.parse(await readFile(path.join(world,'personas',`${id}.json`),'utf8'))).hiddenPreferences;
    preferences.push({clinician:id,placements:prefs?.placements.map(p=>({tag:p.tag,nearTag:p.nearTag,
      initialDistance:distance(initial,p.tag,p.nearTag),finalDistance:distance(final,p.tag,p.nearTag),
      recovered:distance(final,p.tag,p.nearTag)!==null && (distance(final,p.tag,p.nearTag)??Infinity)<=40}))});
  }
  const modelCalls=(await readdir(path.join(dir,'llm'),{recursive:true}).catch(()=>[])).filter(f=>f.endsWith('.json'));
  if(modelCalls.length)throw Error('Offline run unexpectedly recorded model calls');
  reports.push({arm,bounded:effortCost(results),expertFloor:effortCost(results.map(r=>{if(!r.expert)throw Error('Missing bounded expert comparison');return r.expert;})),
    incomplete:results.flatMap(d=>d.tasks.filter(t=>!t.completed).map(t=>({day:d.day,clinician:d.persona,task:t.task}))),
    completed:results.flatMap(d=>d.tasks).filter(t=>t.completed).length,tasks:results.flatMap(d=>d.tasks).length,
    shippedChanges:summary.timelines.reduce((n,t)=>n+t.nights.filter(r=>r.outcome==='deployed').length,0),
    sessions:sessions.length,reviewOpportunities:decisions.filter(d=>d.cadence?.review).length,
    keptCurrent:decisions.filter(d=>d.cadence?.review?.chosenBundle===null).length,preferences,
    outcomes:summary.timelines.map(t=>({clinician:t.persona,nights:t.nights.map(n=>({night:n.night,outcome:n.outcome}))})),modelCalls:modelCalls.length});
  await writeJson(path.join(out,'comparison.json'),{seed,days,personas,discoveryNights:3,preferenceAssumption:OFFLINE_PREFERENCE_ASSUMPTION,roleProfiles:offlineRoleProfiles,pointingAssumption:BOUNDED_POINT_ASSUMPTION,evidenceReuse:reused?.provenance??null,workload:'first two v1-compatible primary-workflow tasks per clinician/day (P1 W1 excludes non-medication orders; P2 W3); fixed v1; independent carried actor memories per arm; train odd days partitioned; native effort includes search/help/relearning',
    nativeSha256:await fileHash(process.env['EHR_BIN']??DEFAULT_EHR_BIN),reports});
  console.log(JSON.stringify(reports.at(-1)));
}
