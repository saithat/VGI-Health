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
  assert.equal(result.workspace[1].presentation.kind, kind);
  assert.ok(result.workspace[1].presentation.children.some(node => node.info), kind);
}
const bundle = JSON.parse(await readFile(resolve(root, 'lean/Ehr/Render/TestData/presentations.json'), 'utf8'));
const factsInput = { bundle, context: { today: '2026-11-01', now: 0, receipts: [], record: [] } };
assert.deepEqual(JSON.parse(wasm.facts(JSON.stringify(factsInput))), native('facts', factsInput));
console.log(`Native/WASM structured UI: ${corpus.length} presentations and fictional FHIR projections agree exactly.`);
