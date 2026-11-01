import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { uiScreenSchema } from "../src/ehr/ui/types";
import { expectedAria, observedAria } from "../src/ehr/ui/fidelity";
import type {} from "../src/ehr/offline";

test.skip(
  !process.env.EHR_PRESENT_SHOTS,
  "Run with EHR_PRESENT_SHOTS=1 for visual review",
);
const files = readdirSync("src/fixtures/presentations").filter((file) =>
  file.endsWith(".json"),
);
for (const file of files) {
  test(`structured presentation review: ${file}`, async ({ page }) => {
    const screen = uiScreenSchema.parse(
      JSON.parse(readFileSync(`src/fixtures/presentations/${file}`, "utf8")),
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/screen-check.html");
    await page.waitForFunction(() => typeof window.renderUi === "function");
    await page.evaluate((screen) => window.renderUi(screen), screen);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole("main")).toBeVisible();
    expect(observedAria(await page.locator("body").ariaSnapshot())).toEqual(
      expectedAria(screen),
    );
    mkdirSync("shots/realism/present", { recursive: true });
    const name = file.replace(/\.json$/, "");
    await page.screenshot({
      path: `shots/realism/present/${name}.png`,
      animations: "disabled",
    });
    await page.screenshot({
      path: `shots/realism/present/${name}-full.png`,
      fullPage: true,
      animations: "disabled",
    });
  });
}
