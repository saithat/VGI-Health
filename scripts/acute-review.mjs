/** Photograph native Lean semantic screens using the production painter.
 * Usage: node scripts/acute-review.mjs <native render-screens directory> <before|after|final>
 * Input contains P2/ and P3/ subdirectories; screenshots are always 1440 x 900.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const [input, stage] = process.argv.slice(2);
if (!input || !['before', 'after', 'final'].includes(stage)) throw new Error('Usage: acute-review.mjs <ui-directory> <before|after|final>');
const require = createRequire(path.join(root, 'app/package.json'));
const { chromium } = require('@playwright/test');
const output = stage === 'final' ? path.join(root, 'app/shots/final') : path.join(root, 'app/shots/realism/acute', stage);
const screens = [
  ['P2', 'w3TrackBoard', 'w3TrackBoard.open'], ['P2', 'w3Triage', 'w3Triage.weight'],
  ['P2', 'w3Provider', 'w3Provider.assessmentPlan'], ['P2', 'w3OrderSets', 'w3OrderSets.sepsis'],
  ['P2', 'w3Orders', 'w3Orders.drug'], ['P2', 'w3Sign', 'w3Sign.commit.signOrders'],
  ['P2', 'w3Disposition', 'w3Disposition.dispositionChoice'],
  ['P3', 'w4Worklist', 'w4Worklist.toMar'], ['P3', 'w4Mar', 'w4Mar.openDue'],
  ['P3', 'w4Admin', 'w4Admin.wristbandScan'], ['P3', 'w4Flowsheet', 'w4Flowsheet.painReassessment'],
  ['P3', 'w4Handoff', 'w4Handoff.handoffRecommendation'],
];
for (const [persona, screen, focus] of [
  ['P2', 'w3Provider-chart-results', 'w3Provider.chart'],
  ['P3', 'w4Mar-chart-results', 'w4Mar.chart'],
  ['P2', 'w3Provider-chart-imaging', 'w3Provider.chart'],
  ['P3', 'w4Mar-chart-imaging', 'w4Mar.chart'],
  ['P3', 'w4Flowsheet-outline', 'w4Flowsheet.nursingAssessment'],
  ['P3', 'w4Handoff-outline', 'w4Handoff.handoffRecommendation'],
]) {
  if (existsSync(path.join(input, persona, `${screen}.json`))) screens.push([persona, screen, focus]);
}
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
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const [persona, screen, focus] of screens) {
    if (stage === 'final' && screen !== 'w4Mar') continue;
    const ui = JSON.parse(await readFile(path.join(input, persona, `${screen}.json`), 'utf8'));
    if (stage !== 'final') await writeFile(path.join(output, `${screen}.json`), JSON.stringify(ui, null, 2) + '\n');
    await page.goto('http://127.0.0.1:4188/screen-check.html');
    await page.waitForFunction(() => typeof window.renderUi === 'function');
    const viewer = persona === 'P2' ? 'ED physician' : 'Registered nurse';
    await page.evaluate(({ screen, viewer }) => window.renderUi(screen, null, undefined, viewer), { screen: ui, viewer });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(output, `${screen}.png`), animations: 'disabled' });
    if (stage === 'final') continue;
    await page.locator(`[data-comp-id="${focus}"][data-event]`).first().evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.screenshot({ path: path.join(output, `${screen}-task.png`), animations: 'disabled' });
    process.stdout.write(`${stage}: ${screen}\n`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
} finally {
  if (browser) await browser.close();
  if (server.pid) process.kill(-server.pid, 'SIGTERM');
}
