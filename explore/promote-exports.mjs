/** Add every native-exported program state to the ordinary painter refinement corpus.
These composed snapshots test rendering, and never acquire event or persistence authority. */
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { loadEhrInterp } from '../app/public/ehr/interp-loader.mjs';
import { createEhr } from '../agent/src/ehr.ts';
import { expandProgram } from '../agent/src/composites.ts';
import { write } from './evaluate.ts';
import { digest } from './cohort.ts';
const out=process.argv[2]??'runs/promote-round2';
if(!path.resolve(out).startsWith(path.resolve('runs')+path.sep))throw Error('Use ignored runs/');
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const proposals=await read(`${out}/proposals.json`),index=await read('fixtures/synthea/index.json');
const bundles=['fixtures/synthea/Ashly_Rippin_149fcc1f.json',...['pediatric','surgical'].map(flag=>`fixtures/synthea/${index.patients.find(p=>p.flags[flag]).file}`)];
const ehr=createEhr({binary:path.resolve('lean/.lake/build/bin/ehr')});
const wasm=await loadEhrInterp({wasmBinary:await readFile('app/public/ehr/ehr-interp.wasm')});
const canonical=JSON.parse(wasm.call('ehr_exotic',JSON.stringify({op:'canonical'})));
const sourceInput=structuredClone(canonical.input);sourceInput.facts.sourcePatientId='reference';sourceInput.display.sourcePatientId='reference';
const other=JSON.parse(wasm.call('ehr_exotic',JSON.stringify({op:'board',sessions:[{patient:'reference',input:sourceInput,receipts:[]}]}))).node.board.children[0];
const pane=(patient,s)=>({patientPane:{patient,banner:s.banner,metadata:{sourceLabels:s.sourceLabels??[],fieldSources:s.fieldSources??[],entryHints:s.entryHints??[],fieldChoices:s.fieldChoices??[],...(s.urgent?{urgent:s.urgent}:{})},
 children:[...s.workspace,...s.side,...s.nav.flatMap(([,entries])=>entries.map(([comp,label])=>({button:{comp,label,role:'nav',enabled:true,blockedReason:null,hotkey:null}})))],modal:s.modal?[s.modal]:[]}});
const attention=await read('docs/design/alert-urgency.json');
const urgentIds=new Set(attention.assignments.filter(a=>a.urgency==='urgent').map(a=>a.id));
const spec=await read('releases/v1/spec.json');
const demands=(patient,screen)=>{
 const ids=new Set();
 const visit=nodes=>{for(const n of nodes){if(n.alert&&urgentIds.has(n.alert.alertId))ids.add(n.alert.alertId);const v=Object.values(n)[0];if(v.children)visit(v.children);if(v.body)visit(v.body);}};
 visit([...screen.workspace,...screen.side]);
 if(screen.modal?.section&&urgentIds.has(screen.modal.section.id))ids.add(screen.modal.section.id);
 return [...ids].map(alertId=>{const rule=spec.alerts.find(a=>a.id===alertId);assert.ok(rule);return{patient,banner:screen.banner,alertId,label:rule.label,severity:rule.tier};});
};
const coverage=[];
for(const proposal of proposals.results){
 for(const [b,bundle]of bundles.entries()){
  const files=await ehr.renderScreens({specVersion:'v1',program:expandProgram(proposal.candidate.program),fhir:path.resolve(bundle),ui:true,outDir:path.resolve(`${out}/exports/${proposal.id}/b${b}`)});
  const raw=await read(bundle);
  const projection=JSON.parse(wasm.call('ehr_facts',JSON.stringify({bundle:raw,context:{today:'2026-11-02',now:600,receipts:[],record:[]}})));
  assert.ok(!projection.error,projection.error);
  const patient=projection.facts.sourcePatientId;assert.equal(typeof patient,'string');assert.equal(projection.display.sourcePatientId,patient);
  for(const file of files){
   const screen=await read(file);
   if(!screen.banner.length){coverage.push({file,kind:'native-picker',coveredByBackingGate:true});continue;}
   const mode=proposal.id==='r2-007'?'board':'dated';
   const snapshotInput={...sourceInput,facts:projection.facts,display:projection.display};
   const datedScreen=JSON.parse(wasm.call('ehr_exotic',JSON.stringify({op:'date-index',render:snapshotInput,screen}))).screen;
   assert.ok(datedScreen,'Native snapshot source selection');
   const view=mode==='board'?{mode,panes:[{patient,screen},{patient:'reference',screen:canonical.screen}],ordinary:{board:{urgent:demands(patient,screen),children:[pane(patient,screen),other]}}}:
    {mode,panes:[{patient,screen:datedScreen}],ordinary:{board:{urgent:demands(patient,screen),children:[pane(patient,datedScreen)]}}};
   view.indexObservation=JSON.parse(wasm.call('ehr_exotic',JSON.stringify({op:'observe-index',node:view.ordinary})));
   const hash=digest(view),name=`${proposal.id}-export-${hash}.json`;
   await write(`${out}/views/${name}`,view);
   coverage.push({file,kind:mode,view:name,sha256:hash});
  }
 }
}
await write(`${out}/export-coverage.json`,{states:coverage.length,coverage,bundles,scope:'Every native-exported state. Picker states use the backing gate; bound snapshots compose the ordinary constructor with unchanged content. No event dispatch authority.'});
console.log(JSON.stringify({states:coverage.length,composed:coverage.filter(c=>c.view).length}));
