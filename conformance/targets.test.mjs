import { dataReason } from '../scripts/test-data.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
test('archived deployment inputs retain exact certificates or explicit current-gate refusals', { skip: dataReason('runs/run1-P3') }, () => {
  const read = file => JSON.parse(readFileSync(new URL(`../runs/run1-P3/${file}`, import.meta.url), 'utf8'));
  if (read('manifest.json').neutralMigration?.status === 'rejected') {
    assert.throws(() => runTargets('run1-P3'), /no current certification/);
    for (let revision=0;revision<8;revision++) {
      const binding=read(`certs/P3/v${revision}.build.json`);
      assert.equal(binding.status,'rejected');assert.equal(binding.current,null);
      assert.equal(JSON.parse(binding.reason).violation.property,'navigation');
    }
    return;
  }
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
