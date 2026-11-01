/** Audit P5's declared semantic buttons through the installed, real Lean WASM.
 * Usage: node lean/Ehr/Canonical/audit_surgery_controls.mjs /tmp/surg-review [report.json]
 * Initial-screen probes are independent; every navigation path uses real gotos.
 */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadEhrInterp } from '../../../app/public/ehr/interp-loader.mjs';
const root = new URL('../../../', import.meta.url);
const source = process.argv[2] ?? '/tmp/surg-review';
const destination = process.argv[3] ?? '/tmp/surg-button-audit.json';
const read = async path => JSON.parse(await readFile(path, 'utf8'));
const wasm = await loadEhrInterp();
const nativeFacts = (bundle, context) => JSON.parse(execFileSync(
  fileURLToPath(new URL('lean/.lake/build/bin/ehr', root)), ['facts'],
  { input: JSON.stringify({ bundle, context }), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
));
const bundle = await read(`${source}/case-bundle.json`);
const context = await read(`${source}/case-context.json`);
const user = await read(`${source}/user.json`);
const projection = JSON.parse(wasm.facts(JSON.stringify({ bundle, context })));
assert.equal(projection.error, undefined);
assert.deepEqual(projection, nativeFacts(bundle, context));
function nodes(node) {
  if (node.section) return [node, ...node.section.children.flatMap(nodes)];
  if (node.columns) return [node, ...node.columns.children.flatMap(nodes)];
  if (node.tabs) return [node, ...node.tabs.body.flatMap(nodes)];
  if (node.presentation) return [node, ...node.presentation.children.flatMap(nodes)];
  if (node.rowAction) return [node, ...node.rowAction.children.flatMap(nodes)];
  return [node];
}
function route(program, target) {
  const seen = new Set([program.start]);
  const queue = [[program.start, []]];
  for (const [screen, path] of queue) {
    if (screen === target) return path;
    for (const c of program.screens.find(s => s.id === screen).components) {
      const next = c.kind.button?.action.goto?.screen;
      if (next && !seen.has(next)) { seen.add(next); queue.push([next, [...path, { click: { comp: c.id } }]]); }
    }
  }
  throw new Error(`Unreachable screen ${target}`);
}
const report = { scope: 'P5, all releases; visible initial-state semantic buttons and every alternate tab; real WASM transitions', screens: [], failures: [] };
for (const release of ['v1', 'v2', 'v3']) {
  const programBytes = await readFile(new URL(`releases/${release}/personas/P5.json`, root), 'utf8');
  const program = JSON.parse(programBytes);
  const spec = await read(new URL(`releases/${release}/spec.json`, root));
  const common = { spec, program, facts: projection.facts, user };
  const step = (state, event) => JSON.parse(wasm.step(JSON.stringify({ ...common, state, event })));
  for (const screen of program.screens) {
    let state = JSON.parse(wasm.init(JSON.stringify(common)));
    for (const event of route(program, screen.id)) {
      const result = step(state, event);
      assert.equal(result.result, 'ok', `${screen.id}: navigation ${JSON.stringify(result.result)}`);
      state = result.state;
    }
    assert.equal(state.screen, screen.id);
    const ui = JSON.parse(wasm.call('ehr_render_ui', JSON.stringify({ ...common, display: projection.display, state })));
    assert.equal(ui.error, undefined);
    assert.equal(ui.viewer, 'General surgeon');
    if (context.encounterKind === 'preop') {
      const source = projection.facts.infoPayloads?.find(p => p.info === 'scheduleTasks')?.rows[0]?.fields;
      const plannedRoom = source?.find(([key]) => key === 'Room')?.[1] ?? 'Not recorded';
      assert.equal(ui.banner.find(([key]) => key === 'Encounter context')?.[1], 'Preoperative chart review');
      assert.equal(ui.banner.find(([key]) => key === 'Planned OR')?.[1], plannedRoom);
      assert.ok(!ui.banner.some(([key]) => ['Encounter', 'Attending', 'Location'].includes(key)));
    }
    assert.ok(ui.nav.length <= 12);
    assert.equal(new Set(ui.nav.map(([title]) => title)).size, ui.nav.length);
    for (const [, items] of ui.nav) {
      assert.ok(items.length <= 12);
      assert.equal(new Set(items.map(([, label]) => label)).size, items.length);
      assert.equal(new Set(items.map(([id]) => id)).size, items.length);
    }
    if (['W1', 'W6'].includes(screen.workflow)) {
      assert.equal(ui.activeNav, `${screen.id}.nav.${screen.id}`);
      assert.ok(ui.nav.some(([, items]) => items.some(([id]) => id === ui.activeNav)));
    }
    const shown = [...ui.workspace, ...ui.side, ...(ui.modal ? [ui.modal] : [])].flatMap(nodes);
    const choices = ui.fieldChoices ?? [];
    assert.equal(new Set(choices.map(([comp]) => comp)).size, choices.length);
    for (const [comp, choice] of choices) {
      const field = shown.find(n => n.field?.comp === comp)?.field;
      assert.ok(field?.kind.startsWith('code'), `${comp}: choices require a visible coded field`);
      assert.equal(choice.allowOther, true, `${comp}: department favorites must retain manual entry`);
      assert.ok(choice.options.length > 0);
      assert.equal(new Set(choice.options.map(([code]) => code)).size, choice.options.length);
      for (const [code, label] of choice.options) assert.ok(code.trim() && label.trim());
    }
    const rowControls = {
      home: ['home.schedule', 'home.openSelectedCase'],
      w6Schedule: ['w6Schedule.cases', 'w6Schedule.openCase'],
      w6Consults: ['w6Consults.requests', 'w6Consults.openConsult'],
    };
    if (rowControls[screen.id]) {
      const [target, comp] = rowControls[screen.id];
      assert.ok(shown.some(n => n.rowAction?.target === target && n.rowAction.row === 0 &&
        n.rowAction.children.some(child => child.button?.comp === comp)),
      `${screen.id}: retain the declared source-row goto`);
    }
    for (const { field } of shown.filter(n => n.field?.provenance)) {
      const label = ui.sourceLabels?.find(([source]) => source === field.provenance)?.[1];
      assert.ok(label?.trim());
      assert.notEqual(label, field.provenance);
      assert.ok(!/record:|linked:/.test(label));
    }
    const buttons = shown.filter(n => n.button).map(n => n.button);
    buttons.push(...ui.nav.flatMap(([, items]) => items.map(([comp, label]) => ({ comp, label, role: 'nav', enabled: true }))));
    let enabled = 0, disabled = 0, tabChanges = 0;
    for (const button of buttons) {
      if (!button.enabled) { assert.ok(button.blockedReason?.trim(), `${screen.id}: missing disabled reason`); disabled++; continue; }
      enabled++;
      const event = button.role === 'confirm' ? { confirm: { comp: button.comp } }
        : button.role === 'ack' ? { ack: { alert: button.comp } } : { click: { comp: button.comp } };
      const result = step(state, event);
      if (result.result !== 'ok' || JSON.stringify(result.state) === JSON.stringify(state))
        report.failures.push({ release, screen: screen.id, label: button.label, result: result.result, changed: JSON.stringify(result.state) !== JSON.stringify(state) });
    }
    for (const { tabs } of shown.filter(n => n.tabs)) {
      for (let idx = 0; idx < tabs.labels.length; idx++) {
        if (idx === tabs.selected) continue;
        const result = step(state, { selectTab: { comp: tabs.id, idx } });
        assert.equal(result.result, 'ok');
        assert.notDeepEqual(result.state, state);
        tabChanges++;
      }
    }
    report.screens.push({ release, screen: screen.id, programSha256: createHash('sha256').update(programBytes).digest('hex'), enabled, disabled, tabChanges, codedFieldsWithChoices: choices.length });
  }
}
// The seeded consult has an explicitly recorded pounds weight. Exercise the
// corrected input against real state; this probe does not sign clinical orders.
{
  const program = await read(new URL('releases/v1/personas/P5.json', root));
  const spec = await read(new URL('releases/v1/spec.json', root));
  const bundle = await read(`${source}/consult-bundle.json`);
  const context = await read(`${source}/consult-context.json`);
  const projection = JSON.parse(wasm.facts(JSON.stringify({ bundle, context })));
  assert.equal(projection.error, undefined);
  assert.deepEqual(projection, nativeFacts(bundle, context));
  const request = projection.facts.infoPayloads?.find(p => p.info === 'consultRequest')?.rows[0]?.fields;
  assert.ok(request?.some(([key, value]) => key === 'Received' && value));
  assert.ok(!request?.some(([key]) => key === 'Due'));
  const common = { spec, program, facts: projection.facts, user };
  const step = (state, event) => JSON.parse(wasm.step(JSON.stringify({ ...common, state, event })));
  const render = state => JSON.parse(wasm.call('ehr_render_ui', JSON.stringify({ ...common, display: projection.display, state })));
  let state = JSON.parse(wasm.init(JSON.stringify(common)));
  for (const event of route(program, 'w6Sign')) {
    const result = step(state, event);
    assert.equal(result.result, 'ok');
    state = result.state;
  }
  const before = render(state);
  const weight = before.workspace.flatMap(nodes).find(n => n.field?.comp === 'w6Sign.weight')?.field;
  assert.ok(weight);
  assert.equal(weight.unit, 'kg');
  assert.equal(weight.value, null);
  assert.ok(before.entryHints?.some(([comp, text]) => comp === weight.comp && text.includes('lb.')));
  const result = step(state, { enter: { comp: weight.comp, value: { qty: { tenths: 800, unit: 'kg' } } } });
  assert.equal(result.result, 'ok');
  const capture = result.state.captured.find(c => c.element === 'weight' && c.slot === 0);
  assert.equal(capture.value.qty.unit, 'kg');
  assert.equal(capture.byHuman, true);
  assert.equal(capture.confirmed, true);
  const after = render(result.state);
  const entered = after.workspace.flatMap(nodes).find(n => n.field?.comp === weight.comp)?.field;
  assert.equal(Number(entered.value), 80);
  assert.ok(!after.entryHints?.some(([comp]) => comp === weight.comp));
  report.poundsEntry = { target: 'w6Sign.weight', inputUnit: 'kg', initiallyBlank: true,
    recordedPoundsRetainedInHint: true, humanEntryAccepted: true, automaticConversion: false };
}
report.nativeWasmProjectionComparisons = 2;
await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
console.log(`${report.screens.length} P5 release/screens: ${report.screens.reduce((n, s) => n + s.enabled, 0)} enabled buttons, ${report.screens.reduce((n, s) => n + s.disabled, 0)} explained disabled buttons, ${report.screens.reduce((n, s) => n + s.tabChanges, 0)} alternate tabs; ${report.failures.length} failures`);
assert.deepEqual(report.failures, []);
