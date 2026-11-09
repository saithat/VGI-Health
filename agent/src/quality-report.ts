import { queryCacheReport } from './query-cache-report.js';
import { toolBudgetSchema, toolEventSchema, type ToolEvent, type ToolBudget } from './tool-session.js';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { decisionRecordSchema, type DecisionRecord } from '../../app/src/dashboard/agent-evidence.js';
import { measuredLedger, physicalSaving, sameIdea, zeroEffect, zeroOrWorse, type MeasuredSavings } from './quality-context.js';
import { recomputedSavings } from './quality-ledger.js';
import { rng, writeJson } from './util.js';
import { rlmLoopSchema, type RlmLoopStats } from './rlm/stats.js';
import { harnessLoopSchema, type HarnessLoopStats } from './harness/stats.js';

export const OFFLINE_LABEL = 'offline, screen check skipped, simulator only';
export type QualityArm = 'A' | 'B' | 'C' | 'D' | 'E' | 'R' | 'H' | 'sanity';
export interface TokenCounts { input: number | null; output: number | null; cachedInput: number | null; source: 'backend' | 'recorded-reference' | 'unavailable' }
export type OfflineRecord = Omit<DecisionRecord,'screenCheck'> & {
  toolLoop?:{budget:ToolBudget;calls:number;checks:number;estimates:number;wallMs:number;inputTokens:number;outputTokens:number;visibleTokenUpperBound:number;exceeded:string|null;tally:Record<string,number>;complaints:string[]}|undefined;
  toolEvents?:ToolEvent[]|undefined;
  rlmLoop?:RlmLoopStats|undefined;
  harnessLoop?:HarnessLoopStats|undefined;
  effects?:{train:number|null;netTrain:number|null;validation:number|null;structuralDistance:number|null} | undefined;
  offline:true; screenCheck:'skipped'; label:typeof OFFLINE_LABEL; decisionId:string; arm:QualityArm; sample:number;
  tokens:TokenCounts; callCount:number; wallTimeMs:number; frozenInputs:string;
  queries?:{count:number;tally:Record<string,number>} | undefined;
  repeatedMeasuredBad:number; proposedCandidates:number;
};
export const offlineRecordSchema = decisionRecordSchema.omit({screenCheck:true}).extend({
  toolEvents:z.array(toolEventSchema).optional(),
  rlmLoop:rlmLoopSchema.optional(),
  harnessLoop:harnessLoopSchema.optional(),
  toolLoop:z.object({budget:toolBudgetSchema,calls:z.number(),checks:z.number(),estimates:z.number(),wallMs:z.number(),inputTokens:z.number(),outputTokens:z.number(),visibleTokenUpperBound:z.number(),exceeded:z.string().nullable(),tally:z.record(z.string(),z.number()),complaints:z.array(z.string())}).optional(),
  effects:z.object({train:z.number().nullable(),netTrain:z.number().nullable(),validation:z.number().nullable(),structuralDistance:z.number().nullable()}).optional(),
  offline:z.literal(true),screenCheck:z.literal('skipped'),label:z.literal(OFFLINE_LABEL),decisionId:z.string(),
  arm:z.enum(['A','B','C','D','E','R','H','sanity']),sample:z.number().int().positive(),
  tokens:z.object({input:z.number().nullable(),output:z.number().nullable(),cachedInput:z.number().nullable(),source:z.enum(['backend','recorded-reference','unavailable'])}),
  queries:z.object({count:z.number().int().nonnegative(),tally:z.record(z.string(),z.number().int().nonnegative())}).optional(),
  callCount:z.number(),wallTimeMs:z.number(),frozenInputs:z.string(),repeatedMeasuredBad:z.number(),proposedCandidates:z.number(),
});
const mean = (xs: readonly number[]) => xs.reduce((a,b)=>a+b,0)/Math.max(1,xs.length);
export function decisionMetrics(r: OfflineRecord) {
  const candidates=r.candidates.filter(e=>!e.candidate.seeded);
  return {
    effects:r.effects??null,
    toolLoop:r.toolLoop??null,rlmLoop:r.rlmLoop??null,harnessLoop:r.harnessLoop??null,
    gateRepairs:r.certification.attempts.filter(a=>a.source==='repair').length,
    preSubmitFailures:(r.toolEvents??[]).filter(e=>e.tool==='check_patch'&&e.result&&typeof e.result==='object'&&'status' in e.result&&e.result.status==='fail').length,
    trainValidationGap:r.effects?.train!=null&&r.effects.validation!=null?r.effects.train-r.effects.validation:null,
    decisionId:r.decisionId,arm:r.arm,sample:r.sample,accepted:Number(r.validation.accepted),
    validationClicks:r.validation.accepted?r.validation.replay?.saving.clicks??0:0,
    validationScrolls:r.validation.accepted?r.validation.replay?.saving.scrolls??0:0,
    zeroEffect:candidates.filter(e=>zeroEffect(physicalSaving(e.trainEstimate?.saving??null))).length,
    measured:candidates.filter(e=>e.trainEstimate!==null).length,candidates:candidates.length,
    repeatedMeasuredBad:r.repeatedMeasuredBad,noChange:Number(r.outcome==='no-change'),
    checkerPassed:candidates.filter(e=>e.check.status==='pass').length,
    checkerFailed:candidates.filter(e=>e.check.status==='fail').length,
    zeroEffectShare:candidates.length?candidates.filter(e=>zeroEffect(physicalSaving(e.trainEstimate?.saving??null))).length/candidates.length:null,
    repeatMeasuredBadShare:candidates.length?r.repeatedMeasuredBad/candidates.length:null,
    checkerPassRate:candidates.length?candidates.filter(e=>e.check.status==='pass').length/candidates.length:null,
    queries:r.queries??{count:0,tally:{}},tokens:r.tokens,calls:r.callCount,wallTimeMs:r.wallTimeMs,
  };
}
export function repetitionCount(record: DecisionRecord, history: readonly DecisionRecord[], measured:Readonly<MeasuredSavings>): number {
  const ledger=measuredLedger(history,record.persona,record.night,measured).filter(e=>!e.seeded && zeroOrWorse(e.trainDaySaving));
  return record.candidates.filter(e=>!e.candidate.seeded && ledger.some(old=>sameIdea(old,e.candidate))).length;
}

/** A long sanity job can finish under an older reporter. Regeneration derives
 * repeats from its own measured train estimates, never historical saved values.
 * Partial sanity selections lack complete history; leave their metadata alone.
 */
export function refreshSanityRepetitions(records:readonly OfflineRecord[],history:readonly DecisionRecord[]) {
  if(!records.length||records.some(r=>r.arm!=='sanity')||records.length!==history.filter(r=>r.mode==='nightly').length)return records;
  const measured=recomputedSavings(history,records.map(r=>({...r,screenCheck:null})));
  return records.map(r=>({...r,repeatedMeasuredBad:repetitionCount({...r,screenCheck:null},history,measured)}));
}

/** Average samples within decision, then resample whole decisions (never individual samples). */
export function pairedComparison(records: readonly OfflineRecord[], lower: QualityArm, upper: QualityArm, iterations=10000, seed=20261103) {
  const ids=[...new Set(records.map(r=>r.decisionId))].sort();
  const pairs=ids.flatMap(id=>{
    const a=records.filter(r=>r.decisionId===id&&r.arm===lower).map(decisionMetrics);
    const b=records.filter(r=>r.decisionId===id&&r.arm===upper).map(decisionMetrics);
    if(!a.length||!b.length)return [];
    return [{id,rate:mean(b.map(r=>r.accepted))-mean(a.map(r=>r.accepted)),
      clicks:mean(b.map(r=>r.validationClicks))-mean(a.map(r=>r.validationClicks)),
      scrolls:mean(b.map(r=>r.validationScrolls))-mean(a.map(r=>r.validationScrolls))}];
  });
  if(!pairs.length)return {comparison:`${upper}−${lower}`,decisions:0,status:'not evaluated' as const,beats:null};
  const random=rng(seed),bootstrap:number[]=[];
  for(let i=0;i<iterations;i++) bootstrap.push(mean(pairs.map(()=>pairs[Math.floor(random()*pairs.length)]?.rate??0)));
  bootstrap.sort((a,b)=>a-b);
  const ci=[bootstrap[Math.floor(iterations*0.025)]??0,bootstrap[Math.min(iterations-1,Math.floor(iterations*0.975))]??0];
  const rate=mean(pairs.map(p=>p.rate)),clicks=pairs.reduce((n,p)=>n+p.clicks,0),scrolls=pairs.reduce((n,p)=>n+p.scrolls,0);
  return {comparison:`${upper}−${lower}`,decisions:pairs.length,status:'evaluated' as const,rateDifference:rate,rate95:ci,
    validationClicksDifference:clicks,validationScrollsDifference:scrolls,beats:rate>=0.1-1e-12&&clicks>=0&&scrolls>=0&&(ci[0]??0)>0,
    bootstrap:{iterations,seed,unit:'decision; samples averaged within decision'}};
}

export function qualityReport(records: readonly OfflineRecord[]) {
  const rows=records.map(decisionMetrics);
  const arms=[...new Set(records.map(r=>r.arm))].sort().map(arm=>{
    const own=rows.filter(r=>r.arm===arm),count=own.reduce((n,r)=>n+r.candidates,0);
    const decisions=[...new Set(own.map(r=>r.decisionId))];
    const avg=(f:(r:typeof own[number])=>number)=>mean(decisions.map(id=>mean(own.filter(r=>r.decisionId===id).map(f))));
    const total=(f:(r:typeof own[number])=>number)=>decisions.reduce((n,id)=>n+mean(own.filter(r=>r.decisionId===id).map(f)),0);
    const tokens=(key:'input'|'output'|'cachedInput')=>own.every(r=>r.tokens[key]!==null)?total(r=>r.tokens[key]??0):null;
    const gap=own.flatMap(r=>r.trainValidationGap===null?[]:[r.trainValidationGap]);
    return {arm,checkCalls:own.reduce((n,r)=>n+(r.toolLoop?.checks??r.rlmLoop?.checks??r.harnessLoop?.checks??0),0),estimateCalls:own.reduce((n,r)=>n+(r.toolLoop?.estimates??r.rlmLoop?.estimates??r.harnessLoop?.estimates??0),0),
      gateRepairs:own.reduce((n,r)=>n+r.gateRepairs,0),
      repairsAvoidedProxy:own.filter(r=>r.gateRepairs===0&&r.accepted).reduce((n,r)=>n+r.preSubmitFailures,0),
      complaints:[...new Set(own.flatMap(r=>r.toolLoop?.complaints??r.rlmLoop?.complaints??r.harnessLoop?.complaints??[]))],
      trainValidationGapMean:gap.length?mean(gap):null,trainValidationGapSamples:gap.length,decisions:decisions.length,samples:own.length,acceptedChangeRate:avg(r=>r.accepted),
      validationClicks:total(r=>r.validationClicks),validationScrolls:total(r=>r.validationScrolls),
      zeroEffectShare:count?own.reduce((n,r)=>n+r.zeroEffect,0)/count:null,
      measuredCandidates:own.reduce((n,r)=>n+r.measured,0),candidates:count,
      repeatMeasuredBadShare:count?own.reduce((n,r)=>n+r.repeatedMeasuredBad,0)/count:null,
      checkerRejectionRate:count?own.reduce((n,r)=>n+r.checkerFailed,0)/count:null,
      acceptedEffectMean:own.some(r=>r.accepted&&r.effects?.validation!=null)?mean(own.filter(r=>r.accepted&&r.effects?.validation!==null&&r.effects?.validation!==undefined).map(r=>r.effects?.validation??0)):null,
      acceptedStructuralDistanceMean:own.some(r=>r.accepted&&r.effects?.structuralDistance!=null)?mean(own.filter(r=>r.accepted&&r.effects?.structuralDistance!==null&&r.effects?.structuralDistance!==undefined).map(r=>r.effects?.structuralDistance??0)):null,
      noChangeRate:avg(r=>r.noChange),checkerPassRate:count?own.reduce((n,r)=>n+r.checkerPassed,0)/count:null,
      inputTokensPerDecision:tokens('input')===null?null:(tokens('input')??0)/decisions.length,
      cachedInputTokensPerDecision:tokens('cachedInput')===null?null:(tokens('cachedInput')??0)/decisions.length,
      outputTokensPerDecision:tokens('output')===null?null:(tokens('output')??0)/decisions.length,
      queriesPerDecision:avg(r=>r.queries.count),queryTally:Object.fromEntries([...new Set(own.flatMap(r=>Object.keys(r.queries.tally)))].map(q=>[q,own.reduce((n,r)=>n+(r.queries.tally[q]??0),0)])),
      callsPerDecision:avg(r=>r.calls),wallTimeMsPerDecision:avg(r=>r.wallTimeMs)};
  });
  return {label:OFFLINE_LABEL,note:'Sample means within decision; validation totals sum those means. Unknown token counts remain null. Calls count backend completion attempts including retries; Codex internal model turns are not separately exposed. Query counts include all command executions, with non-CLI reads tallied as other. Replay tokens are recorded references, not new model usage. Wall time includes charged shared evidence preparation; the shared exact-content geometry cache makes timings cache-order dependent. Idea repeats = same id OR same move type and nonempty target set. Zero effect requires all five physical metrics measured and zero; denominator is all nonseeded candidates.',
    queryCaching:queryCacheReport(records),arms,perDecision:rows,comparisons:[pairedComparison(records,'A','B'),pairedComparison(records,'B','C'),pairedComparison(records,'B','D'),pairedComparison(records,'B','E'),pairedComparison(records,'B','R'),pairedComparison(records,'B','H')]};
}
export async function writeQualityReport(dir:string,records:readonly OfflineRecord[]) {
  const report=qualityReport(records);await writeJson(path.join(dir,'report.json'),report);
  await writeJson(path.join(dir,'query-cache-report.json'),report.queryCaching);
  await writeJson(path.join(dir,'cached-starting-digest.json'),report.queryCaching.proposedCachedStartingDigest);
  const pct=(n:number|null)=>n===null?'unknown':`${(n*100).toFixed(1)}%`;
  const lines=[`# ${OFFLINE_LABEL}`,'',report.note,'',
    '| Arm | Decisions / samples | Accepted | Validation clicks saved | Validation scrolls saved | Zero effect | Repeat bad idea | No change | Checker pass | Input tokens / decision | Calls / decision | Queries / decision | Query tally | Seconds / decision |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|',
    ...report.arms.map(a=>`| ${a.arm} | ${a.decisions} / ${a.samples} | ${pct(a.acceptedChangeRate)} | ${a.validationClicks} | ${a.validationScrolls} | ${pct(a.zeroEffectShare)} | ${pct(a.repeatMeasuredBadShare)} | ${pct(a.noChangeRate)} | ${pct(a.checkerPassRate)} | ${a.inputTokensPerDecision??'unknown'} | ${a.callsPerDecision} | ${a.queriesPerDecision} | ${JSON.stringify(a.queryTally)} | ${(a.wallTimeMsPerDecision/1000).toFixed(1)} |`),'',
    ...report.comparisons.map(c=>c.status==='not evaluated'?`${c.comparison}: not evaluated.`:`${c.comparison}: Δ accepted ${pct(c.rateDifference??0)}, paired 95% interval ${c.rate95?.map(pct).join(' to ')}; Δ clicks ${c.validationClicksDifference}, Δ scrolls ${c.validationScrollsDifference}; decision rule: ${c.beats?'beats':'does not beat'}.`),'',
    ...report.arms.map(a=>`${a.arm}: checker rejection ${pct(a.checkerRejectionRate)}; accepted mean validation effect ${a.acceptedEffectMean} clicks+scrolls; accepted mean structural distance ${a.acceptedStructuralDistanceMean}.`),
    '', '| Arm | Check calls | Estimate calls | Gate repairs | Repairs avoided proxy | Train − validation gap (clicks + scrolls) | Complaints |',
    '|---|---:|---:|---:|---:|---:|---|',
    ...report.arms.map(a=>`| ${a.arm} | ${a.checkCalls} | ${a.estimateCalls} | ${a.gateRepairs} | ${a.repairsAvoidedProxy} | ${a.trainValidationGapMean??'unavailable'} (${a.trainValidationGapSamples} samples) | ${JSON.stringify(a.complaints)} |`),
    '', 'Repairs avoided proxy counts pre-submit native failures in validation-accepted samples with no post-submit repair; it is not a causal counterfactual. The gap is mean daily train saving minus validation saving, on different task partitions; only samples with both measurements enter it. Query cache plans and scope-bound proposed digests are in query-cache-report.json and cached-starting-digest.json; never auto-promoted.',
    '', '| Frequent query | Arguments | Calls | Decisions | Total result bytes |', '|---|---|---:|---:|---:|',
    ...report.queryCaching.frequent.slice(0,20).map(q=>`| ${q.tool} | ${JSON.stringify(q.arguments).replaceAll('|','\\|')} | ${q.calls} | ${q.decisions} | ${q.resultBytes} |`),
    '', 'Complaints (verbatim, deduplicated):',...report.queryCaching.complaints.map(c=>JSON.stringify(c)),
    '', 'Per-decision candidate shares, tokens, calls and wall time are in report.json. Replay plumbing does not estimate prompt quality. Historical arm C replay does not execute queries; arm E replay re-executes and verifies recorded tool results.'];
  await writeFile(path.join(dir,'report.md'),lines.join('\n')+'\n');return report;
}
