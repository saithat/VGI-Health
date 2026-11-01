import { expect, test } from "@playwright/test";
import { backendAvailable } from "../src/data/medplum";

test("default route shows persona sign-in, baseline entry and offline links", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Choose a clinician" }),
  ).toBeVisible();
  for (const name of [/^P1 · /, /^P2 · /, /^P3 · /, /^P4 · /, /^P5 · /, /^RN2 · /])
    await expect(page.getByRole("button", { name })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Original canonical EHR (baseline)" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /Demo \/ replay/ }),
  ).toHaveAttribute("href", "/browse");
});
test("local P1 quick-login, patient search, real chart and session restoration", async ({
  page,
}) => {
  test.skip(!(await backendAvailable()), "Local Medplum is down");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /^P1 · / }).click();
  await expect(
    page.getByRole("heading", { name: "Today's clinic · In-basket · Refills" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Today's clinic · In-basket · Refills" }),
  ).toBeVisible();
  await page.getByLabel("Patient search", { exact: true }).fill("Aaron");
  await page
    .getByRole("button", { name: "Search Medplum", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Aaron.*Ankunding/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Open EHR" }).click();
  await expect(
    page.getByRole("banner", { name: "Patient banner" }),
  ).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByRole("banner", { name: "Patient banner" }),
  ).toContainText("Aaron");
  expect(errors).toEqual([]);
});
