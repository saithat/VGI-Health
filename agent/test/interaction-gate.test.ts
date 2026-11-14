import { completionOk, improved, interactionAcceptable } from '../src/night.js';
import { sumMetrics } from '../src/observe.js';

const before = { ...sumMetrics([]), tasks: 2, completed: 2, clicks: 10, scrolls: 4,
  mouseTravelPx: 100, scrollPx: 100, keystrokes: 100, klmDeciSec: 1000 };
const replay = { day: 1, load: 'fixture', before, after: { ...before, clicks: 9 },
  saving: { clicks: 1, keystrokes: 0, scrolls: 0, klmDeciSec: 0 }, pctAboveFloor: { before: null, after: null } };

it.each(['keystrokes', 'klmDeciSec'] as const)('R1 constrains %s to 2%% without pixel rounding slack', key => {
  expect(interactionAcceptable({ ...replay, after: { ...replay.after, [key]: before[key] * 1.02 } })).toBe(true);
  expect(improved({ ...replay, after: { ...replay.after, [key]: before[key] * 1.02 + 0.01 } })).toBe(false);
  expect(interactionAcceptable({ ...replay, before: { ...before, [key]: 0 }, after: { ...replay.after, [key]: 1 } })).toBe(false);
  for (const value of [NaN, Infinity, undefined]) {
    expect(interactionAcceptable({ ...replay, after: { ...replay.after, [key]: value } })).toBe(false);
  }
});

it('preserves the existing full completion gate, even when interaction counts improve', () => {
  expect(completionOk(replay)).toBe(true);
  expect(completionOk(null)).toBe(false);
  for (const after of [{ ...replay.after, completed: 1 }, { ...replay.after, tasks: 1, completed: 1 },
    { ...replay.after, tasks: 0, completed: 0 }]) {
    expect(completionOk({ ...replay, after })).toBe(false);
    expect(interactionAcceptable({ ...replay, after })).toBe(false);
  }
});

it('keeps typing and time out of the strict improvement objective', () => {
  expect(improved({ ...replay, after: { ...before, keystrokes: 50, klmDeciSec: 500 } })).toBe(false);
});
