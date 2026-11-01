import test from 'node:test';
import assert from 'node:assert/strict';
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
test('archived deployment certificates bind all eight exact programs and preserved specs', () => {
  const targets = runTargets('run1-P3');
  assert.deepEqual(targets.map(t => t.revision), [0, 1, 2, 3, 4, 5, 6, 7]);
  for (const t of targets) {
    assert.equal(legacyJsonHash(t.program), t.certificate.programHash, t.id);
    assert.equal(legacyJsonHash(t.spec), t.certificate.specHash, t.id);
    assert.equal(t.spec.version, t.program.specVersion);
  }
  assert.equal(targets[2].release, 'v1.1'); assert.equal(targets[2].semanticRelease, 'v2');
  assert.equal(targets[5].release, 'v2'); assert.equal(targets[5].semanticRelease, 'v3');
});
