import { expect, test } from "@playwright/test";
import { backendAvailable } from "../src/data/medplum";

test("default route shows live sign-in and explicit offline entry points", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Clinician sign-in" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Demo \/ replay/ }),
  ).toHaveAttribute("href", "/browse");
  await expect(page.getByLabel("Medplum email")).toBeVisible();
});
test("local P1 quick-login, patient search, real chart and session restoration", async ({
  page,
}) => {
  test.skip(!(await backendAvailable()), "Local Medplum is down");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "P1", exact: true }).click();
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
  await page.getByRole("button", { name: "Open canonical EHR" }).click();
  await expect(
    page.getByRole("banner", { name: "Patient banner" }),
  ).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByRole("banner", { name: "Patient banner" }),
  ).toContainText("Aaron");
  expect(errors).toEqual([]);
});
