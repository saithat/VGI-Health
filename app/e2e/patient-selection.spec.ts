import { expect, test } from "@playwright/test";
import type {} from "../src/core/buttonAudit";

for (const persona of ["P1", "P2", "P3", "P4", "P5"]) {
  test(`${persona} selects its patient inside the real Lean UI`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    await page.goto(
      `/ehr?mode=replay&persona=${persona}&program=releases/v1/personas/${persona}.json&audit=buttons`,
    );
    await expect(
      page.getByRole("textbox", { name: "Patient search by name or MRN" }),
    ).toBeVisible({ timeout: 60000 });
    await expect(
      page.getByRole("banner", { name: "Patient banner" }),
    ).toHaveCount(0);
    const state = () =>
      page.evaluate(() => window.__buttonAuditSession?.snapshot().state);
    expect((await state())?.captured).toEqual([]);
    expect((await state())?.patientContext?.patient).toBeUndefined();
    const open = page.getByRole("button", { name: /^Open chart:/ }).first();
    const label =
      (await open.getAttribute("aria-label")) ?? (await open.innerText());
    expect(label).toMatch(/MRN/);
    await page.screenshot({
      path: `shots/realism/content2/patient-selection/${persona}-landing.png`,
    });
    await open.click();
    await expect(
      page.getByRole("banner", { name: "Patient banner" }),
    ).toBeVisible({ timeout: 30000 });
    const selected = await state();
    expect(selected?.patientContext?.patient).toBe(
      selected?.patientContext?.bound,
    );
    expect(
      selected?.captured.some(
        (c) => c.element === "patientIdReentry" || c.element === "patientScan",
      ),
    ).toBe(false);
    await page.screenshot({
      path: `shots/realism/content2/patient-selection/${persona}-chart.png`,
    });
    await page.getByRole("button", { name: /^Return to / }).click();
    await expect(
      page.getByRole("banner", { name: "Patient banner" }),
    ).toHaveCount(0);
    expect((await state())?.captured).toEqual([]);
    await page
      .getByRole("button", { name: "Patient Lookup", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Patient search by name or MRN" })
      .fill("Carter");
    await expect(
      page.getByRole("button", { name: /^Open chart:.*Carter/i }).first(),
    ).toBeVisible();
  });
}

test("a late chart response cannot replace a later patient's chart", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto(
    "/ehr?mode=replay&persona=P1&program=releases/v1/personas/P1.json&audit=buttons",
  );
  await expect(
    page.getByRole("textbox", { name: "Patient search by name or MRN" }),
  ).toBeVisible({ timeout: 60000 });
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let intercepted = false;
  await page.route(
    "**/fixtures/{synthea,synthetic-hospital}/*.json",
    async (route) => {
      if (!intercepted) {
        intercepted = true;
        await pending;
      }
      await route.continue();
    },
  );
  await page
    .getByRole("button", { name: /^Open chart:/ })
    .first()
    .click();
  await expect.poll(() => intercepted).toBe(true);
  const first = await page.evaluate(
    () => window.__buttonAuditSession?.snapshot().state.patientContext?.patient,
  );
  const response = await page.request.get("/catalog.json");
  const catalog: { patients: { id: string; name: string; mrn?: string }[] } =
    await response.json();
  const second = catalog.patients.find((p) => p.id !== first && p.mrn);
  if (!second?.mrn) throw new Error("Missing second patient with recorded MRN");
  await page
    .getByRole("button", { name: "Patient Lookup", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Patient search by name or MRN" })
    .fill(second.mrn);
  await page
    .getByRole("button", { name: /^Open chart:/ })
    .first()
    .click();
  await expect(
    page.getByRole("banner", { name: "Patient banner" }),
  ).toBeVisible({ timeout: 30000 });
  expect(
    await page.evaluate(
      () => window.__buttonAuditSession?.snapshot().state.patientContext?.bound,
    ),
  ).toBe(second.id);
  if (!release) throw new Error("Missing pending chart response");
  release();
  await page.waitForTimeout(350);
  expect(
    await page.evaluate(
      () => window.__buttonAuditSession?.snapshot().state.patientContext?.bound,
    ),
  ).toBe(second.id);
  await expect(
    page.getByRole("banner", { name: "Patient banner" }),
  ).toContainText(second.mrn);
});
