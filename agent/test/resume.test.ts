import {scriptedClimb} from "./lean-fixture.js";
import { withData } from "./data.js";
import { RELEASE_IDS } from '../src/release-config.js';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { REPO_ROOT } from '../src/util.js';
import { runDays } from '../src/run.js';
import { RunStore } from '../src/store.js';
import { fakeWorld, tmp } from './helpers.js';
import { ScriptedLlm } from './scripted.js';

withData("runs/core-10day/decisions").it('resumes an unfinished night without repeating completed days, decisions or LLM calls', async () => {
  const worldDir = await fakeWorld(3);
  const runsRoot = await tmp('resume-runs');
  const common = { ...scriptedClimb, worldDir, runsRoot, runId: 'resume', personas: ['P3'], releaseDays: { v2: 2, v3: 3 } };
  const first = await runDays({ ...scriptedClimb, ...common, days: 2, llm: new ScriptedLlm() });
  const store = new RunStore(first.dir);
  const day1 = await readFile(store.dayPath(1, 'P3'), 'utf8');
  const decision = await store.readDecision(1, 'P3');
  const cert = await readFile(store.certPath('P3', 0), 'utf8');
  const llm = new ScriptedLlm();
  const complete = llm.complete.bind(llm);
  vi.spyOn(llm, 'complete').mockImplementation(async (request) => {
    expect(request.callId).not.toContain('night-01');
    return complete(request);
  });
  const resumed = await runDays({ ...scriptedClimb, ...common, days: 3, resume: true, llm });
  expect(await readFile(store.dayPath(1, 'P3'), 'utf8')).toBe(day1);
  expect(await readFile(store.certPath('P3', 0), 'utf8')).toBe(cert);
  expect((await store.readDecision(1, 'P3')).llmCalls).toEqual(decision.llmCalls);
  expect(resumed.timelines[0]?.days.map(day => day.day)).toEqual([1, 2, 3]);
  expect(resumed.timelines[0]?.nights.map(night => night.night)).toEqual([1, 2]);
  expect((await store.readDecision(2, 'P3')).specVersion).toBe(RELEASE_IDS.migration);
  expect((await store.login('P3')).certificate.verdict).toBe('ok');
});

it('reuses an exact completed LLM call from an unfinished night and preserves its original recording', async () => {
  const { RecordingLlm, llmRecordPath } = await import('../src/backends/recording.js');
  const dir = await tmp('llm-checkpoint');
  const complete = vi.fn().mockResolvedValue({ json: { ok: true }, backend: 'codex', model: 'test-model', servedBy: null, replayOf: null, promptMatched: null, usage: null });
  const backend = { name: 'codex' as const, model: 'test-model', complete };
  const request = { callId: 'night-06/P3/migrate-1', purpose: 'migrate', schemaName: 'Test', system: 'system', prompt: 'prompt', schema: {} };
  await new RecordingLlm(backend, dir).complete(request);
  const recorded = await readFile(llmRecordPath(dir, request.callId), 'utf8');
  const resumed = new RecordingLlm(backend, dir, true);
  expect((await resumed.complete(request)).json).toEqual({ ok: true });
  expect(complete).toHaveBeenCalledTimes(1);
  expect(await readFile(llmRecordPath(dir, request.callId), 'utf8')).toBe(recorded);
  await expect(resumed.complete({ ...request, prompt: 'changed' })).rejects.toThrow(/refusing to overwrite/);
});

it('records the local night identity and binds it on resume and offline replay', async () => {
  const { ReplayLlm } = await import('../src/backends/replay.js');
  const common = { ...scriptedClimb, worldDir: await fakeWorld(1), runsRoot: await tmp('night-binding'),
    runId:'local', days:1, personas:['P4'], llm:new ScriptedLlm() };
  const hillclimb = {...common.hillclimb, provider:'local' as const, model:'local-fixture',
    baseUrl:'http://localhost:9876/custom/v1', contextWindow:32000, search:'climb' as const };
  const run = await runDays({...common, hillclimb});
  const manifest = JSON.parse(await readFile(run.dir + '/manifest.json', 'utf8'));
  expect(manifest.hillclimb).toMatchObject({search:'climb', provider:'local', model:'local-fixture', hostPort:'localhost:9876', contextWindow:32000});
  expect(JSON.stringify(manifest.hillclimb)).not.toContain('/custom');
  const report = execFileSync(process.execPath, [REPO_ROOT + '/scripts/report-agent-benefit.mjs', run.dir], {encoding:'utf8'});
  expect(report).toContain('Night agent local / local-fixture');
  const replay = { ...common, runId:'replay', llm: new ReplayLlm(run.dir) };
  for (const difference of [{search:'first' as const,baseUrl:hillclimb.baseUrl},{provider:'codex' as const}, {model:'different', baseUrl:hillclimb.baseUrl},
    {contextWindow:64000, baseUrl:hillclimb.baseUrl}, {baseUrl:'http://localhost:8765/custom/v1'}, {baseUrl:'http://localhost:9876/v1'}]) {
    await expect(runDays({...common, resume:true, hillclimb:{...common.hillclimb, ...difference}})).rejects.toThrow('Resume hillclimb configuration must match');
    await expect(runDays({...replay, hillclimb:difference})).rejects.toThrow('Replay hillclimb configuration must match');
  }
  await runDays({...common, hillclimb, resume:true});
  const copy = await runDays({...replay, hillclimb:{}});
  expect(JSON.parse(await readFile(copy.dir + '/manifest.json', 'utf8')).hillclimb).toEqual(manifest.hillclimb);

  // Older hill-climb manifests identified the hosted model at the top level only.
  manifest.hillclimb = {wallMs:manifest.hillclimb.wallMs, reasoningEffort:'high', serviceTier:'default'};
  await writeFile(run.dir + '/manifest.json', JSON.stringify(manifest));
  await expect(runDays({...common, hillclimb, resume:true})).rejects.toThrow('requires the original revision');
  await expect(runDays({...common, resume:true})).rejects.toThrow('requires the original revision');
  await expect(runDays({...replay, runId:'old-policy', hillclimb:{}})).rejects.toThrow('requires the original revision');
});
