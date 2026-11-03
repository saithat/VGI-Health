import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { readFile, writeFile, mkdtemp, mkdir, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const appDir = path.resolve(import.meta.dirname, '..');
export async function collect(files, cache, env = {}) {
  const child = spawn(process.execPath, [path.join(appDir, 'scripts/geometry-browser.mjs')], {
    cwd: appDir, env: { ...process.env, ...env, EHR_GEOMETRY_CACHE: cache, EHR_GEOMETRY_CACHE_READ: '0' },
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  const started = performance.now();
  const result = new Promise((resolve, reject) => {
    let received = false;
    createInterface({ input: child.stdout }).on('line', line => {
      let response; try { response = JSON.parse(line); } catch { return; }
      if (response.id !== 1) return;
      received = true;
      child.stdin.end();
      if (response.error) reject(new Error(response.error)); else resolve(response);
    });
    child.on('error', reject);
    child.on('exit', code => { if (!received || code) reject(new Error(`Collector exited ${code}`)); });
  });
  child.stdin.write(JSON.stringify({ id: 1, files }) + '\n');
  try { return { response: await result, elapsedMs: Math.round(performance.now() - started) }; }
  finally { child.stdin.end(); await new Promise(resolve => { if (child.exitCode !== null) resolve(); else child.once('exit', resolve); }); }
}

/** Compare input identities, including modal background probes, to prevent a vacuous pass. */
export async function assertCaptureCoverage(files, response) {
  const expected = [];
  for (const file of files) {
    const bytes = await readFile(file);
    const hash = createHash('sha256').update(bytes).update('null').digest('hex');
    const name = path.basename(file);
    expected.push(`${name}:${hash}`);
    const tree = JSON.parse(bytes);
    if ('workspace' in tree && tree.modal) expected.push(`${name}:background:${hash}`);
  }
  assert.deepEqual(response.states.map(state => state.state).sort(), expected.sort(), 'Capture input coverage differs');
  for (const state of response.states) assert.deepEqual(state.viewport, { width: 1440, height: 900 });
}

export async function checkDeterminism(files, output) {
  await mkdir(output, { recursive: true });
  // A distinct process/browser/cache for every pass; a cache hit cannot prove determinism.
  const config = path.join(output, 'liberation-fonts.conf');
  await writeFile(config, `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
<fontconfig><include ignore_missing="no">/etc/fonts/fonts.conf</include>
<match target="pattern"><test name="family" qual="any"><string>sans-serif</string></test><edit name="family" mode="assign" binding="strong"><string>Liberation Sans</string></edit></match>
<match target="pattern"><test name="family" qual="any"><string>system-ui</string></test><edit name="family" mode="assign" binding="strong"><string>Liberation Sans</string></edit></match>
<match target="pattern"><test name="family" qual="any"><string>monospace</string></test><edit name="family" mode="assign" binding="strong"><string>Liberation Mono</string></edit></match>
</fontconfig>`);
  const changedEnv = { FONTCONFIG_FILE: config };
  const resolutions = {};
  for (const family of ['sans-serif', 'system-ui', 'monospace']) {
    const match = spawnSync('fc-match', ['-f', '%{family}', family], { env: { ...process.env, ...changedEnv }, encoding: 'utf8' });
    if (match.status !== 0) throw new Error('Host-independence check requires fontconfig and Liberation fonts');
    assert.match(match.stdout, /^Liberation /, `${family} must resolve to Liberation`);
    const original = spawnSync('fc-match', ['-f', '%{family}', family], { env: process.env, encoding: 'utf8' });
    if (original.status !== 0) throw new Error('Unable to resolve baseline generic fonts');
    assert.notEqual(original.stdout, match.stdout, `${family}: alternate fontconfig must change the resolved font`);
    resolutions[family] = { before: original.stdout, after: match.stdout };
  }
  const passes = [];
  for (const [name, env] of [['first', {}], ['repeat', {}], ['liberation', changedEnv]]) {
    const pass = await collect(files, path.join(output, name), env);
    await assertCaptureCoverage(files, pass.response);
    await writeFile(path.join(output, `${name}.json`), JSON.stringify(pass.response));
    passes.push({ name, ...pass });
    process.stderr.write(`${name}: ${pass.response.states.length} states in ${pass.elapsedMs}ms\n`);
  }
  for (const pass of passes.slice(1)) assert.deepEqual(pass.response, passes[0].response, `${pass.name} geometry differs`);
  const summary = { equal: true, files: files.length, states: passes[0].response.states.length, context: passes[0].response.context, resolutions,
    sha256: createHash('sha256').update(JSON.stringify(passes[0].response)).digest('hex'),
    passes: passes.map(({ name, elapsedMs }) => ({ name, elapsedMs })) };
  await writeFile(path.join(output, 'verification.json'), JSON.stringify(summary, null, 2));
  return summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const output = path.resolve(args[0] ?? await mkdtemp(path.join(tmpdir(), 'geometry-determinism-')));
  let files;
  if (args[1]) {
    const manifest = JSON.parse(await readFile(path.resolve(args[1]), 'utf8'));
    files = [...new Set(manifest.exports.flatMap(entry => entry.states.map(state => state.checkedAs)))];
  } else files = (await readdir(path.join(appDir, 'src/fixtures/ui'))).filter(name => name.endsWith('.json')).map(name => path.join(appDir, 'src/fixtures/ui', name));
  process.stdout.write(JSON.stringify(await checkDeterminism(files, output)) + '\n');
}
