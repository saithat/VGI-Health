import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Native } from './native.mjs';
import { canonicals, runSuite } from './index.mjs';
import { facts } from './clinical.mjs';
import { selectionFacts, emptyDisplay } from './workspace.mjs';
const binary = process.env.EHR_BIN ?? resolve(import.meta.dirname, '../lean/.lake/build/bin/ehr');

test('one-shot and stateless server transports return identical native wire values and scenario evidence', { skip: !existsSync(binary), timeout: 120_000 }, async () => {
  const target = canonicals()[0];
  const cli = new Native(binary, { transport: 'cli' });
  const serve = new Native(binary, { transport: 'serve' });
  const base = { spec: target.spec, program: target.program,
    user: { id: target.program.owner, role: target.program.role }, facts: selectionFacts(facts()) };
  const same = (op, input) => {
    const expected = cli.call(op, input);
    assert.deepEqual(serve.call(op, input), expected, op);
    return expected;
  };
  try {
    let state = same('init', base);
    same('view', { ...base, state });
    same('render-ui', { ...base, state, display: emptyDisplay });
    state = same('step', { ...base, state, event: { scroll: { screen: state.screen } } }).state;
    same('view', { ...base, state });
    same('facts', { bundle: { resourceType: 'Bundle', type: 'collection', entry: [{ resource: { resourceType: 'Patient', id: 'transport-test', gender: 'female', birthDate: '1980-01-01' } }] }, context: { today: '2026-11-02', now: 600, receipts: [], record: [] } });
    for (const native of [cli, serve]) {
      assert.throws(() => native.call('unsupported', {}), /unsupported/);
      assert.throws(() => native.call('step', {}));
    }
    same('init', { ...base, facts: { ...base.facts, now: 601 } });
    assert.deepEqual(serve.call('init', base), cli.call('init', base));
    assert.equal(serve.calls, cli.calls);
  } finally { await Promise.all([cli.close(), serve.close()]); }
  const prior = process.env.EHR_CONFORMANCE_TRANSPORT;
  try {
    const reports = [];
    for (const transport of ['cli', 'serve']) {
      process.env.EHR_CONFORMANCE_TRANSPORT = transport;
      reports.push(await runSuite({ targets: [target], binary, selected: 'positive.signNote' }));
    }
    assert.deepEqual(reports[0].results, reports[1].results);
    assert.deepEqual(reports[0].summary, reports[1].summary);
    assert.equal(reports[1].summary.failed, 0);
    assert.equal(reports[1].summary.passed, 1);
  } finally {
    if (prior === undefined) delete process.env.EHR_CONFORMANCE_TRANSPORT;
    else process.env.EHR_CONFORMANCE_TRANSPORT = prior;
  }
});
