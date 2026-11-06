import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { configSchema, type Obj, type AdtCommand } from '../src/types.ts';
import { migrate } from '../src/store.ts';
import { AdtStore } from '../src/adt.ts';
import { api, fixture, host, patient, shuffled } from './helpers.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL required: ADT tests use real Postgres/native Lean');
function safe(board: Obj) {
  const { patients, beds } = board.state;
  assert.equal(new Set(patients.map((p: Obj) => p.id)).size, patients.length);
  assert.equal(new Set(beds.map((b: Obj) => b.id)).size, beds.length);
  for (const p of patients) {
    const placements = beds.filter((b: Obj) => b.occupant === p.id);
    assert.equal(placements.length, p.bed === null ? 0 : 1);
    if (p.bed !== null) { assert.equal(p.admitted, true); assert.equal(placements[0].id, p.bed); }
  }
  for (const b of beds) {
    assert.equal(b.phase === 'occupied', b.occupant !== null);
    if (b.occupant !== null) assert.equal(patients.find((p: Obj) => p.id === b.occupant)?.bed, b.id);
  }
}

test('ADT: signed roles, two replicas, seeded races, atomic reads/rollback, SSE and native journal replay', { timeout: 120_000 }, async t => {
  const f = await fixture();
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...await exportJWK(publicKey), kid: 'adt-test', alg: 'RS256', use: 'sig' };
  const identity = createServer((_req, res) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ keys: [jwk] })); });
  identity.listen(0, '127.0.0.1'); await once(identity, 'listening');
  const address = identity.address(); assert.ok(address && typeof address !== 'string');
  const issuer = `http://127.0.0.1:${address.port}`;
  const config = configSchema.parse({ tenant: `adt-test-${randomUUID()}`, oidc: { issuer, audience: 'vgi-commit', clientId: 'vgi-mar' },
    units: { '4-west': { name: '4 West', marOnService: true } }, adt: { patients: ['adt-a', 'adt-b'], beds: [{ id: 401, unit: '4-west' }, { id: 402, unit: '4-west' }] },
    actors: ['manager', 'charge', 'clerk', 'nurse'].map((subject, i) => ({ subject, user: { id: subject, role: 'physician' }, modelId: i + 1,
      patients: ['adt-a', 'adt-b'], units: ['4-west'], adtRoles: ['bedManager'] })), releases: {} });
  const actor = async (index: number, roles: string[], units = ['4-west']) => ({ ...config.actors[index], token: await new SignJWT({ typ: 'Bearer', azp: 'vgi-mar', realm_access: { roles }, units })
    .setProtectedHeader({ alg: 'RS256', kid: 'adt-test' }).setSubject(config.actors[index].subject!).setIssuer(issuer).setAudience('vgi-commit').setIssuedAt().setExpirationTime('5m').sign(privateKey) });
  const manager = await actor(0, ['bed-manager']); const charge = await actor(1, ['rn', 'charge-nurse']);
  const clerk = await actor(2, ['admitting-clerk']); const nurse = await actor(3, ['rn']);
  const a = await host(url, config); const b = await host(url, config);
  const board = async () => { const r = await api(b.base, manager, '/adt/board'); assert.equal(r.status, 200, JSON.stringify(r)); safe(r.body); return r.body; };
  const make = async (action: AdtCommand['action'], p = 'adt-a', bed?: number, source?: number): Promise<AdtCommand> => ({ requestId: randomUUID(), expected: (await board()).versions, action, patient: p,
    ...(bed === undefined ? {} : { bed }), ...(source === undefined ? {} : { source }) });
  const execute = async (action: AdtCommand['action'], p = 'adt-a', bed?: number, source?: number) => {
    const r = await api(a.base, manager, '/adt/commands', await make(action, p, bed, source)); assert.equal(r.status, 201, JSON.stringify(r)); return r.body;
  };
  const readyBed = async (id: number) => { await execute('clean', 'adt-a', id); await execute('ready', 'adt-a', id); };
  try {
    await migrate(a.db);
    for (const [i, p] of ['adt-a', 'adt-b'].entries()) await a.store.importPatient(patient(f, p, i + 1));
    await new AdtStore(a.store).provision();
    await t.test('signed administrative role and unit claims override provision metadata; scopes fail closed', async () => {
      assert.equal((await api(a.base, manager, '/me')).body.user.role, 'bedManager');
      assert.deepEqual((await api(a.base, charge, '/me')).body.adtRoles, ['chargeNurse']);
      assert.equal((await api(a.base, nurse, '/adt/board')).status, 403);
      assert.equal((await api(a.base, await actor(0, ['bed-manager'], []), '/adt/board')).status, 403);
      assert.equal((await api(a.base, manager, '/adt/commands', { ...await make('admit', 'adt-a', 401), user: 'charge' })).status, 400);
      assert.equal((await api(a.base, manager, '/adt/commands', await make('admit', 'adt-a', 999))).status, 403);
      assert.equal((await api(a.base, clerk, '/adt/commands', await make('clean', 'adt-a', 401))).status, 422);
      assert.equal((await api(a.base, manager, '/adt/commands', { ...await make('admit', 'adt-a', 401), expected: [] })).status, 400);
      const incomplete = await make('admit', 'adt-a', 401); incomplete.expected.pop();
      assert.equal((await api(a.base, manager, '/adt/commands', incomplete)).status, 409);
    });
    await t.test('12 seeded admission races for one bed; every winner is safe and dirty beds cannot be reused', async () => {
      for (let seed = 1; seed <= 12; seed++) {
        const x = await make('admit', 'adt-a', 401), y = { ...x, requestId: randomUUID(), patient: 'adt-b' };
        const order = shuffled([[a.base, manager, x], [b.base, charge, y]] as const, seed * 20261102);
        const results = await Promise.all(order.map(([base, who, command]) => api(base, who, '/adt/commands', command)));
        assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
        const current = await board(); const winner = current.state.beds[0].occupant; assert.ok(winner);
        await execute('discharge', winner);
        assert.equal((await api(a.base, manager, '/adt/commands', await make('admit', 'adt-a', 401))).status, 422);
        assert.equal((await api(a.base, manager, '/adt/commands', await make('ready', 'adt-a', 401))).status, 422);
        await readyBed(401);
      }
    });
    await t.test('transfer vs discharge races have one whole-state winner; readers never see half a transfer', async () => {
      for (let seed = 1; seed <= 12; seed++) {
        await execute('admit', 'adt-a', 401);
        const transfer = await make('transfer', 'adt-a', 402, 401), discharge = { ...await make('discharge'), expected: transfer.expected };
        const jobs = shuffled([[a.base, transfer], [b.base, discharge]] as const, seed);
        const readDuring = Promise.all(Array.from({ length: 6 }, () => board()));
        const results = await Promise.all(jobs.map(([base, c]) => api(base, manager, '/adt/commands', c)));
        await readDuring;
        assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
        const current = await board();
        if (current.state.patients[0].admitted) { assert.equal(current.state.patients[0].bed, 402); await execute('discharge'); await readyBed(402); }
        await readyBed(401);
      }
    });
    await t.test('release/assign, idempotency and whole transfer rollback on a late SQL event failure', async () => {
      const admission = await make('admit', 'adt-a', 401);
      const responses = await Promise.all([api(a.base, manager, '/adt/commands', admission), api(b.base, manager, '/adt/commands', admission)]);
      assert.equal(responses[0].status, 201); assert.deepEqual(responses[0], responses[1]);
      assert.equal((await api(a.base, manager, '/adt/commands', { ...admission, bed: 402 })).status, 409);
      await execute('release', 'adt-a', 401);
      assert.equal((await board()).state.patients[0].admitted, true);
      await execute('assign', 'adt-a', 402); await readyBed(401);
      const before = await board(); const command = await make('transfer', 'adt-a', 401, 402);
      const patientVersion = before.versions.find((v: Obj) => v.key === 'patient:adt-a').version;
      await a.db.query('INSERT INTO commit_events(tenant,stream,version,transaction_id,event) VALUES($1,$2,$3,$4,$5)', [config.tenant, 'patient:adt-a', patientVersion + 1, randomUUID(), { kind: 'fault' }]);
      assert.equal((await api(a.base, manager, '/adt/commands', command)).status, 503);
      assert.deepEqual(await board(), before);
      assert.equal((await api(a.base, manager, `/requests/${command.requestId}`)).status, 404);
      await a.db.query('DELETE FROM commit_events WHERE tenant=$1 AND stream=$2 AND version=$3', [config.tenant, 'patient:adt-a', patientVersion + 1]);
      assert.equal((await api(b.base, manager, '/adt/commands', command)).status, 201);
      assert.equal((await board()).state.patients[0].bed, 401);
    });
    await t.test('patient-scoped RN histories/export never disclose the full administrative board', async () => {
      const read = await api(a.base, nurse, '/patients/adt-a');
      const events = read.body.events.filter((e: Obj) => e.event.kind === 'adt');
      assert.ok(events.length);
      assert.ok(events.every((e: Obj) => !e.event.input && !e.event.accepted && e.event.patient.id === 'adt-a'));
      assert.ok(!JSON.stringify(read.body).includes('adt-b'));
      assert.equal((await api(a.base, nurse, '/patients/adt-a/fhir')).status, 404);
    });
    await t.test('SSE catch-up publishes a whole board and reconnect catches missed writes', async () => {
      const before = await board(); const abort = new AbortController(); const timer = setTimeout(() => abort.abort(), 10_000);
      try {
        const sse = await fetch(b.base + '/adt/events?after=' + before.cursor, { headers: { Authorization: `Bearer ${manager.token}` }, signal: abort.signal });
        assert.equal(sse.status, 200);
        await execute('discharge');
        const reader = sse.body!.pipeThrough(new TextDecoderStream()).getReader(); let text = '';
        while (!text.includes('event: board')) { const c = await reader.read(); assert.equal(c.done, false); text += c.value; }
        const data = JSON.parse(text.match(/^data: (.+)$/m)![1]); safe(data); assert.equal(data.state.patients[0].bed, null); await reader.cancel();
        const resumed = await fetch(a.base + '/adt/events', { headers: { Authorization: `Bearer ${manager.token}`, 'Last-Event-ID': before.cursor }, signal: abort.signal });
        const rr = resumed.body!.pipeThrough(new TextDecoderStream()).getReader(); let rt = '';
        while (!rt.includes('event: board')) { const c = await rr.read(); rt += c.value; }
        assert.match(rt, new RegExp((await board()).cursor)); await rr.cancel();
      } finally { clearTimeout(timer); abort.abort(); }
    });
    await t.test('every accepted journal transition independently replays natively; versions have no gaps and events pair atomically', async () => {
      const rows = (await a.db.query('SELECT * FROM commit_events WHERE tenant=$1 ORDER BY stream,version', [config.tenant])).rows;
      const byStream = new Map<string, number>(); const seen = new Set<string>();
      const history = new Map<string, Obj>();
      for (const bed of config.adt!.beds) history.set(`bed:${bed.id}@0`, { ...bed, phase: 'ready', occupant: null });
      for (const e of rows) {
        if (e.event.kind === 'adt-initial') history.set(`${e.stream}@${e.version}`, e.event.state);
        if (e.event.kind === 'adt') {
          const state = e.stream.startsWith('patient:') ? e.event.accepted.state.patients.find((p: Obj) => `patient:${p.id}` === e.stream) :
            e.event.accepted.state.beds.find((b: Obj) => `bed:${b.id}` === e.stream);
          history.set(`${e.stream}@${e.version}`, state);
        }
      }
      for (const e of rows) {
        assert.equal(e.version, (byStream.get(e.stream) ?? 0) + 1); byStream.set(e.stream, e.version);
        if (e.event.kind !== 'adt' || seen.has(e.transaction_id)) continue;
        seen.add(e.transaction_id);
        assert.deepEqual(await a.lean.call('adt-commit', e.event.input), e.event.accepted);
        for (const v of e.event.input.versions) {
          const inputRecord = v.key.startsWith('patient:') ? e.event.input.state.patients.find((p: Obj) => `patient:${p.id}` === v.key) :
            e.event.input.state.beds.find((b: Obj) => `bed:${b.id}` === v.key);
          assert.deepEqual(inputRecord, history.get(`${v.key}@${v.version}`));
        }
        const peers = rows.filter(r => r.transaction_id === e.transaction_id);
        for (const peer of peers) assert.equal(peer.version, e.event.input.versions.find((v: Obj) => v.key === peer.stream).version + 1);
        if (e.event.input.command.transfer) assert.equal(peers.length, 3);
      }
      for (const s of (await a.db.query('SELECT key,kind,version,snapshot FROM commit_streams WHERE tenant=$1', [config.tenant])).rows) {
        assert.equal(s.version, byStream.get(s.key) ?? 0);
        assert.deepEqual(s.kind === 'patient' ? s.snapshot.adt : s.snapshot, history.get(`${s.key}@${s.version}`));
      }
      assert.ok(seen.size > 100);
    });
  } finally {
    for (const table of ['commit_mar_cosigns', 'commit_events', 'commit_requests', 'commit_sessions', 'commit_streams']) await a.db.query(`DELETE FROM ${table} WHERE tenant=$1`, [config.tenant]);
    await a.close(); await b.close(); await new Promise<void>(resolve => identity.close(() => resolve()));
  }
});
