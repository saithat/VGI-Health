import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadEhrInterp } from '../../app/public/ehr/interp-loader.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const json = (path) => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'));
const wasm = await loadEhrInterp({ wasmBinary: readFileSync(new URL('../../app/public/ehr/ehr-interp.wasm', import.meta.url)) });
const spec = json('releases/v3/spec.json');
// Direct bound-episode harness; deployment baselines retain patient selection.
const program = { ...json('releases/v3/personas/P1.json'), patientSelection: false };
const ticket = {
  result: { id: 'panic-1', patient: 'urgency-pt', label: 'Critical potassium 6.8 mmol/L', responsible: 'P1', covering: 'P2', availableAt: 0, limit: 30 },
  deliveredAt: null, receivedBy: [], acknowledgedBy: [], escalatedAt: null, resolution: null,
};
const facts = {
  patientId: 'urgency-pt', identity: { initials: 'QA', sex: 'F', ageYears: 34 },
  allergyVersion: 1, allergyClasses: [], medsVersion: 1, notesVersion: 0, historyVersion: 0,
  currentMedClasses: [], careGaps: [], abnormalResult: true, now: 0, receipts: [], record: [], criticalResults: [ticket],
};
const user = { id: 'P1', role: 'physician' };
const context = { spec, program, facts, user };
let comparisons = 0;
function agree(op, input) {
  const native = spawnSync(`${root}/lean/.lake/build/bin/ehr`, [op], { input: JSON.stringify(input), encoding: 'utf8' });
  assert.equal(native.status, 0, native.stderr);
  const actual = JSON.parse(wasm[op](JSON.stringify(input)));
  assert.deepEqual(actual, JSON.parse(native.stdout));
  comparisons++;
  return actual;
}
const initial = agree('init', context);
const next = (state, event, actor = user) => agree('step', { ...context, user: actor, state, event });
const ack = next(initial, { ack: { alert: 'criticalResult' } });
assert.equal(ack.state.criticalResults?.[0]?.resolution ?? null, null);
assert.equal(next(initial, { click: { comp: 'critical.resolve:panic-1' } }).state.criticalResults[0].resolution, null);
const wrong = next(initial, { click: { comp: 'critical.receive:panic-1' } }, { id: 'P2', role: 'physician' });
assert.deepEqual(wrong.state.criticalResults[0].receivedBy, []);
const received = next(initial, { click: { comp: 'critical.receive:panic-1' } }).state;
const documented = next(received, { enter: { comp: 'critical.action:panic-1', value: { text: { s: 'Called patient; arranged emergency evaluation' } } } }).state;
const resolved = next(documented, { click: { comp: 'critical.resolve:panic-1' } }).state;
assert.equal(resolved.criticalResults[0].resolution.actor, 'P1');
const covering = next({ ...initial, clock: 30 * 600 }, { click: { comp: 'critical.receive:panic-1' } }, { id: 'P2', role: 'physician' }).state;
assert.equal(covering.criticalResults[0].escalatedAt, 30);
assert.deepEqual(covering.criticalResults[0].receivedBy, ['P2']);
const corrected = agree('step', { ...context,
  facts: { ...facts, criticalResults: [{ ...ticket, result: { ...ticket.result, source: 'corrected source observation' } }] },
  state: resolved, event: { click: { comp: 'critical.receive:panic-1' } },
});
assert.equal(corrected.state.criticalResults[0].resolution, null);
const projection = agree('facts', {
  context: { today: '2026-11-02', now: 0, receipts: [], record: [] },
  bundle: { resourceType: 'Bundle', entry: [
    { resource: { resourceType: 'Patient', id: 'urgency-pt', gender: 'female', birthDate: '1992-01-01', name: [{ family: 'QA', given: ['Urgency'] }] } },
    { resource: { resourceType: 'Observation', id: 'panic-1', status: 'final', subject: { reference: 'Patient/urgency-pt' },
      category: [{ coding: [{ code: 'laboratory' }] }], code: { text: 'Potassium' },
      interpretation: [{ coding: [{ code: 'HH' }] }], valueQuantity: { value: 6.8, unit: 'mmol/L' },
      extension: [{ url: 'https://vgi.health/fhir/StructureDefinition/critical-result-route', extension: [
        { url: 'responsible', valueString: 'P1' }, { url: 'covering', valueString: 'P2' },
        { url: 'availableAt', valueInteger: 0 }, { url: 'limit', valueInteger: 30 },
      ] }],
    } },
  ] },
});
assert.equal(projection.facts.criticalResults[0].result.responsible, 'P1');
const ui = (state) => JSON.parse(wasm.call('ehr_render_ui', JSON.stringify({ ...context, state, display: projection.display })));
const hasCritical = (screen) => screen.urgent?.some((node) => node.alert?.alertId === 'criticalResult') ?? false;
assert.equal(hasCritical(ui(initial)), true);
assert.equal(hasCritical(ui(ack.state)), true);
assert.equal(hasCritical(ui(resolved)), false);
console.log(JSON.stringify({ nativeWasmComparisons: comparisons, acknowledgmentResolves: false, coveringEscalationMinute: 30, responsibleActionRecorded: true, correctedSourceReopens: true }));
