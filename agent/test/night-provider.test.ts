import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer, get } from 'node:http';
import type { Server } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterEach, expect, it, vi } from 'vitest';
import { auditLaunch, prepareLaunch } from '../src/harness/agents.js';
import { startModelBridge } from '../src/harness/model-bridge.js';
import { MODEL_PORT, modelEndpoint } from '../src/harness/night-provider.js';
import { harnessSandboxArgs, PROXY_PORT } from '../src/harness/sandbox.js';

const scratch: string[] = [];
async function directory() {
  const dir = await mkdtemp(path.join(tmpdir(), 'night-'));
  scratch.push(dir);
  return dir;
}
afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(scratch.splice(0).map(dir => rm(dir, {recursive:true, force:true})));
});

it('preserves hosted argv and credentials and confines local Codex to the model bridge', async () => {
  const dir = await directory();
  const control = path.join(dir, 'control');
  await mkdir(control);
  vi.stubEnv('CODEX_HOME', dir);
  await writeFile(path.join(dir, 'auth.json'), 'fixture-credential');
  const cfg = { model:'example', reasoningEffort:'high', serviceTier:'default' };
  const hosted = await prepareLaunch(cfg, path.join(dir, 'hosted'), control, 0);
  const prefix = ['exec', '--json', '-s', 'workspace-write', '-c', 'sandbox_workspace_write.network_access=false',
    '-c', 'approval_policy="never"', '-c', 'web_search="disabled"', '-c', 'mcp_servers={}', '-c', 'features.apps=false',
    '-c', 'features.plugins=false', '-c', 'features.browser_use=false', '-c', 'features.multi_agent=false', '-c', 'model_reasoning_effort="high"'];
  const suffix = ['--skip-git-repo-check', '--ephemeral', '-C', '/work', '--add-dir', '/spool', '-m', 'example', '-o', '/home/agent/final-0.txt', '-'];
  expect(hosted.args).toEqual([...prefix, '-c', 'service_tier="default"', ...suffix]);
  expect(hosted.hosts).toEqual(['chatgpt.com', 'api.openai.com']);
  expect(await readFile(path.join(dir, 'hosted/.codex/auth.json'), 'utf8')).toBe('fixture-credential');

  const local = await prepareLaunch({...cfg, provider:'local', baseUrl:'http://localhost:8081/custom/v1'}, path.join(dir, 'local'), control, 0);
  expect(local.args).toEqual([...prefix, '-c', 'model_provider="night_local"', '-c', 'model_providers.night_local.name="Local model server"',
    '-c', 'model_providers.night_local.wire_api="responses"', '-c', `model_providers.night_local.base_url="http://127.0.0.1:${MODEL_PORT}/custom/v1"`,
    '-c', 'model_context_window=131072', '-c', 'model_auto_compact_token_limit=104857', ...suffix]);
  expect(local.hosts).toEqual([]);
  expect(existsSync(path.join(dir, 'local/.codex/auth.json'))).toBe(false);
  const mounts = { workspace:'work', control, home:'home', spool:'spool', localModel:true };
  const args = harnessSandboxArgs(mounts, local.command, local.args, local.env);
  expect(args).toContain('--unshare-all');
  expect(args.slice(args.indexOf(control) - 1, args.indexOf(control) + 2)).toEqual(['--ro-bind', control, '/run/harness']);
  expect(args.slice(args.indexOf('/run/harness/egress.sock'), args.indexOf(local.command))).toEqual([
    '/run/harness/egress.sock', String(PROXY_PORT), '/run/harness/model.sock', String(MODEL_PORT), '--',
  ]);
  expect(auditLaunch(JSON.stringify({type:'item.completed',item:{type:'command_execution',command:'cat /run/harness/model.sock'}})).status).toBe('fail');
});

it.each(['http://192.0.2.1:8080/v1', 'http://localhost.example/v1', 'http://[::ffff:127.0.0.1]/v1',
  'http://2130706433/v1', 'http://localhost@remote.example/v1', 'http://user:pass@localhost/v1',
  'http://localhost/v1?key=secret', 'http://localhost/v1#secret', 'https://localhost/v1'])(
  'refuses an invalid bridge destination %s before listening', async value => {
    await expect(startModelBridge(path.join(await directory(), 'model.sock'), value, () => {})).rejects.toThrow(/night model URL/);
  });

const listenLoopback = async (server: Server) => {
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('Missing TCP port');
  return address.port;
};
const close = (server: Server) => new Promise<void>(resolve => server.close(() => resolve()));

it('pipes host bridge requests to the pinned numeric loopback destination and logs each connection', async () => {
  expect(modelEndpoint('http://[::1]:8765/v1')).toMatchObject({host:'::1',hostPort:'[::1]:8765'});
  const socketPath = path.join(await directory(), 'model.sock');
  const http = createServer((req, res) => res.end(req.url));
  const port = await listenLoopback(http);
  const log = vi.fn();
  try {
    const stop = await startModelBridge(socketPath, `http://localhost:${port}/api/v1`, log);
    try {
      const body = await new Promise<string>((resolve, reject) => {
        get({socketPath, path:'/api/v1/responses', agent:false}, res => {
          let text = '';
          res.on('data', chunk => {text += chunk;});
          res.on('end', () => resolve(text));
        }).on('error', reject);
      });
      expect(body).toBe('/api/v1/responses');
      expect(log.mock.calls).toEqual([[{host:'127.0.0.1', port, allowed:true}]]);
    } finally { await stop(); }
  } finally { await close(http); }
});

it('entry forwards its inner model port to a Unix HTTP socket and bypasses the CONNECT proxy only on loopback', async () => {
  const dir = await directory();
  const socket = path.join(dir, 'http.sock');
  const upstream = createServer((req, res) => res.end(req.url));
  await new Promise<void>((resolve, reject) => { upstream.once('error', reject); upstream.listen(socket, resolve); });
  try {
    // The production port is private to each network namespace. Allocate a free port for this host-side test.
    const reservation = createServer();
    const port = await listenLoopback(reservation);
    await close(reservation);
    const entry = fileURLToPath(new URL('../src/harness/entry.mjs', import.meta.url));
    const script = `const res = await fetch('http://127.0.0.1:${port}/v1/responses');
      console.log(process.env.no_proxy, process.env.NO_PROXY, await res.text());`;
    const result = await promisify(execFile)(process.execPath, [entry, path.join(dir, 'unused.sock'), '0', socket, String(port),
      '--', process.execPath, '--input-type=module', '-e', script], {timeout:10000});
    expect(result.stdout.trim()).toBe('127.0.0.1 127.0.0.1 /v1/responses');
  } finally { await close(upstream); }
});
