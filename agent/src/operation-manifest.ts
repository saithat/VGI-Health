/** Audit for standalone night/break commands, separate from the source run's manifest. */
import {existsSync} from 'node:fs';
import {z} from 'zod';
import path from 'node:path';
import type { JsonLlm } from './backends/types.js';
import { ReplayLlm } from './backends/replay.js';
import { InfrastructureError } from './errors.js';
import { infrastructureContext,type InfrastructureRetry } from './infrastructure.js';
import { writeJson,readJson,errorMessage } from './util.js';
export async function auditedOperation<T>(dir:string,llm:JsonLlm,persona:string|null,night:number|null,work:()=>Promise<T>):Promise<T>{
 const file=path.join(dir,'manifest.json');
 const previous=existsSync(file)?await readJson(file,z.object({createdAt:z.string(),driftedCallIds:z.array(z.string()).optional(),infrastructureRetries:z.array(z.custom<InfrastructureRetry>()).optional()})):null;
 const manifest:{status:string;backend:string;model:string;createdAt:string;replayAllowDrift:boolean;driftedCallIds:string[];infrastructureRetries:InfrastructureRetry[];error:string|null}={status:'running',backend:llm.name,model:llm.model,createdAt:previous?.createdAt??new Date().toISOString(),replayAllowDrift:llm instanceof ReplayLlm?llm.options.allowDrift??false:false,driftedCallIds:previous?.driftedCallIds??[],infrastructureRetries:previous?.infrastructureRetries??[],error:null};
 let writes=Promise.resolve();
 const save=()=>{writes=writes.then(()=>writeJson(path.join(dir,'manifest.json'),manifest));return writes;};
 await save();
 return infrastructureContext({dir,persona,day:null,night,record:async entry=>{manifest.infrastructureRetries.push(entry);await save();},drift:async id=>{manifest.driftedCallIds=[...new Set([...manifest.driftedCallIds,id])].sort();await save();}},async()=>{
  try{const result=await work();manifest.status='completed';await save();return result;}
  catch(error){manifest.status=error instanceof InfrastructureError?'infrastructure-error':'aborted';manifest.error=errorMessage(error);await save();throw error;}
 });
}
