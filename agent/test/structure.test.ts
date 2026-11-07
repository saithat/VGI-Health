import { runOfflineExploration } from '../src/offline-explore.js';
import { createScreenChecker } from '../src/screencheck.js';
import { describeProgram } from '../../explore/generator.js';
vi.mock('../src/manual.js',()=>({promptContext:()=>({manual:'manual',rules:'rules',manualHash:'m',ruleContextHash:'r',ruleProfile:'core'})}));
import path from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fakeCanonical, fakeSpec } from '../src/fake/fixtures.js';
import { FAKE_PERSONAS } from '../src/fake/world.js';
import { createFakeEhr } from '../src/fake/ehr-fake.js';
import { sumMetrics, type TrainDay } from '../src/observe.js';
import { rankHotspots } from '../src/hotspots.js';
import { localityDigest } from '../src/locality.js';
import { assertTrain, onlineQuality } from '../src/online-context.js';
import { compactProgram, structurePrompt } from '../src/structure-prompt.js';
import { structuralDistance, radicalChange } from '../../explore/structure.js';
import { defaultStructurePolicy, effectPass, scoreStructure } from '../src/structure-policy.js';
import { emptyRecord, type LoopDeps, type NightInput } from '../src/night.js';
import { RunStore } from '../src/store.js';
import { runNight } from '../src/night.js';
import { fakeSchedule } from '../src/fake/world.js';
import { calibrationPartition } from '../src/protocol.js';
import { LlmAgent } from '../src/agent.js';
import { RecordingLlm } from '../src/backends/recording.js';
import { ScriptedLlm } from './scripted.js';
import type { TrainEstimate, TraceEvent } from '../src/schema.js';

const program=fakeCanonical('v1'),spec=fakeSpec('v1');
const params=FAKE_PERSONAS.find(p=>p.id==='P1');
if(!params)throw Error('Missing fake persona');
const persona={id:'P1',userId:'P1',params};
const train:TrainDay={schedule:{day:1,persona:'P1',load:'normal',tasks:[]},result:{day:1,persona:'P1',programVersion:program.version,tasks:[],trace:[],floor:[],complaints:[]}};
const input:NightInput={night:2,persona,current:program,release:{id:'v1',specVersion:'v1',spec,canonical:program,notes:'',fake:true,leanSpecSource:null},train:[train],programs:new Map([[program.version,program]]),history:[],holdout:{day:1,async validate(){throw Error('Holdout must not be read');}}};
const before={...sumMetrics([]),tasks:10,completed:10,clicks:30,scrolls:5};
const estimate:TrainEstimate={days:[1],before,after:{...before,clicks:20},saving:{clicks:10,scrolls:0,keystrokes:0,klmDeciSec:0}};

it('rejects future, blind, mismatched and duplicate train days',()=>{
  expect(()=>assertTrain(input)).not.toThrow();
  for(const day of [2,3])expect(()=>assertTrain({...input,train:[{...train,schedule:{...train.schedule,day},result:{...train.result,day}}]})).toThrow();
  expect(()=>assertTrain({...input,train:[train,train]})).toThrow();
  expect(()=>assertTrain({...input,train:[{...train,result:{...train.result,persona:'P2'}}]})).toThrow();
});
it('projects only this run’s historical train estimates and refuses bad windows',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'structure-ledger-'));
  const deps:LoopDeps={runId:'own',store:new RunStore(dir),ehr:createFakeEhr(),screens:{mode:'fake',async check(){throw Error('unused');}},agent:{name:'scripted',model:'none',async proposeCandidates(){throw Error('unused');},async chooseCandidates(){throw Error('unused');}},seedPolicy:'none',seedState:{injected:0,rejected:new Set()},worldDir:dir,worldSeed:1};
  const record=emptyRecord(deps,{...input,night:1,specVersion:'v1',spec},{persona:'P1',trainDays:[1],programVersion:program.version,totals:sumMetrics([]),perDay:[],pctAboveFloor:null,byWorkflow:[],timeSinksByScreen:[],redundantPrompts:[],unusedReceipts:[],buriedSearches:[],alertOverrides:[],totalOverrides:0,backtracks:[],complaints:[],orderMix:[]});
  record.candidates=[{candidate:{id:'prior',summary:'train',moveType:'reorder',rationale:'',targets:[],patch:[],predicted:estimate.saving,source:'llm',seeded:false,seededKind:null},check:{status:'pass',property:null,message:null,counterexample:null,screens:null,verdict:'ok'},trainEstimate:estimate,componentsMoved:0}];
  record.validation.reason='HOLDOUT_SECRET';
  await deps.store.writeDecision(record);
  const context=await onlineQuality(deps,input);
  expect(context.ledger[0]?.trainDaySaving?.clicks).toBe(10);
  expect(JSON.stringify(context)).not.toContain('HOLDOUT_SECRET');
  const entry=record.candidates[0];if(!entry)throw Error('Missing candidate');entry.trainEstimate={...estimate,days:[2]};
  await deps.store.writeDecision(record);
  await expect(onlineQuality(deps,input)).rejects.toThrow('window');
  record.owner='another-owner';await deps.store.writeDecision(record);
  await expect(onlineQuality(deps,input)).rejects.toThrow('Foreign');
});
it('distinguishes structural moves from density, labels and version metadata',()=>{
  const style=structuredClone(program);style.version++;for(const s of style.screens)for(const c of s.components)c.size='compact';
  expect(structuralDistance(program,style)).toBe(0);expect(radicalChange(program,style)).toBe(false);
  const changed=structuredClone(program),first=changed.screens[0]?.components[0];
  if(!first)throw Error('fixture empty');first.tab++;
  expect(radicalChange(program,changed)).toBe(true);expect(structuralDistance(program,changed)).toBeGreaterThan(0);
});
it('keeps all component fields in the compact projection',()=>{
  const text=compactProgram(program),encoded=text.slice(text.indexOf('\n')+1),p=JSON.parse(encoded);
  const keys=['id','kind','label','parent','tab','visibility','size','hotkey','tag','copyOf'];
  for(const s of p.screens) s.components=s.components.map((row:unknown[])=>Object.fromEntries([...keys.flatMap((k,i)=>row[i]===null?[]:[[k,row[i]]]),...Object.entries(row[10]??{})]));
  expect(p).toEqual(program);
  expect(text.length).toBeLessThan(JSON.stringify(program).length);
});
it('gates on complete positive net effect; novelty cannot pay the floor',async()=>{
  expect(defaultStructurePolicy().minimumEffect).toBe(5);
  expect(effectPass(estimate,4.99,5)).toBe(false);expect(effectPass(estimate,5,5)).toBe(true);
  expect(effectPass({...estimate,after:{...estimate.after,completed:9}},100,5)).toBe(false);
  expect(effectPass(estimate,0,0)).toBe(false);
  const score=await scoreStructure(program,program,estimate,{clinician:'P1',department:'test',role:program.role,train:[train]},[],()=>({cost:8,model:'test',assumption:'test'}));
  expect(score.net).toBe(2);expect(effectPass(estimate,score.net,5)).toBe(false);
});
it('requests named small, medium and radical hypotheses without tools',()=>{
  const parts=structurePrompt({system:'s',prompt:'p'},program,[{id:'screen:s',kind:'screen',screens:['s'],score:10,evidence:{clicks:10,scrolls:0,scrollPx:0,occurrences:1,lookupDetours:0,memoryCarry:0}}],5);
  expect(parts.portfolio).toBe(true);expect(parts.queryBundle).toBeUndefined();expect(parts.prompt).toContain('one radical');expect(parts.prompt).toContain('screen:s');
});
it('ranks repeated navigation/backtracks deterministically and rejects foreign information evidence',()=>{
  const trace:TraceEvent[]=['a','b','a','b','a'].map((screen,t)=>({task:'task',screen,t,event:{click:{comp:'nav'}},ops:['click'],result:'ok' as const}));
  const day:TrainDay={...train,result:{...train.result,tasks:[{task:'task',clicks:5,keystrokes:0,scrolls:0,popups:0,overrides:0,searches:0,backtracks:2,klmDeciSec:0,completed:true}],trace}};
  const rows=rankHotspots([day],localityDigest([]));
  expect(rows.some(r=>r.kind==='backtrack')).toBe(true);expect(rankHotspots([day],localityDigest([]))).toEqual(rows);
  expect(()=>rankHotspots([day],localityDigest([]),[{day:2,task:'task',screen:'a',lookupDetours:1,memoryCarry:1}])).toThrow();
});

it('production evaluates the portfolio, selects net effort deterministically and records rejection gauge',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'structure-night-')),fake=createFakeEhr();
  const ehr={...fake,async simulate(args:Parameters<typeof fake.simulate>[0]){const r=await fake.simulate(args);return {...r,tasks:r.tasks.map(t=>({...t,scrollPx:t.scrolls*100,mouseTravelPx:t.clicks*100}))};}};
  const schedule=calibrationPartition(fakeSchedule(1,'P1',7),'train');
  const result=await ehr.simulate({program,specVersion:'v1',persona:persona.params,schedule,worldDir:dir,seed:1001});
  const script=new ScriptedLlm(),backend={name:'scripted' as const,model:'portfolio-test',async complete(req:Parameters<typeof script.complete>[0]) {
    if(req.purpose==='choose')throw Error('Production must choose without a model call');
    const r=await script.complete(req);
    const body=JSON.parse(JSON.stringify(r.json));
    const hotspot=JSON.parse(req.prompt.split('## Ranked effort hotspots (deterministic, train only)\n')[1]?.split('\n')[0]??'[]')[0]?.id;
    body.candidates=body.candidates.map((c:Record<string,unknown>,i:number)=>({...c,portfolio:{scale:['radical','medium','small'][i],hotspotId:hotspot}}));
    return {...r,json:body};
  }};
  const deps:LoopDeps={runId:'portfolio',store:new RunStore(dir),ehr,screens:{mode:'fake',async check(){throw Error('offline');}},agent:new LlmAgent(new RecordingLlm(backend,dir)),seedPolicy:'none',seedState:{injected:0,rejected:new Set()},worldDir:dir,worldSeed:1};
  const train=[{schedule,result}];
  const holdout={day:1,async validate(before:typeof program,after:typeof program) {
    const s=calibrationPartition(fakeSchedule(1,'P1',7),'validation');
    const args={specVersion:'v1',persona:persona.params,schedule:s,worldDir:dir,seed:1001};
    const {replayDay}=await import('../src/night.js');
    return replayDay(1,'normal',await ehr.simulate({...args,program:before}),await ehr.simulate({...args,program:after}));
  }};
  const night=await runNight(deps,{...input,night:1,train,holdout},{offline:true,structure:{minimumEffect:1,noveltyWeight:1000,topK:8}});
  expect(night.record.exploration?.checker.proposed).toBe(3);
  expect(night.record.exploration?.checker.checkerRejected).toBe(1);
  expect(night.record.chosen?.candidateIds).toEqual(['p1-macro']);
  expect(night.record.llmCalls).toHaveLength(1);
  expect(night.record.validation.accepted).toBe(true);
  expect(night.record.deployed).toBeNull();
  const native=vi.spyOn(ehr,'simulate');
  const offline=await runOfflineExploration({...deps,screens:createScreenChecker(fake)},{...input,night:1,train,holdout},{out:dir,iterations:1,
    operators:[{id:'fixture',enumerate:()=>[describeProgram(program,['W1','W7'])]}]});
  expect(offline.programs).toHaveLength(1);
  expect(native).toHaveBeenCalled();
  for(const [args] of native.mock.calls) {expect(args.policy).toBe('expert');expect(args.persona.policy).toBe('expert');expect(args.memory).toBeUndefined();}
  const unsafe=structuredClone(program),screen=unsafe.screens[0];
  if(!screen)throw Error('Missing screen');screen.components=screen.components.filter(c=>c.kind!=='banner');
  const cadence=await runNight({...deps,screens:createScreenChecker(fake)},{...input,night:1,train,holdout},{cadence:{
    department:'test',generatorOnly:true,structure:{minimumEffect:1000000,noveltyWeight:0.25,topK:8},offlineArchive:[unsafe],
  }});
  expect(cadence.record.candidates.find(c=>c.candidate.id.startsWith('offline-'))?.check.status).toBe('fail');
  expect(cadence.record.exploration?.checker.rejected).toBeGreaterThan(0);
  expect(cadence.record.cadence?.offers).toEqual([]);
  expect(cadence.record.deployed).toBeNull();
});
