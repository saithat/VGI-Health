import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { expectedAria, observedAria } from "../src/ehr/ui/fidelity";
import type {} from "../src/core/buttonAudit";

test("canonical search returns semantic results and retains complete commit reviews", async ({
  page,
}) => {
  if (process.env.REALISM_SHOTS)
    await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(
    "/ehr?mode=replay&audit=buttons&release=v3&persona=P1&program=releases/v3/personas/P1.json",
  );
  await expect(page.locator(".clinical-app")).toBeVisible();
  const initial = await page.evaluate(
    () => window.__buttonAuditSession?.snapshot().state,
  );
  await page
    .getByRole("textbox", { name: "Search chart", exact: true })
    .fill("lisinopril");
  const results = page.locator('[data-info-id="searchResults"]');
  await expect(results).toContainText(/lisinopril/i);
  await expect(results).not.toContainText("urn:uuid:");
  await expect(results).toContainText("Excerpt:");
  if (process.env.REALISM_SHOTS) {
    const folder = `shots/realism/shell/${process.env.REALISM_SHOTS}`;
    mkdirSync(folder, { recursive: true });
    await page.mouse.move(1, 1);
    await page.screenshot({
      path: `${folder}/chart-search.png`,
      animations: "disabled",
    });
  }
  const baseline = await page.evaluate(
    () => window.__buttonAuditSession?.snapshot().state,
  );
  expect(baseline?.captured).toEqual(initial?.captured);
  expect(baseline?.commits).toEqual(initial?.commits);
  await page
    .getByRole("textbox", { name: "Search chart", exact: true })
    .fill("no-such-record-xxxxxxxx");
  await expect(results).toContainText("No matching records");
  const ui = await page.evaluate(
    () => window.__buttonAuditSession?.snapshot().ui,
  );
  expect(ui).toBeDefined();
  if (!ui) throw new Error("Missing semantic UI");
  expect(
    observedAria(await page.locator(".clinical-shell").ariaSnapshot()),
  ).toEqual(expectedAria(ui));
  await page
    .getByRole("textbox", { name: "Search chart", exact: true })
    .fill("");
  await expect(results).toHaveCount(0);
  await page
    .locator('[data-comp-id="home.work.w1Rooming"][data-event]')
    .click();
  await page
    .locator('button[data-comp-id$=".nav.w1Orders"][data-event]')
    .click();
  await page
    .getByRole("textbox", { name: "Find orders", exact: true })
    .fill("METFORMIN");
  await expect(results).toContainText("Medication: metformin");
  await page.locator('[data-comp-id="w1Orders.toSign"][data-event]').click();
  await page.locator('[data-comp-id="w1Verify.continue"][data-event]').click();
  const reviews = page.locator('[data-info-id="allergyList"]');
  const complete = await reviews.allTextContents();
  const beforeCommitSearch = await page.evaluate(
    () => window.__buttonAuditSession?.snapshot().state,
  );
  expect(complete.length).toBeGreaterThan(0);
  await page
    .getByRole("textbox", { name: "Search chart", exact: true })
    .fill("no-such-record-xxxxxxxx");
  await expect(results).toContainText("No matching records");
  expect(await reviews.allTextContents()).toEqual(complete);
  const after = await page.evaluate(
    () => window.__buttonAuditSession?.snapshot().state,
  );
  expect(after?.captured).toEqual(beforeCommitSearch?.captured);
  expect(after?.commits).toEqual(beforeCommitSearch?.commits);
  expect(after?.receipts).toEqual(beforeCommitSearch?.receipts);
});
