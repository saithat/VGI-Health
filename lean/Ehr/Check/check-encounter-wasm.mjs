import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEhrInterp } from '../../../app/public/ehr/interp-loader.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const read = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const ehr = await loadEhrInterp();
const reason = 'Pre-op orders are signed by a physician or surgeon';
const facts = {
  patientId: 'policy-test', identity: { initials: 'AL', sex: 'F', ageYears: 6 },
  allergyVersion: 1, allergyClasses: [], medsVersion: 1, currentMedClasses: [],
  weightToday: [200, 'kg'], careGaps: [], abnormalResult: false,
  encounterKind: 'preop', now: 600, receipts: [], record: [],
};
const display = {
  asOf: '', banner: { name: '', mrn: '', dob: '', ageYears: 0, sex: 'U',
    language: '', pcp: '', coverage: '', encounterClass: '', attending: '', location: '' },
  allergies: [], meds: [], vitals: [], labs: [], problems: [], immunizations: [],
  encounters: [], procedures: [], growth: [],
};
function buttons(value) {
  if (!value || typeof value !== 'object') return [];
  return [...(value.button ? [value.button] : []), ...Object.values(value).flatMap(buttons)];
}
const results = [];
for (const release of ['v1', 'v2', 'v3']) {
  const input = { spec: read(`releases/${release}/spec.json`),
    program: read(`releases/${release}/personas/P4.json`), facts,
    user: { id: 'P4', role: 'np' } };
  let state = JSON.parse(ehr.init(JSON.stringify(input)));
  assert.equal(state.error, undefined);
  for (const comp of ['home.work.w5Rooming', 'w5Rooming.nav.w5Orders', 'w5Orders.toSign']) {
    const next = JSON.parse(ehr.step(JSON.stringify({ ...input, state, event: { click: { comp } } })));
    assert.equal(next.result, 'ok');
    state = next.state;
  }
  const request = { ...input, state, event: { click: { comp: 'w5Sign.commit.signOrders' } } };
  const wasm = JSON.parse(ehr.step(JSON.stringify(request)));
  const native = JSON.parse(execFileSync(resolve(root, 'lean/.lake/build/bin/ehr'), ['step'],
    { input: JSON.stringify(request), maxBuffer: 16 * 1024 * 1024 }));
  assert.deepEqual(wasm, native);
  assert.deepEqual(wasm.result, { blocked: { reason } });
  assert.ok(!wasm.state.commits.includes('signOrders'));
  const ui = JSON.parse(ehr.call('ehr_render_ui', JSON.stringify({ ...input, state, display })));
  const sign = buttons(ui).find((button) => button.comp === 'w5Sign.commit.signOrders');
  assert.ok(sign);
  assert.equal(sign.enabled, false);
  assert.equal(sign.blockedReason, reason);
  results.push({ release, persona: 'P4', nativeMatchesWasm: true,
    preopCommitRefused: true, painterReason: sign.blockedReason });
}
const report = { results };
writeFileSync(resolve(root, 'lean/Ehr/Check/encounter-wasm-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Native/WASM pre-op refusal and rendered reason: ${results.length}/3 releases passed`);
