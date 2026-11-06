import { dataReason } from '../../scripts/test-data.mjs';
import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { buildResources, loadWorld, options, WORLD_SYSTEM, WORKLIST_SYSTEM } from './seed-world.mjs';
import { REPO_ROOT } from './lib.mjs';

const world = resolve(REPO_ROOT, 'runs/world/1');
const skip = dataReason('fixtures/synthea', 'runs/world/1');
let patients;
before(() => {
  if (skip) return;
patients = Object.fromEntries(JSON.parse(readFileSync(resolve(REPO_ROOT, 'fixtures/synthea/index.json'))).patients
  .map((p) => [p.id, `Patient/server-${p.id}`]));
});
const practitioners = Object.fromEntries(['P1', 'P2', 'P3', 'RN2', 'P4', 'P5'].map((p) => [p, `Practitioner/${p}`]));
const resources = (day = 1) => buildResources(loadWorld({ world, day }), patients, practitioners);
const worklist = (entries, code) => entries.filter((e) => e.resource.meta.tag.some((t) => t.system === WORKLIST_SYSTEM && t.code === code)).map((e) => e.resource);
const references = (v) => {
  if (!v || typeof v !== 'object') return [];
  return [...(v.reference ? [v.reference] : []), ...Object.values(v).flatMap(references)];
};

test('all ten world days have complete references, unique identifiers, and real Patient links', { skip }, () => {
  for (let day = 1; day <= 10; day++) {
    const entries = resources(day);
    const urls = new Set(entries.map((e) => e.fullUrl));
    assert.equal(urls.size, entries.length);
    const ids = entries.map((e) => e.resource.identifier.find((i) => i.system === WORLD_SYSTEM).value);
    assert.equal(new Set(ids).size, ids.length);
    for (const e of entries) {
      assert.ok(e.resource.meta.tag.some((t) => t.system === WORLD_SYSTEM && t.code === `day${day}`));
      for (const reference of references(e.resource)) {
        if (reference.startsWith('urn:')) assert.ok(urls.has(reference), `Unresolved ${reference}`);
        if (reference.startsWith('Patient/')) assert.ok(reference.startsWith('Patient/server-'));
        assert.ok(!reference.startsWith('#'), 'Refill prescriptions must be standalone resources');
      }
    }
  }
});

test('day 1 preserves world worklists, abnormal results, triage pounds, MAR and future OR dates', { skip }, () => {
  const data = loadWorld({ world, day: 1 });
  const entries = resources();
  // Seed 1 retains the original clinical random stream, including service orders.
  assert.equal(worklist(entries, 'P1-appointments').length, 20);
  assert.deepEqual(worklist(entries, 'P1-appointments').map((r) => r.identifier.find((i) => i.system === WORLD_SYSTEM).value).sort(),
    data.schedules.P1.tasks.filter((t) => t.workflow === 'W1').map((t) => `day1-appointment-${t.id}`).sort());
  assert.equal(worklist(entries, 'P1-inbox').length, 5); // three scheduled reviews + two carried items
  assert.equal(worklist(entries, 'P1-inbox').filter((r) => r.priority === 'urgent').length, 1);
  assert.equal(worklist(entries, 'P1-refills').length, 19);
  assert.ok(worklist(entries, 'P1-refills').every((r) => r.owner.reference === practitioners.P1 && r.focus.reference.startsWith('urn:')));
  assert.equal(worklist(entries, 'P2-ed').length, 22);
  assert.ok(worklist(entries, 'P2-ed').every((r) => r.class.code === 'EMER' && r.priority && r.statusHistory.some((h) => h.status === 'triaged')));
  assert.ok(worklist(entries, 'P2-facts').some((r) => r.valueQuantity?.code === '[lb_av]'));
  assert.equal(worklist(entries, 'P3-census').length, 7);
  const mar = worklist(entries, 'P3-mar');
  assert.equal(mar.length, 33);
  assert.ok(mar.some((r) => r.meta.tag.some((t) => t.code === 'high-alert')));
  assert.ok(mar.some((r) => r.dosageInstruction[0].asNeededBoolean));
  assert.ok(mar.every((r) => r.dosageInstruction[0].timing.repeat && r.encounter));
  assert.equal(worklist(entries, 'P4-appointments').length, 22);
  assert.equal(worklist(entries, 'P4-facts').filter((r) => r.code.coding?.some((c) => c.code === '29463-7')).length, 22);
  const or = worklist(entries, 'P5-or');
  assert.equal(or.length, 9);
  assert.deepEqual(or.map((r) => r.identifier.find((i) => i.system === WORLD_SYSTEM).value).sort(),
    data.state.surgicalCases.filter((c) => c.orDay >= 1).map((c) => `day1-or-order-${c.id}`).sort());
  assert.ok(or.every((r) => r.occurrenceDateTime > '2026-11-02'));
  assert.equal(worklist(entries, 'P5-consults').length, 1);
  assert.equal(worklist(entries, 'RN2-role').length, 1);
  // Stable seed keys and times across repeated builds.
  assert.deepEqual(resources(), entries);
});

test('invalid day/flags fail before writes', () => {
  for (const args of [['--day', '0'], ['--day', 'nan'], ['--world'], ['--unknown'], ['--reset-day', '--verify-only']]) {
    assert.throws(() => options(args));
  }
  assert.throws(() => loadWorld({ world, day: 11 }));
});

test('busy days retain unhandled abnormal results and refill requests', { skip }, () => {
  const data = loadWorld({ world, day: 5 });
  const entries = resources(5);
  const backlogResults = data.state.inboxBacklog.filter((i) => i.kind === 'result').length;
  const backlogRefills = data.state.inboxBacklog.filter((i) => i.kind === 'refill').length;
  assert.equal(worklist(entries, 'P1-inbox').length,
    data.schedules.P1.tasks.filter((t) => t.workflow === 'W2').length + backlogResults);
  assert.equal(worklist(entries, 'P1-refills').length,
    data.schedules.P1.tasks.filter((t) => t.workflow === 'W7').length + backlogRefills);
});
