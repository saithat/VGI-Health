import { RELEASE_IDS } from '../src/release-config.js';
import { readFile } from 'node:fs/promises';
import { runDays } from '../src/run.js';
import { RunStore } from '../src/store.js';
import { fakeWorld, tmp } from './helpers.js';
import { ScriptedLlm } from './scripted.js';

it('resumes an unfinished night without repeating completed days, decisions or LLM calls', async () => {
  const worldDir = await fakeWorld(3);
  const runsRoot = await tmp('resume-runs');
  const common = { worldDir, runsRoot, runId: 'resume', personas: ['P3'], releaseDays: { v2: 2, v3: 3 } };
  const first = await runDays({ ...common, days: 2, llm: new ScriptedLlm() });
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
  const resumed = await runDays({ ...common, days: 3, resume: true, llm });
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
