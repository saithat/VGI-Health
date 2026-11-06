import { dataReason } from '../scripts/test-data.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { digest } from './native.mjs';
import { info } from './driver.mjs';
import { canonicals, runTargets } from './index.mjs';

const sorted = value => Array.isArray(value) ? value.map(sorted) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(k => [k, sorted(value[k])])) : value;
function legacyJsonHash(value) {
  let n = 14695981039346656037n;
  for (const b of Buffer.from(JSON.stringify(sorted(value)))) n = BigInt.asUintN(64, (n ^ BigInt(b)) * 1099511628211n);
  return `fnv1a64:${n.toString(16).padStart(16, '0')}`;
}
test('all 15 role canonicals are included independently of run personas', () => {
  const targets = canonicals();
  assert.equal(targets.length, 15);
  for (const release of ['v1', 'v2', 'v3']) assert.equal(targets.filter(t => t.release === release).length, 5);
});
test('recorded deployment inputs retain exact certificate hashes and frozen specs', { skip: dataReason('runs/core-10day') }, () => {
  const targets = runTargets('core-10day');
  assert.equal(targets.length, 33);
  assert.deepEqual([...new Set(targets.map(t => t.persona))], ['P1','P2','P3','P4','P5']);
  for (const t of targets) {
    assert.equal(legacyJsonHash(t.program), t.certificate.programHash, t.id);
    assert.equal(legacyJsonHash(t.spec), t.certificate.specHash, t.id);
    assert.equal(t.spec.version, t.program.specVersion);
    assert.equal(t.semanticRelease, t.release);
  }
});

test('stored CURES removal probe is bound to the current inputs and records the mandatory-display refusal', () => {
  const target = canonicals().find(t => t.release === 'v3' && t.persona === 'P1');
  const program = structuredClone(target.program);
  for (const screen of program.screens) screen.components = screen.components.filter(c => !info('curesReport')(c));
  const probe = JSON.parse(readFileSync(new URL('./results/cures-probe-check.json', import.meta.url), 'utf8'));
  assert.equal(probe.programSha256, digest(program));
  assert.equal(probe.specSha256, digest(target.spec));
  const binary = new URL('../lean/.lake/build/bin/ehr', import.meta.url);
  if (existsSync(binary)) assert.equal(probe.binarySha256, digest(readFileSync(binary)));
  assert.equal(probe.exitCode, 1);
  assert.equal(probe.verdict.violation.property, 'completable');
  assert.match(probe.verdict.violation.message, /curesReport/);
});
