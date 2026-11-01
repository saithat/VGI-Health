import assert from 'node:assert/strict';

/** Combine disjoint scenario batches only. Existing outcomes cannot be replaced
 * by a later, better result, and every executable/spec/binary must be identical. */
export function mergeEvaluations(base, extra) {
  assert.equal(base.runId, extra.runId, 'Different runs');
  assert.equal(base.native.sha256, extra.native.sha256, 'Different native interpreters');
  assert.deepEqual(base.targets.map(t => t.id).sort(), extra.targets.map(t => t.id).sort(), 'Different target sets');
  const ids = new Set(base.scenarios.map(s => s.id));
  assert.ok(extra.scenarios.every(s => !ids.has(s.id)), 'Scenario batches overlap; refusing to replace any outcome');
  for (const t of base.targets) {
    const other = extra.targets.find(x => x.id === t.id);
    assert.equal(t.programSha256, other.programSha256, `Different program ${t.id}`);
    assert.equal(t.specSha256, other.specSha256, `Different spec ${t.id}`);
  }
  const scenarios = [...base.scenarios, ...extra.scenarios], results = [...base.results, ...extra.results];
  const targets = base.targets.map(t => {
    const rows = results.filter(r => r.target === t.id);
    assert.equal(rows.length, scenarios.length, `Incomplete target ${t.id}`);
    assert.equal(new Set(rows.map(r => r.scenario)).size, scenarios.length, `Duplicate result ${t.id}`);
    return { ...t, passed: rows.filter(r => r.status === 'pass').length, failed: rows.filter(r => r.status === 'fail').length,
      notApplicable: rows.filter(r => r.status === 'not-applicable').length };
  });
  const batch = r => ({ generatedAt: r.generatedAt, scenarios: r.scenarios.map(s => s.id), nativeCalls: r.native.calls, jobs: r.native.jobs ?? 1 });
  return { ...base, generatedAt: new Date().toISOString(), scenarios, targets, results,
    native: { ...base.native, calls: base.native.calls + extra.native.calls },
    evidenceBatches: [...(base.evidenceBatches ?? [batch(base)]), ...(extra.evidenceBatches ?? [batch(extra)])],
    summary: { targets: targets.length, scenarios: scenarios.length, passed: results.filter(r => r.status === 'pass').length,
      failed: results.filter(r => r.status === 'fail').length, notApplicable: results.filter(r => r.status === 'not-applicable').length } };
}
