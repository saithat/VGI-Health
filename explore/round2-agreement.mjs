import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { loadEhrInterp } from '../app/public/ehr/interp-loader.mjs';
import { write } from './evaluate.ts';
import { boundInitial } from './workspace.mjs';
import { expandProgram } from '../agent/src/composites.ts';
const out=process.argv[2]??'runs/explore-round2';
if(!path.resolve(out).startsWith(path.resolve('runs')+path.sep))throw Error('Use ignored runs/');
const wasm=await loadEhrInterp({wasmBinary:await readFile('app/public/ehr/ehr-interp.wasm')});
const native=input=>JSON.parse(execFileSync('lean/.lake/build/bin/exotic-api',{input:JSON.stringify(input)+'\n',encoding:'utf8'}));
const call=input=>JSON.parse(wasm.call('ehr_exotic',JSON.stringify(input)));
const fixture=native({op:'canonical'});
const cases=[{op:'canonical'}, {op:'axis',axis:fixture.axis},
 {op:'axis',axis:{...fixture.axis,dated:[...fixture.axis.dated].reverse()}},
 {op:'axis',axis:{dated:[],undated:fixture.axis.undated}},
 {op:'render',render:fixture.input}, {op:'axis',axis:{dated:[{minute:-1,node:{text:{s:'bad'}}}],undated:[]}}];
for(const input of cases)assert.deepEqual(call(input),native(input));
assert.equal(call(cases[1]).accepted,true);assert.equal(call(cases[2]).accepted,false);
let render=fixture.input,steps=0;
for(const event of [{click:{comp:fixture.commands.find(c=>c.enabled).id}},{click:{comp:'not-an-offer'}},{click:{comp:'toSign'}},{click:{comp:'signOrders'}}]){
 const input={...render,event};
 const n=JSON.parse(execFileSync('lean/.lake/build/bin/ehr',['step'],{input:JSON.stringify(input),encoding:'utf8'}));
 const w=JSON.parse(wasm.step(JSON.stringify(input)));assert.deepEqual(w,n);steps++;
 render={...render,state:w.state};assert.deepEqual(call({op:'render',render}),native({op:'render',render}));
}
// The decision boundary is also a real shared Lean API, not a JS goal policy.
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const proposals=await read(`${out}/proposals.json`);
const candidate=proposals.results[0].candidate;
const trajectory=await read('runs/core-10day-live/trajectories/tasks/d01-P2-W3-001.json');
const task=(await read('runs/world/2/schedules/day-01/P2.json')).tasks.find(t=>t.id==='d01-P2-W3-001');
const program=expandProgram(candidate.program);
const spec=await read('releases/v1/spec.json');
const caseInput={...fixture.input,spec,program,facts:trajectory.context.segments[0].facts,user:{id:program.owner,role:'physician'}};
const engineCall=(name,input)=>JSON.parse(wasm.call(name,JSON.stringify(input)));
const nativeCall=(name,input)=>name==='ehr_exotic'?native(input):JSON.parse(execFileSync('lean/.lake/build/bin/ehr',[name==='ehr_init_envelope'?'init':'step'],{input:JSON.stringify(input),encoding:'utf8'}));
let state=boundInitial(engineCall,caseInput);assert.deepEqual(state,boundInitial(nativeCall,caseInput));
const input={...fixture.input,spec,program,facts:trajectory.context.segments[0].facts,user:{id:program.owner,role:'physician'}};
let choiceCases=0;
for(let i=0;i<24;i++){
 const render={...input,state};
 const request={op:'choices',render,task,episode:0};
 const expected=native(request),actual=call(request);assert.deepEqual(actual,expected);choiceCases++;
 if(actual.done||!actual.events.length)break;
 state=JSON.parse(wasm.step(JSON.stringify({...render,state:{...state,clock:state.clock+10},event:actual.events[0]}))).state;
}
const result={cases:cases.length,choiceCases,patientPreparation:true,steps,renderedTransitions:steps,mismatches:0,scope:'Canonical command/zone payloads; chronological/reversed/undated/malformed axes; real interpreter transitions/rendered results and 24 W3 goal-choice boundaries'};
await write(`${out}/agreement.json`,result);console.log(JSON.stringify(result));
