/** Capture actual saved P1 semantic screens with the app painter.
 * Run ReviewScreens.lean first; missing clinical data is never manufactured.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const root = fileURLToPath(new URL('../../../', import.meta.url)).replace(/\/$/, '');
const require = createRequire(`${root}/app/package.json`);
const { chromium } = require('@playwright/test');
const out = `${root}/programs/canonical/review/P1`;
const server = spawn('pnpm', ['--filter', 'app', 'exec', 'vite', '--host', '127.0.0.1', '--port', '4188', '--strictPort'], { cwd: root, stdio: 'ignore', detached: true });
let browser;
try {
  let ready = false;
  for (let n = 0; n < 100; n++) {
    try { ready = (await fetch('http://127.0.0.1:4188/screen-check.html')).ok; } catch {}
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  if (!ready) throw new Error('Review server did not start');
  await mkdir(out, { recursive: true });
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const [screen, focus] of [['w1Rooming', 'w1Rooming.weight'], ['w1Orders', 'w1Orders.drug'], ['w1Sign', 'w1Sign.commit.signOrders']]) {
    const ui = JSON.parse(await readFile(`${out}/${screen}.json`, 'utf8'));
    await page.goto('http://127.0.0.1:4188/screen-check.html');
    await page.waitForFunction(() => typeof window.renderUi === 'function');
    await page.evaluate(screen => window.renderUi(screen), ui);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${out}/${screen}-desktop.png`, animations: 'disabled' });
    await page.locator(`[data-comp-id="${focus}"][data-event]`).first().evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.screenshot({ path: `${out}/${screen}-task.png`, animations: 'disabled' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator(`[data-comp-id="${focus}"][data-event]`).first().evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.screenshot({ path: `${out}/${screen}-narrow.png`, animations: 'disabled' });
    await page.setViewportSize({ width: 1440, height: 900 });
    process.stdout.write(`${screen}: desktop, task, narrow screenshots saved\n`);
  }
} finally {
  if (browser) await browser.close();
  if (server.pid) process.kill(-server.pid, 'SIGTERM');
}
