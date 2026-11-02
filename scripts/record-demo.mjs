#!/usr/bin/env node
// Usage: node scripts/record-demo.mjs --run run1-P3 --persona P3 --base http://localhost:5173
// Playwright records the real application; ffmpeg produces small 1440×900 MP4s.
import { createRequire } from 'node:module';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
const { chromium, expect } = createRequire(resolve('app/package.json'))('@playwright/test');
const { values } = parseArgs({ options: { run: { type: 'string', default: 'run1-P3' }, persona: { type: 'string', default: 'P3' }, base: { type: 'string', default: 'http://localhost:5173' }, only: { type: 'string' } } });
const run = values.run, persona = values.persona, base = values.base;
const out = resolve('docs/recordings');
await mkdir(out, { recursive: true });
const read = async p => JSON.parse(await readFile(p, 'utf8'));
const standaloneBad = values.only === '05';
const skipSummary = ['03', '04', '05'].includes(values.only);
const manifest = standaloneBad ? { days: 0 } : await read(`runs/${run}/manifest.json`);
const summary = skipSummary ? null : await read(`runs/${run}/summary.json`);
const final = summary?.timelines.find(t => t.persona === persona).days.at(-1).programVersion;
const browser = await chromium.launch({ headless: true });
const inventory = (await read(`${out}/recordings-${run}.json`).catch(() => ({ recordings: [] }))).recordings;
const pause = page => page.waitForTimeout(900);
const comp = (page, id) => page.locator(`[data-comp-id="${id}"][data-event]`);
async function click(page, locator) { await locator.scrollIntoViewIfNeeded(); await pause(page); await locator.click(); await pause(page); }
async function fill(page, id, value) { await pause(page); await comp(page, id).fill(value); await pause(page); }
async function record(name, action) {
  if (values.only && !name.startsWith(values.only)) return;
  const scratch = `${out}/.video-${name}`;
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: scratch, size: { width: 1440, height: 900 } }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await action(page); await page.waitForTimeout(2500);
    if (errors.length) throw new Error(errors.join('\n'));
    const video = page.video();
    await context.close();
    const source = await video.path();
    const target = `${out}/${name}.mp4`;
    const ff = spawnSync('ffmpeg', ['-y', '-i', source, '-an', '-vf', 'fps=15', '-c:v', 'libopenh264', '-b:v', '1200k', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', target], { encoding: 'utf8' });
    if (ff.status !== 0) throw new Error(ff.stderr);
    const probe = spawnSync('ffprobe', ['-v', 'quiet', '-show_entries', 'format=duration,size', '-of', 'json', target], { encoding: 'utf8' });
    const info = JSON.parse(probe.stdout).format;
    if (Number(info.size) >= 20 * 1024 * 1024) throw new Error(`${name} exceeds 20 MiB`);
    const old = inventory.findIndex(item => item.file === `${name}.mp4`);
    if (old >= 0) inventory.splice(old, 1);
    inventory.push({ file: `${name}.mp4`, duration: Number(info.duration), bytes: Number(info.size) });
    await rm(scratch, { recursive: true, force: true });
    console.log(name, info);
  } catch (error) { if (!page.isClosed()) await page.screenshot({ path: `${out}/${name}-error.png`, fullPage: true }); await context.close(); throw error; }
}
async function dashboard(page, view) {
  await page.goto(`${base}/dashboard?${new URLSearchParams({ run, view, persona })}`);
  await expect(page.getByRole('heading', { name: view, exact: true })).toBeVisible();
  await pause(page);
}
async function ehr(page, version) {
  await page.goto(`${base}/browse`); await pause(page);
  await page.goto(`${base}/ehr?${new URLSearchParams({ persona, run, program: `runs/${run}/programs/${persona}/v${version}.json` })}`);
  await expect(page.locator('.ehr-shell')).toBeVisible();
  await expect(page.locator('.inspector')).toBeVisible();
  // A complete nursing task: worklist → flowsheet → vital signs → file assessment.
  if (persona === 'P3') {
    for (const id of ['home.work.w4Worklist', 'w4Worklist.nav.w4Flowsheet']) await click(page, comp(page, id));
    if (!(await comp(page, 'w4Flowsheet.bpSystolic').isVisible())) await click(page, comp(page, 'w4Flowsheet.vitalsGroup'));
    for (const [id, val] of Object.entries({ bpSystolic: '120', bpDiastolic: '80', heartRate: '72', respRate: '16', temperature: '37', spo2: '98', painReassessment: '2', nursingAssessment: 'Stable. Vitals and nursing assessment completed.' })) await fill(page, `w4Flowsheet.${id}`, val);
    const commit = comp(page, 'w4Flowsheet.commit.chartAssessment');
    await expect(commit).toBeEnabled(); await click(page, commit);
    await expect(page.getByTestId('commits')).toContainText('chartAssessment');
    await page.getByTestId('commits').scrollIntoViewIfNeeded(); await pause(page);
  } else {
    await click(page, comp(page, 'home.work.w1Rooming'));
    await fill(page, 'w1Rooming.weight', '93.4');
    for (const id of ['w1Rooming.next', 'w1MedRec.next', 'w1Hpi.next', 'w1Exam.next']) await click(page, comp(page, id));
  }
}
try {
  await record('01-ehr-day1-vs-final', async page => { await ehr(page, 0); await page.waitForTimeout(2500); await ehr(page, final); });
  await record('02-dashboard-timeline-why', async page => {
    await dashboard(page, 'Evolution');
    const timeline = page.locator('.persona-timeline').filter({ has: page.getByRole('heading', { name: new RegExp(`^${persona} `) }) });
    await timeline.scrollIntoViewIfNeeded(); await pause(page);
    const nights = summary.timelines.find(t => t.persona === persona).nights;
    const decisions = await Promise.all(nights.map(n => read(`runs/${run}/decisions/night-${String(n.night).padStart(2, '0')}/${persona}.json`)));
    const score = r => r.measured.test?.saving.klmDeciSec ?? r.measured.validation?.saving.klmDeciSec ?? 0;
    const interesting = decisions.filter(r => r.outcome === 'deployed').sort((a, b) => score(b) - score(a))[0] ?? decisions.find(r => r.mode === 'migrate') ?? decisions[0];
    await click(page, timeline.getByRole('button', { name: new RegExp(`Night ${interesting?.night ?? 1}$`) }));
    await expect(page.getByRole('heading', { name: 'Why', exact: true })).toBeVisible();
    await page.mouse.wheel(0, 470); await page.waitForTimeout(4000);
  });
  await record('03-counterexample', async page => {
    await dashboard(page, 'Counterexamples');
    await page.getByLabel('Persona', { exact: true }).selectOption(persona); await pause(page);
    const rejected = page.getByLabel('Rejected proposal');
    const allergy = await rejected.locator('option').evaluateAll(options => (options.find(o => /Declutter/i.test(o.textContent ?? '')) ?? options.find(o => /allerg.*hidden|hide.*allerg/i.test(o.textContent ?? '')))?.value);
    if (allergy) { await rejected.selectOption(allergy); await pause(page); }
    await expect(page.locator('.counterexample .ehr-shell')).toBeVisible();
    for (let i = 0; i < 7; i++) {
      const next = page.getByRole('button', { name: 'Next event', exact: true });
      if (!(await next.isEnabled())) break;
      await click(page, next);
    }
    const rejectedCommit = page.locator('.counterexample [data-comp-id="w4Admin.commit.administerMed"][data-event]');
    if (await rejectedCommit.count()) await rejectedCommit.scrollIntoViewIfNeeded();
    else await page.mouse.wheel(0, 350);
    await pause(page);
  });
  if (manifest.days >= 7) await record('04-release-v2-migration', async page => {
    await dashboard(page, 'Releases');
    const card = page.locator('.release-card').filter({ has: page.getByRole('heading', { name: new RegExp(`^${persona} `) }) });
    await card.scrollIntoViewIfNeeded(); await pause(page);
    await expect(card.getByText('Old UI: fail', { exact: true })).toBeVisible();
    await expect(card.locator('.paired-screens :is(.ehr-shell, .clinical-banner)')).toHaveCount(2);
    await click(page, card.locator('.migration-patch summary'));
    await page.mouse.wheel(0, 350); await pause(page);
    const migration = await read(`runs/${run}/decisions/night-${String(manifest.releaseDays.v2 - 1).padStart(2, '0')}/${persona}.json`);
    const migrated = await read(`runs/${run}/programs/${persona}/v${migration.versionAfter}.json`);
    const screenId = migration.release.recheck.screens.at(-1);
    const changed = migrated.screens.find(screen => screen.id === screenId)?.components.find(c => c.kind.panel?.info === 'abxIndication' || c.kind.field?.element === 'abxIndication');
    if (changed) {
      await click(page, card.locator('.migration-patch summary'));
      const panes = card.locator('.paired-screens > div');
      const prior = panes.nth(0).locator(`[data-comp-id="${screenId}.dose"]`).first();
      if (await prior.count()) await prior.scrollIntoViewIfNeeded();
      await panes.nth(1).locator(`[data-comp-id="${changed.id}"]`).first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(3000);
    }
    const cert = card.locator('.certificate summary');
    if (await cert.count()) await click(page, cert);
    await page.mouse.wheel(0, 450); await pause(page);
  });
  await record('05-bad-program', async page => {
    const adult = '4966bd28-61bc-8f51-3aab-1328a32ea2e7';
    await page.goto(`${base}/browse`); await pause(page);
    await page.getByRole('link', { name: /01-hidden-allergies|01.*allerg/i }).first().click();
    // Use a stable known adult fixture so the missing-allergy blocker is reproducible.
    await page.goto(`${base}/ehr?${new URLSearchParams({ release: 'v1', program: 'programs/bad/01-hidden-allergies.json', persona: 'P1', patient: adult })}`);
    await click(page, comp(page, 'home.work.w1Rooming')); await fill(page, 'w1Rooming.weight', '93.4');
    for (const screen of ['w1Rooming', 'w1MedRec', 'w1Hpi', 'w1Exam']) await click(page, comp(page, `${screen}.next`));
    await click(page, comp(page, 'w1Orders.prefLisinopril'));
    while (await page.locator('[data-event="confirm"]').count()) await click(page, page.locator('[data-event="confirm"]').first());
    for (const [id, val] of Object.entries({ indication: 'Hypertension', pharmacy: 'Community pharmacy', substitution: 'true', prn: 'false', orderDiagnosis: 'I10' })) await fill(page, `w1Orders.${id}`, val);
    await click(page, comp(page, 'w1Orders.toSign')); await click(page, comp(page, 'w1Verify.continue'));
    await fill(page, 'w1Sign.patientIdReentry', 'AA/M/58');
    await expect(page.locator('.live-page [data-comp-id="w1Sign.allergies"]')).toHaveCount(0);
    const sign = comp(page, 'w1Sign.commit.signOrders');
    await expect(sign).toBeDisabled(); await expect(sign).toHaveAttribute('title', /allergyList/);
    await sign.scrollIntoViewIfNeeded(); await pause(page);
    await page.locator('.inspector').scrollIntoViewIfNeeded(); await pause(page);
  });
  await writeFile(`${out}/recordings-${run}.json`, JSON.stringify({ run, persona, viewport: [1440, 900], recordings: inventory }, null, 2) + '\n');
} finally { await browser.close(); }
