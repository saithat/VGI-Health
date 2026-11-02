/** Freeze task context, program, WASM and provenance before recruitment. */
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { loadEhrInterp } from '../../app/public/ehr/interp-loader.mjs';
import { sourceMinute } from '../../app/src/ehr/ui/exotic-axis.ts';
import { root, read, hash, arg, outputDir, ensureOutput, writeNew } from './common.mjs';
export async function prepare(out, archive = 'hackathon-final') {
  await ensureOutput(out);
  const sources = [];
  async function source(file) {
    let text, origin = 'worktree';
    try { text = await readFile(path.join(root, file), 'utf8'); }
    catch (error) {
      if (error.code !== 'ENOENT' || !file.startsWith('runs/core-10day-live/trajectories/')) throw error;
      text = execFileSync('git', ['show', `${archive}:${file}`], { cwd: root, encoding: 'utf8', maxBuffer: 30e6 });
      origin = `git:${archive}`;
    }
    sources.push({ file, origin, sha256: hash(text) });
    return JSON.parse(text);
  }
  const wasmBytes = await readFile(path.join(root, 'app/public/ehr/ehr-interp.wasm'));
  const wasm = await loadEhrInterp({ wasmBinary: wasmBytes });
  const call = (name, input) => {
    const value = JSON.parse(wasm.call(name, JSON.stringify(input)));
    if (value.error) throw Error(value.error);
    return value;
  };
  const index = await source('runs/core-10day-live/trajectories/index.json');
  const schedule = await source('runs/world/2/schedules/day-01/P2.json');
  const program = await source('releases/v1/personas/P2.json');
  const spec = await source('releases/v1/spec.json');
  const seen = new Set();
  const selected = index.tasks.filter(t => t.persona === 'P2' && t.workflow === 'W3' && t.day === 1)
    .filter(t => { if (seen.has(t.patient.syntheaId)) return false; seen.add(t.patient.syntheaId); return true; }).slice(0,5);
  if (selected.length !== 5) throw Error('Five distinct synthetic W3 patients required');
  const cases = [];
  for (const entry of selected) {
    const task = schedule.tasks.find(t => t.id === entry.id);
    if (!task || task.patientId !== entry.patient.syntheaId) throw Error('World/trajectory patient mismatch');
    const trajectory = await source(`runs/core-10day-live/trajectories/${entry.file}`);
    if (trajectory.nativeMismatch) throw Error('Historical native context mismatch');
    const bundle = await source(trajectory.context.fixtureFile);
    const projection = call('ehr_facts', { bundle: { ...bundle, entry: [...bundle.entry,
      ...trajectory.context.resources.map(resource => ({ resource }))] },
      context: { today: trajectory.context.today, now: task.startMin, receipts: [], record: [] } });
    const episodes = trajectory.context.segments.map(segment => {
      const input = { spec, program, facts: segment.facts, display: projection.display,
        user: { id: program.owner, role: 'physician' } };
      const state = call('ehr_init_envelope', input);
      return { ...input, state };
    });
    // A source-dated index supplements the unchanged clinical workspace. Never infer dates
    // from formatted display rows: preserve actual machine-readable FHIR dates instead.
    const dated = [...bundle.entry, ...trajectory.context.resources.map(resource => ({ resource }))]
      .flatMap(({ resource: r }) => {
        if (!['Observation', 'DiagnosticReport', 'Condition', 'Procedure'].includes(r.resourceType)) return [];
        const date = r.effectiveDateTime ?? r.issued ?? r.onsetDateTime ?? r.performedDateTime;
        const minute = typeof date === 'string' ? sourceMinute(date) : null;
        return minute === null ? [] : [{ minute, node: { text: { s: `${r.resourceType} · ${r.code?.text ?? r.code?.coding?.[0]?.display ?? r.id} · source ${date}` } } }];
      }).sort((a,b) => a.minute-b.minute).slice(-12);
    if (!dated.length) throw Error('Dated condition requires genuine source dates');
    const orders = task.choices.orders.map(o => `${o.drug} ${o.doseTenths / 10} ${o.unit} ${o.route} ${o.freq}${o.prn ? ' PRN' : ''}`).join('; ');
    cases.push({ id: task.id, patient: task.patientId, task, episodes,
      instruction: `Synthetic ED case ${task.id}. Find the assigned patient, review the chart, complete the required note sections (${task.choices.noteSections.join(', ')}), orders (${orders}), and ${task.choices.disposition} disposition. Follow the interpreter's review/confirmation requirements. Values are task instructions, not clinical recommendations.`,
      dateCoverage: dated.length, axis: { dated, undated: [] } });
  }
  const config = { schemaVersion: 1, id: path.basename(out), synthetic: true,
    provenance: { world: 'runs/world/2', sources, wasmSha256: hash(wasmBytes),
      gitCommit: execFileSync('git', ['rev-parse','HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
      contexts: 'Archived production taskEpisodes; no recorded next-action labels copied',
      designScope: 'Fixed P2 program; stack painter vs single-patient board vs source-date index vs palette. No multi-patient throughput claim.' },
    practice: cases[0], cases: cases.slice(1) };
  config.manifestHash = hash(config);
  await writeNew(path.join(out, 'manifest.json'), config);
  return config;
}
if (process.argv[1] === import.meta.filename) {
  const out = outputDir(arg('out'));
  const config = await prepare(out, arg('archive', 'hackathon-final'));
  console.log(JSON.stringify({ out, cases: config.cases.map(c => c.id), manifestHash: config.manifestHash }));
}
