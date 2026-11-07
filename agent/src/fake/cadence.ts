/** Entirely synthetic cadence fixture; never constructs a live model backend. */
import { CADENCE_PROTOCOL, type ReviewGate, type SwitchCost } from '../cadence.js';
import type { JsonLlm, JsonRequest, JsonResponse } from '../backends/types.js';
import type { LlmCandidate } from '../schema.js';
import { runDays } from '../run.js';
import { writeFakeWorld } from './world.js';
import { createFakeEhr } from './ehr-fake.js';
import path from 'node:path';

export class CadenceFakeLlm implements JsonLlm {
  readonly name = 'scripted';
  readonly model = 'cadence-fixture-v1';
  readonly prompts: JsonRequest[] = [];
  async complete(request: JsonRequest): Promise<JsonResponse> {
    this.prompts.push(request);
    if (request.purpose !== 'propose') throw Error('Cadence fixture has no live choice/repair calls');
    const night = Number(/night-(\d+)/.exec(request.callId)?.[1]);
    const patch = (path: string, value: unknown): LlmCandidate['patch'][number] => ({ op: 'replace', path, valueJson: JSON.stringify(value), from: '' });
    const candidate = (id: string, ops: LlmCandidate['patch']): LlmCandidate => ({
      id, summary: id, moveType: 'reorder', rationale: 'FAKE deterministic archive fixture', targets: [], patch: ops,
      predicted: { clicks: 2, scrolls: 0, keystrokes: 0, klmDeciSec: 0 },
    });
    const candidates = night === 1 ? [
      candidate('labs-visible', [patch('/screens/[id=w7-refill]/components/[id=w7-labs]/tab', 0)]),
      candidate('known-dud', [patch('/screens/[id=w1-notes]/components/[id=w1-note]/label', 'Note text')]),
      candidate('unsafe-banner', [{ op: 'remove', path: '/screens/[id=w1-notes]/components/[id=w1-notes-banner]', from: '', valueJson: '' }]),
    ] : night === 2 ? [candidate('usual-order', [
      { op: 'add', path: '/macros/-', from: '', valueJson: JSON.stringify({ id: 'cadence-usual', label: 'Usual order', steps: [
        { setValue: { comp: 'w1-drug', value: 'usual' } }, { setValue: { comp: 'w1-dose', value: 'usual' } },
        { setValue: { comp: 'w1-freq', value: 'usual' } }, { goto: { screen: 'w1-orders' } },
      ] }) },
      { op: 'add', path: '/screens/[id=w1-notes]/components/-', from: '', valueJson: JSON.stringify({
        id: 'cadence-usual-button', kind: { macro: { id: 'cadence-usual' } }, label: 'Usual order',
        tag: 'cadence-usual', tab: 0, size: 'normal', visibility: 'always',
      }) },
    ])] : [];
    return { json: { hypothesis: 'FAKE: accumulate alternatives, ship on a weekly slot', decision: candidates.length ? 'change' : 'noChange', candidates },
      backend: 'scripted', model: this.model, servedBy: null, replayOf: null, promptMatched: null, usage: null };
  }
}
export async function runFakeCadence(out: string, options: { days?: number; resume?: boolean; reviewGate?: ReviewGate; switchCost?: SwitchCost; switchCostModel?: string } = {}) {
  const days = options.days ?? 9;
  const worldDir = await writeFakeWorld(path.join(out, 'world'), { days, seed: 7, personas: ['P1'] });
  const llm = new CadenceFakeLlm();
  const fake = createFakeEhr();
  const ehr = { ...fake, async simulate(input: Parameters<typeof fake.simulate>[0]) {
    const day = await fake.simulate(input);
    // Explicit synthetic geometry (not Chromium evidence), sufficient to run
    // the existing no-regression validation gate without null pixel metrics.
    return { ...day, tasks: day.tasks.map(t => ({ ...t, scrollPx: t.scrolls * 100, mouseTravelPx: t.clicks * 100 })) };
  } };
  const summary = await runDays({ structurePolicy:false, days, worldDir, runsRoot: out, runId: 'cadence-fake', llm, ehr,
    protocol: CADENCE_PROTOCOL, cadence: { kind: 'weekly' }, departments: { P1: 'primary-care' },
    seedPolicy: 'none', releaseDays: { v2: days + 10, v3: days + 20 }, ...options });
  return { summary, llm };
}
