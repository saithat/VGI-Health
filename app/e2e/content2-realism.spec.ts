import { readdirSync, readFileSync, mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { uiScreenSchema } from "../src/ehr/ui/types";
import { expectedAria, observedAria } from "../src/ehr/ui/fidelity";
import type {} from "../src/ehr/offline";

test("world content screenshots and ARIA", async ({ page }) => {
  test.skip(!process.env.CONTENT2_SHOTS, "Opt-in world-content visual review");
  test.setTimeout(180000);
  const phase = process.env.CONTENT2_SHOTS;
  const folder = `shots/realism/content2/${phase}`;
  mkdirSync(folder, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/screen-check.html");
  await page.waitForFunction(() => typeof window.renderUi === "function");
  for (const name of readdirSync(folder).filter(f => f.endsWith(".json") && !f.includes("input") && f !== "summary.json")) {
    const screen = uiScreenSchema.parse(JSON.parse(readFileSync(`${folder}/${name}`, "utf8")));
    await page.evaluate(screen => window.renderUi(screen), screen);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole("main")).toBeVisible();
    expect(observedAria(await page.locator(".clinical-shell").ariaSnapshot())).toEqual(expectedAria(screen));
    if (name === "problem-list.json")
      await page.locator('[data-info-id="problemList"]').first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${folder}/${name.replace(".json", ".png")}`, animations: "disabled" });
  }
});
