/** Infrastructure attempts are audit metadata; they never select a clinical outcome. */
import { existsSync } from 'node:fs';
import { AsyncLocalStorage } from 'node:async_hooks';
import { BackendRequestError,InfrastructureError,InfrastructureExhaustedError } from './errors.js';
import { errorMessage, writeJson } from './util.js';
import path from 'node:path';
export interface InfrastructureRetry { op:string; persona:string|null; day:number|null; night:number|null; attempts:number; messages:string[] }
interface Context { dir:string; persona:string|null; day:number|null; night:number|null; record:(entry:InfrastructureRetry)=>Promise<void>; drift?:(callId:string)=>Promise<void> }
const contexts=new AsyncLocalStorage<Context>();
export function infrastructureContext<T>(context:Context,work:()=>Promise<T>):Promise<T>{return contexts.run(context,work);}
export function infrastructurePersona<T>(persona:string,work:()=>Promise<T>):Promise<T>{const context=contexts.getStore();return context?contexts.run({...context,persona},work):work();}
export async function replayDrifted(callId:string):Promise<void>{await contexts.getStore()?.drift?.(callId);}
export function infrastructureRetries():number{
 const value=Number(process.env['EHR_INFRA_RETRIES']??2);
 if(!Number.isSafeInteger(value)||value<0)throw new Error('EHR_INFRA_RETRIES must be a nonnegative integer');
 return value;
}
export async function retryInfrastructure<T>(op:string,work:()=>Promise<T>,allErrors=false):Promise<T>{
 const context=contexts.getStore(),messages:string[]=[];
 const retries=infrastructureRetries();
 for(let attempt=1;;attempt++){
  try{return await work();}catch(error){
   if(error instanceof InfrastructureExhaustedError || error instanceof BackendRequestError)throw error;
   if(error instanceof Error&&['ReplayDivergedError','ReplayMissingError'].includes(error.constructor.name))throw error;
   if(!allErrors&&!(error instanceof InfrastructureError))throw error;
   messages.push(errorMessage(error));
   if(context){
    const entry={op,persona:context.persona,day:context.day,night:context.night,attempts:attempt,messages:[...messages]};
    const prefix=path.join(context.dir,'infrastructure',`${context.persona??'run'}-${context.day??0}-${context.night??0}-${op.replace(/[^\w-]/g,'_')}-attempt-${attempt}`);
    let file=prefix+'.error.json',occurrence=1;
    while(existsSync(file))file=`${prefix}-${++occurrence}.error.json`;
    await writeJson(file,entry);
    await context.record(entry);
   }
   if(attempt>retries)throw new InfrastructureExhaustedError(`${op} failed after ${attempt} attempts: ${messages.join('; ')}`);
  }
 }
}
