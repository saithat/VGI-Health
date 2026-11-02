/** Classify the actual painter, independently of proposal names or outcomes.
Spatial and dated layouts retain the ordinary navigator. No metric or selection
changes; the frozen archive's selected IDs must remain exactly the same. */
import path from 'node:path';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { niche, unsupported } from './design.ts';
import { bindTasks } from './bindings.ts';
import { typingCost } from './cost.ts';
import { spread, digest } from './cohort.ts';
import { write } from './evaluate.ts';
const run=process.argv[2]??'runs/explore-round2',read=async p=>JSON.parse(await readFile(p,'utf8'));
if(!path.resolve(run).startsWith(path.resolve('runs')+path.sep))throw Error('Use runs/');
const report=await read(`${run}/round2-report.json`),proposals=await read(`${run}/proposals.json`),frozen=await read(`${run}/frozen-archive.json`);
if(report.phase!=='complete')throw Error('Wait for evaluation to finish');
assert.equal(digest(Object.values(report.archive).map(r=>({id:r.id,search:r.search}))),frozen.selectionHash,'Search evidence changed after archive freeze');
const protocol=await read(`${run}/protocol.json`),metricChanges=[];
try{await read(`${run}/round2-report-before-normalization.json`);}catch(error){if(error.code!=='ENOENT')throw error;await write(`${run}/round2-report-before-normalization.json`,report);}
try{metricChanges.push(...(await read(`${run}/metric-corrections.json`)).changes);}catch(error){if(error.code!=='ENOENT')throw error;}
for(const row of report.rows)for(const split of ['search','heldout']){
 const summary=row[split];if(!summary)continue;
 for(const member of summary.members){
  let keys=0;
  for(const task of protocol[split==='search'?'searchTasks':'heldoutTasks']){
   const file=`${run}/cohort/${row.id}/${split}/${member.physician}/${task}.json`,record=await read(file);
   const corrected=record.trace.reduce((n,t)=>n+typingCost(t.event,t.device==='keyboard',row.point.navigation==='command'&&t.phase!=='selection'),0);
   if(corrected!==record.metric.keys){metricChanges.push({id:row.id,split,physician:member.physician,task,previousKeys:record.metric.keys,correctedKeys:corrected});record.metric.keys=corrected;await write(file,record);}
   keys+=corrected;
  }
  member.keys=keys;member.effort=member.clicks+keys/20+member.mouseTravelPx/1000+member.scrollPx/1000;
 }
 summary.effort=spread(summary.members.map(m=>m.effort/m.tasks));
 await write(`${run}/evaluation/${row.id}-${split}.json`,summary);
}
await write(`${run}/metric-corrections.json`,{definition:await read(`${run}/metric-definition.json`),changes:metricChanges,selectionChanged:false});
assert.equal(metricChanges.length,0,'Final version must already use the declared typing metric');
assert.equal(digest(Object.values(report.archive).map(r=>({id:r.id,search:r.search}))),frozen.selectionHash,'Normalization changed frozen search evidence');
const before=Object.values(report.archive).map(r=>r.id).sort();
assert.deepEqual(before,[...frozen.ids].sort());
let prior;try{prior=await read(`${run}/descriptor-corrections.json`);}catch(error){if(error.code!=='ENOENT')throw error;}
const corrections=prior?.corrections??[];
for(const row of report.rows.filter(r=>['r2-005','r2-006','r2-008'].includes(r.id))){
 const requested=structuredClone(row.point);
 if(['r2-006','r2-008'].includes(row.id))row.point.navigation='list';
 if(['r2-005','r2-006'].includes(row.id))row.point.density='normal';
 if(JSON.stringify(requested)!==JSON.stringify(row.point))corrections.push({id:row.id,requested,realized:row.point,reason:'Spatial/dated painters retain list navigation; program compact-size flags are absent from UiScreen, and the laboratory has no separate compact control preset'});
 row.niche=niche(row.point);
 const candidate=proposals.results.find(p=>p.id===row.id).candidate;
 candidate.point=structuredClone(row.point);if(candidate.sandbox)candidate.sandbox.customComponents=unsupported(candidate.point);candidate.taskMapping=bindTasks(candidate.program,candidate.workflows,candidate.point);
}
report.archive=Object.fromEntries(Object.values(report.archive).map(row=>{
 const updated=report.rows.find(r=>r.id===row.id);return [updated.niche,updated];
}));
assert.deepEqual(Object.values(report.archive).map(r=>r.id).sort(),before);
await write(`${run}/descriptor-corrections.json`,{corrections,selectionChanged:false,descriptorMetricChanged:false,typingMetricCorrections:metricChanges.length,frozenIdsPreserved:true});
await write(`${run}/round2-report.json`,report);await write(`${run}/proposals.json`,proposals);
console.log(JSON.stringify({corrections:corrections.length,selectionChanged:false}));
