/** Compare completed sanity runs across renderer revisions. Only train physical
 * estimates are projected. A count drift is a harness failure, never normalized.
 */
import path from 'node:path';
import { z } from 'zod';
import { physicalKeys, physicalSaving } from './quality-context.js';
import { OFFLINE_LABEL, offlineRecordSchema, type OfflineRecord } from './quality-report.js';
import { readJson, writeJson } from './util.js';

export function compareSanityRecords(before:readonly OfflineRecord[],after:readonly OfflineRecord[]) {
  const old=before.filter(r=>r.arm==='sanity'),now=after.filter(r=>r.arm==='sanity');
  const ids=(rows:readonly OfflineRecord[])=>rows.map(r=>r.decisionId).sort();
  if(new Set(ids(old)).size!==old.length||new Set(ids(now)).size!==now.length||JSON.stringify(ids(old))!==JSON.stringify(ids(now)))throw new Error('Sanity decision coverage differs');
  for(const r of old){const current=now.find(n=>n.decisionId===r.decisionId);const ids=(row:OfflineRecord|undefined)=>row?.candidates.filter(c=>!c.candidate.seeded).map(c=>c.candidate.id).sort();if(JSON.stringify(ids(r))!==JSON.stringify(ids(current)))throw new Error(`Sanity candidate coverage differs: ${r.decisionId}`);}
  const candidates=old.flatMap(r=>r.candidates.filter(c=>!c.candidate.seeded).map(c=>{
    const current=now.find(n=>n.decisionId===r.decisionId),entry=current?.candidates.find(n=>n.candidate.id===c.candidate.id);
    if(!entry||c.check.status!==entry.check.status||Boolean(c.trainEstimate)!==Boolean(entry.trainEstimate)||JSON.stringify(c.trainEstimate?.days)!==JSON.stringify(entry.trainEstimate?.days))throw new Error(`Sanity candidate coverage/check/days differ: ${r.decisionId}/${c.candidate.id}`);
    for(const side of ['before','after'] as const)for(const key of ['clicks','keystrokes','tasks','completed'] as const)if(c.trainEstimate?.[side][key]!==entry.trainEstimate?.[side][key])throw new Error(`Unexplained count difference: ${r.decisionId}/${c.candidate.id}/${side}.${key}`);
    const a=physicalSaving(c.trainEstimate?.saving??null),b=physicalSaving(entry.trainEstimate?.saving??null);
    const changed=physicalKeys.filter(key=>a?.[key]!==b?.[key]);
    const signChanged=physicalKeys.filter(key=>typeof a?.[key]==='number'&&typeof b?.[key]==='number'&&(a?.[key]??0)*(b?.[key]??0)<0);
    return {decisionId:r.decisionId,id:c.candidate.id,beforeSaving:a,afterSaving:b,changed,signChanged};
  }));
  const timings=now.map(r=>r.wallTimeMs).sort((a,b)=>a-b);
  return {label:OFFLINE_LABEL,decisions:now.length,candidates:candidates.length,measured:candidates.filter(c=>c.afterSaving!==null).length,
    countDifferences:0,changed:candidates.filter(c=>c.changed.length),signChanged:candidates.filter(c=>c.signChanged.length),
    secondsPerDecision:{mean:timings.reduce((a,b)=>a+b,0)/Math.max(1,timings.length)/1000,median:(timings[Math.floor(timings.length/2)]??0)/1000,min:(timings[0]??0)/1000,max:(timings.at(-1)??0)/1000}};
}
export async function compareSanityRuns(beforeDir:string,afterDir:string) {
  const completed=z.object({status:z.literal('completed')});
  await readJson(path.join(beforeDir,'manifest.json'),completed);await readJson(path.join(afterDir,'manifest.json'),completed);
  const binding=z.object({originalWorldSha256:z.string(),fixturesSha256:z.string(),sourceDecisionsSha256:z.string(),sourceProgramsSha256:z.string(),sourceDaysSha256:z.string(),sourceCertificationsSha256:z.string(),sourceLlmSha256:z.string(),app:z.object({appSha256:z.string()}),ehrSha256:z.string().nullable()});
  const before=await readJson(path.join(beforeDir,'inputs/binding.json'),binding),after=await readJson(path.join(afterDir,'inputs/binding.json'),binding);
  if(JSON.stringify({...before,app:null,ehrSha256:null})!==JSON.stringify({...after,app:null,ehrSha256:null}))throw new Error('Frozen inputs differ between sanity runs');
  const result={...compareSanityRecords(await readJson(path.join(beforeDir,'records.json'),z.array(offlineRecordSchema)),await readJson(path.join(afterDir,'records.json'),z.array(offlineRecordSchema))),before:{app:before.app,ehrSha256:before.ehrSha256},after:{app:after.app,ehrSha256:after.ehrSha256}};
  await writeJson(path.join(afterDir,'density-savings-diffs.json'),result);return result;
}
