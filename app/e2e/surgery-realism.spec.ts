import { expect, test, type Page } from "@playwright/test";

function control(page: Page, comp: string, event = "click") {
  return page.locator(`[data-comp-id="${comp}"][data-event="${event}"]`);
}

test("surgeon opens a case, documents a note, loads orders and returns to clinic through Lean", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === new URL(baseURL ?? "").origin
      ? route.continue()
      : route.abort(),
  );
  await page.goto(
    `/ehr?${new URLSearchParams({
      mode: "replay",
      release: "v1",
      program: "releases/v1/personas/P5.json",
      persona: "P5",
      patient: "7cf1e4aa-23ea-3b40-5a62-7aa19e62c5bf",
    })}`,
  );
  await control(page, "home.openSelectedCase").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Preprocedure",
  );
  await expect(
    page.getByRole("button", { name: "Brief Op Note", exact: true }),
  ).toBeVisible();
  // Every case-navigator destination is a real component click, including the queues.
  let current = "w6PreOp";
  for (const [target, title] of [
    ["w6Orders", "Orders"],
    ["w6Sign", "Sign orders"],
    ["w6OpNote", "Brief Op Note"],
    ["w6PostOp", "Postprocedure Orders"],
    ["w6Rounding", "Rounding"],
    ["w6Discharge", "Discharge"],
    ["w6Consults", "Consults"],
    ["w6Consult", "Consult note"],
    ["w6ConsultClose", "Sign Consult"],
    ["w6Schedule", "OR Schedule"],
  ]) {
    await control(page, `${current}.nav.${target}`).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      title ?? "",
    );
    current = target ?? "";
    await expect(control(page, `${current}.nav.${current}`)).toHaveAttribute(
      "aria-current",
      "page",
    );
  }
  await control(page, "w6Schedule.nav.w6OpNote").click();
  const findings = control(page, "w6OpNote.opFindings", "enter");
  await expect(findings).toHaveJSProperty("tagName", "TEXTAREA");
  await findings.fill("Operative findings:\nDocumented by the surgeon.");
  await control(page, "w6OpNote.nav.w6Rounding").click();
  await control(page, "w6Rounding.nav.w6OpNote").click();
  await expect(findings).toHaveValue(
    "Operative findings:\nDocumented by the surgeon.",
  );
  await control(page, "w6OpNote.nav.w6PostOp").click();
  await control(page, "w6PostOp.appendectomySet").click();
  await expect(control(page, "w6PostOp.row10.drug", "enter")).toHaveValue(
    "acetaminophen",
  );
  expect(
    await page
      .locator('[data-comp-id^="w6PostOp."][data-event="confirm"]')
      .count(),
  ).toBeGreaterThan(10);
  await control(page, "w6PostOp.nav.w6Sign").click();
  await expect(control(page, "w6Sign.commit.signOrders")).toBeDisabled();
  await expect(control(page, "w6Sign.commit.signOrders")).toHaveAttribute(
    "title",
    /.+/,
  );
  await control(page, "w6Sign.nav.w6Schedule").click();
  await control(page, "w6Schedule.clinic").click();
  await control(page, "w1Rooming.nav.w1Hpi").click();
  await expect(control(page, "w1Hpi.nav.w1Hpi")).toHaveAttribute(
    "aria-current",
    "page",
  );
  const hpi = control(page, "w1Hpi.hpi", "enter");
  await expect(hpi).toHaveJSProperty("tagName", "TEXTAREA");
  await hpi.fill("Postoperative follow-up.\nWound symptoms reviewed.");
  await expect(
    page.getByRole("tab", { name: "Surgical history", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
