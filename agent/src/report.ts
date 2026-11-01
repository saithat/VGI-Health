/** Same-schedule canonical versus recorded costs; never feeds an overnight prompt. */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { createEhr } from './ehr.js';
import { daySeed } from './night.js';
import { addMetrics, sumMetrics } from './observe.js';
import { personalize } from './program.js';
import { recordingEhr } from './recording-ehr.js';
import { loadRelease, releaseForPersona } from './releases.js';
import { dayResultSchema, type DecisionRecord } from './schema.js';
import { RunStore } from './store.js';
import { pad2, readJson, resolveUserPath, writeJson } from './util.js';
import { loadWorld } from './world.js';

const { values } = parseArgs({ options: { run: { type: 'string' } } });
if (!values.run) throw new Error('Usage: pnpm --filter agent report --run runs/<id>');
const directory = resolveUserPath(values.run);
const manifest = await readJson(path.join(directory, 'manifest.json'), z.object({ runId: z.string(), days: z.number(), personas: z.array(z.string()), world: z.string(), ehr: z.object({ mode: z.literal('real') }) }));
const store = new RunStore(directory);
const world = await loadWorld(manifest.world);
const ehr = recordingEhr(createEhr({ fake: false }), path.join(directory, 'metrics/ehr'));
const rows = [];
for (const persona of manifest.personas) {
  const params = world.personas.get(persona);
  if (!params) throw new Error(`Missing persona ${persona}`);
  let before = sumMetrics([]), after = sumMetrics([]);
  const incomplete: { day: number; task: string }[] = [];
  const decisions: DecisionRecord[] = [];
  const versions = new Set<number>();
  for (let day = 1; day <= manifest.days; day++) {
    const actual = await readJson(store.dayPath(day, persona), dayResultSchema);
    const program = await store.readProgram(persona, actual.programVersion);
    const release = await releaseForPersona(await loadRelease(program.specVersion, ehr), persona);
    const baselineProgram = personalize(release.canonical, params, world.userId(persona));
    const schedule = await world.schedule(day, persona);
    if (!schedule) throw new Error(`Missing schedule ${day}/${persona}`);
    const baseline = await ehr.simulate({ specVersion: program.specVersion, program: baselineProgram, persona: params, schedule, worldDir: world.dir, seed: daySeed(world.manifest.seed, day) });
    before = addMetrics(before, sumMetrics(baseline.tasks));
    after = addMetrics(after, sumMetrics(actual.tasks));
    incomplete.push(...actual.tasks.filter((task) => !task.completed).map((task) => ({ day, task: task.task })));
    versions.add(actual.programVersion);
    if (day < manifest.days && existsSync(store.decisionPath(day, persona))) decisions.push(await store.readDecision(day, persona));
  }
  if (decisions.length !== manifest.days - 1) throw new Error(`Missing nights for ${persona}`);
  const deployed = await store.login(persona);
  versions.add(deployed.program.version);
  rows.push({ persona, checkerAccepted: decisions.flatMap((d) => d.candidates).filter((c) => c.check.status === 'pass').length,
    checkerRejected: decisions.flatMap((d) => d.candidates).filter((c) => c.check.status !== 'pass').length,
    deployedVersions: [...versions].sort((a, b) => a - b), before, after, incomplete,
    nights: decisions.map((d) => ({ night: d.night, outcome: d.outcome, llmCalls: d.llmCalls.length, flags: d.flags })),
  });
}
const report = { runId: manifest.runId, worldSeed: world.manifest.seed, comparison: 'Same schedules/seeds: active-release role canonical versus the recorded deployed fork on each work day. Candidate counts include seeded/repair proposals; accepted means passed the checker, not necessarily deployed.', rows };
await writeJson(path.join(directory, 'metrics/smoke-summary.json'), report);
console.log('| Persona | Candidates pass/reject | Deployed | Clicks before→after | Keys before→after | KLM s before→after | Incomplete |');
console.log('|---|---:|---|---:|---:|---:|---:|');
for (const r of rows) console.log(`| ${r.persona} | ${r.checkerAccepted}/${r.checkerRejected} | ${r.deployedVersions.map((v) => `v${v}`).join(', ')} | ${r.before.clicks}→${r.after.clicks} | ${r.before.keystrokes}→${r.after.keystrokes} | ${r.before.klmDeciSec / 10}→${r.after.klmDeciSec / 10} | ${r.incomplete.length} |`);
await writeJson(path.join(directory, 'metrics/provenance.json'), { runId: manifest.runId, comparison: report.comparison, scheduleDays: Array.from({ length: manifest.days }, (_, i) => `day-${pad2(i + 1)}`) });
