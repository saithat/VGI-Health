#!/usr/bin/env node
/** Refresh derived audit artifacts after the two independent full suites. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { canonicals, root } from './index.mjs';
import { digest, Native } from './native.mjs';
import { fixtures, scenarioCatalog } from './scenarios.mjs';
import { info } from './driver.mjs';

const runId = process.argv[2] ?? 'neutral-recorded-day1';
assert.match(runId, /^[\w-]+$/);
const read = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
const write = (file, value) => writeFileSync(join(root, file), JSON.stringify(value, null, 2) + '\n');
const canonical = read('conformance/results/canonical.json');
const combined = read(`runs/${runId}/conformance.json`);
const binary = join(root, 'lean/.lake/build/bin/ehr');
const binarySha256 = digest(readFileSync(binary));
assert.equal(canonical.native.sha256, binarySha256);
assert.equal(combined.native.sha256, binarySha256);

function subset(report, select) {
  const scenarios = report.scenarios.filter(s => select(s.id));
  const results = report.results.filter(r => select(r.scenario));
  return { ...report, derivedFrom: `runs/${runId}/conformance.json`, scenarios, results,
    targets: report.targets.map(t => ({ ...t,
      passed: results.filter(r => r.target === t.id && r.status === 'pass').length,
      failed: results.filter(r => r.target === t.id && r.status === 'fail').length,
      notApplicable: results.filter(r => r.target === t.id && r.status === 'not-applicable').length })),
    summary: { targets: report.targets.length, scenarios: scenarios.length,
      passed: results.filter(r => r.status === 'pass').length,
      failed: results.filter(r => r.status === 'fail').length,
      notApplicable: results.filter(r => r.status === 'not-applicable').length } };
}
const gap = id => /^(?:entry\.signOrders\.dosingWeight|cures\.|workflow\.empty-medication-signing|patient-switch\.chart-scoping|weight\.linked-source-refresh|refill\.denial-via-approval-action)/.test(id);
write('conformance/results/gap-families.json', subset(combined, gap));
write('conformance/results/refill-denial-recorded.json', subset(combined, id => id === 'refill.denial-via-approval-action'));
const retired = join(root, 'conformance/results/refill-denial-' + 'run1-P3.json');
rmSync(retired, { force: true });

const targets = canonicals();
const scratch = mkdtempSync(join(tmpdir(), 'neutral-conformance-evidence-'));
try {
  const rows = targets.map(t => {
    const args = ['check', '--spec', t.specPath, '--program', t.programPath, '--canonical', t.programPath];
    const previous = { v2: 'v1', v3: 'v2' }[t.release];
    if (previous) args.push('--prev', join(root, 'releases', previous, 'personas', `${t.persona}.json`));
    const result = spawnSync(binary, args, { encoding: 'utf8', env: process.env, timeout: 120000 });
    assert.ifError(result.error);
    const verdict = JSON.parse(result.stdout);
    assert.equal(result.status, 0); assert.equal(verdict, 'ok');
    return { target: t.id, programSha256: digest(readFileSync(t.programPath)), specSha256: digest(t.spec), status: result.status, verdict };
  });
  write('conformance/results/certifications.json', { generatedAt: new Date().toISOString(), binarySha256,
    purpose: 'Separate checker audit; never consulted for behavioral expectations or pass/fail', rows });
  const target = targets.find(t => t.release === 'v3' && t.persona === 'P1');
  const program = structuredClone(target.program);
  for (const screen of program.screens) screen.components = screen.components.filter(c => !info('curesReport')(c));
  const programPath = join(scratch, 'cures-probe.json');
  writeFileSync(programPath, JSON.stringify(program));
  const result = spawnSync(binary, ['check', '--spec', target.specPath, '--program', programPath, '--canonical', target.programPath], { encoding: 'utf8', env: process.env, timeout: 120000 });
  assert.ifError(result.error);
  write('conformance/results/cures-probe-check.json', { program: 'P1 v3 copy with only curesReport panels removed',
    command: 'ehr check --spec releases/v3/spec.json --program <copy> --canonical releases/v3/personas/P1.json',
    binarySha256, programSha256: digest(program), specSha256: digest(target.spec), exitCode: result.status,
    verdict: JSON.parse(result.stdout), purpose: 'Separate audit, not consulted by behavioral suite' });
  const native = new Native(binary);
  const scenario = scenarioCatalog.find(s => s.id === 'weight.linked-source-refresh');
  const { d, observed } = scenario.run(fixtures(native, target));
  write('conformance/results/linked-weight-reproduction.json', { case: scenario.expected, observed,
    binarySha256, programPath: 'releases/v3/personas/P1.json', specPath: 'releases/v3/spec.json',
    programSha256: digest(readFileSync(target.programPath)), specSha256: digest(target.spec),
    facts: d.facts, trace: d.trace, finalState: d.state });
} finally { rmSync(scratch, { recursive: true, force: true }); }
console.log(`Refreshed current conformance evidence for ${runId}`);
