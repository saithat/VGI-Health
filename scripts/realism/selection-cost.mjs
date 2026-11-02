import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const run=(program,day)=>JSON.parse(execFileSync('lean/.lake/build/bin/ehr',['simulate','--spec',`v${day<4?1:day<7?2:3}`,'--program',program,'--persona','runs/world/2/personas/P3.json','--schedule',`runs/world/2/day-${day}-P3.json`,'--world','runs/world/2','--seed',String(7000+day)],{maxBuffer:100e6,env:{...process.env,LEAN_NUM_THREADS:'8'}}));
function selection(result){return result.tasks.map(task=>{
  const trace=result.trace.filter(e=>e.task===task.task);
  const end=trace.findIndex(e=>e.event.click?.comp.startsWith('workspace.open|'));
  assert.ok(end>=0,`${task.task}: actual patient selection`);
  return {task:task.task,events:trace.slice(0,end+1).map(({event,ops})=>({event,ops}))};
});}
const versions=readdirSync('runs/run1-P3/programs/P3').filter(f=>/^v\d+\.json$/.test(f)).sort((a,b)=>Number.parseInt(a.slice(1))-Number.parseInt(b.slice(1)));
const cases=[];
for(const day of [1,5,10]){
  const release = day < 4 ? 'v1' : 'v2';
  const program = `runs/run1-P3/programs/P3/${versions.filter(file=>read(`runs/run1-P3/programs/P3/${file}`).specVersion===release).at(-1)}`;
  const baseline=run(`releases/v${day<4?1:day<7?2:3}/personas/P3.json`,day),agent=run(program,day);
  const expected=selection(baseline);assert.deepEqual(selection(agent),expected,'Baseline and real agent pay identical patient-selection cost');
  cases.push({day,agent:program,tasks:expected.length,baselineCompleted:baseline.tasks.filter(t=>t.completed).length,agentCompleted:agent.tasks.filter(t=>t.completed).length,selectionEvents:expected.reduce((n,t)=>n+t.events.length,0),selectionOps:expected.flatMap(t=>t.events.flatMap(e=>e.ops)).reduce((out,op)=>(out[op]=(out[op]??0)+1,out),{}),identical:true});
}
mkdirSync('docs/measurements/content2', {recursive:true});
writeFileSync('docs/measurements/content2/patient-selection-cost.json',JSON.stringify({cases,mismatches:0,model:'Same source directory and task patient; fixed row/lookup policy; P+C pointer cost, K typing and explicit ten-row scrolling. Fresh simulations wrap historical layouts in the current workspace; archived recorded replay keeps its original flag.'},null,2)+'\n');console.log(JSON.stringify(cases));
