/** Explicit zero-model geometry verification; artifacts stay outside runs/. */
import path from 'node:path';
import {z} from 'zod';
import {mkdtemp,mkdir,readFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {fileHash,treeHash} from './fingerprints.js';
import {browserGeometry} from './browser-geometry.js';
import {createEhr} from './ehr.js';
import {createFakeEhr} from './fake/ehr-fake.js';
import {writeFakeWorld} from './fake/world.js';
import {ReplayLlm} from './backends/replay.js';
import {runDays} from './run.js';
import {loadWorld} from './world.js';
import {loadRelease,releaseForPersona} from './releases.js';
import {personalize} from './program.js';
import {geometryEhr} from './geometry.js';
import {recordingEhr} from './recording-ehr.js';
import {sumMetrics} from './observe.js';
import {REPO_ROOT,writeJson} from './util.js';
import {ScriptedLlm} from '../test/scripted.js';
const mode=process.argv[2]??'canonicals';
// Optional independent capture shards use the same real geometry and simulation path.
const selectedPersona=process.env.EHR_GEOMETRY_PERSONA;
const selectedRelease=process.env.EHR_GEOMETRY_RELEASE;
if(selectedPersona&&!['P1','P2','P3','P4','P5'].includes(selectedPersona))throw new Error('Invalid geometry persona');
if(selectedRelease&&!['v1','v2','v3'].includes(selectedRelease))throw new Error('Invalid geometry release');
const output=process.argv[3]??await mkdtemp(path.join(tmpdir(),'vgi-geometry-'));
if(path.resolve(output).startsWith(path.join(REPO_ROOT,'runs')+path.sep))throw new Error('Verification data must be outside runs');
await mkdir(output,{recursive:true});
const ehr=mode==='canonicals'?recordingEhr(createEhr({fake:false}),path.join(output,'native')):createFakeEhr();
const fixtureDir=path.join(REPO_ROOT,'fixtures/synthea');
const catalog=z.object({patients:z.array(z.object({file:z.string(),flags:z.object({pediatric:z.boolean(),surgical:z.boolean()})}))}).parse(JSON.parse(await readFile(path.join(fixtureDir,'index.json'),'utf8')));
const bundleFor=(persona:string)=>{const sample=persona==='P4'?catalog.patients.find(p=>p.flags.pediatric):persona==='P5'?catalog.patients.find(p=>p.flags.surgical):{file:'Ashly_Rippin_149fcc1f.json'};if(!sample)throw new Error(`No geometry bundle for ${persona}`);return path.join(fixtureDir,sample.file);};
const browser=browserGeometry(ehr,input=>[bundleFor(input.program.owner)],path.join(output,'cache'));
try{
 if(mode==='canonicals'){
  const world=await loadWorld(path.join(REPO_ROOT,'runs/world/2')),measured=geometryEhr(ehr,browser.provider,output),rows=[];
  for(const [release,day]of [['v1',2],['v2',4],['v3',8]] as const)for(const persona of ['P1','P2','P3','P4','P5']){
   if((selectedPersona&&persona!==selectedPersona)||(selectedRelease&&release!==selectedRelease))continue;
   const params=world.personas.get(persona);if(!params)throw new Error('Persona missing');
   const role=await releaseForPersona(await loadRelease(release,ehr),persona),program=personalize(role.canonical,params,world.userId(persona));
   const check=await ehr.check({specVersion:release,program,prev:program,canonical:role.canonical});if(check!=='ok')throw new Error(`Canonical check refused ${persona}/${release}`);
   const schedule=await world.schedule(day,persona);if(!schedule)throw new Error('Schedule missing');
   const result=await measured.simulate({specVersion:release,program,persona:params,schedule,worldDir:world.dir,seed:world.manifest.seed*1000+day});
   await writeJson(path.join(output,`${release}-${persona}.json`),result);
   if(result.geometry?.missingTargets.length||result.tasks.some(t=>typeof t.mouseTravelPx!=='number'||typeof t.scrollPx!=='number'))throw new Error(`Incomplete geometry ${persona}/${release}`);
   const metrics=sumMetrics(result.tasks);rows.push({persona,release,day,completed:metrics.completed,tasks:metrics.tasks,clicks:metrics.clicks,keystrokes:metrics.keystrokes,scrolls:metrics.scrolls,scrollPx:metrics.scrollPx,mouseTravelPx:metrics.mouseTravelPx,geometry:result.geometry});
   console.log(JSON.stringify(rows.at(-1)));
  }
  await writeJson(path.join(output,'baselines.json'),{mode:'REAL-native-zero-LLM',ehrSha256:ehr.binary?await fileHash(ehr.binary):null,worldSha256:await treeHash(world.dir),captureSha256:await fileHash(path.join(REPO_ROOT,'app/e2e/geometry-capture.ts')),viewport:[1440,900],bundles:Object.fromEntries(['P1','P2','P3','P4','P5'].map(p=>[p,path.basename(bundleFor(p))])),rows});
 }else if(mode==='fake-replay'){
  const world=await writeFakeWorld(path.join(output,'world'),{days:8,seed:7});
  const first=await runDays({days:8,worldDir:world,runsRoot:output,runId:'FAKE-geometry',llm:new ScriptedLlm(),ehr,geometry:browser.provider,log:console.log});
  const replay=await runDays({days:8,worldDir:world,runsRoot:output,runId:'REPLAY-geometry',llm:new ReplayLlm(first.dir),ehr,geometry:browser.provider,log:console.log});
  if(JSON.stringify(first.timelines)!==JSON.stringify(replay.timelines))throw new Error('Geometry replay differs');
  let measuredDays=0,tasks=0;
  for(const run of [first.dir,replay.dir])for(const day of await readdir(path.join(run,'days')))for(const file of await readdir(path.join(run,'days',day))){
   const result=JSON.parse(await readFile(path.join(run,'days',day,file),'utf8'));
   if(result.geometry?.missingTargets.length||result.tasks.some((t:{mouseTravelPx?:number;scrollPx?:number})=>typeof t.mouseTravelPx!=='number'||typeof t.scrollPx!=='number'))throw new Error(`Incomplete geometry: ${run}/${day}/${file}`);
   measuredDays++;tasks+=result.tasks.length;
  }
  const manifest=JSON.parse(await readFile(path.join(first.dir,'manifest.json'),'utf8'));
  await writeJson(path.join(output,'verification.json'),{mode:'FAKE/REPLAY',days:8,personas:5,geometrySource:'Chromium renderEhr on explicitly fake page trees; no clinical performance claim',equal:true,measuredDays,tasks,completeGeometry:true,status:manifest.status,llmCalls:0});
 }else throw new Error('Expected canonicals or fake-replay');
}finally{await browser.close();}
console.log(`Geometry verification: ${output}`);
