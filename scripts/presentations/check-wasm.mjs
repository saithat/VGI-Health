// Exact native/WASM comparisons for every new clinical presentation.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { loadEhrInterp } from '../../app/public/ehr/interp-loader.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const native = (command, input) => JSON.parse(execFileSync(resolve(root, 'lean/.lake/build/bin/ehr'), [command], { input: JSON.stringify(input), maxBuffer: 32e6 }));
const wasm = await loadEhrInterp();
const corpus = (await readFile(resolve(root, 'app/src/fixtures/presentations/api-inputs.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
for (const [kind, input] of corpus) {
  const result = JSON.parse(wasm.call('ehr_render_ui', JSON.stringify(input)));
  assert.deepEqual(result, native('render-ui', input), kind);
  const legacyInput = structuredClone(input);
  delete legacyInput.display.labResults;
  for (const row of legacyInput.display.observations) delete row.categories;
  assert.deepEqual(JSON.parse(wasm.call('ehr_render_ui', JSON.stringify(legacyInput))), native('render-ui', legacyInput), `${kind}: legacy display defaults`);
  if (kind === 'results' || kind === 'trend') {
    const rows = result.workspace[1].presentation.children[0].info.rows;
    const has = (row, key, value) => row.some(([name, text]) => name === key && text === value);
    assert.equal(rows.length, input.display.labResults.length);
    assert.ok(rows.some(row => has(row, 'Value', '120') && has(row, 'Unit', 'g/L')));
    assert.ok(!rows.some(row => has(row, 'Value', '120') && has(row, 'Unit', 'g/dL')));
    assert.ok(rows.some(row => has(row, 'Value', '<5')));
    assert.ok(rows.some(row => has(row, 'Value', 'No growth')));
  }
  if (kind === 'flowsheet') {
    assert.ok(input.display.observations.some(row => row.categories.includes('laboratory')));
    const rows = result.workspace[1].presentation.children[0].info.rows;
    assert.ok(!rows.some(row => row.some(([key, value]) => key === 'Measure' && value === 'Hemoglobin')));
    assert.ok(rows.some(row => row.some(([key, value]) => key === 'Measure' && value.includes('Systolic'))));
  }
  if (kind === 'growthUnits') {
    const rows = result.workspace[1].presentation.children[0].info.rows;
    const has = (row, key, value) => row.some(([name, text]) => name === key && text === value);
    assert.ok(rows.some(row => has(row, 'Date', 'May 1, 2024') && has(row, 'Weight (kg)', '22.2')));
    assert.ok(rows.some(row => has(row, 'Date', 'Nov 1, 2024') && has(row, 'Height (cm)', '123.2')));
    assert.ok(rows.some(row => has(row, 'Date', 'Nov 1, 2026') && has(row, 'Weight (kg)', '30.4')));
  }
  if (kind === 'inBasket') {
    const panes = result.workspace[1].section.children[0].columns.children;
    assert.deepEqual(panes.map(node => node.presentation.kind), ['folderList', 'messages']);
    assert.ok(panes.every(node => node.presentation.children.some(child => child.info)));
  } else if (kind === 'rowActions') {
    const children = result.workspace[1].presentation.children[0].section.children;
    assert.equal(children[0].presentation.kind, 'worklist');
    assert.deepEqual(children.slice(1).map(node => [node.rowAction.target, node.rowAction.row]), [['records', 0], ['records', 1], ['records', 2]]);
    for (const [id, target] of [['open-mar', 'mar-detail'], ['open-pain', 'pain-detail'], ['open-vitals', 'vitals-detail']]) {
      const stepInput = { ...input, event: { click: { comp: id } } };
      const actual = JSON.parse(wasm.step(JSON.stringify(stepInput)));
      assert.deepEqual(actual, native('step', stepInput));
      assert.equal(actual.state.screen, target);
    }
    for (const index of ['9007199254740992', '9'.repeat(512)]) {
      const oversized = structuredClone(input);
      oversized.program.screens[0].components.find(node => node.id === 'open-mar').tag = `present.row|records|${index}`;
      const screen = JSON.parse(wasm.call('ehr_render_ui', JSON.stringify(oversized)));
      assert.deepEqual(screen, native('render-ui', oversized));
      const original = screen.workspace[1].presentation.children[0].section.children.find(node => node.button?.comp === 'open-mar');
      assert.equal(original?.button.label, 'Open MAR');
    }
  } else {
    assert.equal(result.workspace[1].presentation.kind, kind === 'growthUnits' ? 'growth' : kind);
    assert.ok(result.workspace[1].presentation.children.some(node => node.info), kind);
  }
}
const bundle = JSON.parse(await readFile(resolve(root, 'lean/Ehr/Render/TestData/presentations.json'), 'utf8'));
const factsInput = { bundle, context: { today: '2026-11-01', now: 0, receipts: [], record: [] } };
assert.deepEqual(JSON.parse(wasm.facts(JSON.stringify(factsInput))), native('facts', factsInput));
console.log(`Native/WASM structured UI: ${corpus.length} presentations and fictional FHIR projections agree exactly.`);
