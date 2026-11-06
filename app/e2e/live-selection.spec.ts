import { completeKeycloakLogin } from "./live-backend";
import { backendAvailable, backendDownReason } from "./live-backend";
import { expect, test } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { z } from "zod";
import type {} from "../src/core/buttonAudit";
import { expectedAria, observedAria } from "../src/ehr/ui/fidelity";

test.beforeEach(async () => {
  test.skip(!(await backendAvailable()), backendDownReason);
});

for (const [persona, activity, caption] of [
  ["P1", "scheduleTasks", "Schedule"],
  ["P1", "inboxResults", "Inbox Results"],
  ["P2", "edTrackBoard", "Track Board"],
  ["P3", "unitCensus", "Unit Census"],
  ["P3", "shiftWorklist", "MAR"],
  ["P4", "scheduleTasks", "Schedule"],
  ["P5", "orSchedule", "OR Schedule"],
  ["P5", "consultList", "Consults"],
  ["P1", "lookup", "Patient Lookup"],
] as const) {
  test(`live ${persona} ${caption} opens its patient without clinical writes`, async ({
    page,
  }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1440, height: 900 });
    const writes: string[] = [];
    page.on("request", (request) => {
      if (
        /\/fhir\/R4\/|\/commit\/commands(?:[/?]|$)/.test(request.url()) &&
        ["POST", "PUT", "PATCH", "DELETE"].includes(request.method())
      )
        writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
    });
    await page.goto("/?audit=buttons");
    await page
      .getByRole("button", { name: new RegExp(`^${persona} ·`) })
      .click();
    await completeKeycloakLogin(page, persona);
    await expect(
      page.getByLabel("Patient search by name or MRN", { exact: true }),
    ).toBeVisible({ timeout: 30000 });
    await expect(
      page.getByRole("banner", { name: "Application toolbar", exact: true }),
    ).toContainText("Clinical date: Nov 2, 2026");
    // The active landing activity has no redundant navigation button.
    const nav = page.locator(
      `[data-comp-id="workspace.${activity === "lookup" ? "lookup" : `activity|${activity}`}" ]`,
    );
    if (await nav.count()) await nav.click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      activity === "shiftWorklist"
        ? "My Patients / MAR"
        : caption === "Inbox Results"
          ? "Inbox · Results"
          : caption,
    );
    if (activity === "lookup")
      await page
        .getByLabel("Patient search by name or MRN", { exact: true })
        .fill("Aaron");
    const open = page.getByRole("button", { name: /^Open chart:/ }).first();
    await expect(open).toBeVisible({ timeout: 15000 });
    if (activity === "scheduleTasks")
      expect(
        await page.getByRole("button", { name: /^Open chart:/ }).count(),
      ).toBeGreaterThanOrEqual(12);
    const landing = await page.evaluate(
      () => window.__buttonAuditSession?.snapshot().ui,
    );
    if (!landing) throw new Error("Missing landing semantic screen");
    expect(
      observedAria(await page.locator(".clinical-shell").ariaSnapshot()),
    ).toEqual(expectedAria(landing));
    const label =
      (await open.getAttribute("aria-label")) ?? (await open.innerText());
    mkdirSync("shots/realism/live-select", { recursive: true });
    const stem = `${persona}-${activity}`;
    writeFileSync(
      `shots/realism/live-select/${stem}-landing.ui.json`,
      JSON.stringify(landing, null, 2) + "\n",
    );
    await page.screenshot({
      path: `shots/realism/live-select/${stem}-landing.png`,
    });
    await open.click();
    const banner = page.getByRole("banner", {
      name: "Patient banner",
      exact: true,
    });
    await expect(banner).toBeVisible({ timeout: 30000 });
    const chart = await page.evaluate(
      () => window.__buttonAuditSession?.snapshot().ui,
    );
    if (!chart) throw new Error("Missing chart semantic screen");
    expect(
      observedAria(await page.locator(".clinical-shell").ariaSnapshot()),
    ).toEqual(expectedAria(chart));
    const state = await page.evaluate(
      () => window.__buttonAuditSession?.snapshot().state,
    );
    expect(state?.patientContext?.patient).toBeTruthy();
    expect(state?.patientContext?.bound).toBe(state?.patientContext?.patient);
    expect(label).toContain("MRN");
    writeFileSync(
      `shots/realism/live-select/${stem}-chart.ui.json`,
      JSON.stringify(chart, null, 2) + "\n",
    );
    await page.screenshot({
      path: `shots/realism/live-select/${stem}-chart.png`,
    });
    const manifestPath = "shots/final/neutral-manifest.json";
    if (existsSync(manifestPath)) {
      const manifest = z.object({
        source: z.string(),
        captures: z.array(z.object({
          path: z.string(), source: z.string(), sha256: z.string(), mode: z.string().optional(),
        }).passthrough()),
      }).passthrough().parse(JSON.parse(readFileSync(manifestPath, "utf8")));
      manifest.source =
        "current native semantic exports and fresh live-selection UI snapshots; fictional identity seed v1";
      for (const view of ["landing", "chart"]) {
        const path = `shots/realism/live-select/${stem}-${view}.png`;
        const capture = manifest.captures.find((entry) => entry.path === path);
        if (!capture) throw new Error(`Missing screenshot manifest entry: ${path}`);
        capture.source = path.replace(/\.png$/, ".ui.json");
        capture.sha256 = createHash("sha256").update(readFileSync(path)).digest("hex");
        capture.mode = "live";
      }
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    }
    expect(writes).toEqual([]);
  });
}
