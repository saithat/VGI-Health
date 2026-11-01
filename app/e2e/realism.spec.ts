import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

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
      await expect(page.getByRole("region", { name: "Version history" })).toBeVisible();
    if (name === "browse" && process.env.REALISM_SHOTS !== "before")
      await expect(page.locator('[data-node-key="P3-5"]')).toBeVisible();
    await page.screenshot({
      path: `${folder}/${name}.png`,
      animations: "disabled",
    });
  }
  for (const [persona, screen] of [
    ["P1", "w1Orders"],
    ["P2", "w3Triage"],
    ["P3", "w4Mar"],
  ] as const) {
    await page.goto(
      `/ehr?mode=replay&release=v1&persona=${persona}&program=releases/v1/personas/${persona}.json`,
    );
    await expect(page.locator(".clinical-app")).toBeVisible();
    await page
      .locator(
        `[data-comp-id="home.work.${persona === "P1" ? "w1Rooming" : persona === "P2" ? "w3TrackBoard" : "w4Worklist"}"][data-event]`,
      )
      .click();
    const destination = page.locator(
      `button[data-comp-id$=".nav.${screen}"][data-event]`,
    );
    await destination.click();
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
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/browse");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  if (process.env.REALISM_SHOTS !== "before") await expect(page.locator('[data-node-key="P3-5"]')).toBeVisible();
  await page.screenshot({
    path: `${folder}/browse-narrow.png`,
    animations: "disabled",
  });
});
