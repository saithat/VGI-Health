// Run after wasm/build-ehr.sh && wasm/install-into-app.sh and manifest generation.
// Lake commands are sequential. Never run alongside another Lake process.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
function run(command, args, input, cwd = root) {
  const result = spawnSync(command, args, {
    cwd, input, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.stdout;
}
run('make', ['wasm-check']);
run('lake', ['build', 'ehr'], undefined, resolve(root, 'lean'));
const directory = mkdtempSync(join(tmpdir(), 'ehr-core-wasm-'));
try {
  const path = join(directory, 'fixtures.json');
  run('lake', ['env', 'lean', '--run', 'Ehr/Core/FeatureFixtures.lean', path],
    undefined, resolve(root, 'lean'));
  const { loadEhrInterp } = await import(new URL('../../../app/public/ehr/interp-loader.mjs', import.meta.url));
  const wasm = await loadEhrInterp();
  const fixtures = JSON.parse(readFileSync(path, 'utf8'));
  let count = 0;
  for (const fixture of fixtures) {
    for (const api of ['init', 'view', 'step']) {
      const input = JSON.stringify(fixture[api]);
      const expected = JSON.parse(run(resolve(root, 'lean/.lake/build/bin/ehr'), [api], input));
      let actual;
      try {
        actual = JSON.parse(wasm[api](input));
      } catch (error) {
        throw new Error(`${fixture.name} ${api}: ${error.message}`, { cause: error });
      }
      assert.deepEqual(actual, expected, `${fixture.name} ${api}`);
      assert.equal('error' in actual, false, `${fixture.name} ${api} parse error`);
      count++;
    }
  }
  console.log(`PASS: ${count} native/WASM API comparisons across ${fixtures.length} core-feature cases`);
} finally {
  rmSync(directory, { recursive: true, force: true });
}
