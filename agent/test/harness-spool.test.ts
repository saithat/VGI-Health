import { mkdtemp, readFile, symlink, writeFile, rename, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { serveHarnessSpool, type HarnessReply } from '../src/harness/host.js';

const fakeHost = { execute: async (raw: unknown): Promise<HarnessReply> => ({ exit: 0, output: { echoed: raw === null ? 'null' : 'request' } }) };
const settle = () => new Promise(r => setTimeout(r, 300));

test('spool never writes a reply through an agent-planted symlink', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'spool-'));
  const spool = path.join(dir, 'spool'), outside = path.join(dir, 'host-file.txt');
  await (await import('node:fs/promises')).mkdir(spool);
  await writeFile(outside, 'HOST CONTENT');
  await symlink(outside, path.join(spool, 'x.res.tmp'));
  await writeFile(path.join(spool, 'x.tmp'), JSON.stringify({ command: 'complain', text: 'hi' }));
  await rename(path.join(spool, 'x.tmp'), path.join(spool, 'x.req.json'));
  const stop = await serveHarnessSpool(spool, fakeHost, 10);
  await settle(); await stop();
  expect(await readFile(outside, 'utf8')).toBe('HOST CONTENT');
  expect(JSON.parse(await readFile(path.join(spool, 'x.res.json'), 'utf8')).output.echoed).toBe('request');
});

test('spool does not read a request through a symlink', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'spool-'));
  const spool = path.join(dir, 'spool'), outside = path.join(dir, 'secret.json');
  await (await import('node:fs/promises')).mkdir(spool);
  await writeFile(outside, JSON.stringify({ command: 'complain', text: 'SECRET' }));
  await symlink(outside, path.join(spool, 'y.req.json'));
  const stop = await serveHarnessSpool(spool, fakeHost, 10);
  await settle(); await stop();
  expect(JSON.parse(await readFile(path.join(spool, 'y.res.json'), 'utf8')).output.echoed).toBe('null');
  expect(await readFile(outside, 'utf8')).toContain('SECRET');
  expect((await readdir(spool)).sort()).toEqual(['y.res.json']);
});
