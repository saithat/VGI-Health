import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, realpath, rename, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT, loadEnv } from '../infra/scripts/lib.mjs';
import { acquireBrowserLock } from './browser-heavy-lock.mjs';

export const root = REPO_ROOT;
export const cache = join(root, '.cache/one-command');
const app = join(root, 'app');
const lean = join(root, 'lean');
const dist = join(app, 'dist');

export function command(file, args, { cwd = root, quiet = false, timeout } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, {
      cwd, timeout, stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    });
    let output = '';
    if (quiet) {
      child.stdout.setEncoding('utf8').on('data', (data) => { output += data; });
      child.stderr.setEncoding('utf8').on('data', (data) => { output += data; });
    }
    child.once('error', reject);
    child.once('close', (code, signal) => {
      if (code === 0) resolve(output.trim());
      else reject(new Error(quiet ? output.trim() || String(signal ?? code) :
        `${file} ${args.join(' ')} exited with ${signal ?? code}.`));
    });
  });
}

export async function localEnvironment() {
  loadEnv();
  await mkdir(cache, { recursive: true });
  const requested = process.env.TMPDIR;
  // Reject RAM-disk paths and relative paths, including symlinked overrides.
  const actual = requested && isAbsolute(requested) ?
    await realpath(requested).catch(() => '') : '';
  const diskScratch = actual && !/^\/(?:tmp|dev\/shm|run)(?:\/|$)/.test(actual);
  process.env.TMPDIR = diskScratch ? actual : join(root, '.cache/tmp');
  await mkdir(process.env.TMPDIR, { recursive: true });
  process.env.CI = 'true';
  process.env.LEAN_NUM_THREADS ??= '4';
}

export function checkNode() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 18))
    throw new Error('Node 22.18 or later is required. Install a supported Node release and retry.');
}

export async function checkPnpm() {
  const expected = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).packageManager.split('@')[1];
  const version = await command('pnpm', ['--version'], { quiet: true, timeout: 15000 }).catch(() => null);
  if (version !== expected)
    throw new Error(`pnpm ${expected} is required. Run npm install -g pnpm@${expected} and retry.`);
}

async function bytesCurrent(left, right) {
  const installed = await readFile(right).catch(() => null);
  return installed !== null && installed.equals(await readFile(left));
}

async function filesIn(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const children = await Promise.all(entries.map((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? filesIn(path) : path;
  }));
  return children.flat();
}

async function fingerprint(files, environment = '') {
  const hash = createHash('sha256').update(environment);
  for (const path of [...new Set(files)].sort()) {
    hash.update(relative(root, path)).update('\0').update(await readFile(path)).update('\0');
  }
  return hash.digest('hex');
}

async function stamped(name, signature, valid, build) {
  const file = join(cache, `${name}.sha256`);
  if (valid && await readFile(file, 'utf8').catch(() => '') === signature) {
    console.log(`${name}: current`);
    return;
  }
  const builtSignature = await build();
  await writeFile(`${file}.${process.pid}`, builtSignature || signature);
  await rename(`${file}.${process.pid}`, file);
}

async function appSignature(portIssuer) {
  const report = await readFile(join(dist, 'lean-bundle-report.json'), 'utf8')
    .then(JSON.parse).catch(() => null);
  const external = (report?.app.modules ?? [])
    .map((path) => path.split('?')[0])
    .filter((path) => path.startsWith(root + '/') && !path.startsWith(app + '/') &&
      !path.includes('/node_modules/') && existsSync(path));
  const files = [
    ...(await filesIn(join(app, 'src'))).filter((file) => !file.startsWith(join(app, 'src/dashboard/start') + '/')),
    ...await filesIn(join(app, 'public')),
    ...external, ...['vite.config.ts', 'index.html', 'lean.html', 'screen-check.html',
      'trajectory-frame.html', 'tsconfig.json', 'package.json', 'scripts/build-binding-plugin.ts',
      'scripts/compression-plugin.ts', 'scripts/lean-bundle-plugin.ts'].map((path) => join(app, path)),
    join(root, 'pnpm-lock.yaml'),
  ];
  const viteEnv = Object.entries(process.env).filter(([key]) => key.startsWith('VITE_')).sort();
  return fingerprint(files, JSON.stringify([portIssuer, viteEnv]));
}

async function appBuildValid(wasm) {
  try {
    const binding = JSON.parse(await readFile(join(dist, 'build.json'), 'utf8'));
    return /^[a-f0-9]{64}$/.test(binding.appSha256) &&
      ['index.html', 'lean.html', 'screen-check.html', 'trajectory-frame.html'].every((path) => existsSync(join(dist, path))) &&
      await bytesCurrent(join(wasm, 'ehr-interp.wasm'), join(dist, 'ehr/ehr-interp.wasm'));
  } catch {
    return false;
  }
}

export async function withLocalLock(name, work) {
  const lock = await acquireBrowserLock({
    env: { EHR_BROWSER_LOCK_PATH: join(cache, `${name}.lock`) },
  }).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  try {
    return await work();
  } finally {
    lock?.release();
  }
}

export async function prepareBuild() {
  await withLocalLock('build', build);
}

async function build() {
  checkNode();
  await checkPnpm();
  const toolchain = (await readFile(join(lean, 'lean-toolchain'), 'utf8')).trim();
  const version = toolchain.split(':v').at(-1);
  const matches = (output) => output.includes(`Lean (version ${version},`) && !output.includes('error:');
  if (!await command('lake', ['--version'], { cwd: lean, quiet: true, timeout: 15000 })
    .then((output) => output.includes(`Lean version ${version})`) || matches(output), () => false))
    throw new Error(`Lean ${version} is required. Install Elan, then run elan toolchain install ${toolchain} and retry.`);

  const lock = join(root, 'pnpm-lock.yaml');
  const installed = join(root, 'node_modules/.pnpm/lock.yaml');
  const tools = ['app/node_modules/.bin/vite', 'app/node_modules/.bin/tsc',
    'agent/node_modules/.bin/tsx', 'world/node_modules/.bin/tsx', 'services/commit/node_modules/.bin/tsc'];
  if (tools.every((file) => existsSync(join(root, file))) && await bytesCurrent(lock, installed)) {
    console.log('Dependencies: current');
  } else {
    console.log('Installing workspace dependencies');
    await command('pnpm', ['install', '--frozen-lockfile']);
  }

  const wasm = join(app, 'public/ehr');
  const checkWasm = () => command(process.execPath, ['scripts/wasm-assets.mjs'], { quiet: true });
  try {
    console.log(await checkWasm());
  } catch {
    console.log('Building stale WASM assets');
    try {
      // Override the legacy Makefile's machine-specific scratch setting.
      await command('make', ['wasm', `TMPDIR=${process.env.TMPDIR}`]);
      console.log(await checkWasm());
    } catch {
      throw new Error('WASM needs the pinned Emscripten toolchain. Run bash wasm/setup.sh and retry.');
    }
  }

  const leanSignature = await fingerprint([join(wasm, 'manifest.json')]);
  const nativeValid = ['ehr', 'ui-layout', 'export-content'].every((name) => existsSync(join(lean, '.lake/build/bin', name)));
  await stamped('Lean', leanSignature, nativeValid, async () => {
    await command('lake', ['build'], { cwd: lean });
  });

  const issuer = process.env.VITE_KEYCLOAK_ISSUER;
  const signature = await appSignature(issuer);
  await stamped('App', signature, await appBuildValid(wasm), async () => {
    await command('pnpm', ['--filter', 'app', 'build']);
    // A build can add external modules to the bundle report.
    return appSignature(issuer);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await localEnvironment();
    await prepareBuild();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
