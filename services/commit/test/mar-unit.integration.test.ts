import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { configSchema } from '../src/types.ts';
import { migrate } from '../src/store.ts';
import { fixture, host, patient, adminEvents } from './helpers.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL required: unit-gated MAR uses real Postgres/native Lean');

test('4 West unit gate applies to directory, session, cosign and already-open command; unassigned nurses fail closed', { timeout: 60_000 }, async () => {
  const f = await fixture();
  const scheduledTime = '2026-11-02T10:00:00Z';
  const config = configSchema.parse({ tenant: `mar-unit-${randomUUID()}`, oidc: { issuer: 'http://localhost:18180/realms/vgi', audience: 'vgi-commit', clientId: 'vgi-mar' },
    units: { '4-west': { name: '4 West', marOnService: true } },
    actors: [{ subject: 'unit-rn', user: { id: 'unit-rn', role: 'rn' }, modelId: 1, patients: ['unit-patient'], units: ['4-west'] }],
    releases: { nurse: { spec: f.hospitalSpec, program: f.nurseProgram, workflows: { dose: { commit: 'administerMed', shared: { kind: 'dose', order: 9, occurrence: 600 },
      mar: { patient: 'unit-patient', unit: '4-west', medicationRequest: 'mar-order', encounter: 'enc-1', scheduledTime } } } } } });
  const a = await host(url, config); const rn = config.actors[0];
  const open = { patient: 'unit-patient', release: 'nurse', workflow: 'dose' };
  try {
    await migrate(a.db);
    const p = patient(f, 'unit-patient', 1, true);
    p.bundle.entry[1].resource.class = { code: 'IMP' };
    p.bundle.entry.push({ resource: { resourceType: 'MedicationRequest', id: 'mar-order', meta: { versionId: '1' }, status: 'active', intent: 'order', subject: { reference: 'Patient/unit-patient' },
      encounter: { reference: 'Encounter/enc-1' }, medicationCodeableConcept: { text: 'amoxicillin' }, dosageInstruction: [{ timing: { event: [scheduledTime] } }] } });
    await a.store.importPatient(p);
    assert.equal((await a.store.marDirectory(rn)).items.length, 1);
    const outside = { ...rn, units: [] };
    assert.equal((await a.store.marDirectory(outside)).items.length, 0);
    await assert.rejects(a.store.openSession(outside, open), /mar_unit_disabled_or_forbidden/);
    await assert.rejects(a.store.cosign(outside, { ...open, expectedVersion: 1 }), /mar_unit_disabled_or_forbidden/);
    const s = await a.store.openSession(rn, open); let revision = s.revision;
    const frames: { step: number; phase: 'ready'; hash: string }[] = [];
    let snapshot = { state: s.state, projection: s.projection };
    const paint = async () => {
      const rendered = await a.lean.call('render-screen', { spec: s.spec, program: s.program, user: s.user, ...snapshot.projection, state: snapshot.state });
      frames.push({ step: revision, phase: 'ready', hash: createHash('sha256').update(rendered.canonical).digest('hex') });
    };
    await paint();
    for (const event of adminEvents(f, 'unit-patient')) {
      const next = await a.store.event(rn, s.sessionId, { revision, event });
      revision = next.revision; snapshot = next; await paint();
    }
    const command = { requestId: 'unit-off', screens: { requestId: 'unit-off', frames }, sessionId: s.sessionId, revision, expectedVersion: 1, expectedSharedVersion: 0,
      event: { click: { comp: 'w4Admin.commit.administerMed' } } };
    config.units!['4-west'].marOnService = false;
    assert.equal((await a.store.marDirectory(rn)).items.length, 0);
    await assert.rejects(a.store.openSession(rn, open), /mar_unit_disabled_or_forbidden/);
    await assert.rejects(a.store.cosign(rn, { ...open, expectedVersion: 1 }), /mar_unit_disabled_or_forbidden/);
    await assert.rejects(a.store.submit(rn, command), /mar_unit_disabled_or_forbidden/);
    assert.equal((await a.store.read(rn, 'unit-patient')).version, 1);
    await assert.rejects(a.store.outcome(rn, command.requestId), /request_not_found/);
    config.units!['4-west'].marOnService = true;
    assert.equal((await a.store.submit(rn, command)).status, 201);
  } finally {
    for (const table of ['commit_mar_cosigns', 'commit_events', 'commit_requests', 'commit_sessions', 'commit_streams']) await a.db.query(`DELETE FROM ${table} WHERE tenant=$1`, [config.tenant]);
    await a.close();
  }
});
