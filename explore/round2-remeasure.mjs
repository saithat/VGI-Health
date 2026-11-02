/** Correct pane-root scroll accounting by replay, never by new decisions. */
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, mkdir, copyFile } from 'node:fs/promises';
import { loadEhrInterp } from '../app/public/ehr/interp-loader.mjs';
import { expandProgram } from '../agent/src/composites.ts';
import { startLab, paint, measureEvent } from '../app/scripts/exotic-gate.mjs';
import { boundInitial } from './workspace.mjs';
import { spread, digest } from './cohort.ts';
import { write } from './evaluate.ts';
const out=process.argv[2]??'runs/explore-round2';
if(!path.resolve(out).startsWith(path.resolve('runs')+path.sep))throw Error('Use ignored runs/');
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const report=await read(`${out}/round2-report.json`),protocol=await read(`${out}/protocol.json`),frozen=await read(`${out}/frozen-archive.json`);
assert.equal(report.phase,'complete');
const originalHash=digest(Object.values(report.archive).map(r=>({id:r.id,search:r.search})));
assert.equal(originalHash,frozen.selectionHash);
const backup=`${out}/geometry-pane-v2`;await mkdir(backup,{recursive:true});
await write(`${backup}/round2-report.json`,report);
const spec=await read('releases/v1/spec.json');
const program=expandProgram((await read(`${out}/proposals.json`)).results.find(r=>r.id==='r2-007').candidate.program);
assert.equal(program.patientSelection,true);
const wasm=await loadEhrInterp({wasmBinary:await readFile('app/public/ehr/ehr-interp.wasm')});
const call=(name,input)=>JSON.parse(wasm.call(name,JSON.stringify(input)));
const row=report.rows.find(r=>r.id==='r2-007'),corrections=[];
const lab=await startLab();
try{
 for(const split of ['search','heldout']){
  const scenarios=await Promise.all(protocol[split==='search'?'searchTasks':'heldoutTasks'].map(async id=>{
   const trajectory=await read(`runs/core-10day-live/trajectories/tasks/${id}.json`),bundle=await read(trajectory.context.fixtureFile);
   const task=(await read(`runs/world/2/schedules/day-0${split==='search'?1:2}/P2.json`)).tasks.find(t=>t.id===id);
   const projection=call('ehr_facts',{bundle:{...bundle,entry:[...bundle.entry,...trajectory.context.resources.map(resource=>({resource}))]},context:{today:trajectory.context.today,now:task.startMin,receipts:[],record:[]}});
   return {id,patient:trajectory.context.segments[0].facts.sourcePatientId,segments:trajectory.context.segments,display:projection.display};
  }));
  const makeInput=(s,facts,state)=>({spec,program,facts,display:s.display,user:{id:program.owner,role:'physician'},state});
  const others=new Map(scenarios.map(s=>{
   const input=makeInput(s,s.segments[0].facts);input.state=boundInitial(call,input);
   return [s.patient,call('ehr_exotic',{op:'render',render:input}).screen];
  }));
  for(const member of row[split].members){
   const page=await lab.browser.newPage({viewport:{width:1440,height:900}}),picker=await lab.browser.newPage({viewport:{width:1440,height:900}});
   await page.goto(lab.url);await picker.goto(lab.stockUrl);
   let totalMouse=0,totalScroll=0;
   for(const scenario of scenarios){
    const file=`${out}/cohort/r2-007/${split}/${member.physician}/${scenario.id}.json`,record=await read(file);
    assert.equal(record.geometryVersion,2);
    const before=structuredClone(record.metric);let state,episode=-1,previous=[0,0],mouse=0,scroll=0;
    await mkdir(`${backup}/${split}/${member.physician}`,{recursive:true});await copyFile(file,`${backup}/${split}/${member.physician}/${scenario.id}.json`);
    for(const entry of record.trace){
     if(entry.episode!==episode){episode=entry.episode;state=call('ehr_init_envelope',makeInput(scenario,scenario.segments[episode].facts));}
     const input=makeInput(scenario,scenario.segments[episode].facts,state);
     if(entry.phase!=='hydration'){
      const screen=call('ehr_exotic',{op:'render',render:input}).screen;
      if(entry.phase==='selection')await picker.evaluate(s=>window.renderUi(s),screen);
      else await paint(page,{mode:'board',panes:[{patient:scenario.patient,screen},...scenarios.filter(s=>s.patient!==scenario.patient).map(s=>({patient:s.patient,screen:others.get(s.patient)}))]});
      const keyboard=entry.device==='keyboard';
      const geo=await measureEvent(entry.phase==='selection'?picker:page,{patient:scenario.patient,event:entry.event,keyboard,previous});
      assert.equal(geo.missing,false);mouse+=geo.mouseTravelPx;scroll+=geo.scrollPx;if(!keyboard)previous=geo.position;
      entry.geometry=geo;
     }
     const result=call('ehr_step_envelope',{...input,state:{...state,clock:state.clock+(entry.phase==='hydration'?0:10)},event:entry.event});
     assert.deepEqual(result.result,entry.result);assert.equal(result.state.screen,entry.stateScreen);state=result.state;
    }
    assert.equal(record.metric.completed,true);
    record.metric.mouseTravelPx=mouse;record.metric.scrollPx=scroll;record.geometryVersion=3;
    await write(file,record);totalMouse+=mouse;totalScroll+=scroll;
    corrections.push({split,physician:member.physician,task:scenario.id,before,after:record.metric,decisionsUnchanged:true});
   }
   member.mouseTravelPx=totalMouse;member.scrollPx=totalScroll;member.effort=member.clicks+member.keys/20+totalMouse/1000+totalScroll/1000;
   await page.close();await picker.close();process.stderr.write(`[remeasure ${split}] ${member.physician}\n`);
  }
  const summary=row[split];summary.effort=spread(summary.members.map(m=>m.effort/m.tasks));summary.mouseTravelPx=spread(summary.members.map(m=>m.mouseTravelPx/m.tasks));summary.scrollPx=spread(summary.members.map(m=>m.scrollPx/m.tasks));
  await write(`${out}/evaluation/r2-007-${split}.json`,summary);
 }
 report.archive[row.niche]=row;
 assert.deepEqual(Object.values(report.archive).map(r=>r.id).sort(),[...frozen.ids].sort());
 await write(`${out}/round2-report.json`,report);
 await write(`${out}/geometry-corrections.json`,{reason:'Include scrollable patient-pane root itself, once, in addition to descendants and document',tasks:corrections.length,modelRequests:0,eventsAndOutcomesUnchanged:true,selectedIdsUnchanged:true,originalSelectionHash:originalHash,correctedSearchHash:digest(Object.values(report.archive).map(r=>({id:r.id,search:r.search}))),corrections});
 console.log(JSON.stringify({tasks:corrections.length,modelRequests:0,heldoutBoardScrollPx:row.heldout.scrollPx}));
}finally{await lab.close();}
