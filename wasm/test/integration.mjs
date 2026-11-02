import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';

// Reuses the spike's optional, locally installed browser QA dependency.
const { chromium } = await import('../../.tools/browser/node_modules/playwright/index.mjs');
const root = fileURLToPath(new URL('../../', import.meta.url));
const fixture = spawnSync('lake', ['env', 'lean', '--run', '../wasm/test/Fixtures.lean'], {
  cwd: `${root}/lean`, encoding: 'utf8',
});
assert.equal(fixture.status, 0, fixture.stdout + fixture.stderr);
const context = JSON.parse(fixture.stdout);
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5187', '--strictPort'], {
  cwd: `${root}/app`, stdio: ['ignore', 'pipe', 'pipe'],
});
let serverOutput = '';
let browser;
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(serverOutput)), 15000);
    server.stdout.on('data', chunk => {
      serverOutput += chunk;
      if (serverOutput.includes('http://127.0.0.1:5187')) { clearTimeout(timeout); resolve(); }
    });
    server.stderr.on('data', chunk => { serverOutput += chunk; });
    server.on('exit', code => { clearTimeout(timeout); reject(new Error(`Vite ${code}: ${serverOutput}`)); });
  });
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const responses = [];
  page.on('response', response => {
    if (response.url().includes('/ehr/')) responses.push({ url: response.url(), status: response.status() });
  });
  await page.goto('http://127.0.0.1:5187');
  const result = await page.evaluate(async context => {
    const { loadWasmInterp } = await import('/src/core/wasmInterp.ts');
    const start = performance.now();
    const interp = await loadWasmInterp();
    const loadMs = performance.now() - start;
    const args = ['spec', 'program', 'facts', 'user'].map(key => JSON.stringify(context[key]));
    const state = interp.init(...args);
    const event = { confirm: { comp: 'weightField' } };
    const step = interp.step(...args, state, JSON.stringify(event));
    const view = interp.view(...args, JSON.parse(step).state && JSON.stringify(JSON.parse(step).state));
    let missingFacts = '';
    try { interp.facts('{"resourceType":"Bundle","entry":[]}'); } catch (error) { missingFacts = String(error); }
    return { loadMs, state, step, view, missingFacts, isolated: crossOriginIsolated };
  }, context);
  for (const [op, input] of [
    ['init', context],
    ['step', { ...context, state: JSON.parse(result.state), event: { confirm: { comp: 'weightField' } } }],
    ['view', { ...context, state: JSON.parse(result.step).state }],
  ]) {
    const native = spawnSync(`${root}/lean/.lake/build/bin/ehr`, [op], { input: JSON.stringify(input), encoding: 'utf8' });
    assert.equal(native.status, 0, native.stderr);
    assert.equal(result[op === 'init' ? 'state' : op], native.stdout.trimEnd(), `browser adapter ${op}`);
  }
  assert.match(result.missingFacts, /unavailable/);
  assert.equal(result.isolated, false);
  assert.ok(responses.some(r => r.url.endsWith('ehr-interp.wasm') && r.status === 200));
  const summary = { browser: browser.version(), loadMs: result.loadMs,
    nativeComparisons: 3, crossOriginIsolated: result.isolated, assets: responses };
  writeFileSync(new URL('./integration-results.json', import.meta.url), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await browser?.close();
  server.kill();
}
