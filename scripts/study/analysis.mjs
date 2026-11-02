/** Participant is the resampling unit; repeated decisions are never independent people. */
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { sessionSchema, designs } from '../../app/src/dashboard/study/model.ts';
import { root, read, hash, arg, outputDir } from './common.mjs';
export function rng(seed = 20261102) {
  let s = seed >>> 0;
  return () => { s += 0x6d2b79f5; let t = s; t = Math.imul(t ^ t >>> 15,t | 1); t ^= t + Math.imul(t ^ t >>> 7,t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export const mean = values => values.length ? values.reduce((a,b) => a+b,0)/values.length : null;
export function ci(values, random = rng(), repeats = 2000) {
  if (values.length < 2) return null;
  const samples = Array.from({length:repeats}, () => mean(values.map(() => values[Math.floor(random()*values.length)]))).sort((a,b)=>a-b);
  return [samples[Math.floor(.025*repeats)], samples[Math.floor(.975*repeats)]];
}
export function reliability(rows, bins = 5) {
  const curve = Array.from({length:bins}, (_,i) => ({ lower:i/bins, upper:(i+1)/bins, n:0, confidence:0, frequency:0 }));
  for (const { confidence, correct } of rows) {
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1 || ![0,1].includes(correct)) throw Error('Invalid reliability row');
    const b = curve[Math.min(bins-1, Math.floor(confidence*bins))]; b.n++; b.confidence += confidence; b.frequency += correct;
  }
  for (const b of curve) if (b.n) { b.confidence /= b.n; b.frequency /= b.n; }
  return { n:rows.length, top1:mean(rows.map(r=>r.correct)), ece:rows.length ? curve.reduce((a,b)=>a+b.n/rows.length*Math.abs(b.confidence-b.frequency),0) : null, curve };
}
export function distribution(ids, probabilities) {
  if (!ids.length || new Set(ids).size !== ids.length || Object.keys(probabilities).length !== ids.length || ids.some(id=>!Number.isFinite(probabilities[id]) || probabilities[id]<0) || Math.abs(ids.reduce((a,id)=>a+probabilities[id],0)-1)>1e-5) throw Error('Invalid probability distribution');
  // Stable option-order tie breaking; do not optimize ties against human labels.
  return ids.reduce((a,b)=>probabilities[a]>=probabilities[b]?a:b);
}
export async function sessions(out, includeIncomplete = false) {
  const latest = new Map(), dir = path.join(out,'sessions');
  for (const file of (await readdir(dir)).filter(f=>f.endsWith('.json')).sort()) {
    const raw = await read(path.join(dir,file));
    const { serverReceipt, ...body } = raw;
    const session = sessionSchema.parse(body);
    if (session.studyId !== path.basename(out)) throw Error('Study ID mismatch');
    const key = session.participant;
    const prior = latest.get(key);
    if (prior && prior.sessionId !== session.sessionId) throw Error('Multiple sessions for one participant');
    latest.set(key,session);
  }
  const all = [...latest.values()];
  const kinds = new Set(all.map(s=>s.provenance));
  if (kinds.size > 1) throw Error('Never pool dry-run and human sessions');
  return { included:all.filter(s=>s.status==='complete' || (includeIncomplete && s.status==='in-progress')),
    excluded:all.filter(s=>s.status!=='complete' && !(includeIncomplete && s.status==='in-progress')).map(s=>({participant:s.participant,status:s.status})),
    provenance:[...kinds][0] ?? 'no-data' };
}
export function choiceRows(people) {
  return people.flatMap(s => s.trials.filter(t=>!t.practice).flatMap(t=>t.trace.map((trace,index)=>({
    participant:s.participant, design:t.design, caseId:t.caseId, position:t.position, index,
    key:hash({sessionId:s.sessionId,design:t.design,index}), input:trace.choice, label:trace.chosen,
  }))));
}
const metrics = ['clicks','keys','scrolls','scrollPx','mouseTravelPx','elapsedMs','hiddenMs','blocked','wrongPatient','rawTlx','susScore','completed'];
export function effort(people) {
  const records = people.flatMap(s=>s.trials.filter(t=>!t.practice).map(t=>({ participant:s.participant, design:t.design, caseId:t.caseId, position:t.position,
    ...t.effort, rawTlx:t.tlx ? mean(t.tlx) : null,
    susScore:t.sus ? 2.5*t.sus.reduce((n,v,i)=>n+(i%2 ? 5-v : v-1),0) : null,
    completed:Number(t.completed), stopReason:t.stopReason })));
  const summary = Object.fromEntries(designs.map(design=>[design,Object.fromEntries(metrics.map(metric=>{
    const values=records.filter(r=>r.design===design && r[metric]!==null).map(r=>r[metric]);
    return [metric,{ n:values.length,mean:mean(values),ci95:ci(values) }];
  }))]));
  const pairedVsStack = Object.fromEntries(designs.filter(d=>d!=='stack').map(design=>[design,Object.fromEntries(metrics.map(metric=>{
    const values = people.flatMap(p=>{
      const a=records.find(r=>r.participant===p.participant && r.design===design), b=records.find(r=>r.participant===p.participant && r.design==='stack');
      return a && b && a[metric]!==null && b[metric]!==null ? [a[metric]-b[metric]] : [];
    });
    return [metric,{n:values.length,meanDifference:mean(values),ci95:ci(values)}];
  }))]));
  return { records, summary, pairedVsStack };
}
export async function analyze(out) {
  const data = await sessions(out), manifest = await read(path.join(out,'manifest.json'));
  if (data.included.some(s=>s.manifestHash!==manifest.manifestHash)) throw Error('Session/manifest mismatch');
  let predictions = { rows:[], provenance:'not-scored' };
  try { predictions = await read(path.join(out,'predictions.json')); } catch(error) { if(error.code!=='ENOENT') throw error; }
  if (predictions.manifestHash && predictions.manifestHash!==manifest.manifestHash) throw Error('Prediction/manifest mismatch');
  const rows = choiceRows(data.included), byKey = new Map(predictions.rows.map(r=>[r.key,r]));
  const models = {};
  for (const name of ['decisionModel','simulator']) {
    const eligible = [];
    for (const row of rows) {
      const predicted = byKey.get(row.key), probabilities = predicted?.[name]?.probabilities;
      if (!probabilities || !row.label) continue;
      if (predicted.inputHash!==hash(row.input)) throw Error('Prediction input mismatch');
      const ids = row.input.options.map(o=>o.id), winner = distribution(ids, probabilities);
      if (!ids.includes(row.label)) throw Error('Human label outside frozen options');
      eligible.push({participant:row.participant,design:row.design,confidence:probabilities[winner],correct:Number(winner===row.label)});
    }
    const total = reliability(eligible);
    const ids = [...new Set(eligible.map(r=>r.participant))], random = rng();
    const boot = ids.length < 2 ? [] : Array.from({length:2000},()=>reliability(ids.flatMap(()=>{
      const id=ids[Math.floor(random()*ids.length)]; return eligible.filter(r=>r.participant===id);
    })));
    const interval = key => boot.length ? [boot.map(b=>b[key]).sort((a,b)=>a-b)[50],boot.map(b=>b[key]).sort((a,b)=>a-b)[1950]] : null;
    models[name] = {...total,participants:ids.length,top1Ci95:interval('top1'),eceCi95:interval('ece'),
      byDesign:Object.fromEntries(designs.map(d=>[d,reliability(eligible.filter(r=>r.design===d))]))};
  }
  const report = { schemaVersion:1, provenance:data.provenance, predictionProvenance:predictions.provenance,
    manifestHash:manifest.manifestHash, participants:data.included.length, excludedSessions:data.excluded,
    calibration:{ totalSemanticEvents:rows.length,eligibleRows:predictions.rows.length,
      exclusions:predictions.exclusions ?? [], models,
      definition:'Top-label reliability, five equal-width bins, ECE weighted by event count; deterministic option-order tie break. 95% percentile bootstrap by participant; descriptive pilot intervals.' },
    effort:effort(data.included),
    limitations:'Synthetic dry runs establish plumbing only. Frozen full exposed-button policy adapter is distinct from round-two goal-filtered simulation. No clinical correctness or population usability claim.' };
  const dir = path.join(out,'analysis'); await mkdir(dir,{recursive:true,mode:0o700});
  await writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});
  const columns=['participant','design','caseId','position',...metrics,'stopReason'];
  await writeFile(path.join(dir,'effort.csv'),[columns.join(','),...report.effort.records.map(r=>columns.map(k=>r[k]??'').join(','))].join('\n')+'\n',{mode:0o600});
  try {
    execFileSync(process.env.STUDY_PYTHON ?? 'python3', [path.join(root,'scripts/study/plot.py'),path.join(dir,'report.json')],
      {env:{...process.env,MPLCONFIGDIR:path.join(out,'.plot-cache')},stdio:'pipe'});
  } catch(error) {
    throw Error(`JSON/CSV analysis saved, but plotting failed. Install scripts/study/requirements-plot.txt and set STUDY_PYTHON. ${String(error.message).slice(0,150)}`);
  }
  return report;
}
if (process.argv[1]===import.meta.filename) {
  const out=outputDir(arg('out')), report=await analyze(out);
  console.log(JSON.stringify({out,provenance:report.provenance,participants:report.participants,calibration:Object.fromEntries(Object.entries(report.calibration.models).map(([name,m])=>[name,{n:m.n,top1:m.top1,ece:m.ece}]))}));
}
