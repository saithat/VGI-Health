/** Replay all eight exported feature failures through the installed Lean WASM.
 * Runtime behavior check only; this does not refresh or certify the build manifest.
 */
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { loadEhrInterp } from '../../../app/public/ehr/interp-loader.mjs';
const root = new URL('../../../', import.meta.url);
const read = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const paths = (await readdir(new URL('programs/replays/', root))).filter(p => p.endsWith('.json')).sort();
assert.equal(paths.length, 8);
const wasm = await loadEhrInterp();
for (const path of paths) {
  const manifest = await read(`programs/replays/${path}`);
  const context = {
    spec: await read(manifest.specFile), program: await read(manifest.programFile),
    facts: manifest.facts, user: manifest.user,
  };
  let state = JSON.parse(wasm.init(JSON.stringify(context)));
  assert.equal(state.error, undefined);
  let result;
  for (const event of manifest.events) {
    const output = JSON.parse(wasm.step(JSON.stringify({ ...context, state, event, actor: 'human' })));
    assert.equal(output.error, undefined);
    state = output.state;
    result = output.result;
  }
  assert.deepEqual(state.commits, [], path);
  assert.ok(result.blocked?.reason.includes(manifest.expectedReason), `${path}: ${JSON.stringify(result)}`);
  process.stdout.write(`${path}: ${result.blocked.reason}\n`);
}
process.stdout.write('All eight permanent feature failures replay through installed WASM.\n');
