import { test, expect, type Page } from "@playwright/test";

const adult = "4966bd28-61bc-8f51-3aab-1328a32ea2e7";
function component(page: Page, id: string) {
  return page.locator(`[data-comp-id="${id}"][data-event]`);
}
async function openSign(page: Page, program = "releases/v1/personas/P1.json") {
  test.setTimeout(120000);
  await page.goto(
    `/ehr?${new URLSearchParams({ mode: "replay", release: "v1", program, persona: "P1", patient: adult })}`,
  );
  await component(page, "home.work.w1Rooming").click();
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
  await component(page, "w1Orders.prn").fill("false");
  await component(page, "w1Orders.orderDiagnosis").fill("I10");
  for (const [id, value] of [
    ["prescriptionPatientName", "Aaron Bruno Ankunding"],
    ["prescriptionPatientAddress", "100 Test Lane"],
    ["prescriptionDirections", "Take one tablet by mouth once daily"],
    ["prescriberLicenseClassification", "Physician"],
  ])
    await component(page, `w1Orders.legal.${id}`).fill(value ?? "");
  await component(page, "w1Orders.toSign").click();
  await component(page, "w1Verify.continue").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Sign orders",
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

test("P1 fixture replay retains identity input and fails closed without source-backed phase context", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openSign(page);
  const sign = component(page, "w1Sign.commit.signOrders");
  await expect(sign).toBeDisabled();
  await expect(sign).toHaveAttribute(
    "title",
    "structured display or action label required",
  );
  await page.getByRole("button", { name: "Inspector", exact: true }).click();
  await expect(page.getByTestId("commits")).toHaveText("[]");
  await page
    .getByRole("button", { name: "Close inspector", exact: true })
    .click();
  await component(page, "w1Sign.patientIdReentry").fill("AA/M/58");
  await expect(sign).toBeDisabled();
  await page.getByRole("button", { name: "Inspector", exact: true }).click();
  await expect(page.getByTestId("commits")).toHaveText("[]");
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
    "structured display or action label required",
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
  await page.goto("/?mode=replay&persona=P3");
  await page.getByRole("button", { name: "Inspector", exact: true }).click();
  await expect(page.locator(".patient-switcher summary")).toContainText("IMP");
  await page
    .getByRole("button", { name: "Close inspector", exact: true })
    .click();
  await component(page, "home.work.w4Worklist").click();
  await component(page, "w4Worklist.toMar").click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /MAR|Medication administration/i,
  );
});
