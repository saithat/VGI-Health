#!/usr/bin/env node
import { readFile, writeFile, readdir, mkdir, mkdtemp, rm, access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify, isDeepStrictEqual } from 'node:util';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEhrInterp } from '../../app/public/ehr/interp-loader.mjs';
import { replayTrajectory } from '../../app/src/dashboard/trajectory-replay.ts';

const root = path.resolve(import.meta.dirname, '../..');
const exec = promisify(execFile);
const read = async p => JSON.parse(await readFile(p, 'utf8'));
const exists = async p => { try { await access(p); return true; } catch { return false; } };
const write = (p, data) => writeFile(p, JSON.stringify(data) + '\n');
const relative = p => path.relative(root, p).split(path.sep).join('/');
const sha = async p => createHash('sha256').update(await readFile(p)).digest('hex');
const dateOf = day => `2026-11-${String(2 + Math.floor((day - 1) / 5) * 7 + (day - 1) % 5).padStart(2, '0')}`;
export async function loadInterpreter() {
  const wasm = await loadEhrInterp({ wasmBinary: await readFile(path.join(root, 'app/public/ehr/ehr-interp.wasm')) });
  // Match the app's string seam, keeping clinical data opaque.
  return {
    init: (spec, program, facts, user) => wasm.init(`{"spec":${spec},"program":${program},"facts":${facts},"user":${user}}`),
    step: (spec, program, facts, user, state, event) => wasm.step(`{"spec":${spec},"program":${program},"facts":${facts},"user":${user},"state":${state},"event":${event}}`),
  };
}
export async function verifyTask(interp, task, spec, program) {
  const replay = replayTrajectory(interp, task, spec, program);
  return { id: task.id, eventsVerified: replay.eventsVerified, firstMismatch: replay.firstMismatch };
}
// Recheck the committed exact facts/seeds without a native build. The earlier
// native check is retained as evidence, not reported as a newly executed check.
export async function verifySavedTrajectories(runId) {
  if (typeof runId !== 'string' || !/^[\w-]+$/.test(runId)) throw new Error('Expected --run <id>');
  const output = path.join(root, 'runs', runId, 'trajectories');
  const index = await read(path.join(output, 'index.json'));
  const previous = await read(path.join(output, 'verification.json'));
  if (index.runId !== runId || !index.tasks.length) throw new Error('Invalid trajectory index');
  const interp = await loadInterpreter();
  const mismatches = [];
  let events = 0, verified = 0, baselineEvents = 0, baselineVerified = 0;
  for (const entry of index.tasks) {
    for (const [side, row] of [['recorded', entry], ['baseline', entry.baseline]]) {
      if (!row) continue;
      const task = await read(path.join(output, row.file));
      const result = await verifyTask(interp, task, await read(path.join(root, row.specPath)), await read(path.join(root, row.programPath)));
      if (task.id !== row.id || task.trace.length !== row.eventCount) throw new Error(`Index/trajectory mismatch: ${row.id}`);
      const firstMismatch = task.nativeMismatch ?? result.firstMismatch;
      if (firstMismatch) mismatches.push({ id: row.id, side, firstDivergentEvent: firstMismatch });
      if (side === 'recorded') { events += task.trace.length; verified += result.eventsVerified; }
      else { baselineEvents += task.trace.length; baselineVerified += result.eventsVerified; }
    }
  }
  const verification = { ...previous, status: mismatches.length ? 'failed' : 'passed',
    verificationMode: 'saved-context-wasm', nativeVerificationSource: 'Recorded during native context extraction; not rerun by --verify-only',
    tasks: index.tasks.length, events, wasmEventsVerified: verified,
    baselineTasks: index.tasks.filter(t => t.baseline).length, baselineEvents, baselineWasmEventsVerified: baselineVerified,
    mismatches, provenance: { ...previous.provenance, wasmSha256: await sha(path.join(root, 'app/public/ehr/ehr-interp.wasm')) },
  };
  await write(path.join(output, 'verification.json'), verification);
  console.log(`${runId}: ${index.tasks.length} tasks / ${verified} events + ${verification.baselineTasks} baselines / ${baselineVerified} events; ${mismatches.length} mismatches`);
  if (mismatches.length) throw new Error(`Determinism failed; see ${relative(path.join(output, 'verification.json'))}`);
  return verification;
}
export async function indexTrajectories({ runId, leanDir = process.env.EHR_LEAN_DIR ?? path.join(root, 'lean'), binary = process.env.EHR_BIN ?? path.join(leanDir, '.lake/build/bin/ehr'), baseline = [] }) {
  if (typeof runId !== 'string' || !/^[\w-]+$/.test(runId)) throw new Error('Expected a run id, e.g. --run run1-P3');
  const runDir = path.join(root, 'runs', runId);
  const manifest = await read(path.join(runDir, 'manifest.json'));
  if (manifest.ehr.mode !== 'real') throw new Error('Only real interpreter runs can be verified');
  const localWorld = path.join(root, 'runs/world', String(manifest.worldSeed));
  const world = await exists(localWorld) ? localWorld : manifest.world;
  const worldManifest = await read(path.join(world, 'manifest.json'));
  const fixtureIndexPath = path.resolve(root, worldManifest.fixtures.index);
  const fixtureIndex = await read(fixtureIndexPath);
  const output = path.join(runDir, 'trajectories');
  await mkdir(path.join(output, 'tasks'), { recursive: true });
  await mkdir(path.join(output, 'specs'), { recursive: true });
  // Snapshot the actual historical spec. Current releases may have evolved.
  const archived = await exists(path.join(runDir, 'replay.json')) ? await read(path.join(runDir, 'replay.json')) : null;
  const specSources = new Map();
  const snapshots = new Map();
  async function specFor(version) {
    if (snapshots.has(version)) return snapshots.get(version);
    const contexts = archived?.contexts.filter(c => c.specVersion === version) ?? [];
    if (contexts.some(c => !isDeepStrictEqual(c.spec, contexts[0].spec))) throw new Error(`Ambiguous archived spec ${version}`);
    const source = contexts.length ? 'replay.json archived context' : `releases/${version}/spec.json`;
    const spec = contexts[0]?.spec ?? await read(path.join(root, 'releases', version, 'spec.json'));
    const file = path.join(output, 'specs', `${version}.json`);
    await write(file, spec);
    specSources.set(version, { path: relative(file), source, sha256: await sha(file) });
    snapshots.set(version, { spec, file });
    return { spec, file };
  }
  const interp = await loadInterpreter();
  const work = await mkdtemp(path.join(tmpdir(), 'vgi-trajectories-'));
  const tasks = [], mismatches = [], baselineTasks = [];
  let eventCount = 0, nativeEvents = 0, wasmEvents = 0;
  try {
    for (const dayFolder of (await readdir(path.join(runDir, 'days'))).sort()) {
      for (const persona of manifest.personas) {
        const dayPath = path.join(runDir, 'days', dayFolder, `${persona}.json`);
        if (!await exists(dayPath)) continue;
        const day = await read(dayPath);
        const schedulePath = path.join(world, 'schedules', dayFolder, `${persona}.json`);
        const schedule = await read(schedulePath);
        const programPath = path.join(runDir, 'programs', persona, `v${day.programVersion}.json`);
        const program = await read(programPath);
        const { spec, file: specPath } = await specFor(program.specVersion);
        const nativePath = path.join(work, 'contexts.json');
        const extract = async (scheduleFile, programFile, specFile, recordingFile) => {
          await exec('lean', ['-j4', `--root=${root}`, '--run', path.join(root, 'scripts/trajectories/Contexts.lean'), root, world, scheduleFile, specFile, programFile, recordingFile, nativePath], {
            cwd: root, timeout: 180000, maxBuffer: 4e6,
            env: { ...process.env, LEAN_NUM_THREADS: '4', LEAN_PATH: path.join(leanDir, '.lake/build/lib/lean') },
          });
          return read(nativePath);
        };
        const recordedIds = new Set(day.tasks.map(t => t.task));
        if (schedule.tasks.length !== recordedIds.size || schedule.tasks.some(t => !recordedIds.has(t.id)) || day.trace.some(e => !recordedIds.has(e.task))) throw new Error(`Schedule/recording task mismatch: ${dayFolder} ${persona}`);
        const contexts = await extract(schedulePath, programPath, specPath, dayPath);
        const resources = new Map();
        async function exportTask(task, recorded, context, prog, progPath, sp, spPath, extras, suffix = '') {
          const fixture = fixtureIndex.patients.find(p => p.id === task.patientId);
          if (!fixture) throw new Error(`Missing patient ${task.patientId}`);
          const trace = recorded.trace.filter(e => e.task === task.id);
          const trajectory = {
            schemaVersion: 1, id: task.id,
            context: { programPath: relative(progPath), specPath: relative(spPath), user: { id: prog.owner, role: prog.role },
              startMin: task.startMin, today: dateOf(task.day), fixtureFile: relative(path.join(path.dirname(fixtureIndexPath), fixture.file)), resources: extras,
              segments: context.segments.map(({ initialState, ...segment }) => ({ ...segment, seed: { kind: 'init', clock: initialState.clock } })),
            }, trace, nativeMismatch: context.nativeMismatch,
          };
          // Also verify that the compact init seed reconstructs the native seed exactly.
          let seedMismatch = null;
          for (const segment of context.segments) {
            const initial = JSON.parse(interp.init(JSON.stringify(sp), JSON.stringify(prog), JSON.stringify(segment.facts), JSON.stringify(trajectory.context.user)));
            initial.clock = segment.initialState.clock;
            if (!isDeepStrictEqual(initial, segment.initialState)) seedMismatch ??= { eventIndex: segment.start, reason: 'WASM/native initial state mismatch' };
          }
          const verification = await verifyTask(interp, trajectory, sp, prog);
          const firstMismatch = context.nativeMismatch ?? seedMismatch ?? verification.firstMismatch;
          const file = `tasks/${task.id}${suffix}.json`;
          await write(path.join(output, file), trajectory);
          const entry = { id: task.id, persona, day: task.day, workflow: task.workflow, programVersion: prog.version, release: prog.specVersion,
            programPath: trajectory.context.programPath, specPath: trajectory.context.specPath, user: trajectory.context.user,
            patient: { syntheaId: task.patientId, fixtureFile: trajectory.context.fixtureFile }, todayResources: task.todayResources,
            metrics: recorded.tasks.find(t => t.task === task.id), theoreticalMinimum: recorded.floor.find(t => t.task === task.id),
            completed: recorded.tasks.find(t => t.task === task.id)?.completed ?? false, eventCount: trace.length, file,
          };
          if (!entry.metrics || !entry.theoreticalMinimum) throw new Error(`Missing metrics for ${task.id}`);
          return { entry, firstMismatch, verification, nativeEvents: context.eventsVerified };
        }
        for (const task of schedule.tasks) {
          const prior = resources.get(task.patientId) ?? [];
          let extras = [...prior];
          for (const r of task.todayResources) extras = [...extras.filter(x => !r.id || x.resourceType !== r.resourceType || x.id !== r.id), r];
          resources.set(task.patientId, extras);
          const context = contexts.find(c => c.id === task.id);
          if (!context) throw new Error(`Missing native context ${task.id}`);
          const exported = await exportTask(task, day, context, program, programPath, spec, specPath, extras);
          tasks.push(exported.entry);
          eventCount += exported.entry.eventCount;
          nativeEvents += exported.nativeEvents;
          wasmEvents += exported.verification.eventsVerified;
          if (exported.firstMismatch) mismatches.push({ id: task.id, side: 'recorded', firstDivergentEvent: exported.firstMismatch });
          if (baseline.includes(task.id) || baseline.includes('all')) {
            const baselinePath = path.join(runDir, 'programs', persona, 'v0.json');
            const baseProgram = await read(baselinePath);
            const baseSpec = await specFor(baseProgram.specVersion);
            // Simulate the full day so prior resources/receipts are preserved. Cache per day below.
            if (!baselineTasks.some(t => t.day === task.day && t.persona === persona)) {
              const result = await exec(binary, ['simulate', '--spec', baseSpec.file, '--program', baselinePath, '--persona', path.join(world, 'personas', `${persona}.json`), '--schedule', schedulePath, '--world', world, '--seed', String(manifest.worldSeed * 1000 + task.day)], { cwd: root, timeout: 180000, maxBuffer: 64e6 });
              const recorded = JSON.parse(result.stdout);
              const recording = path.join(work, 'baseline.json');
              await write(recording, recorded);
              baselineTasks.push({ day: task.day, persona, recorded, contexts: await extract(schedulePath, baselinePath, baseSpec.file, recording) });
            }
            const baseDay = baselineTasks.find(t => t.day === task.day && t.persona === persona);
            const b = await exportTask(task, baseDay.recorded, baseDay.contexts.find(c => c.id === task.id), baseProgram, baselinePath, baseSpec.spec, baseSpec.file, extras, '.baseline');
            exported.entry.baseline = { ...b.entry, simulationSeed: manifest.worldSeed * 1000 + task.day };
            if (b.firstMismatch) mismatches.push({ id: task.id, side: 'baseline', firstDivergentEvent: b.firstMismatch });
          }
        }
        console.log(`${dayFolder} ${persona}: ${day.tasks.length} tasks indexed`);
      }
    }
    for (const id of baseline) if (id !== 'all' && !tasks.some(t => t.id === id)) throw new Error(`Unknown baseline task ${id}`);
    if (!tasks.length) throw new Error('No recorded tasks');
    const nativeModules = await Promise.all(['Ehr/Cli/Sim', 'Ehr/Sim/Policy', 'Ehr/Sim/Goals', 'Ehr/Core/Interp', 'Ehr/Render/Fhir'].map(async module => ({ module, sha256: await sha(path.join(leanDir, '.lake/build/lib/lean', `${module}.olean`)) })));
    const provenance = { nativeModules, world: relative(world), fixtureIndex: relative(fixtureIndexPath), adapterSha256: await sha(path.join(root, 'scripts/trajectories/Contexts.lean')), wasmSha256: await sha(path.join(root, 'app/public/ehr/ehr-interp.wasm')), nativeBinarySha256: await sha(binary), specs: [...specSources.values()] };
    const index = { schemaVersion: 1, runId, minimumDefinition: 'Recorded theoretical ideal-interface floor (Ehr.Sim.floorMetrics), not an exact minimum for this deployed UI. KLM is estimated.', tasks };
    await write(path.join(output, 'index.json'), index);
    const verification = { schemaVersion: 1, runId, status: mismatches.length ? 'failed' : 'passed', tasks: tasks.length, events: eventCount, nativeEventsVerified: nativeEvents,
      wasmEventsVerified: wasmEvents, baselineTasks: tasks.filter(t => t.baseline).length, mismatches, provenance,
      reconstruction: 'Native loadFacts merges fixture UUID resources and cumulative per-patient schedule resources; taskEpisodes derives clinical contexts; receipts carry across episodes and tasks; init resets each episode; clock = trace.t - startMin*600 before each step. Compare pre-event screen and exact step result. Historical specs are immutable snapshots.',
    };
    await write(path.join(output, 'verification.json'), verification);
    console.log(`${runId}: ${tasks.length} tasks, ${eventCount} events, ${mismatches.length} mismatches`);
    if (mismatches.length) throw new Error(`Determinism failed; see ${relative(path.join(output, 'verification.json'))}`);
    return { index, verification };
  } finally { await rm(work, { recursive: true, force: true }); }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  let runId, baseline = [], verifyOnly = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--run') runId = args[++i];
    else if (args[i] === '--baseline') baseline.push(...(args[++i] ?? '').split(',').filter(Boolean));
    else if (args[i] === '--verify-only') verifyOnly = true;
    else throw new Error(`Unknown option ${args[i]}`);
  }
  if (verifyOnly && baseline.length) throw new Error('--verify-only cannot simulate new baselines');
  if (verifyOnly) await verifySavedTrajectories(runId);
  else await indexTrajectories({ runId, baseline });
}
