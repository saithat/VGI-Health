/** Freeze the two original proposals before the promotion validation rerun. */
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const source=process.argv[2]??'runs/explore-round2',out=process.argv[3]??'runs/promote-round2';
if(!path.resolve(out).startsWith(path.resolve('runs')+path.sep))throw Error('Use ignored runs/');
await mkdir(out); // A completed or partially populated rerun must never be overwritten.
const raw=await readFile(`${source}/proposals.json`),original=JSON.parse(raw);
const results=original.results.filter(p=>['r2-007','r2-008'].includes(p.id)).map(p=>({
  ...p,candidate:{...p.candidate,point:{...p.candidate.point,tier:'proved'},sandbox:null},
}));
assert.equal(results.length,2);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
await writeFile(`${out}/proposals.json`,JSON.stringify({...original,calls:0,results,promotionBaseline:original.results.find(p=>p.id==='r2-001').candidate},null,2));
const cache=await readFile(`${source}/decision-cache.json`);
await writeFile(`${out}/decision-cache.json`,cache);
await writeFile(`${out}/promotion-origin.json`,JSON.stringify({source,proposalHash:hash(raw),probabilityCacheHash:hash(cache),ids:results.map(p=>p.id),
  originalCodexCalls:original.calls,newCodexCalls:0,
  model:'Exact-input frozen probabilities only; no endpoint, CPU inference or replacement scores',
  split:'Validation rerun of the existing 24 seeded profiles; prior held-out outcomes already exist and are not a new blind evaluation',
  changes:'Ordinary board/dated renderer and receipt namespace; original backing programs and clinical obligations retained'},null,2));
console.log(JSON.stringify({out,ids:results.map(p=>p.id)}));
