import { expect, test } from "@playwright/test";
import { waitForCaptureFonts } from "./capture-environment";
import type { UiScreen } from "../src/ehr/ui/types";
import type {} from "../src/ehr/offline";

test.use({ viewport: { width: 1440, height: 900 } });

test("late urgent alerts reserve space and preserve patient identity through scroll and resize", async ({ page }) => {
  const screen: UiScreen = {
    banner: [["Patient", "Alex Morgan"], ["MRN", "123456"]],
    nav: [["Chart", [["review", "Review"]]]],
    title: "Review",
    workspace: [],
    side: [],
    modal: null,
  };
  const urgent: UiScreen["urgent"] = Array.from({ length: 3 }, (_, index) => ({
    alert: {
      comp: `urgent:${index}`,
      alertId: `alert:${index}`,
      label: `Urgent clinical alert ${index}: review this persistent condition before continuing care. Confirm the active patient and the required review with the care team.`,
      severity: "interruptive",
    },
  }));
  await page.goto("/screen-check.html");
  await page.waitForFunction(() => typeof window.renderUi === "function");
  const render = async (value: UiScreen) => {
    await page.evaluate(value => window.renderUi(value), value);
    await waitForCaptureFonts(page);
  };
  await render(screen);
  await render({ ...screen, urgent });
  const strip = page.locator(".urgent-alert-strip");
  const banner = page.locator(".clinical-banner");
  const separated = async () => {
    const bounds = await strip.boundingBox();
    const patient = await banner.boundingBox();
    if (!bounds || !patient) throw new Error("Urgent strip and patient banner must be visible");
    expect(patient.y).toBeGreaterThanOrEqual(bounds.y + bounds.height - 1);
  };
  await separated();
  // A long chart must keep both fixed layers visible after document scrolling.
  await page.locator("main").evaluate(element => {
    if (element instanceof HTMLElement) element.style.minHeight = "3000px";
  });
  await page.evaluate(() => window.scrollTo(0, 500));
  await separated();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  const wideHeight = await strip.evaluate(element => element.getBoundingClientRect().height);
  await page.setViewportSize({ width: 1100, height: 900 });
  await waitForCaptureFonts(page);
  await separated();
  expect(await strip.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(wideHeight);
  const padding = await page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop));
  const bounds = await banner.boundingBox();
  if (!bounds) throw new Error("Patient banner must be visible");
  expect(padding).toBeGreaterThanOrEqual(bounds.y + bounds.height);
  await render(screen);
  await expect(strip).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  const restored = await banner.boundingBox();
  if (!restored) throw new Error("Patient banner must remain visible after alert removal");
  expect(restored.y).toBe(0);
});
