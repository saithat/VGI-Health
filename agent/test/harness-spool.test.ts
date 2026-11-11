import { execFileSync } from 'node:child_process';
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

test('a FIFO planted as a request neither blocks the host nor stops later requests', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'spool-'));
  const spool = path.join(dir, 'spool');
  await (await import('node:fs/promises')).mkdir(spool);
  execFileSync('mkfifo', [path.join(spool, 'a.req.json')]);
  await writeFile(path.join(spool, 'b.tmp'), JSON.stringify({ command: 'complain', text: 'hi' }));
  await rename(path.join(spool, 'b.tmp'), path.join(spool, 'b.req.json'));
  const stop = await serveHarnessSpool(spool, fakeHost, 10);
  await settle();
  const stopped = await Promise.race([stop().then(() => 'stopped'), new Promise(r => setTimeout(() => r('hung'), 3000))]);
  expect(stopped).toBe('stopped');
  expect(JSON.parse(await readFile(path.join(spool, 'a.res.json'), 'utf8')).output.echoed).toBe('null');
  expect(JSON.parse(await readFile(path.join(spool, 'b.res.json'), 'utf8')).output.echoed).toBe('request');
  expect((await readdir(spool)).sort()).toEqual(['a.res.json', 'b.res.json']);
});
