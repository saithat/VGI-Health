import { mkdirSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { uiScreenSchema } from "../src/ehr/ui/types";
import type {} from "../src/ehr/offline";

test("shared shell and browser visual review", async ({ page }) => {
  test.skip(!process.env.REALISM_SHOTS, "Opt-in visual review capture");
  test.setTimeout(120000);
  const folder = `shots/realism/shell/${process.env.REALISM_SHOTS}`;
  mkdirSync(folder, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [name, route] of [
    ["browse", "/browse"],
    ["dashboard", "/dashboard?run=run1-P3"],
  ] as const) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (name === "dashboard")
      await expect(
        page.getByRole("region", { name: "Version history" }),
      ).toBeVisible();
    if (name === "browse" && process.env.REALISM_SHOTS !== "before")
      await expect(page.locator('[data-node-key="P3-5"]')).toBeVisible();
    await page.screenshot({
      path: `${folder}/${name}.png`,
      animations: "disabled",
    });
  }
  for (const [persona, entry, screen] of [
    ["P1", "w1Rooming", "w1Orders"],
    ["P2", "w3TrackBoard", "w3Triage"],
    ["P3", "w4Worklist", "w4Mar"],
    ["P4", "w5Rooming", "w5Growth"],
    ["P5", "w6PreOp", "w6PreOp"],
  ] as const) {
    await page.goto(
      `/ehr?mode=replay&release=v1&persona=${persona}&program=releases/v1/personas/${persona}.json`,
    );
    await expect(page.locator(".clinical-app")).toBeVisible();
    await page
      .locator(`[data-comp-id="home.work.${entry}"][data-event]`)
      .click();
    const destination = page.locator(
      `button[data-comp-id$=".nav.${screen}"][data-event]`,
    );
    if (screen !== entry) await destination.click();
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(
      "Patient workspace",
    );
    await page.screenshot({
      path: `${folder}/${screen}.png`,
      animations: "disabled",
    });
  }
  if (process.env.REALISM_SHOTS !== "before") {
    await page.goto(
      "/ehr?mode=replay&release=v3&program=releases/v3/personas/P1.json&persona=P1&patient=sh-f55e5d3f-2686-5180-a2a5-e17365fdb89d",
    );
    await page.getByRole("tab", { name: "Notes", exact: true }).click();
    await expect(page.locator(".clinical-note-card").first()).toBeVisible();
    await page.locator(".clinical-note-card").first().scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `${folder}/chart-notes.png`,
      animations: "disabled",
    });
    await page.locator(".clinical-home-meds").first().scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `${folder}/home-medications.png`,
      animations: "disabled",
    });
    await page.goto("/screen-check.html");
    await page.waitForFunction(() => typeof window.renderUi === "function");
    const alert = uiScreenSchema.parse(
      JSON.parse(readFileSync("src/fixtures/ui/p1-alert.json", "utf8")),
    );
    await page.evaluate((screen) => window.renderUi(screen), alert);
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.screenshot({
      path: `${folder}/interruptive-alert.png`,
      animations: "disabled",
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/browse");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  if (process.env.REALISM_SHOTS !== "before")
    await expect(page.locator('[data-node-key="P3-5"]')).toBeVisible();
  await page.screenshot({
    path: `${folder}/browse-narrow.png`,
    animations: "disabled",
  });
});
