import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeEvaluations } from './merge.mjs';
const report = (id, status) => ({ runId: 'r', generatedAt: '2026-11-01T16:00:00Z', native: { sha256: 'binary', calls: 1 },
  scenarios: [{ id }], targets: [{ id: 'P1/v0', programSha256: 'program', specSha256: 'spec' }],
  results: [{ target: 'P1/v0', scenario: id, status }] });
test('supplemental batches cannot overwrite a failure or mix program/binary inputs', () => {
  assert.throws(() => mergeEvaluations(report('same', 'fail'), report('same', 'pass')), /overlap/);
  const different = report('other', 'pass'); different.targets[0].programSha256 = 'different';
  assert.throws(() => mergeEvaluations(report('first', 'fail'), different), /Different program/);
  different.targets[0].programSha256 = 'program'; different.native.sha256 = 'different';
  assert.throws(() => mergeEvaluations(report('first', 'fail'), different), /Different native/);
});
test('disjoint matching batches retain both outcomes and their provenance', () => {
  const merged = mergeEvaluations(report('first', 'fail'), report('second', 'pass'));
  assert.deepEqual(merged.summary, { targets: 1, scenarios: 2, passed: 1, failed: 1, notApplicable: 0 });
  assert.equal(merged.evidenceBatches.length, 2);
});
