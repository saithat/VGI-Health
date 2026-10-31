import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { loadEhrInterp } from '../dist/interp-loader.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const leanDir = `${root}/lean`;
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: leanDir, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, ...options,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stdout.slice(-4000) + result.stderr);
  return result.stdout;
}
run('lake', ['build', 'ehr']);
const tiny = JSON.parse(run('lake', ['env', 'lean', '--run', '../wasm/test/Fixtures.lean']));
const canonicalPath = `${root}/programs/canonical/v1.json`;
const specPath = `${root}/releases/v1/spec.json`;
const canonicalPresent = existsSync(canonicalPath) && existsSync(specPath);
const contexts = [{ name: 'tiny', ...tiny }];
if (canonicalPresent) contexts.push({ ...tiny, name: 'canonical-v1',
  program: JSON.parse(readFileSync(canonicalPath, 'utf8')),
  spec: JSON.parse(readFileSync(specPath, 'utf8')),
});

let seed = 0x7135c0de;
function random(n) {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) % n;
}
const pick = (xs) => xs[random(xs.length)];
function eventPool(ctx) {
  const pool = [];
  for (const screen of ctx.program.screens) {
    pool.push({ scroll: { screen: screen.id } });
    for (const comp of screen.components) {
      pool.push({ click: { comp: comp.id } }, { confirm: { comp: comp.id } });
      if (comp.kind === 'tabs') for (const idx of [0, 1, 2]) pool.push({ selectTab: { comp: comp.id, idx } });
      if (typeof comp.kind === 'object' && comp.kind.field) {
        const element = comp.kind.field.element;
        const values = {
          weight: [{ qty: { tenths: 200, unit: 'kg' } }, { qty: { tenths: 440, unit: 'lb' } }],
          drug: ['amoxicillin', 'morphine', 'warfarin', 'insulin', 'unknown'].map(c => ({ code: { c } })),
          dose: [0, 1, 5000, 100000, 2147483649].map(tenths => ({ qty: { tenths, unit: 'mg' } })),
          patientIdReentry: [{ text: { s: 'JD/F/34' } }, { text: { s: 'wrong 🩺' } }],
          cosigner: [{ user: { u: 'u2' } }, { user: { u: 'u1' } }],
        };
        for (const value of [...(values[element] ?? []), { text: { s: '患者 café\n\u0000' } },
          { flag: { b: true } }, { code: { c: 'q4h' } }]) pool.push({ enter: { comp: comp.id, value } });
      }
    }
  }
  pool.push({ search: { query: '患者 🩺' } }, { click: { comp: 'missing' } });
  for (const alert of ctx.spec.alerts) pool.push({ ack: { alert: alert.id } });
  return pool;
}
function guided(ctx) {
  if (ctx.name !== 'tiny') return [];
  return [
    { confirm: { comp: 'weightField' } }, { click: { comp: 'reviewAllergies' } },
    { click: { comp: 'toOrder' } },
    { enter: { comp: 'drugField', value: { code: { c: 'amoxicillin' } } } },
    { enter: { comp: 'doseField', value: { qty: { tenths: 5000, unit: 'mg' } } } },
    { click: { comp: 'toSign' } },
    { enter: { comp: 'patientIdField', value: { text: { s: 'JD/F/34' } } } },
    { selectTab: { comp: 'signTabs', idx: 1 } }, { click: { comp: 'signButton' } },
    { ack: { alert: 'drugAllergy' } }, { click: { comp: 'signButton' } },
  ];
}
const cases = [];
const caseCounts = {};
for (const ctx of contexts) {
  const pool = eventPool(ctx);
  // 2,048 sequences per program, 24–47 events each. Half start with a
  // successful guided path so guards, popups, acknowledgements and commits run.
  for (let i = 0; i < 2048; i++) {
    const facts = structuredClone(ctx.facts);
    facts.allergyClasses = pick([[], ['penicillin'], ['opioid']]);
    facts.currentMedClasses = pick([[], ['benzodiazepine'], ['anticoagulant']]);
    facts.abnormalResult = !!random(2);
    facts.now = pick([0, 600, 1440, 2147483649]);
    facts.identity.initials = i % 31 === 0 ? '患者 🩺' : 'JD';
    const user = { id: i % 7 === 0 ? 'u2' : 'u1', role: pick(['physician', 'np', 'rn', 'surgeon']) };
    const events = i % 2 === 0 ? guided(ctx) : [];
    const length = 24 + random(24);
    while (events.length < length) events.push(pick(pool));
    cases.push({ spec: ctx.spec, program: ctx.program, facts, user, events });
  }
  caseCounts[ctx.name] = 2048;
}
mkdirSync(`${root}/wasm/.build`, { recursive: true });
const batchPath = `${root}/wasm/.build/equivalence-cases.jsonl`;
writeFileSync(batchPath, cases.map(c => JSON.stringify(c)).join('\n') + '\n');
const native = run(`${leanDir}/.lake/build/bin/ehr`, ['run-batch', batchPath]).trimEnd().split('\n');
const wasmBinary = readFileSync(new URL('../dist/ehr-interp.wasm', import.meta.url));
const loaded = performance.now();
const ehr = await loadEhrInterp({ wasmBinary });
const loadMs = performance.now() - loaded;
let row = 0;
let initComparisons = 0;
const resultCounts = {};
// Lean's compact JSON sorts object keys. Preserve the exact strings returned by
// Lean when assembling BatchStep, then compare the complete native output bytes.
for (let i = 0; i < cases.length; i++) {
  const { events, ...context } = cases[i];
  let state = ehr.init(JSON.stringify(context));
  if (i % 128 === 0) {
    assert.equal(state, run(`${leanDir}/.lake/build/bin/ehr`, ['init'], { input: JSON.stringify(context) }).trimEnd());
    initComparisons++;
  }
  for (let index = 0; index < events.length; index++) {
    const output = ehr.step(`{${JSON.stringify(context).slice(1, -1)},"state":${state},"event":${JSON.stringify(events[index])}}`);
    const parsed = JSON.parse(output);
    assert.ok(!parsed.error, output);
    // Recover the raw state/result serialization directly from the Lean output;
    // parsing/stringifying can change large Nat tokens or Unicode escapes.
    const resultPrefix = '{"result":';
    assert.ok(output.startsWith(resultPrefix));
    const stateMarker = ',"state":';
    const split = output.indexOf(stateMarker);
    const result = output.slice(resultPrefix.length, split);
    state = output.slice(split + stateMarker.length, -1);
    const kind = typeof parsed.result === 'string' ? parsed.result : 'blocked';
    resultCounts[kind] = (resultCounts[kind] ?? 0) + 1;
    const view = ehr.view(`{${JSON.stringify(context).slice(1, -1)},"state":${state}}`);
    const actual = `{"case":${i},"index":${index},"result":${result},"state":${state},"view":${view}}`;
    assert.equal(actual, native[row], `case ${i}, event ${index} (${JSON.stringify(events[index])})`);
    row++;
  }
}
assert.equal(row, native.length);
assert.throws(() => ehr.step('x\0y'), TypeError);
for (const op of ['init', 'step', 'view']) for (const bad of ['{', '{}', 'null', '[]']) {
  const output = ehr[op](bad);
  assert.equal(typeof JSON.parse(output).error, 'string');
}
const summary = {
  seed: '0x7135c0de', cases: cases.length, caseCounts, batchSteps: row,
  stepComparisons: row, viewComparisons: row, initComparisons, resultCounts,
  canonicalPresent, loadMs, node: process.version,
  wasmBytes: wasmBinary.length, wasmGzipBytes: gzipSync(wasmBinary).length,
  sha256: createHash('sha256').update(wasmBinary).digest('hex'),
};
writeFileSync(new URL('./equivalence-results.json', import.meta.url), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
