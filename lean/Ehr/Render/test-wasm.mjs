// Run after ExportTests.lean, wasm/build-ehr.sh and wasm/install-into-app.sh.
// Compares the real native/WASM APIs; no duplicate clinical logic.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadEhrInterp } from '../../../app/public/ehr/interp-loader.mjs';
const directory = resolve(process.argv[2] ?? '/tmp/vgi-render-api');
const fixture = process.argv[3] ?? 'fixtures/synthea/Aaron_Ankunding_4966bd28.json';
const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
const data = (name) => read(resolve(directory, `${name}.json`));
const ehr = await loadEhrInterp();
assert.ok(ehr.exports.includes('ehr_facts'));
assert.ok(ehr.exports.includes('ehr_render'));
const native = (command, input) => JSON.parse(execFileSync('lean/.lake/build/bin/ehr', [command], {
  input: JSON.stringify(input), maxBuffer: 32 * 1024 * 1024,
}));
const context = data('context');
let bundleCount = 0;
for (const file of readdirSync('fixtures/synthea').filter((f) => f.endsWith('.json') && f !== 'index.json')) {
  const bundle = read(resolve('fixtures/synthea', file));
  const input = { bundle, context };
  const actual = JSON.parse(ehr.facts(JSON.stringify(input)));
  assert.deepEqual(actual, native('facts', input), file);
  const patient = bundle.entry.find((entry) => entry.resource.resourceType === 'Patient');
  const identifier = patient.resource.identifier?.find((id) => id.system === 'https://github.com/synthetichealth/synthea');
  assert.equal(actual.facts.patientId, identifier ? `${identifier.system}|${identifier.value}` : patient.resource.id ?? patient.fullUrl);
  assert.ok(actual.display.allergies.every((r) => r.id.length));
  assert.ok(actual.display.meds.every((r) => r.id.length));
  bundleCount++;
}
const { facts, display } = native('facts', { bundle: read(fixture), context });
const common = { spec: data('spec'), program: data('program'), user: data('user'), facts };
assert.deepEqual(JSON.parse(ehr.init(JSON.stringify(common))), native('init', common));
const states = data('states');
for (const [name, state] of states) {
  const input = { ...common, display, state };
  assert.deepEqual(JSON.parse(ehr.render(JSON.stringify(input))), native('render', input), name);
}
// A real canonical RN scan must accept the interpreter's identity and reject
// an unrelated Medplum resource address. The painter emits the same Value.code.
const scanElement = common.spec.elements.find((e) => e.kind?.scan?.target === 'wristband');
assert.ok(scanElement);
let scanChecked = false;
for (const [name, state] of states.filter(([name]) => name.endsWith('-expanded'))) {
  const screen = common.program.screens.find((s) => s.id === state.screen);
  const component = screen.components.find((c) => c.kind?.field?.element === scanElement.id);
  if (!component) continue;
  const episode = { ...common, user: { ...common.user, role: 'rn' }, state };
  const view = JSON.parse(ehr.view(JSON.stringify(episode)));
  if (!view.enabled.includes(component.id)) continue;
  const input = { ...episode, event: { enter: { comp: component.id, value: { code: { c: facts.patientId } } } } };
  const good = JSON.parse(ehr.step(JSON.stringify(input)));
  assert.deepEqual(good, native('step', input), `${name} wristband`);
  assert.equal(good.result, 'ok');
  assert.ok(good.state.captured.some((c) => c.element === scanElement.id && c.value?.code?.c === facts.patientId));
  input.event.enter.value.code.c = 'unrelated-medplum-server-id';
  const bad = JSON.parse(ehr.step(JSON.stringify(input)));
  assert.deepEqual(bad, native('step', input));
  assert.notEqual(bad.result, 'ok');
  scanChecked = true;
  break;
}
assert.ok(scanChecked, 'a shown canonical RN wristband field was exercised');
for (const method of ['facts', 'render']) assert.ok(JSON.parse(ehr[method]('{}')).error);
console.log(`Native/WASM equivalence: ${bundleCount} Synthea bundles, ${states.length} canonical page variants; stable patient/row ids, actual RN wristband acceptance/rejection and error envelopes passed.`);
