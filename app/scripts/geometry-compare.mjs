import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Task-aligned, signed changes; no recordings or certificates are modified.
const [before, after, output] = process.argv.slice(2);
if (!before || !after || !output) throw new Error('Usage: geometry-compare.mjs <before-dir> <after-dir> <output.json>');
const baseline = JSON.parse(await readFile(path.join(before, 'baselines.json'), 'utf8'));
const current = JSON.parse(await readFile(path.join(after, 'baselines.json'), 'utf8'));
assert.equal(current.worldSha256, baseline.worldSha256);
assert.equal(current.ehrSha256, baseline.ehrSha256);
assert.equal(current.rows.length, baseline.rows.length);
const stats = values => ({ mean: values.reduce((a, b) => a + b, 0) / values.length, max: Math.max(...values), min: Math.min(...values) });
const rows = [];
for (const row of baseline.rows) {
  const name = `${row.release}-${row.persona}.json`;
  const old = JSON.parse(await readFile(path.join(before, name), 'utf8'));
  const next = JSON.parse(await readFile(path.join(after, name), 'utf8'));
  assert.deepEqual(next.trace, old.trace, `${name}: native traces changed`);
  assert.deepEqual(next.tasks.map(t => [t.task, t.completed]), old.tasks.map(t => [t.task, t.completed]));
  const metrics = {};
  for (const metric of ['scrollPx', 'mouseTravelPx']) {
    const a = old.tasks.map(t => t[metric]), b = next.tasks.map(t => t[metric]);
    assert(a.every(Number.isFinite) && b.every(Number.isFinite));
    const delta = b.map((value, index) => value - a[index]);
    metrics[metric] = { before: stats(a), after: stats(b), delta: stats(delta), absoluteDelta: stats(delta.map(Math.abs)) };
  }
  rows.push({ persona: row.persona, release: row.release, tasks: old.tasks.length, metrics });
}
await writeFile(output, JSON.stringify({ beforeApp: baseline.rows[0].geometry.appSha256, afterApp: current.rows[0].geometry.appSha256, rows }, null, 2));
