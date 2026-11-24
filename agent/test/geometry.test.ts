import { pointerTravel,type GeometryAtlas } from '../../app/src/metrics/geometry.js';
import { attachGeometry } from '../src/geometry.js';
import { sumMetrics,pairedMetrics } from '../src/observe.js';
import { improved } from '../src/night.js';
function required<T>(value:T|null|undefined):T{if(value===undefined||value===null)throw Error('Missing fixture');return value;}
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

it('reloads each exact call when simulation resumes without merging earlier days',async()=>{
 const {geometryEhr,geometryProgramHash,geometryComponentsHash,loadGeometry}=await import('../src/geometry.js');
 const {createFakeEhr}=await import('../src/fake/ehr-fake.js');const {fakeCanonical}=await import('../src/fake/fixtures.js');
 const {fakeWorld,tmp}=await import('./helpers.js');const {loadWorld}=await import('../src/world.js');const path=await import('node:path');
 const world=await loadWorld(await fakeWorld(2)),dir=await tmp('geometry-resume'),program=fakeCanonical('v1');
 const params=world.personas.get('P1');if(!params)throw new Error('Missing fixture persona');
 const provider:import('../src/geometry.js').GeometryProvider=async input=>({...atlas,programHash:geometryProgramHash(input.program),states:atlas.states.map(state=>({...state,state:`fixture-day-${input.schedule?.day}`}))});
 const results=[];
 for(const day of [1,2]){
  const schedule=await world.schedule(day,'P1');if(!schedule)throw new Error('Missing fixture schedule');
  results.push(await geometryEhr(createFakeEhr(),provider,dir).simulate({specVersion:'v1',program,persona:params,schedule,worldDir:world.dir,seed:day}));
 }
 const recorded=await loadGeometry(path.join(dir,'geometry',`${geometryProgramHash(program)}.${geometryComponentsHash(program)}.json`));
 expect(recorded.states.map(state=>state.state)).toEqual(['fixture-day-2']);
 for(const result of results){
  const exact=await loadGeometry(path.join(dir,'geometry',`${geometryProgramHash(program)}.${geometryComponentsHash(program)}.json`),result);
  expect(exact.states.map(state=>state.state)).toEqual([`fixture-day-${result.day}`]);
 }
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

it('reveals clipped controls at the nearest edge and keeps nearby fields visible',async()=>{
 const {pointerSteps}=await import('../../app/src/metrics/geometry.js');
 const clip={x:0,y:100,w:1440,h:700};
 const box=(y:number)=>({center:{x:720,y},reveal:{x:720,y:450},chain:['root'],offsets:{root:{x:0,y:y-450}},bounds:{x:700,y:y-10,w:40,h:20},clips:{root:clip}});
 const measured={...atlas,states:[{...required(atlas.states[0]),scrollers:{root:{width:1440,height:700,maxX:0,maxY:1800}},components:{a:box(850),b:box(850),c:box(120)}}]};
 const trace=['a','b','c'].map(comp=>({task:'t',screen:'s',event:{enter:{comp}},ops:['point','click']}));
 const steps=pointerSteps(trace,measured);
 // First field is inside the browser but below its actual scroll clip. The
 // adjacent field stays visible; returning above the clip costs upward travel.
 expect(steps.map(s=>s.scrollPx)).toEqual([60,0,50]);
 expect(steps.map(s=>s.scrolls)).toEqual([1,0,1]);
 const {attributePixels}=await import('../src/locality.js');
 expect(attributePixels(trace,measured).map(s=>s.scrollPx)).toEqual([60,0,50]);
});

it('reveals nested clips from inside out without resetting the outer offset',async()=>{
 const {pointerSteps}=await import('../../app/src/metrics/geometry.js');
 const measured={...atlas,states:[{screen:'s',state:'nested',viewport:{width:1440,height:900},
 scrollers:{inner:{width:800,height:200,maxX:0,maxY:1000},outer:{width:1440,height:700,maxX:0,maxY:2000}},
 components:{a:{center:{x:720,y:1100},reveal:{x:720,y:450},chain:['inner','outer'],offsets:{},bounds:{x:700,y:1090,w:40,h:20},clips:{inner:{x:0,y:900,w:800,h:200},outer:{x:0,y:100,w:1440,h:700}}}}}]};
 const steps=pointerSteps([0,1].map(()=>({task:'t',screen:'s',event:{click:{comp:'a'}},ops:['point','click']})),measured);
 expect(steps.map(s=>s.scrollPx)).toEqual([310,0]);
 expect(steps.map(s=>s.scrolls)).toEqual([2,0]);
});

it('converges event-bound native scroll pricing and refuses oscillating timing',async()=>{
 const {convergeScrollGeometry}=await import('../src/geometry.js');
 const {createFakeEhr,fakeCanonical}=await import('../src/fake/ehr-fake.js');
 const {fakeWorld}=await import('./helpers.js');const {loadWorld}=await import('../src/world.js');
 const world=await loadWorld(await fakeWorld(1)),persona=required(world.personas.get('P1')),schedule=required(await world.schedule(1,'P1'));
 const input={specVersion:'v1',program:fakeCanonical('v1'),persona,schedule,worldDir:world.dir,seed:1};
 const raw=await createFakeEhr().simulate(input);
 let calls=0;
 const inner={...createFakeEhr(),async simulate(i:import('../src/ehr.js').SimulateInput):Promise<import('../src/schema.js').DayResult>{
  calls++;return {...raw,trace:[{task:'t',t:0,screen:'s',event:{click:{comp:'c'}},ops:[...Array<'scroll'>(i.scrollPlan?.[0]?.scrolls??0).fill('scroll'),'point','click'],result:'ok'}],
   tasks:[{...required(raw.tasks[0]),task:'t',klmDeciSec:100+11*(i.scrollPlan?.[0]?.scrolls??0)}]};
 }};
 const measure=async(result:import('../src/schema.js').DayResult)=>({result,atlas});
 const day=await convergeScrollGeometry(inner,input,measure);
 expect(calls).toBe(2);expect(day.tasks[0]?.klmDeciSec).toBe(111);
 const unpriced={...inner,async simulate(i:import('../src/ehr.js').SimulateInput){
  const result=await inner.simulate(i);
  return {...result,trace:result.trace.map(row=>({...row,ops:row.ops.filter(op=>op!=='scroll')}))};
 }};
 await expect(convergeScrollGeometry(unpriced,input,measure)).rejects.toThrow('Native target scrolling did not match');
 let flip=false;
 await expect(convergeScrollGeometry(inner,input,async result=>{
  flip=!flip;return {result,atlas:{...atlas,states:[{...required(atlas.states[0]),components:{c:flip?required(required(atlas.states[0]).components.c):required(required(atlas.states[0]).components.a)}}]}};
 })).rejects.toThrow('oscillated');
});

it('attributes exact trace geometry to the original clinical component',async()=>{
 const {attributeDay}=await import('../src/locality.js');
 const first=required(atlas.states[0]),c=required(first.components.c);
 const measured={...atlas,traceTargets:{'0':'exact-dose'},states:[{...first,components:{dose:required(first.components.a),'exact-dose':c}}]};
 const trace=[{task:'t',t:0,screen:'s',event:{enter:{comp:'dose',value:{text:{s:'1'}}}},ops:['point' as const,'click' as const],result:'ok' as const}];
 const day={day:1,persona:'P1',programVersion:0,trace,tasks:[],floor:[],complaints:[]};
 const rows=attributeDay(day,measured);
 expect(rows[0]?.component).toBe('dose');
 expect(rows[0]?.scrollPx).toBe(900);
 expect(rows[0]?.scrollPast).not.toContain('exact-dose');
});
