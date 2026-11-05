import { expectedAria, observedAria } from "../src/ehr/ui/fidelity";
import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import type {} from "../src/core/buttonAudit";
const phase = process.env.CANONICAL_DENSITY_SHOTS ?? "after";
const capture = Boolean(process.env.CANONICAL_DENSITY_SHOTS);
for (const persona of ["P1", "P2", "P3", "P4", "P5"])
  test(`${persona} canonical chart density`, async ({ page }) => {
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
    const folder = `shots/final/canonical-density-${phase}`;
    if (capture) mkdirSync(folder, { recursive: true });
    if (capture && phase === "after") {
      const ui = await page.evaluate(
        () => window.__buttonAuditSession?.snapshot().ui,
      );
      writeFileSync(`${folder}/${persona}-summary.ui.json`, JSON.stringify(ui));
    }
    if (capture)
      await page.screenshot({
        path: `${folder}/${persona}-chart.png`,
        animations: "disabled",
      });
    if (phase === "after") {
      await page
        .getByRole("button", { name: "Chart History", exact: true })
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
        await expect(
          page.getByRole("tab", { name, exact: true }),
        ).toHaveAttribute("aria-selected", "true");
        const ui = await page.evaluate(
          () => window.__buttonAuditSession?.snapshot().ui,
        );
        if (!ui) throw new Error("Missing chart review semantic screen");
        expect(
          observedAria(await page.locator(".clinical-shell").ariaSnapshot()),
        ).toEqual(expectedAria(ui));
      }
      if (capture)
        await page.screenshot({
          path: `${folder}/${persona}-chart-history.png`,
          animations: "disabled",
        });
    }
  });
