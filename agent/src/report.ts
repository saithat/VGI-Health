import { isMeasurementDay } from './protocol.js';
/** Same-schedule canonical versus recorded costs; never feeds an overnight prompt. */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { createEhr } from './ehr.js';
import { daySeed } from './night.js';
import { addMetrics, pairedMetrics, sumMetrics, saving } from './observe.js';
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
const manifest = await readJson(path.join(directory, 'manifest.json'), z.object({ runId: z.string(), days: z.number(), personas: z.array(z.string()), world: z.string(), ehr: z.object({ mode: z.literal('real') }), noAgentRequired:z.boolean().optional(), measurementProtocol: z.unknown().optional() }));
const store = new RunStore(directory);
const conformanceFile = path.join(directory, 'conformance.json');
const conformance = existsSync(conformanceFile) ? await readJson(conformanceFile, z.object({
  runId: z.string(), generatedAt: z.string(), deploymentGate: z.literal(false),
  targets: z.array(z.object({ id: z.string(), kind: z.string(), passed: z.number(), failed: z.number(), notApplicable: z.number() })),
})) : null;
if (conformance && conformance.runId !== manifest.runId) throw new Error('Rule conformance belongs to another run');
const ruleConformance = conformance ? { generatedAt: conformance.generatedAt, deploymentGate: false,
  revisions: conformance.targets.filter(t => t.kind === 'deployed'), source: 'conformance.json' } : null;
const world = await loadWorld(manifest.world);
const ehr = recordingEhr(createEhr({ fake: false }), path.join(directory, 'metrics/ehr'));
const rows = [];
for (const persona of manifest.personas) {
  const params = world.personas.get(persona);
  if (!params) throw new Error(`Missing persona ${persona}`);
  let before = sumMetrics([]), after = sumMetrics([]);
  let noAgentBefore=sumMetrics([]),noAgentAfter=sumMetrics([]),noAgentDays=0;
  const samples:{day:number;tasks:number;completed:number}[]=[];
  const incomplete: { day: number; task: string }[] = [];
  const decisions: DecisionRecord[] = [];
  const versions = new Set<number>();
  for (let day = 1; day <= manifest.days; day++) {
    const actual = await readJson(store.dayPath(day, persona), dayResultSchema);
    if (day < manifest.days && existsSync(store.decisionPath(day, persona))) decisions.push(await store.readDecision(day, persona));
    versions.add(actual.programVersion);
    if (manifest.measurementProtocol && !isMeasurementDay(day)) continue;
    const program = await store.readProgram(persona, actual.programVersion);
    const release = await releaseForPersona(await loadRelease(program.specVersion, ehr), persona);
    const baselineProgram = personalize(release.canonical, params, world.userId(persona));
    const schedule = await world.schedule(day, persona);
    if (!schedule) throw new Error(`Missing schedule ${day}/${persona}`);
    const verdict = await ehr.check({specVersion:program.specVersion,program:baselineProgram,prev:baselineProgram,canonical:release.canonical});
    if (verdict !== 'ok') throw new Error('Baseline is not certified');
    const baselineFile = path.join(directory,'baselines',`day-${pad2(day)}`,`${persona}.json`);
    const baseline = existsSync(baselineFile) ? await readJson(baselineFile,dayResultSchema) : await ehr.simulate({ specVersion: program.specVersion, program: baselineProgram, persona: params, schedule, worldDir: world.dir, seed: daySeed(world.manifest.seed, day) });
    const controlFile=path.join(directory,'no-agent/days',`day-${pad2(day)}`,`${persona}.json`);
    if(existsSync(controlFile)){
      const control=await readJson(controlFile,dayResultSchema), pair=pairedMetrics(control,actual);
      noAgentBefore=addMetrics(noAgentBefore,pair.before);noAgentAfter=addMetrics(noAgentAfter,pair.after);noAgentDays++;
    }else if(manifest.noAgentRequired)throw new Error(`Missing no-agent control ${persona}/${day}`);
    samples.push({day,tasks:actual.tasks.length,completed:actual.tasks.filter(t=>t.completed).length});
    const pair = pairedMetrics(baseline,actual);
    before = addMetrics(before, pair.before);
    after = addMetrics(after, pair.after);
    incomplete.push(...actual.tasks.filter((task) => !task.completed).map((task) => ({ day, task: task.task })));

  }
  if (decisions.length !== manifest.days - 1) throw new Error(`Missing nights for ${persona}`);
  const deployed = await store.login(persona);
  versions.add(deployed.program.version);
  rows.push({ persona, checkerAccepted: decisions.flatMap((d) => d.candidates).filter((c) => c.check.status === 'pass').length,
    checkerRejected: decisions.flatMap((d) => d.candidates).filter((c) => c.check.status === 'fail').length,
    invalidPatches: decisions.flatMap((d)=>d.candidates).filter((c)=>c.check.status==='invalid-patch').length,
    infrastructureErrors:decisions.filter(d=>['error','infrastructure-error'].includes(d.outcome)||d.flags.some(f=>f.startsWith('infrastructure-error'))).length,
    screenInfrastructureErrors: decisions.filter((d)=>d.screenCheck?.status==='error').length,
    samples, noAgent: noAgentDays?{before:noAgentBefore,after:noAgentAfter,saving:saving(noAgentBefore,noAgentAfter),days:noAgentDays}:null,
    deployedVersions: [...versions].sort((a, b) => a - b), before, after, incomplete,
    nights: decisions.map((d) => ({ night: d.night, outcome: d.outcome, blindTest:d.measured.test?.day??null,testNote:d.flags.filter(f=>f.startsWith('test-unmeasured')), newCalibrationData:d.night%2===1, llmCalls: d.llmCalls.length, flags: d.flags })),
  });
}
const report = { runId: manifest.runId, ruleConformance, worldSeed: world.manifest.seed, comparison: 'Blind even measurement days (odd days are calibration only). Same schedules/seeds: active-release role canonical versus the recorded deployed fork on each work day. Agent effects are reported against the deterministic no-agent recertify/fallback arm as well as the vendor canonical. Per-day sample sizes and completion counts are explicit; unmeasured/superseded decisions remain unavailable. Candidate counts include seeded/repair proposals; accepted means passed the checker, not necessarily deployed.', rows };
await writeJson(path.join(directory, 'metrics/smoke-summary.json'), report);
console.log('| Persona | Candidates pass/reject | Deployed | Clicks before→after | Keys before→after | KLM s before→after | Incomplete |');
console.log('|---|---:|---|---:|---:|---:|---:|');
for (const r of rows) console.log(`| ${r.persona} | ${r.checkerAccepted}/${r.checkerRejected} | ${r.deployedVersions.map((v) => `v${v}`).join(', ')} | ${r.before.clicks}→${r.after.clicks} | ${r.before.keystrokes}→${r.after.keystrokes} | ${r.before.klmDeciSec / 10}→${r.after.klmDeciSec / 10} | ${r.incomplete.length} |`);
console.log('Agent-only savings vs no-agent control (clicks / keys / KLM seconds):');
console.log('Rule conformance (read-only; never a deployment gate):');
if (ruleConformance) for (const revision of ruleConformance.revisions) console.log(`${revision.id}: ${revision.failed ? `${revision.failed} failures` : 'all pass'} (${revision.passed} passed, ${revision.notApplicable} not applicable)`);
else console.log('Unavailable: run pnpm conformance --run <id> to record behavioral evidence.');
for(const r of rows)console.log(`${r.persona}: ${r.noAgent?`${r.noAgent.saving.clicks} / ${r.noAgent.saving.keystrokes} / ${r.noAgent.saving.klmDeciSec/10}`:'Unavailable'}; blind samples ${r.samples.map(s=>`day ${s.day}: ${s.completed}/${s.tasks}`).join(', ')}`);
await writeJson(path.join(directory, 'metrics/provenance.json'), { runId: manifest.runId, comparison: report.comparison, scheduleDays: Array.from({ length: manifest.days }, (_, i) => `day-${pad2(i + 1)}`) });
