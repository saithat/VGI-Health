import {geometryEhr} from './geometry.js';
import { existsSync } from 'node:fs';
import { dryFixture } from './dry-fixture.js';
/** One deliberately FAKE, zero-LLM-cost night through the real EHR and browser gates. */
import path from 'node:path';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { parseArgs } from 'node:util';
import { tinySpec, sampleTask } from '../../lean/generated/ehr-samples.js';
import { LlmAgent } from './agent.js';
import { RecordingLlm } from './backends/recording.js';
import type { JsonLlm } from './backends/types.js';
import { createEhr } from './ehr.js';
import { deployVersion, makeHoldout, runNight, userResponse, type LoopDeps } from './night.js';
import { fieldElement, infoOf, gotoOf, applyToProgram, componentsMoved } from './program.js';
import { recordingEhr } from './recording-ehr.js';
import { programSchema, toCandidate, type LlmCandidate } from './schema.js';
import { createScreenChecker } from './screencheck.js';
import { RunStore } from './store.js';
import { REPO_ROOT, resolveUserPath, writeJson } from './util.js';
import { loadWorld } from './world.js';

const { values } = parseArgs({ options: { out: { type: 'string' } } });
const out = values.out ? resolveUserPath(values.out) : await mkdtemp(path.join(tmpdir(), 'vgi-FAKE-dry-run-'));
if (out.startsWith(path.join(REPO_ROOT, 'runs') + path.sep)) throw new Error('Dry run output must be outside runs/; it is not real run evidence');
if (existsSync(path.join(out, 'manifest.json'))) throw new Error('Choose an empty dry-run output directory; existing evidence is never overwritten');
await mkdir(out, { recursive: true });
process.env['EHR_SCREEN_CACHE_DIR'] = path.join(out, 'screen-cache');
const specVersion = path.join(out, 'tiny-spec.json');
await writeJson(specVersion, tinySpec);
const world = await loadWorld(path.join(REPO_ROOT, 'runs/world/2'));
const params = world.personas.get('P1');
const schedule = await world.schedule(1, 'P1');
const patient = schedule?.tasks.find((t) => t.workflow === 'W1') ?? schedule?.tasks[0];
if (!params || !patient) throw new Error('world-2 fixture missing');
const current = programSchema.parse({ ...dryFixture(), version: 0, specVersion, owner: 'dry-run', id: 'FAKE-dry-run' });
const targetScreen = current.screens.find((s) => s.id === 'sign');
const panel = targetScreen?.components.find((c) => infoOf(c) === 'allergyList');
const navScreen = current.screens.find((s) => s.components.some((c) => gotoOf(c)));
const nav = navScreen?.components.find((c) => gotoOf(c));
if (!panel || !targetScreen || !nav || !navScreen) throw new Error('tiny fixture missing routes/review');
const body = { ...panel, id: 'body' };
delete body.parent;
const source = `import { Paper } from '@mantine/core';\nimport { UiNodeView, type PresentationProps } from '@ehr/presentation';\nexport default function DryReview({ node, onEvent }: PresentationProps) { return <Paper p="xs" withBorder><UiNodeView node={node} onEvent={onEvent} /></Paper>; }`;
const patch: LlmCandidate['patch'] = [
  { op: 'add', path: '/componentDefs', from: '', valueJson: JSON.stringify([{ name: 'dryReview', params: [], body: [body] }]) },
  { op: 'replace', path: `/screens/[id=${targetScreen.id}]/components/[id=${panel.id}]/kind`, from: '', valueJson: JSON.stringify({ use: { name: 'dryReview', args: [] } }) },
  { op: 'add', path: '/presentationComponents', from: '', valueJson: JSON.stringify([{ name: 'DryReview', key: 'composite:dryReview', source }]) },
  { op: 'add', path: `/screens/[id=${navScreen.id}]/components/[id=${nav.id}]/hotkey`, from: '', valueJson: JSON.stringify('Alt+O') },
];
const backend: JsonLlm = {
  name: 'scripted', model: 'FAKE-zero-cost-fixture',
  async complete(req) {
    const json = req.purpose === 'choose' ? { chosen: ['dry-change'], rationale: 'FAKE fixture chooses its only candidate', rejected: [] } : {
      decision: 'change', hypothesis: 'FAKE wiring fixture: composite + declarative presentation + navigation hotkey',
      candidates: [{ id: 'dry-change', summary: 'FAKE wiring probe', moveType: 'shortcut', rationale: 'FAKE fixture; not performance evidence', targets: [panel.id, nav.id], patch, predicted: { clicks: 1, keystrokes: -1, scrolls: 0, klmDeciSec: 1 } }],
    };
    return { json, backend: 'scripted', model: 'FAKE-zero-cost-fixture', servedBy: null, replayOf: null, promptMatched: null, usage: { llmCost: 0, fake: true } };
  },
};
const native = recordingEhr(createEhr({ fake: false }), path.join(out, 'ehr'));
const screens=createScreenChecker(native,{bundles:[path.join(REPO_ROOT,'fixtures/synthea/Ashly_Rippin_149fcc1f.json')],artifactsDir:path.join(out,'screens')});
if(!screens.geometry)throw new Error('Real screen geometry provider required');
const ehr=geometryEhr(native,screens.geometry,out);
const store = new RunStore(out, path.join(out, 'app/src/ehr/ui/custom'));
const persona = { id: 'P1', userId: current.owner, params: { ...params, keyboardShare: 100, backtrackRate: 0 } };
const fixtureSchedule = (day: number) => ({ day, persona: 'P1', load: 'FAKE fixture', tasks: [{ ...sampleTask, id: `FAKE-d${day}`, persona: 'P1', patientId: patient.patientId, day, todayResources: [], choices: { ...sampleTask.choices, noteSections: [] } }] });
const deps: LoopDeps = { runId: 'FAKE-dry-run', store, ehr,
  screens,
  agent: new LlmAgent(new RecordingLlm(backend, out)), seedPolicy: 'none', seedState: { rejected: new Set(), injected: 0 }, worldDir: world.dir, worldSeed: 2 };
// Fix the simulated preference fixture before execution; no clinical rule/metric is overridden.
const planned = toCandidate({ id: 'dry-change', summary: 'fixture', moveType: 'shortcut', rationale: 'fixture', targets: [], patch, predicted: { clicks: 0, keystrokes: 0, scrolls: 0, klmDeciSec: 0 } }, 'llm');
const moved = componentsMoved(current, applyToProgram(current, planned.patch, { version: 1, specVersion }).program);
while (userResponse(deps, 1, 'P1', moved).response === 'reverted') deps.worldSeed++;
await writeJson(path.join(out, 'manifest.json'), { runId: deps.runId, mode: 'FAKE', buildBindingRequired: true, backend: 'scripted', model: backend.model, ehr: { mode: 'real', binary: ehr.binary }, warning: 'FAKE zero-cost wiring fixture; no LLM calls and no clinical performance evidence', world: world.dir, days: 2, nights: 1, personas: ['P1'], committedRunData: false });
const preflight = await ehr.check({ specVersion, program: current, prev: current, canonical: current });
if (preflight !== 'ok') throw new Error(`Tiny fixture rejected: ${JSON.stringify(preflight)}`);
const initial = await deployVersion(deps, 'P1', current, { specVersion, prev: current, canonical: current, nextVersion: 0 });
if (!initial.ok) throw new Error(`Initial deploy failed: ${initial.check.message}`);
const trainSchedule = fixtureSchedule(1);
const train = await ehr.simulate({ specVersion, program: current, persona: persona.params, schedule: trainSchedule, worldDir: world.dir, seed: deps.worldSeed * 1000 + 1 });
await store.writeDay(train);
const result = await runNight(deps, { night: 1, persona, release: { id: specVersion, specVersion, spec: tinySpec, canonical: current, notes: 'FAKE fixture', leanSpecSource: null, fake: false }, current, train: [{ schedule: trainSchedule, result: train }], programs: new Map([[0, current]]), history: [], holdout: makeHoldout(deps, persona, fixtureSchedule(1)) });
await writeJson(path.join(out, 'dry-result.json'), { outcome: result.record.outcome, directory: out, llmCost: 0, realEhr: true, sourceFieldCount: current.screens.flatMap((s) => s.components).filter((c) => fieldElement(c)).length });
console.log(`FAKE dry run: ${result.record.outcome}; real check/deploy/screens/journals; LLM cost 0; ${out}`);
if (!result.deployed) throw new Error(`Dry candidate did not deploy: ${result.record.validation.reason}; ${result.record.flags.join('; ')}`);
