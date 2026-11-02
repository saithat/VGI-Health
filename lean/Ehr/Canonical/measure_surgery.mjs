/** Measure the actual P5 presets with the shared certified benchmark adapter.
 * Usage: node lean/Ehr/Canonical/measure_surgery.mjs <before-releases> <report.json>
 * Build ehr first. No browser, clinical service or model API is used.
 */
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const exec = promisify(execFile);
const root = fileURLToPath(new URL('../../../', import.meta.url)).replace(/\/$/, '');
const [before, destination] = process.argv.slice(2);
if (!before || !destination) throw new Error('Supply the baseline release directory and output JSON');
const work = await mkdtemp('/tmp/surg-effort-');
const read = async p => JSON.parse(await readFile(p, 'utf8'));
const hash = async p => createHash('sha256').update(await readFile(p)).digest('hex');
const env = { ...process.env, LEAN_NUM_THREADS: '4', LEAN_STACK_SIZE_KB: '65536' };
const run = async (bin, args, cwd = root) => (await exec('bash',
  ['-c', 'ulimit -v 8000000; exec "$@"', 'surg-measure', bin, ...args],
  { cwd, env, maxBuffer: 32e6, timeout: 180000 })).stdout;
try {
  const source = `${root}/scripts/complexity/Measure.lean`;
  await run('lake', ['env', 'lean', '-j4', `--root=${root}`, '-c', `${work}/Measure.c`, source], `${root}/lean`);
  const rsp = await readFile(`${root}/lean/.lake/build/bin/ehr.rsp`, 'utf8');
  const objects = [...rsp.matchAll(/"([^"\n]+\.o\.export)"/g)].map(x => x[1]).filter(p => !p.endsWith('/Main.c.o.export'));
  if (!objects.length) throw new Error('Build ehr before measuring');
  await run('lake', ['env', 'leanc', '-O2', '-o', `${work}/measure`, `${work}/Measure.c`, ...objects], `${root}/lean`);
  const suite = await read(`${root}/programs/benchmarks/suite.json`);
  const releaseDays = await read(`${root}/world/releases.json`);
  const world = `${root}/runs/world/2`;
  const binary = `${root}/lean/.lake/build/bin/ehr`;
  const report = {
    method: 'Actual P5 presets, same native interpreter for both programs. Shared certified jointMinimum and KLM adapter. Clicks and keys are independently optimized within each reported space. KLM replays the minimum-click path at fixed clock; it is an estimate, not a KLM minimum. Directed spaces make no global-minimum claim. Native min-clicks is also recorded without benchmark fixedValues.',
    adapterSha256: await hash(source), suiteSha256: await hash(`${root}/programs/benchmarks/suite.json`),
    binarySha256: await hash(binary), stages: [],
    simulator: { world: 'runs/world/2', seed: 7, releaseDays, stages: [] },
  };
  for (const [stage, directory] of [['before', path.resolve(before)], ['after', `${root}/releases`]]) {
    const rows = [];
    for (const release of ['v1', 'v2', 'v3']) {
      const program = `${directory}/${release}/personas/P5.json`;
      const spec = `${directory}/${release}/spec.json`;
      for (const benchmark of suite.cases.filter(b => ['W1', 'W6'].includes(b.workflow))) {
        for (const step of benchmark.steps) {
          const task = { ...step, persona: 'P5' };
          await writeFile(`${work}/request.json`, JSON.stringify({ root, world: `${root}/${suite.world}`, program, spec, task, fixedValues: benchmark.fixedValues, bound: 20000 }));
          const { path: _clickPath, keystrokePath: _keyPath, ...measured } = JSON.parse(await run(`${work}/measure`, [`${work}/request.json`]));
          if (!measured.supported || !measured.exact) throw new Error(`Unmeasured task ${task.id}`);
          await writeFile(`${work}/task.json`, JSON.stringify(task));
          const native = JSON.parse(await run(binary, ['min-clicks', '--spec', spec, '--program', program, '--task', `${work}/task.json`, '--world', `${root}/${suite.world}`, '--space', 'navigationDirected']));
          rows.push({ release, workflow: benchmark.workflow, task: task.id,
            programSha256: await hash(program), specSha256: await hash(spec), ...measured,
            native: Object.fromEntries(['clicks', 'keystrokes', 'space', 'keystrokeSpace', 'exact'].map(k => [k, native[k]])) });
          console.log(stage, release, task.id, measured.metrics.clicks, measured.metrics.klmSeconds);
        }
      }
    }
    report.stages.push({ stage, rows });
    const days = [];
    for (let day = 1; day <= 10; day++) {
      const release = day < releaseDays.v2 ? 'v1' : day < releaseDays.v3 ? 'v2' : 'v3';
      const result = JSON.parse(await run(binary, ['simulate', '--spec', `${directory}/${release}/spec.json`,
        '--program', `${directory}/${release}/personas/P5.json`, '--persona', `${world}/personas/P5.json`,
        '--schedule', `${world}/day-${day}-P5.json`, '--world', world, '--seed', '7']));
      const tasks = result.tasks;
      days.push({ day, release, tasks: tasks.length, completed: tasks.filter(t => t.completed).length,
        clicks: tasks.reduce((n, t) => n + t.clicks, 0), klmSeconds: tasks.reduce((n, t) => n + t.klmDeciSec, 0) / 10 });
    }
    report.simulator.stages.push({ stage, days });
    await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
  }
} finally {
  await rm(work, { recursive: true, force: true });
}
