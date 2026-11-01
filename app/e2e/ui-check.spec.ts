import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { z } from "zod";
import { expectedAria, observedAria } from "../src/ehr/ui/fidelity";
import { uiScreenSchema, type UiNode, type UiScreen } from "../src/ehr/ui/types";
import type {} from "../src/ehr/offline";

const supplied = z.array(z.string()).parse(JSON.parse(process.env.EHR_UI_FILES ?? "[]"));
const fixtures = supplied.length ? supplied : readdirSync("src/fixtures/ui").filter((name) => name.endsWith(".json")).map((name) => resolve("src/fixtures/ui", name));
const minimum = Number(process.env.EHR_MIN_FONT_PX ?? 12);
if (!Number.isFinite(minimum) || minimum < 12) throw new Error("Legibility minimum must be at least 12px");

async function render(page: Page, screen: UiScreen) {
  await page.evaluate((screen) => window.renderUi(screen), screen);
  await page.evaluate(() => document.fonts.ready);
  // Accordion uses transitions. Wait for every expected region to settle.
  await page.waitForTimeout(220);
}
function nodes(tree: UiNode): UiNode[] {
  if ("section" in tree) return [tree, ...tree.section.children.flatMap(nodes)];
  if ("columns" in tree) return [tree, ...tree.columns.children.flatMap(nodes)];
  if ("tabs" in tree) return [tree, ...tree.tabs.body.flatMap(nodes)];
  return [tree];
}
async function visibility(page: Page) {
  const failures = await page.evaluate((min) => {
    const errors: string[] = [];
    const selector = 'header, nav, main h1, section[role="region"], [data-comp-id], [data-info-id] th, [data-info-id] td, [data-info-id] dt, [data-info-id] dd, [data-info-id] li, nav button, [role="tab"], [role="dialog"]';
    for (const el of document.querySelectorAll(selector)) {
      if (el.closest('[aria-hidden="true"]')) continue;
      const id = el.getAttribute("data-comp-id") || el.getAttribute("aria-label") || el.textContent?.slice(0, 60) || el.tagName;
      el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) errors.push(`${id}: zero bounding box`);
      if (rect.left < -1 || rect.right > document.documentElement.clientWidth + 1) errors.push(`${id}: horizontal overflow`);
      for (let ancestor: Element | null = el; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        if (style.visibility !== "visible" || Number(style.opacity) === 0 || style.display === "none") errors.push(`${id}: invisible ancestor`);
      }
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let text = walk.nextNode(); text; text = walk.nextNode()) {
        const parent = text.parentElement;
        if (!parent || !text.textContent?.trim() || parent.closest('[aria-hidden="true"], svg')) continue;
        if (getComputedStyle(parent).display === "none" || !parent.getClientRects().length) continue;
        const size = Number.parseFloat(getComputedStyle(parent).fontSize);
        if (size < min) errors.push(`${id}: text ${size}px below ${min}px`);
      }
      if (el.matches('button, input, [data-comp-id][data-event], h1, th, td, dt, dd, li')) {
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        const parentHit = hit?.contains(el) && getComputedStyle(el).pointerEvents === "none";
        if (!hit || (!el.contains(hit) && !parentHit)) errors.push(`${id}: covered by ${hit?.tagName ?? "nothing"}`);
      }
    }
    window.scrollTo(0, 0);
    return Array.from(new Set(errors));
  }, minimum);
  expect(failures).toEqual([]);
}
for (const file of fixtures) test(`semantic UI fidelity: ${file}`, async ({ page, baseURL }) => {
  const screen = uiScreenSchema.parse(JSON.parse(readFileSync(file, "utf8")));
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.route("**/*", (route) => new URL(route.request().url()).origin === baseURL ? route.continue() : route.abort());
  await page.goto("/screen-check.html");
  await page.waitForFunction(() => typeof window.renderUi === "function");
  await render(page, screen);
  expect(observedAria(await page.locator("body").ariaSnapshot())).toEqual(expectedAria(screen));
  if (screen.modal) {
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeVisible();
    await visibility(page);
    // Background must also pass fidelity once the blocking alert is acknowledged.
    await render(page, { ...screen, modal: null });
    expect(observedAria(await page.locator("body").ariaSnapshot())).toEqual(expectedAria({ ...screen, modal: null }));
  }
  await visibility(page);
  // Every record cell and banner value must survive painting, including rows after
  // the first one. Values are data, not FHIR/clinical interpretation in React.
  for (const [, value] of screen.banner) if (value) await expect(page.getByRole("banner")).toContainText(value);
  const infos = [...screen.workspace, ...screen.side].flatMap(nodes).flatMap((node) => "info" in node ? [node.info] : []);
  for (const [index, info] of infos.entries()) {
    const panel = page.locator("[data-info-id]").nth(index);
    for (const row of info.rows) for (const [, value] of row) if (value) await expect(panel).toContainText(value);
  }
  expect(browserErrors).toEqual([]);
});
