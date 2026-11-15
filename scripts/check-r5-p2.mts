// Archive-backed regression for unchanged P2 v0 with day-1 workspace order rows.
// Read-only: outputs and current screen receipts go only to --out.
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {parseArgs} from 'node:util';
import assert from 'node:assert/strict';
import {createEhr} from '../agent/src/ehr.ts';
import {createScreenChecker} from '../agent/src/screencheck.ts';
import {programSchema,dayScheduleSchema} from '../agent/src/schema.ts';
import {geometryCacheKey} from '../agent/src/geometry.ts';
import {sha256} from '../agent/src/program.ts';
import {writeJson} from '../agent/src/util.ts';
import {acquireBrowserLock} from './browser-heavy-lock.mjs';
const {values}=parseArgs({options:{out:{type:'string'}}});
if(!values.out || !process.env.TMPDIR)throw Error('Set disk-backed TMPDIR and use --out <scratch>');
const root=resolve(import.meta.dirname,'..'),out=resolve(values.out);
await mkdir(out,{recursive:true});
const read=async(file:string)=>JSON.parse(await readFile(file,'utf8'));
const program=programSchema.parse((await read(join(root,'runs/core-10day/certifications/P2/v0/inputs.json'))).program);
const schedule=dayScheduleSchema.parse(await read(join(root,'runs/world/2/schedules/day-01/P2.json')));
const worldDir=join(root,'runs/world/2');
const key=(geometryCacheKey(program)+':'+sha256(JSON.stringify([worldDir,schedule]))).replaceAll(':','.');
const lock=await acquireBrowserLock();
try {
 const checker=createScreenChecker(createEhr({fake:false}),{artifactsDir:out,workers:4});
 const trials=[];
 for(const trial of ['first','repeat']) {
  const start=performance.now();
  const result=await checker.check({specVersion:'v1',program,referenceProgram:program,schedule,worldDir});
  const elapsedMs=Math.round(performance.now()-start);
  const policy=await read(join(out,'P2/v0',key,'screen-policy.json'));
  assert.equal(result.status,'pass',result.message);
  assert.equal(policy.densityReference.limits.w3OrderSets,61);
  assert.equal(Math.max(...policy.density.filter((s:{screen:string})=>s.screen==='w3OrderSets').map((s:{maximum:number})=>s.maximum)),61);
  assert.deepEqual(policy.densityFailures,[]);
  if(trial==='repeat')assert.equal(policy.densityReference.measured,0);
  const measured={trial,elapsedMs,reference:policy.densityReference,cache:policy.cache,result};
  trials.push(measured);console.log(JSON.stringify(measured));
  await writeJson(join(out,'timings.json'),trials);
 }
} finally {lock.release();}
