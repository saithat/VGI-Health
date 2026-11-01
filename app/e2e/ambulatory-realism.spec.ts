import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { expectedAria, observedAria } from "../src/ehr/ui/fidelity";
import { uiScreenSchema, type UiNode } from "../src/ehr/ui/types";
import type {} from "../src/ehr/offline";

// Opt-in review of actual native Lean output, including every ambulatory screen.
// Run after builds finish; this suite uses one browser and no build process.
const root = process.env.EHR_AMB_UI_ROOT;
const phase = process.env.EHR_AMB_SHOT_PHASE ?? "after";
const output = "shots/realism/amb";
function descendants(node: UiNode): UiNode[] {
  if ("valueSet" in node)
    return [node, ...node.valueSet.children.flatMap(descendants)];
  if ("chartReferences" in node)
    return [node, ...node.chartReferences.children.flatMap(descendants)];
  if ("rowAction" in node)
    return [node, ...node.rowAction.children.flatMap(descendants)];
  if ("presentation" in node)
    return [node, ...node.presentation.children.flatMap(descendants)];
  if ("section" in node)
    return [node, ...node.section.children.flatMap(descendants)];
  if ("columns" in node)
    return [node, ...node.columns.children.flatMap(descendants)];
  if ("tabs" in node) return [node, ...node.tabs.body.flatMap(descendants)];
  return [node];
}
for (const persona of ["P1", "P4"]) {
  const directory = root ? join(root, persona) : undefined;
  const screens = directory
    ? readdirSync(directory).filter((name) =>
        /^(home|w[1257][A-Za-z]+)\.json$/.test(name),
      )
    : [];
  for (const name of screens) {
    test(`${phase}: ${persona}/${name}`, async ({ page }) => {
      if (!directory) throw new Error("EHR_AMB_UI_ROOT is required");
      const screen = uiScreenSchema.parse(
        JSON.parse(readFileSync(join(directory, name), "utf8")),
      );
      mkdirSync(output, { recursive: true });
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/screen-check.html");
      await page.waitForFunction(() => typeof window.renderUi === "function");
      await page.evaluate(
        (value) =>
          window.renderUi(value, (event) => {
            document.documentElement.dataset.lastUiEvent =
              JSON.stringify(event);
          }),
        screen,
      );
      await page.evaluate(() => document.fonts.ready);
      await expect(page.getByRole("main")).toBeVisible();
      expect(observedAria(await page.locator("body").ariaSnapshot())).toEqual(
        expectedAria(screen),
      );
      await page.screenshot({
        path: join(
          output,
          `${phase}-${persona}-${name.replace(".json", ".png")}`,
        ),
        animations: "disabled",
      });
      if (phase === "after") {
        const identity = screen.workspace
          .flatMap(descendants)
          .find((node) => "field" in node && node.field.kind === "identity");
        if (identity && "field" in identity) {
          const identityControl = page.locator(
            `[data-comp-id="${identity.field.comp}"][data-event="enter"]`,
          );
          await identityControl.evaluate((element) =>
            element.scrollIntoView({ block: "center", behavior: "instant" }),
          );
          await expect(identityControl).toBeInViewport({ ratio: 1 });
          await page.evaluate(
            () =>
              new Promise<void>((resolve) =>
                requestAnimationFrame(() =>
                  requestAnimationFrame(() => resolve()),
                ),
              ),
          );
          await page.screenshot({
            path: join(
              output,
              `${phase}-${persona}-${name.replace(".json", "-signature.png")}`,
            ),
            animations: "disabled",
          });
        }
        // Native audit checks effects; this half checks that the actual painter
        // sends each visible button's exact declared event, including shell nav.
        const buttons = [...screen.workspace, ...screen.side]
          .flatMap(descendants)
          .flatMap((node) =>
            "button" in node && node.button.enabled ? [node.button] : [],
          );
        const nav = screen.nav.flatMap(([, items]) =>
          items.map(([comp, label]) => ({ comp, label, role: "nav" })),
        );
        for (const button of [...buttons, ...nav]) {
          const kind =
            button.role === "confirm"
              ? "confirm"
              : button.role === "ack"
                ? "ack"
                : "click";
          await page.evaluate(() => {
            delete document.documentElement.dataset.lastUiEvent;
          });
          await page
            .locator(`[data-comp-id="${button.comp}"][data-event="${kind}"]`)
            .click();
          const expected =
            button.role === "confirm"
              ? { confirm: { comp: button.comp } }
              : button.role === "ack"
                ? { ack: { alert: button.comp } }
                : { click: { comp: button.comp } };
          await expect
            .poll(() =>
              page.evaluate(() =>
                JSON.parse(
                  document.documentElement.dataset.lastUiEvent ?? "null",
                ),
              ),
            )
            .toEqual(expected);
        }
      }
    });
  }
}
