// Real clinic review inputs from the existing Synthea cohort and world-2 seeder.
// No backend login, new clinical choices, generated percentiles or fake fills.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadWorld, buildResources } from '../../infra/scripts/seed-world.mjs';

const root = resolve(import.meta.dirname, '../..');
const args = process.argv.slice(2);
const flag = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const binary = resolve(flag('--binary', `${root}/lean/.lake/build/bin/ehr`));
const releases = resolve(flag('--releases', `${root}/releases`));
const out = resolve(flag('--out', '/tmp/amb-review'));
const index = JSON.parse(readFileSync(`${root}/fixtures/synthea/index.json`, 'utf8'));
const world = loadWorld({ world: `${root}/runs/world/2`, day: 1 });
const patientRefs = Object.fromEntries(index.patients.map(p => [p.id, `Patient/${p.id}`]));
const practitionerRefs = Object.fromEntries(['P1', 'P2', 'P3', 'P4', 'P5', 'RN2'].map(p => [p, `Practitioner/${p}`]));
const generated = buildResources(world, patientRefs, practitionerRefs).map(entry => ({
  ...entry, resource: { ...entry.resource, id: entry.fullUrl.replace('urn:uuid:', '') },
}));
const sourceFiles = index.patients;
mkdirSync(out, { recursive: true });
for (const [persona, workflow] of [['P1', 'W1'], ['P1', 'W2'], ['P1', 'W7'], ['P4', 'W5']]) {
  const task = world.schedules[persona].tasks.find(t => t.workflow === workflow);
  if (!task) throw new Error(`No ${persona}/${workflow} task`);
  const patient = sourceFiles.find(p => p.id === task.patientId);
  if (!patient) throw new Error(`Missing patient ${task.patientId}`);
  const bundle = JSON.parse(readFileSync(`${root}/fixtures/synthea/${patient.file}`, 'utf8'));
  const matches = reference => reference === `Patient/${task.patientId}` || reference === `urn:uuid:${task.patientId}`;
  const selected = generated.filter(({ resource: r }) => matches(r.subject?.reference) || matches(r.for?.reference) ||
    r.participant?.some(p => matches(p.actor?.reference)));
  const chart = { ...bundle, entry: [...bundle.entry, ...selected] };
  const path = `${out}/${persona}-${workflow}-bundle.json`;
  writeFileSync(path, JSON.stringify(chart));
  const userPath = `${out}/${persona}-user.json`;
  writeFileSync(userPath, JSON.stringify({ id: persona, role: persona === 'P4' ? 'np' : 'physician' }));
  const temp = `${out}/${persona}-${workflow}-all`;
  const run = spawnSync(binary, ['render-screens', '--spec', `${releases}/v1/spec.json`, '--program', `${releases}/v1/personas/${persona}.json`,
    '--fhir', path, '--user', userPath, '--today', world.date, '--ui', '--out', temp], { cwd: root, env: { ...process.env, LEAN_NUM_THREADS: '4' }, encoding: 'utf8' });
  if (run.status) throw new Error(run.stderr || run.stdout);
  const destination = `${out}/ui/${persona}`;
  mkdirSync(destination, { recursive: true });
  for (const file of readdirSync(temp)) {
    if (!file.endsWith('.json') || file.includes('-')) continue;
    if (file.startsWith(`w${workflow.slice(1)}`) || (file === 'home.json' && ['W1', 'W5'].includes(workflow)))
      copyFileSync(`${temp}/${file}`, `${destination}/${file}`);
  }
  console.log(`${persona}/${workflow}: ${task.id}; ${selected.length} seeded chart resources`);
}
