import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Native } from './native.mjs';
import { Driver } from './driver.mjs';
import { context, prepare, code } from './clinical.mjs';
import { fixtures, scenarioCatalog } from './scenarios.mjs';

const root = path.resolve(import.meta.dirname, '..');
const binary = process.env.EHR_BIN ?? [path.join(root, 'lean/.lake/build/bin/ehr'), path.join(root, '.cache/conformance/ehr')].find(existsSync);
const read = file => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
for(const broken of [false,true])test(`declared-link conformance revisits a colocated source without manufacturing captures (${broken?'broken':'valid'} link)`, {skip:!binary||!existsSync(binary)},async()=>{
  const program=read('releases/v1/personas/P2.json'),spec=read('releases/v1/spec.json');
  const origin=program.screens.find(s=>s.components.some(c=>c.kind?.field?.element==='visitDiagnosis'));
  const destination=program.screens.find(s=>s.components.some(c=>c.kind?.field?.element==='claimDiagnosis'));
  const source=origin.components.find(c=>c.kind?.field?.element==='visitDiagnosis');
  const linked=destination.components.find(c=>c.kind?.field?.element==='claimDiagnosis');
  origin.components=origin.components.filter(c=>c!==source);
  destination.components.unshift({...source,parent:linked.parent,tab:linked.tab});
  if(broken)linked.kind.field.prefill.linked.element='chiefComplaint';
  const native=new Native(binary,{transport:'serve'});
  try{
    const scenario=scenarioCatalog.find(s=>s.id==='entry.signNote.claimDiagnosis');
    const fixture=fixtures(native,{program,spec,persona:'P2',semanticRelease:'v1'});
    if(broken)assert.throws(()=>scenario.run(fixture),/claimDiagnosis not confirmed/);
    else {
      const {d}=scenario.run(fixture);
      assert.equal(d.capture('claimDiagnosis').provenance,'linked:visitDiagnosis');
      assert.equal(d.capture('claimDiagnosis').byHuman,false);
      assert.ok(d.trace.some(t=>t.intent==='leave screen before linked prefill'));
      assert.ok(!d.trace.some(t=>t.event.enter?.comp===linked.id));
    }
  }finally{await native.close();}
});
for (const condition of ['interaction', 'minorInteraction']) {
  test(`optional nursing alert fixture triggers the ${condition} source contract`, { skip: !binary || !existsSync(binary) }, () => {
    const program = read('releases/v1/personas/P3.json'), spec = read('releases/v1/spec.json');
    // V1.minorInteractionPopupAlert uses .interaction; the additive
    // CriticalResults.followThrough successor replaces only this condition.
    spec.alerts.find(a => a.id === 'minorInteractionPopup').cond = condition;
    const target = {program, spec, persona:'P3', semanticRelease:'v1'};
    const scenario = scenarioCatalog.find(s => s.id === 'alert.removable.minorInteractionPopup');
    assert.equal(scenario.applies(target), true);
    const {d, observed} = scenario.run(fixtures(new Native(binary), target));
    assert.ok(d.state.commits.includes('administerMed'));
    assert.match(observed, /fired when configured/);
  });
}
test('semantic driver survives complete id renaming, reordered components, closed groups and non-default tabs', { skip: !binary || !existsSync(binary) }, () => {
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
  assert.equal(d.state.patientContext.bound, d.facts.sourcePatientId);
  // run-batch deliberately exposes the clinical projection. Replay a separate
  // clinical-only init/step transcript; the renamed workspace path above uses
  // public init/step/render-ui and remains covered independently.
  const clinical = new Driver(new Native(binary), sp, { ...p, patientSelection: false }, context('administerMed').facts);
  prepare(clinical, context('administerMed')); clinical.finish('administerMed');
  const work = mkdtempSync(path.join(tmpdir(), 'conformance-batch-'));
  try {
    const file = path.join(work, 'case.jsonl');
    writeFileSync(file, JSON.stringify({ ...clinical.input, events: clinical.trace.map(t => t.event) }) + '\n');
    const replay = spawnSync(binary, ['run-batch', file], { encoding: 'utf8', maxBuffer: 32e6 });
    assert.equal(replay.status, 0, replay.stderr);
    const lines = replay.stdout.trim().split('\n').map(JSON.parse);
    assert.deepEqual(lines.at(-1).state, clinical.state, 'run-batch must reproduce clinical init/step transcript');
  } finally { rmSync(work, { recursive: true, force: true }); }
});
test('removing a legitimate control is a conformance failure', { skip: !binary || !existsSync(binary) }, () => {
  const p = read('releases/v3/personas/P3.json'), sp = read('releases/v3/spec.json');
  for (const s of p.screens) s.components = s.components.filter(c => c.kind?.field?.element !== 'wristbandScan');
  const d = new Driver(new Native(binary), sp, p, context('administerMed').facts);
  assert.throws(() => prepare(d, context('administerMed')), /Workflow impossible.*wristbandScan/);
});

test('hand-written expectation catches a removed entry guard without consulting the checker', { skip: !binary || !existsSync(binary) }, () => {
  const p = read('releases/v3/personas/P3.json'), sp = read('releases/v3/spec.json');
  sp.entries = sp.entries.filter(r => !(r.commit === 'administerMed' && r.element === 'wristbandScan'));
  const target = { program: p, spec: sp, persona: 'P3', semanticRelease: 'v3' };
  const scenario = scenarioCatalog.find(s => s.id === 'entry.administerMed.wristbandScan');
  assert.throws(() => scenario.run(fixtures(new Native(binary), target)), /Expected refusal naming wristbandScan/);
});

test('semantic entry targets the active order line rather than a nearby fixed order-set row', { skip: !binary || !existsSync(binary) }, () => {
  const p = read('releases/v3/personas/P2.json'), sp = read('releases/v3/spec.json');
  const d = new Driver(new Native(binary), sp, p, context('signOrders').facts);
  d.enter('drug', code('metformin'));
  assert.equal(d.capture('drug').slot, d.state.currentSlot);
});

test('a hidden shortcut cannot mask an available alternate navigation path', { skip: !binary || !existsSync(binary) }, () => {
  const p = read('releases/v3/personas/P3.json'), sp = read('releases/v3/spec.json');
  const target = p.screens.find(s => s.components.some(c => c.kind?.field?.element === 'wristbandScan'));
  p.screens.find(s => s.id === p.start).components.unshift({ id: 'probe-hidden-shortcut',
    kind: { button: { action: { goto: { screen: target.id } } } }, label: 'Hidden shortcut', tab: 0,
    visibility: { encounter: { kind: 'not-this-encounter' } }, size: 'normal', tag: 'probe' });
  const d = new Driver(new Native(binary), sp, p, context('administerMed').facts);
  prepare(d, context('administerMed')); d.finish('administerMed');
  assert.ok(d.state.commits.includes('administerMed'));
});

test('semantic navigation supports a start screen whose navigation uses goto macros', { skip: !binary || !existsSync(binary) }, () => {
  const p = read('releases/v3/personas/P3.json'), sp = read('releases/v3/spec.json');
  for (const c of p.screens.find(s => s.id === p.start).components) {
    const destination = c.kind?.button?.action?.goto?.screen;
    if (!destination) continue;
    const id = `probe-macro-${c.id}`;
    p.macros.push({ id, label: c.label, steps: [{ goto: { screen: destination } }] });
    c.kind = { macro: { id } };
  }
  const d = new Driver(new Native(binary), sp, p, context('administerMed').facts);
  prepare(d, context('administerMed')); d.finish('administerMed');
  assert.ok(d.state.commits.includes('administerMed'));
});

test('a hidden shortcut and a usable detour can reuse a screen-local ID', { skip: !binary || !existsSync(binary) }, async () => {
  const native = new Native(binary, { transport: 'serve' });
  const work = mkdtempSync(path.join(tmpdir(), 'conformance-detour-'));
  try {
    for (const persona of ['P1', 'P2', 'P3', 'P4', 'P5']) {
      const program = read(`releases/v2/personas/${persona}.json`);
      const chart = program.screens.find(s => s.id === 'chartSummary');
      const home = program.screens.find(s => s.id === program.start);
      const link = (id, target, label, size = 'normal') => ({
        id, kind: { button: { action: { goto: { screen: target } } } },
        label, size, visibility: 'always', tab: 0, tag: id,
      });
      chart.components = [...chart.components.filter(c => !c.kind?.button),
        link('toList', home.id, home.title, 'tiny'), link('toDirectory', 'directory', 'Directory')];
      program.screens.push({ id: 'directory', title: 'Directory', workflow: 'chart',
        components: [{ ...chart.components.find(c => c.kind === 'banner'), id: 'directory.banner' },
          link('toList', home.id, home.title)] });
      const input = path.join(work, persona + '.json');
      const baseline = path.join(root, 'releases/v2/personas', persona + '.json');
      writeFileSync(input, JSON.stringify(program));
      const verdict = spawnSync(binary, ['check', '--spec', path.join(root, 'releases/v2/spec.json'),
        '--program', input, '--canonical', baseline, '--prev', baseline], { encoding: 'utf8' });
      assert.equal(verdict.status, 0, verdict.stderr || verdict.stdout);
      const d = new Driver(native, read('releases/v2/spec.json'), program, context('signOrders').facts);
      d.find(c => chart.components.includes(c) && c.kind === 'banner', 'chart banner');
      const start = d.trace.length;
      d.find(c => home.components.includes(c) && c.kind === 'banner', 'home banner');
      assert.deepEqual(d.trace.slice(start).map(t => [t.event.click.comp, t.screen, t.result]),
        [['toDirectory', 'directory', 'ok'], ['toList', home.id, 'ok']], persona);
    }
  } finally {
    await native.close();
    rmSync(work, { recursive: true, force: true });
  }
});

test('service entry can bypass a rooming route that would prefill a drug', { skip: !binary || !existsSync(binary) }, async () => {
  const native = new Native(binary, { transport: 'serve' });
  try {
    const program = read('releases/v2/personas/P1.json'), spec = read('releases/v2/spec.json');
    const screen = id => program.screens.find(s => s.id === id);
    screen('w1Rooming').components.push({
      id: 'medicationDefault', kind: { field: { element: 'drug', slot: 'current', prefill: { default: { value: 'metformin' } } } },
      label: 'Medication', tag: 'medication', size: 'tiny', visibility: 'always', tab: 0,
    });
    const target = { program, spec, persona: 'P1', semanticRelease: 'v2' };
    const scenario = scenarioCatalog.find(s => s.id === 'v2.prior-auth.imaging');
    assert.throws(() => scenario.run(fixtures(native, target)), /no reachable shown control for orderKind/);
    screen('w2Inbox').components.push({
      id: 'service', kind: { button: { action: { goto: { screen: 'w1Labs' } } } },
      label: screen('w1Labs').title, tag: 'service', size: 'normal', visibility: 'always', tab: 0,
    });
    const { d } = scenario.run(fixtures(native, target));
    assert.ok(d.trace.some(t => t.screen === 'w2Inbox'));
    assert.equal(d.capture('drug'), undefined);
    assert.equal(d.capture('priorAuthRequest').byHuman, true);
  } finally { await native.close(); }
});
