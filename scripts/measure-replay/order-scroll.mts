/** One-persona/day offline smoke: no recording, night agent or live stack. */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createEhr } from '../../agent/src/ehr.js';
import { geometryEhr, loadGeometry } from '../../agent/src/geometry.js';
import { LeanScreenChecker } from '../../agent/src/lean-screencheck.js';
import { attributeDay } from '../../agent/src/locality.js';
import { REPO_ROOT } from '../../agent/src/util.js';
import { taskSlots, replayWorkers } from '../../agent/src/replay-pool.js';
import { dayScheduleSchema, personaParamsSchema, programSchema } from '../../agent/src/schema.js';
const out=process.argv[2];
const policy=process.argv[3]??'expert';
if(!out || !['expert','bounded'].includes(policy))throw Error('Usage: tsx scripts/measure-replay/order-scroll.mts OUTPUT_DIR [expert|bounded]');
const directory=path.resolve(out);
await mkdir(directory,{recursive:true});
const read=async(file:string)=>JSON.parse(await readFile(path.join(REPO_ROOT,file),'utf8'));
const native=createEhr({fake:false,timeoutMs:600_000});
const checker=new LeanScreenChecker(native);
const replay={...native,async simulate(input:Parameters<typeof native.simulate>[0]){
 console.error(`Replaying ${input.policy}: ${input.scrollPlan?.length??0} planned reveals`);
 const result=await native.simulate(input);
 console.error(`Native replay complete: ${result.trace.length} events`);
 return result;
}};
const ehr=geometryEhr(replay,async input=>{
 console.error('Measuring admitted geometry');
 const atlas=await checker.geometry(input);
 console.error('Geometry measurement complete');return atlas;
},directory,true);
const input={specVersion:'v1',program:programSchema.parse(await read('releases/v1/personas/P2.json')),
 persona:personaParamsSchema.parse(await read('runs/world/2/personas/P2.json')),
 schedule:dayScheduleSchema.parse(await read('runs/world/2/day-1-P2.json')),worldDir:path.join(REPO_ROOT,'runs/world/2'),seed:1,
 lists:'paged' as const,policy:policy as 'expert'|'bounded'};
const day=await taskSlots.run(replayWorkers(),()=>ehr.simulate(input));
await writeFile(path.join(directory,'day.json'),JSON.stringify(day));
if(!day.geometry)throw Error('No measured geometry');
const atlas=await loadGeometry(path.join(directory,'geometry',`${day.geometry.programHash}.json`),day);
const rows=attributeDay(day,atlas).filter(row=>row.screen==='w3Orders');
const summary={policy,completed:day.tasks.filter(t=>t.completed).length,tasks:day.tasks.length,
 orderScrollPx:rows.reduce((n,r)=>n+(r.scrollPx??0),0),orderScrolls:rows.reduce((n,r)=>n+r.scrolls,0),
 klmDeciSec:day.tasks.reduce((n,t)=>n+t.klmDeciSec,0)};
await writeFile(path.join(directory,'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary));
