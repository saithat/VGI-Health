import assert from 'node:assert/strict';
import { windowScreen } from '../layout-reference/window.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { tsImport } from '../../agent/node_modules/tsx/dist/esm/api/index.mjs';
const { screenOccurrences } = await tsImport('../../app/src/lean-ui/sources.ts', import.meta.url);
const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
function native(binary, args, input) {
  const p = spawnSync(resolve('lean/.lake/build/bin', binary), args, { input: JSON.stringify(input) + '\n', encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  assert.equal(p.status, 0, p.stderr);
  const out = JSON.parse(p.stdout);
  assert.equal(out.error, undefined, out.error);
  return out;
}
const layout = (input) => native('ui-layout', [], input);
const ehr = (op, input) => native('ehr', [op], input);
const field = (comp, label, kind, value, extra = {}) => ({
  field: { comp, label, kind, value, unit: null, provenance: null, pendingConfirm: false, humanOnly: false, required: false, ...extra },
});
const button = (comp, label, role, extra = {}) => ({ button: { comp, label, role, enabled: true, blockedReason: null, hotkey: null, ...extra } });
const screen = {
  banner: [['Patient', 'Ada Synthetic'], ['Language', 'English'], ['DOB', 'Jan 5, 1970'], ['Allergies', 'Penicillin'], ['MRN', '123']],
  viewer: 'Dr. Lee · Physician',
  nav: [['Chart', [['goOrders', 'Orders'], ['goNotes', 'Notes']]]],
  activeNav: 'goOrders',
  title: 'Orders',
  fieldChoices: [['route', { options: [['PO', 'By mouth'], ['IV', 'Intravenous']], showCode: true, allowOther: false }]],
  entryHints: [['weight', 'Enter the weight in kg.']],
  fieldSources: [['weight', 'Source: Chart weight recorded today']],
  workspace: [
    field('weight', 'Weight', 'qty', '70.5', { unit: 'kg', provenance: 'record:weightToday', pendingConfirm: true, humanOnly: true, required: true }),
    field('route', 'Route', 'code', 'PO'),
    { valueSet: { options: [{ code: '1', label: 'Emergent' }, { code: '2', label: 'Urgent' }], allowCustom: false, children: [field('esi', 'ESI', 'code', '2')] } },
    { tabs: { id: 'panel', labels: ['Vitals', 'Labs'], selected: 1, body: [{ text: { s: 'Lab body' } }] } },
    { stepper: { steps: [['s1', 'Triage'], ['s2', 'Orders']], current: 1 } },
    { info: { comp: 'meds', label: 'Medications', infoId: 'currentMeds', display: 'table', rows: [[['Medication', 'Aspirin'], ['Status', 'active']], [['Medication', 'Lisinopril'], ['Status', 'on hold']]] } },
    { info: { comp: '', label: 'Allergies', infoId: 'allergyList', display: 'list', rows: [] } },
    { alert: { comp: 'a', alertId: 'allergy', label: 'Penicillin allergy', severity: 'interruptive' } },
    button('sign', 'Sign', 'primary', { enabled: false, blockedReason: 'Allergies not reviewed', hotkey: 'Ctrl+S' }),
  ],
  side: [],
  modal: null,
};
const key = (path) => path.join('.');
test('the inventory lists every display part with its role, text and state; no JSON is displayed', () => {
  const { inventory } = layout({ op: 'inventory', screen });
  const at = new Map(inventory.map((e) => [key(e.path), e.part]));
  assert.deepEqual(inventory.map((e) => [key(e.path), e.part.role, e.part.text]), [
    ['0', 'banner', 'Ada Synthetic  DOB: Jan 5, 1970  MRN: 123  Allergies: Penicillin  Language: English  Signed in: Dr. Lee · Physician'],
    ['1', 'title', 'Orders'],
    ['2', 'heading', 'Navigation'], ['2.0', 'heading', 'Chart'], ['2.0.0', 'button', 'Orders'], ['2.0.1', 'button', 'Notes'],
    ['3', 'label', 'Weight'], ['3.0', 'control', '70.5'], ['3.1', 'unit', 'kg'], ['3.2', 'required', 'Required'],
    ['3.3', 'hint', 'Enter the weight in kg.'], ['3.4', 'source', 'Source: Chart weight recorded today'],
    ['3.5', 'pending', 'Confirm'], ['3.6', 'human', 'Human entry'],
    ['4', 'label', 'Route'], ['4.0', 'control', 'By mouth'], ['4.1', 'code', 'PO'],
    ['5', 'wrapper', ''], ['5.0', 'label', 'ESI'], ['5.0.0', 'control', 'Urgent'],
    ['6', 'wrapper', ''], ['6.0', 'tab', 'Vitals'], ['6.1', 'tab', 'Labs'], ['6.2', 'text', 'Lab body'],
    ['7', 'wrapper', ''], ['7.0', 'step', '1. Triage'], ['7.1', 'step', '2. Orders'],
    ['8', 'heading', 'Medications'], ['8.0', 'cellLabel', 'Medication'], ['8.1', 'cellLabel', 'Status'],
    ['8.2', 'cellValue', 'Aspirin'], ['8.3', 'status', 'Active'], ['8.4', 'cellValue', 'Lisinopril'], ['8.5', 'status', 'on hold'],
    ['9', 'heading', 'Allergies'], ['9.0', 'empty', 'Allergies not on file'],
    ['10', 'alert', 'Penicillin allergy'],
    ['11', 'button', 'Sign'], ['11.0', 'reason', 'Allergies not reviewed'], ['11.1', 'hotkey', 'Ctrl+S'],
  ]);
  for (const { part } of inventory) assert.ok(!/[{}[\]]/.test(part.text), part.text);
  // State is data, not text: the control's kind, options and raw value; selection; tone; rows and columns.
  assert.deepEqual(at.get('3.0'), { role: 'control', text: '70.5', target: true, comp: 'weight', kind: 'number', entry: 'qty', unit: 'kg' });
  assert.deepEqual(at.get('4.0'), { role: 'control', text: 'By mouth', raw: 'PO', target: true, comp: 'route', kind: 'select', entry: 'code', placeholder: 'Select route', options: [['PO', 'By mouth'], ['IV', 'Intravenous']] });
  assert.deepEqual(at.get('3.4'), { role: 'source', text: 'Source: Chart weight recorded today', raw: 'record:weightToday' });
  assert.deepEqual(at.get('3.5'), { role: 'pending', text: 'Confirm', raw: 'Confirmation pending', target: true, comp: 'weight', kind: 'confirm' });
  assert.equal(at.get('2.0.0').selected, true);
  assert.equal(at.get('2.0.1').selected, undefined);
  assert.deepEqual([at.get('6.0').selected, at.get('6.1').selected], [undefined, true]);
  assert.deepEqual([at.get('7.0').selected, at.get('7.1').selected], [undefined, true]);
  assert.deepEqual([at.get('8.5').row, at.get('8.5').col, at.get('8.5').tone], [1, 1, 'yellow']);
  // Displayed wording is Lean's; the recorded datum stays in `raw`.
  assert.deepEqual([at.get('8.3').text, at.get('8.3').raw], ['Active', 'active']);
  assert.deepEqual([at.get('10').kind, at.get('10').tone], ['interruptive', 'red']);
  assert.deepEqual([at.get('11').commit, at.get('11').enabled, at.get('11').target], [true, false, true]);
  assert.deepEqual(at.get('0').runs.filter((r) => r.role !== 'separator').map((r) => r.role), ['name', 'identity', 'identity', 'badge', 'detail', 'clinician']);
});
test('every painted box carries its part; the measured text is the part text', () => {
  for (const viewport of [{ w: 92160, h: 57600 }, { w: 81920, h: 51200 }, { w: 122880, h: 69120 }]) {
    for (const request of [{ op: 'structural-paint', screen, viewport }, { op: 'family-paint', screen, references: [{ screen }], viewport, maxTargetsPerViewport: 57 }, { op: 'port', screen, viewport, maxTargetsPerViewport: 57 }]) {
      const paint = layout(request);
      assert.equal(paint.accepted, true, `${request.op} ${viewport.w}: ${JSON.stringify(paint.findings?.filter((f) => !f.warning))}`);
      assert.equal(paint.parts.length, paint.boxes.length);
      const { inventory } = layout({ op: 'inventory', screen });
      const sources = paint.boxes.filter((d) => d.box.info.source);
      assert.deepEqual(sources.map((d) => key(d.box.info.source)).sort(), inventory.map((e) => key(e.path)).sort());
      paint.boxes.forEach((d, i) => {
        const part = paint.parts[i];
        if (!d.box.info.source) return assert.equal(part, null);
        assert.equal(d.original, part.text);
        assert.equal(d.box.info.target, part.target === true, key(d.box.info.source));
        assert.equal(d.box.info.commit, part.commit === true);
        if (part.runs) {
          // Lean's cell counts cover exactly the painted glyph cells of the box.
          assert.equal(part.cells.reduce((s, n) => s + n, 0), d.lines.reduce((s, line) => s + Array.from(line).length, 0));
          assert.equal(part.runs.map((r) => r.text).join(''), part.text);
        }
      });
    }
  }
});
test('the fixed shell keeps the parts of a node together, in reading order, label before control', () => {
  const paint = layout({ op: 'structural-paint', screen, viewport: { w: 92160, h: 57600 } });
  const rows = paint.boxes.filter((d) => d.box.clips.length).map((d) => [key(d.box.info.source), d.box.rect.y]);
  const y = new Map(rows);
  for (const [a, b] of [['3', '3.0'], ['3.0', '3.1'], ['3.1', '3.2'], ['3.5', '3.6'], ['3.6', '4'], ['4', '4.0'], ['8', '8.0'], ['8.1', '8.2'], ['8.5', '9']])
    assert.equal(y.get(b) - y.get(a), 3584, `${a} then ${b}`);
  // The commit is the fixed row; its reason and hotkey stay in the body at the button's place.
  const commit = paint.boxes.find((d) => d.box.info.commit);
  assert.deepEqual([key(commit.box.info.source), commit.box.clips.length], ['11', 0]);
  assert.ok(y.has('11.0') && y.has('11.1'));
});
test('the TypeScript mirror lists the same occurrences as Lean on actual P1/P3 screens', () => {
  const spec = json('releases/v3/spec.json');
  const file = readdirSync('fixtures/synthea').filter((f) => f.endsWith('.json') && f !== 'index.json').sort()[0];
  assert.ok(file, 'restored local synthetic fixtures are required');
  const projection = ehr('facts', { bundle: json('fixtures/synthea/' + file), context: { today: '2026-11-15', now: 600, receipts: [], record: [] } });
  let occurrences = 0;
  const samples = [[screen, 'synthetic']];
  for (const [persona, screens] of [['P1', ['home', 'w1Rooming', 'w1MedRec', 'w1Hpi', 'w1Orders', 'w1Sign']], ['P3', ['home', 'w4Flowsheet']]]) {
    const program = json(`releases/v3/personas/${persona}.json`), user = { id: program.owner, role: program.role };
    const initial = ehr('init', { spec, program, facts: projection.facts, user });
    for (const screenId of screens) {
      const state = screenId === 'home' ? initial : { ...initial, screen: screenId, patientContext: { patient: projection.facts.sourcePatientId, bound: projection.facts.sourcePatientId, activity: 'chart', target: screenId, query: '' } };
      samples.push([ehr('render-ui', { spec, program, ...projection, user, state }), `${persona}/${screenId}`]);
    }
  }
  for (const [raw, name] of samples) {
    // The layout shows bounded lists one page at a time (Layout.Window); the
    // mirror reads the windowed screen, which Lean's window operation decides.
    const { inventory } = layout({ op: 'inventory', screen: raw });
    const ui = layout({ op: 'window', screen: raw }).screen;
    assert.deepEqual(JSON.parse(JSON.stringify(windowScreen(raw))).windows, ui.windows, `${name} window mirror`);
    const lean = inventory.map((e) => [key(e.path), e.part.role, e.part.target === true]);
    const mirror = screenOccurrences(ui).map((o) => [key(o.path), o.role, o.target]);
    assert.deepEqual(mirror, lean, name);
    // A component named by the mirror is the one Lean's part operates.
    const comps = new Map(inventory.map((e) => [key(e.path), e.part.comp ?? '']));
    for (const o of screenOccurrences(ui)) if (o.comp) assert.equal(comps.get(key(o.path)), o.comp, `${name} ${key(o.path)}`);
    occurrences += lean.length;
  }
  assert.ok(occurrences > 500, `sampled ${occurrences} occurrences`);
});
