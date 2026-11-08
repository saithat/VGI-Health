import { array, configSchema, maybeObj, obj, objs, required, str, type Obj } from '../src/types.ts';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';

import { migrate } from '../src/store.ts';
import { api, fixture, host, intent, ready, patient, adminEvents } from './helpers.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL required: MAR tests use real Postgres and native Lean');
const administer = { click: { comp: 'w4Admin.commit.administerMed' } };
const scheduledTime = '2026-11-02T10:00:00Z';

test('OIDC MAR: two nurses, exactly one dose; stale rejection, evidence reduction and refreshed primary/SSE', { timeout: 120_000 }, async t => {
  const f = await fixture();
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...await exportJWK(publicKey), kid: 'test-key', alg: 'RS256', use: 'sig' };
  const issuerHost = createServer((_req, res) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ keys: [jwk] })); });
  issuerHost.listen(0, '127.0.0.1'); await once(issuerHost, 'listening');
  const address = issuerHost.address(); assert.ok(address && typeof address !== 'string');
  const issuer = `http://127.0.0.1:${address.port}`;
  const tenant = `mar-test-${randomUUID()}`;
  const config = configSchema.parse({ tenant, oidc: { issuer, audience: 'vgi-commit', clientId: 'vgi-mar' },
    // These metadata roles deliberately disagree with the token: claims are authoritative.
    actors: ['nurse-a', 'nurse-b', 'doctor'].map((subject, i) => ({ subject, user: { id: `unused-${i}`, role: 'physician' }, modelId: i + 1,
      patients: ['mar-patient', 'held-patient', 'refused-patient', 'not-given-patient', 'delayed-patient', 'high-patient', 'failure-patient'] })),
    releases: { nurse: { spec: f.hospitalSpec, program: f.nurseProgram, workflows: Object.fromEntries(
      ['mar', 'held', 'refused', 'high', 'failure', 'not-given', 'delayed'].map((kind, i) => [kind, { commit: 'administerMed', shared: { kind: 'dose', order: i + 1, occurrence: 600 },
        mar: { patient: `${kind}-patient`, medicationRequest: 'mar-order', encounter: 'enc-1', scheduledTime } }])) } } });
  const token = async (sub: string, roles = ['rn'], extra: Obj = {}) => new SignJWT({ typ: 'Bearer', azp: 'vgi-mar', realm_access: { roles }, ...extra })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).setSubject(sub).setIssuer(issuer).setAudience('vgi-commit')
    .setIssuedAt().setExpirationTime('5m').sign(privateKey);
  const actor = async (index: number, roles = ['rn'], extra: Obj = {}) => ({ ...config.actors[index], token: await token(required(config.actors[index].subject), roles, extra) });
  const a = await host(url, config); const b = await host(url, config);
  const nurseA = await actor(0); const nurseB = await actor(1);
  try {
    await migrate(a.db);
    for (const [i, kind] of ['mar', 'held', 'refused', 'high', 'failure', 'not-given', 'delayed'].entries()) {
      const p = patient(f, `${kind}-patient`, i + 1, true);
      obj(obj(array(obj(p.bundle).entry)[1]).resource).class = { code: 'IMP' };
      objs(obj(p.bundle).entry).push({ resource: { resourceType: 'MedicationRequest', id: 'mar-order', meta: { versionId: '1' }, status: 'active', intent: 'order',
        subject: { reference: `Patient/${kind}-patient` }, encounter: { reference: 'Encounter/enc-1' },
        medicationCodeableConcept: { text: kind === 'high' ? 'insulin lispro' : 'amoxicillin' },
        dosageInstruction: [{ timing: { event: [scheduledTime] }, doseAndRate: [{ doseQuantity: { value: 500, unit: 'mg' } }] }] } });
      if (kind === 'failure') {
        objs(obj(p.bundle).entry).push({ resource: { resourceType: 'MedicationAdministration', id: 'prior-dose', meta: { versionId: '1' },
          status: 'completed', request: { reference: 'MedicationRequest/mar-order' }, subject: { reference: 'Patient/failure-patient' } } });
        await assert.rejects(a.store.importPatient(p), /baseline reconciliation/);
        array(p.bundle.entry).pop();
      }
      await a.store.importPatient(p);
    }
    await t.test('JWT signature, issuer, audience, expiry, client, role and claim-derived identity', async () => {
      assert.equal(obj((await api(a.base, nurseA, '/me')).body.user).id, 'nurse-a');
      assert.equal(obj((await api(a.base, nurseA, '/me')).body.user).role, 'rn');
      for (const bad of [nurseA.token.slice(0, -12) + 'bad-signature',
        await new SignJWT({ typ: 'Bearer', azp: 'vgi-mar' }).setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).setSubject('nurse-a')
          .setIssuer(issuer).setAudience('wrong').setIssuedAt().setExpirationTime('5m').sign(privateKey),
        await new SignJWT({ typ: 'Bearer', azp: 'vgi-mar' }).setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).setSubject('nurse-a')
          .setIssuer(issuer).setAudience('vgi-commit').setIssuedAt().setExpirationTime(1).sign(privateKey),
        await token('nurse-a', ['rn'], { azp: 'other-client' }), await token('nurse-a', ['rn'], { typ: 'ID' })]) {
        assert.equal((await api(a.base, { ...nurseA, token: bad }, '/me')).status, 401);
      }
      const wrongIssuer = await new SignJWT({}).setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).setSubject('nurse-a')
        .setIssuer('http://foreign.invalid').setAudience('vgi-commit').setIssuedAt().setExpirationTime('5m').sign(privateKey);
      assert.equal((await api(a.base, { ...nurseA, token: wrongIssuer }, '/me')).status, 401);
      assert.equal((await api(a.base, await actor(0, []), '/me')).status, 403);
      assert.equal((await api(a.base, await actor(0, ['rn', 'physician']), '/me')).status, 403);
      assert.equal((await api(a.base, { ...nurseA, token: await token('unknown') }, '/me')).status, 403);
      assert.equal((await api(a.base, await actor(2, ['physician']), '/sessions', { patient: 'mar-patient', release: 'nurse', workflow: 'mar' })).status, 403);
      assert.equal((await api(a.base, nurseA, '/sessions', { patient: 'mar-patient', release: 'nurse', workflow: 'mar', user: { id: 'nurse-b', role: 'rn' } })).status, 400);
      assert.equal((await api(a.base, nurseA, '/sessions', { patient: 'held-patient', release: 'nurse', workflow: 'mar' })).status, 403);
    });
    await t.test('two replicas race the same scheduled occurrence; loser refreshes and receives current MedicationAdministration', async () => {
      const [s1, s2] = await Promise.all([ready(a.base, nurseA, 'mar-patient', 'nurse', 'mar', adminEvents(f, 'mar-patient')),
        ready(b.base, nurseB, 'mar-patient', 'nurse', 'mar', adminEvents(f, 'mar-patient'))]);
      const abort = new AbortController(); const timer = setTimeout(() => abort.abort(), 10_000);
      try {
        const subscription = await fetch(b.base + '/patients/mar-patient/events?after=1', { headers: { Authorization: `Bearer ${nurseB.token}` }, signal: abort.signal });
        assert.equal(subscription.status, 200);
        const results = await Promise.all([api(a.base, nurseA, '/commands', intent(s1, 'nurse-a-dose', administer)), api(b.base, nurseB, '/commands', intent(s2, 'nurse-b-dose', administer))]);
        assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
        assert.equal(required(results.find(r => r.status === 409)).body.reason, 'version_conflict');
        const reader = required(subscription.body).getReader(); let text = '';
        while (!text.includes('event: commit')) { const chunk = await reader.read(); assert.equal(chunk.done, false); text += new TextDecoder().decode(chunk.value); }
        assert.match(text, /id: 2/); await reader.cancel();
      } finally { clearTimeout(timer); abort.abort(); }
      const refreshed = await api(b.base, nurseB, '/patients/mar-patient');
      assert.equal(refreshed.body.version, 2);
      const administrations = objs(obj(obj(refreshed.body.snapshot).bundle).entry).filter((e: Obj) => obj(e.resource).resourceType === 'MedicationAdministration');
      assert.equal(administrations.length, 1); assert.equal(obj(administrations[0].resource).status, 'completed');
      const events = obj(array(refreshed.body.events)[1]).event;
      assert.equal(obj(obj(obj(obj(events).guard).input).user).id, obj(events).actor);
      assert.ok(['nurse-a', 'nurse-b'].includes(str(obj(events).actor)));
      assert.equal(obj(obj(obj(events).mar).accepted).readVersion, 1); assert.equal(obj(obj(obj(events).mar).accepted).version, 2);
      assert.equal(objs(obj(obj(obj(events).mar).accepted).events).filter((e: Obj) => e.barcodeScanned).length, 2);
      assert.equal(objs(obj(obj(obj(events).mar).accepted).events).filter((e: Obj) => e.administered).length, 1);
      assert.deepEqual(await a.lean.call('mar-commit', obj(obj(obj(events).mar).input)), obj(obj(events).mar).accepted);
      const fresh = await ready(a.base, nurseB, 'mar-patient', 'nurse', 'mar', adminEvents(f, 'mar-patient'));
      const consumed = await api(a.base, nurseB, '/commands', intent(fresh, 'consumed', administer));
      assert.equal(consumed.status, 409); assert.equal(consumed.body.reason, 'dose_already_administered');
      assert.equal((await api(a.base, nurseB, `/sessions/${s2.sessionId}/events`, { revision: s2.revision, event: f.adminEvents[0] })).status, 409);
    });
    await t.test('all nonadministration outcomes retain reason, consume nothing and permit one later administration', async () => {
      for (const kind of ['held', 'refused', 'not-given', 'delayed']) {
        const p = `${kind}-patient`;
        const events = adminEvents(f, p).map((e: Obj) => maybeObj(e.enter)?.comp === 'w4Admin.adminStatus' ? { enter: { ...obj(e.enter), value: { code: { c: kind } } } } : e);
        const s = await ready(a.base, nurseA, p, 'nurse', kind, events);
        assert.equal((await api(a.base, nurseA, '/commands', intent(s, `${kind}-dose`, administer))).status, 201);
        const read = (await api(a.base, nurseB, `/patients/${p}`)).body;
        assert.equal(objs(obj(obj(obj(read.snapshot).mar).shared).administrations).length, 0);
        const resource = required(objs(obj(obj(read.snapshot).bundle).entry).at(-1)).resource;
        assert.equal(obj(resource).status, kind === 'delayed' ? 'on-hold' : 'not-done');
        assert.equal(obj(resource).dosage, undefined);
        assert.equal(obj(array(obj(array(obj(resource).statusReason)[0]).coding)[0]).code, kind);
        const fresh = await ready(a.base, nurseA, p, 'nurse', kind, adminEvents(f, p));
        assert.equal((await api(a.base, nurseA, '/commands', { ...intent(fresh, `${kind}-stale`, administer), expectedVersion: 1 })).status, 409);
        assert.equal((await api(a.base, nurseA, '/commands', intent(fresh, `${kind}-then-given`, administer))).status, 201);
      }
    });
    await t.test('MAR reducer/SQL failure cannot partially publish resources, dose consumption or outcomes', async () => {
      const s = await ready(a.base, nurseA, 'failure-patient', 'nurse', 'failure', adminEvents(f, 'failure-patient'));
      const command = intent(s, 'mar-atomic-failure', administer);
      const original = a.lean.call.bind(a.lean);
      a.lean.call = async (op, input) => { if (op === 'mar-commit') throw new Error('injected native reducer failure'); return original(op, input); };
      try { assert.equal((await api(a.base, nurseA, '/commands', command)).status, 503); }
      finally { a.lean.call = original; }
      await a.db.query('INSERT INTO commit_events(tenant,stream,version,transaction_id,event) VALUES($1,$2,2,$3,$4)',
        [tenant, 'patient:failure-patient', randomUUID(), { kind: 'fault-injection' }]);
      assert.equal((await api(a.base, nurseA, '/commands', command)).status, 503);
      const read = (await api(b.base, nurseB, '/patients/failure-patient')).body;
      assert.equal(read.version, 1); assert.equal(obj(read.snapshot).mar, undefined);
      assert.equal(objs(obj(obj(read.snapshot).bundle).entry).filter((e: Obj) => obj(e.resource).resourceType === 'MedicationAdministration').length, 0);
      const shared = (await a.db.query('SELECT version,snapshot FROM commit_streams WHERE tenant=$1 AND key=$2', [tenant, 'dose:failure-patient:5:600'])).rows[0];
      assert.equal(shared.version, 0); assert.deepEqual(shared.snapshot.administrations, []);
      assert.equal((await api(a.base, nurseA, '/requests/mar-atomic-failure')).status, 404);
      await a.db.query('DELETE FROM commit_events WHERE tenant=$1 AND stream=$2 AND version=2', [tenant, 'patient:failure-patient']);
      assert.equal((await api(a.base, nurseA, '/commands', command)).status, 201);
    });
    await t.test('scheduled dose bindings cannot be reassigned after import', async () => {
      const w = config.releases.nurse.workflows.mar;
      const original = w.shared;
      w.shared = { kind: 'dose', order: 888, occurrence: 600 };
      try {
        const result = await api(a.base, nurseA, '/sessions', { patient: 'mar-patient', release: 'nurse', workflow: 'mar' });
        assert.equal(result.status, 409); assert.equal(result.body.error, 'scheduled_binding_changed');
      } finally { w.shared = original; }
      const aliased = structuredClone(config);
      aliased.releases.nurse.workflows.alias = { ...w, shared: { kind: 'dose', order: 999, occurrence: 600 } };
      assert.equal(configSchema.safeParse(aliased).success, false);
    });
    await t.test('high alert cosign requires independent OIDC consent at the exact patient version', async () => {
      const events = adminEvents(f, 'high-patient').map((e: Obj) => maybeObj(e.enter)?.comp === 'w4Admin.medScan' ? { enter: { ...obj(e.enter), value: { code: { c: 'insulin lispro' } } } } : e);
      events.push({ enter: { comp: 'w4Admin.highAlertCosign', value: { user: { u: 'nurse-b' } } } });
      let s = await ready(a.base, nurseA, 'high-patient', 'nurse', 'high', events);
      for (let i = 0; i < 4; i++) {
        const opened = await api(a.base, nurseA, `/sessions/${s.sessionId}/events`, { revision: s.revision, event: administer });
        if (opened.status === 422) break; // Ready: only /commands may add the commit.
        assert.equal(opened.status, 200);
        s = { ...s, ...opened.body };
        assert.ok(obj(s.state).popup, 'only an actual human-visible alert can be acknowledged');
        const ack = await api(a.base, nurseA, `/sessions/${s.sessionId}/events`, { revision: s.revision, event: { ack: { alert: array(obj(s.state).popup)[0] } } });
        assert.equal(ack.status, 200); s = { ...s, ...ack.body };
      }
      assert.equal((await api(a.base, nurseA, '/commands', intent(s, 'unconsented', administer))).status, 422);
      assert.equal((await api(b.base, nurseB, '/mar/cosigns', { patient: 'high-patient', release: 'nurse', workflow: 'high', expectedVersion: 0 })).status, 409);
      assert.equal((await api(b.base, nurseB, '/mar/cosigns', { patient: 'high-patient', release: 'nurse', workflow: 'high', expectedVersion: 1 })).status, 201);
      await a.db.query("UPDATE commit_mar_cosigns SET expires_at=now()-interval '1 minute' WHERE tenant=$1", [tenant]);
      assert.equal((await api(a.base, nurseA, '/commands', intent(s, 'expired-consent', administer))).status, 422);
      assert.equal((await api(b.base, nurseB, '/mar/cosigns', { patient: 'high-patient', release: 'nurse', workflow: 'high', expectedVersion: 1 })).status, 201);
      await a.db.query("UPDATE commit_mar_cosigns SET release_hash='changed' WHERE tenant=$1", [tenant]);
      assert.equal((await api(a.base, nurseA, '/commands', intent(s, 'old-release-consent', administer))).status, 422);
      assert.equal((await api(b.base, nurseB, '/mar/cosigns', { patient: 'high-patient', release: 'nurse', workflow: 'high', expectedVersion: 1 })).status, 201);
      const result = await api(a.base, nurseA, '/commands', intent(s, 'consented', administer));
      assert.equal(result.status, 201, JSON.stringify(result));
      assert.equal(objs(result.body.mar).filter((e: Obj) => e.doubleCheckCosign).length, 1);
    });
  } finally {
    for (const table of ['commit_mar_cosigns', 'commit_events', 'commit_requests', 'commit_sessions', 'commit_streams'])
      await a.db.query(`DELETE FROM ${table} WHERE tenant=$1`, [tenant]);
    await a.close(); await b.close();
    await new Promise<void>(resolve => issuerHost.close(() => resolve()));
  }
});
