import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { migrate } from '../src/store.ts';
import { configSchema, obj, objs, required, type Obj } from '../src/types.ts';
import { host, api, intent } from './helpers.ts';
import { leave, search, open } from './drafts-fixture.ts';

/** A small order release on the shipped drug element: one order line, one
 * order-entry commit. Two inpatients carry native ADT records. */
function ordersFixture(tenant: string) {
  const shipped = JSON.parse(readFileSync(new URL('../../../releases/v3/spec.json', import.meta.url), 'utf8'));
  const drug = objs(shipped.elements).find(e => e.id === 'drug');
  const spec = { ...shipped, elements: [drug], infos: [], reviews: [], alerts: [],
    commits: [{ id: 'signOrders', label: 'Sign orders', roles: ['physician'] }],
    entries: [{ commit: 'signOrders', element: 'drug', when: 'always', perOrderLine: true }] };
  const component = (id: string, label: string, kind: unknown) => ({ id, label, kind, tag: id, visibility: 'always', tab: 0, size: 'normal' });
  const program = { id: 'deficiency-test', version: 1, owner: 'P1', role: 'physician', specVersion: spec.version,
    start: 'clinical', patientSelection: true, macros: [], screens: [{ id: 'clinical', title: 'Orders', workflow: 'W1', components: [
      component('banner', 'Patient banner', 'banner'),
      component('drugField', 'Medication', { field: { element: 'drug', slot: { fixed: { n: 0 } }, prefill: 'none' } }),
      component('sign', 'Sign orders', { button: { action: { commit: { commit: 'signOrders' } } } }),
    ] }] };
  const ids = ['def-A', 'def-B'];
  const config = configSchema.parse({ tenant, actors: [{ token: 'synthetic-deficiency-test-token-only', persona: 'P1',
    user: { id: 'P1', role: 'physician' }, modelId: 1, patients: ids }],
    releases: { P1: { spec, program, workflows: { chart: { commit: 'signOrders', project: true } } } } });
  const patients = ids.map((id, i) => ({ patient: id, modelId: i + 1,
    context: { today: '2026-11-02', now: 600, receipts: [], record: [], encounterId: `enc-${id}` },
    bundle: { resourceType: 'Bundle', type: 'collection', entry: [
      { resource: { resourceType: 'Patient', id, meta: { versionId: '1' }, name: [{ text: id, family: id }],
        identifier: [{ system: 'http://hospital.example/mrn', value: id }], birthDate: '1960-01-01', gender: 'male' } },
      { resource: { resourceType: 'Encounter', id: `enc-${id}`, meta: { versionId: '1' }, status: 'in-progress',
        class: { code: 'IMP' }, subject: { reference: `Patient/${id}` } } },
    ] } }));
  return { config, actor: required(config.actors[0]), patients };
}

const url = process.env.DATABASE_URL;
test('deficiency list, transfer reconciliation and discharge provenance through native Lean', { skip: !url }, async () => {
  if (!url) throw new Error('DATABASE_URL required');
  const f = ordersFixture(`deficiencies-${randomUUID()}`);
  let clock = Date.parse('2026-11-02T10:00:00Z');
  const a = await host(url, f.config, 0, () => clock);
  const actor = f.actor;
  const t = f.config.tenant;
  const versions = new Map<string, number>();
  const openInput = (patient: string, extra: Obj = {}) => ({ patient, release: 'P1', workflow: 'chart',
    expectedVersion: versions.get(patient) ?? 1, encounter: `enc-${patient}`, ...extra });
  async function event(s: Obj, e: Obj) {
    const r = await api(a.base, actor, `/sessions/${s.sessionId}/events`, { revision: s.revision, event: e });
    assert.equal(r.status, 200, JSON.stringify(r));
    return { ...s, ...r.body };
  }
  async function checkpoint(s: Obj) {
    const r = await api(a.base, actor, '/draft-checkpoints', { sessionId: s.sessionId, revision: s.revision, event: leave });
    assert.equal(r.status, 201, JSON.stringify(r));
    return r.body.checkpointId;
  }
  async function select(s: Obj, patient: string) { return event(await event(s, search(patient)), open(patient)); }
  /** Stand-in for a native ADT transition: the patient record moves to the given stamp. */
  async function adt(patient: string, record: Obj, bump = true) {
    await a.db.query(`UPDATE commit_streams SET snapshot=jsonb_set(snapshot,'{adt}',$3::jsonb), version=version+$4 WHERE tenant=$1 AND key=$2`,
      [t, `patient:${patient}`, JSON.stringify({ id: patient, bed: null, last: null, ...record }), bump ? 1 : 0]);
    if (bump) versions.set(patient, (versions.get(patient) ?? 1) + 1);
  }
  const drug = (code: string) => ({ enter: { comp: 'drugField', value: { code: { c: code } } } });
  try {
    await migrate(a.db);
    for (const patient of f.patients) await a.store.importPatient(patient);
    await adt('def-A', { admitted: true, revision: 1, encounter: 1 }, false);
    await adt('def-B', { admitted: true, revision: 1, encounter: 1 }, false);

    // Unsigned orders on A and B, each saved at departure with its ADT stamp.
    let s = (await api(a.base, actor, '/sessions', openInput('def-A'))).body;
    s = await select(s, 'def-A');
    s = await event(s, drug('acetaminophen'));
    const k1 = await checkpoint(s);
    const stamps = (await a.db.query('SELECT draft_adt FROM commit_draft_checkpoints WHERE tenant=$1 AND id=$2', [t, k1])).rows[0].draft_adt;
    assert.deepEqual(stamps, { 'def-A': { revision: 1, encounter: 1, admitted: true, encounterId: 'enc-def-A' } });
    s = (await api(a.base, actor, '/sessions', openInput('def-B', { checkpointId: k1 }))).body;
    s = await select(s, 'def-B');
    s = await event(s, drug('acetaminophen'));
    const k2 = await checkpoint(s);
    // A frozen server clock gives both saves the same timestamp. The latest
    // directory must follow save order, independently of their random UUIDs.
    const saved = (await a.db.query('SELECT id,created_at FROM commit_draft_checkpoints WHERE tenant=$1 AND id=ANY($2::uuid[])', [t, [k1, k2]])).rows;
    assert.equal(saved.length, 2);
    assert.equal(new Date(saved[0].created_at).getTime(), new Date(saved[1].created_at).getTime());
    const carried = (await a.db.query('SELECT draft_adt FROM commit_draft_checkpoints WHERE tenant=$1 AND id=$2', [t, k2])).rows[0].draft_adt;
    assert.deepEqual(Object.keys(carried).sort(), ['def-A', 'def-B']);

    // Both drafts are pending; a day later they are delinquent (local policy).
    let list = await api(a.base, actor, '/deficiencies');
    assert.equal(list.status, 200, JSON.stringify(list));
    assert.deepEqual(objs(list.body.deficiencies).map(d => [d.patient, d.label, d.status]),
      [['def-A', 'Unsigned draft: Sign orders', 'pending'], ['def-B', 'Unsigned draft: Sign orders', 'pending']]);
    assert.equal(obj(list.body.activity).info, 'deficiencies');
    clock += 1441 * 60_000;
    list = await api(a.base, actor, '/deficiencies');
    assert.deepEqual(objs(list.body.deficiencies).map(d => d.status), ['delinquent', 'delinquent']);

    // Transfer A. Its restored order line is tagged; signing is refused until a decision.
    await adt('def-A', { admitted: true, revision: 2, encounter: 1 });
    list = await api(a.base, actor, '/deficiencies');
    assert.equal(objs(list.body.deficiencies)[0].label, 'Unsigned draft: Sign orders (needs reconciliation)');
    const opened = await api(a.base, actor, '/sessions', openInput('def-A', { checkpointId: k2, deficiencyList: list.body.id }));
    assert.equal(opened.status, 201, JSON.stringify(opened));
    assert.ok(objs(obj(obj(opened.body.facts).patientDirectory).activities).some(x => x.info === 'deficiencies'));
    s = await select(opened.body, 'def-A');
    const restored = objs(obj(s.state).captured).find(x => x.element === 'drug');
    assert.equal(required(restored).provenance, 'needsReconciliation');
    // Re-entering the value keeps the line awaiting the decision.
    s = await event(s, drug('acetaminophen'));
    assert.equal(objs(obj(s.state).captured).find(x => x.element === 'drug')?.provenance, 'needsReconciliation');
    const refused = await api(a.base, actor, '/commands', { ...intent(s, 'sign-before-decision', { click: { comp: 'sign' } }), commit: 'signOrders' });
    assert.equal(refused.status, 422, JSON.stringify(refused));
    assert.match(JSON.stringify(refused.body), /Needs reconciliation/);
    s = await event(s, { enter: { comp: 'reconcile.line|0', value: { code: { c: 'keep' } } } });
    assert.equal(objs(obj(s.state).captured).find(x => x.element === 'drug')?.provenance, 'reconciled:keep');
    const screen = await a.lean.call('render-screen', { spec: s.spec, program: s.program, user: s.user, ...obj(s.projection), state: s.state });
    assert.doesNotMatch(JSON.stringify(screen.screen), /orderReconciliation/);
    const k3 = await checkpoint(s);

    // Discharge B. Its order line is not restored, is kept for provenance and listed as discarded.
    await adt('def-B', { admitted: false, revision: 2, encounter: 1 });
    s = (await api(a.base, actor, '/sessions', openInput('def-B', { checkpointId: k3 }))).body;
    s = await select(s, 'def-B');
    assert.equal(objs(obj(s.state).captured).filter(x => x.element === 'drug').length, 0);
    const kept = (await a.db.query('SELECT captured FROM commit_discarded_drafts WHERE tenant=$1 AND patient=$2', [t, 'def-B'])).rows;
    assert.equal(kept.length, 1);
    assert.deepEqual(objs(kept[0].captured).map(x => x.element), ['drug']);
    const source = (await a.db.query('SELECT workspace_state FROM commit_draft_checkpoints WHERE tenant=$1 AND id=$2', [t, k3])).rows[0].workspace_state;
    assert.ok(objs(obj(source).patientDrafts).some(d => d.patient === 'def-B' && objs(d.captured).some(x => x.element === 'drug')), 'source checkpoint unchanged');
    list = await api(a.base, actor, '/deficiencies');
    assert.ok(objs(list.body.deficiencies).some(d => d.patient === 'def-B' && d.status === 'discardedAtDischarge'), JSON.stringify(list.body));

    // A list belongs to its login; another actor cannot bind it.
    const other = { ...actor, user: { ...actor.user, id: 'another' }, token: 'synthetic-deficiency-other-actor-only' };
    f.config.actors.push(other);
    const foreign = await api(a.base, other, '/sessions', openInput('def-A', { deficiencyList: list.body.id }));
    assert.equal(foreign.body.error, 'deficiency_list_not_found');
  } finally {
    for (const table of ['commit_deficiency_lists', 'commit_discarded_drafts', 'commit_draft_checkpoints', 'commit_requests', 'commit_sessions', 'commit_events', 'commit_streams'])
      await a.db.query(`DELETE FROM ${table} WHERE tenant=$1`, [t]);
    await a.close();
  }
});

/** New specification for owner review: actual FHIR periods drive live temporal
 * deficiencies without a draft, typed attestation or UI interaction. */
test('live temporal deficiencies use trusted discharge evidence and the service clock', { skip: !url }, async () => {
  if (!url) throw new Error('DATABASE_URL required');
  const f = ordersFixture(`temporal-deficiencies-${randomUUID()}`);
  const temporal = { id: 'record-completion-deadline',
    subject: { event: 'record.completed', artifactKey: 'completeMedicalRecord' },
    anchor: { event: 'discharge', artifactKey: 'completeMedicalRecord' },
    minOffset: 0, maxOffset: 1440, deadline: 1440, metric: 'minutes' };
  const release = required(f.config.releases.P1);
  release.spec = { ...obj(release.spec), entries: [], commits: [{ id: 'completeMedicalRecord', label: 'Complete record',
    roles: ['physician'], temporal: [temporal] }] };
  let clock = Date.parse('2026-11-02T10:00:00Z');
  const a = await host(url, f.config, 0, () => clock);
  try {
    await migrate(a.db);
    const imported = required(f.patients[0]);
    const encounter = required(imported.bundle.entry[1]).resource;
    Object.assign(encounter, { status: 'finished', period: { start: '2026-11-01T08:00:00Z', end: '2026-11-02T09:00:00Z' } });
    await a.store.importPatient(imported);
    const completed = required(f.patients[1]);
    Object.assign(required(completed.bundle.entry[1]).resource, { status: 'finished',
      period: { start: '2026-11-01T08:00:00Z', end: '2026-11-02T09:00:00Z' } });
    const certificate = { resourceType: 'Composition', id: 'record-completion', meta: { versionId: '1' }, status: 'final',
      subject: { reference: `Patient/${completed.patient}` }, encounter: { reference: `Encounter/enc-${completed.patient}` },
      type: { coding: [{ system: 'urn:vgi:document-type', code: 'medical-record-completion' }] },
      attester: [{ mode: ['legal'], time: '2026-11-02T11:00:00Z', party: { reference: 'Practitioner/doctor' } }] };
    obj(completed.bundle).entry = [...completed.bundle.entry, { resource: certificate }];
    await a.store.importPatient(completed);
    let list = await api(a.base, f.actor, '/deficiencies');
    assert.equal(list.status, 200, JSON.stringify(list));
    let rows = objs(list.body.deficiencies);
    assert.equal(rows.length, 2, JSON.stringify(list.body));
    assert.ok(rows.every(row => row.status === 'pending'), 'a future actual signature supplies no evidence');
    assert.equal(required(rows[0]).deadline, Date.parse('2026-11-03T09:00:00Z') / 60_000);
    clock += 1440 * 60_000;
    list = await api(a.base, f.actor, '/deficiencies');
    rows = objs(list.body.deficiencies);
    assert.equal(rows.length, 1, 'the signed, current-version completion certificate satisfies the second chart');
    assert.equal(required(rows[0]).patient, imported.patient);
    assert.equal(required(rows[0]).status, 'delinquent');
    // An unsigned or generic note does not complete the entire record.
    assert.equal(required(rows[0]).commit, 'completeMedicalRecord');
  } finally {
    for (const table of ['commit_deficiency_lists', 'commit_discarded_drafts', 'commit_draft_checkpoints', 'commit_requests', 'commit_sessions', 'commit_events', 'commit_streams'])
      await a.db.query(`DELETE FROM ${table} WHERE tenant=$1`, [f.config.tenant]);
    await a.close();
  }
});
