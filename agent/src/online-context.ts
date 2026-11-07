/** Live-run Arm B. Historical estimates come only from this run's own records;
 * exact train windows are checked before any projection reaches a prompt. */
import path from 'node:path';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import type { NightInput, LoopDeps } from './night.js';
import { geometryComponentsHash, geometryProgramHash, loadGeometry } from './geometry.js';
import { localityDigest, type LocalityDigest } from './locality.js';
import { physicalSaving, measuredLedger, type MeasuredSavings } from './quality-context.js';
import { isMeasurementDay, trainEstimateWindow } from './protocol.js';

export function assertTrain(input: Pick<NightInput,'train'|'night'|'persona'>): void {
  const seen=new Set<number>();
  for(const d of input.train) {
    const n=d.schedule.day;
    if(!Number.isSafeInteger(n)||n<1||n>input.night||isMeasurementDay(n)||seen.has(n)||d.result.day!==n||
      d.result.persona!==input.persona.id||d.schedule.persona!==input.persona.id||
      JSON.stringify(d.schedule.tasks.map(t=>t.id).sort())!==JSON.stringify(d.result.tasks.map(t=>t.task).sort())||
      d.result.trace.some(t=>!d.schedule.tasks.some(s=>s.id===t.task))) throw Error('Nightly context requires matching past odd train partitions');
    seen.add(n);
  }
  if(JSON.stringify([...seen])!==JSON.stringify([...seen].sort((a,b)=>a-b)))throw Error('Train days must be ordered');
}
export async function trainLocality(input: Pick<NightInput,'train'|'programs'>, dir:string, real:boolean):Promise<LocalityDigest> {
  const days=[];
  for(const day of input.train) {
    const program=input.programs.get(day.result.programVersion);
    if(!program)throw Error('Missing train program');
    const hash=geometryProgramHash(program),components=geometryComponentsHash(program);
    const file=path.join(dir,'geometry',`${hash}.${components}.json`);
    if(!existsSync(file)) {if(real)throw Error('Missing live train geometry');continue;}
    const atlas=await loadGeometry(file),binding=day.result.geometry;
    if(atlas.programHash!==hash||atlas.componentsSha256!==components||binding?.programHash!==hash||binding.componentsSha256!==components||binding.appSha256!==atlas.appSha256)throw Error('Train trace/atlas binding mismatch');
    days.push({result:day.result,atlas:{...atlas,aliases:atlas.aliases??{}}});
  }
  return localityDigest(days);
}
export async function onlineQuality(deps:LoopDeps,input:NightInput) {
  assertTrain(input);
  const dir=path.join(deps.store.dir,'decisions'),records=[];
  if(existsSync(dir)) for(const folder of (await readdir(dir)).sort()) {
    const match=/^night-(\d+)$/.exec(folder);
    if(!match||Number(match[1])>=input.night)continue;
    if(existsSync(deps.store.decisionPath(Number(match[1]),input.persona.id)))records.push(await deps.store.readDecision(Number(match[1]),input.persona.id));
  }
  const measured:MeasuredSavings=new Map();
  for(const r of records) {
    if(r.runId!==deps.runId||r.persona!==input.persona.id||r.owner!==input.persona.userId||r.night>=input.night)throw Error('Foreign live ledger record');
    if(r.evidence.trainDays.some((d,i,days)=>!Number.isSafeInteger(d)||d<1||d>r.night||isMeasurementDay(d)||(i>0&&d<=(days[i-1]??0))))throw Error('Non-training ledger evidence');
    for(const e of r.candidates) {
      const key=`${r.night}/${r.persona}/${e.candidate.id}`,estimate=e.trainEstimate;
      if(measured.has(key))throw Error('Duplicate live ledger candidate');
      if(estimate&&(e.candidate.seeded||JSON.stringify(estimate.days)!==JSON.stringify(trainEstimateWindow(r.evidence.trainDays))))throw Error('Invalid live ledger train window');
      measured.set(key,physicalSaving(estimate?.saving??null));
    }
  }
  return {ledger:measuredLedger(records,input.persona.id,input.night,measured),locality:await trainLocality(input,deps.store.dir,deps.ehr.mode==='real')};
}
