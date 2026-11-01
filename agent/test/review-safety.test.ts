import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createFakeEhr } from '../src/fake/ehr-fake.js';
import { ScriptedLlm } from './scripted.js';
import { fakeWorld, tmp, readLlmRecords } from './helpers.js';
import { runDays, type RunSummary } from '../src/run.js';
import { ReplayLlm } from '../src/backends/replay.js';
import { assertCertified } from '../src/certification.js';
import { completionOk, replayDay } from '../src/night.js';
import { sumMetrics } from '../src/observe.js';
import { RunStore } from '../src/store.js';
import { bindBuild } from '../src/build-binding.js';
import { rebindRun } from '../src/rebind.js';
import { readBinding } from '../src/binding-pointer.js';
import { sha256, stableStringify } from '../src/program.js';
import { createScreenChecker, screenCheckRejection } from '../src/screencheck.js';
import { rejectionKind } from '../src/seeded.js';
import { dayResultSchema, checkResultSchema } from '../src/schema.js';
import { writeJson } from '../src/util.js';

let run:RunSummary, world:string, root:string;
beforeAll(async()=>{
  world=await fakeWorld(8); root=await tmp('FAKE-review-days1-8');
  run=await runDays({days:8,worldDir:world,runsRoot:root,runId:'FAKE-recorded',llm:new ScriptedLlm()});
  const replay=await runDays({days:8,worldDir:world,runsRoot:root,runId:'REPLAY',llm:new ReplayLlm(run.dir)});
  expect(replay.timelines).toEqual(run.timelines);
},30000);
it('FAKE/REPLAY cross days 4 and 7 for all five forks with blind measurements',async()=>{
  const manifest=JSON.parse(await readFile(path.join(run.dir,'manifest.json'),'utf8'));
  expect(manifest.mode).toBe('FAKE'); expect(manifest.status).toBe('completed');
  for(const timeline of run.timelines){
    expect(timeline.days.map(d=>d.specVersion)).toEqual(['v1','v1','v1','v2','v2','v2','v3','v3']);
    const store=new RunStore(run.dir);
    for(let n=1;n<=7;n++){
      const r=await store.readDecision(n,timeline.persona);
      if(r.deployed){expect(completionOk(r.validation.replay)).toBe(true);expect(r.validation.accepted).toBe(true);}
      if(r.measured.test) expect(r.measured.test.day%2).toBe(0);
      expect(r.evidence.trainDays.every(d=>d%2===1&&d<=n)).toBe(true);
    }
  }
  for(const call of readLlmRecords(run.dir)) for(const day of [2,4,6,8]) expect(call.prompt).not.toContain(`d${String(day).padStart(2,'0')}-P`);
});
it.each(['verdict','specVersion','programHash'])('refuses measurement with a wrong certificate %s',async(field)=>{
  const ehr=createFakeEhr();const original=ehr.deploy; const simulated=vi.spyOn(ehr,'simulate');
  ehr.deploy=async(input)=>{const result=await original(input);if(result.deployed) Object.assign(result.certificate,{[field]:field==='verdict'?{violation:{property:'UnitsRight',message:'FAKE bad certificate',counterexample:[],screens:[]}}:'wrong'});return result;};
  await expect(runDays({days:1,personas:['P1'],worldDir:world,runsRoot:await tmp('bad-cert'),llm:new ScriptedLlm(),ehr})).rejects.toThrow('Refusing uncertified measurement');
  expect(simulated).not.toHaveBeenCalled();
});
it('certificate hash rejects a changed program',async()=>{
 const store=new RunStore(run.dir), {program,certificate}=await store.login('P1');
 expect(()=>assertCertified({...program,version:999},certificate,program.specVersion,'fake')).toThrow('program hash');
});
it('never counts unfinished effort as savings and intersects completion',async()=>{
 const store=new RunStore(run.dir);const day=dayResultSchema.parse(JSON.parse(await readFile(store.dayPath(2,'P1'),'utf8')));
 const task=day.tasks[0]; if(!task) throw new Error('No fixture task'); const before={...day,tasks:[{...task,completed:false,clicks:9000}]};
 const after={...day,tasks:[{...task,completed:true,clicks:1}]};
 expect(sumMetrics(before.tasks).clicks).toBe(0);
 expect(replayDay(2,'test',before,after).saving.clicks).toBe(0);
 expect(completionOk(replayDay(2,'test',after,before))).toBe(false);
});
it('resume refuses changed world bytes before simulation',async()=>{
 const file=path.join(world,'world.json');const original=await readFile(file,'utf8');
 await writeFile(file,original+'\n');
 await expect(runDays({days:8,resume:true,runId:'FAKE-recorded',worldDir:world,runsRoot:root,llm:new ScriptedLlm()})).rejects.toThrow('fingerprints changed');
 await writeFile(file,original);
});
it('reports screen infrastructure as error and classifies only exact checker properties',()=>{
 const check=screenCheckRejection({status:'error',mode:'real',bundles:[],pages:0,failingScreens:[],failingFiles:[],message:'startup failed'});
 expect(check.status).toBe('error');expect(rejectionKind(check)).toBe(null);
 expect(rejectionKind(checkResultSchema.parse({...check,status:'fail',property:'Unrelated',message:'pounds allergies identity'}))).toBe(null);
 expect(rejectionKind({...check,status:'fail',property:'UnitsRight'})).toBe('lbWeightAccepted');
});
it('aborts after three consecutive model failures with explicit llm-error decisions',async()=>{
 const runsRoot=await tmp('FAKE-failures');
 const llm={name:'scripted' as const,model:'broken',complete:async()=>{throw new Error('FAKE offline transport error');}};
 await expect(runDays({days:8,runId:'errors',personas:['P1'],worldDir:world,runsRoot,llm,releaseDays:{v2:99,v3:99}})).rejects.toThrow('3 consecutive LLM failures');
 const store=new RunStore(path.join(runsRoot,'errors'));
 for(const n of [1,2,3])expect((await store.readDecision(n,'P1')).outcome).toBe('llm-error');
 expect(JSON.parse(await readFile(path.join(store.dir,'manifest.json'),'utf8')).status).toBe('aborted');
});
it('falls back on screen infrastructure error, and aborts if the canonical also fails',async()=>{
 for(const persistent of [false,true]){
 const ehr=createFakeEhr();const screens=createScreenChecker(ehr);let failures=0;
 const original=screens.check.bind(screens);
 screens.check=async(i)=>i.specVersion==='v3'&&(persistent||failures++===0)?{status:'error',mode:'fake',bundles:[],pages:0,failingScreens:[],failingFiles:[],message:'FAKE infrastructure error'}:original(i);
 const options={days:8,personas:['P3'],worldDir:world,runsRoot:await tmp('migration-fallback'),runId:'migration',llm:new ScriptedLlm(),ehr,screens};
 if(persistent) await expect(runDays(options)).rejects.toThrow('canonical fallback failed');
 else {const result=await runDays(options);expect((await new RunStore(result.dir).readDecision(6,'P3')).release?.fallback).toBe(true);}
 }
});
it('rebind preserves history, resumes, and refuses a failed version without program edits',async()=>{
 const ehr=createFakeEhr();const build={appSha256:'1'.repeat(64),wasmSha256:'2'.repeat(64),ehrSha256:'3'.repeat(64),componentsSha256:sha256('[]')};
 const snapshots=new Map<string,string>();
 for(const persona of ['P1','P2','P3','P4','P5']) for(const file of await readdir(path.join(run.dir,'programs',persona))){
 if(!/^v\d+\.json$/.test(file))continue;const v=Number(file.slice(1,-5)); const store=new RunStore(run.dir);const program=await store.readProgram(persona,v);
 const certificate=JSON.parse(await readFile(store.certPath(persona,v),'utf8'));
 const inputs=JSON.parse(await readFile(path.join(run.dir,'certifications',persona,`v${v}`,'inputs.json'),'utf8'));
 const spec=JSON.parse(await readFile(path.join(run.dir,'certifications',persona,`v${v}`,'spec.json'),'utf8'));
 await writeJson(store.certPath(persona,v).replace('.json','.build.json'),{...bindBuild(build,program,certificate),certificationInputsSha256:sha256(stableStringify({spec,inputs}))});
 snapshots.set(`${persona}/${file}`,await readFile(store.programPath(persona,v),'utf8'));
 }
 const original=ehr.check; ehr.check=async(i)=>original({...i,specVersion:JSON.parse(await readFile(i.specVersion,'utf8')).version});
 const screens=createScreenChecker(ehr);const next={...build,appSha256:'4'.repeat(64)};
 const first=await rebindRun(run.dir,{ehr,screens,build:next});expect(first.every(r=>r.status==='bound')).toBe(true);
 expect((await rebindRun(run.dir,{ehr,screens,build:next})).every(r=>r.status==='cached')).toBe(true);
 const bad={...next,appSha256:'5'.repeat(64)};const check=ehr.check;
 ehr.check=async(i)=>i.program.owner.includes('P1')?{violation:{property:'UnitsRight',message:'FAKE refusal',screens:[],counterexample:[]}}:check(i);
 // Explicit infra gate failure for all versions: none may acquire the new build.
 screens.check=async()=>({status:'error',mode:'fake',bundles:[],pages:0,failingScreens:[],failingFiles:[],message:'FAKE browser unavailable'});
 const refused=await rebindRun(run.dir,{ehr,screens,build:bad});expect(refused.every(r=>r.status==='rejected')).toBe(true);
 await expect(readBinding(path.join(run.dir,'certs/P1/v0.build.json'))).rejects.toThrow('refused');
 expect(JSON.parse(await readFile(path.join(run.dir,'certs/P1/v0.build.0.json'),'utf8')).appSha256).toBe(build.appSha256);
 for(const [file,bytes] of snapshots)expect(await readFile(path.join(run.dir,'programs',file),'utf8')).toBe(bytes);
},30000);
it.each([['normal',{v2:99,v3:99}],['surface',{v2:2,v3:99}],['migration',{v2:99,v3:2}]])('requires full validation completion on %s deploy paths',async(_mode,releaseDays)=>{
  const ehr=createFakeEhr();const original=ehr.simulate;
  ehr.simulate=async(i)=>{const result=await original(i);return i.seed>=90_000_000&&i.program.version>0?{...result,tasks:result.tasks.map(t=>({...t,completed:false,clicks:0,keystrokes:0,klmDeciSec:0}))}:result;};
  const directory=await tmp('FAKE-incomplete');
  const options={days:2,personas:['P1'],worldDir:world,runsRoot:directory,runId:'completion',llm:new ScriptedLlm(),ehr,releaseDays};
  if(_mode==='normal'){
    const result=await runDays(options);expect((await new RunStore(result.dir).readDecision(1,'P1')).outcome).toBe('validation-rejected');
    expect((await new RunStore(result.dir).login('P1')).program.version).toBe(0);
  }else await expect(runDays(options)).rejects.toThrow('canonical fallback failed');
});
it('keeps the deploy pointer old until its decision is durable and recovers publication',async()=>{
  const directory=await tmp('FAKE-crash-window'), store=new RunStore(directory);
  const source=new RunStore(run.dir), initial=await source.readProgram('P1',0);
  const {certificate}=await source.login('P1');
  await store.deploy('P1',initial,certificate);
  const next={...initial,version:1};
  await store.deploy('P1',next,certificate,undefined,1);
  expect((await store.login('P1')).program.version).toBe(0);
  const record=await source.readDecision(1,'P1');
  record.deployed={version:1,program:'programs/P1/v1.json',certificate:'certs/P1/v1.json'};record.versionAfter=1;
  // Crash after durable record, before pointer publication.
  await writeJson(store.decisionPath(1,'P1'),record);
  expect((await new RunStore(directory).login('P1')).program.version).toBe(1);
});
