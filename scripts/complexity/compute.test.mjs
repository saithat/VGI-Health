import { dataReason } from '../test-data.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const load = async p => JSON.parse(await readFile(new URL(`../../${p}`, import.meta.url), 'utf8'));

test('fixed cases cover W1–W7 with concrete clinical choices and a single surgery patient', { skip: dataReason('programs/benchmarks') }, async () => {
  const suite = await load('programs/benchmarks/suite.json');
  assert.deepEqual(suite.cases.map(c => c.workflow), ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7']);
  assert.equal(new Set(suite.cases.find(c => c.id === 'W6').steps.map(s => s.patientId)).size, 1);
  assert.deepEqual(suite.cases.find(c => c.id === 'W6').steps.map(s => s.choices.w6Step), ['preop', 'postop', 'discharge']);
  assert.equal(suite.cases.find(c => c.id === 'W4').steps[0].choices.administer[0].drug, 'insulin lispro');
});

test('recorded report retains every deployed iteration and explicit search coverage', { skip: dataReason('runs/core-10day') }, async () => {
  const report = await load('runs/core-10day/complexity.json');
  const person = report.personas.find(p => p.persona === 'P3');
  assert.deepEqual(person.iterations.map(i => i.version), [0,1,2,3,4]);
  for (const i of person.iterations) {
    assert.deepEqual(i.workflows.map(w => w.workflow), ['W4']);
    for (const task of i.tasks) {
      if (task.exact) {
        assert.equal(task.native.exact, true);
        assert.ok(task.metrics.clicks >= task.floor.clicks);
        const events = task.path.flat();
        assert.ok(events.some(e => e.enter?.comp.endsWith('.highAlertCosign') && e.enter.value.user.u === 'P3-second'));
        assert.ok(events.some(e => e.ack?.alert === 'highAlertAdmin'));
      } else assert.equal(task.status, 'not-computed');
    }
  }
  assert.deepEqual(person.markers.filter(m => m.kind === 'release').map(m => m.label), ['v2','v3']);
});

test('canonical report covers every workflow once and actually enters pinned values', { skip: dataReason('programs/benchmarks') }, async () => {
  const canonical = await load('programs/benchmarks/canonical-complexity.json');
  assert.equal(canonical.iterations.length, 3);
  for (const iteration of canonical.iterations) {
    assert.equal(iteration.workflows.length, 7);
    assert.equal(iteration.tasks.length, 9);
    const events = iteration.tasks.find(t => t.workflow === 'W1').path.flat();
    assert.ok(events.some(e => e.enter?.value.code?.c === 'I10'));
    assert.ok(events.some(e => e.enter?.value.code?.c === '99214'));
    assert.ok(events.some(e => e.enter?.comp.endsWith('.refills') && e.enter.value.qty.tenths === 30));
    for (const metric of ['clicks', 'keystrokes', 'klmSeconds', 'screens', 'requiredFields', 'popups']) {
      const total = iteration.workflows.reduce((s, w) => s + w.metrics[metric], 0);
      assert.ok(Math.abs(total - iteration.total[metric]) < 0.00001);
    }
  }
});


test('current metric aggregation reports physical interactions and preserves unavailable geometry', async () => {
  const {sum}=await import('./compute.mjs');
  const row={clicks:2,keystrokes:3,scrolls:1,scrollPx:900,mouseTravelPx:5,screens:1,requiredFields:1,popups:0,klmSeconds:123};
  assert.deepEqual(sum([row,row]),{clicks:4,keystrokes:6,scrolls:2,scrollPx:1800,mouseTravelPx:10,screens:2,requiredFields:2,popups:0});
  assert.equal(sum([row,{...row,mouseTravelPx:null}]).mouseTravelPx,null);
});
