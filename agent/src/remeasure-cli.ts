/** Separately labeled offline remeasurement of already certified layout choices. */
import {cp,mkdir,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {z} from 'zod';
import {createEhr} from './ehr.js';
import {browserGeometry} from './browser-geometry.js';
import {geometryEhr} from './geometry.js';
import {remeasureRun} from './remeasure.js';
import {simulationModesSchema} from './simulation-modes.js';
import {contentDigest,writeDayDigest,writeNightDigest} from './content-digest.js';
import {REPO_ROOT,resolveUserPath,readJson,writeJson} from './util.js';

const {values}=parseArgs({options:{source:{type:'string'},out:{type:'string'},world:{type:'string'},
  'clock-mode':{type:'string'},interruptions:{type:'string'}}});
if(!values.source||!values.out||!values.world)throw Error('Required: --source runs/<control> --out runs/<new> --world runs/world/<successor>');
const source=resolveUserPath(values.source),out=resolveUserPath(values.out),world=resolveUserPath(values.world);
if(path.dirname(out)!==path.join(REPO_ROOT,'runs')||out===source||existsSync(out))throw Error('Output must be a new recording directly under runs/');
const modes=simulationModesSchema.parse({clockMode:values['clock-mode']??'continuous',interruptions:values.interruptions??'realWork'});
const original=await readJson(path.join(source,'manifest.json'),z.object({days:z.number().int().positive(),personas:z.array(z.string()),ehr:z.object({mode:z.literal('real')})}).passthrough());
const manifest=original;
await mkdir(out,{recursive:true});
for(const item of ['programs','certs','certifications','decisions','days','baselines','no-agent']) {
  if(!existsSync(path.join(source,item)))throw Error(`Missing source ${item}`);
  await cp(path.join(source,item),path.join(out,item),{recursive:true});
}
await rm(path.join(out,'no-agent','geometry'),{recursive:true,force:true});
const label=modes.clockMode==='legacy'&&modes.interruptions==='fixedCost'
  ?'Matched successor tasks: fixed-cost interruptions / legacy task clock'
  :'Real work: shared workload clock / typed interruptions';
const metadata={...original,runId:path.basename(out),world,status:'remeasuring',simulationModes:modes,
  measurementLabel:label,offlineRemeasurement:{sourceRun:path.basename(source),recordedChoicesPreserved:true,modelCalls:0},
  createdAt:new Date().toISOString()};
await writeJson(path.join(out,'manifest.json'),metadata);
const ehr=createEhr({fake:false});
const fixture=await readJson(path.join(REPO_ROOT,'fixtures/synthea/index.json'),z.object({patients:z.array(z.object({file:z.string()})).min(1)}));
const first=fixture.patients[0];if(!first)throw Error('Missing fixture');
const geometry=browserGeometry(ehr,[path.join(REPO_ROOT,'fixtures/synthea',first.file)],path.join(process.env.TMPDIR??REPO_ROOT,'vgi-wave2-geometry-cache'));
try {await remeasureRun(out,geometryEhr(ehr,geometry.provider,out),modes,world);}
finally {await geometry.close();}
for(let day=1;day<=manifest.days;day++)await writeDayDigest(out,day,manifest.personas);
for(let night=1;night<manifest.days;night++)await writeNightDigest(out,night,manifest.personas);
await writeJson(path.join(out,'manifest.json'),{...metadata,status:'completed'});
const digest=await contentDigest(out);
await writeJson(path.join(out,'digest.json'),digest);
await writeJson(path.join(out,'manifest.json'),{...metadata,status:'completed',contentDigest:digest.contentDigest});
console.log(`Completed ${path.basename(out)}: ${label}`);
