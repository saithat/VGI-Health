import { test, expect } from "@playwright/test";
import { inspectVisibility } from "./visibility";
import type {} from "../src/ehr/offline";

test("detects concealing browser styles and occlusion", async ({ page }) => {
  await page.goto("/screen-check.html");
  await page.waitForFunction(() => typeof window.renderEhr === "function");
  await page.evaluate(() =>
    window.renderEhr({
      node: {
        tag: "div",
        attrs: [{ name: "class", value: "ehr-shell" }],
        children: [
          {
            node: {
              tag: "div",
              attrs: [{ name: "data-comp-id", value: "probe" }],
              children: [{ text: { s: "Required visible content" } }],
            },
          },
        ],
      },
    }),
  );
  const component = page.locator('[data-comp-id="probe"]');
  expect(await component.evaluate(inspectVisibility, 12)).toEqual([]);
  for (const [declaration, message] of [
    ["display:none", "zero bounding box"],
    ["position:relative;left:-2000px", "outside the page"],
    ["opacity:0", "invisible ancestor"],
    ["font-size:8px", "font 8px below 12px"],
  ]) {
    const style = await page.addStyleTag({
      content: `[data-comp-id="probe"] {${declaration}}`,
    });
    expect(await component.evaluate(inspectVisibility, 12)).toContain(message);
    await style.evaluate((element) => element.parentNode?.removeChild(element));
  }
  await page.addStyleTag({
    content:
      'body::after {content:"Cover";position:fixed;inset:0;background:white;z-index:999}',
  });
  expect(
    (await component.evaluate(inspectVisibility, 12)).some((error) =>
      error.startsWith("covered"),
    ),
  ).toBe(true);
});
