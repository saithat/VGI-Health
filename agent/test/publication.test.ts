import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { bindBuild } from '../src/build-binding.js';
import { RunStore } from '../src/store.js';
import { fakeCanonical } from '../src/fake/fixtures.js';
import { tmp } from './helpers.js';

it('publishes a complete bound version through one pointer and rejects changed artifacts at login', async () => {
  const dir = await tmp('bound-publication');
  const store = new RunStore(dir);
  const program = fakeCanonical('v1');
  const certificate = { specVersion: 'v1', specHash: 's', programHash: 'p', verdict: 'ok' as const, checkerVersion: 'test', time: 'now' };
  const build = { appSha256: 'a'.repeat(64), wasmSha256: 'b'.repeat(64), componentsSha256: 'c'.repeat(64) };
  const pointer = await store.deploy('P1', program, certificate, bindBuild(build, program, certificate));
  expect(pointer.build).toBe('certs/P1/v0.build.json');
  expect((await store.login('P1')).program).toEqual(program);
  const previous = await readFile(path.join(dir, 'programs/P1/deployed.json'), 'utf8');
  const next = { ...program, version: 1 };
  const binding = bindBuild(build, next, certificate);
  await expect(store.deploy('P1', next, certificate, { ...binding, appSha256: 'invalid' })).rejects.toThrow();
  expect(await readFile(path.join(dir, 'programs/P1/deployed.json'), 'utf8')).toBe(previous);
  expect((await store.login('P1')).program.version).toBe(0);
  await writeFile(store.programPath('P1', 0), JSON.stringify({ ...program, owner: 'tampered' }));
  await expect(store.login('P1')).rejects.toThrow('no longer match');
});
