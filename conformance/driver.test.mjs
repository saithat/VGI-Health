import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Native } from './native.mjs';
import { Driver } from './driver.mjs';
import { context, prepare } from './clinical.mjs';
import { fixtures, scenarioCatalog } from './scenarios.mjs';

const root = path.resolve(import.meta.dirname, '..');
const binary = process.env.EHR_BIN ?? path.join(root, '.cache/conformance/ehr');
const read = file => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
test('semantic driver survives complete id renaming, reordered components, closed groups and non-default tabs', { skip: !existsSync(binary) }, () => {
  const p = read('releases/v3/personas/P3.json'), sp = read('releases/v3/spec.json');
  const names = new Map(p.screens.flatMap(s => [[s.id, `screen-${s.id.length}-${s.id}`], ...s.components.map((c, i) => [c.id, `control-${s.id}-${i}`])]));
  p.start = names.get(p.start);
  for (const s of p.screens) {
    s.id = names.get(s.id);
    for (const c of s.components) {
      c.id = names.get(c.id);
      if (c.parent) c.parent = names.get(c.parent);
      if (c.kind?.button?.action?.goto) c.kind.button.action.goto.screen = names.get(c.kind.button.action.goto.screen);
      if (c.copyOf) c.copyOf = names.get(c.copyOf);
    }
    s.components.reverse();
  }
  const sc = p.screens.find(s => s.components.some(c => c.kind?.field?.element === 'wristbandScan'));
  const scan = sc.components.find(c => c.kind?.field?.element === 'wristbandScan');
  sc.components.push({ id: 'probe-tabs', kind: 'tabs', label: 'Tabs', tab: 0, visibility: 'always', size: 'normal', tag: 'probe' },
    { id: 'probe-group', kind: { group: { collapsible: true, startCollapsed: true } }, parent: 'probe-tabs', tab: 2, label: 'Safety', visibility: 'always', size: 'normal', tag: 'probe' });
  scan.parent = 'probe-group'; scan.tab = 0;
  const d = new Driver(new Native(binary), sp, p, context('administerMed').facts);
  prepare(d, context('administerMed')); d.finish('administerMed');
  assert.ok(d.state.commits.includes('administerMed'));
  const work = mkdtempSync(path.join(tmpdir(), 'conformance-batch-'));
  try {
    const file = path.join(work, 'case.jsonl');
    writeFileSync(file, JSON.stringify({ ...d.input, events: d.trace.map(t => t.event) }) + '\n');
    const replay = spawnSync(binary, ['run-batch', file], { encoding: 'utf8', maxBuffer: 32e6 });
    assert.equal(replay.status, 0, replay.stderr);
    const lines = replay.stdout.trim().split('\n').map(JSON.parse);
    assert.deepEqual(lines.at(-1).state, d.state, 'run-batch must reproduce init/step transcript');
  } finally { rmSync(work, { recursive: true, force: true }); }
});
test('removing a legitimate control is a conformance failure', { skip: !existsSync(binary) }, () => {
  const p = read('releases/v3/personas/P3.json'), sp = read('releases/v3/spec.json');
  for (const s of p.screens) s.components = s.components.filter(c => c.kind?.field?.element !== 'wristbandScan');
  const d = new Driver(new Native(binary), sp, p, context('administerMed').facts);
  assert.throws(() => prepare(d, context('administerMed')), /Workflow impossible.*wristbandScan/);
});

test('hand-written expectation catches a removed entry guard without consulting the checker', { skip: !existsSync(binary) }, () => {
  const p = read('releases/v3/personas/P3.json'), sp = read('releases/v3/spec.json');
  sp.entries = sp.entries.filter(r => !(r.commit === 'administerMed' && r.element === 'wristbandScan'));
  const target = { program: p, spec: sp, persona: 'P3', semanticRelease: 'v3' };
  const scenario = scenarioCatalog.find(s => s.id === 'entry.administerMed.wristbandScan');
  assert.throws(() => scenario.run(fixtures(new Native(binary), target)), /Expected refusal naming wristbandScan/);
});
