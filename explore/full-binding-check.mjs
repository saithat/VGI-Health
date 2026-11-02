import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { loadEhrInterp } from '../app/public/ehr/interp-loader.mjs';
import { commitOf } from '../agent/src/program.ts';
import { expandProgram } from '../agent/src/composites.ts';
import { startLab } from '../app/scripts/exotic-gate.mjs';
import { workspaceChoice } from './workspace.mjs';
import { write } from './evaluate.ts';
const out=process.argv[2]??'runs/explore-round2';if(!path.resolve(out).startsWith(path.resolve('runs')+path.sep))throw Error('Use runs/');
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const wasm=await loadEhrInterp({wasmBinary:await readFile('app/public/ehr/ehr-interp.wasm')});
const call=(name,v)=>JSON.parse(wasm.call(name,JSON.stringify(v)));
const spec=await read('releases/v1/spec.json');
const program=expandProgram((await read(`${out}/proposals.json`)).results.find(r=>r.id==='r2-007').candidate.program);
assert.equal(program.patientSelection,true);
const signing=program.screens.flatMap(s=>s.components).find(c=>commitOf(c)==='signOrders');if(!signing)throw Error('Missing actual sign-order control');
const inputs=[];
for(const id of ['d01-P2-W3-001','d01-P2-W3-002']){
 const task=await read(`runs/core-10day-live/trajectories/tasks/${id}.json`),bundle=await read(task.context.fixtureFile);
 const projection=call('ehr_facts',{bundle:{...bundle,entry:[...bundle.entry,...task.context.resources.map(resource=>({resource}))]},context:{today:task.context.today,now:task.context.startMin,receipts:[],record:[]}});
 const input={spec,program,facts:task.context.segments[0].facts,display:projection.display,user:{id:program.owner,role:'physician'}};
 input.state=call('ehr_init_envelope',input);inputs.push({patient:input.facts.sourcePatientId,input});
 const blocked=call('ehr_step_envelope',{...input,event:{click:{comp:signing.id}}});assert.ok(blocked.result.blocked);
}
const lab=await startLab();try{
 const page=await lab.browser.newPage({viewport:{width:1440,height:900}});await page.goto(lab.url);
 await page.evaluate(inputs=>window.startResearch('board',inputs),inputs);
 for(const pane of inputs){
  const screen=call('ehr_exotic',{op:'render',render:pane.input}).screen;
  const open=workspaceChoice(pane.input,screen).event.click.comp;
  await page.locator(`[data-comp-id="${open}"]`).click();
 }
 assert.equal(await page.locator('[data-patient]').count(),2);
 const states=await page.evaluate(()=>window.researchStates);
 for(const [patient,input]of Object.entries(states)){assert.equal(input.program.patientSelection,true);assert.equal(input.state.patientContext.patient,patient);assert.equal(input.state.patientContext.bound,patient);}
 const second=inputs[1].patient,first=inputs[0].patient;
 await page.locator(`[data-patient="${second}"] [data-comp-id="workspace.return"]`).click();
 assert.equal(await page.locator('[data-patient]').count(),0);
 const landing=(await page.evaluate(()=>window.researchStates))[second];
 const screen=call('ehr_exotic',{op:'render',render:landing}).screen;
 const reopen=workspaceChoice(landing,screen).event.click.comp;
 await page.locator(`[data-comp-id="${reopen}"]`).click();
 const after=await page.evaluate(()=>window.researchStates);
 assert.deepEqual(after[first],states[first]);assert.equal(after[second].state.patientContext.bound,second);
 await write(`${out}/full-binding-check.json`,{status:'pass',programPatientSelection:true,patients:2,unboundCommit:'blocked',openHydrate:'native',returnAndReopen:'pass',unselectedPaneUnchanged:true});
 console.log(JSON.stringify({status:'pass',patients:2,unboundCommit:'blocked'}));
}finally{await lab.close();}
