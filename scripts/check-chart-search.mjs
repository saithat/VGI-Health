// Exercise the real WASM search on every committed patient, including large charts.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { loadEhrInterp } from '../app/public/ehr/interp-loader.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const runtime = await loadEhrInterp();
const call = (name, input) => {
  const result = JSON.parse(name === 'render_ui'
    ? runtime.call('ehr_render_ui', JSON.stringify(input))
    : runtime[name](JSON.stringify(input)));
  assert.ok(!result.error, `${name}: ${result.error}`);
  return result;
};
const native = (input) => JSON.parse(execFileSync(resolve(root, 'lean/.lake/build/bin/ehr'), ['render-ui'], {
  input: JSON.stringify(input), maxBuffer: 32e6, timeout: 30000,
  env: { ...process.env, LEAN_NUM_THREADS: '4' },
}));
const spec = read('releases/v1/spec.json');
const program = read('releases/v1/personas/P1.json');
const user = { id: 'chart-search-regression', role: 'physician' };
const context = { today: '2026-10-31', now: 0, receipts: [], record: [] };
const walk = (nodes) => nodes.flatMap((node) => [node, ...walk(
  node.section?.children ?? node.presentation?.children ?? node.rowAction?.children ??
  node.columns?.children ?? node.tabs?.body ?? [],
)]);
let count = 0;
for (const directory of ['fixtures/synthea', 'fixtures/synthetic-hospital']) {
  for (const file of readdirSync(resolve(root, directory)).filter((file) => file.endsWith('.json') && file !== 'index.json').sort()) {
    const source = call('facts', { bundle: read(`${directory}/${file}`), context });
    const base = { spec, program, user, ...source };
    const state = call('init', base);
    const view = call('view', { ...base, state });
    const search = view.items.find((item) => item.shown && item.comp.kind?.search?.scope === 'chart');
    assert.ok(search, `${file}: shown chart search`);
    const entered = call('step', { ...base, state, event: { enter: { comp: search.comp.id, value: { text: { s: '72' } } } } });
    assert.equal(entered.result, 'ok', file);
    for (const key of ['captured', 'receipts', 'commits', 'orderSlot']) {
      assert.deepEqual(entered.state[key], state[key], `${file}: ${key} unchanged`);
    }
    const input = { ...base, state: entered.state };
    const ui = call('render_ui', input);
    assert.deepEqual(ui, native(input), `${file}: native/WASM search`);
    const results = walk([...ui.workspace, ...ui.side]).find((node) => node.info?.infoId === 'searchResults');
    assert.ok(results, `${file}: explicit search result`);
    assert.ok(results.info.rows.length >= 1 && results.info.rows.length <= 26, `${file}: bounded summary`);
    count++;
    if (count % 50 === 0) process.stdout.write(`Chart search ${count} patients\n`);
  }
}
assert.equal(count, 324);
process.stdout.write(`Native/WASM chart search: ${count}/324 patients; bounded summaries and clinical state preservation pass.\n`);
