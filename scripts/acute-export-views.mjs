/** Export acute clinical screens through source-bound native patient selection and goto events.
 * Usage: node scripts/acute-export-views.mjs <fixture directory> <output directory>
 * Builds no clinical state, captures, receipts or decisions outside the interpreter.
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {selectAcutePatient,acuteChartFacts} from './acute-select.mjs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));process.chdir(root);
const [fixtureDir='/tmp/acute-review-fixtures',output='/tmp/acute-review-ui']=process.argv.slice(2);
const read=f=>JSON.parse(readFileSync(f));
const call=(command,input)=>JSON.parse(execFileSync('lean/.lake/build/bin/ehr',[command],{input:JSON.stringify(input),maxBuffer:32e6,env:{...process.env,LEAN_NUM_THREADS:'4'}}));
const files=[];
for(const persona of ['P2','P3']){
 const base={spec:read('releases/v1/spec.json'),program:read(`releases/v1/personas/${persona}.json`),user:read(`${fixtureDir}/${persona}-user.json`),...acuteChartFacts(call,{bundle:read(`${fixtureDir}/${persona}.json`),context:read(`${fixtureDir}/${persona}-context.json`)})};
 const initial=selectAcutePatient(call,base),states=new Map([[initial.screen,initial]]),queue=[initial.screen];
 const out=path.join(output,persona);mkdirSync(out,{recursive:true});
 for(const id of queue){
  const state=states.get(id),screen=base.program.screens.find(s=>s.id===id);
  if(['W3','W4'].includes(screen.workflow)){
    const file=`${out}/${id}.json`;writeFileSync(file,JSON.stringify(call('render-ui',{...base,state}),null,2)+'\n');files.push(file);
  }
  for(const comp of screen.components){const dest=comp.kind.button?.action?.goto?.screen;if(dest&&!states.has(dest)){
    const next=call('step',{...base,state,event:{click:{comp:comp.id}}});if(next.result==='ok'){states.set(dest,next.state);queue.push(dest);}
  }}
 }
}
writeFileSync(path.join(output,'index.json'),JSON.stringify(files));console.log(`${files.length} source-bound acute clinical screens exported`);
