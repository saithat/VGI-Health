import { array, num, obj, type Obj } from '../src/types.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate } from '../src/store.ts';

import { checkTrace, compileTrace } from '../model/check-trace.ts';
import { fixture, host, api, ready, intent, patient, configuration, adminEvents, admissionEvents } from './helpers.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required; protocol refinement tests use real Postgres');
const sign = { click: { comp: 'signButton' } };
const administer = { click: { comp: 'w4Admin.commit.administerMed' } };
const disposition = { click: { comp: 'w3Disposition.commit.disposition' } };

test('protocol refinement TEST: actual guard/cache, replica races, rollback and uncertain COMMIT traces', { timeout: 120_000 }, async t => {
  const f = await fixture();
  const tenant = `protocol-${randomUUID()}`;
  const config = configuration(f, tenant, ['pt', 'dose', 'bed-a', 'bed-b']);
  const a = await host(url, config); const b = await host(url, config);
  const dir = mkdtempSync(join(tmpdir(), 'commit-model-trace-'));
  const path = join(dir, 'trace.jsonl');
  const prior = process.env.COMMIT_PROTOCOL_TRACE;
  process.env.COMMIT_PROTOCOL_TRACE = path;
  const doctor = config.actors[20];
  try {
    await migrate(a.db);
    await a.store.importPatient(patient(f, 'pt', 1));
    await a.store.importPatient(patient(f, 'dose', 2, true));
    await a.store.importPatient(patient(f, 'bed-a', 3));
    await a.store.importPatient(patient(f, 'bed-b', 4));

    await t.test('returned refusal has no append and is stable across replicas', async () => {
      const s = (await api(a.base, doctor, '/sessions', { patient: 'pt', release: 'tiny', workflow: 'sign' })).body;
      const command = intent(s, 'refusal', sign);
      const refusal = await api(a.base, doctor, '/commands', command);
      assert.equal(refusal.status, 422);
      assert.deepEqual(await api(b.base, doctor, '/commands', command), refusal);
      assert.equal((await a.store.read(doctor, 'pt')).version, 1);
      assert.equal((await api(a.base, doctor, '/commands', { ...command, requestId: 'unexpected-shared', expectedSharedVersion: 0 })).status, 409);
    });
    await t.test('screen mismatch rolls back its reservation; corrected evidence reuses the ID', async () => {
      const s = await ready(a.base, doctor, 'pt', 'tiny', 'sign', f.tinyEvents);
      const command = intent(s, 'screen-retry', sign);
      const broken = structuredClone(command);
      obj(array(broken.screens.frames)[0]).hash = '0'.repeat(64);
      assert.equal((await api(a.base, doctor, '/commands', broken)).body.error, 'screen_fingerprint_mismatch');
      assert.equal((await a.store.read(doctor, 'pt')).version, 1);
      assert.equal((await a.db.query('SELECT 1 FROM commit_requests WHERE tenant=$1 AND request_id=$2', [tenant, command.requestId])).rowCount, 0);
      // Keep the rest of this trace's baseline unchanged: exercise corrected
      // evidence through a real guard failure, then roll the transaction back.
      const call = a.lean.call.bind(a.lean);
      a.lean.call = async (op, input) => { if (op === 'commit-check') throw new Error('test corrected screen rollback'); return call(op, input); };
      try { assert.equal((await api(a.base, doctor, '/commands', command)).status, 503); }
      finally { a.lean.call = call; }
    });
    await t.test('cached and fresh replay agree; aborted guards publish nothing; stale cache cannot authorize', async () => {
      const cached = await ready(a.base, doctor, 'pt', 'tiny', 'sign', f.tinyEvents);
      const fresh = await ready(b.base, doctor, 'pt', 'tiny', 'sign', f.tinyEvents);
      await b.db.query('UPDATE commit_sessions SET native_state=NULL,native_facts=NULL,native_version=NULL WHERE tenant=$1 AND id=$2', [tenant, fresh.sessionId]);
      const inputs: Obj[] = []; const decisions: Obj[] = [];
      for (const [h, s] of [[a, cached], [b, fresh]] as const) {
        const call = h.lean.call.bind(h.lean);
        h.lean.call = async (op, input) => {
          const decision = await call(op, input);
          if (op === 'commit-check') { inputs.push(obj(input)); decisions.push(decision); throw new Error('test rollback after guard'); }
          return decision;
        };
        try { assert.equal((await api(h.base, doctor, '/commands', intent(s, `aborted-${inputs.length}`, sign))).status, 503); }
        finally { h.lean.call = call; }
      }
      assert.deepEqual(inputs[0].state, inputs[1].state);
      assert.deepEqual(decisions[0], decisions[1]);
      assert.equal((await a.store.read(doctor, 'pt')).version, 1);
      const command = intent(cached, 'accepted', sign);
      const raced = await Promise.all([a, b, a, b].map(h => api(h.base, doctor, '/commands', command)));
      assert.equal(raced[0].status, 201); raced.forEach(r => assert.deepEqual(r, raced[0]));
      assert.equal((await api(b.base, doctor, '/commands', intent(fresh, 'stale-cache', sign))).status, 409);
      assert.equal((await api(b.base, doctor, '/commands', { ...command, expectedVersion: 2 })).status, 409);
      assert.equal((await a.store.read(doctor, 'pt')).version, 2);
    });
    await t.test('same dose and same bed races use shared streams', async () => {
      const nurses = config.actors.slice(0, 2);
      const doses = await Promise.all(nurses.map((actor, i) => ready(i ? b.base : a.base, actor, 'dose', 'nurse', 'dose', adminEvents(f, 'dose'))));
      const missing = intent(doses[0], 'missing-shared', administer);
      delete missing.expectedSharedVersion;
      assert.equal((await api(a.base, nurses[0], '/commands', missing)).status, 409);
      const results = await Promise.all(nurses.map((actor, i) => api(i ? b.base : a.base, actor, '/commands', intent(doses[i], `dose-${i}`, administer))));
      assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
      const consumed = await ready(a.base, nurses[0], 'dose', 'nurse', 'dose', adminEvents(f, 'dose'));
      const invalidScreens = intent(consumed, 'consumed-before-screen-enforcement', administer);
      obj(array(invalidScreens.screens.frames)[0]).hash = '0'.repeat(64);
      const conflict = await api(a.base, nurses[0], '/commands', invalidScreens);
      assert.equal(conflict.status, 409);
      assert.equal(conflict.body.reason, 'shared_guard');
      const beds = await Promise.all(['bed-a', 'bed-b'].map((p, i) => ready(i ? b.base : a.base, doctor, p, 'admission', 'admit', admissionEvents())));
      const placements = await Promise.all(beds.map((s, i) => api(i ? b.base : a.base, doctor, '/commands', intent(s, `bed-${i}`, disposition))));
      assert.deepEqual(placements.map(r => r.status).sort(), [201, 409]);
    });
    await t.test('SQL failure after snapshot update rolls back; original request recovers', async () => {
      const s = await ready(a.base, doctor, 'pt', 'tiny', 'sign', f.tinyEvents);
      const command = intent(s, 'sql-rollback', sign);
      await a.db.query('INSERT INTO commit_events(tenant,stream,version,transaction_id,event) VALUES($1,$2,$3,$4,$5)',
        [tenant, 'patient:pt', s.version + 1, randomUUID(), { kind: 'test-collision' }]);
      try { assert.equal((await api(a.base, doctor, '/commands', command)).status, 503); }
      finally { await a.db.query('DELETE FROM commit_events WHERE tenant=$1 AND stream=$2 AND version=$3', [tenant, 'patient:pt', s.version + 1]); }
      assert.equal((await a.store.read(doctor, 'pt')).version, s.version);
      assert.equal((await api(b.base, doctor, '/commands', command)).status, 201);
    });
    await t.test('lost COMMIT reply preserves one durable effect and stable recovery', async () => {
      const s = await ready(a.base, doctor, 'pt', 'tiny', 'sign', f.tinyEvents);
      const command = intent(s, 'uncertain-commit', sign);
      const connect = a.db.connect.bind(a.db);
      a.db.connect = new Proxy(connect, {
        apply(target, receiver, args: unknown[]) {
          if (args.length) return Reflect.apply(target, receiver, args);
          return target().then(client => {
            const query = client.query;
            client.query = new Proxy(query, {
              apply(queryTarget, queryReceiver, queryArgs: unknown[]) {
                const result: unknown = Reflect.apply(queryTarget, queryReceiver, queryArgs);
                if (queryArgs[0] === 'COMMIT' && result instanceof Promise) return result.then(() => {
                  client.query = query;
                  throw new Error('test lost COMMIT reply after actual durable commit');
                });
                return result;
              },
            });
            return client;
          });
        },
      });
      try { assert.equal((await api(a.base, doctor, '/commands', command)).status, 503); }
      finally { a.db.connect = connect; }
      const recovered = await api(b.base, doctor, '/commands', command);
      assert.equal(recovered.status, 201);
      assert.equal((await a.store.read(doctor, 'pt')).version, s.version + 1);
      const count = await a.db.query('SELECT count(*)::int AS n FROM commit_events WHERE tenant=$1 AND event->>\'requestId\'=$2', [tenant, command.requestId]);
      assert.equal(count.rows[0].n, 1);
    });
    await t.test('patient snapshots equal the fold of durable command events', async () => {
      const streams = (await a.db.query("SELECT key,version,snapshot FROM commit_streams WHERE tenant=$1 AND kind='patient'", [tenant])).rows;
      for (const stream of streams) {
        const history = (await a.db.query('SELECT version,transaction_id,event FROM commit_events WHERE tenant=$1 AND stream=$2 ORDER BY version', [tenant, stream.key])).rows;
        assert.deepEqual(history.map(e => e.version), Array.from({ length: stream.version }, (_, i) => i + 1));
        let snapshot = history[0].event.patient;
        for (const row of history.slice(1)) {
          const e = row.event;
          assert.equal(e.kind, 'command');
          assert.equal(e.readVersions[stream.key], row.version - 1);
          assert.equal(e.guard.decision.accept !== undefined, true);
          snapshot = { ...snapshot, lastCommand: { transactionId: row.transaction_id,
            commit: e.guard.input.commit, state: e.guard.decision.accept.state } };
        }
        assert.deepEqual(stream.snapshot, snapshot);
      }
    });
    await t.test('recorded traces have a Lean model witness; tampered guards, versions and partial writes fail', () => {
      t.diagnostic(checkTrace(path));
      const rows = readFileSync(path, 'utf8').trim().split('\n').map(line => JSON.parse(line));
      const target = rows.find(r => r.step === 'write').attempt;
      const mutations = [
        (r: Obj) => { if (r.attempt === target && r.step === 'native') r.accept = false; },
        (r: Obj) => { if (r.attempt === target && r.step === 'screens') r.valid = false; },
        (r: Obj) => { if (r.attempt === target && r.step === 'screens') r.step = 'missing-screens'; },
        (r: Obj) => { if (r.attempt === target && r.step === 'write') r.before = num(r.before) + 1; },
        (r: Obj) => { if (r.attempt === target && r.step === 'write') r.step = 'missing-write'; },
      ];
      for (const mutate of mutations) {
        const changed = structuredClone(rows); changed.forEach(mutate);
        assert.throws(() => compileTrace(changed));
      }
      // A coherent but false locked-read version gets past shape checks and
      // must be rejected by Model.advance, rather than only the TS adapter.
      const single = rows.filter(r => r.attempt === target);
      const broken = structuredClone(single);
      const read = broken.find(r => r.step === 'read'); read.expected[0][1]++; broken[0].expectedVersion++;
      const corrupt = join(dir, 'corrupt.jsonl'); writeFileSync(corrupt, broken.map(r => JSON.stringify(r)).join('\n') + '\n');
      assert.throws(() => checkTrace(corrupt), /NOT A MODEL TRACE/);
    });
  } finally {
    if (prior === undefined) delete process.env.COMMIT_PROTOCOL_TRACE; else process.env.COMMIT_PROTOCOL_TRACE = prior;
    for (const table of ['commit_events', 'commit_requests', 'commit_sessions', 'commit_streams'])
      await a.db.query(`DELETE FROM ${table} WHERE tenant=$1`, [tenant]);
    await a.close(); await b.close();
    // Preserve an explicitly requested trace; otherwise remove only this test's scratch.
    if (process.env.COMMIT_PROTOCOL_TRACE_KEEP) t.diagnostic(`trace retained: ${path}`);
    else rmSync(dir, { recursive: true, force: true });
  }
});
