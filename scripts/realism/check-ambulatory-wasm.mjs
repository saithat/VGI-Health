// Current canonical paths, supplied patient records and semantic metadata on both runtimes.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { loadEhrInterp } from '../../app/public/ehr/interp-loader.mjs';
const root = resolve(import.meta.dirname, '../..');
const review = process.argv[2] ?? '/tmp/amb-review';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const native = (command, input) => JSON.parse(execFileSync(`${root}/lean/.lake/build/bin/ehr`, [command], {
  input: JSON.stringify(input), maxBuffer: 32e6, env: { ...process.env, LEAN_NUM_THREADS: '4' },
}));
const wasm = await loadEhrInterp();
const call = (command, input) => JSON.parse(command === 'render_ui'
  ? wasm.call('ehr_render_ui', JSON.stringify(input)) : wasm[command](JSON.stringify(input)));
const descend = node => {
  for (const key of ['presentation', 'rowAction', 'valueSet', 'chartReferences', 'section', 'columns'])
    if (node[key]) return [node, ...node[key].children.flatMap(descend)];
  return node.tabs ? [node, ...node.tabs.body.flatMap(descend)] : [node];
};
let screens = 0, references = 0, pickers = 0, reviewClicks = 0, invalidReviewCases = 0, medicationCaptions = 0, prefillCaptions = 0, prefillConfirmations = 0, prefillHumanEdits = 0;
const reviewCases = read(`${review}/review-cases.json`);
for (const { persona, workflow } of reviewCases.cases) {
  const spec = read(`${root}/releases/v1/spec.json`);
  const program = read(`${root}/releases/v1/personas/${persona}.json`);
  const user = { id: persona, role: program.role };
  const factsInput = { bundle: read(`${review}/${persona}-${workflow}-bundle.json`), context: { today: reviewCases.today, now: 540, receipts: [], record: [] } };
  const projection = native('facts', factsInput);
  assert.deepEqual(call('facts', factsInput), projection);
  const base = { spec, program, facts: projection.facts, user };
  const initial = native('init', base);
  assert.deepEqual(call('init', base), initial);
  const queue = [[program.start, []]], visited = new Map(queue);
  for (let i = 0; i < queue.length; i++) {
    const [screen, path] = queue[i];
    for (const component of program.screens.find(s => s.id === screen).components) {
      const target = component.kind?.button?.action?.goto?.screen;
      if (target && !visited.has(target)) {
        const next = [...path, component.id]; visited.set(target, next); queue.push([target, next]);
      }
    }
  }
  for (const screen of program.screens.filter(s => s.workflow === workflow || s.id === 'home')) {
    let state = initial;
    for (const comp of visited.get(screen.id) ?? []) {
      const input = { ...base, state, event: { click: { comp } } };
      const next = native('step', input);
      assert.deepEqual(call('step', input), next);
      assert.equal(next.result, 'ok'); state = next.state;
    }
    assert.equal(state.screen, screen.id);
    const input = { ...base, display: projection.display, state };
    const ui = native('render-ui', input);
    assert.deepEqual(call('render_ui', input), ui);
    const nodes = [...ui.workspace, ...ui.side].flatMap(descend);
    const sources = new Map(ui.fieldSources ?? []);
    for (const { field } of nodes.filter(node => node.field?.provenance)) {
      const caption = sources.get(field.comp);
      assert.ok(caption?.startsWith('Source: '), 'A sourced field needs its Lean public caption');
      assert.ok(!/record:|linked:/.test(caption), 'Internal provenance keys are not clinical copy');
      prefillCaptions++;
    }
    pickers += nodes.filter(node => node.valueSet).length;
    for (const node of nodes) references += node.chartReferences?.references.length ?? 0;
    const weightControl = screen.components.find(component => component.kind?.field?.element === 'weight');
    if (weightControl && sources.has(weightControl.id)) {
      const confirmInput = { ...base, state, event: { confirm: { comp: weightControl.id } } };
      const confirmed = native('step', confirmInput);
      assert.deepEqual(call('step', confirmInput), confirmed);
      assert.equal(confirmed.result, 'ok');
      const confirmedInput = { ...input, state: confirmed.state };
      const confirmedUi = native('render-ui', confirmedInput);
      assert.deepEqual(call('render_ui', confirmedInput), confirmedUi);
      assert.equal(new Map(confirmedUi.fieldSources).get(weightControl.id), sources.get(weightControl.id));
      assert.equal(confirmedUi.workspace.flatMap(descend).find(node => node.field?.comp === weightControl.id)?.field.pendingConfirm, false);
      prefillConfirmations++;
      const humanInput = { ...base, state: confirmed.state, event: { enter: { comp: weightControl.id, value: { qty: { tenths: 720, unit: 'kg' } } } } };
      const entered = native('step', humanInput);
      assert.deepEqual(call('step', humanInput), entered);
      assert.equal(entered.result, 'ok');
      const editedInput = { ...input, state: entered.state };
      const editedUi = native('render-ui', editedInput);
      assert.deepEqual(call('render_ui', editedInput), editedUi);
      assert.equal(new Map(editedUi.fieldSources).has(weightControl.id), false, 'Human entry removes the previous source caption');
      const editedField = editedUi.workspace.flatMap(descend).find(node => node.field?.comp === weightControl.id)?.field;
      assert.equal(editedField?.provenance, null);
      assert.equal(editedField?.pendingConfirm, false);
      prefillHumanEdits++;
    }
    if (workflow === 'W7' && screen.id === 'w7Decision') {
      const comparison = nodes.find(node => node.info?.infoId === 'refillComparison')?.info;
      assert.equal(comparison?.rows.length, 4);
      assert.ok(comparison.rows.every(row => row.some(([key, value]) => key === 'Entered response' && value === 'Not entered')));
      const event = { enter: { comp: 'w7Decision.refillDose', value: { qty: { tenths: 200, unit: 'mg' } } } };
      const entered = native('step', { ...base, state, event });
      assert.deepEqual(call('step', { ...base, state, event }), entered);
      assert.equal(entered.result, 'ok');
      const previewInput = { ...input, state: entered.state };
      const preview = native('render-ui', previewInput);
      assert.deepEqual(call('render_ui', previewInput), preview);
      const dose = preview.workspace.flatMap(descend).find(node => node.info?.infoId === 'refillComparison')?.info.rows.find(row => row.some(([key, value]) => key === 'Detail' && value === 'Dose'));
      assert.ok(dose.some(([key, value]) => key === 'Requested' && value === '10 mg'));
      assert.ok(dose.some(([key, value]) => key === 'Entered response' && value === '20.0 mg'));
      assert.equal(entered.state.commits.length, state.commits.length, 'A preview cannot sign a refill');
    }
    if (screen.id !== 'home') {
      assert.equal(ui.workspace.at(-2)?.button?.comp, `${screen.id}.back`, 'Source Back belongs after Chart Review');
      assert.equal(ui.workspace.at(-1)?.button?.comp, `${screen.id}.home`, 'Source patient-workspace return is last');
    }
    for (const component of screen.components.filter(component => component.kind?.field?.element === 'medRecDecision' && component.tag.split('.').includes('currentMedication'))) {
      const slot = component.kind.field.slot.fixed?.n;
      const medication = projection.display.meds[slot]?.name;
      const field = nodes.find(node => node.field?.comp === component.id)?.field;
      assert.equal(field?.label, component.label + (medication ? ` — ${medication}` : ''));
      const entryInput = { ...base, state, event: { enter: { comp: component.id, value: { code: { c: 'continue' } } } } };
      const entered = native('step', entryInput);
      assert.deepEqual(call('step', entryInput), entered);
      assert.equal(entered.result, 'ok');
      assert.ok(entered.state.captured.some(value => value.element === 'medRecDecision' && value.slot === slot && value.value.code?.c === 'continue' && value.byHuman));
      medicationCaptions++;
    }
    const reviewControls = screen.components.filter(component => component.kind?.button?.action?.markReviewed && component.tag.split('.').includes('feedback'));
    if (reviewControls.length) {
      let reviewed = state;
      for (const control of reviewControls) {
        if (control.parent && screen.components.find(component => component.id === control.parent)?.kind === 'tabs') {
          const tabInput = { ...base, state: reviewed, event: { selectTab: { comp: control.parent, idx: control.tab } } };
          const tabbed = native('step', tabInput);
          assert.deepEqual(call('step', tabInput), tabbed);
          assert.equal(tabbed.result, 'ok'); reviewed = tabbed.state;
        }
        const reviewInput = { ...base, state: reviewed, event: { click: { comp: control.id } } };
        const result = native('step', reviewInput);
        assert.deepEqual(call('step', reviewInput), result);
        assert.equal(result.result, 'ok');
        assert.equal(result.state.commits.length, reviewed.commits.length);
        assert.deepEqual(result.state.captured, reviewed.captured);
        reviewed = result.state;
        const reviewedScreenInput = { ...input, state: reviewed };
        const screenAfterReview = native('render-ui', reviewedScreenInput);
        assert.deepEqual(call('render_ui', reviewedScreenInput), screenAfterReview);
        assert.ok(screenAfterReview.workspace.flatMap(descend).some(node => node.info?.display === 'status'));
        for (const receiptCase of ['missing', 'future', 'wrongVersion', 'wrongRole', 'expired']) {
          const invalid = structuredClone(reviewedScreenInput);
          const reviewInfo = control.kind.button.action.markReviewed.info;
          const rejectedRole = ['physician', 'np', 'rn', 'surgeon'].find(role =>
            !spec.reviews.some(review => review.info === reviewInfo && review.mode?.shownOrReceipt?.roles.includes(role)));
          // Every modeled role can review allergies under some requirement.
          // Only test a disallowed role when this source spec has one.
          if (receiptCase === 'wrongRole' && !rejectedRole) continue;
          invalid.state.receipts = invalid.state.receipts.filter(receipt => receipt.info === reviewInfo).map(receipt => ({ ...receipt,
            ...(receiptCase === 'future' ? { time: 100000000 } : {}),
            ...(receiptCase === 'wrongVersion' ? { dataVersion: receipt.dataVersion + 1 } : {}),
            ...(receiptCase === 'wrongRole' ? { role: rejectedRole } : {}),
          }));
          if (receiptCase === 'missing') invalid.state.receipts = [];
          if (receiptCase === 'expired') invalid.state.clock += 10081 * 600;
          const invalidUi = native('render-ui', invalid);
          assert.deepEqual(call('render_ui', invalid), invalidUi);
          assert.ok(!invalidUi.workspace.flatMap(descend).some(node => node.info?.display === 'status'), receiptCase);
          invalidReviewCases++;
        }
        reviewClicks++;
      }
      const reviewedInput = { ...input, state: reviewed };
      const reviewedUi = native('render-ui', reviewedInput);
      assert.deepEqual(call('render_ui', reviewedInput), reviewedUi);
      const status = reviewedUi.workspace.flatMap(descend).filter(node => node.info?.display === 'status');
      assert.ok(status.length, `${persona}/${screen.id}: successful review must show a receipt status`);
      assert.ok(status.every(node => node.info.infoId === 'reviewReceiptStatus' && node.info.comp === ''));
      mkdirSync(`${review}/feedback/${persona}`, { recursive: true });
      writeFileSync(`${review}/feedback/${persona}/${screen.id}Reviewed.json`, JSON.stringify(reviewedUi));
    }
    screens++;
  }
  if (workflow === 'W5') {
    assert.equal(projection.display.growthReferenceSex, 'M');
    const unavailable = structuredClone(factsInput);
    const patient = unavailable.bundle.entry.find(entry => entry.resource?.resourceType === 'Patient').resource;
    patient.extension = patient.extension.filter(extension => !extension.url.endsWith('/us-core-birthsex'));
    const unknown = native('facts', unavailable);
    assert.deepEqual(call('facts', unavailable), unknown);
    assert.equal(unknown.display.growthReferenceSex, undefined);
  }
}
assert.ok(references > 0, 'Published reference catalog was exercised');
assert.ok(pickers > 0, 'Coded-field metadata was exercised');
assert.ok(prefillConfirmations > 0 && prefillHumanEdits > 0, 'Prefill caption lifecycle was exercised through real human events');
const bloodPressureBundle = read(`${root}/lean/Ehr/Render/TestData/clinical.json`);
const bloodPressure = bloodPressureBundle.entry.find(entry => entry.resource?.resourceType === 'Observation' && entry.resource.code?.coding?.some(code => code.code === '85354-9')).resource;
bloodPressure.component.reverse();
const bloodPressureInput = { bundle: bloodPressureBundle, context: { today: '2026-10-31', now: 0, receipts: [], record: [] } };
const bloodPressureOutput = native('facts', bloodPressureInput);
assert.deepEqual(call('facts', bloodPressureInput), bloodPressureOutput);
assert.equal(bloodPressureOutput.display.vitals.find(row => row.code === '85354-9').value, '128/82');
console.log(`Ambulatory native/WASM: ${screens} screens, ${pickers} pickers, ${references} reference curves, ${reviewClicks} actual review clicks, ${invalidReviewCases} invalid-receipt probes, ${medicationCaptions} source medication captions/entries, ${prefillCaptions} public prefill captions, ${prefillConfirmations} confirmations / ${prefillHumanEdits} human replacements; actual navigation, source facts and all semantic output agree.`);
