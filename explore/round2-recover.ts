/** Recover saved responses after the early runner compared JSON key ordering.
No model call is made. The original requests, responses and rejection files stay intact. */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { generate, validateCandidate } from './generator.js';
import { parsePoint } from './design.js';
import { programSchema, specSchema, jsonPatchOpSchema } from '../agent/src/schema.js';
import { stableStringify } from '../agent/src/program.js';
import { applyPatch } from '../agent/src/jsonpatch.js';
import { bindTasks } from './bindings.js';
import { write } from './evaluate.js';
const out=path.resolve(process.argv[2]??'runs/explore-round2');
if(!out.startsWith(path.resolve('runs')+path.sep))throw Error('Use runs/');
const read=async(f:string):Promise<unknown>=>JSON.parse(await readFile(f,'utf8'));
const baseline=programSchema.parse(await read('releases/v1/personas/P2.json'));
const spec=specSchema.parse(await read('releases/v1/spec.json'));
const previous=await read(path.join(out,'proposals.json')) as {calls:number;limit:number;serviceTier:string;results:{id:string;candidate:ReturnType<typeof generate>;origin:string;rejection?:string}[]};
if(previous.calls!==8)throw Error('Wait for the eight-call run to finish');
const corrections=[];
for(const row of previous.results){
 const record=await read(path.join(out,'operators',`${row.id}.json`)) as {response:{json:{point:unknown;programJson:string;patchJson:string}}};
 const v=record.response.json;
 if(stableStringify(parsePoint(v.point))!==stableStringify(row.candidate.point))continue;
 const candidate=generate(parsePoint(v.point),['W3'],baseline,spec);
 if(v.programJson)candidate.program=programSchema.parse(JSON.parse(v.programJson));
 if(v.patchJson)candidate.program=programSchema.parse(applyPatch(candidate.program,(JSON.parse(v.patchJson) as unknown[]).map(x=>jsonPatchOpSchema.parse(x))).doc);
 candidate.taskMapping=bindTasks(candidate.program,candidate.workflows,candidate.point);
 try{validateCandidate(candidate,baseline,spec);row.candidate=candidate;row.origin='codex-default-recovered';delete row.rejection;corrections.push(row.id);}
 catch(error){row.rejection=String(error);}
}
await write(path.join(out,'proposal-recovery.json'),{callsMade:0,reason:'Replace JSON serialization order comparison with structural sorted comparison',corrections});
await write(path.join(out,'proposals.json'),previous);
console.log(JSON.stringify({calls:previous.calls,recovered:corrections}));
