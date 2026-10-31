import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { z } from "zod";
import { htmlSchema, type Html } from "../src/ehr/html";
import type {} from "../src/ehr/offline";

const files = z
  .array(z.string())
  .min(1)
  .parse(JSON.parse(process.env.EHR_SCREEN_FILES ?? "[]"));
const minimum = Number(process.env.EHR_MIN_FONT_PX ?? 12);
if (!Number.isFinite(minimum) || minimum < 12)
  throw new Error("Legibility minimum must be at least 12px");
function componentIds(tree: Html): string[] {
  if ("text" in tree) return [];
  const id = tree.node.attrs.find((a) => a.name === "data-comp-id")?.value;
  return [
    ...(id === undefined ? [] : [id]),
    ...tree.node.children.flatMap(componentIds),
  ];
}
for (const file of files)
  test(`visible components: ${file}`, async ({ page }) => {
    const tree = htmlSchema.parse(JSON.parse(readFileSync(file, "utf8")));
    const expected = componentIds(tree);
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    await page.goto("/screen-check.html");
    await page.waitForFunction(() => typeof window.renderEhr === "function");
    await page.evaluate((tree) => window.renderEhr(tree), tree);
    await page.evaluate(() => document.fonts.ready);
    const components = page.locator("[data-comp-id]");
    expect(
      await components.evaluateAll((nodes) =>
        nodes.map((n) => n.getAttribute("data-comp-id")),
      ),
    ).toEqual(expected);
    for (let i = 0; i < expected.length; i++) {
      const component = components.nth(i);
      const failures = await component.evaluate((element, minimum) => {
        const errors: string[] = [];
        const initial = element.getBoundingClientRect();
        // Long pages may scroll vertically. Horizontal off-page content is a failure.
        window.scrollTo(
          0,
          window.scrollY +
            initial.top +
            initial.height / 2 -
            window.innerHeight / 2,
        );
        const rect = element.getBoundingClientRect();
        const doc = document.documentElement;
        const docTop = rect.top + window.scrollY;
        if (rect.width <= 0 || rect.height <= 0)
          errors.push("zero bounding box");
        if (
          rect.left < 0 ||
          rect.right > doc.clientWidth + 1 ||
          docTop < 0 ||
          docTop + rect.height > doc.scrollHeight + 1
        )
          errors.push("outside the page");
        const cx = rect.left + rect.width / 2,
          cy = rect.top + rect.height / 2;
        const hit = document.elementFromPoint(cx, cy);
        if (!hit || !(hit === element || element.contains(hit)))
          errors.push(
            `covered or off-screen at center (${hit?.tagName ?? "no hit"})`,
          );
        for (
          let ancestor: Element | null = element;
          ancestor;
          ancestor = ancestor.parentElement
        ) {
          const style = getComputedStyle(ancestor);
          if (Number(style.opacity) <= 0 || style.visibility !== "visible")
            errors.push("invisible ancestor");
        }
        for (const child of [element, ...element.querySelectorAll("*")]) {
          const style = getComputedStyle(child);
          if (Number(style.opacity) <= 0) errors.push("transparent content");
          if (parseFloat(style.fontSize) < minimum)
            errors.push(`font ${style.fontSize} below ${minimum}px`);
        }
        return errors;
      }, minimum);
      expect(failures, `${file}: component #${i} ${expected[i]}`).toEqual([]);
    }
    expect(browserErrors).toEqual([]);
  });
