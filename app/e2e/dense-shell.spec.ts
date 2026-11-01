import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { enterPatientChart } from "./clinical-navigation";
import { expectedAria, observedAria } from "../src/ehr/ui/fidelity";
import type {} from "../src/core/buttonAudit";
import type { UiNode, UiScreen } from "../src/ehr/ui/types";

// Curated, real source screens. No manufactured chart state or patient URL input.
test("curated dense shell review and semantic fidelity", async ({ page }) => {
  test.skip(!process.env.DENSE_SHOTS, "Opt-in curated screen capture");
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const stage = process.env.DENSE_SHOTS === "before" ? "before" : "after";
  const folder = stage === "before" ? "shots/final/before" : "shots/final";
  mkdirSync(folder, { recursive: true });
  const captures: {
    file: string;
    screen: string | undefined;
    sha256: string;
  }[] = [];
  for (const [persona, name, target] of [
    ["P1", "P1-summary", "summary"],
    ["P1", "P1-orders", "w1Orders"],
    ["P2", "P2-track-board", "landing"],
    ["P2", "P2-chart", "w3Triage"],
    ["P3", "P3-MAR", "w4Mar"],
    ["P4", "P4-growth", "w5Growth"],
    ["P5", "P5-OR", "landing"],
    ["P5", "P5-op-note", "w6OpNote"],
  ] as const) {
    await page.goto(
      `/ehr?mode=replay&audit=buttons&release=v3&persona=${persona}&program=releases/v3/personas/${persona}.json`,
    );
    await expect(
      page.getByRole("textbox", { name: "Patient search by name or MRN" }),
    ).toBeVisible({ timeout: 30000 });
    if (target !== "landing") {
      await enterPatientChart(page);
      if (target === "summary") {
        const current = await page.evaluate(() => window.__buttonAuditSession?.snapshot().state.screen);
        const summary = page
          .getByRole("button", {
            name: /^(Summary|Chart Summary|Patient Summary|Index)$/i,
          })
          .first();
        if (current === "chartSummary") await expect(page.getByRole("heading", { name: "Chart Summary", exact: true })).toBeVisible();
        else if (await summary.count()) await summary.click();
        else if (process.env.DENSE_SHOTS === "after")
          throw new Error("The semantic chart Summary has not landed");
      } else {
        if (await page.getByRole("heading", { name: "Chart Summary", exact: true }).count()) {
          const navigator = { P1: "Visit Navigator", P2: "ED Navigator", P3: "MAR", P4: "Child Health Navigator", P5: "Surgical Navigator" }[persona];
          await page.getByRole("button", { name: navigator, exact: true }).first().click();
        }
        const current = await page.evaluate(
          () => window.__buttonAuditSession?.snapshot().state.screen,
        );
        if (current !== target)
          await page
            .locator(`button[data-comp-id$=".nav.${target}"]`)
            .first()
            .click();
      }
    }
    const model = await page.evaluate(
      () => window.__buttonAuditSession?.snapshot().ui,
    );
    if (!model) throw new Error(`Missing ${name} semantic screen`);
    expect(
      observedAria(await page.locator(".clinical-shell").ariaSnapshot()),
    ).toEqual(expectedAria(model));
    await page.mouse.move(1, 1);
    await page.screenshot({
      path: `${folder}/${name}.png`,
      animations: "disabled",
    });
    captures.push({
      file: `${name}.png`,
      screen: model.screen,
      sha256: createHash("sha256")
        .update(readFileSync(`${folder}/${name}.png`))
        .digest("hex"),
    });
    writeFileSync(
      `${folder}/${name}.ui.json`,
      JSON.stringify(model, null, 2) + "\n",
    );
  }
  writeFileSync(
    `${folder}/manifest.json`,
    JSON.stringify(
      { stage, viewport: [1440, 900], mode: "replay", release: "v3", captures },
      null,
      2,
    ) + "\n",
  );
});

for (const [width, columns] of [
  [1440, "3"],
  [1024, "2"],
  [720, "1"],
] as const) {
  test(`read-only Index cards preserve source order and controls at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/screen-check.html");
    const screen: UiScreen = {
      screen: "card-layout-check",
      banner: [["Patient", "Alex Morgan"]],
      title: "Chart Summary",
      nav: [],
      side: [],
      modal: null,
      workspace: [
        {
          columns: {
            children: [
              "Quick View",
              "Medications",
              "Results",
              "Care Plan",
              "Notes",
              "Encounters",
            ].map((title, index): UiNode => ({
              section: {
                id: `card-${index}`,
                title,
                children: [
                  {
                    info: {
                      comp: `card-${index}.data`,
                      label: title,
                      infoId: `fixture-${index}`,
                      display: "summary",
                      rows: [[["Recorded value", `Source ${index + 1}`]]],
                    },
                  },
                  {
                    button: {
                      comp: `card-${index}.open`,
                      label: `Open ${title}`,
                      role: "nav",
                      enabled: true,
                      blockedReason: null,
                      hotkey: null,
                    },
                  },
                ],
              },
            })),
          },
        },
      ],
    };
    await page.evaluate(
      (model) =>
        window.renderUi(model, (event) => {
          document.documentElement.dataset.denseEvent = JSON.stringify(event);
        }),
      screen,
    );
    const grid = page.locator(".clinical-card-grid");
    await expect(grid).toBeVisible();
    expect(
      await grid.evaluate((element) => getComputedStyle(element).columnCount),
    ).toBe(columns);
    expect(
      observedAria(await page.locator(".clinical-shell").ariaSnapshot()),
    ).toEqual(expectedAria(screen));
    await expect(grid.getByRole("button")).toHaveText([
      "Open Quick View",
      "Open Medications",
      "Open Results",
      "Open Care Plan",
      "Open Notes",
      "Open Encounters",
    ]);
    await grid
      .getByRole("button", { name: "Open Results", exact: true })
      .click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-dense-event",
      JSON.stringify({ click: { comp: "card-2.open" } }),
    );
    const status = page.locator(".workspace-footer");
    const lastButton = grid.getByRole("button").last();
    await lastButton.scrollIntoViewIfNeeded();
    const [last, footer] = await Promise.all([
      lastButton.boundingBox(),
      status.boundingBox(),
    ]);
    if (!last || !footer)
      throw new Error("Missing visible control or status bar");
    expect(last.y + last.height).toBeLessThanOrEqual(footer.y);
  });
}
