import { withData } from "./data.js";
import {pointerTravel,type GeometryAtlas} from '../../app/src/metrics/geometry.js';
import {attachGeometry} from '../src/geometry.js';
import {sumMetrics,pairedMetrics} from '../src/observe.js';
import {improved} from '../src/night.js';
const atlas:GeometryAtlas={schemaVersion:1,programHash:'fixture',appSha256:'fixture',source:'recorded-fixture',viewport:{width:1440,height:900},states:[{screen:'s',state:'fixture',viewport:{width:1440,height:900},scrollers:{root:{width:1440,height:900,maxX:0,maxY:1800}},components:{a:{center:{x:723,y:454},reveal:{x:723,y:454},chain:[],offsets:{}},b:{center:{x:726,y:458},reveal:{x:726,y:458},chain:[],offsets:{}},c:{center:{x:726,y:1358},reveal:{x:726,y:458},chain:['root'],offsets:{root:{x:0,y:900}}}}}]};
it('uses Euclidean pixel travel, measured reveal offsets and actual scroll distance',()=>{
 const trace=[{task:'t',screen:'s',event:{click:{comp:'a'}},ops:['point','click']},{task:'t',screen:'s',event:{enter:{comp:'b'}},ops:['key']},{task:'t',screen:'s',event:{click:{comp:'c'}},ops:['point','click']},{task:'t',screen:'s',event:{scroll:{screen:'s'}},ops:['scroll']}];
 expect(pointerTravel(trace,atlas).t).toEqual({mouseTravelPx:10,scrollPx:1800,scrolls:2,missingTargets:[]});
});
it('keeps missing geometry unavailable, never zero',()=>{
 expect(pointerTravel([{task:'t',screen:'s',event:{click:{comp:'missing'}},ops:['point']}],atlas).t?.mouseTravelPx).toBe(null);
});
it('pairs pixel costs only over completed common tasks and never optimizes raw timing',()=>{
 const task={task:'t',clicks:2,keystrokes:3,scrolls:0,popups:0,overrides:0,searches:0,backtracks:0,klmDeciSec:100,completed:true};
 const day={day:1,persona:'P1',programVersion:0,trace:[{task:'t',t:0,screen:'s',event:{click:{comp:'a'}},ops:['point' as const],result:'ok' as const}],tasks:[task],floor:[],complaints:[]};
 const before=attachGeometry(day,atlas),first=before.tasks[0];if(!first)throw new Error('Missing fixture');const after={...before,tasks:[{...first,completed:false}]};
 expect(sumMetrics(before.tasks).mouseTravelPx).toBe(5);
 expect(pairedMetrics(before,after).before.mouseTravelPx).toBe(0);
 const b=sumMetrics(before.tasks),a={...b,klmDeciSec:0};
 const replay={day:1,load:'fixture',before:b,after:a,saving:{clicks:0,keystrokes:0,scrolls:0,klmDeciSec:100},pctAboveFloor:{before:null,after:null}};
 expect(improved(replay)).toBe(false);
 expect(improved({...replay,after:{...a,clicks:1}})).toBe(true);
 expect(improved({...replay,after:{...a,clicks:1,mouseTravelPx:100}})).toBe(false);
});

it('carries pointer position across tasks and prefers actual popup IDs over aliases',()=>{
 const first=atlas.states[0],a=first?.components.a,b=first?.components.b;if(!first||!a||!b)throw new Error('Missing geometry fixture');
 const popup={...atlas,aliases:{a:['b']},states:[{...first,state:'s-popup-test',components:{a}},{...first,components:{b}}]};
 const costs=pointerTravel([{task:'one',screen:'s',event:{ack:{alert:'a'}},ops:['point']},{task:'two',screen:'s',event:{click:{comp:'b'}},ops:['click']}],popup);
 expect(costs.one?.mouseTravelPx).toBe(5);expect(costs.two?.mouseTravelPx).toBe(5);
});
it('keeps uncertainty across a missing pointer position, then recovers after a known target',()=>{
 const costs=pointerTravel([{task:'one',screen:'s',event:{click:{comp:'missing'}},ops:['point']},{task:'two',screen:'s',event:{click:{comp:'a'}},ops:['point']},{task:'three',screen:'s',event:{click:{comp:'b'}},ops:['point']}],atlas);
 expect(costs.two?.mouseTravelPx).toBe(null);expect(costs.three?.mouseTravelPx).toBe(5);
});
it('allows only the documented pixel tolerance, never count or completion regressions',()=>{
 const before={...sumMetrics([]),tasks:1,completed:1,clicks:10,scrolls:4,mouseTravelPx:100,scrollPx:100};
 const replay={day:1,load:'fixture',before,after:{...before,clicks:9,mouseTravelPx:103},saving:{clicks:1,keystrokes:0,scrolls:0,klmDeciSec:0},pctAboveFloor:{before:null,after:null}};
 expect(improved(replay)).toBe(true);
 expect(improved({...replay,after:{...replay.after,mouseTravelPx:103.01}})).toBe(false);
 expect(improved({...replay,after:{...replay.after,scrolls:5}})).toBe(false);
 expect(improved({...replay,after:{...replay.after,completed:0}})).toBe(false);
});

it('does not reuse geometry across presentation-only alternatives sharing an executable',async()=>{
 const {geometryEhr,geometryProgramHash}=await import('../src/geometry.js');
 const {createFakeEhr,fakeCanonical}=await import('../src/fake/ehr-fake.js');
 const {fakeWorld,tmp}=await import('./helpers.js');const {loadWorld}=await import('../src/world.js');
 const world=await loadWorld(await fakeWorld(1)),params=world.personas.get('P1'),schedule=await world.schedule(1,'P1');if(!params||!schedule)throw new Error('No fixture');
 const make=(padding:string)=>({...fakeCanonical('v1'),presentationComponents:[{name:'Review',key:'info',source:`import {Paper} from '@mantine/core'; import {UiNodeView,type PresentationProps} from '@ehr/presentation'; export default function Review({node,onEvent}:PresentationProps){return <Paper p="${padding}"><UiNodeView node={node} onEvent={onEvent}/></Paper>;}`}]});
 const one=make('xs'),two=make('lg');expect(geometryProgramHash(one)).toBe(geometryProgramHash(two));let captures=0;
 const ehr=geometryEhr(createFakeEhr(),async input=>{captures++;return {...atlas,programHash:geometryProgramHash(input.program)};},await tmp('geometry-bundles'));
 const args={specVersion:'v1',persona:params,schedule,worldDir:world.dir,seed:1};
 const a=await ehr.simulate({...args,program:one});await ehr.simulate({...args,program:one});const b=await ehr.simulate({...args,program:two});
 expect(captures).toBe(2);expect(a.geometry?.componentsSha256).not.toBe(b.geometry?.componentsSha256);
});
withData("runs/core-10day-live/decisions").it('stops on exhausted geometry infrastructure without publishing a night outcome',async()=>{
 const {runDays}=await import('../src/run.js');const {createFakeEhr}=await import('../src/fake/ehr-fake.js');
 const {ScreenInfrastructureError}=await import('../src/errors.js');const {fakeWorld,tmp}=await import('./helpers.js');
 const {ScriptedLlm}=await import('./scripted.js');const {readFile}=await import('node:fs/promises');
 const root=await tmp('geometry-infrastructure');
 await expect(runDays({days:2,worldDir:await fakeWorld(2),runsRoot:root,runId:'FAKE',ehr:createFakeEhr(),llm:new ScriptedLlm(),geometry:async input=>{if(input.program.version>0)throw new ScreenInfrastructureError('FAKE geometry browser unavailable');return null;}})).rejects.toThrow('FAKE geometry browser unavailable');
 const manifest=JSON.parse(await readFile(root+'/FAKE/manifest.json','utf8'));
 expect(manifest.status).toBe('infrastructure-error');expect(manifest.infrastructureRetries.at(-1).attempts).toBe(3);
 await expect(readFile(root+'/FAKE/decisions/night-01/P1.json','utf8')).rejects.toThrow('ENOENT');
});

it('uses the measured workspace for the actual day without depending on task naming', () => {
 const base=atlas.states[0];if(!base)throw new Error('Missing measured fixture');
 const workspace={...atlas,states:[{...base,sample:'workspace-d01',components:{'workspace.search':{center:{x:720,y:450},reveal:{x:720,y:450},chain:[],offsets:{}}}},{...base,sample:'workspace-d02',components:{'workspace.search':{center:{x:730,y:450},reveal:{x:730,y:450},chain:[],offsets:{}}}}]};
 const trace=[{task:'custom-name',screen:base.screen,event:{enter:{comp:'workspace.search',value:{text:{s:'MRN'}}}},ops:['point','click']}];
 expect(pointerTravel(trace,workspace,2)['custom-name']?.mouseTravelPx).toBe(10);
 expect(pointerTravel(trace,workspace,2)['custom-name']?.missingTargets).toEqual([]);
});

it('captures different calibration partitions independently even on the same day',async()=>{
 const {geometryEhr,geometryProgramHash}=await import('../src/geometry.js');const {createFakeEhr,fakeCanonical}=await import('../src/fake/ehr-fake.js');
 const {fakeWorld,tmp}=await import('./helpers.js');const {loadWorld}=await import('../src/world.js');
 const world=await loadWorld(await fakeWorld(1)),params=world.personas.get('P1'),schedule=await world.schedule(1,'P1');if(!params||!schedule)throw new Error('No fixture');
 let captures=0;const program=fakeCanonical('v1');
 const ehr=geometryEhr(createFakeEhr(),async input=>{captures++;return {...atlas,programHash:geometryProgramHash(input.program)};},await tmp('geometry-partition'));
 const args={specVersion:'v1',program,persona:params,worldDir:world.dir,seed:1};
 await ehr.simulate({...args,schedule});await ehr.simulate({...args,schedule:{...schedule,tasks:schedule.tasks.slice(0,1)}});
 expect(captures).toBe(2);
});

it('reloads persisted geometry coverage when simulation resumes in a new process',async()=>{
 const {geometryEhr,geometryProgramHash,geometryComponentsHash,loadGeometry}=await import('../src/geometry.js');
 const {createFakeEhr}=await import('../src/fake/ehr-fake.js');const {fakeCanonical}=await import('../src/fake/fixtures.js');
 const {fakeWorld,tmp}=await import('./helpers.js');const {loadWorld}=await import('../src/world.js');const path=await import('node:path');
 const world=await loadWorld(await fakeWorld(2)),dir=await tmp('geometry-resume'),program=fakeCanonical('v1');
 const params=world.personas.get('P1');if(!params)throw new Error('Missing fixture persona');
 const provider:import('../src/geometry.js').GeometryProvider=async input=>({...atlas,programHash:geometryProgramHash(input.program),states:atlas.states.map(state=>({...state,state:`fixture-day-${input.schedule?.day}`}))});
 for(const day of [1,2]){
  const schedule=await world.schedule(day,'P1');if(!schedule)throw new Error('Missing fixture schedule');
  await geometryEhr(createFakeEhr(),provider,dir).simulate({specVersion:'v1',program,persona:params,schedule,worldDir:world.dir,seed:day});
 }
 const recorded=await loadGeometry(path.join(dir,'geometry',`${geometryProgramHash(program)}.${geometryComponentsHash(program)}.json`));
 expect(recorded.states.map(state=>state.state)).toEqual(['fixture-day-1','fixture-day-2']);
});

it('accounts for bounded misses at an explicit measured-slot proxy without changing the clinical trace',async()=>{
 const {projectBoundedPoints,pointingTrace,BOUNDED_POINT_ASSUMPTION}=await import('../../app/src/dashboard/bounded-pointing.js');
 const {fakeCanonical}=await import('../src/fake/fixtures.js');
 const {attributeDay}=await import('../src/locality.js');
 const program=fakeCanonical('v1'),template=program.screens[0];if(!template)throw Error('screen');
 const component=template.components[0];if(!component)throw Error('component');
 program.screens=[{...template,id:'s',components:[{...component,id:'a',tab:0},{...component,id:'b',tab:0}]},
  {...template,id:'remembered',components:[{...component,id:'old-slot',tab:0}]}];
 const box={center:{x:740,y:450},reveal:{x:740,y:450},chain:[],offsets:{}};
 const measured={...atlas,states:[...atlas.states,{screen:'remembered',state:'remembered-expanded',viewport:{width:1440,height:900},scrollers:{},components:{'old-slot':box}}]};
 const ghost='#'.repeat(100);
 const trace=[{task:'t',t:0,screen:'s',event:{click:{comp:'a'}},ops:['point' as const,'click' as const],result:'ok' as const},
  {task:'t',t:450,screen:'s',event:{click:{comp:ghost}},ops:['point' as const,'click' as const],result:'ignored' as const},
  {task:'t',t:900,screen:'s',event:{click:{comp:'b'}},ops:['point' as const,'click' as const],result:'ok' as const}];
 const task={task:'t',clicks:3,keystrokes:0,scrolls:0,popups:0,overrides:0,searches:0,backtracks:0,klmDeciSec:10,completed:true};
 const day={day:1,persona:'P1',programVersion:0,policy:'bounded' as const,trace,tasks:[task],floor:[],complaints:[],
  observations:[{task:'t',traceIndex:1,kind:'miss',place:{screen:'remembered',parent:component.parent??'',tab:0,position:0},scannedItems:0,ms:450}]};
 const original=structuredClone(day);
 expect(attachGeometry(day,measured).tasks[0]?.mouseTravelPx).toBeNull();
 const projected=projectBoundedPoints(day,program,measured);
 const enriched=attachGeometry(day,projected);
 expect(enriched.trace).toEqual(original.trace);expect(day).toEqual(original);
 expect(enriched.tasks[0]?.mouseTravelPx).toBeCloseTo(5+Math.sqrt(305)+Math.sqrt(260),2);
 expect(enriched.tasks[0]?.clicks).toBe(3);expect(enriched.tasks[0]?.scrolls).toBe(0);
 expect(enriched.geometry?.missingTargets).toEqual([]);
 expect(enriched.complaints).toContain(BOUNDED_POINT_ASSUMPTION);
 expect(pointerTravel(pointingTrace(trace,projected),projected).t?.mouseTravelPx).toEqual(enriched.tasks[0]?.mouseTravelPx);
 expect(attributeDay(enriched,projected)).toHaveLength(3);
 const unavailable={...day,observations:day.observations.map(o=>({...o,place:{...o.place,position:999}}))};
 expect(attachGeometry(unavailable,projectBoundedPoints(unavailable,program,measured)).tasks[0]?.mouseTravelPx).toBeNull();
});
