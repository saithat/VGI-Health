import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import createModule from '../dist/ehr-interp.mjs';
import { wrapEhrInterp } from '../dist/interp-loader.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const fixture = spawnSync('lake', ['env', 'lean', '--run', '../wasm/test/Fixtures.lean'], {
  cwd: `${root}/lean`, encoding: 'utf8',
});
assert.equal(fixture.status, 0, fixture.stdout + fixture.stderr);
const context = JSON.parse(fixture.stdout);
const canonicalPresent = existsSync(`${root}/programs/canonical/v1.json`) && existsSync(`${root}/releases/v1/spec.json`);
if (canonicalPresent) {
  context.program = JSON.parse(readFileSync(`${root}/programs/canonical/v1.json`, 'utf8'));
  context.spec = JSON.parse(readFileSync(`${root}/releases/v1/spec.json`, 'utf8'));
} else {
  // An explicit synthetic workload until the content lane's canonical artifacts
  // land: seven workflow copies of Tiny's three-screen program. This does not
  // claim to be the clinical canonical program or a substitute equivalence case.
  context.program.id = 'synthetic-seven-workflow-benchmark';
  const screens = context.program.screens;
  context.program.screens = Array.from({ length: 7 }, (_, i) => screens.map(screen => ({
    ...screen, id: i === 0 ? screen.id : `W${i + 1}-${screen.id}`, workflow: `W${i + 1}`,
  }))).flat();
}
const binary = readFileSync(new URL('../dist/ehr-interp.wasm', import.meta.url));
const start = performance.now();
const module = await createModule({ wasmBinary: binary });
const ehr = wrapEhrInterp(module);
const loadMs = performance.now() - start;
const state = ehr.init(JSON.stringify(context));
const viewInput = `{${JSON.stringify(context).slice(1, -1)},"state":${state}}`;
const components = context.program.screens.find(s => s.id === context.program.start)?.components ?? [];
const firstField = components.find(c => typeof c.kind === 'object' && c.kind.field);
const event = firstField ? { confirm: { comp: firstField.id } }
  : { click: { comp: components[0]?.id ?? 'missing' } };
const stepInput = `${viewInput.slice(0, -1)},"event":${JSON.stringify(event)}}`;
function measure(op, input) {
  const first = performance.now();
  const expected = ehr[op](input);
  assert.ok(!JSON.parse(expected).error, expected);
  const firstCallMicroseconds = (performance.now() - first) * 1000;
  for (let i = 0; i < 200; i++) ehr[op](input);
  const times = [];
  for (let i = 0; i < 2000; i++) {
    const before = performance.now();
    const output = ehr[op](input);
    times.push((performance.now() - before) * 1000);
    assert.equal(output, expected);
  }
  const heapBefore = module._ehr_heap_used();
  for (let i = 0; i < 5000; i++) ehr[op](input);
  const heapAfter = module._ehr_heap_used();
  assert.ok(heapAfter <= heapBefore + 1024, `${op} heap growth ${heapBefore} -> ${heapAfter}`);
  times.sort((a, b) => a - b);
  return { calls: times.length, inputBytes: Buffer.byteLength(input), firstCallMicroseconds,
    meanMicroseconds: times.reduce((a, b) => a + b) / times.length,
    p50Microseconds: times[1000], p95Microseconds: times[1900], heapBefore, heapAfter };
}
const summary = {
  node: process.version, canonicalPresent,
  program: context.program.id, screens: context.program.screens.length,
  components: context.program.screens.reduce((n, s) => n + s.components.length, 0),
  wasmBytes: binary.length, wasmGzipBytes: gzipSync(binary).length,
  loaderBytes: readFileSync(new URL('../dist/ehr-interp.mjs', import.meta.url)).length,
  wrapperBytes: readFileSync(new URL('../dist/interp-loader.mjs', import.meta.url)).length,
  loadMs, step: measure('step', stepInput), view: measure('view', viewInput),
};
writeFileSync(new URL('./benchmark-results.json', import.meta.url), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
