import { mkdirSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { uiScreenSchema } from "../src/ehr/ui/types";
import type {} from "../src/ehr/offline";

test.skip(!process.env.EHR_SHOTS, "Review screenshots run with pnpm --filter app shots");
for (const [name, file] of [["p1-rooming", "w1Rooming"], ["p1-orders", "w1Orders"], ["p1-sign", "w1Sign"], ["p1-alert", "p1-alert"], ["bad-sign", "bad-sign"]]) {
  test(`review shot: ${name}`, async ({ page }) => {
    mkdirSync("shots", { recursive: true });
    const screen = uiScreenSchema.parse(JSON.parse(readFileSync(`src/fixtures/ui/${file}.json`, "utf8")));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/screen-check.html");
    await page.waitForFunction(() => typeof window.renderUi === "function");
    await page.evaluate((screen) => window.renderUi(screen), screen);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole(screen.modal ? "dialog" : "main")).toBeVisible();
    await page.screenshot({ path: `shots/${name}.png`, animations: "disabled" });
  });
}
