#!/usr/bin/env node
// One browser, sequential persona searches, no clinical writes.
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { root } from './fetch.mjs';
import { loadEnv } from '../../infra/scripts/lib.mjs';
import { enterPatientChart, navigateClinicalScreen } from '../../app/e2e/clinical-navigation.ts';
loadEnv();
if (!process.env.KEYCLOAK_PERSONA_PASSWORD) throw new Error('Run make install before the live verification');
const { chromium, expect: baseExpect } = createRequire(resolve(root, 'app/package.json'))('@playwright/test');
const expect = baseExpect.configure({ timeout: 30000 });
const index = JSON.parse(await readFile(resolve(root, 'fixtures/synthetic-hospital/index.json'), 'utf8'));
const base = process.env.SYNTHETIC_HOSPITAL_APP_URL ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({ headless: true });
const errors = [];
const verified = [];
try {
  for (const persona of ['P1', 'P2', 'P3', 'P4', 'P5']) {
    // Each clinician uses an independent real OIDC session; no password grant.
    const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.on('pageerror', (error) => errors.push(error.message));
    console.log(`${persona}: sign in`);
    await page.goto(`${base}/?audit=buttons`);
    await page.getByLabel('Baseline clinician', { exact: true }).selectOption(persona);
    await page.getByRole('button', { name: 'Original canonical EHR (baseline)', exact: true }).click();
    await expect(page).toHaveURL(/\/realms\/vgi\/protocol\/openid-connect\/auth/);
    await page.getByLabel('Username or email').fill(persona.toLowerCase());
    await page.getByLabel('Password', { exact: true }).fill(process.env.KEYCLOAK_PERSONA_PASSWORD);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    const lookup = page.getByRole('button', { name: 'Patient Lookup', exact: true });
    await expect(lookup).toBeVisible();
    await lookup.click();
    const patient = index.patients.find((p) => p.selectedFor === persona);
    await page.getByLabel('Patient search by name or MRN', { exact: true }).fill(patient.mrn);
    const chart = page.waitForResponse(r => r.url().endsWith(`/commit/patients/${patient.id}/chart`)).then(r => r.json());
    await page.getByRole('button', { name: /^Open chart:/ }).first().click();
    await expect(page.locator('.clinical-banner')).toBeVisible();
    await expect(page.locator('.clinical-banner')).toContainText(patient.name.split(' ')[0]);
    const stored = await chart;
    if (!stored.snapshot.bundle.entry.some(e => e.resource.resourceType === 'Patient' && e.resource.id === patient.id)) throw new Error('Read model returned another patient');
    console.log(`${persona}: opened ${patient.sourceId} ${patient.name} from commit version ${stored.version}`);
    if (persona === 'P1') {
      await mkdir(resolve(root, 'app/shots'), { recursive: true });
      await page.screenshot({ path: resolve(root, 'app/shots/synthetic-hospital-chart.png'), fullPage: true });
    }
    const bundle = JSON.parse(await readFile(resolve(root, patient.bundlePath ?? `fixtures/synthetic-hospital/${patient.file}`), 'utf8'));
    const resources = bundle.entry.map((entry) => entry.resource);
    const notes = resources.filter((r) => r.resourceType === 'DocumentReference' && r.status !== 'entered-in-error');
    const homeMeds = resources.filter((r) => r.resourceType === 'MedicationStatement' && r.status !== 'entered-in-error');
    if (persona === 'P1' || persona === 'P4') {
      await navigateClinicalScreen(page, persona === 'P4' ? 'w5Rooming' : 'w1Rooming');
      console.log(`${persona}: notes tabs ${JSON.stringify(await page.getByRole('tab').allTextContents())}`);
      await page.getByRole('tab', { name: 'Notes', exact: true }).click();
      const notePanel = page.locator('[data-info-id="encounterNotes"], [data-info-id="priorNotes"]').filter({ has: page.getByRole('heading', { name: 'Notes', exact: true }) });
      await expect(notePanel).toBeVisible();
      await expect(notePanel.locator('li')).toHaveCount(notes.length);
      if (notes.length) await expect(notePanel).toContainText(Buffer.from(notes[0].content[0].attachment.data, 'base64').toString('utf8'));
      if (persona === 'P1') await page.screenshot({ path: resolve(root, 'app/shots/synthetic-hospital-notes.png'), fullPage: false });
      if (homeMeds.length) {
        await navigateClinicalScreen(page, 'chartHistory');
        await page.getByRole('tab', { name: 'History', exact: true }).click();
        const reported = page.locator('[data-info-id="importedHistory"]').filter({ visible: true });
        await expect(reported).toContainText('Home medications (reported)');
        await expect(reported.getByRole('row').filter({ hasText: 'Home medications (reported)' })).toHaveCount(homeMeds.length);
        for (const med of homeMeds) await expect(reported).toContainText(med.medicationCodeableConcept.text ?? med.medicationCodeableConcept.coding[0].display);
      }
    }
    verified.push({ notes: notes.length, homeMedications: homeMeds.length, persona, sourceId: patient.sourceId, name: patient.name, birthDate: patient.birthDate });
    await context.close();
  }
  // The same browser verifies the offline source filter and a real WASM replay.
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
  const replayPatient = index.patients[0];
  await page.goto(`${base}/ehr?mode=replay&audit=buttons&release=v3&persona=P1&program=releases/v3/personas/P1.json`);
  await enterPatientChart(page, replayPatient.mrn);
  await expect(page.locator('.clinical-banner')).toContainText(replayPatient.name.split(' ')[0]);
  if (await page.evaluate(() => window.__buttonAuditSession?.snapshot().state.patientContext?.bound) !== replayPatient.id) throw new Error('Offline replay selected another patient');
  if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`);
  await writeFile(resolve(root, 'app/shots/synthetic-hospital-verification.json'), JSON.stringify({ source: index.source.commit, verified, errors }, null, 2) + '\n');
  console.log(JSON.stringify({ verified, errors, screenshot: 'app/shots/synthetic-hospital-notes.png' }, null, 2));
} finally {
  await browser.close();
}
