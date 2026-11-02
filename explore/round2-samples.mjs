/** Review images from actual decision-driven states; no assurance promotion. */
import path from 'node:path';
import { readFile, mkdir } from 'node:fs/promises';
import { loadEhrInterp } from '../app/public/ehr/interp-loader.mjs';
import { boundInitial } from './workspace.mjs';
import { expandProgram } from '../agent/src/composites.ts';
import { sourceAxis } from '../app/src/ehr/ui/exotic-axis.ts';
import { startLab, paint, atoms } from '../app/scripts/exotic-gate.mjs';
import { write } from './evaluate.ts';
const out=process.argv[2]??'runs/explore-round2',read=async p=>JSON.parse(await readFile(p,'utf8'));
if(!path.resolve(out).startsWith(path.resolve('runs')+path.sep))throw Error('Use ignored runs/');
const proposals=await read(`${out}/proposals.json`),report=await read(`${out}/round2-report.json`);
if(report.phase!=='complete')throw Error('Wait for frozen evaluation');
const spec=await read('releases/v1/spec.json'),task=await read('runs/core-10day-live/trajectories/tasks/d01-P2-W3-001.json');
const wasm=await loadEhrInterp({wasmBinary:await readFile('app/public/ehr/ehr-interp.wasm')});
const call=(name,v)=>JSON.parse(wasm.call(name,JSON.stringify(v)));
const bundle=await read(task.context.fixtureFile);
const projected=call('ehr_facts',{bundle:{...bundle,entry:[...bundle.entry,...task.context.resources.map(resource=>({resource}))]},context:{today:task.context.today,now:task.context.startMin,receipts:[],record:[]}});
const lab=await startLab(),shots=[];
try{
 for(const row of Object.values(report.archive).filter(r=>r.tier==='sandbox')){
  const candidate=proposals.results.find(p=>p.id===row.id).candidate,program=expandProgram(candidate.program);
  const trace=(await read(`${out}/cohort/${row.id}/search/ED-01/d01-P2-W3-001.json`)).trace;
  const mode=row.point.patientScope==='multi'?'board':row.point.navigation==='command'?'command':row.point.layout==='spatial'?'spatial':'dated';
  const input={spec,program,facts:task.context.segments[0].facts,display:projected.display,user:{id:program.owner,role:'physician'}};
  let state,episode=-1,selected=null,best=-1;
  for(const entry of trace){
   if(entry.episode!==episode){episode=entry.episode;input.facts=task.context.segments[episode].facts;state=call('ehr_init_envelope',input);}
   const screen=call('ehr_exotic',{op:'render',render:{...input,state}}).screen;
   const axis=sourceAxis(screen);
   const score=mode==='dated'?axis.dated.length:atoms(screen.workspace).filter(n=>'field'in n).length;
   if(screen.banner.length&&!screen.modal&&score>best){best=score;selected={screen,axis};}
   state=call('ehr_step_envelope',{...input,state:{...state,clock:state.clock+(entry.phase==='hydration'?0:10)},event:entry.event}).state;
  }
  const panes=[{patient:input.facts.sourcePatientId??input.facts.patientId,screen:selected.screen}];
  if(mode==='board'){
   const other=await read('runs/core-10day-live/trajectories/tasks/d01-P2-W3-002.json');
   const source=await read(other.context.fixtureFile);
   const projection=call('ehr_facts',{bundle:{...source,entry:[...source.entry,...other.context.resources.map(resource=>({resource}))]},context:{today:other.context.today,now:other.context.startMin,receipts:[],record:[]}});
   const otherInput={spec,program,facts:other.context.segments[0].facts,display:projection.display,user:input.user};
   const otherState=boundInitial(call,otherInput);
   const otherScreen=call('ehr_exotic',{op:'render',render:{...otherInput,state:otherState}}).screen;
   panes.push({patient:otherInput.facts.sourcePatientId??otherInput.facts.patientId,screen:otherScreen});
  }
  const view={mode,panes,...(mode==='dated'?{axis:selected.axis}:{})};
  if(mode==='dated'&&!call('ehr_exotic',{op:'axis',axis:selected.axis}).accepted)throw Error('Rejected source-date axis');
  for(const width of [1440,390]){
   const page=await lab.browser.newPage({viewport:{width,height:900}});await page.goto(lab.url);await paint(page,view);
   const file=path.join(out,'screenshots',`${row.id}-working-${width}.png`);await mkdir(path.dirname(file),{recursive:true});await page.screenshot({path:file,fullPage:false});
   shots.push({id:row.id,mode,width,path:file,screen:selected.screen.title,datedRows:selected.axis.dated.length,
    boardContext:mode==='board'?'Two actual source patients; the second is independently initialized; event-isolation tests use independent real WASM sessions':undefined});
   await page.close();
  }
 }
 await write(`${out}/working-screenshots.json`,shots);console.log(JSON.stringify({shots:shots.length}));
}finally{await lab.close();}
