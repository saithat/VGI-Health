import { expect, test } from "@playwright/test";
import tableFixture from "../src/fixtures/presentations/table.json" with { type: "json" };
import fixture from "../src/fixtures/punch/P5-op-note.json" with { type: "json" };
import { uiScreenSchema, type UiNode } from "../src/ehr/ui/types";
import { waitForCaptureFonts } from "./capture-environment";
import { physicalBounds } from "./physical-policy";
import type {} from "../src/ehr/offline";

function componentIds(nodes: UiNode[]): string[] {
  return nodes.flatMap((node) => {
    if ("section" in node)
      return [node.section.id, ...componentIds(node.section.children)];
    if ("tabs" in node) return [node.tabs.id, ...componentIds(node.tabs.body)];
    if ("columns" in node) return componentIds(node.columns.children);
    if ("presentation" in node) return componentIds(node.presentation.children);
    if ("valueSet" in node) return componentIds(node.valueSet.children);
    if ("chartReferences" in node)
      return componentIds(node.chartReferences.children);
    if ("field" in node) return [node.field.comp];
    if ("info" in node) return [node.info.comp];
    if ("button" in node) return [node.button.comp];
    return [];
  });
}

for (const scope of ["components", "sections"] as const) {
  test(`compact ${scope} reduce long-form scroll height without losing components`, async ({
    page,
  }) => {
    await page.goto("/screen-check.html");
    await page.waitForFunction(() => typeof window.renderUi === "function");
    // Isolate the long form from the taller automatic review rail at desktop.
    const normal = uiScreenSchema.parse({ ...fixture, side: [] });
    const ids = componentIds(normal.workspace);
    const compact = {
      ...normal,
      compact: ids.filter((id) =>
        scope === "sections"
          ? normal.workspace.some((n) => "section" in n && n.section.id === id)
          : !normal.workspace.some(
              (n) => "section" in n && n.section.id === id,
            ),
      ),
    };
    const measure = async (screen: typeof normal) => {
      await page.evaluate((screen) => window.renderUi(screen), screen);
      await waitForCaptureFonts(page);
      await page.evaluate(
        () =>
          new Promise<void>((done) =>
            requestAnimationFrame(() => requestAnimationFrame(() => done())),
          ),
      );
      return page.evaluate(() => ({
        height: document.querySelector("main")?.scrollHeight ?? 0,
        ids: [...document.querySelectorAll<HTMLElement>("[data-comp-id]")]
          .map((el) => el.dataset.compId)
          .sort(),
        fonts: [
          ...document.querySelectorAll<HTMLElement>("[data-comp-id]"),
        ].map((el) => getComputedStyle(el).fontSize),
      }));
    };
    const before = await measure(normal);
    const after = await measure(compact);
    const viewport = page.viewportSize();
    if (!viewport) throw new Error("Missing fixed viewport");
    expect(before.height).toBeGreaterThan(viewport.height);
    expect(after.height).toBeLessThan(before.height);
    expect(after.ids).toEqual(before.ids);
    expect(after.fonts).toEqual(before.fonts);
    expect(
      await page.locator('[data-density="compact"]').count(),
    ).toBeGreaterThan(0);
    expect((await physicalBounds(page)).findings).toEqual([]);
    console.log(
      JSON.stringify({
        scope,
        viewport: page.viewportSize(),
        normal: before.height,
        compact: after.height,
        components: after.ids.length,
      }),
    );
  });
}

test("compact tables retain every cell with less vertical padding", async ({
  page,
}) => {
  await page.goto("/screen-check.html");
  await page.waitForFunction(() => typeof window.renderUi === "function");
  const normal = uiScreenSchema.parse(tableFixture);
  const measure = async (compact?: string[]) => {
    await page.evaluate((screen) => window.renderUi(screen), {
      ...normal,
      ...(compact ? { compact } : {}),
    });
    await waitForCaptureFonts(page);
    return page
      .locator("table")
      .first()
      .evaluate((table) => ({
        height: table.getBoundingClientRect().height,
        cells: [...table.querySelectorAll("th,td")].map(
          (cell) => cell.textContent,
        ),
        padding: parseFloat(
          getComputedStyle(table.querySelector("td") ?? table).paddingTop,
        ),
      }));
  };
  const before = await measure();
  const after = await measure(componentIds(normal.workspace));
  expect(after.cells).toEqual(before.cells);
  expect(after.padding).toBeLessThan(before.padding);
  expect(after.height).toBeLessThan(before.height);
  expect((await physicalBounds(page)).findings).toEqual([]);
});
