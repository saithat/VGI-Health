// Current visit documentation is entered through the public native/WASM event seam.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { loadEhrInterp } from '../../app/public/ehr/interp-loader.mjs';
const root = resolve(import.meta.dirname, '../..');
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const review = resolve(option('--review', '/tmp/amb-review'));
const out = resolve(option('--out', `${review}/documentation`));
const binary = resolve(option('--binary', `${root}/lean/.lake/build/bin/ehr`));
const releases = resolve(option('--releases', `${root}/releases`));
const before = args.includes('--before');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const wasm = before ? undefined : await loadEhrInterp();
const call = (command, input) => {
  const result = JSON.parse(execFileSync(binary, [command === 'render_ui' ? 'render-ui' : command], {
    input: JSON.stringify(input), maxBuffer: 32e6, env: { ...process.env, LEAN_NUM_THREADS: '4' },
  }));
  if (wasm) assert.deepEqual(JSON.parse(command === 'render_ui'
    ? wasm.call('ehr_render_ui', JSON.stringify(input)) : wasm[command](JSON.stringify(input))), result);
  return result;
};
const descend = node => {
  for (const key of ['presentation', 'rowAction', 'valueSet', 'chartReferences', 'section', 'columns'])
    if (node[key]) return [node, ...node[key].children.flatMap(descend)];
  return node.tabs ? [node, ...node.tabs.body.flatMap(descend)] : [node];
};
const values = [
  ['hpi', 'The patient presents for a scheduled follow-up visit.\nCurrent concerns and the interval symptom course were discussed.\nMedication questions were addressed during the visit.\nThe patient’s own description is retained in the encounter documentation.'],
  ['ros', 'Review of systems documented for the presenting concerns.'],
  ['exam', 'Focused examination documented in today’s encounter.'],
  ['assessmentPlan', 'Assessment and plan discussed.\nFollow-up and return precautions reviewed.'],
];
let entered = 0;
for (const [persona, workflow, reviewScreen] of [['P1', 'W1', 'w1Close'], ['P4', 'W5', 'w5Close']]) {
  const spec = read(`${releases}/v1/spec.json`), program = read(`${releases}/v1/personas/${persona}.json`);
  const user = { id: persona, role: program.role };
  const projection = call('facts', { bundle: read(`${review}/${persona}-${workflow}-bundle.json`),
    context: { today: read(`${review}/review-cases.json`).today, now: 540, record: [], receipts: [] } });
  const base = { spec, program, facts: projection.facts, user };
  let state = call('init', base);
  const step = event => {
    const result = call('step', { ...base, state, event });
    assert.equal(result.result, 'ok'); state = result.state;
  };
  const go = target => {
    const paths = new Map([[state.screen, []]]), queue = [state.screen];
    for (const screen of queue) {
      if (paths.has(target)) break;
      for (const c of program.screens.find(s => s.id === screen).components) {
        const next = c.kind?.button?.action?.goto?.screen;
        if (next && !paths.has(next)) { paths.set(next, [...paths.get(screen), c.id]); queue.push(next); }
      }
    }
    assert.ok(paths.has(target), `Source navigation cannot reach ${target}`);
    for (const comp of paths.get(target)) step({ click: { comp } });
    assert.equal(state.screen, target);
  };
  const entries = workflow === 'W5' ? [...values, ['anticipatoryGuidance', 'Development, nutrition and safety topics discussed with the caregiver.']] : values;
  for (const [element, text] of entries) {
    const location = program.screens.filter(s => s.workflow === workflow).map(screen => ({ screen,
      comp: screen.components.find(c => c.kind?.field?.element === element && c.kind.field.slot.fixed?.n === 0),
    })).find(location => location.comp);
    assert.ok(location, `No source field for ${element}`);
    go(location.screen.id); step({ enter: { comp: location.comp.id, value: { text: { s: text } } } });
    assert.ok(state.captured.some(c => c.element === element && c.byHuman && c.confirmed && c.value.text?.s === text));
    entered++;
  }
  go(reviewScreen);
  assert.equal(state.commits.length, 0, 'Documentation entry cannot sign the visit');
  const input = { ...base, state, display: projection.display };
  const ui = call('render_ui', input);
  const info = ui.workspace.flatMap(descend).find(node => node.info?.infoId === 'noteSummary')?.info;
  assert.ok(info);
  if (before) assert.deepEqual(info.rows, [], 'The saved before binary reproduces the empty review');
  else {
    assert.equal(info.display, 'document');
    for (const [, text] of entries) assert.ok(info.rows.some(row => row.some(([key, value]) => key === 'Text' && value === text)));
    const pending = structuredClone(input);
    const hpi = pending.state.captured.find(c => c.element === 'hpi');
    hpi.confirmed = false; hpi.byHuman = false;
    const pendingUi = call('render_ui', pending);
    assert.ok(pendingUi.workspace.flatMap(descend).find(node => node.info?.infoId === 'noteSummary').info.rows
      .some(row => row.some(([key, value]) => key === 'Text' && value === entries[0][1]) &&
        row.some(([key, value]) => key === 'Entry status' && value === 'Needs confirmation')));
    assert.equal(hpi.confirmed, false, 'A preview cannot confirm a copied entry');
  }
  mkdirSync(`${out}/${persona}`, { recursive: true });
  writeFileSync(`${out}/${persona}/${reviewScreen}Documented.json`, JSON.stringify(ui));
}
console.log(`${before ? 'Before' : 'Current'} visit note review: ${entered} actual human entries, 2 review screens${before ? '; old empty-panel behavior reproduced' : ', native/WASM and exact text/confirmation states agree'}.`);
