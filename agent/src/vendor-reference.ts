import path from 'node:path';
import {existsSync} from 'node:fs';
import {programSchema} from './schema.js';
import {readJson} from './util.js';

/** Read the actual no-agent layout, including accepted release migrations. */
export function noAgentReference(runDir:string,maxDay=Infinity): import('./screen-gate.js').ReferenceProvider {
 return async input=>{
  const {readdir}=await import('node:fs/promises');
  const dir=path.join(runDir,'no-agent/days');
  if(!existsSync(dir))return null;
  for(const day of (await readdir(dir)).filter(d=>/^day-\d+$/.test(d) && Number(d.slice(4))<=maxDay).sort((a,b)=>Number(b.slice(4))-Number(a.slice(4)))) {
   for(const identity of [...new Set([input.program.id,input.program.owner])].filter(id=>/^[\w.-]+$/.test(id))) {
    const file=path.join(dir,day,`${identity}.program.json`);
    if(!existsSync(file))continue;
    const program=await readJson(file,programSchema);
    if(program.owner!==input.program.owner || program.role!==input.program.role || program.id!==input.program.id)throw Error('No-agent reference identity mismatch');
    if(program.specVersion===input.program.specVersion)return program;
   }
  }
  return null;
 };
}
