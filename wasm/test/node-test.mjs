import assert from 'node:assert/strict';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { wrapEhr } from '../ehr.js';

const variant = process.argv.includes('--init') ? 'init' : 'json';
const stem = variant === 'init' ? 'ehr-init' : 'ehr';
const wasmPath = new URL(`../dist/${stem}.wasm`, import.meta.url);
const { default: createEhr } = await import(`../dist/${stem}.mjs`);
const wasmBinary = readFileSync(wasmPath);
const start = performance.now();
const module = await createEhr({ wasmBinary });
const ehr = wrapEhr(module);
const loadMs = performance.now() - start;
assert.equal(module._ehr_initialize(), 0, 'initialization is idempotent');

const input = variant === 'json' ? '{"counter":41}' : 'hello 🩺';
const expected = variant === 'json'
  ? { counter: 42, items: [41, 42, 43], input: { counter: 41 } }
  : 'hello 🩺 (Lean Init/WASM)';
function check(output) {
  assert.deepEqual(variant === 'json' ? JSON.parse(output) : output, expected);
}
check(ehr.step(input));
assert.throws(() => ehr.step(null), TypeError);
assert.throws(() => ehr.step('x\0y'), TypeError);
for (let i = 0; i < 100; i++) check(ehr.step(input));

const calls = 1000;
const latencies = [];
let output;
const benchmarkStart = performance.now();
for (let i = 0; i < calls; i++) {
  const before = performance.now();
  output = ehr.step(input);
  assert.equal(typeof output, 'string', 'step must return synchronously');
  latencies.push((performance.now() - before) * 1000);
}
const totalMs = performance.now() - benchmarkStart;
check(output);
latencies.sort((a, b) => a - b);

let differentialCases = 0;
if (variant === 'json') {
  for (const invalid of ['{', '{}', '{"counter":-1}', '{"counter":"x"}', 'null', '[]']) {
    assert.equal(typeof JSON.parse(ehr.step(invalid)).error, 'string');
  }
  const unicode = { counter: 0, text: '患者 🩺 café\n\t"\\\u0000', values: [true, false, null, -1.5, { x: [] }] };
  assert.deepEqual(JSON.parse(ehr.step(JSON.stringify(unicode))).input, unicode);
  // Force the non-GMP bignum implementation, beyond both wasm32 and host tagged Nats.
  const huge = '1234567890123456789012345678901234567890';
  const hugeOutput = ehr.step(`{"counter":${huge}}`);
  assert.ok(hugeOutput.includes(`"counter":${BigInt(huge) + 1n}`));

  const nativePath = fileURLToPath(new URL('../.build/native-step', import.meta.url));
  const nativeBuild = spawnSync('bash', [fileURLToPath(new URL('./build-native.sh', import.meta.url))], { encoding: 'utf8' });
  assert.equal(nativeBuild.status, 0, nativeBuild.stdout + nativeBuild.stderr);
  // A deterministic corpus exercises UTF-8, JSON parsing/printing, Nat arithmetic,
  // arrays, nested objects, invalid input, and arbitrary precision on both targets.
  const corpus = ['{', '{}', 'null', '{"counter":-1}', `{"counter":${huge}}`, JSON.stringify(unicode)];
  let seed = 0x12345678;
  function random() {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return seed >>> 0;
  }
  for (let i = 0; i < 2000; i++) {
    corpus.push(JSON.stringify({ counter: random(), text: `${i}: 🩺 患者 café`,
      values: [random(), !!(random() % 2), null, { nested: [i, -i, 'a\n"b'] }] }));
  }
  const native = spawnSync(nativePath, [], { input: corpus.join('\n') + '\n', encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  assert.ifError(native.error);
  assert.equal(native.status, 0, native.stderr);
  const nativeOutputs = native.stdout.trimEnd().split('\n');
  assert.equal(nativeOutputs.length, corpus.length);
  for (let i = 0; i < corpus.length; i++) {
    assert.equal(ehr.step(corpus[i]), nativeOutputs[i], `native/WASM mismatch, input ${i}`);
  }
  differentialCases = corpus.length;
}

// Check ownership after warming all hot paths. Lean object and returned C string
// allocations must be reclaimed after each call; the allocator may keep capacity.
for (let i = 0; i < 1000; i++) ehr.step(input);
const heapBefore = module._ehr_heap_used();
for (let i = 0; i < 20000; i++) ehr.step(input);
const heapAfter = module._ehr_heap_used();
assert.ok(heapAfter <= heapBefore + 1024, `heap grows: ${heapBefore} -> ${heapAfter}`);

const result = {
  variant, node: process.version, output,
  wasmBytes: wasmBinary.length, wasmGzipBytes: gzipSync(wasmBinary).length,
  wasmBrotliBytes: brotliCompressSync(wasmBinary).length,
  loaderBytes: statSync(new URL(`../dist/${stem}.mjs`, import.meta.url)).size,
  loadMs, calls, totalMs, meanMicroseconds: totalMs * 1000 / calls,
  p50Microseconds: latencies[500], p95Microseconds: latencies[950],
  differentialCases,
  memoryStressCalls: 20000, heapBefore, heapAfter,
};
console.log(JSON.stringify(result, null, 2));
writeFileSync(new URL(`../.build/node-${variant}-result.json`, import.meta.url), JSON.stringify(result, null, 2) + '\n');
