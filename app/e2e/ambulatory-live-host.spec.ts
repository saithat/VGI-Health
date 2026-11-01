import { mkdirSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { catalogSchema, defaultPatient } from "../src/browser/data";
import type {} from "../src/core/buttonAudit";

const phase = process.env.EHR_AMB_LIVE_SHOTS;
const shotPrefix = process.env.EHR_AMB_LIVE_SHOT_PREFIX ?? phase;
const cases = [
  { persona: "P1", screen: "w1Rooming", inspecting: false },
  { persona: "P4", screen: "w5Rooming", inspecting: false },
  ...(phase === "after"
    ? [{ persona: "P1", screen: "w1Rooming", inspecting: true }]
    : []),
];
for (const { persona, screen, inspecting } of cases) {
  const capture = `${shotPrefix}-${persona}-live${inspecting ? "-inspection" : ""}`;
  test(`live host ${phase}: ${persona}${inspecting ? " inspection" : ""} save feedback and encounter options`, async ({
    page,
    request,
  }) => {
    test.skip(!phase, "Opt-in connected synthetic-patient visual review");
    await page.setViewportSize({ width: 1440, height: 900 });
    // Matched before/after saves use distinct review minutes. Receipts remain real
    // human clicks and persisted writes; a same-minute repeat is idempotent.
    await page.clock.setFixedTime(
      new Date(
        Date.now() + (phase === "after" ? (inspecting ? 180000 : 120000) : 0),
      ),
    );
    const catalog = catalogSchema.parse(
      await (await request.get("/catalog.json")).json(),
    );
    // Separate chart for inspection: a repeated same-minute review is correctly idempotent.
    const patient = inspecting
      ? (catalog.patients.filter((entry) => !entry.flags.pediatric)[1] ??
        defaultPatient(catalog, persona))
      : defaultPatient(catalog, persona);
    await page.goto(`/?audit=buttons${inspecting ? "&inspect=1" : ""}`);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page
      .getByLabel("Baseline clinician", { exact: true })
      .selectOption(persona);
    await page
      .getByRole("button", {
        name: "Original canonical EHR (baseline)",
        exact: true,
      })
      .click();
    await page
      .getByLabel("Patient search", { exact: true })
      .fill(
        patient.name.replace(/^(?:Mr|Mrs|Ms|Dr)\.?\s+/i, "").split(" ")[0] ??
          "",
      );
    await page
      .getByRole("button", { name: "Search patients", exact: true })
      .click();
    await page
      .locator(".patient-search + ul button")
      .filter({ hasText: patient.name.split(" ").at(-1) ?? patient.name })
      .first()
      .click();
    const encounters = page.getByLabel("Live encounter", { exact: true });
    await expect(encounters).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Start new encounter", exact: true }),
    ).toBeEnabled();
    await encounters.scrollIntoViewIfNeeded();
    const previousIds = await encounters
      .locator("option")
      .evaluateAll((nodes) =>
        nodes
          .filter(
            (node): node is HTMLOptionElement =>
              node instanceof HTMLOptionElement,
          )
          .map((node) => node.value),
      );
    if (!inspecting) {
      mkdirSync("shots/realism/amb", { recursive: true });
      await page.screenshot({
        path: `shots/realism/amb/${capture}-selection.png`,
        animations: "disabled",
      });
    }
    await page
      .getByRole("button", { name: "Start new encounter", exact: true })
      .click();
    let createdId = "";
    await expect
      .poll(async () => {
        createdId = await encounters.locator("option").evaluateAll(
          (nodes, previous) =>
            nodes
              .filter(
                (node): node is HTMLOptionElement =>
                  node instanceof HTMLOptionElement,
              )
              .map((node) => node.value)
              .find((value) => !previous.includes(value)) ?? "",
          previousIds,
        );
        return createdId;
      })
      .not.toBe("");
    if (phase === "before") await encounters.selectOption(createdId);
    else await expect(encounters).toHaveValue(createdId);
    await page.getByRole("button", { name: "Open EHR", exact: true }).click();
    await page.waitForFunction(() => !!window.__buttonAuditSession);
    const expected = await (
      await request.get(`/releases/v3/personas/${persona}.json`)
    ).json();
    expect(
      await page.evaluate(() => window.__buttonAuditSession?.program),
    ).toEqual(expected);
    await page
      .locator(`[data-comp-id="home.work.${screen}"][data-event="click"]`)
      .click();
    await page
      .locator(
        `[data-comp-id="${screen}.review.allergyList"][data-event="click"]`,
      )
      .click();
    const feedback = page
      .locator(".mantine-Notification-root")
      .filter({
        hasText:
          phase === "before" || inspecting
            ? "Medplum"
            : "Your changes have been saved.",
      })
      .first();
    await expect(feedback).toBeVisible({ timeout: 30000 });
    if (phase === "before" || inspecting)
      await expect(feedback).toContainText("Medplum");
    else {
      await expect(feedback).toContainText("saved");
      await expect(feedback).not.toContainText(
        /Medplum|\/medplum\/|Provenance\//,
      );
    }
    mkdirSync("shots/realism/amb", { recursive: true });
    await page.screenshot({
      path: `shots/realism/amb/${capture}-save.png`,
      animations: "disabled",
    });
    if (inspecting) {
      await feedback.locator("button[data-resource-link]").first().click();
      const resource = page.getByRole("dialog", {
        name: "Saved Medplum resource",
        exact: true,
      });
      await expect(
        resource.getByLabel("Saved resource JSON", { exact: true }),
      ).toContainText('"resourceType": "Provenance"');
      await resource
        .getByRole("button", { name: "Close saved resource", exact: true })
        .click();
    }
    await page
      .getByRole("button", {
        name: inspecting ? "Live encounter" : "Encounter options",
        exact: true,
      })
      .click();
    const options = page.getByRole("dialog");
    await expect(options).toBeVisible();
    if (phase === "before") await expect(options).toContainText("Encounter/");
    else {
      await expect(options).toContainText(
        patient.name.split(" ").at(-1) ?? patient.name,
      );
      await expect(options).not.toContainText(
        /Encounter\/|\/medplum\/|Provenance\/|[0-9a-f]{8}-[0-9a-f]{4}-/i,
      );
      if (!inspecting) await expect(options).not.toContainText("Medplum");
    }
    await page.screenshot({
      path: `shots/realism/amb/${capture}-options.png`,
      animations: "disabled",
    });
    if (phase === "after") {
      await options
        .getByRole("button", { name: "Return to worklist", exact: true })
        .click();
      await expect(
        page.getByLabel("Patient search", { exact: true }),
      ).toBeVisible();
    }
  });
}
