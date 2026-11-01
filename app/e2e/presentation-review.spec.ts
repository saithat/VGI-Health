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
    const unreadable = await page
      .locator(".presentation-status")
      .evaluateAll((elements) => {
        const rgb = (value: string) =>
          (value.match(/[\d.]+/g) ?? []).map(Number);
        const luminance = (channels: number[]) => {
          const linear = channels
            .slice(0, 3)
            .map((value) =>
              value / 255 <= 0.04045
                ? value / 255 / 12.92
                : ((value / 255 + 0.055) / 1.055) ** 2.4,
            );
          return (
            (linear[0] ?? 0) * 0.2126 +
            (linear[1] ?? 0) * 0.7152 +
            (linear[2] ?? 0) * 0.0722
          );
        };
        return elements.flatMap((element) => {
          const ink = luminance(rgb(getComputedStyle(element).color));
          let current: Element | null = element;
          let background = [255, 255, 255];
          while (current) {
            const channels = rgb(getComputedStyle(current).backgroundColor);
            if (channels.length === 3 || channels[3] === 1) {
              background = channels;
              break;
            }
            current = current.parentElement;
          }
          const surface = luminance(background);
          const ratio =
            (Math.max(ink, surface) + 0.05) / (Math.min(ink, surface) + 0.05);
          return ratio < 4.5 ? [{ text: element.textContent, ratio }] : [];
        });
      });
    expect(unreadable).toEqual([]);
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
