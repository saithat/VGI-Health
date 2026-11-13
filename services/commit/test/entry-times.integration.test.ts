import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { migrate } from '../src/store.ts';
import { obj, objs, required, type Obj } from '../src/types.ts';
import { host, api, intent } from './helpers.ts';
import { draftsFixture, search, open, entry, sign } from './drafts-fixture.ts';

const url = process.env.DATABASE_URL;
test('trusted entry clock, bounded human time override, replay and persisted late marker', { skip: !url }, async () => {
  if (!url) throw new Error('DATABASE_URL required');
  let now = Date.parse('2026-11-12T20:00:00Z');
  const minute = Math.floor(now / 60000);
  const f = draftsFixture(`entry-times-${randomUUID()}`);
  const release = required(f.config.releases.P1);
  const spec = obj(release.spec);
  spec.alerts = [];
  spec.design = { ...obj(spec.design), lateEntryMinutes: 2 };
  const source = objs(spec.elements)[0];
  required(source).observation = true;
  spec.elements = [source, { id: 'hpi.observedAt', label: 'Time taken', kind: 'text', enteredBy: ['physician'],
    prefill: 'never', friction: 'compliance', humanOnly: true, observationOf: 'hpi',
    validation: { observationTime: { source: 'hpi' } }, fhirTarget: 'Provenance.extension.observedAt' }];
  objs(objs(obj(release.program).screens)[0]?.components).push({ id: 'timeTaken', label: 'Time taken',
    kind: { field: { element: 'hpi.observedAt', slot: { fixed: { n: 0 } }, prefill: 'none' } },
    visibility: 'always', tab: 0, size: 'normal', tag: 'timeTaken' });
  const a = await host(url, f.config, 0, () => now);
  async function event(s: Obj, event: Obj) {
    const response = await api(a.base, f.actor, `/sessions/${s.sessionId}/events`, { revision: s.revision, event });
    assert.equal(response.status, 200, JSON.stringify(response));
    return { ...s, ...response.body };
  }
  try {
    await migrate(a.db);
    await a.store.importPatient(required(f.patients[0]));
    const opened = await api(a.base, f.actor, '/sessions', { patient: 'draft-A', release: 'P1', workflow: 'chart',
      expectedVersion: 1, encounter: 'enc-draft-A' });
    assert.equal(opened.status, 201, JSON.stringify(opened));
    let s = await event(await event(opened.body, search('draft-A')), open('draft-A'));
    s = await event(s, { ...entry, entryEpochMinute: minute + 99999 });
    assert.equal(objs(obj(s.state).captured)[0]?.enteredAt, minute);
    const taken = (time: number) => ({ enter: { comp: 'timeTaken', value: { text: { s: String(time) } } } });
    s = await event(s, taken(minute + 1));
    assert.notEqual(s.result, 'ok');
    s = await event(s, taken(minute - 3));
    assert.equal(s.result, 'ok');
    now += 60000;
    // Force authoritative journal reconstruction at the same bound source version.
    const renewed = await api(a.base, f.actor, `/sessions/${s.sessionId}/renew`, { revision: s.revision });
    assert.equal(renewed.status, 201, JSON.stringify(renewed));
    assert.deepEqual(obj(renewed.body.state).captured, obj(s.state).captured);
    s = { ...s, ...renewed.body };
    const command = { ...intent(s, 'timed-sign', sign), commit: 'signNote' };
    const accepted = await api(a.base, f.actor, '/commands', command);
    assert.equal(accepted.status, 201, JSON.stringify(accepted));
    now += 20 * 60000;
    const duplicate = await api(a.base, f.actor, '/commands', command);
    assert.deepEqual(duplicate, accepted);
    const snapshot = await a.store.read(f.actor, 'draft-A');
    const provenance = objs(obj(obj(snapshot.snapshot).bundle).entry).map(e => obj(e.resource))
      .find(r => r.resourceType === 'Provenance' && objs(r.extension).some(e => String(e.url).endsWith('/entry-times')));
    assert.ok(provenance);
    const late = objs(provenance.extension).find(e => String(e.url).endsWith('/late-entry'));
    assert.ok(late);
    assert.equal(JSON.parse(String(late.valueString)).observedAt, '2026-11-12T19:57:00.000Z');
    assert.equal(JSON.parse(String(late.valueString)).signedAt, '2026-11-12T20:01:00.000Z');
  } finally {
    for (const table of ['commit_draft_checkpoints', 'commit_sessions', 'commit_requests', 'commit_events', 'commit_streams'])
      await a.db.query(`DELETE FROM ${table} WHERE tenant=$1`, [f.config.tenant]);
    await a.close();
  }
});
