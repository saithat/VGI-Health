#!/usr/bin/env node
// One browser, sequential persona searches, no clinical writes.
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { root } from './fetch.mjs';
const { chromium, expect: baseExpect } = createRequire(resolve(root, 'app/package.json'))('@playwright/test');
const expect = baseExpect.configure({ timeout: 120000 });
const index = JSON.parse(await readFile(resolve(root, 'fixtures/synthetic-hospital/index.json'), 'utf8'));
const base = process.env.SYNTHETIC_HOSPITAL_APP_URL ?? 'http://127.0.0.1:5195';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
const page = await context.newPage();
page.setDefaultTimeout(120000);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const verified = [];
try {
  for (const [persona, label] of [['P1', 'Primary care'], ['P2', 'Emergency'], ['P3', 'Inpatient RN'], ['P4', 'Pediatric NP'], ['P5', 'Surgeon']]) {
    console.log(`${persona}: sign in`);
    await page.goto(base);
    await page.getByRole('button', { name: `${persona} · ${label}`, exact: true }).click();
    await expect(page.getByLabel('Patient search')).toBeVisible();
    const patient = index.patients.find((p) => p.selectedFor === persona);
    await page.getByLabel('Patient search').fill(patient.name);
    await page.getByRole('button', { name: 'Search Medplum', exact: true }).click();
    await page.getByRole('button', { name: `${patient.name} · ${patient.birthDate}`, exact: true }).click();
    await expect(page.getByRole('heading', { level: 2, name: patient.name, exact: true })).toBeVisible();
    console.log(`${persona}: opening ${patient.sourceId} ${patient.name}`);
    await page.getByRole('button', { name: 'Open EHR', exact: true }).click();
    await expect(page.locator('.clinical-banner')).toBeVisible();
    await expect(page.locator('.clinical-banner')).toContainText(patient.name.split(' ').reverse().join(', '));
    if (persona === 'P1') {
      await mkdir(resolve(root, 'app/shots'), { recursive: true });
      await page.screenshot({ path: resolve(root, 'app/shots/synthetic-hospital-chart.png'), fullPage: true });
    }
    verified.push({ persona, sourceId: patient.sourceId, name: patient.name, birthDate: patient.birthDate });
    await page.getByRole('button', { name: 'Live encounter', exact: true }).click();
    await page.getByRole('button', { name: 'Back to worklist / refresh chart', exact: true }).click();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  }
  // The same browser verifies the offline source filter and a real WASM replay.
  await page.goto(`${base}/browse`);
  await page.getByLabel('Patient source', { exact: true }).selectOption('synthetic-hospital');
  await expect(page.getByLabel('Patient', { exact: true }).locator('option')).toHaveCount(151); // retained Synthea selection + 150 matches
  const replayPatient = index.patients[0];
  await page.getByLabel('Patient', { exact: true }).selectOption(replayPatient.id);
  await page.getByRole('link', { name: 'Open P1’s current program →', exact: true }).click();
  await expect(page.locator('.clinical-banner')).toBeVisible();
  await expect(page.locator('.clinical-banner')).toContainText(replayPatient.name.split(' ').reverse().join(', '));
  if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`);
  await writeFile(resolve(root, 'app/shots/synthetic-hospital-verification.json'), JSON.stringify({ source: index.source.commit, verified, errors }, null, 2) + '\n');
  console.log(JSON.stringify({ verified, errors, screenshot: 'app/shots/synthetic-hospital-chart.png' }, null, 2));
} finally {
  await browser.close();
}
