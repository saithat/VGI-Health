import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync,spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {resolve,basename} from 'node:path';
import {pointerTravel} from '../../app/src/metrics/geometry.ts';
const read=file=>JSON.parse(readFileSync(file,'utf8'));
const native='lean/.lake/build/bin/ehr';
const sources=[...read('fixtures/synthea/index.json').patients.map(p=>({...p,path:`fixtures/synthea/${p.file}`})),...read('fixtures/synthetic-hospital/index.json').patients.map(p=>({...p,path:`fixtures/synthetic-hospital/${p.file}`}))];
const broker=spawn(process.execPath,['app/scripts/geometry-browser.mjs'],{env:{...process.env,EHR_GEOMETRY_CACHE:resolve('.cache/content2/geometry')},stdio:['pipe','pipe','inherit']});
let next=0;const waiting=new Map();
createInterface({input:broker.stdout}).on('line',line=>{try{const response=JSON.parse(line);waiting.get(response.id)?.(response);waiting.delete(response.id);}catch{}});
const measure=files=>new Promise(resolve=>{const id=++next;waiting.set(id,resolve);broker.stdin.write(JSON.stringify({id,files,bundle:null})+'\n');});
const simulate=(program,day,persona)=>JSON.parse(execFileSync(native,['simulate','--spec',day<4?'v1':day<7?'v2':'v3','--program',program,'--persona',`runs/world/2/personas/${persona}.json`,'--schedule',`runs/world/2/day-${day}-${persona}.json`,'--world','runs/world/2','--seed',String(7000+day)],{maxBuffer:100e6,env:{...process.env,LEAN_NUM_THREADS:'8'}}));
function prefix(result){return result.tasks.flatMap(task=>{const trace=result.trace.filter(e=>e.task===task.task);const end=trace.findIndex(e=>e.event.click?.comp.startsWith('workspace.open|'));assert.ok(end>=0);return trace.slice(0,end+1);});}
const cases=[];
try{
 for(const [persona,day] of [['P1',1],['P2',1],['P3',1],['P4',1],['P5',1],['P3',5],['P3',10]]){
  const release=day<4?'v1':day<7?'v2':'v3', program=`releases/${release}/personas/${persona}.json`;
  const schedule=`runs/world/2/day-${day}-${persona}.json`,task=read(schedule).tasks[0],fixture=sources.find(p=>p.id===task.patientId);assert.ok(fixture);
  const out=resolve(`.cache/content2/selection-geometry/${persona}-${day}`);mkdirSync(out,{recursive:true});
  execFileSync(native,['render-screens','--ui','--spec',`releases/${release}/spec.json`,'--program',program,'--fhir',fixture.path,'--world','runs/world/2','--schedule',schedule,'--out',out],{env:{...process.env,LEAN_NUM_THREADS:'8'}});
  const files=readdirSync(out).filter(file=>file.startsWith('workspace-')&&file.endsWith('.json')).map(file=>resolve(out,file));assert.ok(files.length);
  const captured=await measure(files);assert.ok(!captured.error,captured.error);
  const atlas={schemaVersion:1,programHash:'checked-source',appSha256:captured.appSha256,viewport:{width:1440,height:900},states:captured.states,source:'chromium'};
  const result=simulate(program,day,persona),trace=prefix(result);
  const costFor=events=>Object.assign({},...result.tasks.map(task=>pointerTravel(events.filter(e=>e.task===task.task),atlas,day)));
  const costs=Object.values(costFor(trace));
  assert.deepEqual(costs.flatMap(cost=>cost.missingTargets),[]);
  let equalAgent=null;
  if(persona==='P3'){
   const agent=`runs/run1-P3/programs/P3/${day===1?'v1':'v7'}.json`,other=prefix(simulate(agent,day,persona));
   assert.deepEqual(other.map(({event,ops})=>({event,ops})),trace.map(({event,ops})=>({event,ops})));
   assert.deepEqual(costFor(other),costFor(trace));equalAgent=agent;
  }
  cases.push({persona,day,tasks:costs.length,states:captured.states.length,clicks:trace.filter(e=>!e.event.scroll).length,scrolls:costs.reduce((n,c)=>n+c.scrolls,0),scrollPx:costs.reduce((n,c)=>n+c.scrollPx,0),mouseTravelPx:costs.reduce((n,c)=>n+c.mouseTravelPx,0),equalAgent,missingTargets:0,source:'Chromium, actual day/lookup semantic trees',appSha256:captured.appSha256,viewport:{width:1440,height:900}});
  console.log(JSON.stringify(cases.at(-1)));
 }
 writeFileSync('docs/measurements/content2/patient-selection-geometry.json',JSON.stringify({cases,source:'Selection prefix only, common viewport-center pointer entry per task; the full day metric also counts clinical travel.',missingTargets:0},null,2)+'\n');
}finally{broker.stdin.end();await new Promise(resolve=>broker.on('exit',resolve));}
