// Strict native/WASM density regression, independent of historical app snapshots.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadEhrInterp} from '../../../app/public/ehr/interp-loader.mjs';

export function checkDensityUi(ehr, native, cases, checkUi) {
  let checked = 0;
  for (const [name, source] of cases) {
    const sized = size => ({ ...source, program: { ...source.program,
      screens: source.program.screens.map(sc => ({ ...sc, components: sc.components.map(c =>
        ({ ...c, size: c.size === 'tiny' ? 'tiny' : size })) })) } });
    const normal = sized('normal'), compact = sized('compact');
    const before = native('render-ui', normal), after = native('render-ui', compact);
    assert.deepEqual(JSON.parse(ehr.call('ehr_render_ui', JSON.stringify(normal))), before, `${name}: normal native/WASM`);
    assert.deepEqual(JSON.parse(ehr.call('ehr_render_ui', JSON.stringify(compact))), after, `${name}: compact native/WASM`);
    const view = native('view', compact);
    assert.ok(after.compact.length > 0);
    assert.deepEqual(after.compact, view.items.filter(it => it.shown && it.comp.size === 'compact').map(it => it.comp.id), `${name}: exact compact side table`);
    assert.deepEqual(before.compact ?? [], [], `${name}: normal has no compact IDs`);
    checkUi?.(after, view, compact.program, compact.display, `${name}: compact`);
    const {compact: density, ...semantic} = after;
    const {compact: oldDensity, ...oldSemantic} = before;
    assert.deepEqual(semantic, oldSemantic, `${name}: complete semantic tree unchanged`);
    checked++;
  }
  return checked;
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error('Pass an ExportTests.lean output directory');
  const directory = resolve(process.argv[2]);
  const binary = process.env.EHR_RENDER_NATIVE ?? 'lean/.lake/build/bin/ehr';
  const native = (command, input) => JSON.parse(execFileSync(binary, [command], {
    input: JSON.stringify(input), maxBuffer: 32 * 1024 * 1024,
  }));
  const cases = JSON.parse(readFileSync(resolve(directory, 'clinical-ui-cases.json'), 'utf8'));
  const checked = checkDensityUi(await loadEhrInterp(), native, cases);
  assert.ok(checked > 0);
  console.log(`Density contract: ${checked} native/WASM cases passed; exact compact IDs and complete semantic trees preserved.`);
}
