import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { migrate } from '../src/store.ts';
import { obj, objs, type Obj } from '../src/types.ts';
import { host, api, intent } from './helpers.ts';
import { draftsFixture, leave, search, open, entry, alert, ack, sign } from './drafts-fixture.ts';

const url = process.env.DATABASE_URL;
test('draft checkpoint isolates patients, restores acknowledgments and accepts a note with complete painted evidence', { skip: !url }, async () => {
  if (!url) throw new Error('DATABASE_URL required');
  const f = draftsFixture(`drafts-${randomUUID()}`);
  const a = await host(url, f.config);
  const actor = f.actor;
  const openInput = (patient: string, checkpointId?: unknown) => ({ patient, release: 'P1', workflow: 'chart',
    expectedVersion: 1, encounter: `enc-${patient}`, ...(checkpointId ? { checkpointId } : {}) });
  async function event(s: Obj, event: Obj) {
    const r = await api(a.base, actor, `/sessions/${s.sessionId}/events`, { revision: s.revision, event });
    assert.equal(r.status, 200, JSON.stringify(r));
    return { ...s, ...r.body };
  }
  const departure = (s: Obj, event = leave) => ({ sessionId: s.sessionId, revision: s.revision, event });
  async function checkpoint(s: Obj) {
    const result = await api(a.base, actor, '/draft-checkpoints', departure(s));
    assert.equal(result.status, 201, JSON.stringify(result)); return result.body.checkpointId;
  }
  async function select(s: Obj, patient: string) { return event(await event(s, search(patient)), open(patient)); }
  try {
    await migrate(a.db);
    for (const patient of f.patients) await a.store.importPatient(patient);
    const initial = await api(a.base, actor, '/sessions', openInput('draft-A'));
    assert.equal(initial.status, 201, JSON.stringify(initial));
    let s = initial.body;
    s = await select(s, 'draft-A');
    s = await event(s, entry); s = await event(s, alert);
    assert.ok(obj(s.state).popup);
    assert.equal((await api(a.base, actor, '/draft-checkpoints', departure(s))).body.error, 'checkpoint_requires_directory');
    s = await event(s, ack);
    const original = structuredClone(obj(s.state));
    assert.equal((await api(a.base, actor, '/draft-checkpoints', { ...departure(s), revision: 0 })).body.error, 'checkpoint_revision_mismatch');
    const other = { ...actor, user: { ...actor.user, id: 'another' }, token: 'synthetic-drafts-other-actor-only' };
    f.config.actors.push(other);
    assert.equal((await api(a.base, other, '/draft-checkpoints', departure(s))).body.error, 'session_not_found');
    assert.equal((await api(a.base, actor, '/sessions', { ...openInput('draft-B'), state: original })).status, 400);
    const b = await api(a.base, actor, '/sessions', openInput('draft-B', await checkpoint(s)));
    assert.equal(b.status, 201, JSON.stringify(b));
    s = await select(b.body, 'draft-B');
    assert.deepEqual(obj(s.state).captured, []); assert.deepEqual(obj(s.state).acked, []);
    assert.deepEqual(objs(obj(s.state).patientDrafts)[0].captured, original.captured);
    s = await event(s, { enter: { comp: 'noteField', value: { text: { s: 'Patient B distinct note' } } } });
    const reopened = await api(a.base, actor, '/sessions', openInput('draft-A', await checkpoint(s)));
    assert.equal(reopened.status, 201, JSON.stringify(reopened));
    s = await select(reopened.body, 'draft-A');
    assert.deepEqual(obj(s.state).captured, original.captured);
    assert.deepEqual(obj(s.state).acked, original.acked);
    s = await event(s, alert); assert.equal(obj(s.state).popup, undefined);
    const command = { ...intent(s, 'draft-sign', sign), commit: 'signNote' };
    const bad = await api(a.base, actor, '/commands', { ...command, screens: { ...command.screens, frames: [] } });
    assert.equal(bad.body.error, 'screen_fingerprint_mismatch');
    const accepted = await api(a.base, actor, '/commands', command);
    assert.equal(accepted.status, 201, JSON.stringify(accepted));
    assert.deepEqual(obj(accepted.body.state).commits, ['signNote']);
    assert.equal(objs(obj(accepted.body.state).patientDrafts)[0].patient, 'draft-B');
    const read = await a.store.read(actor, 'draft-A');
    assert.ok(objs(obj(obj(read.snapshot).bundle).entry).some(e => obj(e.resource).resourceType === 'DocumentReference'));
    s = { ...s, ...accepted.body };
    const afterSign = await api(a.base, actor, '/sessions', { ...openInput('draft-A', await checkpoint(s)), expectedVersion: 2 });
    assert.equal(afterSign.status, 201, JSON.stringify(afterSign));
    s = await select(afterSign.body, 'draft-A');
    assert.deepEqual(obj(s.state).captured, []);
    assert.deepEqual(obj(s.state).acked, original.acked);
    assert.equal((await api(a.base, actor, '/commands', { ...intent(s, 'second-sign', sign), commit: 'signNote' })).status, 422);
  } finally {
    for (const table of ['commit_draft_checkpoints', 'commit_requests', 'commit_sessions', 'commit_events', 'commit_streams'])
      await a.db.query(`DELETE FROM ${table} WHERE tenant=$1`, [f.config.tenant]);
    await a.close();
  }
});

for (const change of ['expired source', 'changed source version']) test(`departure checkpoint survives ${change} while signing patient B`, { skip: !url }, async () => {
  if (!url) throw new Error('DATABASE_URL required');
  let now = Date.now();
  const f = draftsFixture(`draft-delay-${randomUUID()}`);
  const a = await host(url, f.config, 0, () => now);
  try {
    await migrate(a.db);
    for (const patient of f.patients) await a.store.importPatient(patient);
    const openInput = (patient: string) => ({ patient, release: 'P1', workflow: 'chart', expectedVersion: 1, encounter: `enc-${patient}` });
    let s = (await api(a.base, f.actor, '/sessions', openInput('draft-A'))).body;
    for (const event of [search('draft-A'), open('draft-A'), entry]) {
      const next = await api(a.base, f.actor, `/sessions/${s.sessionId}/events`, { revision: s.revision, event });
      assert.equal(next.status, 200, JSON.stringify(next)); s = { ...s, ...next.body };
    }
    // Departure reference is captured before time passes or another writer acts.
    const departure = { sessionId: s.sessionId, revision: s.revision, event: leave };
    const checkpoint = await api(a.base, f.actor, '/draft-checkpoints', departure);
    assert.equal(checkpoint.status, 201, JSON.stringify(checkpoint));
    if (change === 'expired source') now += 6 * 60_000;
    else await a.db.query('UPDATE commit_streams SET version=version+1 WHERE tenant=$1 AND key=$2', [f.config.tenant, 'patient:draft-A']);
    const b = await api(a.base, f.actor, '/sessions', { ...openInput('draft-B'), checkpointId: checkpoint.body.checkpointId });
    assert.equal(b.status, 201, JSON.stringify(b));
    s = b.body;
    for (const event of [search('draft-B'), open('draft-B'), entry, alert, ack]) {
      const next = await api(a.base, f.actor, `/sessions/${s.sessionId}/events`, { revision: s.revision, event });
      assert.equal(next.status, 200, JSON.stringify(next)); s = { ...s, ...next.body };
    }
    // The checkpoint is immutable/idempotent even after the source expires or changes.
    assert.deepEqual(await api(a.base, f.actor, '/draft-checkpoints', departure), checkpoint);
    const accepted = await api(a.base, f.actor, '/commands', { ...intent(s, 'sign-B', sign), commit: 'signNote' });
    assert.equal(accepted.status, 201, JSON.stringify(accepted));
  } finally {
    for (const table of ['commit_draft_checkpoints', 'commit_requests', 'commit_sessions', 'commit_events', 'commit_streams'])
      await a.db.query(`DELETE FROM ${table} WHERE tenant=$1`, [f.config.tenant]);
    await a.close();
  }
});

test('long stays renew the same replay and screen interval; expired sessions and stale current patients still cannot commit', { skip: !url }, async () => {
  if (!url) throw new Error('DATABASE_URL required');
  let now = Date.now();
  const f = draftsFixture(`draft-renew-${randomUUID()}`);
  const a = await host(url, f.config, 0, () => now);
  try {
    await migrate(a.db);
    for (const patient of f.patients) await a.store.importPatient(patient);
    let s = (await api(a.base, f.actor, '/sessions', { patient: 'draft-B', release: 'P1', workflow: 'chart', expectedVersion: 1, encounter: 'enc-draft-B' })).body;
    for (const event of [search('draft-B'), open('draft-B'), entry, alert, ack]) {
      const next = await api(a.base, f.actor, `/sessions/${s.sessionId}/events`, { revision: s.revision, event });
      assert.equal(next.status, 200, JSON.stringify(next)); s = { ...s, ...next.body };
    }
    now += 6 * 60_000;
    const old = await api(a.base, f.actor, '/commands', { ...intent(s, 'expired-B', sign), commit: 'signNote' });
    assert.equal(old.body.error, 'session_expired');
    const renewed = await api(a.base, f.actor, `/sessions/${s.sessionId}/renew`, { revision: s.revision });
    assert.equal(renewed.status, 201, JSON.stringify(renewed));
    s = { ...s, ...renewed.body };
    const accepted = await api(a.base, f.actor, '/commands', { ...intent(s, 'renewed-B', sign), commit: 'signNote' });
    assert.equal(accepted.status, 201, JSON.stringify(accepted));
    s = { ...s, ...accepted.body };
    // The interval after a successful sign must remain intact on renewal, too.
    now += 6 * 60_000;
    const again = await api(a.base, f.actor, `/sessions/${s.sessionId}/renew`, { revision: s.revision });
    assert.equal(again.status, 201, JSON.stringify(again)); s = { ...s, ...again.body };
    assert.equal((await api(a.base, f.actor, '/draft-checkpoints', { sessionId: s.sessionId, revision: s.revision, event: leave })).status, 201);
    await a.db.query('UPDATE commit_streams SET version=version+1 WHERE tenant=$1 AND key=$2', [f.config.tenant, 'patient:draft-B']);
    assert.equal((await api(a.base, f.actor, `/sessions/${s.sessionId}/renew`, { revision: s.revision })).body.error, 'version_conflict');
  } finally {
    for (const table of ['commit_draft_checkpoints', 'commit_requests', 'commit_sessions', 'commit_events', 'commit_streams'])
      await a.db.query(`DELETE FROM ${table} WHERE tenant=$1`, [f.config.tenant]);
    await a.close();
  }
});

test('checkpoints belong to the OIDC login session and pinned release, not just the actor', { skip: !url }, async () => {
  if (!url) throw new Error('DATABASE_URL required');
  const f = draftsFixture(`draft-scope-${randomUUID()}`);
  const a = await host(url, f.config);
  try {
    await migrate(a.db);
    for (const patient of f.patients) await a.store.importPatient(patient);
    // Test verified sid values at the Store seam; real tokens get sid from auth.ts.
    f.config.oidc = { issuer: 'https://identity.example', audience: 'ehr', clientId: 'ehr' };
    const actor = { ...f.actor, loginSession: 'login-one' };
    const opened = await a.store.openSession(actor, { patient: 'draft-A', release: 'P1', workflow: 'chart', expectedVersion: 1, encounter: 'enc-draft-A' });
    let s: Obj = opened;
    for (const event of [search('draft-A'), open('draft-A'), entry]) s = { ...s, ...await a.store.event(actor, String(s.sessionId), { revision: Number(s.revision), event }) };
    const checkpoint = await a.store.checkpoint(actor, { sessionId: String(s.sessionId), revision: Number(s.revision), event: leave });
    const next = { patient: 'draft-B', release: 'P1', workflow: 'chart', expectedVersion: 1, encounter: 'enc-draft-B', checkpointId: checkpoint.checkpointId };
    assert.ok((await a.store.openSession({ ...actor, token: 'new-access-token-same-login-session' }, next)).sessionId);
    await assert.rejects(a.store.openSession({ ...actor, loginSession: 'login-two' }, next), /checkpoint_not_found/);
    await assert.rejects(a.store.openSession({ ...actor, loginSession: undefined }, next), /login_session_required/);
    const release = f.config.releases.P1;
    if (!release) throw new Error('Missing release');
    release.program.version = 2;
    await assert.rejects(a.store.openSession(actor, next), /checkpoint_release_mismatch/);
  } finally {
    for (const table of ['commit_draft_checkpoints', 'commit_requests', 'commit_sessions', 'commit_events', 'commit_streams'])
      await a.db.query(`DELETE FROM ${table} WHERE tenant=$1`, [f.config.tenant]);
    await a.close();
  }
});
