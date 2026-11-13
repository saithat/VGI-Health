import { array, digest, num, obj, objs, required, type Obj } from '../src/types.ts';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { migrate, versions } from '../src/store.ts';

import { fixture, host, api, ready, intent, patient, configuration, adminEvents, admissionEvents, shuffled } from './helpers.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required; integration tests never substitute an in-memory store');
const seed = Number(process.env.CONCURRENCY_SEED ?? 20261102);
const sign = { click: { comp: 'signButton' } };
const administer = { click: { comp: 'w4Admin.commit.administerMed' } };
const disposition = { click: { comp: 'w3Disposition.commit.disposition' } };

test('real Postgres: HTTP, durable outcomes, atomic failure, notifications and seeded multi-actor histories', { timeout: 180_000 }, async t => {
  const f = await fixture();
  const tenant = `test-${randomUUID()}`;
  const patients = ['pt-1', ...Array.from({ length: 4 }, (_, i) => `dose-${i}`),
    ...Array.from({ length: 12 }, (_, i) => `bed-${i}`)];
  const config = configuration(f, tenant, patients);
  let a = await host(url, config);
  const b = await host(url, config);
  const doctor = config.actors[20];
  let persistedCommand: ReturnType<typeof intent>;
  try {
    await migrate(a.db); await migrate(b.db); // rerunnable migrations
    await a.store.importPatient(patient(f, 'pt-1', 1));
    for (let i = 0; i < 4; i++) await a.store.importPatient(patient(f, `dose-${i}`, 10 + i, true));
    for (let i = 0; i < 12; i++) await a.store.importPatient(patient(f, `bed-${i}`, 100 + i));

    await t.test('auth, strict intent, server reconstruction, guard refusal and stable idempotency across replicas', async () => {
      assert.equal((await fetch(a.base + '/patients/pt-1')).status, 401);
      const outsider = { ...doctor, patients: [] };
      assert.throws(() => a.store.authorize(outsider, 'pt-1'), /patient_forbidden/);
      assert.equal((await api(a.base, doctor, '/commands', { state: f.tiny.state })).status, 400);
      const opened = await api(a.base, doctor, '/sessions', { patient: 'pt-1', release: 'tiny', workflow: 'sign' });
      const unready = intent(opened.body, 'unprepared', sign);
      const denied = await api(a.base, doctor, '/commands', unready);
      assert.equal(denied.status, 422, JSON.stringify(denied));
      assert.equal(denied.body.outcome, 'rejected');
      assert.deepEqual(await api(b.base, doctor, '/commands', unready), denied);
      const s = await ready(a.base, doctor, 'pt-1', 'tiny', 'sign', f.tinyEvents);
      const duplicateEvent = { revision: s.revision - 1, event: f.tinyEvents[0] };
      assert.equal((await api(b.base, doctor, `/sessions/${s.sessionId}/events`, duplicateEvent)).status, 409);
      assert.equal((await api(a.base, doctor, `/sessions/${s.sessionId}/events`, { revision: s.revision, event: sign })).status, 422);
      const command = intent(s, 'same-payload', sign);
      persistedCommand = command;
      const results = await Promise.all(Array.from({ length: 16 }, (_, i) => api(i % 2 ? a.base : b.base, doctor, '/commands', command)));
      assert.equal(results[0].status, 201, JSON.stringify(results[0]));
      for (const r of results) assert.deepEqual(r, results[0]);
      const read = await api(b.base, doctor, '/patients/pt-1?after=1');
      assert.equal(read.body.version, 2);
      assert.equal(objs(read.body.events).length, 1);
      assert.equal(obj(obj(read.body.snapshot).lastCommand).transactionId, results[0].body.transactionId);
      const lookup = await api(b.base, doctor, '/requests/same-payload');
      assert.deepEqual(lookup.body, { status: results[0].status, body: results[0].body });
      assert.equal((await api(a.base, config.actors[21], '/requests/same-payload')).status, 404);
      const journal = array(read.body.events)[0];
      assert.equal(obj(obj(obj(obj(journal).event).guard).input).commit, 'signOrders');
      assert.equal(obj(journal).version, 2);
      assert.equal((await api(a.base, doctor, '/patients/pt-1/fhir')).status, 404);
      const scopes = doctor.patients;
      doctor.patients = scopes.filter(p => p !== 'pt-1');
      try {
        assert.equal((await api(b.base, doctor, '/requests/same-payload')).status, 403);
        assert.equal((await api(b.base, doctor, '/commands', command)).status, 403);
      } finally { doctor.patients = scopes; }
      assert.equal((await api(a.base, doctor, '/commands', { ...command, expectedVersion: 2 })).status, 409);
      assert.equal((await api(a.base, doctor, '/commands', { ...command, requestId: 'stale' })).status, 409);
    });
    await t.test('restart recovers outcome; SSE catches another replica and resumes by durable version', async () => {
      await a.close(); a = await host(url, config);
      const outcome = (await a.db.query('SELECT outcome FROM commit_requests WHERE tenant=$1 AND request_id=$2', [tenant, 'same-payload'])).rows[0].outcome;
      assert.equal(outcome.status, 201);
      await a.db.query("UPDATE commit_sessions SET created_at=now()-interval '1 hour' WHERE tenant=$1 AND id=$2",
        [tenant, persistedCommand.sessionId]);
      const recovered = await api(a.base, doctor, '/commands', persistedCommand);
      assert.deepEqual(recovered, { status: outcome.status, body: outcome.body });
      assert.equal((await api(a.base, doctor, '/commands', { ...persistedCommand, requestId: 'expired-new-intent' })).status, 409);
      const s = await ready(b.base, doctor, 'pt-1', 'tiny', 'sign', f.tinyEvents);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      try {
        const res = await fetch(a.base + '/patients/pt-1/events?after=0', {
          headers: { Authorization: `Bearer ${doctor.token}`, 'Last-Event-ID': '2' }, signal: controller.signal,
        });
        assert.equal(res.status, 200);
        assert.equal((await api(b.base, doctor, '/commands', intent(s, 'notified', sign))).status, 201);
        const reader = required(res.body).getReader();
        let text = '';
        while (!text.includes('event: commit\n')) {
          const next = await reader.read(); assert.equal(next.done, false);
          text += new TextDecoder().decode(next.value);
        }
        assert.match(text, /id: 3\nevent: commit/);
        assert.doesNotMatch(text, /id: [12]\n/);
        await reader.cancel();
      } finally { clearTimeout(timer); controller.abort(); }
      assert.equal((await api(a.base, doctor, '/patients/pt-1/events?after=999')).status, 409);
    });
    await t.test('SQL failure after a snapshot write rolls everything back; identical request can recover', async () => {
      const s = await ready(a.base, doctor, 'pt-1', 'tiny', 'sign', f.tinyEvents);
      const command = intent(s, 'sql-failure', sign);
      // Deliberate fault injection into this test tenant only: collide with the
      // append AFTER the service updates its snapshot in the transaction.
      await a.db.query('INSERT INTO commit_events(tenant,stream,version,transaction_id,event) VALUES($1,$2,$3,$4,$5)',
        [tenant, 'patient:pt-1', s.version + 1, randomUUID(), { kind: 'fault-injection' }]);
      assert.equal((await api(a.base, doctor, '/commands', command)).status, 503);
      const read = await api(b.base, doctor, '/patients/pt-1');
      assert.equal(read.body.version, s.version);
      assert.equal((await a.db.query('SELECT * FROM commit_requests WHERE tenant=$1 AND request_id=$2', [tenant, command.requestId])).rowCount, 0);
      await a.db.query('DELETE FROM commit_events WHERE tenant=$1 AND stream=$2 AND version=$3', [tenant, 'patient:pt-1', s.version + 1]);
      assert.equal((await api(b.base, doctor, '/commands', command)).status, 201);
    });

    await t.test('multi-stream SQL failure and Lean failure cannot publish a partial bed/patient commit', async () => {
      const s = await ready(a.base, doctor, 'bed-0', 'admission', 'secondBed', admissionEvents());
      const command = intent(s, 'multi-stream-failure', disposition);
      const original = a.lean.call.bind(a.lean);
      a.lean.call = async (op, input) => {
        if (op === 'multi-step') throw new Error('Injected authority process failure after clinical guard');
        return original(op, input);
      };
      try { assert.equal((await api(a.base, doctor, '/commands', command)).status, 503); }
      finally { a.lean.call = original; }
      await a.db.query('INSERT INTO commit_events(tenant,stream,version,transaction_id,event) VALUES($1,$2,$3,$4,$5)',
        [tenant, 'patient:bed-0', s.version + 1, randomUUID(), { kind: 'fault-injection' }]);
      assert.equal((await api(a.base, doctor, '/commands', command)).status, 503);
      const streams = (await b.db.query('SELECT key,version,snapshot FROM commit_streams WHERE tenant=$1 AND key=ANY($2)',
        [tenant, ['bed:43', 'patient:bed-0']])).rows;
      assert.equal(streams.find(x => x.key === 'bed:43').version, 0);
      assert.deepEqual(streams.find(x => x.key === 'bed:43').snapshot.placements, []);
      assert.equal(streams.find(x => x.key === 'patient:bed-0').version, s.version);
      assert.equal((await api(b.base, doctor, '/requests/multi-stream-failure')).status, 404);
      await a.db.query('DELETE FROM commit_events WHERE tenant=$1 AND stream=$2 AND version=$3', [tenant, 'patient:bed-0', s.version + 1]);
      assert.equal((await api(b.base, doctor, '/commands', command)).status, 201);
    });

    await t.test(`CONCURRENCY seed=${seed}: 32 actors, interleaved doses, admissions and stale versions`, { timeout: 120_000 }, async () => {
      const nurses = config.actors.slice(0, 20);
      const doctors = config.actors.slice(20);
      const bases = [a.base, b.base];
      // Everyone observes the same before-version before this wave is released.
      const nursing = await Promise.all(nurses.map(async (actor, i) => {
        const id = `dose-${i % 4}`;
        return { actor, patient: id, base: bases[i % 2], s: await ready(bases[i % 2], actor, id, 'nurse', 'dose', adminEvents(f, id)), event: administer };
      }));
      const admissions = await Promise.all(doctors.map(async (actor, i) => ({
        actor, patient: `bed-${i}`, base: bases[i % 2],
        s: await ready(bases[i % 2], actor, `bed-${i}`, 'admission', 'admit', admissionEvents()), event: disposition,
      })));
      const racers = shuffled([...nursing, ...admissions], seed);
      const attempts = racers.flatMap((r, i) => [
        { ...r, command: intent(r.s, `race-${i}`, r.event) },
        { ...r, command: { ...intent(r.s, `stale-${i}`, r.event), expectedVersion: 0 } },
        // Same key/payload races through another replica; no duplicate effect.
        { ...r, base: r.base === a.base ? b.base : a.base, command: intent(r.s, `race-${i}`, r.event) },
      ]);
      const results = await Promise.all(shuffled(attempts, seed ^ 17).map(async r => ({ ...r,
        result: await api(r.base, r.actor, '/commands', r.command) })));
      assert.ok(results.every(r => [201, 409].includes(r.result.status)), JSON.stringify(results.map(r => r.result)));
      assert.ok(results.filter(r => r.command.requestId.startsWith('stale')).every(r => r.result.status === 409));
      const uniqueAccepted = new Set(results.filter(r => r.result.status === 201).map(r => r.result.body.transactionId));
      assert.equal(uniqueAccepted.size, 5, 'four independent doses and exactly one shared bed');
      // Refreshing the losing nurse cannot administer the consumed occurrence.
      const loser = required(nursing.find(r => !results.some(x => x.actor === r.actor && x.result.status === 201)));
      const refreshed = await ready(a.base, loser.actor, loser.patient, 'nurse', 'dose', adminEvents(f, loser.patient));
      const consumed = await api(a.base, loser.actor, '/commands', intent(refreshed, 'fresh-duplicate-dose', administer));
      assert.equal(consumed.status, 409, JSON.stringify(consumed));
      assert.equal(consumed.body.reason, 'shared_guard');
      // A different occurrence is independent and can be committed.
      const later = await ready(b.base, loser.actor, loser.patient, 'nurse', 'laterDose', adminEvents(f, loser.patient));
      assert.equal((await api(a.base, loser.actor, '/commands', intent(later, 'later-dose', administer))).status, 201);
      // Shared expected version and actual occupancy are both checked.
      const bed = (await a.db.query('SELECT snapshot,version FROM commit_streams WHERE tenant=$1 AND key=$2', [tenant, 'bed:42'])).rows[0];
      const occupant = num(bed.snapshot.placements[0][1]);
      const winnerPatient = `bed-${occupant - 100}`;
      const wrongPatient = winnerPatient === 'bed-0' ? 'bed-1' : 'bed-0';
      const wrongRelease = await ready(a.base, doctor, wrongPatient, 'admission', 'release', admissionEvents('discharge'));
      assert.equal((await api(b.base, doctor, '/commands', intent(wrongRelease, 'wrong-release', disposition))).status, 409);
      const release = await ready(a.base, doctor, winnerPatient, 'admission', 'release', admissionEvents('discharge'));
      assert.equal((await api(b.base, doctor, '/commands', intent(release, 'right-release', disposition))).status, 201);
      const reuse = await ready(a.base, doctor, wrongPatient, 'admission', 'admit', admissionEvents());
      assert.equal((await api(b.base, doctor, '/commands', intent(reuse, 'reuse-bed', disposition))).status, 201);
      // Hammer stale patient versions after successful commits, from both hosts.
      const stale = await Promise.all(Array.from({ length: 128 }, (_, i) => {
        const r = racers[i % racers.length];
        return api(bases[i % 2], r.actor, '/commands', { ...intent(r.s, `hammer-${i}`, r.event), expectedVersion: 0 });
      }));
      assert.ok(stale.every(r => r.status === 409));
      t.diagnostic(`seed=${seed}, actors=32, concurrent attempts=${attempts.length + 128}, initial accepted transactions=5`);
    });

    await t.test('audit every accepted command against its prior persisted version and the real Lean guard; replay shared histories', async () => {
      const rows = (await a.db.query('SELECT * FROM commit_events WHERE tenant=$1 ORDER BY stream,version', [tenant])).rows;
      let checked = 0;
      const states = new Map<string, Obj>();
      for (const row of rows) {
        const e = row.event;
        if (row.stream.startsWith('patient:')) {
          if (e.kind === 'import') { states.set(row.stream, e.patient); continue; }
          assert.equal(e.kind, 'command');
          assert.equal(e.readVersions[row.stream], row.version - 1);
          const before = required(states.get(row.stream));
          assert.deepEqual(e.guard.input.currentBundle, before.bundle);
          assert.deepEqual(e.guard.input.factsVersions, versions(obj(obj(before).bundle)));
          const projected = await b.lean.call('facts', { bundle: before.bundle, context: e.session.context });
          const base = { spec: e.guard.input.spec, program: e.guard.input.program, user: e.guard.input.user, facts: projected.facts };
          let reconstructed = await b.lean.call('init', base);
          assert.equal(e.session.revision, e.session.events.length);
          for (const stored of e.session.events) {
            const { entryEpochMinute, ...event } = stored;
            const facts = Number.isSafeInteger(entryEpochMinute) ? { ...obj(base.facts), epochMinute: entryEpochMinute } : base.facts;
            reconstructed = obj((await b.lean.call('step', { ...base, facts, state: reconstructed, event })).state);
          }
          assert.deepEqual(reconstructed, e.guard.input.state);
          assert.deepEqual(await b.lean.call('commit-check', e.guard.input), e.guard.decision);
          assert.ok(e.guard.decision.accept);
          const correlated = rows.filter(r => r.transaction_id === row.transaction_id);
          assert.equal(correlated.length, e.shared ? 2 : 1);
          if (e.shared) {
            const sharedRow = required(correlated.find(r => r.stream === e.shared.key));
            assert.equal(e.readVersions[e.shared.key], sharedRow.version - 1);
            const replay = await b.lean.call('multi-step', { state: e.shared.before, action: e.shared.action });
            assert.equal(replay.changed, true);
            assert.deepEqual(replay.state, e.shared.after);
          }
          states.set(row.stream, before); checked++;
        } else {
          const before = states.get(row.stream) ?? { administrations: [], placements: [] };
          const replay = await b.lean.call('multi-step', { state: before, action: e.action });
          assert.equal(replay.changed, true);
          assert.deepEqual(replay.state, e.state);
          assert.equal(new Set(e.state.administrations.map((x: Obj[]) => digest(x[0]))).size, e.state.administrations.length);
          assert.equal(new Set(e.state.placements.map((x: number[]) => x[0])).size, e.state.placements.length);
          states.set(row.stream, e.state);
        }
      }
      assert.ok(checked >= 11);
      const streams = (await a.db.query('SELECT * FROM commit_streams WHERE tenant=$1', [tenant])).rows;
      for (const s of streams) {
        const history = rows.filter(r => r.stream === s.key);
        assert.deepEqual(history.map(r => r.version), Array.from({ length: s.version }, (_, i) => i + 1));
        if (s.kind !== 'patient') assert.deepEqual(s.snapshot, states.get(s.key) ?? { administrations: [], placements: [] });
      }
      assert.ok(rows.filter(r => r.stream === 'bed:43').length === 1);
      t.diagnostic(`replayed ${checked} accepted clinical guards and all dose/bed transitions from durable histories`);
    });
  } finally {
    // Delete only this random tenant, in FK order; never truncate shared tables.
    for (const table of ['commit_events', 'commit_requests', 'commit_sessions', 'commit_streams'])
      await b.db.query(`DELETE FROM ${table} WHERE tenant=$1`, [tenant]);
    await a.close(); await b.close();
  }
});
