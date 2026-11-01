import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { loadEhrInterp } from '../../app/public/ehr/interp-loader.mjs';
const root=resolve(import.meta.dirname,'../..');
const wasm=await loadEhrInterp();
const read=file=>JSON.parse(readFileSync(resolve(root,file),'utf8'));
const native=(command,input)=>JSON.parse(execFileSync(`${root}/lean/.lake/build/bin/ehr`,[command],{input:JSON.stringify(input),maxBuffer:48e6,env:{...process.env,LEAN_NUM_THREADS:'8'}}));
const call=(command,input)=>{
  const n=native(command,input), w=JSON.parse((command==='render-ui'?wasm.call('ehr_render_ui',JSON.stringify(input)):wasm[command](JSON.stringify(input))));
  assert.deepEqual(w,n,`native/Wasm ${command}`);return n;
};
const descend=n=>[n,...['presentation','rowAction','section','columns','valueSet','chartReferences'].flatMap(k=>n[k]?.children?.flatMap(descend)??[]),...(n.tabs?.body?.flatMap(descend)??[])];
const sources=[...read('fixtures/synthea/index.json').patients.map(p=>({...p,path:`fixtures/synthea/${p.file}`})),...read('fixtures/synthetic-hospital/index.json').patients.map(p=>({...p,path:`fixtures/synthetic-hospital/${p.file}`}))];
const overlay=read('fixtures/clinical/overrides.json').entry;
const graph=read('runs/world/2/context/day-01.json');
function chart(id){
  const patient=sources.find(p=>p.id===id);assert.ok(patient,`fixture for ${id}`);
  const bundle=read(patient.path);
  for(const change of overlay.filter(c=>c.source===patient.path)){
    bundle.entry=bundle.entry.filter(e=>`${e.resource.resourceType}/${e.resource.id??e.fullUrl?.replace(/^urn:uuid:/,'')}`!==change.key&&(!change.sourceFullUrl||e.fullUrl!==change.sourceFullUrl));
    if(change.action!=='withdraw')bundle.entry.push({resource:change.resource});
  }
  return bundle;
}
const cases=[];
mkdirSync(resolve(root,'app/shots/realism/content2/patient-selection'),{recursive:true});
for(const release of ['v1','v2','v3'])for(const persona of ['P1','P2','P3','P4','P5']){
  const spec=read(`releases/${release}/spec.json`),program=read(`releases/${release}/personas/${persona}.json`),user={id:persona,role:program.role};
  const extraPatients=sources.map(p=>({id:p.id,name:p.name,mrn:p.mrn??''}));
  const context={today:'2026-11-02',now:540,receipts:[],record:[['viewerPersona',persona]]};
  const directory=call('facts',{bundle:graph,context,directoryOnly:true,extraPatients});
  const base={spec,program,user};let facts=directory.facts,display=directory.display;
  let state=call('init',{...base,facts});
  const render=()=>call('render-ui',{...base,facts,display,state});
  const step=event=>{const r=call('step',{...base,facts,state,event});assert.equal(r.result,'ok');state=r.state;return r;};
  const landing=render();assert.equal(state.patientContext.patient,undefined);assert.deepEqual(state.captured,[]);
  assert.deepEqual(landing.banner,[]);assert.deepEqual(landing.side,[]);assert.equal(landing.modal,null);
  assert.ok(!landing.workspace.flatMap(descend).some(n=>n.field&&n.field.comp!=='workspace.search'));
  const rows=landing.workspace.flatMap(descend).filter(n=>n.button?.comp.startsWith('workspace.open|'));
  assert.ok(rows.length>=4,`${persona}: full source list`);
  const open=rows[0].button;const id=open.comp.split('|')[1];assert.match(open.label,/^Open chart: .+ \(MRN .+\)$/);
  step({click:{comp:open.comp}});assert.deepEqual(render().banner,[],'Opening never paints old facts');
  const projection=call('facts',{bundle:chart(id),worldContext:graph,context,extraPatients});facts=projection.facts;display=projection.display;
  state=call("step",{...base,facts,state,event:{scroll:{screen:state.screen}}}).state;assert.equal(state.patientContext.bound,id);
  assert.equal(render().banner.find(([k])=>k==='MRN')[1],projection.display.banner.mrn);
  assert.ok(!state.captured.some(c=>c.element==='patientIdReentry'||c.element==='patientScan'));
  // Capture actual source text, then leave through the real application control.
  const clinical=render();const field=clinical.workspace.flatMap(descend).find(n=>n.field?.kind==='text'&&!n.field.pendingConfirm&&!n.field.humanOnly);
  if(field)step({enter:{comp:field.field.comp,value:{text:{s:'PATIENT_A_ONLY'}}}});
  step({click:{comp:'workspace.return'}});assert.deepEqual(state.captured,[]);assert.deepEqual(state.receipts,[]);
  const b=directory.facts.patientDirectory.patients.find(p=>p.id!==id&&p.mrn);assert.ok(b);
  step({click:{comp:'workspace.lookup'}});step({enter:{comp:'workspace.search',value:{text:{s:b.mrn}}}});
  const bOpen=render().workspace.flatMap(descend).find(n=>n.button?.comp.startsWith(`workspace.open|${b.id}|`));assert.ok(bOpen);
  step({click:{comp:bOpen.button.comp}});
  assert.deepEqual(render().banner,[],'B cannot paint A facts');assert.deepEqual(state.captured,[]);
  const stale=call('step',{...base,facts,state,event:{scroll:{screen:state.screen}}});assert.notEqual(stale.state.patientContext.bound,b.id);
  assert.ok(!JSON.stringify(render()).includes('PATIENT_A_ONLY'));
  // A removed workspace requirement is a real certification failure.
  if(release==='v1'&&persona==='P1'){
    const file=resolve(root,'.cache/content2/no-selection.json');writeFileSync(file,JSON.stringify({...program,patientSelection:false}));
    let rejected=false;try{execFileSync(`${root}/lean/.lake/build/bin/ehr`,['check','--spec',`releases/${release}/spec.json`,'--canonical',`releases/${release}/canonical.json`,'--program',file],{cwd:root,stdio:'pipe'});}catch(error){rejected=true;assert.match(error.stdout.toString(),/patientSelection/);}assert.ok(rejected);
    const reserved=structuredClone(program);reserved.screens[0].components.find(c=>c.kind==='banner').id='workspace.lookup';
    writeFileSync(file,JSON.stringify(reserved));rejected=false;
    try{execFileSync(`${root}/lean/.lake/build/bin/ehr`,['check','--spec',`releases/${release}/spec.json`,'--canonical',`releases/${release}/canonical.json`,'--program',file],{cwd:root,stdio:'pipe'});}catch(error){rejected=true;assert.match(error.stdout.toString(),/workspaceIds/);}assert.ok(rejected);
  }
  if(release==='v1')writeFileSync(resolve(root,`app/shots/realism/content2/patient-selection/${persona}-landing.json`),JSON.stringify(landing));
  cases.push({release,persona,rows:rows.length,rowSelection:true,nameOrMrnLookup:true,foreignFactsHidden:true,identityStillHuman:true});
}
const report={cases,comparisons:'facts/init/step/render-ui native and Wasm agree',mismatches:0,removedSelectionRejected:true,reservedNamespaceRejected:true};
mkdirSync(resolve(root,'docs/measurements/content2'), {recursive:true});
writeFileSync(resolve(root,'docs/measurements/content2/patient-selection-parity.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({cases:cases.length,mismatches:0}));
