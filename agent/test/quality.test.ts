import { compareSanityRecords } from '../src/quality-compare.js';
vi.mock('../src/manual.js',()=>({promptContext:()=>({manual:'fixture manual',rules:'fixture rules',manualHash:'manual',ruleContextHash:'rules',ruleProfile:'core'})}));
import path from 'node:path';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pointerTravel, type GeometryAtlas } from '../../app/src/metrics/geometry.js';
import { attributeDay, localityDigest } from '../src/locality.js';
import { attachGeometry, geometryProgramHash, geometryComponentsHash } from '../src/geometry.js';
import { loadMeasuredSavings, recomputedSavings } from '../src/quality-ledger.js';
import { measuredLedger, withQuality, type QualityContext } from '../src/quality-context.js';
import { withQueries } from '../src/quality-queries.js';
import { nightlyPrompt, choosePrompt, repairPrompt } from '../src/prompts.js';
import { archivedSpecEhr, candidateDiffs, freshOutput, frozenLocality, frozenNight, meteredLlm, selectDecisions, evaluateQuality } from '../src/quality.js';
import { OFFLINE_LABEL, pairedComparison, qualityReport, repetitionCount, type OfflineRecord } from '../src/quality-report.js';
import { FAKE_PERSONAS, writeFakeWorld } from '../src/fake/world.js';
import { createFakeEhr } from '../src/fake/ehr-fake.js';
import { fakeCanonical, fakeSpec } from '../src/fake/fixtures.js';
import { emptyRecord, runNight, type LoopDeps } from '../src/night.js';
import { LlmAgent } from '../src/agent.js';
import type { JsonLlm } from '../src/backends/types.js';
import { RecordingLlm } from '../src/backends/recording.js';
import { ScriptedLlm } from './scripted.js';
import { RunStore } from '../src/store.js';
import { sumMetrics } from '../src/observe.js';
import { writeJson } from '../src/util.js';
import { loadWorld } from '../src/world.js';
import { calibrationPartition } from '../src/protocol.js';
import { summarizeTrain } from '../src/observe.js';
import type { DayResult, DecisionRecord, TraceEvent } from '../src/schema.js';

const program=fakeCanonical('v1'),spec=fakeSpec('v1');
const persona={id:'P1',userId:'P1',params:FAKE_PERSONAS.find(p=>p.id==='P1')??{id:'P1',role:'physician',keyboardShare:80,reviewsAllergiesEarly:true,scansSidebar:true,backtrackRate:60,searchWhenBuried:true,overrideRate:700}};
const atlas:GeometryAtlas={schemaVersion:1,programHash:'p',appSha256:'a',viewport:{width:1440,height:900},source:'recorded-fixture',aliases:{allergy:['a']},states:[{
  screen:'s',state:'s',viewport:{width:1440,height:900},components:{
    a:{center:{x:50,y:200},reveal:{x:50,y:200},chain:['root'],offsets:{root:{x:0,y:0}}},
    b:{center:{x:50,y:1800},reveal:{x:50,y:200},chain:['root'],offsets:{root:{x:0,y:1600}}},
    past:{center:{x:100,y:1000},reveal:{x:100,y:200},chain:['root'],offsets:{root:{x:0,y:800}}},
  },scrollers:{root:{maxX:0,maxY:2500,width:1440,height:800}},
}]};
function day(trace:TraceEvent[], clicks:number, keystrokes:number):DayResult {
  return attachGeometry({day:1,persona:'P1',programVersion:0,tasks:[{
    task:'t',clicks,keystrokes,scrolls:0,popups:0,overrides:0,searches:0,backtracks:0,klmDeciSec:0,completed:true,
  }],trace,floor:[],complaints:[]},atlas);
}
const trace:TraceEvent[]=[
  {task:'t',t:0,screen:'s',event:{click:{comp:'a'}},ops:['point','click'],result:'ok'},
  {task:'t',t:1,screen:'s',event:{scroll:{screen:'s'}},ops:['scroll'],result:'ok'},
  {task:'t',t:2,screen:'s',event:{enter:{comp:'b',value:{text:{s:'😀abc'}}}},ops:['point','click'],result:'ok'},
  {task:'t',t:3,screen:'s',event:{ack:{alert:'allergy'}},ops:['point','click'],result:'ok'},
];
function record(deps:LoopDeps):DecisionRecord {
  return emptyRecord(deps,{night:1,persona,specVersion:'v1',current:program,spec},{persona:'P1',trainDays:[1],programVersion:0,totals:sumMetrics([]),perDay:[],pctAboveFloor:null,byWorkflow:[],timeSinksByScreen:[],redundantPrompts:[],unusedReceipts:[],buriedSearches:[],alertOverrides:[],totalOverrides:0,backtracks:[],complaints:[],orderMix:[]});
}
let deps:LoopDeps;
beforeAll(async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'quality-test-'));
  deps={runId:'test',store:new RunStore(dir),ehr:createFakeEhr(),screens:{mode:'fake',async check(){throw new Error('screen check must not run');}},agent:new LlmAgent(new RecordingLlm(new ScriptedLlm(),dir)),seedPolicy:'none',seedState:{injected:0,rejected:new Set()},worldDir:dir,worldSeed:1};
});

describe('physical locality conservation',()=>{
  it('matches per-task pointer costs and native activations, includes aliases and reveal scrolls',()=>{
    const input=day(trace,3,4),rows=attributeDay(input,atlas),cost=pointerTravel(trace,atlas,1).t;
    for(const key of ['scrolls','scrollPx','mouseTravelPx'] as const)expect(rows.reduce((n,r)=>n+(r[key]??0),0)).toBeCloseTo(cost?.[key]??0,8);
    expect(rows.reduce((n,r)=>n+r.clicks,0)).toBe(3);expect(rows.reduce((n,r)=>n+r.keystrokes,0)).toBe(4);
    expect(rows.some(r=>r.component==='b'&&r.scrollPast.includes('past'))).toBe(true);
    const digest=localityDigest([{result:input,atlas}],1);
    for(const key of ['clicks','keystrokes','scrolls','scrollPx','mouseTravelPx'] as const) {
      expect((digest.components[0]?.[key]??0)+(digest.otherComponents[key]??0)).toBeCloseTo(digest.totals[key]??0,8);
      expect(digest.screens.reduce((n,r)=>n+(r[key]??0),0)).toBeCloseTo(digest.totals[key]??0,8);
    }
  });
  it('preserves missing geometry as null and refuses mismatched train tasks',()=>{
    const missing=day([...trace,{...trace[0],task:'t',t:4,screen:'unknown',event:{click:{comp:'gone'}},ops:['point','click'],result:'ok'}],4,4);
    expect(attributeDay(missing,atlas).at(-1)?.mouseTravelPx).toBeNull();
    const corrupt=day(trace,99,4);expect(()=>attributeDay(corrupt,atlas)).toThrow('does not conserve');
  });
  it('uses container-local reveal offsets for scroll-past, rather than viewport centers',()=>{
    const nested={...atlas,states:atlas.states.map(state=>({...state,scrollers:{root:{maxX:0,maxY:3000,width:1440,height:400}},components:{...state.components,
      b:{center:{x:50,y:2650},reveal:{x:50,y:650},chain:['root'],offsets:{root:{x:0,y:2000}}},
      past:{center:{x:50,y:2450},reveal:{x:50,y:650},chain:['root'],offsets:{root:{x:0,y:1800}}},
    }}))};
    const events:TraceEvent[]=[{task:'t',t:0,screen:'s',event:{click:{comp:'b'}},ops:['point','click'],result:'ok'}];
    const horizontal={...nested,states:nested.states.map(state=>({...state,
      scrollers:{root:{maxX:3000,maxY:0,width:400,height:900}},
      components:Object.fromEntries(Object.entries(state.components).map(([id,box])=>[id,{...box,
        center:{x:box.center.y,y:box.center.x},reveal:{x:box.reveal.y,y:box.reveal.x},
        offsets:Object.fromEntries(Object.entries(box.offsets).map(([key,p])=>[key,{x:p.y,y:p.x}])),
      }])),
    }))};
    for(const geometry of [nested,horizontal]) {
      const result=attachGeometry(day(events,1,0),geometry);
      expect(attributeDay(result,geometry)[0]?.scrollPast).toContain('past');
    }
  });
  it('finds repeated sequences across tasks; excludes incomplete task costs',()=>{
    const input=day(trace,3,4),copy={...input,tasks:[...input.tasks,{...input.tasks[0],task:'other',clicks:3,keystrokes:4,scrolls:input.tasks[0]?.scrolls??0,mouseTravelPx:input.tasks[0]?.mouseTravelPx??null,scrollPx:input.tasks[0]?.scrollPx??null,popups:0,overrides:0,searches:0,backtracks:0,klmDeciSec:0,completed:true}],trace:[...trace,...trace.map(e=>({...e,task:'other'}))]};
    // Attach again: one continuous pointer, rather than incorrectly resetting per task.
    const result=attachGeometry(copy,atlas),digest=localityDigest([{result,atlas}]);
    expect(digest.sequences.some(s=>s.tasks===2)).toBe(true);expect(digest.totals.clicks).toBe(6);
  });
  it('reports hundredths without floating-point accumulation noise',()=>{
    const fractional={...atlas,states:atlas.states.map(state=>({...state,components:{...state.components,
      a:{center:{x:720.1,y:450},reveal:{x:720.1,y:450},chain:['root'],offsets:{root:{x:0,y:0}}},
      b:{center:{x:720.3,y:450},reveal:{x:720.3,y:450},chain:['root'],offsets:{root:{x:0,y:0}}},
    }}))};
    const events:TraceEvent[]=[
      {task:'t',t:0,screen:'s',event:{click:{comp:'a'}},ops:['point','click'],result:'ok'},
      {task:'t',t:1,screen:'s',event:{click:{comp:'b'}},ops:['point','click'],result:'ok'},
    ];
    const result=attachGeometry(day(events,2,0),fractional),digest=localityDigest([{result,atlas:fractional}]);
    expect(result.tasks[0]?.mouseTravelPx).toBe(0.3);expect(digest.totals.mouseTravelPx).toBe(0.3);expect(digest.screens[0]?.mouseTravelPx).toBe(0.3);
  });
  it('keeps keystrokes secondary when ranking top targets',()=>{
    const flat={...atlas,states:atlas.states.map(state=>({...state,components:{...state.components,
      b:{center:{x:50,y:400},reveal:{x:50,y:400},chain:['root'],offsets:{root:{x:0,y:0}}},
    }}))};
    const events:TraceEvent[]=[
      {task:'t',t:0,screen:'s',event:{click:{comp:'a'}},ops:['point','click'],result:'ok'},
      {task:'t',t:1,screen:'s',event:{click:{comp:'a'}},ops:['point','click'],result:'ok'},
      {task:'t',t:2,screen:'s',event:{enter:{comp:'b',value:{text:{s:'x'.repeat(1000)}}}},ops:['point'],result:'ok'},
    ];
    const result=attachGeometry(day(events,3,1000),flat);
    expect(localityDigest([{result,atlas:flat}],1).components[0]?.component).toBe('a');
  });
});

describe('train-only prompts and offline loop',()=>{
  it('projects every historical candidate, never the validation/test aggregates',()=>{
    const prior=record(deps);prior.candidates=[{candidate:{id:'idea',summary:'summary',moveType:'reorder',targets:['a'],patch:[],predicted:{clicks:0,keystrokes:0,scrolls:0,klmDeciSec:0},rationale:'',source:'llm',seeded:false,seededKind:null},trainEstimate:{days:[1],before:sumMetrics([]),after:sumMetrics([]),saving:{clicks:0,keystrokes:0,scrolls:0,scrollPx:0,mouseTravelPx:0,klmDeciSec:0}},check:{status:'pass',property:null,message:null,counterexample:null,screens:null,verdict:'ok'},componentsMoved:0}];
    prior.validation.reason='VALIDATION_SECRET';prior.measured.predictionNote='TEST_SECRET';prior.persona='P1';
    const ledger=measuredLedger([prior,{...prior,persona:'P2'},{...prior,night:2}],'P1',2,recomputedSavings([prior],[prior]));
    expect(ledger).toHaveLength(1);expect(ledger[0]?.chosen).toBe(false);
    const context={night:2,persona,spec,program,evidence:prior.evidence,history:[],validation:{note:'VALIDATION_SECRET'},test:{note:'TEST_SECRET'}};
    const quality:QualityContext={ledger,locality:localityDigest([{result:day(trace,3,4),atlas}])};
    const poisoned={...quality,validation:{note:'VALIDATION_SECRET'},test:{note:'TEST_SECRET'},
      ledger:quality.ledger.map(row=>({...row,validationScore:'VALIDATION_SECRET',testMetrics:'TEST_SECRET'})),
      locality:{...quality.locality,validation:'VALIDATION_SECRET',components:quality.locality.components.map(row=>({...row,test:'TEST_SECRET'}))}};
    const parts=[nightlyPrompt(context),choosePrompt({...context,stabilityBudget:3,hypothesis:'train',candidates:prior.candidates}),repairPrompt({...context,attempt:1,maxAttempts:3,failedSummaries:[],failedPatch:[],check:prior.candidates[0]?.check??{status:'pass',property:null,message:null,counterexample:null,screens:null,verdict:'ok'}})];
    for(const p of parts)for(const arm of ['A','B','C']) {
      const result=withQueries(withQuality(p,arm!=='A'?poisoned:undefined),arm==='C'?{files:{}}:undefined);expect(result.prompt).not.toMatch(/VALIDATION_SECRET|TEST_SECRET|klm|wallTime|timeSinksByScreen/i);
      if(arm==='A')expect(result).toBe(p);
    }
    const current={...prior,night:2};expect(repetitionCount(current,[prior],recomputedSavings([prior],[prior]))).toBe(1);
  });
  it('uses only recomputed train savings and rejects missing or stale ledger sources',async()=>{
    const historical=record(deps);
    historical.candidates=[{candidate:{id:'idea',summary:'earlier',moveType:'reorder',targets:['a'],patch:[],predicted:{clicks:0,keystrokes:0,scrolls:0,klmDeciSec:0},rationale:'',source:'llm',seeded:false,seededKind:null},trainEstimate:{days:[1],before:sumMetrics([]),after:sumMetrics([]),saving:{clicks:0,keystrokes:0,scrolls:9,scrollPx:17332,mouseTravelPx:0,klmDeciSec:0}},check:{status:'pass',property:null,message:null,counterexample:null,screens:null,verdict:'ok'},componentsMoved:0}];
    const current={...historical,candidates:historical.candidates.map(c=>({...c,trainEstimate:c.trainEstimate?{...c.trainEstimate,saving:{...c.trainEstimate.saving,scrolls:-3,scrollPx:-9144}}:null})),validation:{...historical.validation,reason:'VALIDATION_SECRET'},measured:{...historical.measured,predictionNote:'TEST_SECRET'}};
    const measured=recomputedSavings([historical],[current]);
    const ledger=measuredLedger([historical],'P1',2,measured);
    expect(ledger[0]?.trainDaySaving?.scrollPx).toBe(-9144);expect(ledger[0]?.trainDaySaving?.scrolls).toBe(-3);
    expect(JSON.stringify(ledger)).not.toMatch(/17332|VALIDATION_SECRET|TEST_SECRET/);
    expect(()=>recomputedSavings([historical],[{...current,candidates:[]}])).toThrow('Missing historical candidate');
    expect(()=>measuredLedger([historical],'P1',2,new Map())).toThrow('Missing recomputed');
    const root=await mkdtemp(path.join(tmpdir(),'quality-ledger-'));
    const binding={originalWorldSha256:'world',fixturesSha256:'fixture',sourceDecisionsSha256:'decisions',sourceProgramsSha256:'programs',sourceLlmSha256:'llm',sourceDaysSha256:'days',sourceCertificationsSha256:'certs',ehrSha256:'native',app:{appSha256:'app'}};
    await writeJson(path.join(root,'manifest.json'),{status:'completed',completed:1,planned:1});
    await writeJson(path.join(root,'inputs/binding.json'),binding);
    await writeJson(path.join(root,'records.json'),[{...current,arm:'sanity'}]);
    const loaded=await loadMeasuredSavings(root,[historical],binding);
    expect(measuredLedger([historical],'P1',2,loaded)).toEqual(ledger);
    const offlineHistory={...offline('night-01/P1','A',false),arm:'sanity' as const,candidates:historical.candidates};
    const offlineNow={...offlineHistory,candidates:current.candidates};
    const comparison=compareSanityRecords([offlineHistory],[offlineNow]);
    expect(comparison.changed[0]?.id).toBe('idea');expect(comparison.signChanged[0]?.signChanged).toEqual(['scrolls','scrollPx']);
    const broken={...offlineNow,candidates:current.candidates.map(c=>({...c,trainEstimate:c.trainEstimate?{...c.trainEstimate,before:{...c.trainEstimate.before,clicks:1}}:null}))};
    expect(()=>compareSanityRecords([offlineHistory],[broken])).toThrow('Unexplained count');
    await expect(loadMeasuredSavings(root,[historical],{...binding,app:{appSha256:'density-changed'}})).rejects.toThrow('different app/native/frozen');
  });
  it('cannot borrow validation atlas states from another frozen decision',async()=>{
    const root=await mkdtemp(path.join(tmpdir(),'quality-atlas-boundary-'));
    const hash=geometryProgramHash(program),components=geometryComponentsHash(program),name=`${hash}.${components}.json`;
    const previous={...atlas,programHash:hash,componentsSha256:components,states:atlas.states.map(state=>({...state,components:{...state.components,VALIDATION_SECRET:{center:{x:100,y:1000},reveal:{x:100,y:200},chain:['root'],offsets:{root:{x:0,y:800}}}}}))};
    await writeJson(path.join(root,'previous/geometry',name),previous);
    const input={train:[{result:day(trace,3,4),schedule:{day:1,persona:'P1',load:'busy',tasks:[]}}],programs:new Map([[0,program]])};
    const metadata=input.train[0]?.result.geometry;if(!metadata)throw new Error('Missing geometry fixture');metadata.programHash=hash;metadata.componentsSha256=components;
    await expect(frozenLocality(input,path.join(root,'current'))).rejects.toThrow('ENOENT');
    await writeJson(path.join(root,'current/geometry',name),{...atlas,programHash:hash,componentsSha256:components});
    expect(JSON.stringify(await frozenLocality(input,path.join(root,'current')))).not.toContain('VALIDATION_SECRET');
  });
  it('uses validation acceptance without calling screens, deploy, or offering a user change',async()=>{
    const base=record(deps),result=day([],0,0);
    const input={night:1,persona,release:{id:'v1',specVersion:'v1',spec,canonical:program,notes:'',leanSpecSource:null,fake:true},current:program,train:[],programs:new Map([[program.version,program]]),history:[],holdout:{day:1,async validate(){return {day:1,load:'busy',before:{...sumMetrics([]),tasks:1,completed:1,clicks:10,scrolls:5,scrollPx:100,mouseTravelPx:100},after:{...sumMetrics([]),tasks:1,completed:1,clicks:5,scrolls:4,scrollPx:90,mouseTravelPx:90},saving:{clicks:5,keystrokes:0,scrolls:1,scrollPx:10,mouseTravelPx:10,klmDeciSec:0},pctAboveFloor:{before:null,after:null}};}}};
    const ehr={...deps.ehr,deploy:vi.fn(()=>{throw new Error('No deploy');}),simulate:async()=>result};
    const output=await runNight({...deps,ehr},input,{offline:true});
    expect(ehr.deploy).not.toHaveBeenCalled();expect(output.deployed).toBeNull();expect(output.record.screenCheck).toBeNull();expect(output.record.userResponse.response).toBe('not-offered');
    expect(output.record.versionAfter).toBe(base.versionBefore);
    expect(output.record.outcome).toBe('validation-accepted');
    expect(output.record.validation.accepted).toBe(true);
  });
  it('freezes versionBefore and historical history, excluding blind and held-out tasks from every prompt',async()=>{
    const root=await mkdtemp(path.join(tmpdir(),'quality-frozen-'));
    const world=await loadWorld(await writeFakeWorld(path.join(root,'world'),{days:4,seed:7}));
    const prior={...record(deps),night:1,hypothesis:'historical'},source={...record(deps),night:3,versionBefore:0};
    const newer={...program,version:1};
    await writeJson(path.join(root,'programs/P1/v0.json'),program);
    await writeJson(path.join(root,'programs/P1/v1.json'),newer);
    const schedule=await world.schedule(1,'P1');if(!schedule)throw new Error('Missing fixture');
    await writeJson(path.join(root,'days/day-01/P1.json'),{...await deps.ehr.simulate({specVersion:'v1',program:newer,persona:persona.params,schedule,worldDir:world.dir,seed:7001}),complaints:['VALIDATION_SECRET','TEST_SECRET']});
    const simulate=vi.fn(deps.ehr.simulate);
    const input=await frozenNight(root,source,[prior,source,{...prior,night:4,hypothesis:'TEST_SECRET'}],world,{...deps,ehr:{...deps.ehr,simulate}});
    expect(input.current.version).toBe(0);expect(input.train[0]?.result.programVersion).toBe(1);expect(input.history).toHaveLength(1);
    expect(simulate.mock.calls[0]?.[0].schedule.tasks.map(t=>t.id)).toEqual(calibrationPartition(schedule,'train').tasks.map(t=>t.id));
    const evidence=summarizeTrain('P1',input.current,input.train,input.programs);
    const a=nightlyPrompt({night:input.night,persona:input.persona,spec:input.release.spec,program:input.current,evidence,history:input.history});
    const quality={ledger:measuredLedger([prior,source],'P1',3,recomputedSavings([prior,source],[prior,source])),locality:localityDigest([])};
    for(const prompt of [a,withQuality(a,quality)]) {
      expect(prompt.prompt).not.toMatch(/VALIDATION_SECRET|TEST_SECRET/);
      for(const t of calibrationPartition(schedule,'validation').tasks)expect(prompt.prompt).not.toContain(t.id);
    }
  });

});

function offline(id:string,arm:'A'|'B'|'C',accepted:boolean,sample=1):OfflineRecord {
  const base=record(deps);base.validation.accepted=accepted;
  base.validation.replay={day:1,load:'busy',before:sumMetrics([]),after:sumMetrics([]),saving:{clicks:accepted?2:0,scrolls:accepted?3:0,keystrokes:0,klmDeciSec:0},pctAboveFloor:{before:null,after:null}};
  return {...base,offline:true,screenCheck:'skipped',label:OFFLINE_LABEL,decisionId:id,arm,sample,tokens:{input:100,output:5,cachedInput:0,source:'backend'},callCount:2,wallTimeMs:10,frozenInputs:'input.json',repeatedMeasuredBad:0,proposedCandidates:0};
}
describe('paired reporting and input guardrails',()=>{
  it('rejects evaluator fast mode before resolving inputs or starting any process',async()=>{
    await expect(evaluateQuality({runDir:'/missing',outDir:'/missing',arms:['C'],samples:1,backend:'codex',workers:1,serviceTier:'fast'})).rejects.toThrow('Codex fast mode is prohibited');
  });
  it('counts failed transport attempts and leaves their unknown token usage unknown',async()=>{
    let attempt=0;
    const backend:JsonLlm={name:'scripted',model:'fixture',async complete(){
      if(++attempt===1)throw new Error('transport failure');
      return {json:{},backend:'scripted',model:'fixture',servedBy:null,replayOf:null,promptMatched:null,usage:{input_tokens:7,output_tokens:2}};
    }};
    const meter=meteredLlm(backend,''),request={callId:'test',purpose:'propose',system:'system',prompt:'train',schemaName:'fixture',schema:{}};
    await expect(meter.llm.complete(request)).rejects.toThrow('transport failure');
    await meter.llm.complete(request);
    expect(meter.callCount()).toBe(2);expect(meter.calls).toHaveLength(1);
    expect(meter.calls[0]?.tokens.input).toBe(7);expect(meter.tokens()).toEqual({input:null,output:null,cachedInput:null,source:'unavailable'});
  });
  it('resolves archived specs without changing logical program release identities',async()=>{
    const check=vi.fn(deps.ehr.check).mockResolvedValue('ok'),simulate=vi.fn(deps.ehr.simulate),renderScreens=vi.fn(deps.ehr.renderScreens);
    const frozen=archivedSpecEhr({...deps.ehr,check,simulate,renderScreens},new Map([['v1','/frozen/v1/spec.json']]));
    await frozen.check({specVersion:'v1',program,prev:program,canonical:program});
    expect(check.mock.calls[0]?.[0].specVersion).toBe('/frozen/v1/spec.json');
    expect(check.mock.calls[0]?.[0].program.specVersion).toBe(program.specVersion);
    expect(()=>frozen.check({specVersion:'v2',program,prev:program,canonical:program})).toThrow('No frozen spec');
    await expect(frozen.deploy({specVersion:'v1',program,prev:program,canonical:program,outDir:'/unused'})).rejects.toThrow('deployment prohibited');
  });
  it('bootstraps decisions after averaging samples and applies all three conditions',()=>{
    const rows=Array.from({length:20},(_,i)=>[offline(String(i),'A',false),offline(String(i),'B',true),offline(String(i),'B',true,2)]).flat();
    const comparison=pairedComparison(rows,'A','B');expect(comparison.beats).toBe(true);expect(comparison.rate95).toEqual([1,1]);
    expect(qualityReport(rows).arms.find(a=>a.arm==='B')?.validationClicks).toBe(40);
    expect(pairedComparison(rows,'B','C').status).toBe('not evaluated');
    const queryRows=Array.from({length:20},(_,i)=>[offline(String(i),'B',false),{...offline(String(i),'C',true),queries:{count:3,tally:{screens:2,ledger:1}}}]).flat();
    expect(pairedComparison(queryRows,'B','C').beats).toBe(true);
    expect(qualityReport(queryRows).arms.find(a=>a.arm==='C')).toMatchObject({queriesPerDecision:3,queryTally:{screens:40,ledger:20}});
    for(const r of rows.filter(r=>r.arm==='B'))if(r.validation.replay)r.validation.replay.saving.clicks=-1;
    expect(pairedComparison(rows,'A','B').beats).toBe(false);
  });
  it('rejects existing/source outputs and non-nightly selections; detects count differences',async()=>{
    await expect(freshOutput(deps.store.dir,deps.store.dir)).rejects.toThrow('NEW');
    expect(()=>selectDecisions([{...record(deps),mode:'migrate'}],['night-01/P1'])).toThrow('Not a nightly');
    const base=record(deps);expect(candidateDiffs(base,base)).toEqual([]);
    expect(await readFile(path.join(deps.store.dir,'llm/night-01/P1/propose-0.json'),'utf8')).toContain('LlmProposal');
  });
});
