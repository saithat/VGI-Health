#!/usr/bin/env node
/** Reproduce the retained audit without simulations, model calls or writes. */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { reportingDay, compareDays } from '../app/src/dashboard/benefit-metrics.mjs';

const read = async file => JSON.parse(await readFile(file, 'utf8'));
export async function reportAgentBenefit(directory, options = {}) {
  const manifest = await read(path.join(directory, 'manifest.json'));
  const days = (await readdir(path.join(directory, 'days'))).flatMap(name => /^day-\d+$/.test(name) ? [Number(name.slice(4))] : []).sort((a,b) => a-b)
    .filter(day => day <= (manifest.daysCompleted ?? manifest.days))
    .filter(day => options.days ? options.days.includes(day) : reportingDay(manifest.measurementProtocol,day));
  if (options.days?.some(day=>!days.includes(day))) throw Error('Requested day is not a completed recorded day');
  const nights = (await readdir(path.join(directory, 'decisions')).catch(error=>{if(error.code==='ENOENT')return [];throw error;})).filter(n => /^night-\d+$/.test(n)).sort();
  const rows = [];
  const climbs = [];
  const outcomes = {}, rawOutcomes = {};
  let certifiedAttempts = 0, checkerFailures = 0, nullValidationRejections = 0, zeroActionSavingRejections = 0, migrationFallbacks = 0;
  for (const persona of manifest.personas) {
    const pairs = [];
    for (const day of days) {
      const suffix = `days/day-${String(day).padStart(2,'0')}/${persona}.json`;
      pairs.push({ before: await read(path.join(directory, 'no-agent', suffix)), after: await read(path.join(directory, suffix)) });
    }
    const comparison = compareDays(pairs);
    rows.push({ persona, ...comparison, perDay: pairs.map(pair => ({ day:pair.after.day, ...compareDays([pair]) })) });
    for (const night of nights) {
      const record = await read(path.join(directory, 'decisions', night, `${persona}.json`));
      if (record.mode === 'hillclimb') climbs.push({persona,night:record.night,
        passingMeasures:record.hillclimb?.passingMeasures ?? null,bestNet:record.hillclimb?.bestNet ?? null,
        completion:record.hillclimb?.completion ?? null});
      rawOutcomes[record.outcome] = (rawOutcomes[record.outcome] ?? 0) + 1;
      const label = record.mode === 'surface-feature' && record.outcome === 'not-surfaced' ? 'release-not-surfaced'
        : record.mode === 'surface-feature' && record.release?.surfaced && record.deployed ? 'release-surfaced'
        : record.mode === 'migrate' && record.deployed ? 'release-migrated' : record.outcome;
      if(record.mode==='migrate' && record.release?.fallback && record.deployed) migrationFallbacks++;
      outcomes[label] = (outcomes[label] ?? 0) + 1;
      for (const attempt of record.certification.attempts) { certifiedAttempts++; checkerFailures += Number(attempt.check.status !== 'pass'); }
      const replay = record.validation.replay;
      if (record.outcome === 'validation-rejected' && replay && replay.saving.clicks + replay.saving.scrolls === 0) zeroActionSavingRejections++;
      if (record.outcome === 'validation-rejected' && replay && ['clicks','scrolls','keystrokes','klmDeciSec'].every(k => replay.saving[k] === 0)) nullValidationRejections++;
    }
  }
  const nightAgent = {provider:manifest.hillclimb?.provider ?? manifest.backend, model:manifest.hillclimb?.model ?? manifest.model};
  return { runId:manifest.runId, nightAgent, days, cohort:'Costs: identical tasks completed in both arms. Completion: all tasks. Floor: vendor floor on the paired cohort. No missing floor is treated as zero.', rows,
    nights:{climbs,outcomes,rawOutcomes,certifiedAttempts,checkerFailures,nullValidationRejections,zeroActionSavingRejections,migrationFallbacks} };
}
const fmt = (n, digits=1) => n == null ? 'Unavailable' : n.toFixed(digits);
export function markdownReport(report) {
  const lines = [`Run ${report.runId} · Night agent ${report.nightAgent.provider} / ${report.nightAgent.model} · days ${report.days.join(', ')}. ${report.cohort}`, '',
    '| Persona | Vendor / agent completed | Both completed | Actions saved | Alert share | Modeled min vendor → agent | Time saved | Action gap captured | Time gap captured | Vendor / agent vs floor |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|'];
  for (const r of report.rows) lines.push(`| ${r.persona} | ${r.completion.before.completed}/${r.completion.before.tasks} / ${r.completion.after.completed}/${r.completion.after.tasks} | ${r.paired} | ${fmt(r.savedPct.actions)}% | ${fmt(r.alertSharePct,0)}% | ${fmt(r.before.klmDeciSec/600)} → ${fmt(r.after.klmDeciSec/600)} | ${fmt(r.savedPct.klmDeciSec)}% | ${fmt(r.gapCapturedPct.actions,0)}% | ${fmt(r.gapCapturedPct.klmDeciSec,0)}% | ${fmt(r.effortVsFloor.before)}× / ${fmt(r.effortVsFloor.after)}× |`);
  if (report.nights.climbs.length) lines.push('', '| Persona | Night | Passing measures | Best net actions/day | Completion |',
    '|---|---:|---:|---:|---|', ...report.nights.climbs.map(r => `| ${r.persona} | ${r.night} | ${r.passingMeasures ?? 'Unavailable'} | ${fmt(r.bestNet)} | ${r.completion ?? 'Unavailable'} |`));
  lines.push('', '| Night outcome | Count |', '|---|---:|', ...Object.entries(report.nights.outcomes).map(([k,v]) => `| ${k} | ${v} |`), '',
    `Certification attempts: ${report.nights.certifiedAttempts}; nonpassing: ${report.nights.checkerFailures}; migration fallbacks: ${report.nights.migrationFallbacks}; zero-action-saving validation rejections: ${report.nights.zeroActionSavingRejections} (${report.nights.nullValidationRejections} with all recorded count/time savings zero).`, '', 'Failures (all tasks):');
  for (const r of report.rows) for (const f of r.failures) lines.push(`- ${r.persona} ${f.side === 'after' ? 'agent' : 'vendor'} day ${f.day}: ${f.task}`);
  return lines.join('\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { values, positionals } = parseArgs({allowPositionals:true,options:{json:{type:'boolean'},days:{type:'string'}}});
  if (positionals.length !== 1) throw Error('Usage: node scripts/report-agent-benefit.mjs <run-directory> [--days 2-10 | --days 2,4,6] [--json]');
  let days;
  if (values.days) {
    const range = /^(\d+)-(\d+)$/.exec(values.days);
    days = range ? Array.from({length:Number(range[2])-Number(range[1])+1},(_,i)=>Number(range[1])+i) : values.days.split(',').map(Number);
    if (!days.length || days.some(d=>!Number.isSafeInteger(d)||d<1)) throw Error('Invalid --days');
  }
  const report = await reportAgentBenefit(path.resolve(positionals[0]), {days});
  console.log(values.json ? JSON.stringify(report,null,2) : markdownReport(report));
}
