#!/usr/bin/env node
// Dataset-vs-generated checks for the Synthetic Hospital case mix, imaging
// priority and note sections (synthetic-benchmark), plus optional native
// simulation of typing, scroll and KLM cost against a fixed-phrase world.
//
//   node scripts/synthetic-hospital/check-world.mjs --world W [--baseline B] [--simulate] [--jobs 4]
//
// W and B are world directories with identical clinical draws (for example
// --note-text synthetic-hospital vs legacy at the same seed and case mix).
import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs, promisify } from 'node:util';
import { root } from './fetch.mjs';

const run = promisify(execFile);
const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const MIX = read(resolve(root, 'world/src/synthetic-hospital-mix.json'));
const PERSONAS = ['P1', 'P2', 'P3', 'P4', 'P5'];
const pct = (n, d) => d ? Math.round(1000 * n / d) / 10 : 0;
const mean = (xs) => xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length * 10) / 10 : 0;
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
/** Lean's fixed phrase (Goals.noteText), typed when no section text is supplied. */
const fixedPhrase = (id) => `${id}: reviewed, see plan.`;
const SETTING = { P2: 'ed' };
const settingOf = (task) => SETTING[task.persona] ?? (task.persona === 'P5' && task.workflow === 'W6' ? 'inpatient' : 'outpatient');

function worldData(dir) {
  const manifest = read(resolve(dir, 'manifest.json'));
  const days = manifest.perDay.map((d) => d.day);
  const schedules = days.flatMap((day) => PERSONAS.map((p) => ({ day, persona: p, file: resolve(dir, `day-${day}-${p}.json`), schedule: read(resolve(dir, `day-${day}-${p}.json`)) })));
  const states = days.map((day) => read(resolve(dir, `state-day-${day}.json`)));
  return { dir, manifest, days, schedules, states, initial: read(resolve(dir, 'state-day-0.json')) };
}

/** Generated vs dataset share for each scenario of one setting. */
function mixTable(setting, generated) {
  const counts = MIX.settings[setting].counts;
  const keys = Object.keys(counts);
  const covered = keys.reduce((n, k) => n + counts[k], 0);
  const smoothed = keys.reduce((n, k) => n + counts[k] + 1, 0);
  const total = keys.reduce((n, k) => n + (generated[k] ?? 0), 0);
  return { setting, datasetEncounters: MIX.settings[setting].encounters, datasetCovered: MIX.settings[setting].covered, generatedTotal: total,
    rows: keys.map((k) => ({ key: k, datasetPct: pct(counts[k], covered), smoothedPct: pct(counts[k] + 1, smoothed), generated: generated[k] ?? 0, generatedPct: pct(generated[k] ?? 0, total) })) };
}
const tally = (xs) => xs.reduce((m, x) => ({ ...m, [x]: (m[x] ?? 0) + 1 }), {});

export function distributions(world) {
  const arrivals = world.states.flatMap((s) => s.today.ed.arrivals);
  const ed = tally(arrivals.filter((a) => a.disposition !== 'consult').map((a) => a.scenario));
  const DIAGNOSIS = { 'community-acquired pneumonia': 'pneumonia', pyelonephritis: 'pyelonephritis', 'cellulitis of lower limb': 'cellulitis' };
  const ward = tally(world.initial.inpatients.filter((i) => i.source === 'initial' || i.admitDay <= 0).map((i) =>
    DIAGNOSIS[i.diagnosis] ?? (/hyperglyc/.test(i.diagnosis) ? 'hyperglycemia' : /copd|asthma/i.test(i.diagnosis) ? 'copd-asthma-exacerbation' : 'other')));
  const priorities = [];
  for (const day of world.days) {
    const file = resolve(world.dir, `context/day-${String(day).padStart(2, '0')}.json`);
    if (!existsSync(file)) continue;
    for (const { resource: r } of read(file).entry) if (r.resourceType === 'ServiceRequest' && r.meta?.tag?.some((t) => t.code === 'P2') && r.priority) priorities.push(r.priority);
  }
  const imaging = tally(priorities);
  const dataset = MIX.imagingPriority.bySetting.ed;
  const datasetTotal = Object.values(dataset).reduce((a, b) => a + b, 0);
  return { edAdult: mixTable('edAdult', ed), edPeds: mixTable('edPeds', ed), wardInitial: mixTable('wardAdmission', ward),
    imagingEd: ['stat', 'urgent', 'routine'].map((p) => ({ priority: p, datasetPct: pct(dataset[p] ?? 0, datasetTotal), generated: imaging[p] ?? 0, generatedPct: pct(imaging[p] ?? 0, priorities.length) })) };
}

export function noteSizes(world) {
  const lengths = {};
  const perTask = {};
  const sectionsPerTask = {};
  let mapped = 0, sections = 0;
  for (const { schedule } of world.schedules) for (const task of schedule.tasks) {
    const supplied = new Map((task.choices.noteTexts ?? []).map((n) => [n.id, n.text]));
    const ids = [...new Set(task.choices.noteSections)];
    if (!ids.length) continue;
    sections += ids.length; mapped += ids.filter((id) => supplied.has(id)).length;
    const key = `${task.persona}/${task.workflow}`;
    (perTask[key] ??= []).push(ids.reduce((n, id) => n + (supplied.get(id) ?? fixedPhrase(id)).length, 0));
    (sectionsPerTask[key] ??= []).push(ids.length);
    for (const [id, text] of supplied) ((lengths[settingOf(task)] ??= {})[id] ??= []).push(text.length);
  }
  const bySection = Object.fromEntries(Object.entries(lengths).map(([s, ids]) => [s, Object.fromEntries(Object.entries(ids).sort().map(([id, xs]) => [id, { n: xs.length, mean: mean(xs), p50: median(xs) }]))]));
  return { sections, mappedSections: mapped, mappedPct: pct(mapped, sections),
    charsPerTask: Object.fromEntries(Object.entries(perTask).sort().map(([k, xs]) => [k, { tasks: xs.length, sections: mean(sectionsPerTask[k]), mean: mean(xs), p50: median(xs) }])), bySection };
}

const spec = (day) => day >= 7 ? 'v3' : day >= 4 ? 'v2' : 'v1';
async function simulateWorld(world, jobs) {
  const bin = process.env.EHR_BIN ?? resolve(root, 'lean/.lake/build/bin/ehr');
  const queue = [...world.schedules];
  const results = [];
  await Promise.all(Array.from({ length: jobs }, async () => {
    while (queue.length) {
      const job = queue.shift();
      const v = spec(job.day);
      const { stdout } = await run(bin, ['simulate', '--spec', resolve(root, `releases/${v}/spec.json`), '--program', resolve(root, `releases/${v}/canonical.json`),
        '--persona', resolve(world.dir, `personas/${job.persona}.json`), '--schedule', job.file, '--world', world.dir, '--seed', String(world.manifest.seed)], { maxBuffer: 512 * 1024 * 1024 });
      const r = JSON.parse(stdout);
      results.push({ persona: job.persona, day: job.day, tasks: r.tasks, workload: r.workload });
    }
  }));
  const out = {};
  for (const p of PERSONAS) {
    const rs = results.filter((r) => r.persona === p);
    const tasks = rs.flatMap((r) => r.tasks);
    const sum = (k) => tasks.reduce((n, t) => n + (t[k] ?? 0), 0);
    out[p] = { tasks: tasks.length, completed: tasks.filter((t) => t.completed).length, keystrokes: sum('keystrokes'), scrolls: sum('scrolls'), clicks: sum('clicks'),
      klmMinutes: Math.round(sum('klmDeciSec') / 600 * 10) / 10,
      queueDelayMinutes: Math.round(rs.reduce((n, r) => n + (r.workload?.queueDelayMs ?? 0), 0) / 60000 * 10) / 10,
      overtimeMinutes: Math.round(rs.reduce((n, r) => n + (r.workload?.overtimeMs ?? 0), 0) / 60000 * 10) / 10,
      overdueDoses: rs.reduce((n, r) => n + (r.workload?.overdueScheduledDoses ?? 0), 0) };
  }
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const { values } = parseArgs({ options: { world: { type: 'string' }, baseline: { type: 'string' }, simulate: { type: 'boolean' }, jobs: { type: 'string' } } });
  if (!values.world) throw new Error('Usage: check-world.mjs --world DIR [--baseline DIR] [--simulate] [--jobs N]');
  const world = worldData(resolve(values.world));
  const baseline = values.baseline ? worldData(resolve(values.baseline)) : undefined;
  const report = { world: world.dir, baseline: baseline?.dir, label: 'synthetic-benchmark', distributions: distributions(world),
    ...(baseline ? { baselineDistributions: distributions(baseline) } : {}),
    notes: noteSizes(world), ...(baseline ? { baselineNotes: noteSizes(baseline) } : {}),
    datasetSectionChars: MIX.sectionChars, datasetNotes: MIX.notes };
  if (values.simulate) {
    const jobs = Number(values.jobs ?? 4);
    report.simulation = await simulateWorld(world, jobs);
    if (baseline) report.baselineSimulation = await simulateWorld(baseline, jobs);
  }
  console.log(JSON.stringify(report, null, 2));
}
