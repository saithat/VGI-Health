/** Current-measurer train savings, bound to the exact frozen inputs and renderer.
 * Never read validation/test metrics from this source, even though records contain them.
 */
import path from 'node:path';
import { z } from 'zod';
import { isMeasurementDay, trainEstimateWindow } from './protocol.js';
import { readJson } from './util.js';
import { physicalSaving, type MeasuredSavings } from './quality-context.js';
import { decisionRecordSchema, type DecisionRecord } from '../../app/src/dashboard/agent-evidence.js';

export const ledgerKey = (r:Pick<DecisionRecord,'night'|'persona'>,id:string) => `${r.night}/${r.persona}/${id}`;
const bindingSchema=z.object({
  originalWorldSha256:z.string(),fixturesSha256:z.string(),sourceDecisionsSha256:z.string(),
  sourceProgramsSha256:z.string(),sourceLlmSha256:z.string(),sourceDaysSha256:z.string(),sourceCertificationsSha256:z.string(),ehrSha256:z.string().nullable(),
  app:z.object({appSha256:z.string()}),
});
export type LedgerBinding=z.infer<typeof bindingSchema>;
export function recomputedSavings(history:readonly DecisionRecord[],records:readonly DecisionRecord[]):MeasuredSavings {
  const map:MeasuredSavings=new Map();
  for(const old of history)for(const candidate of old.candidates) {
    const key=ledgerKey(old,candidate.candidate.id);
    if(map.has(key))throw new Error(`Duplicate historical ledger candidate: ${key}`);
    // Seeded safety probes and migration fallback are explicitly unmeasured, not a
    // numeric fallback. The nightly sanity arm intentionally does not inject probes.
    if(candidate.candidate.seeded||old.mode!=='nightly') {
      if(candidate.trainEstimate!==null)throw new Error(`Historical measured candidate was not replayed: ${key}`);
      map.set(key,null);continue;
    }
    const matches=records.filter(r=>r.persona===old.persona&&r.night===old.night);
    const now=matches[0];
    if(matches.length!==1||!now||now.versionBefore!==old.versionBefore||now.specVersion!==old.specVersion||JSON.stringify(now.evidence.trainDays)!==JSON.stringify(old.evidence.trainDays))throw new Error(`Missing or inconsistent sanity decision for ${key}`);
    const candidates=now.candidates.filter(c=>!c.candidate.seeded&&c.candidate.id===candidate.candidate.id),entry=candidates[0];
    if(candidates.length!==1||!entry||(candidate.trainEstimate!==null&&entry.trainEstimate===null))throw new Error(`Missing historical candidate in --ledger-from: ${key}`);
    if(entry.trainEstimate&&(JSON.stringify(entry.trainEstimate.days)!==JSON.stringify(trainEstimateWindow(old.evidence.trainDays))||entry.trainEstimate.days.some(day=>isMeasurementDay(day)||day>old.night)||candidate.trainEstimate!==null&&JSON.stringify(entry.trainEstimate.days)!==JSON.stringify(candidate.trainEstimate.days)))throw new Error(`Non-training ledger days for ${key}`);
    map.set(key,physicalSaving(entry.trainEstimate?.saving??null));
  }
  return map;
}
export async function loadMeasuredSavings(dir:string,history:readonly DecisionRecord[],current:LedgerBinding) {
  await readJson(path.join(dir,'manifest.json'),z.object({status:z.literal('completed'),completed:z.number(),planned:z.number()}).refine(m=>m.completed===m.planned));
  const previous=await readJson(path.join(dir,'inputs/binding.json'),bindingSchema);
  if(JSON.stringify(previous)!==JSON.stringify(bindingSchema.parse(current)))throw new Error('--ledger-from was measured with different app/native/frozen inputs; rerun sanity');
  const records=await readJson(path.join(dir,'records.json'),z.array(decisionRecordSchema.omit({screenCheck:true}).extend({arm:z.literal('sanity')})));
  return recomputedSavings(history,records.map(r=>({...r,screenCheck:null})));
}
