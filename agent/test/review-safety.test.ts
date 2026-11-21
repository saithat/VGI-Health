import {scriptedClimb} from "./lean-fixture.js";
import { withData } from "./data.js";
import { readFile } from 'node:fs/promises';
import { createFakeEhr } from '../src/fake/ehr-fake.js';
import { ScriptedLlm } from './scripted.js';
import { fakeWorld,tmp } from './helpers.js';
import { runDays,type RunSummary } from '../src/run.js';
import { ReplayLlm } from '../src/backends/replay.js';
import { assertCertified } from '../src/certification.js';
import { completionOk,replayDay } from '../src/night.js';
import { sumMetrics } from '../src/observe.js';
import { RunStore } from '../src/store.js';
import { screenCheckRejection } from '../src/screen-gate.js';
import { rejectionKind } from '../src/seeded.js';
import { dayResultSchema,checkResultSchema } from '../src/schema.js';
import { writeJson } from '../src/util.js';

withData("runs/core-10day/decisions").describe("archive-backed agent prompts", () => {
  let run:RunSummary, world:string, root:string;
  beforeAll(async()=>{
    world=await fakeWorld(2); root=await tmp('FAKE-review-days1-8');
    run=await runDays({ ...scriptedClimb,days:2,personas:['P1'],worldDir:world,runsRoot:root,runId:'FAKE-recorded',llm:new ScriptedLlm()});
    const replay=await runDays({ ...scriptedClimb,days:2,personas:['P1'],worldDir:world,runsRoot:root,runId:'REPLAY',hillclimb:{},llm:new ReplayLlm(run.dir)});
    expect(replay.timelines).toEqual(run.timelines);
  },60000);
  it.each(['verdict','specVersion','programHash'])('refuses measurement with a wrong certificate %s',async(field)=>{
    const ehr=createFakeEhr();const original=ehr.deploy; const simulated=vi.spyOn(ehr,'simulate');
    ehr.deploy=async(input)=>{const result=await original(input);if(result.deployed) Object.assign(result.certificate,{[field]:field==='verdict'?{violation:{property:'UnitsRight',message:'FAKE bad certificate',counterexample:[],screens:[]}}:'wrong'});return result;};
    await expect(runDays({ ...scriptedClimb,days:1,personas:['P1'],worldDir:world,runsRoot:await tmp('bad-cert'),llm:new ScriptedLlm(),ehr})).rejects.toThrow('Refusing uncertified measurement');
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
  it('reports screen infrastructure as error and classifies only exact checker properties',()=>{
   const check=screenCheckRejection({status:'error',mode:'real',bundles:[],pages:0,failingScreens:[],failingFiles:[],message:'startup failed'});
   expect(check.status).toBe('error');expect(rejectionKind(check)).toBe(null);
   expect(rejectionKind(checkResultSchema.parse({...check,status:'fail',property:'Unrelated',message:'pounds allergies identity'}))).toBe(null);
   expect(rejectionKind({...check,status:'fail',property:'UnitsRight',message:'field w on screen s fills weightKg from record value triageWeightLb, a bare number'})).toBe('lbWeightAccepted');
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

});
