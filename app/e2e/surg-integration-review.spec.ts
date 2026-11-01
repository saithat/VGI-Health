import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { uiScreenSchema } from "../src/ehr/ui/types";
import { expectedAria, observedAria } from "../src/ehr/ui/fidelity";
import type {} from "../src/ehr/offline";

const root = process.env.EHR_MERGE_REVIEW_ROOT;
const names = process.env.EHR_MERGE_REVIEW_NAMES?.split(",") ?? [
  "p1-home",
  "p4-growth",
  "p5-or-schedule",
  "p5-op-note",
];
const output =
  process.env.EHR_MERGE_REVIEW_SHOT_DIR ?? "shots/realism/surg/integration";
for (const name of names) {
  test(`integrated ambulatory/surgery review: ${name}`, async ({ page }) => {
    test.skip(!root, "Provide current native Lean review screens");
    if (!root) throw new Error("EHR_MERGE_REVIEW_ROOT is required");
    const screen = uiScreenSchema.parse(
      JSON.parse(readFileSync(join(root, `${name}.json`), "utf8")),
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/screen-check.html");
    await page.waitForFunction(() => typeof window.renderUi === "function");
    await page.evaluate((value) => window.renderUi(value), screen);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      screen.title,
    );
    expect(observedAria(await page.locator("body").ariaSnapshot())).toEqual(
      expectedAria(screen),
    );
    await page.mouse.move(0, 0);
    mkdirSync(output, { recursive: true });
    await page.screenshot({
      path: join(output, `${name}.png`),
      animations: "disabled",
    });
  });
}
