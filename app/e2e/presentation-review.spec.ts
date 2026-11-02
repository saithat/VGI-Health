import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { uiScreenSchema } from "../src/ehr/ui/types";
import { expectedAria, observedAria } from "../src/ehr/ui/fidelity";
import type {} from "../src/ehr/offline";

const files = readdirSync("src/fixtures/presentations").filter((file) =>
  file.endsWith(".json"),
);
const width = process.env.EHR_PRESENT_WIDTH
  ? Number(process.env.EHR_PRESENT_WIDTH)
  : undefined;
for (const file of files) {
  test(`structured presentation review: ${file}`, async ({ page }) => {
    const screen = uiScreenSchema.parse(
      JSON.parse(readFileSync(`src/fixtures/presentations/${file}`, "utf8")),
    );
    if (width) await page.setViewportSize({ width, height: 900 });
    await page.goto("/screen-check.html");
    await page.waitForFunction(() => typeof window.renderUi === "function");
    await page.evaluate((screen) => window.renderUi(screen), screen);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole("main")).toBeVisible();
    expect(observedAria(await page.locator("body").ariaSnapshot())).toEqual(
      expectedAria(screen),
    );
    const unreadable = await page
      .locator(".presentation-status, .presentation-table th")
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
    if (process.env.EHR_PRESENT_SHOTS) {
      mkdirSync("shots/realism/present", { recursive: true });
      const shotWidth = width ?? page.viewportSize()?.width ?? 1440;
      const name =
        file.replace(/\.json$/, "") +
        (shotWidth === 1440 ? "" : `-${shotWidth}`);
      await page.screenshot({
        path: `shots/realism/present/${name}.png`,
        animations: "disabled",
      });
      await page.screenshot({
        path: `shots/realism/present/${name}-full.png`,
        fullPage: true,
        animations: "disabled",
      });
    }
    const brokenWords = await page
      .locator(".presentation-status, .presentation-table th")
      .evaluateAll((elements) =>
        elements.flatMap((element) => {
          const broken: string[] = [];
          const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
          );
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            for (const word of (node.textContent ?? "").matchAll(
              /[A-Za-z]{4,}/g,
            )) {
              const range = document.createRange();
              range.setStart(node, word.index);
              range.setEnd(node, word.index + word[0].length);
              if (range.getClientRects().length > 1) broken.push(word[0]);
            }
          }
          return broken;
        }),
      );
    expect(brokenWords).toEqual([]);
  });
}
