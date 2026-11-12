import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { migrate } from '../src/store.ts';
import { obj, objs, type Obj } from '../src/types.ts';
import { host, api, intent } from './helpers.ts';
import { draftsFixture, leave, search, open, entry, alert, ack, sign } from './drafts-fixture.ts';

const url = process.env.DATABASE_URL;
test('draft continuation isolates patients, restores acknowledgments and accepts a note with complete painted evidence', { skip: !url }, async () => {
  if (!url) throw new Error('DATABASE_URL required');
  const f = draftsFixture(`drafts-${randomUUID()}`);
  const a = await host(url, f.config);
  const actor = f.actor;
  const openInput = (patient: string, continuation?: Obj) => ({ patient, release: 'P1', workflow: 'chart',
    expectedVersion: 1, encounter: `enc-${patient}`, ...(continuation ? { continuation } : {}) });
  async function event(s: Obj, event: Obj) {
    const r = await api(a.base, actor, `/sessions/${s.sessionId}/events`, { revision: s.revision, event });
    assert.equal(r.status, 200, JSON.stringify(r));
    return { ...s, ...r.body };
  }
  const continuation = (s: Obj, event = leave) => ({ sessionId: s.sessionId, revision: s.revision, event });
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
    assert.equal((await api(a.base, actor, '/sessions', openInput('draft-B', continuation(s)))).body.error, 'continuation_requires_directory');
    s = await event(s, ack);
    const original = structuredClone(obj(s.state));
    assert.equal((await api(a.base, actor, '/sessions', openInput('draft-B', { ...continuation(s), revision: 0 }))).body.error, 'continuation_mismatch');
    const other = { ...actor, user: { ...actor.user, id: 'another' }, token: 'synthetic-drafts-other-actor-only' };
    f.config.actors.push(other);
    assert.equal((await api(a.base, other, '/sessions', openInput('draft-B', continuation(s)))).body.error, 'session_not_found');
    assert.equal((await api(a.base, actor, '/sessions', { ...openInput('draft-B', continuation(s)), state: original })).status, 400);
    const b = await api(a.base, actor, '/sessions', openInput('draft-B', continuation(s)));
    assert.equal(b.status, 201, JSON.stringify(b));
    s = await select(b.body, 'draft-B');
    assert.deepEqual(obj(s.state).captured, []); assert.deepEqual(obj(s.state).acked, []);
    assert.deepEqual(objs(obj(s.state).patientDrafts)[0].captured, original.captured);
    s = await event(s, { enter: { comp: 'noteField', value: { text: { s: 'Patient B distinct note' } } } });
    const reopened = await api(a.base, actor, '/sessions', openInput('draft-A', continuation(s)));
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
    const afterSign = await api(a.base, actor, '/sessions', { ...openInput('draft-A', continuation(s)), expectedVersion: 2 });
    assert.equal(afterSign.status, 201, JSON.stringify(afterSign));
    s = await select(afterSign.body, 'draft-A');
    assert.deepEqual(obj(s.state).captured, []);
    assert.deepEqual(obj(s.state).acked, original.acked);
    assert.equal((await api(a.base, actor, '/commands', { ...intent(s, 'second-sign', sign), commit: 'signNote' })).status, 422);
  } finally {
    for (const table of ['commit_requests', 'commit_sessions', 'commit_events', 'commit_streams'])
      await a.db.query(`DELETE FROM ${table} WHERE tenant=$1`, [f.config.tenant]);
    await a.close();
  }
});
