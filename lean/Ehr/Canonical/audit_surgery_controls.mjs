/** Audit P5's declared semantic buttons through the installed, real Lean WASM.
 * Usage: node lean/Ehr/Canonical/audit_surgery_controls.mjs /tmp/surg-review [report.json]
 * Initial-screen probes are independent; every navigation path uses real gotos.
 */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { loadEhrInterp } from '../../../app/public/ehr/interp-loader.mjs';
const root = new URL('../../../', import.meta.url);
const source = process.argv[2] ?? '/tmp/surg-review';
const destination = process.argv[3] ?? '/tmp/surg-button-audit.json';
const read = async path => JSON.parse(await readFile(path, 'utf8'));
const wasm = await loadEhrInterp();
const bundle = await read(`${source}/case-bundle.json`);
const context = await read(`${source}/case-context.json`);
const user = await read(`${source}/user.json`);
const projection = JSON.parse(wasm.facts(JSON.stringify({ bundle, context })));
assert.equal(projection.error, undefined);
function nodes(node) {
  if (node.section) return [node, ...node.section.children.flatMap(nodes)];
  if (node.columns) return [node, ...node.columns.children.flatMap(nodes)];
  if (node.tabs) return [node, ...node.tabs.body.flatMap(nodes)];
  if (node.presentation) return [node, ...node.presentation.children.flatMap(nodes)];
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
    const shown = [...ui.workspace, ...ui.side, ...(ui.modal ? [ui.modal] : [])].flatMap(nodes);
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
    report.screens.push({ release, screen: screen.id, programSha256: createHash('sha256').update(programBytes).digest('hex'), enabled, disabled, tabChanges });
  }
}
await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
console.log(`${report.screens.length} P5 release/screens: ${report.screens.reduce((n, s) => n + s.enabled, 0)} enabled buttons, ${report.screens.reduce((n, s) => n + s.disabled, 0)} explained disabled buttons, ${report.screens.reduce((n, s) => n + s.tabChanges, 0)} alternate tabs; ${report.failures.length} failures`);
assert.deepEqual(report.failures, []);
