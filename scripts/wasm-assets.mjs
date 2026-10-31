#!/usr/bin/env node
// Dependency-free verification: installing/running never invokes Emscripten.
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const assets = ['ehr-interp.mjs', 'ehr-interp.wasm', 'interp-loader.mjs', 'interp-loader.d.mts'];
const directory = resolve(root, 'app/public/ehr');
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
async function leanSources(dir = 'lean') {
  const paths = [];
  for (const entry of await readdir(resolve(root, dir), { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) paths.push(...await leanSources(path));
    else if (entry.name.endsWith('.lean') || ['lean-toolchain', 'lakefile.toml', 'lake-manifest.json'].includes(entry.name)) paths.push(path);
  }
  return paths.sort();
}
async function hashes(paths, base = root) {
  return Object.fromEntries(await Promise.all(paths.map(async (path) => [path, sha256(await readFile(resolve(base, path)))])));
}
try {
  const sources = await hashes(await leanSources());
  const buildInputs = await hashes([
    'wasm/build-ehr.sh', 'wasm/build_ehr.py', 'wasm/build.py',
    'wasm/interp-bridge.cpp', 'wasm/uv-error.c', 'wasm/interp-loader.mjs', 'wasm/interp-loader.d.mts',
  ]);
  const manifest = {
    format: 1,
    leanSourceHash: sha256(JSON.stringify(sources)),
    sources,
    buildInputs,
    toolchain: { lean: '4.35.0', emscripten: '6.0.13' },
    assets: await hashes(assets, directory),
  };
  const serialized = JSON.stringify(manifest, null, 2) + '\n';
  const path = resolve(directory, 'manifest.json');
  if (process.argv.includes('--write')) {
    await writeFile(path, serialized);
    console.log(`Recorded WASM manifest: Lean sha256 ${manifest.leanSourceHash}`);
  } else {
    if (await readFile(path, 'utf8') !== serialized) throw new Error('source or asset hash mismatch');
    console.log(`WASM assets current: Lean sha256 ${manifest.leanSourceHash}`);
  }
} catch (error) {
  console.error(`WASM assets missing or stale (${error.message}). Run make wasm with Emscripten, then commit app/public/ehr/.`);
  process.exitCode = 1;
}
