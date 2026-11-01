import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { expectedAria, observedAria } from "../src/ehr/ui/fidelity";
import type {} from "../src/core/buttonAudit";

test("clinical inspector requires explicit debug mode", async ({ page }) => {
  await page.goto("/ehr?mode=replay&persona=P1");
  await expect(page.locator(".clinical-app")).toBeVisible();
  await expect(page.getByRole("button", { name: "Inspector", exact: true })).toHaveCount(0);
  await page.goto("/ehr?mode=replay&persona=P1&inspect=1");
  await expect(page.locator(".clinical-app")).toBeVisible();
  await page.getByRole("button", { name: "Inspector", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Encounter inspector" })).toBeVisible();
  await page.getByRole("button", { name: "Close inspector", exact: true }).click();
});

test("shared clinical display polish review", async ({ page }) => {
  test.skip(!process.env.POLISH_SHOTS, "Opt-in shared painter review");
  test.setTimeout(120000);
  const phase = process.env.POLISH_SHOTS;
  const folder = `shots/realism/shell-polish/${phase}`;
  mkdirSync(folder, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [persona, entry, target] of [
    ["P1", "w1Rooming", "w1Orders"],
    ["P2", "w3TrackBoard", "w3Triage"],
    ["P3", "w4Worklist", "w4Mar"],
    ["P4", "w5Rooming", "w5Rooming"],
    ["P5", "w6PreOp", "w6OpNote"],
  ] as const) {
    await page.goto(
      `/ehr?mode=replay&audit=buttons&release=v3&persona=${persona}&program=releases/v3/personas/${persona}.json`,
    );
    await expect(page.locator(".clinical-app")).toBeVisible();
    await page.locator(`[data-comp-id="home.work.${entry}"][data-event]`).click();
    if (target !== entry)
      await page.locator(`button[data-comp-id$=".nav.${target}"][data-event]`).click();
    if (phase !== "before") {
      await expect(page.getByRole("button", { name: "Inspector", exact: true })).toHaveCount(0);
      const semantic = await page.evaluate(() => window.__buttonAuditSession?.snapshot().ui);
      if (!semantic) throw new Error(`Missing ${persona} semantic screen`);
      expect(observedAria(await page.locator(".clinical-shell").ariaSnapshot())).toEqual(expectedAria(semantic));
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.mouse.move(1, 1);
    await page.screenshot({ path: `${folder}/${target}.png`, animations: "disabled" });
  }
});
