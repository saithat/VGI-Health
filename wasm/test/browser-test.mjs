import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';

// Optional verification dependency, kept outside the project/package lockfiles.
// npm install --prefix .tools/browser --cache .tools/npm-cache --no-save playwright@1.64.1
// PLAYWRIGHT_BROWSERS_PATH="$PWD/.tools/browser/browsers" \
//   .tools/browser/node_modules/.bin/playwright install chromium
const { chromium } = await import('../../.tools/browser/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 850 } });
  const errors = [];
  const responses = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('response', response => responses.push({ url: response.url(), status: response.status() }));
  await page.goto(process.env.WASM_TEST_URL || 'http://127.0.0.1:8087/wasm/test/index.html');
  await page.waitForFunction(() => window.__ehrResult || window.__ehrError);
  assert.equal(await page.evaluate(() => window.__ehrError), undefined);
  const first = await page.evaluate(() => window.__ehrResult);
  assert.equal(first.synchronous, true);
  assert.equal(JSON.parse(first.result).counter, 42);
  await page.locator('#input').fill('{"counter":99,"text":"患者 🩺"}');
  await page.locator('#step').click();
  const output = JSON.parse(await page.locator('#output').innerText());
  assert.equal(output.counter, 100);
  assert.equal(output.input.text, '患者 🩺');
  const benchmark = await page.evaluate(() => {
    const input = '{"counter":41}';
    for (let i = 0; i < 100; i++) window.ehr.step(input);
    const calls = 1000;
    const start = performance.now();
    let result;
    for (let i = 0; i < calls; i++) result = window.ehr.step(input);
    const totalMs = performance.now() - start;
    return { calls, totalMs, meanMicroseconds: totalMs * 1000 / calls, result,
      userAgent: navigator.userAgent, crossOriginIsolated,
      resources: performance.getEntriesByType('resource').map(x => ({ name: x.name, bytes: x.transferSize })) };
  });
  assert.equal(JSON.parse(benchmark.result).counter, 42);
  assert.equal(benchmark.crossOriginIsolated, false, 'no COOP/COEP headers required');
  const initOnly = await page.evaluate(async () => {
    const { default: createInit } = await import('../dist/ehr-init.mjs');
    const { wrapEhr } = await import('../dist/ehr.js');
    return wrapEhr(await createInit()).step('hello 🩺');
  });
  assert.equal(initOnly, 'hello 🩺 (Lean Init/WASM)');
  assert.ok(responses.some(x => x.url.endsWith('/ehr.wasm') && x.status === 200));
  assert.deepEqual(errors, []);
  await page.screenshot({ path: new URL('../.build/browser.png', import.meta.url).pathname, fullPage: true });
  const result = { browser: await browser.version(), first, benchmark, initOnly, responses, errors };
  writeFileSync(new URL('../.build/browser-result.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
