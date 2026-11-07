import {spawn} from 'node:child_process';
import {InfrastructureError} from './errors.js';
export interface NativeResult {code:number;stdout:string;stderr:string}
export const DEFAULT_NATIVE_TIMEOUT_MS=10*60*1000;
export function nativeTimeout(value=process.env['EHR_COMMAND_TIMEOUT_MS']):number{
 const ms=value===undefined?DEFAULT_NATIVE_TIMEOUT_MS:Number(value);
 if(!Number.isSafeInteger(ms)||ms<=0)throw new Error('EHR_COMMAND_TIMEOUT_MS must be a positive integer');
 return ms;
}
/** Kill the complete native process group, including inherited stdout pipes. */
export function runNative(binary:string,args:string[],opts:{timeoutMs?:number;input?:string}={}):Promise<NativeResult>{
 const timeoutMs=opts.timeoutMs??nativeTimeout();
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<=0)throw new Error('Native timeout must be positive');
 return new Promise((resolve,reject)=>{
  let failure:InfrastructureError|null=null,stdout='',stderr='';
  const child=spawn(binary,args,{detached:true,stdio:['pipe','pipe','pipe']});
  const stop=()=>{try{if(child.pid)process.kill(-child.pid,'SIGKILL');}catch{child.kill('SIGKILL');}};
  const timer=setTimeout(()=>{failure=new InfrastructureError(`ehr ${args[0]??''} timed out after ${timeoutMs}ms; native process group killed`);stop();},timeoutMs);
  child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
  child.stdout.on('data',(chunk:string)=>{stdout+=chunk;if(stdout.length>1<<30){failure=new InfrastructureError('Native stdout exceeded the 1GB limit');stop();}});
  child.stderr.on('data',(chunk:string)=>{stderr+=chunk;if(stderr.length>1<<30){failure=new InfrastructureError('Native stderr exceeded the 1GB limit');stop();}});
  child.on('error',error=>{clearTimeout(timer);reject(new InfrastructureError(`ehr ${args[0]??''}: ${error.message}`));});
  child.on('close',(code,signal)=>{clearTimeout(timer);if(failure){reject(failure);return;}if(signal){reject(new InfrastructureError(`ehr ${args[0]??''} terminated by ${signal}`));return;}resolve({code:code??1,stdout,stderr});});
  child.stdin.on('error',()=>{/* Native exit/timeout is reported by close. */});
  child.stdin.end(opts.input);
 });
}

/** Independent stateless JSON requests in one native serve process. EOF closes
 * the process; partial, reordered and errored batches never supply evidence. */
export async function runNativeJsonBatch(binary:string,requests:readonly {op:string;input:unknown}[],opts:{timeoutMs?:number}={}):Promise<unknown[]>{
 if(!requests.length)return [];
 const result=await runNative(binary,['serve'],{...opts,input:requests.map((request,id)=>JSON.stringify({id,...request})).join('\n')+'\n'});
 if(result.code!==0)throw new InfrastructureError(`ehr serve: exit ${result.code}: ${result.stderr.slice(0,2000)}`);
 try {
  const rows=result.stdout.trim().split('\n').map((line:string)=>{const value:unknown=JSON.parse(line);return value;});
  if(rows.length!==requests.length)throw new Error('incomplete native batch');
  return rows.map((row,index)=>{
   if(!row||typeof row!=='object'||!('id' in row)||row.id!==index||'error' in row||!('result' in row))throw new Error(`invalid native response at ${index}`);
   return row.result;
  });
 }catch(error){throw new InfrastructureError(`ehr serve batch: ${error instanceof Error?error.message:String(error)}`);}
}
