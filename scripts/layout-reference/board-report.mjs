// Compare visited.mjs results on the same complete day traces. The stored
// browser atlas is charged with the recording's own task-conserving meter.
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {loadGeometry} from '../../agent/src/geometry.ts';
import {attributeDay} from '../../agent/src/locality.ts';
import {args, read} from './cli.mjs';

const options = args(process.argv.slice(2));
const dayKey = day => JSON.stringify([day.run, day.persona, day.day]);
function readDays(files) {
  const days = new Map();
  for (const file of files.split(',')) for (const day of read(file).days) {
    const key = dayKey(day);
    assert.ok(!days.has(key), 'Duplicate day ' + key);
    days.set(key, day);
  }
  return days;
}

const before = readDays(options.before), after = readDays(options.after);
assert.deepEqual(new Set(before.keys()), new Set(after.keys()));
const groups = new Map();
const metrics = ['scrolls', 'scrollPx', 'mouseTravelPx'];
function accumulate(totals, name, cost) {
  const values = totals[name] ??= [0, 0, 0];
  for (const [i, metric] of metrics.entries()) {
    assert.ok(Number.isFinite(cost[metric]), 'Missing ' + metric);
    values[i] += cost[metric];
  }
}

for (const [key, day] of after) {
  const old = before.get(key), board = day.board;
  assert.deepEqual(old.board.events, board.events);
  assert.equal(board.states, board.events.length);
  assert.deepEqual(old.fixed, day.fixed);
  assert.deepEqual(old.board.fixed, board.fixed);
  assert.deepEqual(old.browser, day.browser);
  for (const sample of [old, day]) {
    assert.equal(sample.states, sample.expectedStates);
    assert.equal(sample.states, sample.dense.events);
    assert.equal(sample.noAdmittedLayout, 0);
    assert.deepEqual(sample.mismatches, []);
    assert.deepEqual(sample.fixed.missingTargets, []);
    assert.deepEqual(sample.dense.missingTargets, []);
    assert.deepEqual(sample.browser.missing, []);
    assert.equal(sample.board.dense + sample.board.fallback, sample.board.states);
  }
  const run = join(options['recordings-root'] ?? '.', 'runs', day.run);
  const group = day.run + '/' + day.persona;
  if (!groups.has(group)) groups.set(group, {days: 0, states: 0, boards: 0, boardNodes: 0,
    patientPanes: 0, oldDense: 0, newDense: 0, all: {}, board: {}});
  const row = groups.get(group);
  row.days++;
  row.states += day.states;
  row.boards += board.states;
  row.boardNodes += board.boardNodes;
  row.patientPanes += board.patientPanes;
  row.oldDense += old.board.dense;
  row.newDense += board.dense;
  for (const [name, cost] of Object.entries({fixed: day.fixed, old: old.dense, dense: day.dense, browser: day.browser}))
    accumulate(row.all, name, cost);
  for (const [name, cost] of Object.entries({fixed: board.fixed, old: old.board.denseCost, dense: board.denseCost}))
    accumulate(row.board, name, cost);
  if (board.states) {
    const result = read(join(run, 'no-agent/days', 'day-' + String(day.day).padStart(2, '0'), day.persona + '.json'));
    const binding = result.geometry;
    const atlas = await loadGeometry(join(run, 'geometry', binding.programHash + '.' + binding.componentsSha256 + '.json'), result);
    for (const field of ['programHash', 'componentsSha256', 'appSha256', 'source']) assert.equal(atlas[field], binding[field]);
    const costs = attributeDay(result, atlas);
    for (const index of board.events) {
      assert.deepEqual(costs[index].missingTargets, []);
      accumulate(row.board, 'browser', costs[index]);
    }
  }
}
console.log(JSON.stringify(Object.fromEntries([...groups].sort()), null, 2));
