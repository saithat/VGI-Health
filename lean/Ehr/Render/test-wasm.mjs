// Run after ExportTests.lean, wasm/build-ehr.sh and wasm/install-into-app.sh.
// Compares the real native/WASM APIs; no duplicate clinical logic.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
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
assert.ok(ehr.exports.includes('ehr_render_ui'));
// A runtime-only driver may call these exact exported API functions when the
// aggregate CLI build is blocked by an unrelated test-module dependency.
const nativeExecutable = process.env.EHR_RENDER_NATIVE ?? 'lean/.lake/build/bin/ehr';
const native = (command, input) => JSON.parse(execFileSync(nativeExecutable, [command], {
  input: JSON.stringify(input), maxBuffer: 32 * 1024 * 1024,
}));
const context = data('context');
let bundleCount = 0;
for (const file of ['fixtures/synthea', 'fixtures/synthetic-hospital'].flatMap((dir) =>
  readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'index.json').map((file) => resolve(dir, file)))) {
  const bundle = read(file);
  const input = { bundle, context };
  const actual = JSON.parse(ehr.facts(JSON.stringify(input)));
  assert.deepEqual(actual, native('facts', input), file);
  const patient = bundle.entry.find((entry) => entry.resource.resourceType === 'Patient');
  const identifier = patient.resource.identifier?.find((id) => id.system === 'https://github.com/synthetichealth/synthea');
  assert.equal(actual.facts.patientId, identifier ? `${identifier.system}|${identifier.value}` : patient.resource.id ?? patient.fullUrl);
  assert.ok(actual.display.allergies.every((r) => r.id.length));
  assert.ok(actual.display.meds.every((r) => r.id.length));
  const resources = bundle.entry.map((e) => e.resource);
  assert.equal(actual.display.notes.length, resources.filter((r) => r.resourceType === 'DocumentReference' && r.status !== 'entered-in-error' && r.docStatus !== 'entered-in-error').length);
  assert.equal(actual.display.history.filter((r) => r.kind === 'Home medications (reported)').length, resources.filter((r) => r.resourceType === 'MedicationStatement' && r.status !== 'entered-in-error').length);
  bundleCount++;
}
const { facts, display } = native('facts', { bundle: read(fixture), context });
const common = { spec: data('spec'), program: data('program'), user: data('user'), facts };
assert.deepEqual(JSON.parse(ehr.init(JSON.stringify(common))), native('init', common));
function walk(nodes) {
  return nodes.flatMap((node) => {
    if (node.section) return [node, ...walk(node.section.children)];
    if (node.presentation) return [node, ...walk(node.presentation.children)];
    if (node.columns) return [node, ...walk(node.columns.children)];
    if (node.tabs) return [node, ...walk(node.tabs.body)];
    return [node];
  });
}
function checkUi(ui, view, program, display, name) {
  assert.deepEqual(ui.banner.slice(0, 3), [['Patient', display.banner.name], ['DOB', display.banner.dob ? new Date(display.banner.dob + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }) : ''], ['MRN', display.banner.mrn]], name);
  assert.equal(ui.title, view.title);
  for (const [group, entries] of ui.nav) {
    assert.ok(group.length);
    for (const [id, label] of entries) {
      assert.ok(view.items.some((it) => it.shown && it.comp.id === id && it.comp.kind?.button?.action?.goto), `${name}: nav must target a shown goto component`);
      assert.ok(view.enabled.includes(id));
      assert.ok(label.length);
    }
  }
  const screen = program.screens.find((sc) => sc.id === view.screen);
  // navigatorNames supplies clinical labels; screen IDs and order remain authoritative.
  assert.deepEqual(ui.workspace[0].stepper.steps.map(([id]) => id), program.screens.filter((sc) => sc.workflow === screen.workflow).map((sc) => sc.id));
  assert.ok(ui.workspace[0].stepper.steps.every(([, label]) => label.length > 0));
  const nodes = walk([...ui.workspace, ...ui.side]);
  const sourceKind = (kind) => {
    if (kind === 'banner') return 'info';
    if (kind === 'tabs') return 'tabs';
    const tag = Object.keys(kind)[0];
    return ({ panel: 'info', table: 'info', trend: 'info', priorAuth: 'info', group: 'section', macro: 'button', search: 'field' })[tag] ?? tag;
  };
  const sourceKeys = nodes.flatMap((node) => {
    const tag = Object.keys(node)[0];
    const props = node[tag];
    const id = props.comp ?? props.id;
    if (!id || (tag === 'button' && ['toggle', 'confirm'].includes(props.role))) return [];
    return [`${id}:${tag}`];
  });
  sourceKeys.push(...ui.nav.flatMap(([, entries]) => entries.map(([id]) => `${id}:button`)));
  const shellGroup = (it) => it.comp.kind?.group?.collapsible === false && /(^|\.)(nav|navigator)$/.test(it.comp.tag);
  for (const item of view.items.filter((it) => it.shown && shellGroup(it))) {
    assert.ok(ui.nav.some(([title]) => title === (item.comp.label || 'Navigator')), `${name}: navigator group heading retained`);
  }
  assert.deepEqual(sourceKeys.sort(), view.items.filter((it) => it.shown && it.comp.kind !== 'banner' && !shellGroup(it)).map((it) => `${it.comp.id}:${sourceKind(it.comp.kind)}`).sort(), `${name}: every shown component exactly once`);
  for (const node of nodes) {
    if (node.button) {
      assert.ok(node.button.label.length, name);
      assert.equal(node.button.enabled, view.enabled.includes(node.button.comp), name);
      if (!node.button.enabled) assert.ok(node.button.blockedReason?.length, name);
      if (node.button.role === 'primary') assert.ok(view.items.some((it) => it.shown && it.comp.id === node.button.comp && it.comp.kind?.button?.action?.commit), name);
    }
    if (node.field) {
      assert.ok(node.field.label.length, name);
      const item = view.items.find((it) => it.comp.id === node.field.comp);
      assert.equal(node.field.humanOnly, item.humanOnly);
      assert.equal(node.field.pendingConfirm, item.pendingConfirm);
      assert.equal(node.field.provenance, item.provenance ?? null);
      if (item.pendingConfirm) assert.ok(nodes.some((n) => n.button?.role === 'confirm' && n.button.comp === item.comp.id));
    }
  }
  const side = walk(ui.side).flatMap((n) => n.info ? [n.info] : []);
  assert.equal(side.find((n) => n.infoId === 'allergyList')?.rows.length, display.allergies.length);
  assert.equal(side.find((n) => n.infoId === 'currentMeds')?.rows.length, display.meds.length);
  assert.equal(side.find((n) => n.infoId === 'problemList')?.rows.length, display.problems.filter((r) => r.status !== 'resolved' && r.status !== 'inactive' && !r.abatement).length);
  assert.equal(side.find((n) => n.infoId === 'vitals')?.rows.length, new Set(display.vitals.map((r) => r.code)).size);
  for (const info of side.filter((n) => ['allergyList', 'currentMeds', 'problemList', 'vitals'].includes(n.infoId))) assert.equal(info.display, 'list');
  for (const info of side.filter((n) => ['allergyList', 'currentMeds', 'problemList', 'vitals'].includes(n.infoId))) {
    assert.ok(info.rows.every((row) => row.length <= 2 && row[0]?.[0] === 'Record'));
  }
  assert.ok(!walk(ui.workspace).some((n) => n.info?.infoId === 'patientBanner'), `${name}: one shell banner`);
  if (ui.modal) assert.ok(walk([ui.modal]).some((n) => n.button?.role === 'ack' && n.button.enabled));
}
console.log(`Native/WASM facts match for all ${bundleCount} Synthea + Synthetic Hospital bundles.`);
const shardCount = Number(process.env.EHR_RENDER_SHARD_COUNT ?? 1);
const shardIndex = Number(process.env.EHR_RENDER_SHARD_INDEX ?? 0);
assert.ok(Number.isInteger(shardCount) && shardCount >= 1 && shardCount <= 8);
assert.ok(Number.isInteger(shardIndex) && shardIndex >= 0 && shardIndex < shardCount);
// Optional pre-split inputs keep four workers from each retaining the entire
// large state corpus. Original indexes and every expanded scan probe survive.
const shardInput = process.env.EHR_RENDER_SHARD_INPUT ? read(process.env.EHR_RENDER_SHARD_INPUT) : null;
const allStates = shardInput ? null : data('states');
const total = shardInput?.total ?? allStates.length;
const stateIndices = Array.from({length: total}, (_, i) => i).filter((i) => i % shardCount === shardIndex);
if (shardInput) {
  assert.equal(shardInput.shardIndex, shardIndex);
  assert.equal(shardInput.shardCount, shardCount);
  assert.deepEqual(shardInput.stateIndices, stateIndices);
}
const states = shardInput?.states ?? stateIndices.map((i) => allStates[i]);
assert.equal(states.length, stateIndices.length);
const scanStates = shardInput?.scanStates ?? allStates.filter(([name]) => name.endsWith('-expanded'));
let checkedStates = 0;
for (const [name, state] of states) {
  const input = { ...common, display, state };
  assert.deepEqual(JSON.parse(ehr.render(JSON.stringify(input))), native('render', input), name);
  const ui = JSON.parse(ehr.call('ehr_render_ui', JSON.stringify(input)));
  assert.deepEqual(ui, native('render-ui', input), `${name} semantic UI`);
  checkUi(ui, JSON.parse(ehr.view(JSON.stringify(input))), common.program, display, name);
  checkedStates++;
  if (checkedStates % 250 === 0) console.log(`Matched ${checkedStates}/${states.length} HTML + semantic UI variants.`);
}
// These inputs are exported by Lean's actual interpreter regression fixtures.
for (const [name, input] of data('clinical-ui-cases')) {
  const ui = JSON.parse(ehr.call('ehr_render_ui', JSON.stringify(input)));
  assert.deepEqual(ui, native('render-ui', input), name);
  checkUi(ui, JSON.parse(ehr.view(JSON.stringify(input))), input.program, input.display, name);
  const orders = walk(ui.workspace).find((n) => n.info?.infoId === 'orderSummary').info;
  assert.equal(orders.display, 'table');
  assert.equal(orders.rows.length, name === 'captured-orders' ? 2 : 0);
  if (name === 'captured-orders') {
    assert.deepEqual(ui.nav, [['Visit', [['shell.nav.next', 'Next screen']]]]);
    assert.ok(orders.rows[0].some(([key, value]) => key === 'Dose' && value === '500.0 mg'));
    assert.ok(orders.rows[1].some(([key, value]) => key === 'Registration' && value === 'AB1234567'));
    const eventInput = { ...input, event: { click: { comp: ui.nav[0][1][0][0] } } };
    const stepped = JSON.parse(ehr.step(JSON.stringify(eventInput)));
    assert.deepEqual(stepped, native('step', eventInput));
    assert.equal(stepped.state.screen, 'next');
  }
}
// App samples carry the full P1 program and actual human-entered order values.
for (const id of ['w1Rooming', 'w1Orders', 'w1Sign']) {
  const input = data(`p1-input-${id}`);
  const ui = JSON.parse(ehr.call('ehr_render_ui', JSON.stringify(input)));
  assert.deepEqual(ui, native('render-ui', input), `${id}: P1 sample native/WASM`);
  assert.deepEqual(ui, data(id));
  assert.deepEqual(ui, read(`app/src/fixtures/ui/${id}.json`));
  if (id === 'w1Sign') {
    const summary = walk(ui.workspace).find((node) => node.info?.infoId === 'orderSummary').info;
    assert.equal(summary.display, 'table');
    assert.equal(summary.rows.length, 1);
    assert.ok(summary.rows[0].some(([key, value]) => key === 'Drug' && value === 'amoxicillin'));
  }
}
// A real canonical RN scan must accept the interpreter's identity and reject
// an unrelated Medplum resource address. The painter emits the same Value.code.
const scanElement = common.spec.elements.find((e) => e.kind?.scan?.target === 'wristband');
assert.ok(scanElement);
let scanChecked = false;
for (const [name, state] of scanStates) {
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
assert.ok(JSON.parse(ehr.call('ehr_render_ui', '{}')).error);
for (const method of ['facts', 'render']) assert.ok(JSON.parse(ehr[method]('{}')).error);
if (process.env.EHR_RENDER_SHARD_REPORT) {
  const wasmSha256 = createHash('sha256').update(readFileSync('app/public/ehr/ehr-interp.wasm')).digest('hex');
  const nativeSha256 = createHash('sha256').update(readFileSync(nativeExecutable)).digest('hex');
  writeFileSync(process.env.EHR_RENDER_SHARD_REPORT, JSON.stringify({shardIndex, shardCount, bundleCount, stateIndices, total, wasmSha256, nativeSha256}));
}
console.log(`Native/WASM equivalence: ${bundleCount} Synthea + Synthetic Hospital bundles, ${states.length} canonical HTML + semantic UI variants; stable patient/row ids, actual RN wristband acceptance/rejection and error envelopes passed.`);
