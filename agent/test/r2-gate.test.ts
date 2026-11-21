import { scriptedClimb } from "./lean-fixture.js";
import path from 'node:path';
import { scoredPair,scoredMetrics,releaseScoringSchema } from '../src/release-scoring.js';
import { boundedRefusals,learnabilityOk,makeHoldout,validationGross,TrainEstimator,type LoopDeps,type NightInput } from '../src/night.js';
import { summarizeTrain } from '../src/observe.js';
import { fakeSchedule,FAKE_PERSONAS } from '../src/fake/world.js';
import { createFakeEhr } from '../src/fake/ehr-fake.js';
import { fakeCanonical,fakeSpec } from '../src/fake/fixtures.js';
import { calibrationPartition,validationSchedules } from '../src/protocol.js';
import { fakeWorld,markingEhr,tmp } from './helpers.js';
import { runDays } from '../src/run.js';
import { ScriptedLlm } from './scripted.js';
import { RunStore } from '../src/store.js';
import { sha256,stableStringify } from '../src/program.js';

const task={task:'a',completed:true,clicks:20,scrolls:3,keystrokes:10,klmDeciSec:100,popups:0,overrides:0,searches:0,backtracks:0,mouseTravelPx:100,scrollPx:100};
const day={day:1,persona:'P1',programVersion:0,tasks:[task],trace:[],floor:[],complaints:[]};
const program={...fakeCanonical('v1'),owner:'P1',id:'P1'};
const params=FAKE_PERSONAS[0];if(!params)throw Error('Missing fixture persona');
const persona={id:'P1',userId:'P1',params};

function firstTask(){const t=fakeSchedule(1,'P1',7).tasks[0];if(!t)throw Error('Missing task');return t;}
function testDeps(ehr:LoopDeps['ehr']):LoopDeps {
  return {ehr,worldDir:'',worldSeed:7,store:new RunStore('unused'),runId:'test',
    screens:{mode:'fake',async check(){throw Error('unused');}},
    agent:{name:'scripted',model:'test',async proposeCandidates(){throw Error('unused');}},
    seedPolicy:'none',seedState:{rejected:new Set(),injected:0}};
}

it('charges failed tasks canonical cost +50% on both arms, including time, never partial effort',()=>{
  const failed={...day,tasks:[{...task,completed:false,clicks:1,scrolls:0,klmDeciSec:1}]};
  expect(scoredPair(failed,day,day)).toMatchObject({before:{completed:0,clicks:30,scrolls:5,keystrokes:15,klmDeciSec:150},after:{completed:1,clicks:20}});
  expect(scoredMetrics(failed,day,1).clicks).toBe(40);
  expect(()=>scoredPair(day,{...day,tasks:[]},day)).toThrow('identical unique task IDs');
  // Vendor also fails: charge the larger partial cost plus the penalty, never crash.
  const vendorFailed={...day,tasks:[{...task,completed:false,clicks:4,scrolls:2,klmDeciSec:50}]};
  expect(scoredPair(failed,day,vendorFailed).before).toMatchObject({completed:0,clicks:6,scrolls:3,klmDeciSec:75});
  expect(()=>scoredPair(failed,day,{...day,tasks:[{...task,task:'z'}]})).toThrow('identical unique task IDs');
  for(const incompletePenalty of [0,-1,Infinity,NaN])expect(()=>releaseScoringSchema.parse({incompletePenalty})).toThrow();
});

it('uses every task cost even when the opposite arm fails',()=>{
  const before={...day,tasks:[task,{...task,task:'b',completed:false}]};
  const after={...day,tasks:[{...task,completed:false},{...task,task:'b',clicks:15}]};
  const vendor={...day,tasks:[task,{...task,task:'b'}]};
  expect(scoredPair(before,after,vendor)).toMatchObject({before:{tasks:2,completed:1,clicks:50},after:{tasks:2,completed:1,clicks:45}});
});

it.each(['clicks','scrolls','keystrokes','klmDeciSec'] as const)('R2 refuses %s beyond the 2%% bounded tolerance, including zero and nonfinite baselines',key=>{
  const metrics={...task,tasks:1,completed:1};
  const tolerance=1.02;
  expect(boundedRefusals({before:metrics,after:{...metrics,[key]:metrics[key]*tolerance}})).toEqual([]);
  expect(boundedRefusals({before:metrics,after:{...metrics,[key]:metrics[key]*tolerance+0.001}})).not.toEqual([]);
  expect(boundedRefusals({before:{...metrics,[key]:0},after:{...metrics,[key]:1}})).not.toEqual([]);
  expect(boundedRefusals({before:metrics,after:{...metrics,[key]:NaN}})).not.toEqual([]);
  expect(boundedRefusals({before:metrics,after:{...metrics,completed:0}})).toContain('full bounded task completion required');
  expect(learnabilityOk(null)).toBe(false);
});

it('pools past odd holdouts, clones carried memory for every arm and never returns validation traces',async()=>{
  const ehr=createFakeEhr(),original=ehr.simulate;
  const calls:Parameters<typeof ehr.simulate>[0][]=[];
  const memory={actor:'P1',entries:[]};
  ehr.simulate=async i=>{
    calls.push(structuredClone(i));
    if(i.memory)i.memory.actor='mutated';
    const res=await original({...i,memory});
    return {...res,tasks:res.tasks.map(t=>({...t,scrollPx:100,mouseTravelPx:100}))};
  };
  const deps=testDeps(ehr);
  const schedules=await validationSchedules(4,async d=>fakeSchedule(d,'P1',7));
  expect(schedules.map(d=>d.day)).toEqual([1,3]);
  const replay=await makeHoldout(deps,persona,schedules,memory).validate(program,program,'v1',program);
  if(!replay)throw Error('Missing replay');
  expect(replay.days).toEqual([1,3]);
  expect(replay?.after.tasks).toBe(schedules.reduce((n,s)=>n+calibrationPartition(s,'validation').tasks.length,0));
  expect(replay?.bounded).toMatchObject({accepted:true,memorySource:'train-only',memorySha256:sha256(stableStringify(memory))});
  expect(memory.actor).toBe('P1');
  expect(calls.filter(c=>c.policy==='bounded').every(c=>c.memory?.actor==='P1')).toBe(true);
  for(const schedule of schedules) {
    const training=new Set(calibrationPartition(schedule,'train').tasks.map(t=>t.id));
    expect(calls.filter(c=>c.schedule.day===schedule.day).every(c=>c.schedule.tasks.every(t=>!training.has(t.id)))).toBe(true);
  }
  expect(replay).not.toHaveProperty('trace');
  expect(validationGross({...replay,days:[1,3],before:{...replay.before,clicks:10,scrolls:0},after:{...replay.after,clicks:1,scrolls:0}})).toBe(4.5);
  expect(()=>makeHoldout(deps,persona,fakeSchedule(2,'P1',7),memory)).toThrow('unique odd');
});

it('fails closed on missing bounded support or substituted tasks',async()=>{
  const ehr=createFakeEhr(),original=ehr.simulate;
  const deps=testDeps(ehr);
  ehr.simulate=async i=>{const res=await original(i);delete res.policy;delete res.memory;return res;};
  await expect(makeHoldout(deps,persona,fakeSchedule(1,'P1',7)).validate(program,program,'v1')).rejects.toThrow('Missing bounded');
  ehr.simulate=async i=>({...await original(i),tasks:[]});
  await expect(makeHoldout(deps,persona,fakeSchedule(1,'P1',7)).validate(program,program,'v1')).rejects.toThrow('omitted or substituted');
});

it('records failed train tasks and their unmet workflow and guard goals',()=>{
  const schedule={...fakeSchedule(1,'P1',7),tasks:[{...firstTask(),id:'a'}]};
  const result={...day,tasks:[{...task,completed:false}],complaints:['a: missing service order']};
  const evidence=summarizeTrain('P1',program,[{schedule,result}],new Map([[0,program]]));
  expect(evidence.failedTasks?.[0]).toMatchObject({task:'a',unmetGoals:expect.arrayContaining(['a: missing service order'])});

});

it('the release estimator uses the configured canonical penalty when the deployed arm fails',async()=>{
  const ehr=createFakeEhr();ehr.check=async()=> 'ok';
  ehr.simulate=async i=>({...day,programVersion:i.program.version,tasks:[{...task,
    completed:i.program.version!==1,clicks:i.program.version===1?1:i.program.version===2?15:20}]});
  const deps=testDeps(ehr);deps.incompletePenalty=0.75;
  const current={...program,version:1},candidate={...program,version:2};
  const schedule={day:1,persona:'P1',load:'fixture',tasks:[{...firstTask(),id:'a'}]};
  const input:NightInput={night:1,persona,current,release:{id:'v1',specVersion:'v1',spec:fakeSpec('v1'),canonical:program,notes:'',fake:true,leanSpecSource:null},
    train:[{schedule,result:day}],programs:new Map([[1,current]]),history:[],holdout:{day:null,async validate(){throw Error('unused');}}};
  const estimate=await new TrainEstimator(deps,input,'v1').estimate(candidate);
  expect(estimate).toMatchObject({before:{completed:0,clicks:35},after:{completed:1,clicks:15},saving:{clicks:20}});
});

it.each([['surface',{v2:2,v3:99}],['migration',{v2:99,v3:2}]] as const)('R2 blocks mandatory %s and canonical fallback when bounded replay is incomplete',async(_mode,releaseDays)=>{
  const ehr=markingEhr(),original=ehr.simulate;
  ehr.simulate=async i=>{const result=await original(i);return i.policy==='bounded'&&i.seed>=90_000_000&&i.program.version>0?
    {...result,tasks:result.tasks.map(t=>({...t,completed:false,klmDeciSec:t.klmDeciSec*2}))}:result;};
  const root=await tmp('r2-mandatory');
  await expect(runDays({ ...scriptedClimb,days:2,worldDir:await fakeWorld(2),personas:['P1'],runsRoot:root,runId:'mandatory',releaseDays,llm:new ScriptedLlm(),ehr})).rejects.toThrow('canonical fallback failed');
  expect((await new RunStore(path.join(root,'mandatory')).login('P1')).program.version).toBe(0);
});

it('carries only bounded practice across completed days and restores it without replay on resume',async()=>{
  const ehr=markingEhr(),original=ehr.simulate;
  const practices:{day:number;exposures:number}[]=[];
  ehr.simulate=async i=>{
    const result=await original(i);
    if(i.policy!=='bounded')return result;
    const exposures=i.memory?.entries[0]?.exposures??0;
    if(i.seed<90_000_000)practices.push({day:i.schedule.day,exposures});
    return {...result,memory:{actor:i.program.owner,entries:[{key:'practice',intent:'test',control:'test',
      place:{screen:'home',parent:'',tab:0,position:0},route:[],exposures:exposures+i.schedule.tasks.length,lastDay:i.schedule.day}]}};
  };
  const options={ ...scriptedClimb,structurePolicy:false as const,days:5,worldDir:await fakeWorld(5),personas:['P1'],runsRoot:await tmp('r2-memory'),
    runId:'memory',releaseDays:{v2:99,v3:99},llm:new ScriptedLlm(),ehr};
  await runDays(options);
  let exposures=0;
  expect(practices).toEqual([1,2,3,4].map(day=>{
    const previous=exposures;
    exposures+=fakeSchedule(day,'P1',7).tasks.length;
    return {day,exposures:previous};
  }));
  await runDays({ ...scriptedClimb,...options,resume:true});
  expect(practices).toHaveLength(4);
});
