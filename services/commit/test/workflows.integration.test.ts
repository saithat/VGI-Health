import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { configSchema, type Obj } from '../src/types.ts';
import { migrate } from '../src/store.ts';
import { fixture, host, patient, api, intent } from './helpers.ts';
import { normalize } from '../src/bootstrap.ts';
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL required: workflow tests use real Postgres/native Lean');
const families = [
  ['W1-orders','P1','physician','w1Sign','signOrders'], ['W1-note','P1','physician','w1Close','signNote'],
  ['W2-results','P1','physician','w2Result','ackResult'], ['W3-ED','P2','physician','w3Disposition','disposition'],
  ['W4-assessment','P3','rn','w4Flowsheet','chartAssessment'], ['W5-vaccine','P4','np','w5Immunizations','recordImmunization'],
  ['W6-operation','P5','surgeon','w6OpNote','signOpNote'], ['W6-discharge','P5','surgeon','w6Discharge','discharge'],
  ['W7-renewal','P1','physician','w7Decision','approveRefill'], ['W7-denial','P1','physician','w7Decision','denyRefill'],
];
test('every workflow family refuses stale chart intent and native guard violations without changing its log', { timeout: 120000 }, async t => {
  const f = await fixture();
  const spec = JSON.parse(await readFile(new URL('../../../releases/v3/spec.json', import.meta.url), 'utf8'));
  const releases: Obj = {};
  const ids = families.map(row => row[0]);
  for (const [id, persona, , screen, commit] of families) {
    const program = JSON.parse(await readFile(new URL(`../../../releases/v3/personas/${persona}.json`, import.meta.url), 'utf8'));
    program.start = screen; program.patientSelection = false;
    releases[`${persona}-${id}`] = { spec, program, workflows: { chart: { commit, project: true } } };
  }
  releases.P3 = releases['P3-W4-assessment'];
  releases['P1-review'] = { spec, program: { ...releases['P1-W1-note'].program, start: 'w1Rooming' },
    workflows: { chart: { commit: 'markReviewed', project: true } } };
  const config = configSchema.parse({ tenant: `workflows-${randomUUID()}`, actors: ['P1','P2','P3','P4','P5','RN2'].map((id,i) => ({
    token: `workflow-test-token-${id}-synthetic-only`, persona: id, user: { id, role: ['physician','physician','rn','np','surgeon','rn'][i] }, modelId: i+1, patients: ids })), releases });
  const a = await host(url, config); const b = await host(url, config);
  try {
    await migrate(a.db);
    for (const [i, row] of families.entries()) await a.store.importPatient(patient(f, row[0], i+1));
    for (const [id, persona, , screen, commit] of families) await t.test(id, async () => {
      const actor = config.actors.find(a => a.persona === persona)!;
      const input = { patient: id, release: `${persona}-${id}`, workflow: 'chart', encounter: 'enc-1', expectedVersion: 1 };
      assert.equal((await api(a.base, actor, '/sessions', { ...input, expectedVersion: 0 })).status, 409);
      const opened = await api(a.base, actor, '/sessions', input);
      assert.equal(opened.status, 201, JSON.stringify(opened));
      const event = { click: { comp: `${screen}.commit.${commit}` } };
      const stale = { ...intent(opened.body, `${id}-stale`, event), expectedVersion: 0 };
      assert.equal((await api(b.base, actor, '/commands', stale)).status, 409);
      const guarded = await api(a.base, actor, '/commands', intent(opened.body, `${id}-guard`, event));
      assert.equal(guarded.status, 422, JSON.stringify(guarded));
      assert.equal(guarded.body.outcome, 'rejected');
      const after = await api(b.base, actor, `/patients/${id}`);
      assert.equal(after.body.version, 1); assert.equal(after.body.events.length, 1);
      assert.equal(after.body.events[0].event.kind, 'import');
      // There is no raw FHIR writer, import endpoint, or caller-supplied effect API.
      for (const path of ['/fhir/R4', '/transactions', '/import']) assert.equal((await api(a.base, actor, path, { bundle: f.tiny.currentBundle })).status, 404);
    });
    await t.test('RN2 uses the P3 layout with its own identity and cannot open another clinician release', async () => {
      const nurse = config.actors.find(a => a.persona === 'RN2')!;
      assert.equal((await api(a.base, nurse, '/release?persona=P3')).status, 200);
      assert.equal((await api(a.base, nurse, '/release?persona=P1')).status, 403);
      const opened = await api(a.base, nurse, '/sessions', { patient: ids[4], release: 'P3-W4-assessment', workflow: 'chart', encounter: 'enc-1', expectedVersion: 1 });
      assert.equal(opened.status, 201, JSON.stringify(opened));
      assert.equal((await api(a.base, nurse, '/commands', intent(opened.body, 'rn2-native-guard', { click: { comp: 'w4Flowsheet.commit.chartAssessment' } }))).status, 422);
      assert.equal((await api(a.base, nurse, '/sessions', { patient: ids[4], release: 'P1-W1-note', workflow: 'chart', encounter: 'enc-1', expectedVersion: 1 })).status, 403);
    });
    await t.test('native sessions recover persisted reviews only for the author and unchanged targets', async () => {
      const actor = config.actors[0]; const id = 'W1-note';
      const input = { patient: id, release: 'P1-review', workflow: 'chart', encounter: 'enc-1', expectedVersion: 1 };
      const opened = await api(a.base, actor, '/sessions', input);
      const saved = await api(a.base, actor, '/commands', intent(opened.body, 'review-reopen', { click: { comp: 'w1Rooming.review.allergyList' } }));
      assert.equal(saved.status, 201, JSON.stringify(saved));
      const next = await api(b.base, actor, '/sessions', { ...input, expectedVersion: 2 });
      assert.equal(next.status, 201, JSON.stringify(next));
      assert.equal(next.body.facts.receipts.length, 1);
      assert.equal(next.body.facts.receipts[0].info, 'allergyList');
      const other = { ...actor, user: { ...actor.user, id: 'another-doctor' } };
      const theirs = await b.store.openSession(other, { ...input, expectedVersion: 2 });
      assert.deepEqual(theirs.facts.receipts, []);
      // A changed reviewed target invalidates its receipt even when the native
      // aggregate dataVersion happened to remain equal.
      const snapshot = (await a.db.query('SELECT snapshot FROM commit_streams WHERE tenant=$1 AND key=$2', [config.tenant, `patient:${id}`])).rows[0].snapshot;
      const provenance = snapshot.bundle.entry.find((e: Obj) => e.resource.resourceType === 'Provenance').resource;
      const recorded = provenance.recorded;
      provenance.recorded = '2000-01-01T00:00:00Z';
      await a.db.query('UPDATE commit_streams SET snapshot=$3 WHERE tenant=$1 AND key=$2', [config.tenant, `patient:${id}`, snapshot]);
      assert.deepEqual((await a.store.openSession(actor, { ...input, expectedVersion: 2 })).facts.receipts, []);
      provenance.recorded = recorded;
      const target = snapshot.bundle.entry.find((e: Obj) => e.resource.resourceType === 'Patient').resource;
      target.meta.versionId = '2';
      await a.db.query('UPDATE commit_streams SET snapshot=$3 WHERE tenant=$1 AND key=$2', [config.tenant, `patient:${id}`, snapshot]);
      const changed = await a.store.openSession(actor, { ...input, expectedVersion: 2 });
      assert.deepEqual(changed.facts.receipts, []);
    });
    await t.test('imports are immutable, idempotent after live writes, and resolve references before partitioning', async () => {
      const p = patient(f, ids[0], 1);
      await a.store.importPatient(p);
      const changed = structuredClone(p); changed.bundle.entry[0].resource.birthDate = '2000-01-01';
      await assert.rejects(a.store.importPatient(changed), /import_changed/);
      const resources = normalize([{ fullUrl: 'urn:uuid:pt', resource: { resourceType: 'Patient' } },
        { fullUrl: 'urn:uuid:enc', resource: { resourceType: 'Encounter', subject: { reference: 'urn:uuid:pt' } } }]);
      assert.equal(resources[1].subject.reference, 'Patient/pt');
      assert.equal(resources[0].meta.versionId, '1');
      const anonymous = [{ resource: { resourceType: 'Observation', subject: { reference: 'Patient/pt' }, valueString: 'first' } },
        { resource: { resourceType: 'Observation', subject: { reference: 'Patient/pt' }, valueString: 'second' } }];
      const local = normalize(anonymous);
      assert.match(local[0].id, /^[a-f0-9]{32}$/);
      assert.notEqual(local[0].id, local[1].id);
      assert.deepEqual(normalize(structuredClone(anonymous)), local);
    });
    await t.test('opening an episode has a native role guard, stream CAS, durable idempotency and an event', async () => {
      const doctor = config.actors[0]; const nurse = config.actors[2]; const id = ids[0];
      const command = { patient: id, expectedVersion: 1, requestId: 'new-episode' };
      assert.equal((await api(a.base, nurse, '/encounters', command)).status, 422);
      const first = await api(a.base, doctor, '/encounters', command); assert.equal(first.status, 201);
      assert.deepEqual(await api(b.base, doctor, '/encounters', command), first);
      assert.equal((await api(b.base, doctor, '/encounters', { ...command, requestId: 'stale-episode' })).status, 409);
      const read = (await api(a.base, doctor, `/patients/${id}`)).body;
      assert.equal(read.version, 2); assert.equal(read.events.at(-1).event.kind, 'encounter');
      await a.store.importPatient(patient(f, id, 1));
      assert.equal((await a.store.read(doctor, id)).version, 2);
    });
  } finally { await a.close(); await b.close(); }
});
