import { enterPatientChart } from "./clinical-navigation";
import { catalogSchema } from "../src/browser/data";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { uiScreenSchema } from "../src/ehr/ui/types";
import type { NodeOf, UiNode } from "../src/ehr/ui/types";
import { expectedAria, observedAria } from "../src/ehr/ui/fidelity";
import type {} from "../src/core/buttonAudit";
import type {} from "../src/ehr/offline";

function infoNodes(nodes: UiNode[]): NodeOf<"info">[] {
  return nodes.flatMap((node) => {
    if ("info" in node) return [node.info];
    if ("section" in node) return infoNodes(node.section.children);
    if ("presentation" in node) return infoNodes(node.presentation.children);
    if ("columns" in node) return infoNodes(node.columns.children);
    if ("rowAction" in node) return infoNodes(node.rowAction.children);
    if ("tabs" in node) return infoNodes(node.tabs.body);
    return [];
  });
}

test("shared shell and browser visual review", async ({ page }) => {
  test.skip(!process.env.REALISM_SHOTS, "Opt-in visual review capture");
  test.setTimeout(120000);
  const folder = `shots/realism/shell/${process.env.REALISM_SHOTS}`;
  mkdirSync(folder, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [name, route] of [
    ["browse", "/browse"],
    ["dashboard", "/dashboard?run=run1-P3"],
  ] as const) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (name === "dashboard")
      await expect(
        page.getByRole("region", { name: "Version history" }),
      ).toBeVisible();
    if (name === "browse" && process.env.REALISM_SHOTS !== "before")
      await expect(page.locator('[data-node-key="P3-5"]')).toBeVisible();
    await page.mouse.move(1, 1);
    await page.screenshot({
      path: `${folder}/${name}.png`,
      animations: "disabled",
    });
  }
  for (const [persona, entry, screen] of [
    ["P1", "w1Rooming", "w1Orders"],
    ["P2", "w3TrackBoard", "w3Triage"],
    ["P3", "w4Worklist", "w4Mar"],
    ["P4", "w5Rooming", "w5Growth"],
    ["P5", "w6Schedule", "w6PreOp"],
  ] as const) {
    await page.goto(
      `/ehr?mode=replay&audit=buttons&release=v1&persona=${persona}&program=releases/v1/personas/${persona}.json`,
    );
    await expect(page.locator(".clinical-app")).toBeVisible();
    if (!(await enterPatientChart(page)))
      await page
        .locator(`[data-comp-id="home.work.${entry}"][data-event]`)
        .click();
    if (process.env.REALISM_SHOTS !== "before") {
      const navigator = page.getByRole("navigation", {
        name: "Clinical navigation",
      });
      await expect(
        navigator.locator("button[data-comp-id]").first(),
      ).toBeVisible();

      await expect(navigator).not.toHaveClass(/empty-navigator/);
    }
    const destination = page.locator(
      `button[data-comp-id$=".nav.${screen}"][data-event]`,
    );
    const state = await page.evaluate(
      () => window.__buttonAuditSession?.snapshot().state.screen,
    );
    if (state !== screen) await destination.click();
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(
      "Patient workspace",
    );
    if (process.env.REALISM_SHOTS !== "before") {
      const semantic = await page.evaluate(
        () => window.__buttonAuditSession?.snapshot().ui,
      );
      if (!semantic) throw new Error(`Missing ${persona} semantic screen`);
      expect(
        observedAria(await page.locator(".clinical-shell").ariaSnapshot()),
      ).toEqual(expectedAria(semantic));
    }
    await page.mouse.move(1, 1);
    await page.screenshot({
      path: `${folder}/${screen}.png`,
      animations: "disabled",
    });
  }
  if (process.env.REALISM_SHOTS !== "before") {
    await page.goto(
      "/ehr?mode=replay&audit=buttons&release=v3&program=releases/v3/personas/P1.json&persona=P1&patient=sh-f55e5d3f-2686-5180-a2a5-e17365fdb89d",
    );
    const catalog = catalogSchema.parse(
      await (await page.request.get("/catalog.json")).json(),
    );
    const patient = catalog.patients.find(
      (p) => p.id === "sh-f55e5d3f-2686-5180-a2a5-e17365fdb89d",
    );
    if (!patient) throw new Error("Missing source note-review patient");
    if (!(await enterPatientChart(page, patient.mrn ?? patient.name)))
      await page
        .locator('[data-comp-id="home.work.w1Rooming"][data-event]')
        .click();
    await page.getByRole("tab", { name: "Notes", exact: true }).click();
    const note = page
      .locator(
        '[data-info-id="encounterNotes"] li, [data-info-id="priorNotes"] li',
      )
      .first();
    await expect(note).toBeVisible();
    const semantic = await page.evaluate(
      () => window.__buttonAuditSession?.snapshot().ui,
    );
    if (!semantic) throw new Error("Missing native Notes screen");
    writeFileSync(
      `${folder}/chart-notes.ui.json`,
      JSON.stringify(semantic, null, 2) + "\n",
    );
    expect(
      observedAria(await page.locator(".clinical-shell").ariaSnapshot()),
    ).toEqual(expectedAria(semantic));
    const expectedBodies = infoNodes([...semantic.side, ...semantic.workspace])
      .filter((info) => ["encounterNotes", "priorNotes"].includes(info.infoId))
      .flatMap((info) =>
        info.rows.map((row) => row.find(([key]) => key === "Text")?.[1] ?? ""),
      );
    expect(
      await page
        .locator(
          '[data-info-id="encounterNotes"] .presentation-note-body dd, [data-info-id="encounterNotes"] .clinical-note-body, [data-info-id="priorNotes"] .presentation-note-body dd, [data-info-id="priorNotes"] .clinical-note-body',
        )
        .allTextContents(),
    ).toEqual(expectedBodies);
    await note.scrollIntoViewIfNeeded();

    await page.mouse.move(1, 1);
    await page.screenshot({
      path: `${folder}/chart-notes.png`,
      animations: "disabled",
    });
    await page
      .locator(".clinical-home-meds, [data-info-id=currentMeds]")
      .first()
      .scrollIntoViewIfNeeded();
    await page.mouse.move(1, 1);
    await page.screenshot({
      path: `${folder}/home-medications.png`,
      animations: "disabled",
    });
    await page.goto("/screen-check.html");
    await page.waitForFunction(() => typeof window.renderUi === "function");
    const alert = uiScreenSchema.parse(
      JSON.parse(readFileSync("src/fixtures/ui/p1-alert.json", "utf8")),
    );
    await page.evaluate((screen) => window.renderUi(screen), alert);
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.mouse.move(1, 1);
    await page.screenshot({
      path: `${folder}/interruptive-alert.png`,
      animations: "disabled",
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/browse");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  if (process.env.REALISM_SHOTS !== "before")
    await expect(page.locator('[data-node-key="P3-5"]')).toBeVisible();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: `${folder}/browse-narrow.png`,
    animations: "disabled",
  });
});
