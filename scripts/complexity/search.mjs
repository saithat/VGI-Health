/** Reporting only. No result here is a clinical verdict or an adaptation gate. */
export const metricNames=['clicks','keystrokes','scrolls','scrollPx','mouseTravelPx','screens','requiredFields','popups'];
export const unavailable=(reason,detail='')=>({supported:true,status:'not-computed',reason,detail,message:`not computed (${reason})`,exact:false,space:null,keystrokeSpace:null,metrics:null,floor:null});
export class SearchLimit extends Error {}
export async function boundedSearch(perform,{timeoutMs}){
 const controller=new AbortController(),deadline=Date.now()+timeoutMs;let timer;
 try{
  const limited=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new SearchLimit('task time limit'));},timeoutMs);});
  const result=await Promise.race([perform({signal:controller.signal,remaining:()=>{const remaining=deadline-Date.now();if(remaining<=0)throw new SearchLimit('task time limit');return remaining;}}),limited]);
  if(result.status==='not-computed')return unavailable(result.reason||'search bound',result.detail);
  return {...result,status:'computed'};
 }catch(error){
  const bound=error instanceof SearchLimit||controller.signal.aborted||error?.killed||error?.name==='AbortError'||/exceeded bound|found no completion/.test(error?.stderr??'');
  return unavailable(bound?'search bound':'report error',String(error?.stderr??error?.message??error).slice(-2000));
 }finally{clearTimeout(timer);}
}
export function coverage(tasks){const computed=tasks.filter(t=>t.status!=='not-computed'&&t.metrics);return {expected:tasks.length,computed:computed.length,notComputed:tasks.length-computed.length};}
export function aggregate(tasks,field,sum){const rows=tasks.filter(t=>t.status!=='not-computed'&&t[field]).map(t=>t[field]);return rows.length?sum(rows):Object.fromEntries(metricNames.map(key=>[key,null]));}
