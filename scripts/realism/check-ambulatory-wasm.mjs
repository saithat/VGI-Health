// Current canonical paths, supplied patient records and semantic metadata on both runtimes.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
let screens = 0, references = 0, pickers = 0;
for (const [persona, workflow] of [['P1', 'W1'], ['P1', 'W2'], ['P1', 'W7'], ['P4', 'W5']]) {
  const spec = read(`${root}/releases/v1/spec.json`);
  const program = read(`${root}/releases/v1/personas/${persona}.json`);
  const user = { id: persona, role: program.role };
  const factsInput = { bundle: read(`${review}/${persona}-${workflow}-bundle.json`), context: { today: '2026-11-02', now: 540, receipts: [], record: [] } };
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
    pickers += nodes.filter(node => node.valueSet).length;
    for (const node of nodes) references += node.chartReferences?.references.length ?? 0;
    screens++;
  }
  if (persona === 'P4') {
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
console.log(`Ambulatory native/WASM: ${screens} screens, ${pickers} pickers, ${references} reference curves; actual navigation, source facts and all semantic output agree.`);
