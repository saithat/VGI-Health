// Targeted native/packaged-WASM agreement for the new high-alert specification.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadEhrInterp } from '../../app/public/ehr/interp-loader.mjs';
import { Native } from '../../conformance/native.mjs';
import { fixtures, scenarioCatalog } from '../../conformance/scenarios.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const read = path => JSON.parse(readFileSync(root + path, 'utf8'));
const wasm = await loadEhrInterp({ wasmBinary: readFileSync(root + 'app/public/ehr/ehr-interp.wasm') });
const native = new Native(process.env.EHR_BIN ?? root + 'lean/.lake/build/bin/ehr', { transport: 'serve' });
let comparisons = 0, cases = 0;
const mirror = {
  call(op, input) {
    const expected = native.call(op, input);
    const wire = JSON.stringify(input);
    const actual = JSON.parse(op === 'render-ui' ? wasm.call('ehr_render_ui', wire) : wasm[op](wire));
    assert.deepEqual(actual, expected, `native/WASM ${op} disagrees`);
    comparisons++;
    return expected;
  },
};
try {
  for (const [persona, alert, removed] of [
    ['P1', 'highAlertOrderNotice', false],
    ['P1', 'highAlertOrderNotice', true],
    ['P3', 'highAlertAdmin', false],
  ]) {
    const target = { persona, spec: read('releases/v3/spec.json'), program: read(`releases/v3/personas/${persona}.json`) };
    if (removed) for (const screen of target.program.screens)
      screen.components = screen.components.filter(c => c.kind?.alert?.alert !== alert);
    // The deleted component is a deliberate runtime probe; it is refused by
    // the static checker, and still cannot suppress the runtime acknowledgment.
    const scenario = scenarioCatalog.find(s => s.id === `alert.${alert}`);
    assert.ok(scenario?.applies(target));
    const result = scenario.run(fixtures(mirror, target));
    assert.ok(result.d.state.commits.length);
    cases++;
    native.cache.clear();
  }
  console.log(`${cases} high-alert cases; ${comparisons} native/packaged-WASM comparisons passed`);
} finally { await native.close(); }
