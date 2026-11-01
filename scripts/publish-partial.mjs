#!/usr/bin/env node
/** Publish immutable, complete prefixes. No model calls and no live source writes. */
import {readFile,readdir,mkdir,writeFile,rename,rm,open,stat,mkdtemp} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseArgs,promisify} from 'node:util';
import {execFile} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {exportReplay} from './export-replay.mjs';
import {indexTrajectories,verifySavedTrajectories} from './trajectories/index.mjs';
import {compute} from './complexity/compute.mjs';
const defaultRoot=path.resolve(import.meta.dirname,'..');
const exists=async p=>{try{await stat(p);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const pad=n=>String(n).padStart(2,'0');
const write=async(p,value)=>{await mkdir(path.dirname(p),{recursive:true});await writeFile(p,JSON.stringify(value,null,2)+'\n');};
const writeAtomic=async(p,value)=>{const pending=`${p}.${process.pid}.tmp`;await write(pending,value);await rename(pending,p);};
/** Two identical reads and valid JSON; the final snapshot fence catches later changes. */
export async function stableJson(file){
 const a=await readFile(file),b=await readFile(file);
 if(!a.equals(b))throw new Error(`Source changed while reading ${file}`);
 return {bytes:a,value:JSON.parse(a.toString())};
}
export async function collectPrefix(source){
 const {dayResultSchema,decisionRecordSchema,programSchema,certificateSchema}=await import('../agent/src/schema.js');
 const {assertCertified}=await import('../agent/src/certification.js');
 const {loadWorld}=await import('../agent/src/world.js');
 const manifest=(await stableJson(path.join(source,'manifest.json'))).value;
 if(!Array.isArray(manifest.personas)||!manifest.personas.length||manifest.personas.some(p=>!/^P[1-5]$/.test(p))||new Set(manifest.personas).size!==manifest.personas.length)throw new Error('Invalid source personas');
 if(!Number.isSafeInteger(manifest.days)||manifest.days<1||!['real','fake'].includes(manifest.ehr?.mode))throw new Error('Invalid source manifest');
 const world=await loadWorld(manifest.world),files=new Map(),versions=new Map(manifest.personas.map(p=>[p,new Set([0])])),days=[],decisions=[];
 const take=async(rel,map=files)=>{if(path.isAbsolute(rel)||rel.split(/[\\/]/).includes('..'))throw new Error('Unsafe recorded artifact path');const row=await stableJson(path.join(source,rel));map.set(rel,row.bytes);return row.value;};
 const version=async(persona,n,map)=>{
  const program=programSchema.parse(await take(`programs/${persona}/v${n}.json`,map));
  const cert=certificateSchema.parse(await take(`certs/${persona}/v${n}.json`,map));
  assertCertified(program,cert,program.specVersion,manifest.ehr.mode);
  if(manifest.buildBindingRequired){const binding=await take(`certs/${persona}/v${n}.build.json`,map);if(binding.current){if(path.basename(binding.current)!==binding.current)throw new Error('Unsafe build pointer');await take(`certs/${persona}/${binding.current}`,map);}}
  if(program.version!==n)throw new Error('Program version mismatch');
  const inputs=await take(`certifications/${persona}/v${n}/inputs.json`,map);
  const spec=await take(`certifications/${persona}/v${n}/spec.json`,map);
  if(inputs.specVersion!==program.specVersion||spec.version!==program.specVersion)throw new Error('Recorded contract mismatch');
  // Preserve build history, component source/bundles and every frozen certification input.
  for(const dir of [`programs/${persona}`,`certs/${persona}`,`certifications/${persona}/v${n}`]){
   for(const file of await readdir(path.join(source,dir))){
    if(!file.endsWith('.json'))continue;
    if(!dir.startsWith('certifications/')&&!new RegExp(`^v${n}(?:\\.|$)`).test(file))continue;
    await take(`${dir}/${file}`,map);
   }
  }
 };
 for(const p of manifest.personas)await version(p,0,files);
 const activeVersions=new Map(manifest.personas.map(p=>[p,0]));
 let daysCompleted=0,nightsCompleted=0,stopReason=null;
 const plannedDays=manifest.daysPlanned??manifest.days;
 for(let d=1;d<=plannedDays;d++){
  const batch=new Map(),rows=[];
  try{
   for(const p of manifest.personas){
    const row=dayResultSchema.parse(await take(`days/day-${pad(d)}/${p}.json`,batch));
    if(row.day!==d||row.persona!==p)throw new Error('Day identity mismatch');
    if(row.programVersion!==activeVersions.get(p))throw new Error('Day does not use the preceding committed deployment');
    const schedule=await world.schedule(d,p),ids=new Set(row.tasks.map(t=>t.task));
    if(!schedule||schedule.tasks.length!==row.tasks.length||ids.size!==row.tasks.length||schedule.tasks.some(t=>!ids.has(t.id))||row.trace.some(t=>!ids.has(t.task)))throw new Error('Incomplete day task set');
    await version(p,row.programVersion,batch);rows.push(row);
    for(const rel of [`baselines/day-${pad(d)}/${p}.json`,`baselines/day-${pad(d)}/${p}.program.json`,`no-agent/days/day-${pad(d)}/${p}.json`]){
     if(await exists(path.join(source,rel)))await take(rel,batch);else if(manifest.noAgentRequired)throw new Error(`Missing comparison arm: ${rel}`);
    }
   }
  }catch(error){if(d===1)throw new Error(`No complete first day: ${error.message}`);stopReason=error.message;break;}
  for(const [k,v]of batch)files.set(k,v);
  for(const row of rows)versions.get(row.persona).add(row.programVersion);
  days.push(...rows);daysCompleted=d;
  if(d===plannedDays)break;
  const night=new Map(),records=[];
  try{
   for(const p of manifest.personas){
    const record=decisionRecordSchema.parse(await take(`decisions/night-${pad(d)}/${p}.json`,night));
    if(record.runId!==manifest.runId||record.night!==d||record.persona!==p)throw new Error('Night identity mismatch');
    if(record.versionBefore!==activeVersions.get(p)||record.versionAfter<record.versionBefore)throw new Error('Decision deployment history is inconsistent');
    if(record.versionAfter!==record.versionBefore&&record.deployed?.version!==record.versionAfter)throw new Error('Decision lacks its deployment record');
    await version(p,record.versionBefore,night);await version(p,record.versionAfter,night);
    // Decision is written before the deploy pointer: wait for its commit marker.
    const pointer=(await stableJson(path.join(source,`programs/${p}/deployed.json`))).value;
    if(!Number.isSafeInteger(pointer.version)||pointer.version<record.versionAfter)throw new Error('Deployment has not committed');
    for(const call of record.llmCalls??[])await take(call.file,night);
    records.push(record);
   }
  }catch(error){stopReason=error.message;break;}
  for(const [k,v]of night)files.set(k,v);
  for(const row of records){activeVersions.set(row.persona,row.versionAfter);versions.get(row.persona).add(row.versionBefore);versions.get(row.persona).add(row.versionAfter);}
  decisions.push(...records);nightsCompleted=d;
 }
 // Geometry is content-addressed and immutable. Ignore in-progress receipts/files.
 const {stableStringify}=await import('../agent/src/program.js');
 const geometryHashes=new Set([...files].filter(([file])=>/^programs\/P[1-5]\/v\d+\.json$/.test(file)||/^baselines\/.+\.program\.json$/.test(file)).map(([,bytes])=>hash(Buffer.from(stableStringify(JSON.parse(bytes))))));
 if(await exists(path.join(source,'geometry')))for(const file of await readdir(path.join(source,'geometry'))){if(file.endsWith('.json')&&geometryHashes.has(file.split('.')[0]))try{await take(`geometry/${file}`);}catch{/* unused in-flight geometry is excluded */}}
 for(const [rel,bytes]of files)if(!(await readFile(path.join(source,rel))).equals(bytes))throw new Error(`Snapshot changed; retry: ${rel}`);
 const signature=hash(Buffer.from([...files].sort(([a],[b])=>a.localeCompare(b)).map(([name,bytes])=>`${name}:${hash(bytes)}`).join('\n')));
 return {manifest,files,days,decisions,versions,daysCompleted,nightsCompleted,stopReason,signature};
}
export async function materialize(prefix,stage,id,source){
 await mkdir(stage,{recursive:true});
 for(const [rel,bytes]of prefix.files){await mkdir(path.dirname(path.join(stage,rel)),{recursive:true});
  if(/^decisions\//.test(rel)){const record=JSON.parse(bytes);await write(path.join(stage,rel),{...record,sourceRunId:record.sourceRunId??record.runId,runId:id});}
  else await writeFile(path.join(stage,rel),bytes);
 }
 for(const p of prefix.manifest.personas){
  const version=Math.max(...prefix.versions.get(p));
  const pointer={version,program:`programs/${p}/v${version}.json`,certificate:`certs/${p}/v${version}.json`,build:`certs/${p}/v${version}.build.json`};
  for(const [key,suffix]of [['source','source'],['components','components']])if(await exists(path.join(stage,`programs/${p}/v${version}.${suffix}.json`)))pointer[key]=`programs/${p}/v${version}.${suffix}.json`;
  await write(path.join(stage,`programs/${p}/deployed.json`),pointer);
 }
 const note=`stopped/partial: ${prefix.daysCompleted} of ${prefix.manifest.daysPlanned??prefix.manifest.days} days`;
 const manifest={...prefix.manifest,runId:id,status:'partial',days:prefix.daysCompleted,daysPlanned:prefix.manifest.daysPlanned??prefix.manifest.days,daysCompleted:prefix.daysCompleted,nightsCompleted:prefix.nightsCompleted,sourceRun:prefix.manifest.runId,sourceDirectory:source,sourceStatus:prefix.manifest.status,warning:[prefix.manifest.warning,note].filter(Boolean).join(' · '),stopReason:prefix.stopReason,partialNote:note,note,publishedAt:new Date().toISOString(),snapshotSha256:prefix.signature};
 await write(path.join(stage,'manifest.json'),manifest);
 await write(path.join(stage,'publication.json'),{...manifest,files:[...prefix.files.keys()],sourceReadOnly:true});
 return manifest;
}
export async function swapped(stage,target,retain){
 const backup=`${stage}.previous`;let moved=false;
 if(await exists(target)){await rename(target,backup);moved=true;}
 try{await rename(stage,target);}catch(e){if(moved)await rename(backup,target);throw e;}
 if(moved&&!retain)await rm(backup,{recursive:true,force:true});
 return moved?backup:null;
}
export async function publishPartial({root=defaultRoot,run,into,inPlace=false,taskTimeoutMs=1000,searchBound=1000}={}){
 if(!run||(!into&&!inPlace)||into&&inPlace)throw new Error('Use --run <id-or-directory> with --into <id> OR --in-place (stopped source only)');
 root=path.resolve(root);const source=path.isAbsolute(run)?run:path.join(root,'runs',run),id=inPlace?path.basename(source):into;
 if(!/^[\w-]+$/.test(id))throw new Error('Invalid destination run id');
 const target=inPlace?source:path.join(root,'runs',id);
 if(inPlace&&path.dirname(source)!==path.join(root,'runs'))throw new Error('--in-place source must be in --repo-root/runs');
 if(target===source&&!inPlace)throw new Error('Source equals destination; use --in-place only after stopping the run');
 await mkdir(path.dirname(target),{recursive:true});
 const lock=path.join(path.dirname(target),`.publish-${id}.lock`);let handle;
 try{handle=await open(lock,'wx');}catch{throw new Error(`Publisher already active (remove stale lock only after checking its PID): ${lock}`);}
 await handle.writeFile(String(process.pid));
 if((await stat(path.dirname(target))).dev!==(await stat(tmpdir())).dev){await handle.close();await rm(lock,{force:true});throw new Error('TMPDIR and destination must share a filesystem for atomic publication');}
 const stage=await mkdtemp(path.join(tmpdir(),`publish-${id}-`));
 try{
  const prefix=await collectPrefix(source),old=await exists(path.join(target,'manifest.json'))?await json(path.join(target,'manifest.json')):null;
  const ready=await Promise.all(['replay.json','trajectories/index.json','trajectories/verification.json','complexity.json'].map(file=>exists(path.join(target,file))));
  if(!inPlace&&old?.runId===id&&old?.snapshotSha256===prefix.signature&&ready.every(Boolean)){
   for(const record of prefix.decisions){const saved=await json(path.join(target,`decisions/night-${pad(record.night)}/${record.persona}.json`));if(saved.runId!==id)throw new Error('Published snapshot decision belongs to another run');}
   console.log(`${id}: unchanged (${prefix.daysCompleted} days, ${prefix.nightsCompleted} nights)`);return old;}
  await rm(stage,{recursive:true,force:true});await materialize(prefix,stage,id,source);
  const binary=process.env.EHR_BIN??prefix.manifest.ehr.binary??path.join(root,'lean/.lake/build/bin/ehr');
  await exportReplay({root,dir:stage,runId:id,binary});
  await indexTrajectories({root,runDirectory:stage,runId:id,binary,contextCache:path.join(tmpdir(),'publish-context-cache',hash(Buffer.from(root))),leanDir:process.env.EHR_LEAN_DIR??path.join(root,'lean')});
  await compute({root,runDir:stage,canonical:false,releaseDirectory:'releases',taskTimeoutMs,searchBound});
  // The benchmark records source paths; translate the unpublished staging prefix.
  const complexity=await readFile(path.join(stage,'complexity.json'),'utf8');await writeFile(path.join(stage,'complexity.json'),complexity.replaceAll(path.relative(root,stage),path.relative(root,target)));
  const archive=await swapped(stage,target,inPlace);
  if(archive){console.log(`Original stopped run preserved: ${archive}`);for(const file of ['manifest.json','publication.json'])await writeAtomic(path.join(target,file),{...await json(path.join(target,file)),originalArchive:archive});}
  await verifySavedTrajectories(id,root);
  if(inPlace)await finalizeStopped({root,id,binary});
  console.log(`${id}: ${prefix.daysCompleted}/${prefix.manifest.days} days, ${prefix.nightsCompleted} nights; published partial (source ${prefix.manifest.status})`);
  return json(path.join(target,'manifest.json'));
 }finally{await rm(stage,{recursive:true,force:true});await handle.close();await rm(lock,{force:true});}
}
/** Called only after stopped-source publication; a refusal remains a failure. */
export async function finalizeStopped({root,id,binary,execute=promisify(execFile)}){
 const env={...process.env,EHR_FAKE:'0',EHR_BIN:binary,TMPDIR:process.env.TMPDIR};
 for(const args of [['conformance','--run',id,'--run-only','--jobs','5'],['--filter','agent','rebind','--run',id]]){
  const result=await execute('pnpm',args,{cwd:root,env,timeout:20*60*1000,maxBuffer:64e6});process.stdout.write(result.stdout);process.stderr.write(result.stderr);
 }
}
export async function main(args=process.argv.slice(2)){
 const {values}=parseArgs({args:args.filter(a=>a!=='--'),options:{run:{type:'string'},into:{type:'string'},'in-place':{type:'boolean'},watch:{type:'boolean'},'repo-root':{type:'string'},'poll-ms':{type:'string',default:'15000'},'task-timeout-ms':{type:'string',default:'1000'},'search-bound':{type:'string',default:'1000'}}});
 if(values.watch&&values['in-place'])throw new Error('--watch is read-only on its source; --in-place requires a stopped run');
 process.env.TMPDIR='/home/saithat/Projects/run-tmp';await mkdir(process.env.TMPDIR,{recursive:true});
 const options={root:values['repo-root']??defaultRoot,run:values.run,into:values.into,inPlace:values['in-place'],taskTimeoutMs:Number(values['task-timeout-ms']),searchBound:Number(values['search-bound'])};
 const poll=Number(values['poll-ms']);if(!Number.isSafeInteger(poll)||poll<100)throw new Error('--poll-ms must be at least 100');
 let stop=false;const done=()=>{stop=true;};process.once('SIGINT',done);process.once('SIGTERM',done);
 do{try{await publishPartial(options);}catch(error){if(!values.watch)throw error;console.error(`Not published: ${error.message}`);}if(values.watch&&!stop)await new Promise(resolve=>{const wake=()=>{clearTimeout(timer);process.removeListener('SIGINT',wake);process.removeListener('SIGTERM',wake);resolve();};const timer=setTimeout(wake,poll);process.once('SIGINT',wake);process.once('SIGTERM',wake);});}while(values.watch&&!stop);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await main();
