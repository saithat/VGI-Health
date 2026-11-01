import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import type {} from "../src/core/buttonAudit";
const phase = process.env.EPIC_DENSITY_SHOTS;
for (const persona of ["P1", "P2", "P3", "P4", "P5"])
  test(`${persona} canonical chart density`, async ({ page }) => {
    test.skip(!phase, "Opt-in density review");
    test.setTimeout(90000);
    await page.goto(
      `/ehr?mode=replay&persona=${persona}&program=releases/v3/personas/${persona}.json&audit=buttons`,
    );
    await expect(
      page.getByRole("textbox", { name: "Patient search by name or MRN" }),
    ).toBeVisible({ timeout: 60000 });
    await page
      .getByRole("button", { name: /^Open chart:/ })
      .first()
      .click();
    await expect(
      page.getByRole("banner", { name: "Patient banner" }),
    ).toBeVisible({ timeout: 30000 });
    if (phase === "after")
      await expect(
        page.getByRole("heading", { name: "Chart Summary", exact: true }),
      ).toBeVisible();
    const folder = `shots/final/epic-${phase}`;
    mkdirSync(folder, { recursive: true });
    if (phase === "after") {
      const ui = await page.evaluate(() => window.__buttonAuditSession?.snapshot().ui);
      writeFileSync(`${folder}/${persona}-summary.ui.json`, JSON.stringify(ui));
    }
    await page.screenshot({
      path: `${folder}/${persona}-chart.png`,
      animations: "disabled",
    });
    if (phase === "after") {
      await page
        .getByRole("button", { name: "Chart Review", exact: true })
        .first()
        .click();
      for (const name of [
        "Encounters",
        "Notes",
        "Results",
        "Medications",
        "Problems",
        "Allergies",
        "Imaging",
        "Immunizations",
        "History",
        "Care Plan",
      ]) {
        await page.getByRole("tab", { name, exact: true }).click();
        await expect(page.getByRole("main")).toBeVisible();
      }
      await page.screenshot({
        path: `${folder}/${persona}-chart-review.png`,
        animations: "disabled",
      });
    }
  });
