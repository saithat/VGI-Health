import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { trajectoryIndexSchema, trajectorySchema } from '../../app/src/dashboard/trajectories-data.ts';
import { loadInterpreter, verifyTask } from './index.mjs';

const read = async p => JSON.parse(await readFile(new URL(`../../${p}`, import.meta.url), 'utf8'));
const directory = 'runs/run1-P3/trajectories';

test('index schema covers all 424 tasks and exact event slices with complete context coverage', async () => {
  const index = trajectoryIndexSchema.parse(await read(`${directory}/index.json`));
  assert.equal(index.tasks.length, 424);
  assert.deepEqual([...new Set(index.tasks.map(t => t.day))], [1,2,3,4,5,6,7,8,9,10]);
  let events = 0;
  for (const row of index.tasks) {
    const task = trajectorySchema.parse(await read(`${directory}/${row.file}`));
    assert.equal(task.id, row.id);
    assert.equal(task.trace.length, row.eventCount);
    assert.equal(task.context.programPath, row.programPath);
    assert.equal(task.context.specPath, row.specPath);
    assert.equal(task.context.fixtureFile, row.patient.fixtureFile);
    assert.equal(task.nativeMismatch, null);
    const day = await read(`runs/run1-P3/days/day-${String(row.day).padStart(2, '0')}/${row.persona}.json`);
    assert.deepEqual(task.trace, day.trace.filter(e => e.task === row.id));
    assert.equal(task.context.segments.at(-1).goalsMet, row.completed);
    events += row.eventCount;
  }
  assert.equal(events, 14658);
  const verification = await read(`${directory}/verification.json`);
  assert.equal(verification.status, 'passed');
  assert.equal(verification.nativeEventsVerified, events);
  assert.equal(verification.wasmEventsVerified, events);
  assert.deepEqual(verification.mismatches, []);
  const invalid = structuredClone(index);
  invalid.tasks[0].programPath = '../escape.json';
  assert.equal(trajectoryIndexSchema.safeParse(invalid).success, false);
  invalid.tasks[0] = structuredClone(index.tasks[0]);
  invalid.tasks[0].metrics.clicks = -1;
  assert.equal(trajectoryIndexSchema.safeParse(invalid).success, false);
});

test('real WASM determinism across three releases, episode resets and baseline trajectories', async () => {
  const index = trajectoryIndexSchema.parse(await read(`${directory}/index.json`));
  const interp = await loadInterpreter();
  for (const day of [1, 4, 7]) {
    const row = index.tasks.find(t => t.day === day && t.id.endsWith('-001'));
    for (const side of [row, row.baseline].filter(Boolean)) {
      const task = await read(`${directory}/${side.file}`);
      const result = await verifyTask(interp, task, await read(side.specPath), await read(side.programPath));
      assert.equal(result.firstMismatch, null, `${side.id} v${side.programVersion}`);
      assert.equal(result.eventsVerified, side.eventCount);
    }
  }
  const row = index.tasks[0];
  const task = await read(`${directory}/${row.file}`);
  task.trace[5].screen = 'deliberately-corrupted';
  const result = await verifyTask(interp, task, await read(row.specPath), await read(row.programPath));
  assert.equal(result.firstMismatch.eventIndex, 5);
  assert.equal(result.firstMismatch.expectedScreen, 'deliberately-corrupted');
  const broken = await read(`${directory}/${row.file}`);
  broken.trace[2].result = 'deliberately-corrupted';
  assert.equal((await verifyTask(interp, broken, await read(row.specPath), await read(row.programPath))).firstMismatch.eventIndex, 2);
});
