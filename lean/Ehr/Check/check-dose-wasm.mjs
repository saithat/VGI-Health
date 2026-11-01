import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEhrInterp } from '../../../app/public/ehr/interp-loader.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const read = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const ehr = await loadEhrInterp();
const facts = { patientId: 'dose-test', identity: { initials: 'JD', sex: 'F', ageYears: 34 },
  allergyVersion: 1, allergyClasses: [], medsVersion: 1, currentMedClasses: [],
  weightToday: [700, 'kg'], careGaps: [], abnormalResult: false,
  encounterKind: 'clinic', now: 600, receipts: [], record: [] };
const display = { asOf: '', banner: { name: '', mrn: '', dob: '', ageYears: 0, sex: 'U',
  language: '', pcp: '', coverage: '', encounterClass: '', attending: '', location: '' },
  allergies: [], meds: [], vitals: [], labs: [], problems: [], immunizations: [],
  encounters: [], procedures: [], growth: [] };
function fields(value) {
  if (!value || typeof value !== 'object') return [];
  return [...(value.field ? [value.field] : []), ...Object.values(value).flatMap(fields)];
}
const results = [];
for (const release of ['v1', 'v2', 'v3']) {
  const input = { spec: read(`releases/${release}/spec.json`),
    program: read(`releases/${release}/personas/P1.json`), facts,
    user: { id: 'P1', role: 'physician' } };
  let state = JSON.parse(ehr.init(JSON.stringify(input)));
  function step(event) {
    const request = JSON.stringify({ ...input, state, event });
    const wasm = JSON.parse(ehr.step(request));
    const native = JSON.parse(execFileSync(resolve(root, 'lean/.lake/build/bin/ehr'), ['step'],
      { input: request, maxBuffer: 16 * 1024 * 1024 }));
    assert.deepEqual(wasm, native);
    state = wasm.state;
    return wasm.result;
  }
  const enter = (comp, value) => step({ enter: { comp: `w1Orders.${comp}`, value } });
  const ui = () => fields(JSON.parse(ehr.call('ehr_render_ui', JSON.stringify({ ...input, state, display }))));
  for (const comp of ['home.work.w1Rooming', 'w1Rooming.nav.w1Orders'])
    assert.equal(step({ click: { comp } }), 'ok');
  assert.equal(enter('drug', { code: { c: 'heparin' } }), 'ok');
  assert.equal(ui().find(f => f.comp === 'w1Orders.dose').unit, 'units');
  assert.deepEqual(enter('dose', { qty: { tenths: 50000, unit: 'mg' } }),
    { blocked: { reason: 'dose unit must match the selected formulary drug' } });
  assert.equal(enter('dose', { qty: { tenths: 50000, unit: 'units' } }), 'ok');
  assert.equal(enter('doseUnit', { code: { c: 'units' } }), 'ok');
  assert.equal(enter('drug', { code: { c: 'albuterol' } }), 'ok');
  assert.equal(enter('doseUnit', { code: { c: 'mcg' } }), 'ok');
  const changed = ui().find(f => f.comp === 'w1Orders.dose');
  assert.equal(changed.unit, 'mcg');
  assert.equal(changed.value, null); // changed units demand explicit re-entry
  assert.ok(!changed.label.includes('(mg)'));
  assert.equal(enter('dose', { qty: { tenths: 1800, unit: 'mcg' } }), 'ok');
  assert.equal(ui().find(f => f.comp === 'w1Orders.dose').value, '180.0');
  assert.ok(state.captured.some(c => c.element === 'dose' && c.value.qty?.tenths === 1800 && c.value.qty.unit === 'mcg'));
  results.push({ release, nativeMatchesWasm: true, wrongUnitRefused: true,
    heparinUnit: 'units', albuterolUnit: 'mcg', albuterolTenths: 1800,
    changedUnitRequiresReentry: true });
}
writeFileSync(resolve(root, 'lean/Ehr/Check/dose-wasm-report.json'), JSON.stringify({ results }, null, 2) + '\n');
console.log(`Native/WASM dimensional guard and drug-specific composer: ${results.length}/3 releases passed`);
