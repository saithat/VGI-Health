/** Measure the fixed reference on exactly the initial ED workload, without LLM calls. */
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {createEhr} from '../agent/src/ehr.js';
import {programSchema,personaParamsSchema,dayScheduleSchema} from '../agent/src/schema.js';
import {write} from './evaluate.js';
import type {Metrics} from './archive.js';
const out=path.resolve(process.argv[2]??'runs/explore-ed-first');
if(!out.startsWith(path.resolve('runs')+path.sep))throw Error('Expected ignored run directory');
const read=async(file:string):Promise<unknown>=>JSON.parse(await readFile(file,'utf8'));
const context=await read(path.join(out,'context.json')) as {worldDir:string;days:number[];release:string};
if(context.release!=='v1')throw Error('Initial ED baseline requires v1');
const program=programSchema.parse(await read('releases/v1/personas/P2.json'));
const persona=personaParamsSchema.parse(await read(path.join(context.worldDir,'personas/P2.json')));
const ehr=createEhr({binary:process.env['EHR_BIN']??path.resolve('lean/.lake/build/bin/ehr')});
const verdict=await ehr.check({specVersion:'v1',program,prev:program,canonical:program});
if(verdict!=='ok')throw Error('Baseline checker rejection');
const metrics:Metrics={tasks:0,completed:0,clicks:0,scrolls:0,keystrokes:0};
for(const day of context.days){
 const raw=dayScheduleSchema.parse(await read(path.join(context.worldDir,`schedules/day-${String(day).padStart(2,'0')}/P2.json`)));
 const schedule={...raw,tasks:raw.tasks.filter(t=>t.workflow==='W3')};
 const result=await ehr.simulate({specVersion:'v1',program,persona,schedule,worldDir:context.worldDir,seed:700+day});
 await write(path.join(out,'baseline',`day-${day}.json`),result);
 for(const t of result.tasks){metrics.tasks++;metrics.completed+=Number(t.completed);metrics.clicks+=t.clicks;metrics.scrolls+=t.scrolls;metrics.keystrokes+=t.keystrokes;}
}
await write(path.join(out,'baseline.json'),{program:'releases/v1/personas/P2.json',verdict,metrics,
 metricScope:'Native simulator estimates; same task/seed protocol as all candidates; no screen-gate claim for this baseline measurement'});
console.log(JSON.stringify(metrics));
