import { dataReason } from '../../scripts/test-data.mjs';
import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { buildResources, loadWorld, options, seed, seededResources, printWorklists, WORLD_SYSTEM, WORKLIST_SYSTEM } from './seed-world.mjs';
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
  const entries = resources();
  assert.equal(worklist(entries, 'P1-appointments').length, 19);
  assert.equal(worklist(entries, 'P1-inbox').length, 5); // three scheduled reviews + two carried items
  assert.equal(worklist(entries, 'P1-inbox').filter((r) => r.priority === 'urgent').length, 1);
  assert.equal(worklist(entries, 'P1-refills').length, 14);
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
  assert.equal(or.length, 11);
  assert.ok(or.every((r) => r.occurrenceDateTime > '2026-11-02'));
  assert.equal(worklist(entries, 'P5-consults').length, 1);
  assert.equal(worklist(entries, 'RN2-role').length, 1);
  // Stable seed keys and times across repeated builds.
  assert.deepEqual(resources(), entries);
});

test('conditional transactions respect eight-entry limit and resolve prior-batch dependencies; rerun writes nothing', { skip }, async () => {
  const stored = [];
  const external = new Set([...Object.values(patients), ...Object.values(practitioners)]);
  let writes = 0;
  const client = {
    async *searchResourcePages(type, query) {
      assert.equal(query._tag, `${WORLD_SYSTEM}|day1`);
      yield stored.filter((r) => r.resourceType === type);
    },
    async executeBatch(bundle) {
      writes++;
      assert.ok(bundle.entry.length <= 8);
      const replacements = new Map(bundle.entry.map((e, i) => [e.fullUrl, `${e.resource.resourceType}/${String(writes * 8 + i).padStart(8, '0')}-0000-4000-a000-000000000000`]));
      for (const e of bundle.entry) {
        for (const r of references(e.resource)) {
          assert.ok(replacements.has(r) || external.has(r) || stored.some((s) => `${s.resourceType}/${s.id}` === r), `Dangling ${r}`);
        }
        const rewrite = (v) => {
          if (Array.isArray(v)) return v.map(rewrite);
          if (!v || typeof v !== 'object') return v;
          return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'reference' ? replacements.get(x) ?? x : rewrite(x)]));
        };
        stored.push({ ...rewrite(e.resource), id: replacements.get(e.fullUrl).split('/')[1] });
      }
      return { resourceType: 'Bundle', type: 'transaction-response', entry: bundle.entry.map((e) => ({ response: { status: '201 Created', location: replacements.get(e.fullUrl) } })) };
    },
  };
  const data = loadWorld({ world, day: 1 });
  await seed(client, data, resources());
  const firstWrites = writes;
  assert.equal(stored.length, resources().length);
  await seed(client, data, resources());
  assert.equal(writes, firstWrites);
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

test('worklist queries AND the day tag with the worklist tag', { skip }, async () => {
  const client = { async search(type, params) {
    assert.ok(params instanceof URLSearchParams);
    assert.equal(params.getAll('_tag')[0], `${WORLD_SYSTEM}|day1`);
    return { resourceType: 'Bundle', total: 0 };
  } };
  await printWorklists(client, loadWorld({ world, day: 1 }), practitioners);
});

test('reset refuses an accidental day tag without its matching seed identifier', async () => {
  const client = { async *searchResourcePages() {
    yield [{ resourceType: 'Location', id: 'unowned', meta: { tag: [{ system: WORLD_SYSTEM, code: 'day1' }] } }];
  } };
  await assert.rejects(() => seededResources(client, 1), /Refusing to manage/);
});
