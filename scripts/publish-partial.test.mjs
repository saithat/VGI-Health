import { dataReason } from './test-data.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {collectPrefix,materialize,publishPartial,stableJson,swapped,finalizeStopped} from './publish-partial.mjs';
import {nativeProgramHash} from '../agent/src/certification.js';
const write=async(file,value)=>{await mkdir(path.dirname(file),{recursive:true});await writeFile(file,JSON.stringify(value));};
async function fixture(t){
 const root=await mkdtemp(path.join(tmpdir(),'partial-test-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const source=path.join(root,'runs/live'),world=path.join(root,'world');
 const canonical=JSON.parse(await readFile(new URL('../releases/v1/personas/P1.json',import.meta.url),'utf8'));
 const params=JSON.parse(await readFile(new URL('../runs/world/2/personas/P1.json',import.meta.url),'utf8'));
 const spec=JSON.parse(await readFile(new URL('../releases/v1/spec.json',import.meta.url),'utf8'));
 await write(path.join(world,'world.json'),{seed:1,days:3,personas:['P1','P2']});
 for(const p of ['P1','P2']){
  await write(path.join(world,'personas',`${p}.json`),{...params,id:p});
  for(let d=1;d<=3;d++)await write(path.join(world,`schedules/day-0${d}/${p}.json`),{day:d,persona:p,load:'normal',tasks:[]});
  for(let version=0;version<=2;version++){
   const program={...canonical,owner:p,version};
   await write(path.join(source,`programs/${p}/v${version}.json`),program);
   await write(path.join(source,`programs/${p}/v${version}.source.json`),program);
   await write(path.join(source,`certs/${p}/v${version}.json`),{specVersion:'v1',specHash:'fixture',programHash:nativeProgramHash(program),verdict:'ok',checkerVersion:'fixture',time:'2026-11-01T22:00:00Z'});
   await write(path.join(source,`certs/${p}/v${version}.build.json`),{fixture:true});
   await write(path.join(source,`certifications/${p}/v${version}/inputs.json`),{specVersion:'v1',program,prev:program,canonical:program,night:version||null});
   await write(path.join(source,`certifications/${p}/v${version}/spec.json`),spec);
  }
  await write(path.join(source,`programs/${p}/deployed.json`),{version:2});
  for(let d=1;d<=2;d++)await write(path.join(source,`days/day-0${d}/${p}.json`),{day:d,persona:p,programVersion:d-1,trace:[],tasks:[],floor:[],complaints:[],seed:1});
 }
 await write(path.join(source,'manifest.json'),{runId:'live',status:'running',days:3,personas:['P1','P2'],world,ehr:{mode:'real'}});
 // Reuse real decision shape; replace identity/version and clear call refs.
 const template=JSON.parse(await readFile(new URL('../runs/mock/decisions/night-01/P1.json',import.meta.url),'utf8'));
 for(const p of ['P1','P2'])await write(path.join(source,`decisions/night-01/${p}.json`),{...template,runId:'live',persona:p,night:1,versionBefore:0,versionAfter:1,llmCalls:[],deployed:{version:1,program:`programs/${p}/v1.json`,certificate:`certs/${p}/v1.json`}});
 return {root,source};
}
test('stable JSON refuses a half-written source',async t=>{
 const root=await mkdtemp(path.join(tmpdir(),'partial-json-'));t.after(()=>rm(root,{recursive:true,force:true}));const file=path.join(root,'incomplete.json');await writeFile(file,'{"partial":');await assert.rejects(stableJson(file),SyntaxError);
});
test('prefix includes full day 2 after full night 1 and excludes future staged versions', { skip: dataReason('runs/world/2/personas', 'runs/mock/decisions') },async t=>{
 const {root,source}=await fixture(t),before=await readFile(path.join(source,'manifest.json'));
 const prefix=await collectPrefix(source);assert.equal(prefix.daysCompleted,2);assert.equal(prefix.nightsCompleted,1);
 assert(!prefix.files.has('programs/P1/v2.json'));assert.equal(prefix.days.length,4);
 const stage=path.join(root,'stage');const result=await materialize(prefix,stage,'live-copy',source);
 assert.equal(result.status,'partial');assert.equal(result.note,'stopped/partial: 2 of 3 days');assert.equal(result.sourceRun,'live');assert.equal(JSON.parse(await readFile(path.join(stage,'decisions/night-01/P1.json'))).runId,'live-copy');assert.equal(JSON.parse(await readFile(path.join(stage,'decisions/night-01/P1.json'))).sourceRunId,'live');
 assert.equal(JSON.parse(await readFile(path.join(stage,'programs/P1/deployed.json'))).version,1);
 assert.deepEqual(await readFile(path.join(source,'manifest.json')),before);
 assert.equal((await collectPrefix(source)).signature,prefix.signature);
});
test('partial/missing persona day or night cannot enter the published prefix', { skip: dataReason('runs/world/2/personas', 'runs/mock/decisions') },async t=>{
 const {source}=await fixture(t);await writeFile(path.join(source,'days/day-02/P2.json'),'{');
 let prefix=await collectPrefix(source);assert.equal(prefix.daysCompleted,1);assert.equal(prefix.nightsCompleted,1);assert(!prefix.files.has('days/day-02/P1.json'));
 await rm(path.join(source,'decisions/night-01/P2.json'));prefix=await collectPrefix(source);assert.equal(prefix.nightsCompleted,0);assert(!prefix.files.has('decisions/night-01/P1.json'));assert(!prefix.files.has('programs/P1/v1.json'));
});
test('decision-before-pointer crash window is excluded; invalid certificate is never copied', { skip: dataReason('runs/world/2/personas', 'runs/mock/decisions') },async t=>{
 const {source}=await fixture(t);await write(path.join(source,'programs/P2/deployed.json'),{version:0});
 let prefix=await collectPrefix(source);assert.equal(prefix.nightsCompleted,0);
 await write(path.join(source,'programs/P2/deployed.json'),{version:2});
 const cert=path.join(source,'certs/P2/v1.json'),row=JSON.parse(await readFile(cert));await write(cert,{...row,programHash:'wrong'});
 prefix=await collectPrefix(source);assert.equal(prefix.nightsCompleted,0);assert(!prefix.files.has('programs/P2/v1.json'));
});
test('idempotent publisher returns an existing exact prefix without native work', { skip: dataReason('runs/world/2/personas', 'runs/mock/decisions') },async t=>{
 const {root,source}=await fixture(t),prefix=await collectPrefix(source);await materialize(prefix,path.join(root,'runs/copy'),'copy',source);for(const file of ['replay.json','trajectories/index.json','trajectories/verification.json','complexity.json'])await write(path.join(root,'runs/copy',file),{});
 const result=await publishPartial({root,run:source,into:'copy'});assert.equal(result.snapshotSha256,prefix.signature);
 await assert.rejects(publishPartial({root,run:source,into:'live'}),/Source equals destination/);
});

test('in-place publication retains all original incomplete data and rollback restores the source', { skip: dataReason('runs/world/2/personas', 'runs/mock/decisions') },async t=>{
 const {root,source}=await fixture(t),stage=path.join(root,'stage');await write(path.join(source,'pending/incomplete.json'),{original:true});await write(path.join(stage,'manifest.json'),{status:'partial'});
 const backup=await swapped(stage,source,true);assert.deepEqual(JSON.parse(await readFile(path.join(backup,'pending/incomplete.json'))),{original:true});assert.equal(JSON.parse(await readFile(path.join(source,'manifest.json'))).status,'partial');
 await assert.rejects(swapped(path.join(root,'missing-stage'),source,false));assert.equal(JSON.parse(await readFile(path.join(source,'manifest.json'))).status,'partial');
});
test('a day using an unrecorded future deployment is excluded', { skip: dataReason('runs/world/2/personas', 'runs/mock/decisions') },async t=>{
 const {source}=await fixture(t),file=path.join(source,'days/day-02/P2.json'),row=JSON.parse(await readFile(file));await write(file,{...row,programVersion:2});const prefix=await collectPrefix(source);assert.equal(prefix.daysCompleted,1);assert.match(prefix.stopReason,/preceding committed deployment/);
});
test('watch is read-only, skips unchanged prefixes and stops cleanly on SIGTERM', { skip: dataReason('runs/world/2/personas', 'runs/mock/decisions') },async t=>{
 const {root,source}=await fixture(t),prefix=await collectPrefix(source),target=path.join(root,'runs/copy');await materialize(prefix,target,'copy',source);
 for(const file of ['replay.json','trajectories/index.json','trajectories/verification.json','complexity.json'])await write(path.join(target,file),{});
 const before=await readFile(path.join(source,'manifest.json'));
 const {spawn}=await import('node:child_process');
 const child=spawn(process.execPath,['--import',path.resolve('agent/node_modules/tsx/dist/loader.mjs'),path.resolve('scripts/publish-partial.mjs'),'--repo-root',root,'--run',source,'--into','copy','--watch','--poll-ms','100'],{env:{...process.env,TMPDIR:tmpdir()},stdio:['ignore','pipe','pipe']});
 let output='',errors='';child.stdout.on('data',chunk=>{output+=chunk;if((output.match(/unchanged/g)??[]).length>=2)child.kill('SIGTERM');});child.stderr.on('data',chunk=>{errors+=chunk;});
 const timer=setTimeout(()=>child.kill('SIGKILL'),15000);const code=await new Promise(resolve=>child.once('close',resolve));clearTimeout(timer);
 assert.equal(code,0,errors);assert((output.match(/unchanged/g)??[]).length>=2);assert.deepEqual(await readFile(path.join(source,'manifest.json')),before);
 await assert.rejects(readFile(path.join(root,'runs/.publish-copy.lock')),/ENOENT/);
});

test('stopped finalization invokes conformance and current-build rebind, propagating refusals', { skip: dataReason('runs/world/2/personas', 'runs/mock/decisions') },async()=>{
 const calls=[],execute=async(binary,args,options)=>{calls.push({binary,args,options});return {stdout:'',stderr:''};};
 await finalizeStopped({root:'/repo',id:'stopped',binary:'/repo/lean/ehr',execute});assert.deepEqual(calls.map(c=>c.args),[['conformance','--run','stopped','--run-only','--jobs','5'],['--filter','agent','rebind','--run','stopped']]);assert(calls.every(c=>c.options.cwd==='/repo'&&c.options.env.EHR_FAKE==='0'&&c.options.env.EHR_BIN==='/repo/lean/ehr'));
 let count=0;await assert.rejects(finalizeStopped({root:'/repo',id:'stopped',binary:'/ehr',execute:async()=>{if(++count===2)throw new Error('CURRENT SCREEN GATE REFUSED');return {stdout:'',stderr:''};}}),/CURRENT SCREEN GATE REFUSED/);
});
test('an invalid deploy marker cannot make a staged night appear committed', { skip: dataReason('runs/world/2/personas', 'runs/mock/decisions') },async t=>{
 const {source}=await fixture(t);await write(path.join(source,'programs/P2/deployed.json'),{});const prefix=await collectPrefix(source);assert.equal(prefix.nightsCompleted,0);
});
