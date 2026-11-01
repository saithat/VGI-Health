#!/usr/bin/env node
// Real native/WASM projection and both certified renderers on imported P1/P4 charts.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { loadEhrInterp } from '../../app/public/ehr/interp-loader.mjs';
const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const native = (command, input) => JSON.parse(execFileSync('lean/.lake/build/bin/ehr', [command], { input: JSON.stringify(input), maxBuffer: 64 * 1024 * 1024 }));
const wasm = await loadEhrInterp();
const index = read('fixtures/synthetic-hospital/index.json');
const context = { today: '2026-10-31' };
const walk = (nodes) => nodes.flatMap((n) => [n, ...walk(n.section?.children ?? n.columns?.children ?? n.tabs?.body ?? [])]);
mkdirSync('/tmp/data-phase2-screens', { recursive: true });
for (const persona of ['P1', 'P4']) {
  const patient = index.patients.find((p) => p.selectedFor === persona);
  const bundle = read(`fixtures/synthetic-hospital/${patient.file}`);
  const resources = bundle.entry.map((e) => e.resource);
  const output = native('facts', { context, bundle });
  assert.deepEqual(JSON.parse(wasm.facts(JSON.stringify({ context, bundle }))), output);
  const notes = resources.filter((r) => r.resourceType === 'DocumentReference' && r.status !== 'entered-in-error');
  const meds = resources.filter((r) => r.resourceType === 'MedicationStatement' && r.status !== 'entered-in-error');
  assert.equal(output.display.notes.length, notes.length);
  assert.equal(output.display.history.filter((r) => r.kind === 'Home medications (reported)').length, meds.length);
  assert.equal(output.display.meds.length, resources.filter((r) => r.resourceType === 'MedicationRequest' && ['active', 'on-hold'].includes(r.status)).length);
  for (const note of notes) {
    const id = note.id ?? bundle.entry.find((e) => e.resource === note).fullUrl;
    const row = output.display.notes.find((r) => r.id === id);
    for (const { attachment } of note.content) assert.ok(row.text.includes(Buffer.from(attachment.data, 'base64').toString('utf8')));
  }
  const program = read(`releases/v1/personas/${persona}.json`);
  const spec = read('releases/v1/spec.json');
  const user = { id: 'projection-check', role: program.role };
  const common = { spec, program, user, ...output };
  const initial = native('init', common);
  const tabs = program.screens.find((s) => s.id === 'home').components.find((c) => c.kind === 'tabs' && c.id.endsWith('.chart'));
  assert.ok(tabs);
  for (const info of ['encounterNotes', 'importedHistory']) {
    const component = program.screens.find((s) => s.id === 'home').components.find((c) => (c.kind.panel?.info ?? c.kind.table?.info) === info);
    assert.ok(component, info);
    const state = native('step', { ...common, state: initial, event: { selectTab: { comp: tabs.id, idx: component.tab } } }).state;
    const input = { ...common, state };
    const ui = native('render-ui', input);
    assert.deepEqual(JSON.parse(wasm.call('ehr_render_ui', JSON.stringify(input))), ui);
    const page = native('render', input);
    assert.deepEqual(JSON.parse(wasm.render(JSON.stringify(input))), page);
    const rows = walk(ui.workspace).find((n) => n.info?.infoId === info)?.info.rows;
    assert.equal(rows?.length, info === 'encounterNotes' ? notes.length : output.display.history.length);
    if (info === 'encounterNotes') for (const r of output.display.notes) assert.ok(rows.some((row) => row.some(([key, value]) => key === 'Text' && value === r.text)));
    const stem = `/tmp/data-phase2-screens/${persona}-${info}`;
    writeFileSync(`${stem}-ui.json`, JSON.stringify(ui));
    writeFileSync(`${stem}-page.json`, JSON.stringify(page));
  }
  console.log(`${persona}: ${notes.length} complete notes, ${meds.length} reported home medications, ${output.display.history.length} history rows; native/WASM and Page/renderUi agree`);
}
