import {
  enterPatientChart,
  navigateClinicalScreen,
} from "./clinical-navigation";
import { test, expect, type Page } from "@playwright/test";

function component(page: Page, id: string) {
  return page.locator(`[data-comp-id="${id}"][data-event]`);
}
async function openSign(page: Page, program = "releases/v1/personas/P1.json") {
  test.setTimeout(120000);
  await page.goto(
    `/ehr?${new URLSearchParams({ mode: "replay", inspect: "1", release: "v1", program, persona: "P1", audit: "buttons" })}`,
  );
  if (await enterPatientChart(page, "47839287"))
    await navigateClinicalScreen(page, "w1Rooming");
  else await component(page, "home.work.w1Rooming").click();
  expect(
    await page.evaluate(
      () => window.__buttonAuditSession?.snapshot().state.patientContext?.bound,
    ),
  ).toBe("4966bd28-61bc-8f51-3aab-1328a32ea2e7");
  await component(page, "w1Rooming.weight").fill("93.4");
  for (const screen of ["w1Rooming", "w1MedRec", "w1Hpi", "w1Exam"])
    await component(page, `${screen}.next`).click();
  await component(page, "w1Orders.prefLisinopril").click();
  const confirms = page.locator(
    '[data-comp-id^="w1Orders."][data-event="confirm"]',
  );
  for (let attempt = 0; attempt < 20 && (await confirms.count()); attempt++)
    await confirms.first().click();
  await expect(confirms).toHaveCount(0);
  await component(page, "w1Orders.indication").fill("Hypertension");
  await component(page, "w1Orders.pharmacy").fill("Community pharmacy");
  await component(page, "w1Orders.substitution").fill("true");
  await page.getByRole("option", { name: "Yes", exact: true }).click();
  await component(page, "w1Orders.prn").fill("false");
  await page.getByRole("option", { name: "No", exact: true }).click();
  await component(page, "w1Orders.orderDiagnosis").fill("I10");
  await page
    .getByRole("option", {
      name: "I10 — Essential (primary) hypertension",
      exact: true,
    })
    .click();
  await component(page, "w1Orders.toSign").click();
  await component(page, "w1Verify.continue").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Sign Orders",
  );
}

test.beforeEach(async ({ page, baseURL }) => {
  // A complete live episode must work with every external request denied.
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === new URL(baseURL ?? "").origin
      ? route.continue()
      : route.abort(),
  );
});

test("P1 fixture replay requires human identity before signing", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openSign(page);
  const sign = component(page, "w1Sign.commit.signOrders");
  await expect(sign).toBeDisabled();
  await expect(sign).toHaveAttribute(
    "title",
    "Re-enter patient ID (initials / sex / age) to sign",
  );
  await page.getByRole("button", { name: "Inspector", exact: true }).click();
  await expect(page.getByTestId("commits")).toHaveText("[]");
  await page
    .getByRole("button", { name: "Close inspector", exact: true })
    .click();
  await component(page, "w1Sign.patientIdReentry").fill("AA/M/58");
  await expect(sign).toBeEnabled();
  await sign.click();
  await page.getByRole("button", { name: "Inspector", exact: true }).click();
  await expect(page.getByTestId("commits")).toContainText("signOrders");
  await expect(page.getByTestId("captured")).toContainText("AA/M/58");
  expect(errors).toEqual([]);
});

test("bad 01: unopened allergy tab hides the list and Lean blocks signing", async ({
  page,
}) => {
  await openSign(page, "programs/bad/01-hidden-allergies.json");
  await component(page, "w1Sign.patientIdReentry").fill("AA/M/58");
  await expect(
    page.locator('.live-page [data-comp-id="w1Sign.allergies"]'),
  ).toHaveCount(0);
  const sign = component(page, "w1Sign.commit.signOrders");
  await expect(sign).toBeDisabled();
  await expect(sign).toHaveAttribute(
    "title",
    "review required: Allergies must be shown or covered by a valid receipt",
  );
  await page.getByRole("button", { name: "Inspector", exact: true }).click();
  await expect(page.getByTestId("commits")).toHaveText("[]");
  await page
    .getByRole("button", { name: "Close inspector", exact: true })
    .click();
});

test("P3 persona URL selects an inpatient fixture and reaches the MAR", async ({
  page,
}) => {
  await page.goto("/ehr?mode=replay&inspect=1&persona=P3&audit=buttons");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "My Patients / MAR",
  );
  await enterPatientChart(page);
  const state = await page.evaluate(
    () => window.__buttonAuditSession?.snapshot().state,
  );
  expect(state?.patientContext?.bound).toBe(state?.patientContext?.patient);
  expect(state?.patientContext?.bound).toBeTruthy();
  await expect(
    page.getByRole("banner", { name: "Patient banner", exact: true }),
  ).toContainText(/Inpatient|IMP/);
  await navigateClinicalScreen(page, "w4Mar");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /MAR|Medication administration/i,
  );
});
