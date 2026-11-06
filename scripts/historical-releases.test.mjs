import test from 'node:test';
import assert from 'node:assert/strict';
import { historicalReleaseAliases, releaseLabel, archivedReleaseId, trajectoryReleaseLabels, complexityReleaseLabels } from './historical-releases.mjs';
test('aliases are scoped to immutable history; current v2 stays v2', () => {
  assert.deepEqual(historicalReleaseAliases, { 'v1.1': 'v2', v2: 'v3' });
  assert.equal(releaseLabel('v1.1', 'mock'), 'v2');
  assert.equal(releaseLabel('v2', 'mock'), 'v3');
  assert.equal(releaseLabel('v2', 'tonight'), 'v2');
  assert.equal(archivedReleaseId('v2'), 'v1.1');
  assert.equal(archivedReleaseId('v3'), 'v2');
});
test('historical display metadata changes without touching recorded replay paths or metrics', () => {
  const index = { runId: 'mock', tasks: [{ release: 'v1.1', specPath: 'archive/v1.1.json', metrics: { clicks: 25 } }] };
  const view = trajectoryReleaseLabels(index);
  assert.equal(view.tasks[0].release, 'v2');
  assert.equal(view.tasks[0].specPath, index.tasks[0].specPath);
  assert.deepEqual(view.tasks[0].metrics, index.tasks[0].metrics);
  assert.equal(index.tasks[0].release, 'v1.1');
  const data = { personas: [{ iterations: [{ specVersion: 'v1.1' }], markers: [{ kind: 'release', label: 'v2' }] }] };
  const formatted = complexityReleaseLabels(data);
  assert.equal(formatted.personas[0].iterations[0].specVersion, 'v2');
  assert.equal(formatted.personas[0].markers[0].label, 'v3');
  assert.deepEqual(complexityReleaseLabels(formatted), formatted);
});
