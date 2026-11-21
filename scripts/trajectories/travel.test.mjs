import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { runMiddleware } from '../../app/scripts/runs-plugin.ts';
import { completedPrefix, savePrefix } from '../live-run-data.mjs';
import { sliceGeometry } from '../../app/scripts/geometry-slice.ts';
import { geometrySliceSchema, trajectorySchema } from '../../app/src/dashboard/trajectories-data.ts';
import { prepareTravel, rewriteTraceTargets, travelLabel } from '../../app/src/dashboard/trajectory-travel.ts';
import { contentHash } from '../../app/src/core/buildBinding.ts';
import { dataReason } from '../test-data.mjs';

test('trace targets rewrite only unprojected comp and alert fields on the measurement copy', () => {
  const events = [{ selectTab: { comp: 'tabs', idx: 1 } }, { ack: { alert: 'urgent' } },
    { click: { comp: '#' } }, { confirm: { comp: 'original' } }, { scroll: { screen: 'chart' } }];
  const raw = events.map(event => ({ event, task: 't', screen: 'chart', ops: [] }));
  const original = structuredClone(raw);
  const projected = [...raw];
  projected[2] = { ...raw[2], event: { click: { comp: 'bounded-slot' } } };
  const trace = rewriteTraceTargets(raw, projected, { 0: 'tab-box', 1: 'alert-box', 2: 'wrong', 4: 'unused' });
  assert.deepEqual(trace.map(row => row.event), [
    { selectTab: { comp: 'tab-box', idx: 1 } }, { ack: { alert: 'alert-box' } },
    projected[2].event, events[3], events[4],
  ]);
  assert.deepEqual(raw, original);
});

test('a task inherits the day pointer and looks ahead across scrolls and other tasks', () => {
  const box = (x, y) => ({ center: { x, y }, reveal: { x, y }, chain: [], offsets: {} });
  const viewport = { width: 1440, height: 900 };
  const state = (components, height) => ({
    screen: 'board', state: 'default', viewport, components,
    scrollers: { pane: { width: 1440, height, maxX: 0, maxY: 900 } },
  });
  const atlas = {
    states: [state({ prior: box(10, 50) }, 300), state({ target: box(40, 50) }, 100)],
    traceTargets: { 0: 'prior', 3: 'prior', 4: 'target' }, viewport,
  };
  const click = task => ({ task, screen: 'board', event: {click: {comp: 'raw'}}, ops: ['click'] });
  const scroll = task => ({ task, screen: 'board', event: {scroll: {screen: 'board'}}, ops: ['scroll'] });
  const trace = [click('other'), scroll('selected'), scroll('selected'), click('other'), click('selected')];
  const task = { id: 'selected', trace: trace.filter(row => row.task === 'selected') };
  const slice = sliceGeometry(atlas, task, {day: 4, trace});
  assert.deepEqual(slice.traceTargets, { 2: 'target' });
  const travel = prepareTravel(task, slice);
  assert.deepEqual([1, 2, 3].map(count => travel(count).scrollPx), [100, 200, 200]);
  assert.deepEqual([1, 2, 3].map(count => travel(count).mouseTravelPx), [0, 0, 30]);
  assert.throws(() => sliceGeometry(atlas, {...task, trace: task.trace.slice(1)}, {day: 4, trace}), /day trace/);
});

test('unresolved travel displays the recorded total only at the final event', () => {
  const click = { task: 't', screen: 'board', event: {click: {comp: 'absent'}}, ops: ['click'] };
  const task = { id: 't', trace: [click, click] };
  const travel = prepareTravel(task, { states: [], day: 2 });
  assert.equal(travel(1).mouseTravelPx, null);
  assert.equal(travelLabel(travel(1).mouseTravelPx, false, 42), 'mouse travel —');
  assert.equal(travelLabel(travel(2).mouseTravelPx, true, 42), '42 px mouse travel (recorded)');
  assert.equal(travelLabel(undefined, true, 0), '0 px mouse travel (recorded)');
  assert.equal(travelLabel(null, true, null), 'mouse travel —');
  assert.equal(travelLabel(42, true, 42), '42 px mouse travel');
});

const run = 'runs/hillclimb-3day';
const root = fileURLToPath(new URL(`../../${run}/`, import.meta.url));
const read = async path => JSON.parse(await readFile(path, 'utf8'));
for (const [day, version, id] of [[1, 0, 'd01-P2-W3-002'], [3, 2, 'd03-P2-W3-001']]) {
  const dayFile = `days/day-${String(day).padStart(2, '0')}/P2.json`;
  const skip = dataReason(`${run}/trajectories/index.json`, `${run}/trajectories/tasks/${id}.json`,
    `${run}/${dayFile}`, `${run}/geometry`, ...(version ? [`${run}/programs/P2/v${version}.layouts.json`] : []));
  test(`${id} v${version} replays board travel and scroll pixels exactly`, {skip}, async () => {
    const index = await read(join(root, 'trajectories/index.json'));
    const entry = index.tasks.find(row => row.id === id);
    assert.equal(entry.programVersion, version);
    const design = version ? await read(join(root, 'programs', 'P2', `v${version}.layouts.json`)) : [];
    if (version) assert.ok(design.length);
    const recorded = await read(join(root, dayFile));
    const programHash = await contentHash(await read(join(root, 'programs', 'P2', `v${version}.json`)));
    const componentsSha256 = await contentHash(design.length ? { components: [], layouts: design } : []);
    assert.equal(programHash, recorded.geometry.programHash);
    assert.equal(componentsSha256, recorded.geometry.componentsSha256);
    const task = trajectorySchema.parse(await read(join(root, 'trajectories', entry.file)));
    assert.match(task.trace[0].event.click.comp, /^workspace\.open/);
    // Request the same completed-prefix slice the player loads, including cache selection.
    const prefix = await completedPrefix(root);
    await savePrefix(prefix);
    const url = `/${run}/.cache/completed/${prefix.key}/geometry/${programHash}.${componentsSha256}/slices/${entry.file}`;
    let body;
    const response = {statusCode: 200, setHeader() {}, end(value) { body = value; }};
    await runMiddleware()({url, method: 'GET', headers: {}}, response, () => assert.fail('Missing slice route'));
    assert.equal(response.statusCode, 200);
    const atlas = geometrySliceSchema.parse(JSON.parse(body));
    assert.equal(atlas.day, day);
    const dayIndex = recorded.trace.findIndex(row => row.task === id);
    assert.match(atlas.traceTargets[0], new RegExp(`^lean-event-${dayIndex}-`));
    if (day === 1) assert.ok(dayIndex > 0 && atlas.carry.length > 0);
    const travel = prepareTravel(task, atlas);
    assert.ok(travel(1).mouseTravelPx > 0);
    let previous = travel(0);
    for (let count = 1; count <= task.trace.length; count++) {
      const cost = travel(count);
      for (const key of ['mouseTravelPx', 'scrollPx']) {
        assert.equal(typeof cost[key], 'number', `${id} event ${count} ${key}`);
        assert.ok(cost[key] >= previous[key], `${id} event ${count} ${key} decreased`);
      }
      previous = cost;
    }
    const recordedTask = recorded.tasks.find(row => row.task === id);
    for (const key of ['mouseTravelPx', 'scrollPx']) {
      assert.equal(previous[key], entry.metrics[key], key);
      assert.equal(previous[key], recordedTask[key], key);
    }
  });
}
