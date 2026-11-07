import { array, configSchema, obj, objs, type Obj } from '../src/types.ts';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { recordAdtBaseline, checkAdtTrace } from '../model/check-adt-trace.ts';
import { migrate } from '../src/store.ts';
import { AdtStore } from '../src/adt.ts';
import { fixture, host, patient, intent, api, admissionEvents } from './helpers.ts';
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL required');
test('clinical admission shares the ADT bed stream: native guards, board CAS, atomic chart/bed projection and replay', { timeout: 120000 }, async t => {
  const f = await fixture();
  const config = configSchema.parse({ tenant: `clinical-adt-${randomUUID()}`,
    units: { west: { name: 'West', marOnService: true } }, adt: { patients: ['clinical-a','clinical-b','clinical-c'], beds: [{ id: 42, unit: 'west', resource: 'bed-a' }] },
    actors: [{ token: 'clinical-adt-physician-synthetic-token', persona: 'P2', user: { id: 'P2', role: 'physician' }, modelId: 1,
      units: ['west'], adtRoles: ['admittingClerk', 'bedManager'], patients: ['clinical-a','clinical-b','clinical-c'] },
      { token: 'clinical-reader-synthetic-token-only', user: { id: 'reader', role: 'rn' }, modelId: 2, patients: ['clinical-a'], units: ['west'] }],
    releases: { P2: { spec: f.hospitalSpec, program: f.admissionProgram, workflows: { admit: { commit: 'disposition', project: true } } } } });
  const h = await host(url, config); const actor = config.actors[0];
  const dir = mkdtempSync(join(tmpdir(), 'clinical-adt-trace-'));
  const path = join(dir, 'trace.jsonl');
  const prior = process.env.COMMIT_PROTOCOL_TRACE;
  process.env.COMMIT_PROTOCOL_TRACE = path;
  try {
    await migrate(h.db);
    for (const [i, id] of ['clinical-a','clinical-b','clinical-c'].entries()) {
      const p = patient(f, id, i+1);
      obj(obj(array(obj(p.bundle).entry)[1]).resource).class = { code: id === 'clinical-c' ? 'IMP' : 'EMER' };
      objs(obj(p.bundle).entry).push({ resource: { resourceType: 'Location', id: 'bed-a', meta: { versionId: '1' }, status: 'active', physicalType: { coding: [{ code: 'bd' }] }, operationalStatus: { code: 'U' } } });
      await h.store.importPatient(p);
    }
    await new AdtStore(h.store).provision();
    recordAdtBaseline(actor, config, await new AdtStore(h.store).read(actor));
    const open = async (id: string) => {
      const s = await api(h.base, actor, '/sessions', { patient: id, release: 'P2', workflow: 'admit', encounter: 'enc-1', expectedVersion: 2, bed: 'bed-a' });
      assert.equal(s.status, 201, JSON.stringify(s));
      for (const event of admissionEvents()) Object.assign(s.body, (await api(h.base, actor, `/sessions/${s.body.sessionId}/events`, { revision: s.body.revision, event })).body);
      return s.body;
    };
    const a = await open('clinical-a'), b = await open('clinical-b');
    const unrelated = await h.store.read(actor, 'clinical-c', 2147483646);
    const clinical = (row: Obj) => objs(obj(obj(row.snapshot).bundle).entry).filter((e: Obj) => obj(e.resource).resourceType !== 'Location');
    const commit = (s: Obj, requestId: string) => ({ ...intent(s, requestId, { click: { comp: 'w3Disposition.commit.disposition' } }), expectedBoard: s.board, bed: 'bed-a' });
    const accepted = await api(h.base, actor, '/commands', commit(a,'admit-a'));
    assert.equal(accepted.status, 201, JSON.stringify(accepted));
    const unchanged = await h.store.read(actor, 'clinical-c', 2147483646);
    assert.equal(unchanged.version, unrelated.version, 'An unrelated inpatient must keep its chart version');
    assert.deepEqual(clinical(unchanged), clinical(unrelated));
    assert.deepEqual(accepted.body.board, (await new AdtStore(h.store).read(actor)).versions);
    assert.equal((await api(h.base, actor, '/commands', commit(b,'stale-bed'))).status, 409);
    const fresh = await open('clinical-b');
    assert.equal((await api(h.base, actor, '/commands', commit(fresh,'occupied-bed'))).status, 422);
    const board = await new AdtStore(h.store).read(actor);
    assert.equal(obj(board.state.beds[0]).occupant, 'clinical-a');
    const current = await h.store.read(actor, 'clinical-a');
    assert.equal(current.version, 3); assert.equal(current.snapshot.adt.bed, 42);
    assert.ok(current.snapshot.bundle.entry.some((e: Obj) => obj(e.resource).resourceType === 'Encounter' && obj(obj(e.resource).class).code === 'IMP' && obj(obj(array(obj(e.resource).location)[0]).location).reference === 'Location/bed-a'));
    const event = current.events.at(-1).event;
    assert.deepEqual(await h.lean.call('commit-check', event.guard.input), event.guard.decision);
    assert.deepEqual(await h.lean.call('adt-commit', event.clinicalAdt.input), event.clinicalAdt.accepted);
    assert.equal((await api(h.base, actor, '/commands', commit(a,'stale-chart'))).status, 409);
    const released = await api(h.base, actor, '/adt/commands', { requestId: 'admin-discharge',
      expected: (await new AdtStore(h.store).read(actor)).versions, action: 'discharge', patient: 'clinical-a' });
    assert.equal(released.status, 201);
    assert.equal(obj(array(obj((await new AdtStore(h.store).read(actor)).state).beds)[0]).phase, 'dirty');
    t.diagnostic(checkAdtTrace(path));
    // Historical clinical-ADT envelopes must respect the same patient scope as
    // administrative envelopes. Seed one in this isolated test tenant only.
    await h.db.query('INSERT INTO commit_events(tenant,stream,version,transaction_id,event) VALUES($1,$2,5,$3,$4)',
      [config.tenant, 'patient:clinical-a', randomUUID(), { kind: 'clinical-adt', actor: actor.user.id, requestId: 'historical-envelope', input: event.clinicalAdt.input, accepted: event.clinicalAdt.accepted }]);
    await h.db.query('UPDATE commit_streams SET version=5 WHERE tenant=$1 AND key=$2', [config.tenant, 'patient:clinical-a']);
    const scoped = await api(h.base, config.actors[1], '/patients/clinical-a?after=4');
    assert.equal(scoped.status, 200);
    const envelope = obj(array(scoped.body.events)[0]).event;
    assert.equal(obj(envelope).kind, 'clinical-adt');
    assert.equal(obj(obj(envelope).patient).id, 'clinical-a');
    assert.equal(obj(envelope).input, undefined); assert.equal(obj(envelope).accepted, undefined);

  } finally {
    if (prior === undefined) delete process.env.COMMIT_PROTOCOL_TRACE; else process.env.COMMIT_PROTOCOL_TRACE = prior;
    await h.close();
    if (process.env.COMMIT_PROTOCOL_TRACE_KEEP) t.diagnostic(`clinical ADT trace retained: ${path}`);
    else rmSync(dir, { recursive: true, force: true });
  }
});
