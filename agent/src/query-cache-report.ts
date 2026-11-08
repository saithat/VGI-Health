/** Observed queries only; this output never becomes an agent prompt automatically. */
import { stableStringify,sha256 } from './program.js';
import type { OfflineRecord } from './quality-report.js';
const cacheable=new Set(['list_screens','get_screen','get_component','render_screen','screens','steps','targets','scroll_past','sequences','ledger','spec_rules']);
export function queryCacheReport(records:readonly OfflineRecord[]){
  const queries=new Map<string,{tool:string;arguments:unknown;calls:number;decisions:Set<string>;resultBytes:number;variants:Set<string>}>();
  for(const r of records)for(const e of r.toolEvents??[]){
    const key=stableStringify([e.tool,e.arguments]),row=queries.get(key)??{tool:e.tool,arguments:e.arguments,calls:0,decisions:new Set<string>(),resultBytes:0,variants:new Set<string>()};
    row.calls++;row.decisions.add(r.decisionId);row.resultBytes+=e.resultBytes;row.variants.add(sha256(stableStringify(e.result)));queries.set(key,row);
  }
  const frequent=[...queries.values()].sort((a,b)=>b.calls-a.calls||stableStringify([a.tool,a.arguments]).localeCompare(stableStringify([b.tool,b.arguments]))).map(q=>({...q,decisions:q.decisions.size,resultVariants:q.variants.size,variants:undefined}));
  const plan=frequent.filter(q=>cacheable.has(q.tool)).slice(0,8).map(q=>({tool:q.tool,arguments:q.arguments,calls:q.calls,meanResultBytes:Math.round(q.resultBytes/q.calls)}));
  const digests=records.filter(r=>r.arm==='E').map(r=>{
    let bytes=0;const items=plan.flatMap(q=>{
      const e=r.toolEvents?.find(e=>e.tool===q.tool&&stableStringify(e.arguments)===stableStringify(q.arguments));
      if(!e||bytes+e.resultBytes>24000||e.result&&typeof e.result==='object'&&'error' in e.result)return [];
      bytes+=e.resultBytes;return [{tool:e.tool,arguments:e.arguments,result:e.result,resultBytes:e.resultBytes}];
    });
    return {decisionId:r.decisionId,sample:r.sample,scope:'Only this persona/night/frozen program',bytes,items};
  });
  return {status:'proposal-only; owner review required; never auto-promoted',frequent,proposedCachedStartingDigest:{queryPlan:plan,scopedDigests:digests},
    complaints:[...new Set(records.flatMap(r=>r.toolLoop?.complaints??[]))].sort()};
}
