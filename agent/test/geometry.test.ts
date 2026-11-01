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
 const popup={...atlas,aliases:{a:['b']},states:[{...atlas.states[0]!,state:'s-popup-test',components:{a:atlas.states[0]!.components.a!}},{...atlas.states[0]!,components:{b:atlas.states[0]!.components.b!}}]};
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
