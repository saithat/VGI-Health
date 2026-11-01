#!/usr/bin/env node
import {RELEASE_IDS} from './release-config.mjs';
import {historicalRunIds} from './historical-releases.mjs';
// Same task and patient on v0 and final; all clinical projections come from Lean.
import { readFile, writeFile, readdir, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
const root = resolve('.');
const runId = process.argv[2] ?? 'run1-P3';
const dir = join(root, 'runs', runId);
const read = async p => JSON.parse(await readFile(p, 'utf8'));
const manifest = await read(join(dir, 'manifest.json'));
if(historicalRunIds.has(runId))throw new Error('Archived replay contracts are immutable; do not regenerate them with current releases');
const scratch = await mkdtemp(join(tmpdir(), 'replay-'));
function command(binary, args, options = {}) {
  const command=binary==='lake'?'bash':binary;
  const argv=binary==='lake'?['-c','ulimit -v 8000000; LEAN_NUM_THREADS=6 exec lake "$@"','lake',...args]:args;
  const r = spawnSync(command, argv, { cwd: root, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, ...options });
  if (r.status !== 0) throw new Error(`${binary} ${args.join(' ')}: ${r.stderr}`);
  return JSON.parse(r.stdout);
}
const ehr = join(root, 'lean/.lake/build/bin/ehr');
const contexts = [], tasks = [];
try {
  for (const persona of manifest.personas) {
    const world = manifest.world;
    const schedule = await read(join(world, 'schedules', 'day-01', `${persona}.json`));
    const original = schedule.tasks[0];
    const input = join(scratch, `${persona}-schedule.json`);
    await writeFile(input, JSON.stringify({ ...schedule, tasks: [original] }));
    const episode = command('lake', ['env', 'lean', '--run', join(root, 'scripts/ReplayContext.lean'), world, input], { cwd: join(root, 'lean') });
    const index = await read(join(root, 'fixtures/synthea/index.json'));
    const patient = index.patients.find(p => p.id === original.patientId);
    const base = await read(join(root, 'fixtures/synthea', patient.file));
    let resources = base.entry.map(e => ({ ...e.resource, id: e.resource.id ?? e.fullUrl?.replace('urn:uuid:', '') }));
    for (const r of original.todayResources) resources = [...resources.filter(x => x.resourceType !== r.resourceType || x.id !== r.id), r];
    const bundle = { resourceType: 'Bundle', entry: resources.map(resource => ({ resource })) };
    const projection = command(ehr, ['facts'], { input: JSON.stringify({ bundle, context: { today: '2026-11-02', now: original.startMin, receipts: [], record: [] } }) });
    projection.facts = episode.facts;
    await writeFile(input, JSON.stringify({ ...schedule, tasks: [{ ...original, choices: episode.choices }] }));
    const versions = (await readdir(join(dir, 'programs', persona))).filter(f => /^v\d+\.json$/.test(f)).sort((a,b) => Number(a.slice(1,-5))-Number(b.slice(1,-5)));
    const programs = await Promise.all(versions.map(file => read(join(dir, 'programs', persona, file))));
    const specs = Object.values(RELEASE_IDS);
    for (const program of programs) for (const specVersion of [program.specVersion, ...specs.filter(version => version !== program.specVersion)]) contexts.push({ persona, version: program.version, specVersion, spec: await read(join(root, 'releases', specVersion, 'spec.json')), bundle: projection, user: { id: program.owner, role: program.role } });
    const sides = [];
    for (const file of [versions[0], versions.at(-1)]) {
      const program = await read(join(dir, 'programs', persona, file));
      const result = command(ehr, ['simulate', '--spec', join(root, 'releases', program.specVersion, 'spec.json'), '--program', join(dir, 'programs', persona, file), '--persona', join(world, 'personas', `${persona}.json`), '--schedule', input, '--world', world, '--seed', '1000004']);
      if (!result.tasks.every(t => t.completed)) throw new Error(`${persona} ${file}: replay episode did not complete`);
      sides.push({ version: program.version, trace: result.trace.map(t => ({ event: t.event, ops: t.ops, klmDeciSec: t.t - original.startMin * 600 })) });
    }
    tasks.push({ persona, id: original.id, title: `${persona} · ${original.workflow} · same patient and episode`, before: sides[0], after: sides[1] });
  }
  await writeFile(join(dir, 'replay.json'), JSON.stringify({ mode: 'wasm', contexts, tasks }, null, 2) + '\n');
  console.log(`Exported ${contexts.length} native contexts and ${tasks.length} same-task replays for ${runId}`);
} finally { await rm(scratch, { recursive: true, force: true }); }
