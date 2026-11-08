/** Targeted browser geometry for the paired completed tasks in a needs sample.
 * One task at a time; unchanged pointer traces have exactly zero pixel delta.
 * Ordinary pointerTravel conventions apply, with the pointer reset per task.
 * No screen audit, deployment, certificate or model call is performed. */
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import path from 'node:path';
import {browserGeometry} from '../agent/src/browser-geometry.js';
import {createEhr,type EhrClient} from '../agent/src/ehr.js';
import {attachGeometry} from '../agent/src/geometry.js';
import {dayResultSchema,programSchema,type DayResult} from '../agent/src/schema.js';
import {expandProgram} from '../agent/src/composites.js';
import {projectBoundedPoints} from '../app/src/dashboard/bounded-pointing.js';

const root=path.resolve(import.meta.dirname,'..');
const summaryFile=path.resolve(process.argv[2]??'');
const report=JSON.parse(await readFile(summaryFile,'utf8'));
const scratch=path.join(path.dirname(summaryFile),'pixels');
await mkdir(scratch,{recursive:true});
const load=async(file:string)=>JSON.parse(await readFile(file,'utf8'));
const save=async(file:string,data:unknown)=>writeFile(file,JSON.stringify(data,null,2)+'\n');
const native=createEhr({fake:false});
let current:{screens:Set<string>;targets:Set<string>;today:string;context:string;popups:{screen:string;id:string}[]}|undefined;
const rendering:EhrClient={mode:native.mode,binary:native.binary,
 check:i=>native.check(i),simulate:i=>native.simulate(i),minClicks:i=>native.minClicks(i),
 deploy:i=>native.deploy(i),runBatch:i=>native.runBatch(i),specExport:i=>native.specExport(i),
 renderScreens:async input=>{
  if(!native.binary||!current)throw new Error('missing native capture context');
  await mkdir(input.outDir,{recursive:true});
  const programFile=path.join(input.outDir,'program-input.tmp');
  await save(programFile,expandProgram(input.program));
  execFileSync(native.binary,['render-screens','--ui','--spec',path.join(root,'releases/v1/spec.json'),
    '--program',programFile,'--fhir',input.fhir,'--context',current.context,'--today',current.today,
    ...(input.workspace?['--schedule',path.join(path.dirname(input.fhir),'schedule.json'),'--world',input.workspace.worldDir]:[]),
    '--out',input.outDir],{cwd:root,timeout:120000,stdio:['ignore','ignore','pipe']});
  // Capture only the popup controls actually acknowledged in these two traces.
  // The public native renderer supplies their semantic trees; no coordinates are invented.
  if(current.popups.length){
    const call=(command:string,value:unknown)=>JSON.parse(execFileSync(native.binary!,[command],
      {cwd:root,input:JSON.stringify(value),encoding:'utf8',maxBuffer:64e6,timeout:30000}));
    const spec=await load(path.join(root,'releases/v1/spec.json'));
    const program=expandProgram(input.program),bundle=await load(input.fhir),context=await load(current.context);
    const projection=call('facts',{bundle,worldContext:bundle,context});
    const user={id:program.owner,role:program.role};
    const state=call('init',{spec,program,facts:projection.facts,user});
    const patient=projection.facts.sourcePatientId;
    if(typeof patient!=='string')throw new Error('Popup geometry requires a source patient');
    for(const popup of current.popups){
      const ui=call('render-ui',{spec,program,facts:projection.facts,display:projection.display,user,
        state:{...state,screen:popup.screen,popup:[popup.id,'geometry-probe'],
          patientContext:{...state.patientContext,patient,bound:patient,activity:'lookup'}}});
      await save(path.join(input.outDir,`${encodeURIComponent(popup.screen)}-popup-${encodeURIComponent(popup.id)}-needs.json`),ui);
    }
  }
  const candidates=[];
  for(const name of await readdir(input.outDir)){
    if(!name.endsWith('.json'))continue;
    const file=path.join(input.outDir,name),bytes=await readFile(file,'utf8'),ui=JSON.parse(bytes);
    if(current.screens.has(ui.screen))candidates.push({file,bytes,screen:ui.screen});
  }
  candidates.sort((a,b)=>a.bytes.length-b.bytes.length||a.file.localeCompare(b.file));
  const files=new Set<string>();
  for(const screen of current.screens){const found=candidates.find(c=>c.screen===screen);if(found)files.add(found.file);}
  for(const id of current.targets){
    // Workspace targets must retain their schedule-day sample. A smaller
    // clinical home variant can contain the same ID but cannot supply geometry
    // for an unselected workspace activity switch.
    const workspace=id.startsWith('workspace.')?candidates.find(c=>path.basename(c.file).startsWith('workspace-')&&c.bytes.includes(JSON.stringify(id))):undefined;
    const found=workspace??candidates.find(c=>c.file.includes(`-popup-${encodeURIComponent(id)}-`)&&c.bytes.includes(JSON.stringify(id)))??candidates.find(c=>c.bytes.includes(JSON.stringify(id)));
    if(found)files.add(found.file);
  }
  return [...files];
}};
// Native rendering is restricted to the sample's actual screens and targets.
const browser=browserGeometry(rendering,input=>[path.join(scratch,input.program.owner,'bundle.json')],path.join(scratch,'cache'));
const rows:Record<string,{scrollPx:number;mouseTravelPx:number;tasks:number;unavailable:string[]}>={};
const measurements=[];
try{
 for(const c of report.cases){
  const offRaw=await load(c.off),onRaw=await load(c.on),schedule=await load(c.schedule),program=programSchema.parse(await load(c.program));
  const manifest=await load(path.join(c.world,'manifest.json'));
  const indexFile=path.resolve(root,manifest.fixtures.index),index=await load(indexFile);
  const out=rows[c.persona]??={scrollPx:0,mouseTravelPx:0,tasks:0,unavailable:[]};
  for(const task of schedule.tasks){
   const before=offRaw.tasks.find((t:{task:string})=>t.task===task.id),after=onRaw.tasks.find((t:{task:string})=>t.task===task.id);
   if(!before?.completed||!after?.completed)continue;
   const scoped=(raw:typeof offRaw):DayResult=>{
    const offset=raw.trace.findIndex((t:{task:string})=>t.task===task.id);
    return dayResultSchema.parse({...raw,trace:raw.trace.filter((t:{task:string})=>t.task===task.id),tasks:raw.tasks.filter((t:{task:string})=>t.task===task.id),
      observations:raw.observations?.filter((o:{task:string})=>o.task===task.id).map((o:{traceIndex:number})=>({...o,traceIndex:o.traceIndex-offset}))});
   };
   const off=scoped(offRaw),on=scoped(onRaw);
   const pointerShape=(r:DayResult)=>JSON.stringify(r.trace.map(({screen,event,ops})=>({screen,event,ops})));
   if(pointerShape(off)===pointerShape(on)){
    measurements.push({task:task.id,persona:c.persona,day:c.day,scrollPx:0,mouseTravelPx:0,method:'identical pointer trace'});out.tasks++;continue;
   }
   const dir=path.join(scratch,program.owner);await mkdir(dir,{recursive:true});
   const fixture=index.patients.find((p:{id:string})=>p.id===task.patientId);if(!fixture)throw new Error('patient missing');
   const bundle=await load(path.resolve(path.dirname(indexFile),fixture.file));
   const resources=new Map<string,unknown>();
   for(const entry of bundle.entry){const r={...entry.resource};if(!r.id&&entry.fullUrl?.startsWith('urn:uuid:'))r.id=entry.fullUrl.slice(9);resources.set(`${r.resourceType}/${r.id}`,r);}
   for(const previous of schedule.tasks){
    if(previous.patientId===task.patientId)for(const r of previous.todayResources)resources.set(`${r.resourceType}/${r.id}`,r);
    if(previous.id===task.id)break;
   }
   await save(path.join(dir,'bundle.json'),{resourceType:'Bundle',entry:[...resources.values()].map(resource=>({resource}))});
   await save(path.join(dir,'schedule.json'),schedule);
   const offset=Math.floor((c.day-1)/5)*7+(c.day-1)%5;
   const today=new Date(Date.UTC(2026,10,2+offset)).toISOString().slice(0,10);
   const context=path.join(dir,'context.json');await save(context,{today,now:task.startMin,receipts:[],record:[]});
   const screens=new Set<string>(),targets=new Set<string>();
   const popups=new Map<string,{screen:string;id:string}>();
   for(const t of [...off.trace,...on.trace]){
    screens.add(t.screen);
    const event=t.event as Record<string,{comp?:string;alert?:string}>;
    for(const value of Object.values(event))if(value&&typeof value==='object'){
      if(value.comp&&!/^#+$/.test(value.comp))targets.add(value.comp);
      if(value.alert){targets.add(value.alert);if("ack" in event)popups.set(`${t.screen}:${value.alert}`,{screen:t.screen,id:value.alert});}
    }
   }
   for(const r of [off,on])for(const observation of r.observations??[]){
    if(observation.kind!=="miss")continue;
    screens.add(observation.place.screen);
    const remembered=expandProgram(program).screens.find(s=>s.id===observation.place.screen)?.components[observation.place.position];
    if(remembered)targets.add(remembered.id);
   }
   current={screens,targets,today,context,popups:[...popups.values()]};
   const atlas=await browser.provider({specVersion:'v1',program,schedule,worldDir:c.world});if(!atlas)throw new Error('no atlas');
   const aliases:Record<string,string[]>={};
   for(const screen of expandProgram(program).screens)for(const comp of screen.components){
    const kind=comp.kind as {alert?:{alert:string}};
    if(kind.alert)(aliases[kind.alert.alert]??=[]).push(comp.id);
   }
   const measured=[off,on].map(r=>attachGeometry(r,projectBoundedPoints(r,expandProgram(program),{...atlas,aliases})));
   await save(path.join(dir,`${task.id}-atlas.json`),atlas);
   const [a,b]=measured.map(r=>r.tasks[0]);
   if(!a||!b)throw new Error('missing task metric');
   const available=typeof a.scrollPx==='number'&&typeof b.scrollPx==='number'&&typeof a.mouseTravelPx==='number'&&typeof b.mouseTravelPx==='number';
   const row={task:task.id,persona:c.persona,day:c.day,scrollPx:available?b.scrollPx!-a.scrollPx!:null,mouseTravelPx:available?b.mouseTravelPx!-a.mouseTravelPx!:null,
    missingTargets:measured.flatMap(r=>r.geometry?.missingTargets??[]),states:atlas.states.length};
   measurements.push(row);
   if(available){out.scrollPx+=row.scrollPx!;out.mouseTravelPx+=row.mouseTravelPx!;out.tasks++;}else out.unavailable.push(task.id);
   console.log(JSON.stringify(row));
  }
 }
 for(const row of report.rows){const pixels=rows[row.persona];row.scrollPx=pixels?.unavailable.length?null:Math.round((pixels?.scrollPx??0)*100)/100;row.mouseTravelPx=pixels?.unavailable.length?null:Math.round((pixels?.mouseTravelPx??0)*100)/100;row.pixelTasks=pixels?.tasks??0;row.pixelUnavailable=pixels?.unavailable??[];}
 report.pixelStatus='Chromium 1440x900; targeted visited screens/targets; pointer reset per matched task; existing ordinal-miss projection; incomplete geometry remains unavailable';
 await save(summaryFile,report);await save(path.join(scratch,'measurements.json'),measurements);
}finally{await browser.close();}
