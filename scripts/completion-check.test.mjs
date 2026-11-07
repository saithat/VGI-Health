import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const binary = process.env.EHR_BIN ?? join(root, 'lean/.lake/build/bin/ehr');
const facts = {
  patientId: 'pt-completion-test', identity: { initials: 'AB', sex: 'F', ageYears: 40 },
  allergyVersion: 1, allergyClasses: [], medsVersion: 1, currentMedClasses: [],
  weightToday: [700, 'kg'], careGaps: [], abnormalResult: false, now: 600,
  receipts: [], record: [],
};
const scenario = {
  id: 'normal-result', facts, user: { id: 'test-clinician', role: 'physician' },
  goals: { commits: ['ackResult'], values: [
    { element: 'resultAction', value: { code: { c: 'repeat' } }, commit: 'ackResult' },
  ], expectedAcks: [] },
  space: 'navigationDirected', bound: 200,
};

function check(cases, program = 'releases/v1/personas/P1.json') {
  assert.ok(process.env.TMPDIR, 'set TMPDIR to disk-backed scratch');
  const scratch = mkdtempSync(join(process.env.TMPDIR, 'completion-cli-'));
  try {
    const path = join(scratch, 'scenarios.json');
    writeFileSync(path, JSON.stringify(cases));
    const run = spawnSync(binary, ['check-completion', '--spec', 'releases/v1/spec.json',
      '--program', program, '--canonical', 'releases/v1/canonical.json', '--scenarios', path],
    { cwd: root, encoding: 'utf8', timeout: 20_000 });
    assert.ifError(run.error);
    return { ...run, report: run.stdout.trim() ? JSON.parse(run.stdout) : null };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

test('native scenario acceptance states its limited scope and checks interaction edges', () => {
  const run = check([scenario]);
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.equal(run.report.accepted, true);
  assert.equal(run.report.property6Closed, false);
  assert.equal(run.report.staticVerdict, 'ok');
  assert.equal(run.report.scenarios[0].status, 'accepted');
  assert.equal(run.report.scenarios[0].interruptiveBeforeCommit, true);
  assert.equal(run.report.scenarios[0].navigationKeepsEntries, true);
});

test('budget exhaustion refuses acceptance and remains unknown', () => {
  const run = check([{ ...scenario, bound: 0 }]);
  assert.equal(run.status, 1, run.stderr);
  assert.equal(run.report.accepted, false);
  assert.equal(run.report.scenarios[0].status, 'unknown');
  assert.equal(run.report.scenarios[0].counterexample, undefined);
});

test('omitted optional settings use defaults while malformed settings fail', () => {
  const { space, ...defaultSpace } = scenario;
  const run = check([{ ...defaultSpace, bound: 0 }]);
  assert.equal(run.status, 1, run.stderr);
  assert.equal(run.report.scenarios[0].space, 'full');
  const { bound, ...defaultBound } = scenario;
  const accepted = check([defaultBound]);
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.equal(accepted.report.scenarios[0].bound, 20_000);
  assert.equal(check([{ ...scenario, bound: 'bad' }]).status, 2);
  assert.equal(check([{ ...scenario, goals: { ...scenario.goals, waivers: 'bad' } }]).status, 2);
});

test('closed losing scenario reports the real replayed trap', () => {
  const run = check([{ ...scenario, events: [] }]);
  assert.equal(run.status, 1, run.stderr);
  const result = run.report.scenarios[0];
  assert.equal(result.status, 'rejected');
  assert.equal(result.space, 'explicitAlphabet');
  assert.deepEqual(result.counterexample, []);
  assert.equal(result.trap.screen, 'home');
  assert.deepEqual(result.trap.commits, []);
});

test('scenario evidence cannot override an existing static refusal', () => {
  const run = check([scenario], 'lean/Ehr/Check/bad/37-stale-dosing-weight.json');
  assert.equal(run.status, 1, run.stderr);
  assert.equal(run.report.staticVerdict.violation.property, 'capturesAllOnce');
  assert.deepEqual(run.report.scenarios, []);
});

test('missing coverage, ambiguous IDs, mismatched roles and unknown spaces are input errors', () => {
  for (const cases of [[], [scenario, scenario],
    [{ ...scenario, user: { id: 'wrong-role', role: 'rn' } }],
    [{ ...scenario, space: 'invented' }],
    [{ ...scenario, goals: { commits: [], values: [], expectedAcks: [] } }]]) {
    const run = check(cases);
    assert.equal(run.status, 2, run.stderr || run.stdout);
    assert.equal(run.report, null);
  }
});

test('information-needs requirements are decoded and refused outside the scenario graph', () => {
  const need = { id: 'glucose', question: { latest: { measure: 'glucose', unit: 'mg/dL', windowMinutes: 120 } },
    gate: { commit: { id: 'ackResult' } }, reads: ['labResults'],
    source: { authority: 'simulationAssumption', citation: 'test', assumption: 'test' }, samples: [], inventory: [] };
  const run = check([{ ...scenario, goals: { ...scenario.goals, informationNeeds: [need] } }]);
  assert.equal(run.status, 2);
  assert.match(run.stderr, /information-needs lookup stages are outside this scenario graph/);
});
