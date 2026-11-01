// Compare the acute review's supplied imaging and nursing records through both APIs.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEhrInterp } from '../app/public/ehr/interp-loader.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const fixtures = mkdtempSync(join(tmpdir(), 'acute-wasm-'));
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const runtime = await loadEhrInterp();
const call = (name, input) => JSON.parse(name === 'render-ui'
  ? runtime.call('ehr_render_ui', JSON.stringify(input))
  : runtime[name](JSON.stringify(input)));
const native = (name, input) => JSON.parse(execFileSync(join(root, 'lean/.lake/build/bin/ehr'), [name], {
  input: JSON.stringify(input), maxBuffer: 32e6, timeout: 30000,
  env: { ...process.env, LEAN_NUM_THREADS: '4' },
}));
const equal = (name, input) => {
  const actual = call(name, input);
  assert.ok(!actual.error, `${name}: ${actual.error}`);
  assert.deepEqual(actual, native(name, input), `${name}: native/WASM`);
  return actual;
};
let views = 0;
try {
  execFileSync(process.execPath, [join(root, 'scripts/acute-review-fixtures.mjs'), fixtures]);
  for (const persona of ['P2', 'P3']) {
    const program = read(join(root, `releases/v1/personas/${persona}.json`));
    const source = equal('facts', {
      bundle: read(join(fixtures, `${persona}.json`)),
      context: read(join(fixtures, `${persona}-context.json`)),
    });
    const base = { spec: read(join(root, 'releases/v1/spec.json')), program,
      user: read(join(fixtures, `${persona}-user.json`)), ...source };
    const initial = equal('init', base);
    const states = new Map([[initial.screen, initial]]), pending = [initial.screen];
    while (pending.length) {
      const screen = pending.shift(), state = states.get(screen);
      const input = { ...base, state };
      equal('render-ui', input);
      views++;
      if (['w3Provider', 'w4Mar'].includes(screen)) {
        const selected = equal('step', { ...input, event: { selectTab: { comp: `${screen}.chart`, idx: 6 } } });
        assert.equal(selected.result, 'ok');
        const imaging = equal('render-ui', { ...base, state: selected.state });
        assert.equal(JSON.stringify(imaging).includes('Bilateral lower-lung airspace opacities.'), persona === 'P2',
          `${persona}: only the patient with the supplied report displays its conclusion`);
        views++;
      }
      const outline = { w4Flowsheet: ['copyAssessment', ['nursingAssessment']],
        w4Handoff: ['template', ['handoffSituation', 'handoffBackground', 'handoffAssessment', 'handoffRecommendation']] }[screen];
      if (outline) {
        const drafted = equal('step', { ...input, event: { click: { comp: `${screen}.${outline[0]}` } } });
        assert.equal(drafted.result, 'ok');
        for (const element of outline[1]) {
          const capture = drafted.state.captured.find(item => item.element === element);
          assert.equal(capture?.byHuman, false);
          assert.equal(capture?.confirmed, false);
          assert.ok(capture.value.text.s.includes('['), `${element}: explicit draft prompt`);
        }
        for (const key of ['receipts', 'commits', 'orderSlot']) assert.deepEqual(drafted.state[key], state[key]);
        equal('render-ui', { ...base, state: drafted.state });
        views++;
      }
      for (const component of program.screens.find(item => item.id === screen).components) {
        const target = component.kind.button?.action?.goto?.screen;
        if (!target || states.has(target)) continue;
        const result = equal('step', { ...input, event: { click: { comp: component.id } } });
        assert.equal(result.result, 'ok', `${screen} → ${target}`);
        assert.equal(result.state.screen, target);
        for (const key of ['receipts', 'commits', 'orderSlot'])
          assert.deepEqual(result.state[key], state[key], `${target}: navigation preserves ${key}`);
        // Entering an activity may add the rule-permitted, unconfirmed source draft.
        const evidence = captured => captured.filter(item => item.byHuman || item.confirmed);
        assert.deepEqual(evidence(result.state.captured), evidence(state.captured), `${target}: no human attestation`);
        states.set(target, result.state);
        pending.push(target);
      }
    }
    assert.equal(states.size, program.screens.length, `${persona}: every acute screen reachable`);
  }
  assert.equal(views, 18);
  process.stdout.write('Native/WASM acute review: 2 supplied-source bundles, 14 reachable screens (including 2 Home views), 2 Imaging tabs and 2 unconfirmed nursing outlines agree; navigation adds no human attestation or commits.\n');
} finally {
  rmSync(fixtures, { recursive: true, force: true });
}
