/** Separately labeled offline remeasurement of already certified layout choices. */
import {cp,mkdir,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {z} from 'zod';
import {createEhr} from './ehr.js';
import {runFingerprints} from './fingerprints.js';
import {loadWorld} from './world.js';
import {browserGeometry} from './browser-geometry.js';
import {geometryEhr} from './geometry.js';
import {rebindRecordedChoices,remeasureRun} from './remeasure.js';
import {simulationModesSchema} from './simulation-modes.js';
import {contentDigest,writeDayDigest,writeNightDigest} from './content-digest.js';
import {REPO_ROOT,readJson,writeJson} from './util.js';

const {values}=parseArgs({options:{source:{type:'string'},out:{type:'string'},world:{type:'string'},
  'clock-mode':{type:'string'},interruptions:{type:'string'}}});
if(!values.source||!values.out||!values.world)throw Error('Required: --source runs/<control> --out runs/<new> --world runs/world/<successor>');
const source=path.resolve(REPO_ROOT,values.source),out=path.resolve(REPO_ROOT,values.out),world=path.resolve(REPO_ROOT,values.world);
if(path.dirname(out)!==path.join(REPO_ROOT,'runs')||out===source||existsSync(out))throw Error('Output must be a new recording directly under runs/');
const modes=simulationModesSchema.parse({clockMode:values['clock-mode']??'continuous',interruptions:values.interruptions??'realWork'});
const original=await readJson(path.join(source,'manifest.json'),z.object({runId:z.string(),days:z.number().int().positive(),personas:z.array(z.string()),worldSeed:z.number().int(),contentDigest:z.string().optional(),ehr:z.object({mode:z.literal('real')})}).passthrough());
const manifest=original;
const generated=await loadWorld(world);
if(generated.manifest.seed!==manifest.worldSeed||generated.manifest.days<manifest.days||
  manifest.personas.some(p=>!generated.manifest.personas.includes(p)))throw Error('Successor world must preserve source seed, days and clinician set');
const ehr=createEhr({fake:false});
const fingerprints=await runFingerprints(ehr,world,REPO_ROOT);
await mkdir(out,{recursive:true});
for(const item of ['programs','certs','certifications','decisions','days','baselines','no-agent']) {
  if(!existsSync(path.join(source,item)))throw Error(`Missing source ${item}`);
  await cp(path.join(source,item),path.join(out,item),{recursive:true});
}
for(const item of ['llm','archives'])if(existsSync(path.join(source,item)))
  await cp(path.join(source,item),path.join(out,item),{recursive:true});
await rebindRecordedChoices(out,original.runId,path.basename(out),manifest.days,manifest.personas);
await rm(path.join(out,'no-agent','geometry'),{recursive:true,force:true});
const clockLabel=modes.clockMode==='legacy'?'legacy task clock':'shared workload clock';
const workLabel=modes.interruptions==='fixedCost'?'fixed-cost interruptions':'typed interruption work';
const label=`Offline matched tasks: ${clockLabel} / ${workLabel}`;
const metadata={...original,runId:path.basename(out),world,status:'remeasuring',mode:'OFFLINE',
  completionProtocol:'atomic-prefix-v1',parallel:false,personaWorkers:1,screenWorkersPerPersona:1,simulationModes:modes,
  warning:`Offline remeasurement of recorded layouts from ${path.basename(source)}; decisions and prompts are historical.`,
  measurementLabel:label,fingerprints,offlineRemeasurement:{sourceRun:path.basename(source),sourceContentDigest:manifest.contentDigest,recordedChoicesPreserved:true,modelCalls:0},
  createdAt:new Date().toISOString()};
await writeJson(path.join(out,'manifest.json'),metadata);
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
