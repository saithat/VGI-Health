// Native/packaged-WASM boundary checks for temporal records and reconciliation.
// Set COMMIT_FIXTURE to services/commit/test/Fixture.lean's JSON export.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadEhrInterp } from '../../app/public/ehr/interp-loader.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const binary = process.env.EHR_BIN ?? `${root}lean/.lake/build/bin/ehr`;
const wasm = await loadEhrInterp({ wasmBinary: readFileSync(new URL('../../app/public/ehr/ehr-interp.wasm', import.meta.url)) });
let comparisons = 0;
function agree(op, input) {
  const wire = JSON.stringify(input);
  const native = spawnSync(binary, [op], { input: wire, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  assert.equal(native.status, 0, native.stderr);
  const actual = op === 'render-ui' ? wasm.call('ehr_render_ui', wire) : wasm[op](wire);
  assert.equal(actual, native.stdout.trimEnd(), `${op}: canonical bytes differ`);
  comparisons++;
  return JSON.parse(actual);
}
const patient = { resourceType: 'Patient', id: 'temporal-patient', meta: { versionId: '1' } };
const encounter = { resourceType: 'Encounter', id: 'temporal-encounter', meta: { versionId: '2' },
  subject: { reference: 'Patient/temporal-patient' }, class: { code: 'IMP' }, status: 'finished',
  period: { start: '2026-10-01T10:00:00Z', end: '2026-10-02T10:00:00Z' } };
const completion = { resourceType: 'Composition', id: 'completion', meta: { versionId: '3' }, status: 'final',
  subject: { reference: 'Patient/temporal-patient' }, encounter: { reference: 'Encounter/temporal-encounter' },
  type: { coding: [{ system: 'urn:vgi:document-type', code: 'medical-record-completion' }] },
  attester: [{ mode: ['legal'], time: '2026-10-03T10:00:00Z', party: { reference: 'Practitioner/doctor' } }] };
function project(documents) {
  return agree('facts', { context: { today: '2026-11-03', now: 600, receipts: [], record: [], encounterId: encounter.id },
    bundle: { resourceType: 'Bundle', entry: [patient, encounter, ...documents].map(resource => ({ resource })) } }).facts;
}
assert.ok(project([]).eventEvidence.some(e => e.event === 'discharge'));
assert.equal(project([]).eventEvidence.some(e => e.event === 'record.completed'), false);
assert.ok(project([completion]).eventEvidence.some(e => e.event === 'record.completed'));
for (const docs of [[{ ...completion, status: 'preliminary' }], [completion, completion],
  [{ ...completion, encounter: { reference: 'Encounter/other' } }]]) {
  assert.equal(project(docs).eventEvidence.some(e => e.event === 'record.completed'), false);
}

const fixture = JSON.parse(readFileSync(process.env.COMMIT_FIXTURE, 'utf8')).tiny;
const projected = agree('facts', { bundle: fixture.currentBundle, context: fixture.context });
const facts = { ...projected.facts, epochMinute: 1000 };
const source = facts.sourcePatientId;
assert.ok(source);
facts.patientDirectory = { patients: [{ id: source, name: 'Test patient', mrn: 'test' }], activities: [] };
const tagged = fixture.state.captured.map(c => ({ ...c, enteredAt: 900,
  ...(['drug', 'dose'].includes(c.element) ? { provenance: 'needsReconciliation' } : {}) }));
const context = { spec: fixture.spec, program: fixture.program, user: fixture.user, facts };
const decision = { enter: { comp: 'reconcile.line|0', value: { code: { c: 'keep' } } } };
const pending = { ...fixture.state, captured: tagged, commits: [] };
for (const [threshold, late] of [[2, true], [100, false], [99, true], [1440, false]]) {
  const screen = agree('render-ui', { ...context,
    spec: { ...context.spec, design: { ...context.spec.design, lateEntryMinutes: threshold, unsignedDraftMinutes: 17 } },
    state: pending, display: projected.display });
  assert.equal(JSON.stringify(screen).includes('Late entry'), late, `wire late-entry policy ${threshold}`);
}
const kept = agree('step', { ...context, state: pending, event: decision });
assert.equal(kept.result, 'ok');
assert.ok(kept.state.captured.every(c => c.enteredAt === 900));
assert.ok(kept.state.captured.filter(c => ['drug', 'dose'].includes(c.element)).every(c => c.provenance === 'reconciled:keep'));
const edited = agree('step', { ...context, state: { ...pending, screen: 'order' },
  event: { enter: { comp: 'doseField', value: { qty: { tenths: 2500, unit: 'mg' } } } } });
const dose = edited.state.captured.find(c => c.element === 'dose');
assert.equal(dose.enteredAt, 1000);
assert.equal(dose.provenance, 'needsReconciliation');
const loading = agree('step', { ...context, program: { ...context.program, patientSelection: true },
  state: { ...pending, captured: [], patientContext: { patient: source, target: context.program.start, activity: "", query: "" },
    patientDrafts: [{ patient: source, captured: tagged, acked: [] }] }, event: decision });
assert.deepEqual(loading.result, { blocked: { reason: 'Chart is loading' } });
assert.ok(loading.state.captured.some(c => c.provenance === 'needsReconciliation'));
console.log(`${comparisons} native/packaged-WASM canonical-byte comparisons passed`);
