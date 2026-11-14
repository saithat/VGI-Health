import { interactionRefusals, replayInteractionGate } from '../src/replay-interaction-gate.js';
import { sumMetrics } from '../src/observe.js';
import { withData } from './data.js';
import path from 'node:path';

it('explains cost and completion refusals using the gate tolerances', () => {
  const before = { ...sumMetrics([]), tasks: 1, completed: 1, mouseTravelPx: 100, scrollPx: 100,
    keystrokes: 100, klmDeciSec: 1000 };
  const replay = { day: 1, load: 'test', before, after: { ...before, keystrokes: 103, klmDeciSec: 1021 },
    saving: { clicks: 0, keystrokes: -3, scrolls: 0, klmDeciSec: -21 }, pctAboveFloor: { before: null, after: null } };
  expect(interactionRefusals(replay)).toEqual(['keystrokes: 100 → 103 exceeds 2%', 'klmDeciSec: 1000 → 1021 exceeds 2%']);
  expect(interactionRefusals({ ...replay, after: { ...before, completed: 0 } })).toEqual(['full task completion required']);
  expect(interactionRefusals(null)).toEqual(['missing validation replay']);
});

withData('runs/core-10day/decisions').it('replays retained releases without applying discretionary rules to mandatory recertification', async () => {
  const report = await replayInteractionGate(path.resolve(import.meta.dirname, '../../runs/core-10day'));
  expect(report.decisions).toHaveLength(45);
  expect(report.decisions.filter(d => d.shipped)).toHaveLength(28);
  expect(report.decisions.filter(d => d.shipped && d.mode === 'nightly')).toHaveLength(18);
  expect(report.decisions.filter(d => d.shipped && d.refused)).toEqual([]);
  expect(report.decisions.find(d => d.persona === 'P4' && d.night === 3)).toMatchObject({
    shipped: true, refused: false, fullCostRefusals: ['clicks: 262 → 264 exceeds 0%'],
  });
});
