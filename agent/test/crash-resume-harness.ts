/** Deliberately excluded from Vitest (not *.test.ts): kills child processes for real. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { mkdtemp,readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { contentDigest,firstDifference } from '../src/content-digest.js';
import { prepareDeterminismFixture,runDeterminismFixture } from '../src/determinism-fixture.js';
import { rng,writeJson } from '../src/util.js';
const {values}=parseArgs({options:{points:{type:'string'},seed:{type:'string'},out:{type:'string'},child:{type:'string'},root:{type:'string'}}});
if(values.child){
 if(!values.root)throw new Error('Missing child root');
 await runDeterminismFixture(values.root,values.child,existsSync(path.join(values.root,values.child,'manifest.json')));
}else{
 const points=Number(values.points??8),seed=Number(values.seed??20261102);
 if(!Number.isSafeInteger(points)||points<1||!Number.isSafeInteger(seed))throw new Error('--points must be positive; --seed must be an integer');
 const root=values.out?path.resolve(values.out):await mkdtemp(path.join(tmpdir(),'vgi-crash-resume-'));
 await prepareDeterminismFixture(root);
 const trace=path.join(root,'writes.jsonl');
 const launch=(id:string,crash?:number,record=false)=>new Promise<{code:number|null;signal:NodeJS.Signals|null}>((resolve,reject)=>{
  const env={...process.env,EHR_CRASH_TEST:crash===undefined?'0':'1',...(crash===undefined?{}:{EHR_CRASH_AFTER_WRITES:String(crash)}),EHR_CRASH_WRITE_TRACE:record?trace:''};
  const child=spawn(process.execPath,['--import',path.resolve(import.meta.dirname,'../node_modules/tsx/dist/loader.mjs'),fileURLToPath(import.meta.url),'--child',id,'--root',root],{env,stdio:['ignore','pipe','pipe']});
  let output='';child.stdout.on('data',chunk=>{output=(output+chunk).slice(-10000);});child.stderr.on('data',chunk=>{output=(output+chunk).slice(-10000);});
  child.on('error',reject);child.on('exit',(code,signal)=>{if(code!==0&&signal!=='SIGKILL')reject(new Error(`${id}: ${output}`));else resolve({code,signal});});
 });
 await launch('reference',undefined,true);
 const manifest=JSON.parse(await readFile(path.join(root,'reference/manifest.json'),'utf8'));
 if(manifest.nightDeploys!==2)throw new Error('Fixture must exercise two nightly deployments');
 const reference=await contentDigest(path.join(root,'reference'),undefined,true);
 const writes=(await readFile(trace,'utf8')).trim().split('\n').map(line=>z.object({file:z.string()}).parse(JSON.parse(line)).file);
 // Pick within seeded phase strata; include publication, journal and final manifest boundaries.
 const relative=writes.map(file=>path.relative(path.join(root,'reference'),file));
 const nightStart=relative.findIndex(file=>file.startsWith('llm/'));
 const lastDayWrite=relative.reduce((last,file,index)=>file.startsWith('days/')?index:last,-1);
 const phases=[/^days\//,/^no-agent\//,/^llm\//,/^ehr\/.*check/,/^certifications\/.*\/v[1-9]\d*\//,/^pending\//,/^decisions\//,/^manifest\.json$/];
 const random=rng(seed),selected:number[]=[];
 for(let i=0;i<points;i++){
  const phase=phases[i%phases.length];
  const stratum=i%phases.length;
  const choices=relative.flatMap((file,index)=>phase?.test(file)&&(stratum!==3||index>=nightStart)&&(stratum!==7||index>lastDayWrite)?[index+1]:[]);
  if(!choices.length)throw new Error(`Reference has no durable writes for phase ${stratum}`);
  selected.push(choices[Math.floor(random()*choices.length)]??1);
 }
 const results:unknown[]=[];
 for(const [index,point]of selected.entries()){
  const id=`crash-${index+1}`;
  const first=await launch(id,point);if(first.signal!=='SIGKILL')throw new Error(`${id}: crash point ${point} was not reached`);
  let crashes=1;
  if(index%3===1){const second=await launch(id,Math.max(1,Math.floor(point/3)));if(second.signal==='SIGKILL')crashes++;}
  await launch(id);
  const digest=await contentDigest(path.join(root,id),undefined,true),difference=firstDifference(reference,digest);
  results.push({point,file:writes[point-1]?.replaceAll(path.join(root,'reference'),'<RUN>'),crashes,contentDigest:digest.contentDigest,difference});
  await writeJson(path.join(root,'crash-summary.json'),{seed,points,reference:reference.contentDigest,results});
  if(difference)throw new Error(`FAIL --seed ${seed} --points ${points}, point ${point}: ${difference}; ${root}`);
  console.log(`PASS point ${point}/${writes.length}: ${crashes} SIGKILL(s); final digest = reference`);
 }
 console.log(`PASS: ${points} seeded crash points, seed ${seed}; resumed digests = uninterrupted ${reference.contentDigest}. Artifacts: ${root}`);
}
