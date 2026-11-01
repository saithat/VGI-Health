import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { z } from "zod";
import { inspectVisibility } from "./visibility";
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
  test(`visible components: ${file}`, async ({ page, baseURL }) => {
    const tree = htmlSchema.parse(JSON.parse(readFileSync(file, "utf8")));
    const expected = componentIds(tree);
    const browserErrors: string[] = [];
    const externalRequests: string[] = [];
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.origin === new URL(baseURL ?? "http://127.0.0.1:4179").origin) return route.continue();
      externalRequests.push(url.origin);
      return route.abort();
    });
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
      const failures = await component.evaluate(inspectVisibility, minimum);
      expect(failures, `${file}: component #${i} ${expected[i]}`).toEqual([]);
    }
    expect(browserErrors).toEqual([]);
    expect(externalRequests).toEqual([]);
  });
