/** Capture saved Lean surgery screens with the actual painter at 1440 x 900.
 * Usage: node lean/Ehr/Canonical/review_surgery.mjs <render-screens directory> <before|after>
 * No clinical values or controls are supplied by this script.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const root = fileURLToPath(new URL('../../../', import.meta.url)).replace(/\/$/, '');
const require = createRequire(`${root}/app/package.json`);
const { chromium } = require('@playwright/test');
const [source, stage] = process.argv.slice(2);
if (!source || !['before', 'after'].includes(stage)) throw new Error('Supply a screen directory and before or after');
const out = `${root}/app/shots/realism/surg/${stage}`;
const server = spawn('pnpm', ['--filter', 'app', 'exec', 'vite', '--host', '127.0.0.1', '--port', '4196', '--strictPort'], { cwd: root, stdio: 'ignore', detached: true });
let browser;
try {
  let ready = false;
  for (let n = 0; n < 100; n++) {
    try { ready = (await fetch('http://127.0.0.1:4196/screen-check.html')).ok; } catch {}
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  if (!ready) throw new Error('Review server did not start');
  await mkdir(out, { recursive: true });
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const [screen, focus] of [
    ['home', null], ['w6Schedule', null], ['w6Consults', null],
    ['w1Rooming', 'w1Rooming.chiefComplaint'], ['w1MedRec', 'w1MedRec.decision0'],
    ['w1Hpi', 'w1Hpi.hpi'], ['w1Exam', 'w1Exam.exam'], ['w1Close', 'w1Close.patientInstructions'],
    ['w1Orders', 'w1Orders.drug'], ['w1Labs', 'w1Labs.labTest'],
    ['w1Verify', 'w1Verify.allergyReconfirmSigning'], ['w1Sign', 'w1Sign.patientIdReentry'],
    ['w6Consult', 'w6Consult.chiefComplaint'], ['w6ConsultClose', 'w6ConsultClose.levelOfService'],
    ['w6PreOp', 'w6PreOp.hpUpdate'], ['w6Orders', 'w6Orders.drug'],
    ['w6Sign', 'w6Sign.patientIdReentry'], ['w6OpNote', 'w6OpNote.opPreopDiagnosis'],
    ['w6PostOp', 'w6PostOp.postOpDiet'], ['w6Rounding', 'w6Rounding.progressNote'],
    ['w6Discharge', 'w6Discharge.dischargeInstructions'],
  ]) {
    let bytes;
    try { bytes = await readFile(`${source}/${screen}.json`, 'utf8'); }
    catch (error) { if (error.code === 'ENOENT' && ['w6Schedule', 'w6Consults'].includes(screen)) continue; throw error; }
    const ui = JSON.parse(bytes);
    await page.goto('http://127.0.0.1:4196/screen-check.html');
    await page.waitForFunction(() => typeof window.renderUi === 'function');
    await page.evaluate(screen => window.renderUi(screen), ui);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${out}/${screen}-load.png`, animations: 'disabled' });
    if (focus) {
      await page.locator(`[data-comp-id="${focus}"][data-event]`).first().evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.screenshot({ path: `${out}/${screen}-task.png`, animations: 'disabled' });
    }
    process.stdout.write(`${screen}: captured\n`);
  }
} finally {
  if (browser) await browser.close();
  if (server.pid) process.kill(-server.pid, 'SIGTERM');
}
