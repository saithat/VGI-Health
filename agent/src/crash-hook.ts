/** Test-only fault injection. Arming is explicit and forbidden for live models. */
import { appendFileSync } from 'node:fs';
let remaining:number|null=null;
let armed=false;
export function armCrashHook(backend:string):void{
 if(process.env['EHR_CRASH_TEST']!=='1')return;
 if(backend!=='scripted'&&backend!=='replay')throw new Error('Crash hook refuses live LLM backends');
 if(armed)return;
 const count=Number(process.env['EHR_CRASH_AFTER_WRITES']);
 if(!Number.isSafeInteger(count)||count<1)throw new Error('EHR_CRASH_AFTER_WRITES must be positive');
 remaining=count;armed=true;
}
export function durableWriteCompleted(file:string):void{
 const trace=process.env['EHR_CRASH_WRITE_TRACE'];
 if(trace)appendFileSync(trace,JSON.stringify({file})+'\n');
 if(remaining!==null&&--remaining===0)process.kill(process.pid,'SIGKILL');
}
