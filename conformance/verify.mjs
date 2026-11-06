#!/usr/bin/env node
/** Verify saved evidence without rerunning scenarios or consulting the checker. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { root, canonicals, runTargets } from './index.mjs';
import { scenarioCatalog } from './scenarios.mjs';
import { digest } from './native.mjs';

const runId = process.argv[2] ?? 'core-10day-live';
const read = file => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
const canonical = read('conformance/results/canonical.json');
const combined = read(`runs/${runId}/conformance.json`);
const sources = [...canonicals(), ...runTargets(runId)];
assert.equal(combined.runId, runId);
assert.equal(canonical.native.sha256, combined.native.sha256);
assert.equal(digest(readFileSync(combined.native.binary)), combined.native.sha256);
const scenarios = new Map(scenarioCatalog.map(s => [s.id, s]));
const bindings = [];
for (const report of [canonical, combined]) {
  assert.equal(report.scenarios.length, scenarios.size);
  assert.equal(report.summary.scenarios, scenarios.size);
  assert.equal(report.results.length, report.targets.length * scenarios.size);
  for (const status of ['pass', 'fail', 'not-applicable']) {
    const key = { pass: 'passed', fail: 'failed', 'not-applicable': 'notApplicable' }[status];
    assert.equal(report.summary[key], report.results.filter(r => r.status === status).length);
  }
  for (const t of report.targets) {
    const source = sources.find(s => s.id === t.id); assert.ok(source, t.id);
    assert.equal(t.programSha256, digest(readFileSync(source.programPath)), t.id);
    assert.equal(t.specSha256, digest(source.spec), t.id);
    assert.equal(t.selectionMode, source.program.patientSelection ? 'in-ui-selection' : 'legacy-preselected');
    const results = report.results.filter(r => r.target === t.id);
    assert.equal(results.length, scenarios.size);
    assert.equal(new Set(results.map(r => r.scenario)).size, scenarios.size);
    assert.equal(t.passed, results.filter(r => r.status === 'pass').length);
    assert.equal(t.failed, results.filter(r => r.status === 'fail').length);
    assert.equal(t.notApplicable, results.filter(r => r.status === 'not-applicable').length);
    for (const r of results) {
      const scenario = scenarios.get(r.scenario); assert.ok(scenario, r.scenario);
      if (r.status !== 'not-applicable') {
        if (scenario.scope !== 'runtime-probe') assert.equal(r.testedProgramSha256, digest(source.program), `${t.id}/${r.scenario}`);
        if (r.status === 'pass' && source.program.patientSelection && r.scenario !== 'selection.landing') {
          assert.ok(r.selectionSteps > 0, `${t.id}/${r.scenario}: no selection`);
          assert.ok(r.hydrationSteps > 0, `${t.id}/${r.scenario}: no source binding`);
        }
        if (!source.program.patientSelection) {
          assert.equal(r.selectionSteps, 0); assert.equal(r.hydrationSteps, 0);
        }
      }
    }
    if (report === combined) bindings.push({ target: t.id, programAndSpecMatch: true, selectionMode: t.selectionMode });
  }
}
for (const r of canonical.results) {
  const other = combined.results.find(x => x.target === r.target && x.scenario === r.scenario);
  for (const key of ['status', 'observed', 'steps', 'selectionSteps', 'hydrationSteps', 'testedProgramSha256'])
    assert.equal(r[key], other?.[key], `Independent canonical rerun disagrees: ${r.target}/${r.scenario}/${key}`);
}
const gapIds = ['entry.signOrders.dosingWeight', 'cures.procedure-eight-day', 'cures.unknown-exemption',
  'workflow.empty-medication-signing', 'patient-switch.chart-scoping', 'weight.linked-source-refresh', 'refill.denial-via-approval-action'];
const gapResults = combined.results.filter(r => gapIds.includes(r.scenario));
const result = { generatedAt: new Date().toISOString(), summary: combined.summary, canonical: canonical.summary,
  nativeSha256: combined.native.sha256, inputBindings: bindings,
  caseCoverage: `${scenarios.size} unique scenarios per input; original program/spec bindings verified`,
  independentCanonicalRunsAgree: true,
  previousFiveGapFamilies: { scenarioIds: gapIds, passed: gapResults.filter(r => r.status === 'pass').length,
    failed: gapResults.filter(r => r.status === 'fail').length, notApplicable: gapResults.filter(r => r.status === 'not-applicable').length },
  positiveScenarioFailures: combined.results.filter(r => r.status === 'fail' && r.scenario.startsWith('positive.')).length,
  failureScenarios: Object.fromEntries([...new Set(combined.results.filter(r => r.status === 'fail').map(r => r.scenario))]
    .map(id => [id, combined.results.filter(r => r.scenario === id && r.status === 'fail').length])),
};
writeFileSync(path.join(root, 'conformance/results/verification.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
