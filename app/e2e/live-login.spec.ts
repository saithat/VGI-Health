import { enterPatientChart } from "./clinical-navigation";
import { expect, test } from "@playwright/test";
import {
  backendAvailable,
  backendDownReason,
  signInBaseline,
} from "./live-backend";

test("default route shows persona sign-in, baseline entry and offline links", async ({
  page,
}) => {
  await page.goto("/?audit=buttons");
  await expect(
    page.getByRole("heading", { name: "Choose a clinician" }),
  ).toBeVisible();
  for (const name of [
    /^P1 · /,
    /^P2 · /,
    /^P3 · /,
    /^P4 · /,
    /^P5 · /,
    /^RN2 · /,
  ])
    await expect(page.getByRole("button", { name })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Original canonical EHR (baseline)" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /Demo \/ replay/ }),
  ).toHaveAttribute("href", "/browse");
});
for (const baseline of [false, true]) {
  test(`local P1 ${baseline ? "baseline" : "personalized"} login, patient search, real chart and session restoration`, async ({
    page,
  }) => {
    test.skip(!(await backendAvailable()), backendDownReason);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/?audit=buttons");
    if (baseline) await signInBaseline(page, "P1");
    else await page.getByRole("button", { name: /^P1 · / }).click();
    await expect(
      page.getByRole("heading", { name: "Schedule", level: 1 }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Schedule", level: 1 }),
    ).toBeVisible();
    await enterPatientChart(page, "Aaron");
    await expect(
      page.getByRole("banner", { name: "Patient banner" }),
    ).toBeVisible({ timeout: 30000 });
    await expect(
      page.getByRole("banner", { name: "Patient banner" }),
    ).toContainText("Aaron");
    expect(errors).toEqual([]);
  });
}

test("baseline entry opens the selected clinician's certified role view", async ({
  page,
}) => {
  test.skip(!(await backendAvailable()), backendDownReason);
  await page.goto("/?audit=buttons");
  await page
    .getByLabel("Baseline clinician", { exact: true })
    .selectOption("P3");
  await page
    .getByRole("button", {
      name: "Original canonical EHR (baseline)",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "My Patients / MAR", level: 1 }),
  ).toBeVisible();
  await enterPatientChart(page, "Aaron");
  await expect(page.locator(".clinical-app")).toBeVisible();
  expect(
    await page.evaluate(() => window.__buttonAuditSession?.program),
  ).toMatchObject({
    id: "canonical-P3",
    owner: "P3",
    role: "rn",
    specVersion: "v3",
  });
});
