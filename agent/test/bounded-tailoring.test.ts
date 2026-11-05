import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { boundedRelearning, boundedSessionChooser, boundedSwitchCost, IncompleteBoundedReplay } from '../src/bounded-tailoring.js';
import { createFakeEhr } from '../src/fake/ehr-fake.js';
import { fakeCanonical } from '../src/fake/fixtures.js';
import { FAKE_PERSONAS, fakeSchedule } from '../src/fake/world.js';
import { answerSession, prepareSession, type ArchivedSessionBundle } from '../src/session.js';
import { pastSessions, sessionReviewGate, tailoringFeedback } from '../src/session-gate.js';
import { CADENCE_PROTOCOL, type ReviewRequest } from '../src/cadence.js';
import { createEhr, DEFAULT_EHR_BIN, type EhrClient } from '../src/ehr.js';
import { programSchema, dayScheduleSchema, personaParamsSchema, type UserMemory, type ScreenCheckResult } from '../src/schema.js';
import { REPO_ROOT } from '../src/util.js';
import { sessionSchema } from '../src/session-schema.js';
import { nightlyPrompt } from '../src/prompts.js';
import { summarizeTrain } from '../src/observe.js';
import { generatorOnlyBackend } from '../src/generator-only.js';
import { CadenceFakeLlm } from '../src/fake/cadence.js';
import { runDays } from '../src/run.js';
import { writeFakeWorld } from '../src/fake/world.js';
import { immutableScreenChecks } from '../src/offline-screen-cache.js';
import type { ScreenChecker } from '../src/screencheck.js';

const persona=(()=>{const p=FAKE_PERSONAS[0];if(!p)throw Error('persona');return p;})();
const current=fakeCanonical('v1');
const memory:UserMemory={actor:current.owner,entries:[{key:'dose',intent:'field:dose',control:'dose',place:{screen:'orders',parent:'',tab:0,position:0},route:[],exposures:1,lastDay:1}]};
function boundedFake():EhrClient {
  const fake=createFakeEhr();
  return {...fake,async simulate(i){
    const expert=await fake.simulate(i);
    const exposures=i.memory?.entries[0]?.exposures??0;
    const penalty=Math.max(0,(i.program.version?10:2)-exposures);
    const next=structuredClone(memory);next.actor=i.program.owner;const entry=next.entries[0];if(entry)entry.exposures=exposures+1;
    return {...expert,policy:'bounded',memory:next,expert,tasks:expert.tasks.map((t,n)=>({...t,clicks:t.clicks+(n===0?penalty:0),klmDeciSec:t.klmDeciSec+(n===0?penalty*10:0)}))};
  }};
}
async function setup() {
  const ehr=boundedFake();
  const candidates:ArchivedSessionBundle[]=[];
  for(let n=0;n<3;n++) {
    const program=structuredClone(current);program.version=n+1;
    const screen=program.screens[n];if(!screen)throw Error('screen');screen.components.reverse();
    const cert=await ehr.deploy({program,prev:current,canonical:current,specVersion:'v1',outDir:''});
    if(!cert.deployed)throw Error('cert');
    candidates.push({id:`option-${n}`,label:`Option ${n}`,program,certificate:cert.certificate});
  }
  const schedule=fakeSchedule(1,persona.id,7);
  const result=await ehr.simulate({specVersion:'v1',program:current,persona,schedule,worldDir:'',seed:7,memory});
  const input={id:'bounded-session',createdAt:'2026-11-03T00:00:00Z',phase:'offShift' as const,cadence:'weekly' as const,
    asOfDay:1,current,canonical:current,persona,recentDays:[schedule],worldDir:'',seed:7,archive:{candidates:async()=>candidates},ehr,bounded:{memory}};
  return {ehr,candidates,input,train:[{schedule,result}]};
}

describe('bounded tailoring seams',()=>{
  it('reuses only exact immutable screen inputs, isolates results, and retries infrastructure errors',async()=>{
    const result:ScreenCheckResult={status:'pass',mode:'real',bundles:[],pages:1,failingScreens:[],failingFiles:[],message:'checked'};
    const check=vi.fn(async()=>structuredClone(result));
    const geometry=vi.fn(async()=>null);
    const inner:ScreenChecker={mode:'real',check,geometry};
    const screens=immutableScreenChecks(inner),input={specVersion:'v1',program:current};
    const a=await screens.check(input);a.failingScreens.push('mutated');
    expect((await screens.check(structuredClone(input))).failingScreens).toEqual([]);
    expect(check).toHaveBeenCalledTimes(1);
    await screens.check({...input,program:{...current,version:current.version+1}});
    await screens.check({...input,schedule:fakeSchedule(1,persona.id,7),worldDir:'world'});
    expect(check).toHaveBeenCalledTimes(3);
    await screens.geometry?.(input);expect(geometry).toHaveBeenCalledOnce();
    const transient=immutableScreenChecks(inner);result.status='error';
    await transient.check(input);result.status='pass';await transient.check(input);
    expect(check).toHaveBeenCalledTimes(5);
    const failed=immutableScreenChecks(inner);result.status='fail';
    expect((await failed.check(input)).status).toBe('fail');
    expect((await failed.check(input)).status).toBe('fail');
    expect(check).toHaveBeenCalledTimes(6);
    const rejected=immutableScreenChecks(inner);result.status='pass';
    check.mockRejectedValueOnce(new Error('transport'));
    await expect(rejected.check(input)).rejects.toThrow('transport');
    expect((await rejected.check(input)).status).toBe('pass');
    expect(check).toHaveBeenCalledTimes(8);
  });
  it('uses cloned carried memory and matched paired seeds; reports signed seconds/actions and expert costs',async()=>{
    const {ehr,input}=await setup();const simulate=vi.spyOn(ehr,'simulate');
    const before=structuredClone(memory);const after=structuredClone(current);after.version++;
    const estimate=await boundedRelearning(ehr)({before:current,after,persona,schedules:input.recentDays,memory,worldDir:'',seed:7});
    expect(memory).toEqual(before);
    expect(estimate?.estimate).toMatchObject({k:1,warmBlocks:3,incremental:{seconds:3,actions:3},beforeExcess:{actions:1},afterExcess:{actions:4}});
    expect(estimate?.estimate.expertBefore).toEqual(estimate?.estimate.expertAfter);
    expect(simulate).toHaveBeenCalledTimes(10);
    expect(simulate.mock.calls.every(([i])=>i.policy==='bounded'&&i.seed===8)).toBe(true);
    const negative=await boundedRelearning(ehr)({before:after,after:current,persona,schedules:input.recentDays,memory,worldDir:'',seed:7});
    expect(negative?.estimate.incremental.actions).toBe(-3);
  });
  it('measures positive native relearning after an ordinal move from practiced memory',async()=>{
    const ehr=createEhr({fake:false});
    const worldDir=path.join(REPO_ROOT,'runs/world/2');
    const before=programSchema.parse(JSON.parse(await readFile(path.join(REPO_ROOT,'releases/v1/personas/P1.json'),'utf8')));
    const params=personaParamsSchema.parse(JSON.parse(await readFile(path.join(worldDir,'personas/P1.json'),'utf8')));
    const source=dayScheduleSchema.parse(JSON.parse(await readFile(path.join(worldDir,'schedules/day-01/P1.json'),'utf8')));
    const task=source.tasks.find(t=>t.workflow==='W1'&&t.choices.orders.length>0);if(!task)throw Error('W1 task with an order');
    const schedule={...source,tasks:[task]};
    let practiced:UserMemory|undefined;
    let result;
    for(let n=0;n<4;n++){
      result=await ehr.simulate({specVersion:'v1',program:before,persona:params,schedule,worldDir,seed:1001,policy:'bounded',...(practiced?{memory:practiced}:{})});
      practiced=result.memory;
    }
    if(!result||!practiced)throw Error('Native carried memory missing');
    const after=structuredClone(before);after.version++;
    const screen=after.screens.find(s=>s.components.some(c=>c.tag==='w1Orders.dose'));if(!screen)throw Error('Dose screen');
    const index=screen.components.findIndex(c=>c.tag==='w1Orders.dose');
    const [dose]=screen.components.splice(index,1);if(!dose)throw Error('Dose');screen.components.splice(index+12,0,dose);
    expect(await ehr.check({specVersion:'v1',program:after,prev:before,canonical:before})).toBe('ok');
    const cost=await boundedSwitchCost(ehr,params,worldDir,1000)(before,after,{clinician:params.id,department:'test',role:before.role,train:[{result,schedule}]});
    expect(cost.model).toBe('bounded-matched-relearning-v1');
    expect(cost.relearning?.incremental.actions).toBeGreaterThan(0);
    expect(cost.relearning?.incremental.seconds).toBeGreaterThan(0);
  });
  it('uses bounded cost in cadence and labels missing-backend fallback; incomplete evidence fails closed',async()=>{
    const {ehr,train}=await setup();const next={...current,version:1};
    const context={clinician:persona.id,department:'test',role:current.role,train};
    const estimate=await boundedSwitchCost(ehr,persona,'',7)(current,next,context);
    expect(estimate.model).toBe('bounded-matched-relearning-v1');
    expect(estimate.relearning?.incremental.actions).toBeGreaterThan(0);
    const fallback=await boundedSwitchCost(createFakeEhr(),persona,'',7)(current,next,context);
    expect(fallback.model).toBe('usage-weighted-movement-v1');expect(fallback.assumption).toContain('fallback');
    const original=ehr.simulate;ehr.simulate=async i=>{const d=await original(i);return {...d,tasks:d.tasks.map(t=>({...t,completed:false}))};};
    await expect(boundedSwitchCost(ehr,persona,'',7)(current,next,context)).rejects.toBeInstanceOf(IncompleteBoundedReplay);
    ehr.simulate=async i=>{const d=await original(i);return {...d,programVersion:d.programVersion+1};};
    await expect(boundedSwitchCost(ehr,persona,'',7)(current,next,context)).rejects.toThrow('identity');
  });
  it('records bounded replay beside expert floor and uses the native choice function privately',async()=>{
    const {input}=await setup();const session=await prepareSession(input);
    expect(session.options[0]?.evidence.relearning.bounded?.expertAfter.seconds).toBeGreaterThan(0);
    const {bounded: _bounded,...legacy}=input;
    void _bounded;
    expect((await prepareSession(legacy)).options[0]?.evidence.relearning.model).toBe('heuristic-v1: 0.5 min/move + 0.25 min/other change');
    expect((await prepareSession({...input,bounded:{}})).options[0]?.evidence.relearning.model).toContain('fallback: bounded evidence unavailable');
    expect(sessionSchema.parse(session).options[0]?.evidence.relearning.model).toBe('bounded-matched-relearning-v1');
    const first=session.options[0];if(!first)throw Error('option');
    // A known stable-tag placement improvement, independent of cost evidence.
    const a=current.screens[0]?.components[0],b=current.screens[0]?.components.at(-1);if(!a||!b)throw Error('components');
    const privateParams={...persona,hiddenPreferences:{placements:[{tag:a.tag||a.id,nearTag:b.tag||b.id,weight:100000}],changeSensitivity:0}};
    const altered=structuredClone(session);const screen=altered.options[0]?.program.screens[0];if(!screen)throw Error('screen');
    const idx=screen.components.findIndex(c=>c.id===b.id);const [moved]=screen.components.splice(idx,1);if(!moved)throw Error('target');screen.components.splice(1,0,moved);
    const chosen=await answerSession(altered,boundedSessionChooser(DEFAULT_EHR_BIN,privateParams,7));
    expect(chosen.choice?.chosen).toBe(first.id);
    expect(JSON.stringify(chosen)).not.toContain('hiddenPreferences');
    const averse={...privateParams,hiddenPreferences:{...privateParams.hiddenPreferences,changeSensitivity:1000000000}};
    expect((await answerSession(altered,boundedSessionChooser(DEFAULT_EHR_BIN,averse,7))).choice?.chosen).toBeNull();
  });
  it('runs a session as a gate, persists comparisons, and filters next-night feedback to past train tasks',async()=>{
    const {ehr,candidates,train}=await setup();const root=path.join(await mkdtemp(path.join(tmpdir(),'bounded-gate-')),'runs');
    const deploy=ehr.deploy;let issued=0;
    ehr.deploy=async i=>{const result=await deploy(i);return result.deployed ? {...result,certificate:{...result.certificate,time:new Date(1700000000000+issued++*1000).toISOString()}} : result;};
    const trainEstimate={days:[1],before:summarizeTrain(persona.id,current,train,new Map()).totals,after:summarizeTrain(persona.id,current,train,new Map()).totals,saving:{clicks:1,scrolls:0,keystrokes:0,klmDeciSec:0,mouseTravelPx:null,scrollPx:null}};
    const bundles=candidates.map(c=>({id:c.id,candidateIds:[c.id],program:c.program,evidence:{train:trainEstimate,switchCost:{cost:0,model:'test',assumption:'test'},score:1,moved:0,leanVerdict:'ok' as const,screen:{status:'pass' as const,mode:'fake' as const,bundles:[],pages:1,failingScreens:[],failingFiles:[],message:'test'},niche:c.id}}));
    const [a,b,c]=bundles;if(!a||!b||!c)throw Error('bundles');
    const request:ReviewRequest={protocol:CADENCE_PROTOCOL,night:1,clinician:persona.id,department:'test',role:current.role,bundles:[a,b,c],sessionContext:{current,canonical:current,train,worldDir:'',seed:7}};
    const task=train[0]?.schedule.tasks[0];if(!task)throw Error('task');
    const flag={kind:'friction' as const,id:'train-flag',clinician:current.owner,programHash:'test-hash',day:1,task:task.id,t:0,screen:'orders',signal:{kind:'slowHere' as const}};
    const gate=sessionReviewGate({ehr,persona,runsRoot:root,flags:[flag,{...flag,id:'foreign',clinician:'other'},{...flag,id:'heldout',task:'heldout'}],chooser:()=>({chosen:b.id,reason:'Prefer this location.',reasons:[]})});
    expect((await gate.review(request)).chosenBundle).toBe(b.id);
    const saved=(await pastSessions(root,2))[0];if(!saved)throw Error('Missing saved session');
    const savedFile=path.join(root,'sessions',`${saved.id}.json`),bytes=await readFile(savedFile,'utf8');
    expect((await tailoringFeedback(root,1,current.owner,train)).comparisons).toHaveLength(0);
    const feedback=await tailoringFeedback(root,2,current.owner,train);
    expect(feedback.comparisons).toHaveLength(3);
    expect(feedback.friction.map(f=>f.id)).toEqual(['train-flag']);
    expect((await tailoringFeedback(root,2,current.owner,[])).comparisons).toHaveLength(0);
    expect((await gate.review({...request,bundles:[a]})).chosenBundle).toBeNull();
    // Native certificates get a fresh issuance time; a retry must preserve the original bytes.
    expect((await gate.review(request)).chosenBundle).toBe(b.id);
    expect(await readFile(savedFile,'utf8')).toBe(bytes);
    const changed=sessionReviewGate({ehr,persona,runsRoot:root,flags:[flag],chooser:()=>({chosen:b.id,reason:'A different answer.',reasons:[]})});
    await expect(changed.review(request)).rejects.toThrow('Session retry differs from recorded session');
    const issue=ehr.deploy;
    ehr.deploy=async i=>{const result=await issue(i);return result.deployed ? {...result,certificate:{...result.certificate,checkerVersion:'fake-updated-checker'}} : result;};
    await expect(gate.review(request)).rejects.toThrow('Session retry differs from recorded session');
    expect(await readFile(savedFile,'utf8')).toBe(bytes);
    const simulate=ehr.simulate;
    ehr.simulate=async i=>{const d=await simulate(i);return {...d,tasks:d.tasks.map(t=>({...t,completed:false}))};};
    const unavailable=await gate.review({...request,night:3});
    expect(unavailable.chosenBundle).toBeNull();expect(unavailable.reason).toContain('Incomplete');
    expect(await pastSessions(root,4)).toHaveLength(1);
  });
  it('archives incomplete switch evidence as ineligible instead of aborting the next clinical day',async()=>{
    const dir=await mkdtemp(path.join(tmpdir(),'incomplete-switch-'));
    const world=await writeFakeWorld(path.join(dir,'world'),{days:2,seed:7,personas:['P1']});
    const summary=await runDays({days:2,worldDir:world,runsRoot:dir,runId:'unavailable',llm:new CadenceFakeLlm(),ehr:createFakeEhr(),
      protocol:CADENCE_PROTOCOL,seedPolicy:'none',releaseDays:{v2:30,v3:31},switchCostModel:'incomplete-test',
      switchCost:async()=>{throw new IncompleteBoundedReplay('Practice reference incomplete');}});
    expect(summary.timelines[0]?.nights[0]?.outcome).toBe('archived');
    const {DesignArchiveStore}=await import('../src/design-archive.js');
    const archive=new DesignArchiveStore(path.join(summary.dir,'archives'),{clinician:persona.id,owner:'user-p1',department:'unspecified',role:persona.role});
    const snapshot=await archive.before(2,'fake');
    expect(snapshot.entries.some(e=>e.observations.at(-1)?.switchCostError==='Practice reference incomplete')).toBe(true);
    expect(Object.keys(snapshot.cells)).toHaveLength(0);
    expect(JSON.parse(await readFile(path.join(summary.dir,'manifest.json'),'utf8')).status).toBe('completed');
  });
  it('generator-only mode makes zero model calls and legacy manifests retain their defaults',async()=>{
    const dir=await mkdtemp(path.join(tmpdir(),'generator-only-'));const world=await writeFakeWorld(path.join(dir,'world'),{days:2,seed:7,personas:['P1']});
    const complete=vi.spyOn(generatorOnlyBackend,'complete');
    const summary=await runDays({days:2,worldDir:world,runsRoot:dir,runId:'offline',llm:generatorOnlyBackend,ehr:createFakeEhr(),protocol:CADENCE_PROTOCOL,generatorOnly:true,seedPolicy:'none',releaseDays:{v2:20,v3:21}});
    expect(complete).not.toHaveBeenCalled();expect(summary.llmErrors).toHaveLength(0);
    const manifest=JSON.parse(await readFile(path.join(summary.dir,'manifest.json'),'utf8'));expect(manifest.releasePolicy.discovery).toBe('admitted-generator-only-v1');
    await expect(runDays({days:2,worldDir:world,llm:generatorOnlyBackend,generatorOnly:true})).rejects.toThrow('Archive options require');
  });
  it('feeds answered sessions to the next cadence proposal and ships a chosen whole bundle through existing validation',async()=>{
    const dir=await mkdtemp(path.join(tmpdir(),'session-cadence-'));
    const world=await writeFakeWorld(path.join(dir,'world'),{days:9,seed:7,personas:['P1']});
    const fake=createFakeEhr();const ehr={...fake,async simulate(i:Parameters<EhrClient['simulate']>[0]){const d=await fake.simulate(i);return {...d,tasks:d.tasks.map(t=>({...t,mouseTravelPx:t.clicks*100,scrollPx:t.scrolls*100}))};}};
    const llm=new CadenceFakeLlm();
    const root=path.join(dir,'connected','runs');
    const gate=sessionReviewGate({ehr,persona,runsRoot:root,chooser:s=>({chosen:[...s.options].sort((a,b)=>(b.evidence.savings.clicks+b.evidence.savings.scrolls)-(a.evidence.savings.clicks+a.evidence.savings.scrolls))[0]?.id??null,reason:'Prefer the first diverse bundle.',reasons:[]})});
    const summary=await runDays({days:9,worldDir:world,runsRoot:dir,runId:'connected',llm,ehr,protocol:CADENCE_PROTOCOL,
      cadence:{kind:'weekly'},tailoringSessions:true,reviewGate:gate,seedPolicy:'none',releaseDays:{v2:30,v3:31}});
    expect(summary.timelines[0]?.nights.find(n=>n.night===7)?.outcome).toBe('deployed');
    const proposal=llm.prompts.find(p=>p.callId.includes('night-08'));
    expect(proposal?.prompt).toContain('Prefer the first diverse bundle.');
    expect(proposal?.prompt).toContain('preferredProgramHash');
  });
  it('bounds generator-only discovery without stopping archive rescoring or release slots',async()=>{
    const dir=await mkdtemp(path.join(tmpdir(),'discovery-budget-'));
    const world=await writeFakeWorld(path.join(dir,'world'),{days:5,seed:7,personas:['P1']});
    const summary=await runDays({days:5,worldDir:world,runsRoot:dir,runId:'budget',llm:generatorOnlyBackend,ehr:createFakeEhr(),protocol:CADENCE_PROTOCOL,
      generatorOnly:true,discoveryNights:2,cadence:{kind:'weekly'},seedPolicy:'none',releaseDays:{v2:30,v3:31}});
    const {DesignArchiveStore}=await import('../src/design-archive.js');
    const archive=new DesignArchiveStore(path.join(summary.dir,'archives'),{clinician:persona.id,owner:'user-p1',department:'unspecified',role:persona.role});
    const early=await archive.before(3,'fake'),late=await archive.before(5,'fake');
    expect(early.entries.length).toBeGreaterThan(0);expect(late.entries.length).toBe(early.entries.length);
    expect(late.entries.every(e=>e.night<=2 && e.observations.at(-1)?.night===4)).toBe(true);
  });
  it('never puts hidden preferences or change tolerance in the designer prompt',async()=>{
    const {train}=await setup();const fake=createFakeEhr();const spec=await fake.specExport('v1');
    const params={...persona,hiddenPreferences:{placements:[{tag:'secret-taste',nearTag:'secret-near',weight:99}],changeSensitivity:87654321}};
    const prompt=nightlyPrompt({night:1,persona:{id:persona.id,userId:current.owner,params},program:current,spec,evidence:summarizeTrain(persona.id,current,train,new Map()),history:[]});
    expect(prompt.prompt).not.toContain('secret-taste');expect(prompt.prompt).not.toContain('87654321');
  });
});
