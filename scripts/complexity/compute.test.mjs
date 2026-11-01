import { complexityReleaseLabels } from '../historical-releases.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const load = async p => JSON.parse(await readFile(new URL(`../../${p}`, import.meta.url), 'utf8'));

test('fixed cases cover W1–W7 with concrete clinical choices and a single surgery patient', async () => {
  const suite = await load('programs/benchmarks/suite.json');
  assert.deepEqual(suite.cases.map(c => c.workflow), ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7']);
  assert.equal(new Set(suite.cases.find(c => c.id === 'W6').steps.map(s => s.patientId)).size, 1);
  assert.deepEqual(suite.cases.find(c => c.id === 'W6').steps.map(s => s.choices.w6Step), ['preop', 'postop', 'discharge']);
  assert.equal(suite.cases.find(c => c.id === 'W4').steps[0].choices.administer[0].drug, 'insulin lispro');
});

test('P3 report includes all certified iterations, scoped minima, high-alert cosign and release markers', async () => {
  const report = complexityReleaseLabels(await load('runs/run1-P3/complexity.json'));
  const person = report.personas[0];
  assert.equal(person.persona, 'P3');
  assert.deepEqual(person.iterations.map(i => i.version), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(person.iterations.map(i => i.total.clicks), [25, 23, 23, 23, 23, 23, 23, 23]);
  assert.equal(person.iterations[0].total.klmSeconds, 129.95);
  for (const i of person.iterations) {
    assert.deepEqual(i.workflows.map(w => w.workflow), ['W4']);
    assert.equal(i.skipped.length, 6);
    assert.equal(i.tasks[0].exact, true);
    assert.equal(i.tasks[0].native.exact, true);
    assert.equal(i.tasks[0].space, 'navigationDirected');
    const events = i.tasks[0].path.flat();
    assert.ok(events.some(e => e.enter?.comp.endsWith('.highAlertCosign') && e.enter.value.user.u === 'P3-second'));
    assert.ok(events.some(e => e.ack?.alert === 'highAlertAdmin'));
    assert.ok(i.total.clicks >= i.floor.clicks);
  }
  assert.deepEqual(person.markers.filter(m => m.kind === 'release').map(m => [m.label, m.version]), [['v2', 2], ['v3', 5]]);
  assert.ok(person.markers.some(m => m.properties.includes('humanOnlyKept')));
});

test('canonical report covers every workflow once and actually enters pinned values', async () => {
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
