import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { expectedAria, observedAria } from "../src/ehr/ui/fidelity";
import type {} from "../src/core/buttonAudit";
import { uiScreenSchema } from "../src/ehr/ui/types";
import type {} from "../src/ehr/offline";
import { readFileSync } from "node:fs";

test("populated native clinician screen review", async ({ page }) => {
  test.skip(!process.env.PUNCH_SHOTS, "Opt-in native screen review");
  await page.setViewportSize({ width: 1440, height: 900 });
  const folder = `shots/realism/punch/${process.env.PUNCH_SHOTS}/populated`;
  mkdirSync(folder, { recursive: true });
  for (const [persona, screen, name] of [
    ["P1", "home", "P1-schedule"],
    ["P1", "w1Orders", "P1-orders"],
    ["P2", "w3TrackBoard", "P2-track-board"],
    ["P2", "w3Triage", "P2-triage"],
    ["P3", "w4Mar", "P3-MAR"],
    ["P3", "w4Flowsheet", "P3-flowsheet"],
    ["P4", "w5Growth", "P4-growth"],
    ["P5", "w6Schedule", "P5-OR-schedule"],
    ["P5", "w6OpNote", "P5-op-note"],
  ]) {
    const ui = uiScreenSchema.parse(
      JSON.parse(readFileSync(`src/fixtures/punch/${name}.json`, "utf8")),
    );
    expect(ui.screen ?? screen, `${persona} source identity`).toBe(screen);
    await page.goto("/screen-check.html");
    await page.waitForFunction(() => typeof window.renderUi === "function");
    await page.evaluate((ui) => window.renderUi(ui), ui);
    await page.evaluate(() => document.fonts.ready);
    expect(observedAria(await page.locator("body").ariaSnapshot())).toEqual(
      expectedAria(ui),
    );
    await page.mouse.move(1, 1);
    await page.screenshot({
      path: `${folder}/${name}.png`,
      animations: "disabled",
    });
  }
});

test("clinician punchlist screen review", async ({ page }) => {
  test.skip(!process.env.PUNCH_SHOTS, "Opt-in clinician screen review");
  test.setTimeout(120000);
  const phase = process.env.PUNCH_SHOTS;
  const folder = `shots/realism/punch/${phase}`;
  mkdirSync(folder, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [persona, entry, target, name] of [
    ["P1", "", "home", "P1-schedule"],
    ["P1", "w1Rooming", "w1Orders", "P1-orders"],
    ["P2", "w3TrackBoard", "w3TrackBoard", "P2-track-board"],
    ["P2", "w3TrackBoard", "w3Triage", "P2-triage"],
    ["P3", "w4Worklist", "w4Mar", "P3-MAR"],
    ["P3", "w4Worklist", "w4Flowsheet", "P3-flowsheet"],
    ["P4", "w5Rooming", "w5Growth", "P4-growth"],
    ["P5", "w6Schedule", "w6Schedule", "P5-OR-schedule"],
    ["P5", "w6Schedule", "w6OpNote", "P5-op-note"],
  ] as const) {
    await page.goto(
      `/ehr?mode=replay&audit=buttons&release=v3&persona=${persona}&program=releases/v3/personas/${persona}.json`,
    );
    await expect(page.locator(".clinical-app")).toBeVisible();
    if (entry) {
      const opener = page.locator(
        `[data-comp-id="home.work.${entry}"][data-event]`,
      );
      if (await opener.count()) await opener.click();
      else
        expect(
          await page.evaluate(
            () => window.__buttonAuditSession?.snapshot().state.screen,
          ),
        ).toBe(entry);
    }
    if (target !== entry && target !== "home")
      await page
        .locator(`button[data-comp-id$=".nav.${target}"][data-event]`)
        .click();
    const snapshot = await page.evaluate(() =>
      window.__buttonAuditSession?.snapshot(),
    );
    expect(snapshot?.state.screen).toBe(target);
    if (!snapshot?.ui) throw new Error(`Missing ${name} semantic screen`);
    mkdirSync("test-results/punch-live-ui", { recursive: true });
    writeFileSync(
      `test-results/punch-live-ui/${name}.json`,
      JSON.stringify(snapshot.ui, null, 2),
    );
    expect(
      observedAria(await page.locator(".clinical-shell").ariaSnapshot()),
    ).toEqual(expectedAria(snapshot.ui));
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.mouse.move(1, 1);
    await page.screenshot({
      path: `${folder}/${name}.png`,
      animations: "disabled",
    });
  }
});
