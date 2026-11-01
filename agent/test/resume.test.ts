import { readFile } from 'node:fs/promises';
import { runDays } from '../src/run.js';
import { RunStore } from '../src/store.js';
import { fakeWorld, tmp } from './helpers.js';
import { ScriptedLlm } from './scripted.js';

it('resumes an unfinished night without repeating completed days, decisions or LLM calls', async () => {
  const worldDir = await fakeWorld(3);
  const runsRoot = await tmp('resume-runs');
  const common = { worldDir, runsRoot, runId: 'resume', personas: ['P3'], releaseDays: { v1_1: 2, v2: 3 } };
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
  expect((await store.readDecision(2, 'P3')).specVersion).toBe('v2');
  expect((await store.login('P3')).certificate.verdict).toBe('ok');
});
