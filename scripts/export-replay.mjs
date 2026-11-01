#!/usr/bin/env node
// Same-task replay export; all clinical projections and simulation come from Lean.
import {historicalRunIds} from './historical-releases.mjs';
import {readFile,writeFile,readdir,mkdtemp,rm} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
export async function exportReplay({root=path.resolve('.'),dir,runId=path.basename(dir??''),binary=path.join(root,'lean/.lake/build/bin/ehr')}={}){
 dir??=path.join(root,'runs',runId);
 if(historicalRunIds.has(runId))throw new Error('Archived replay contracts are immutable');
 const {runNative}=await import('../agent/src/native-process.js');
 const {loadWorld}=await import('../agent/src/world.js');
 const {programSchema}=await import('../agent/src/schema.js');
 const manifest=await read(path.join(dir,'manifest.json')),world=await loadWorld(manifest.world);
 const scratch=await mkdtemp(path.join(tmpdir(),'replay-'));
 const command=async(args,input)=>{const r=await runNative(binary,args,{input});if(r.code!==0)throw new Error(`ehr ${args[0]}: ${r.stderr}`);return JSON.parse(r.stdout);};
 const contexts=[],tasks=[];
 try{
  const index=await read(path.join(root,'fixtures/synthea/index.json'));
  for(const persona of manifest.personas){
   const schedule=await world.schedule(1,persona);if(!schedule?.tasks.length)throw new Error(`Missing first task for ${persona}`);
   const original=schedule.tasks[0],input=path.join(scratch,`${persona}-schedule.json`);
   await writeFile(input,JSON.stringify({...schedule,tasks:[original]}));
   const {stdout}=await promisify(execFile)('lean',['-j6','--run',path.join(root,'scripts/ReplayContext.lean'),world.dir,input],{cwd:root,timeout:180000,maxBuffer:128e6,env:{...process.env,LEAN_NUM_THREADS:'6',LEAN_STACK_SIZE_KB:'65536',LEAN_PATH:path.join(root,'lean/.lake/build/lib/lean')}});
   const episode=JSON.parse(stdout),patient=index.patients.find(p=>p.id===original.patientId);if(!patient)throw new Error(`Missing fixture ${original.patientId}`);
   const base=await read(path.join(root,'fixtures/synthea',patient.file));
   let resources=base.entry.map(e=>({...e.resource,id:e.resource.id??e.fullUrl?.replace('urn:uuid:','')}));
   for(const r of original.todayResources)resources=[...resources.filter(x=>x.resourceType!==r.resourceType||x.id!==r.id),r];
   const bundle={resourceType:'Bundle',entry:resources.map(resource=>({resource}))};
   const projection=await command(['facts'],JSON.stringify({bundle,context:{today:'2026-11-02',now:original.startMin,receipts:[],record:[]}}));projection.facts=episode.facts;
   await writeFile(input,JSON.stringify({...schedule,tasks:[{...original,choices:episode.choices}]}));
   const versions=(await readdir(path.join(dir,'programs',persona))).filter(f=>/^v\d+\.json$/.test(f)).sort((a,b)=>Number(a.slice(1,-5))-Number(b.slice(1,-5)));
   for(const file of versions){
    const program=programSchema.parse(await read(path.join(dir,'programs',persona,file)));
    const spec=await read(path.join(dir,'certifications',persona,`v${program.version}`,'spec.json'));
    contexts.push({persona,version:program.version,specVersion:program.specVersion,spec,bundle:projection,user:{id:program.owner,role:program.role}});
   }
   const sides=[];
   for(const file of [versions[0],versions.at(-1)]){
    const program=await read(path.join(dir,'programs',persona,file));
    const result=await command(['simulate','--spec',path.join(dir,'certifications',persona,`v${program.version}`,'spec.json'),'--program',path.join(dir,'programs',persona,file),'--persona',path.join(world.dir,'personas',`${persona}.json`),'--schedule',input,'--world',world.dir,'--seed','1000004']);
    if(!result.tasks.every(t=>t.completed))throw new Error(`${persona} ${file}: replay episode did not complete`);
    sides.push({version:program.version,trace:result.trace.map(t=>({event:t.event,ops:t.ops,klmDeciSec:t.t-original.startMin*600}))});
   }
   tasks.push({persona,id:original.id,title:`${persona} · ${original.workflow} · same patient and episode`,before:sides[0],after:sides[1]});
  }
  await writeFile(path.join(dir,'replay.json'),JSON.stringify({mode:'wasm',contexts,tasks},null,2)+'\n');
  console.log(`Exported ${contexts.length} native contexts and ${tasks.length} same-task replays for ${runId}`);
  return {contexts:contexts.length,tasks:tasks.length};
 }finally{await rm(scratch,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const {register}=await import('../agent/node_modules/tsx/dist/esm/api/index.mjs');register();await exportReplay({runId:process.argv[2]??'run1-P3'});}
