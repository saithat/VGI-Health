import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Audit } from "./driver";

test("fast app regression: report gate and dashboard control effects", async ({ page }) => {
  const recorded: { owner: string; status: string; label: string }[] = JSON.parse(readFileSync(resolve('../docs/audits/buttons-app.json'), 'utf8'));
  expect(recorded.filter(r => r.owner === 'app' && ['dead', 'error'].includes(r.status))).toEqual([]);
  const audit = new Audit(page);
  await page.goto('/dashboard?run=run1-P3');
  await page.getByRole('region', { name: 'Version history' }).waitFor();
  await audit.click(page.getByRole('button', { name: 'Evolution', exact: true }));
  await audit.click(page.getByRole('button', { name: 'P3', exact: true }));
  await audit.click(page.getByRole('button', { name: 'Releases', exact: true }));
  await audit.click(page.getByRole('button', { name: 'Try to break it', exact: true }));
  await audit.click(page.getByRole('button', { name: 'Show recorded verdict', exact: true }));
  await audit.click(page.getByRole('button', { name: 'Replay counterexample', exact: true }));
  await page.locator('.replay-screen .ehr-shell, .replay-screen .clinical-app').first().waitFor();
  await audit.click(page.getByRole('button', { name: 'Reset path', exact: true }));
  await audit.click(page.getByRole('button', { name: 'Previous event', exact: true }));
  await audit.click(page.getByRole('button', { name: 'Next event', exact: true }));
  expect(audit.rows.filter(r => ['dead', 'error'].includes(r.status))).toEqual([]);
});
