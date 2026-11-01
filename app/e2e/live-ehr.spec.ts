import { test, expect, type Page } from "@playwright/test";

const adult = "4966bd28-61bc-8f51-3aab-1328a32ea2e7";
function component(page: Page, id: string) {
  return page.locator(`[data-comp-id="${id}"][data-event]`);
}
async function openSign(page: Page, program = "releases/v1/personas/P1.json") {
  await page.goto(
    `/ehr?${new URLSearchParams({ release: "v1", program, persona: "P1", patient: adult })}`,
  );
  await component(page, "home.work.w1Rooming").click();
  await component(page, "w1Rooming.weight").fill("93.4");
  for (const screen of ["w1Rooming", "w1MedRec", "w1Hpi", "w1Exam"])
    await component(page, `${screen}.next`).click();
  await component(page, "w1Orders.prefLisinopril").click();
  while (await page.locator('[data-event="confirm"]').count())
    await page.locator('[data-event="confirm"]').first().click();
  await component(page, "w1Orders.indication").fill("Hypertension");
  await component(page, "w1Orders.pharmacy").fill("Community pharmacy");
  await component(page, "w1Orders.substitution").fill("true");
  await component(page, "w1Orders.prn").fill("false");
  await component(page, "w1Orders.orderDiagnosis").fill("I10");
  await component(page, "w1Orders.toSign").click();
  await component(page, "w1Verify.continue").click();
  await expect(page.locator(".ehr-screen-title")).toHaveText("Sign orders");
}

test.beforeEach(async ({ page, baseURL }) => {
  // A complete live episode must work with every external request denied.
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === new URL(baseURL ?? "").origin
      ? route.continue()
      : route.abort(),
  );
});

test("P1 v1 W1: identity blocks signing, then a human re-entry permits a real commit", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openSign(page);
  const sign = component(page, "w1Sign.commit.signOrders");
  await expect(sign).toBeDisabled();
  await expect(sign).toHaveAttribute(
    "title",
    "entry required: patientIdReentry",
  );
  await expect(page.getByTestId("commits")).toHaveText("[]");
  await component(page, "w1Sign.patientIdReentry").fill("AA/M/58");
  await expect(sign).toBeEnabled();
  await sign.click();
  await expect(page.getByTestId("commits")).toContainText("signOrders");
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
  await expect(sign).toHaveAttribute("title", /allergyList/);
  await expect(page.getByTestId("commits")).toHaveText("[]");
});

test("P3 persona URL selects an inpatient fixture and reaches the MAR", async ({
  page,
}) => {
  await page.goto("/?persona=P3");
  await expect(page.locator(".patient-switcher summary")).toContainText("IMP");
  await component(page, "home.work.w4Worklist").click();
  await component(page, "w4Worklist.toMar").click();
  await expect(page.locator(".ehr-screen-title")).toContainText(
    /MAR|Medication administration/i,
  );
});

test("browse searches and filters patients and opens a real program", async ({
  page,
}) => {
  await page.goto("/browse");
  await expect(
    page.getByRole("heading", { name: "Open a clinical UI" }),
  ).toBeVisible();
  await expect(page.locator(".program-groups li")).toHaveCount(62);
  await page.getByLabel("pediatric", { exact: true }).check();
  await expect(
    page.getByLabel("Patient", { exact: true }).locator("option"),
  ).toHaveCount(51);
  await page.getByLabel("pediatric", { exact: true }).uncheck();
  await page.getByLabel("Current program source").selectOption("mock");
  await expect(
    page.getByRole("link", { name: "Open P1’s current program →" }),
  ).toHaveAttribute("href", /program=runs%2Fmock%2Fprograms%2FP1%2Fv5.json/);
  await page.getByLabel("Search by name").fill("Aaron");
  await expect(
    page.getByLabel("Patient", { exact: true }).locator("option"),
  ).toHaveCount(1);
  await page
    .getByRole("link", { name: "P1 projection", exact: true })
    .first()
    .click();
  await expect(page.locator(".ehr-shell")).toBeVisible();
});
