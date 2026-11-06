#!/usr/bin/env node
/** Rebuild saved semantic screens from current Lean + fictional source charts. */
import {readFileSync,writeFileSync,readdirSync,mkdirSync,existsSync,mkdtempSync,copyFileSync,rmSync} from 'node:fs';
import {resolve,dirname,basename,join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..'),read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const native=(command,input)=>JSON.parse(execFileSync(resolve(root,'lean/.lake/build/bin/ehr'),[command],{input:JSON.stringify(input),maxBuffer:48e6,env:{...process.env,LEAN_NUM_THREADS:'4'}}));
const write=(file,value)=>{mkdirSync(dirname(resolve(root,file)),{recursive:true});writeFileSync(resolve(root,file),JSON.stringify(value,null,2)+'\n');};
const descend=node=>[node,...['presentation','section','columns','rowAction'].flatMap(k=>node[k]?.children?.flatMap(descend)??[]),...(node.tabs?.body?.flatMap(descend)??[])];
const index=[...read('fixtures/synthea/index.json').patients.map(p=>({...p,file:`fixtures/synthea/${p.file}`})),...read('fixtures/synthetic-hospital/index.json').patients.map(p=>({...p,file:`fixtures/synthetic-hospital/${p.file}`}))];
const targetFor=(persona,name)=>/landing|schedule|OR|home/.test(name)?null:/orders/i.test(name)?'w1Orders':/op-note/i.test(name)?'w6OpNote':/growth/i.test(name)?'w5Growth':/-mar(?:[.-]|$)/i.test(name)?'w4Mar':/triage/.test(name)?'w3Triage':/flowsheet/i.test(name)?'w4Flowsheet':/track-board/i.test(name)?null:/summary/.test(name)?'chartSummary':({P1:'chartSummary',P2:'w3Triage',P3:'w4Mar',P4:'w5Growth',P5:'w6OpNote'}[persona]);
export function screenFor(persona,target,activity) {
  const schedule=read(`runs/world/2/day-1-${persona}.json`),task=schedule.tasks.find(t=>t.workflow===({P1:'W1',P2:'W3',P3:'W4',P4:'W5',P5:'W6'}[persona]))??schedule.tasks[0];
  const patient=index.find(p=>p.id===task.patientId);if(!patient)throw new Error('Missing patient '+task.patientId);
  const bundle=read(patient.file),overlays=read('fixtures/clinical/overrides.json').entry;
  for(const change of overlays.filter(c=>c.source===patient.file)) {
    bundle.entry=bundle.entry.filter(e=>`${e.resource.resourceType}/${e.resource.id??e.fullUrl?.replace(/^urn:uuid:/,'')}`!==change.key&&(!change.sourceFullUrl||e.fullUrl!==change.sourceFullUrl));
    if(change.action!=='withdraw')bundle.entry.push({resource:change.resource});
  }
  for(const resource of task.todayResources){bundle.entry=bundle.entry.filter(e=>e.resource.id!==resource.id||e.resource.resourceType!==resource.resourceType);bundle.entry.push({resource});}
  const projection=native('facts',{bundle,context:{today:'2026-11-02',now:600,receipts:[],record:[['viewerPersona',persona]]},worldContext:read('runs/world/2/context/day-01.json')});
  if(projection.error)throw new Error(projection.error);
  const program=read(`releases/v3/personas/${persona}.json`),base={spec:read('releases/v3/spec.json'),program,facts:projection.facts,user:{id:persona,role:program.role}};
  let state=native('init',base);
  const step=event=>{const result=native('step',{...base,state,event});state=result.state;return result;};
  if(activity&&state.patientContext?.activity!==activity)step({click:{comp:`workspace.activity|${activity}`}});
  if(target){
    step({search:{query:projection.display.banner.mrn}});
    const workspace=native('render-ui',{...base,state,display:projection.display});
    const open=workspace.workspace.flatMap(descend).find(n=>n.button?.comp.startsWith(`workspace.open|${task.patientId}|`));
    if(!open)throw new Error(`${persona}: cannot select ${task.patientId}`);
    step({click:{comp:open.button.comp}});step({scroll:{screen:state.screen}});
    const queue=[[state.screen,[]]],seen=new Set([state.screen]);let path;
    for(const [at,events]of queue){if(at===target){path=events;break;}for(const c of program.screens.find(s=>s.id===at)?.components??[]){const next=c.kind.button?.action.goto?.screen;if(next&&!seen.has(next)){seen.add(next);queue.push([next,[...events,{click:{comp:c.id}}]]);}}}
    if(!path)throw new Error(`${persona}: no route to ${target}`);
    for(const event of path){const output=step(event);if(output.result!=='ok')throw new Error(JSON.stringify(output.result));}
  }
  return native('render-ui',{...base,state,display:projection.display});
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename)) {
  const liveSelectionOnly=process.argv.includes('--live-selection-only');
  if(!liveSelectionOnly) {
  const scratch=mkdtempSync(join(tmpdir(),'neutral-ui-fixtures-'));
  try {
    execFileSync('lake',['env','lean','--run','Ehr/Render/ExportTests.lean',scratch,`../${index[0].file}`],{cwd:resolve(root,'lean'),env:{...process.env,LEAN_NUM_THREADS:'4'},stdio:'inherit'});
    for(const name of ['w1Rooming','w1Orders','w1Sign','p1-alert','bad-sign'])copyFileSync(join(scratch,`${name}.json`),resolve(root,`app/src/fixtures/ui/${name}.json`));
  } finally {rmSync(scratch,{recursive:true,force:true});}
  const names={P1:['P1-schedule','P1-orders'],P2:['P2-track-board','P2-triage'],P3:['P3-MAR','P3-flowsheet'],P4:['P4-growth','P4-rooming'],P5:['P5-OR-schedule','P5-op-note']};
  for(const [persona,entries]of Object.entries(names))for(const name of entries)write(`app/src/fixtures/punch/${name}.json`,screenFor(persona,name==='P4-rooming'?'w5Rooming':targetFor(persona,name)));
  function refresh(dir){for(const name of readdirSync(resolve(root,dir),{withFileTypes:true})){const file=`${dir}/${name.name}`;if(name.isDirectory())refresh(file);else if(name.name.endsWith('.ui.json')){const persona=/P[1-5]/i.exec(name.name)?.[0]?.toUpperCase();if(!persona)continue;write(file,screenFor(persona,targetFor(persona,basename(file))));}}}
  refresh('app/shots/final');refresh('app/shots/realism/present/integration');
  }
  for(const name of readdirSync(resolve(root,'app/shots/realism/live-select')).filter(n=>n.endsWith('.png'))) {
    const [,persona,activity,view]=/^(P[1-5])-(.+)-(chart|landing)\.png$/.exec(name)??[];
    if(!persona)continue;
    const target=view==='landing'?null:({P1:'w1Rooming',P2:'w3Triage',P3:'w4Mar',P4:'w5Rooming',P5:'w6PreOp'}[persona]);
    write(`app/shots/realism/live-select/${name.replace(/\.png$/,'.ui.json')}`,screenFor(persona,target,activity));
  }
  console.log(liveSelectionOnly?'Regenerated saved live-selection semantic snapshots from current native interpreter.':'Regenerated clinician semantic fixtures from current native interpreter.');
}
