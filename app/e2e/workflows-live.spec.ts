import { test, expect, type Page } from "@playwright/test";
import {
  backendAvailable,
  backendDownReason,
  signInBaseline,
} from "./live-backend";
import {
  enterPatientChart,
  navigateClinicalScreen,
} from "./clinical-navigation";
const control = (page: Page, id: string) =>
  page.locator(`[data-comp-id="${id}"][data-event]`);
const idle = (page: Page) =>
  expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 30000 });
async function enter(page: Page, id: string, value: string) {
  const input = page.locator(`[data-comp-id="${id}"][data-event="enter"]`);
  await expect(input).toBeVisible();
  if ((await input.getAttribute("type")) === "checkbox")
    await input.setChecked(value === "true");
  else {
    await input.fill(value);
    if ((await input.getAttribute("role")) === "combobox") {
      const option = page.getByRole("option").first();
      await expect(option).toBeVisible();
      await option.click();
    } else await input.press("Tab");
  }
  await idle(page);
}
async function values(
  page: Page,
  screen: string,
  fields: Record<string, string>,
) {
  await navigateClinicalScreen(page, screen);
  for (const [id, value] of Object.entries(fields))
    await enter(page, `${screen}.${id}`, value);
}
async function save(page: Page, screen: string, commit: string) {
  await navigateClinicalScreen(page, screen);
  const button = control(page, `${screen}.commit.${commit}`);
  await expect(
    button,
    (await button.getAttribute("title")) ?? "Native guard",
  ).toBeEnabled();
  for (let n = 0; n < 10; n++) {
    const response = page
      .waitForResponse(
        (r) =>
          r.url().endsWith("/commit/commands") &&
          r.request().method() === "POST",
        { timeout: 60000 },
      )
      .catch(() => null);
    await button.click();
    await idle(page);
    const acknowledgment = page.locator('[data-event="ack"]');
    if (await acknowledgment.count()) {
      await acknowledgment.first().click();
      await idle(page);
      continue;
    }
    const saved = await response;
    if (!saved) throw new Error("No commit response");
    expect(saved.status(), await saved.text()).toBe(201);
    await expect
      .poll(
        () =>
          page.evaluate(
            (commit) =>
              window.__buttonAuditSession
                ?.snapshot()
                .state.commits.includes(commit),
            commit,
          ),
        { timeout: 30000 },
      )
      .toBe(true);
    await idle(page);
    return saved.json();
  }
  throw new Error("Alerts did not settle");
}
async function open(page: Page, persona: string, query = "Aaron") {
  test.skip(!(await backendAvailable()), backendDownReason);
  await page.goto("/?audit=buttons&inspect=1");
  await signInBaseline(page, persona);
  await enterPatientChart(page, query);
}
test("W1: clinical note, vitals and medication orders use server-rechecked commands", async ({
  page,
}) => {
  test.setTimeout(120000);
  await open(page, "P1");
  await values(page, "w1Rooming", {
    weight: "93.4",
    chiefComplaint: "Hypertension follow-up",
  });
  await values(page, "w1MedRec", { decision0: "continue" });
  await values(page, "w1Hpi", {
    hpi: "Blood pressure stable. No adverse medication effects.",
    ros: "No chest pain or dyspnea.",
  });
  await values(page, "w1Exam", {
    exam: "Comfortable, normal heart and lungs.",
    assessmentPlan: "Continue treatment and monitor blood pressure.",
    visitDiagnosis: "I10",
  });
  await values(page, "w1Close", {
    claimDiagnosis: "I10",
    levelOfService: "99213",
    followUp: "4 weeks",
    patientInstructions: "Check blood pressure daily.",
  });
  await save(page, "w1Close", "signNote");
  await navigateClinicalScreen(page, "w1Orders");
  await control(page, "w1Orders.prefLisinopril").click();
  await idle(page);
  for (let n = 0; n < 30; n++) {
    const confirmations = page.locator(
      '[data-comp-id^="w1Orders."][data-event="confirm"]',
    );
    if (!(await confirmations.count())) break;
    await confirmations.first().click();
    await idle(page);
  }
  await values(page, "w1Orders", {
    dosingWeight: "93.4",
    indication: "Hypertension",
    pharmacy: "Community pharmacy",
    substitution: "true",
    prn: "false",
    orderDiagnosis: "I10",
  });
  await navigateClinicalScreen(page, "w1Sign");
  await enter(page, "w1Sign.patientIdReentry", "AA/M/58");
  const saved = await save(page, "w1Sign", "signOrders");
  expect(
    saved.links.some((link: string) => link.includes("/MedicationRequest/")),
  ).toBe(true);
});
test("W3: ED discharge is native-guarded and persists its encounter", async ({
  page,
}) => {
  test.setTimeout(90000);
  await open(page, "P2", "");
  await values(page, "w3Disposition", {
    dispositionChoice: "discharge",
    visitDiagnosis: "R50.9",
    dispositionCondition: "stable",
  });
  const saved = await save(page, "w3Disposition", "disposition");
  expect(saved.links.some((link: string) => link.includes("/Encounter/"))).toBe(
    true,
  );
});
test("W4: nursing assessment projects its note and observations", async ({
  page,
}) => {
  test.setTimeout(90000);
  await open(page, "P3");
  await values(page, "w4Flowsheet", {
    bpSystolic: "120",
    bpDiastolic: "80",
    heartRate: "72",
    respRate: "16",
    temperature: "37",
    spo2: "98",
    painReassessment: "0",
    nursingAssessment: "Comfortable, vital signs stable.",
  });
  const saved = await save(page, "w4Flowsheet", "chartAssessment");
  expect(
    saved.links.some((link: string) => link.includes("/Observation/")),
  ).toBe(true);
});
test("W5: immunization records a native-checked VIS attestation", async ({
  page,
}) => {
  test.setTimeout(90000);
  await open(page, "P4", "");
  await values(page, "w5Immunizations", {
    vaccine: "150",
    vaccineLot: "SYNTHETIC-LOT",
    vaccineManufacturer: "Synthetic manufacturer",
    vaccineProvider: "P4",
    visEditionDate: "2025-01-31",
    vaccineSite: "left-deltoid",
    vaccineRoute: "IM",
    visGiven: "true",
  });
  const saved = await save(page, "w5Immunizations", "recordImmunization");
  expect(
    saved.links.some((link: string) => link.includes("/Immunization/")),
  ).toBe(true);
});
test("W6: operative note projects its procedure through the guarded authority", async ({
  page,
}) => {
  test.setTimeout(90000);
  await open(page, "P5");
  await values(page, "w6OpNote", {
    opPreopDiagnosis: "K35.80",
    opPostopDiagnosis: "K35.80",
    opProcedure: "44970",
    opAnesthesia: "general",
    opFindings: "Inflamed appendix.",
    opEbl: "10",
    opSpecimens: "Appendix",
    opComplications: "none",
    opCondition: "stable",
  });
  const saved = await save(page, "w6OpNote", "signOpNote");
  expect(saved.links.some((link: string) => link.includes("/Procedure/"))).toBe(
    true,
  );
});
for (const decision of ["approve", "deny"])
  test(`W7: ${decision} refill from the selected request`, async ({ page }) => {
    test.setTimeout(90000);
    test.skip(!(await backendAvailable()), backendDownReason);
    await page.goto("/?audit=buttons&inspect=1");
    await signInBaseline(page, "P1");
    const folder = page.locator(
      '[data-comp-id="workspace.activity|inboxRxRequests"]',
    );
    await folder.click();
    await page
      .getByRole("button", { name: /^Open chart:/ })
      .first()
      .click();
    await expect(
      page.getByRole("banner", { name: "Patient banner", exact: true }),
    ).toBeVisible();
    await values(
      page,
      "w7Decision",
      decision === "approve"
        ? {
            refillDecision: "approve",
            refillQuantity: "90",
            refillRefills: "2",
            refillPharmacy: "Community pharmacy",
            refillProtocolMet: "true",
          }
        : { refillDecision: "deny", refillDenyReason: "early-refill" },
    );
    const saved = await save(
      page,
      "w7Decision",
      decision === "approve" ? "approveRefill" : "denyRefill",
    );
    expect(saved.links.some((link: string) => link.includes("/Task/"))).toBe(
      true,
    );
  });

test("W2: result acknowledgment completes the selected task and files its patient message", async ({
  page,
}) => {
  test.setTimeout(90000);
  test.skip(!(await backendAvailable()), backendDownReason);
  await page.goto("/?audit=buttons&inspect=1");
  await signInBaseline(page, "P1");
  await page
    .locator('[data-comp-id="workspace.activity|inboxResults"]')
    .click();
  await page
    .getByRole("button", { name: /^Open chart:/ })
    .first()
    .click();
  await expect(
    page.getByRole("banner", { name: "Patient banner", exact: true }),
  ).toBeVisible();
  await values(page, "w2Result", { resultAction: "repeat" });
  await values(page, "w2Message", {
    patientMessage: "Your test was reviewed. Please arrange follow-up.",
  });
  const saved = await save(page, "w2Result", "ackResult");
  expect(saved.links.some((link: string) => link.includes("/Task/"))).toBe(
    true,
  );
  expect(
    saved.links.some((link: string) => link.includes("/Communication/")),
  ).toBe(true);
});

test("W6: discharge persists its diagnosis, instructions and completed encounter", async ({
  page,
}) => {
  test.setTimeout(90000);
  await open(page, "P5");
  await values(page, "w6Discharge", {
    decision0: "continue",
    dischargeDiagnosis: "K35.80",
    dischargeCondition: "stable",
    dischargeDestination: "home",
    dischargeFollowUp: "week",
    dischargeInstructions:
      "Keep the incision clean and return for fever or increasing pain.",
  });
  const saved = await save(page, "w6Discharge", "discharge");
  expect(saved.links.some((link: string) => link.includes("/Encounter/"))).toBe(
    true,
  );
  expect(
    saved.links.some((link: string) => link.includes("/DocumentReference/")),
  ).toBe(true);
});

test("ED admission and surgical discharge update the same guarded bed board", async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(150000);
  if (!baseURL) throw new Error("Playwright baseURL missing");
  test.skip(!(await backendAvailable()), backendDownReason);
  await page.goto("/?audit=buttons&inspect=1");
  await signInBaseline(page, "P2");
  const row = page.getByRole("button", { name: /^Open chart:/ }).first();
  await expect(row).toBeVisible();
  const label =
    (await row.getAttribute("aria-label")) ?? (await row.innerText());
  const mrn = label.match(/\(MRN ([^)]+)\)/)?.[1];
  if (!mrn) throw new Error(`ED row has no patient identity: ${label}`);
  await enterPatientChart(page, "");
  await page
    .getByRole("button", { name: "Live encounter", exact: true })
    .click();
  const beds = page.getByLabel("Admission bed", { exact: true });
  await expect.poll(() => beds.locator("option").count()).toBeGreaterThan(1);
  const bed = await beds.locator("option").nth(1).getAttribute("value");
  if (!bed) throw new Error("No available bed");
  await beds.selectOption(bed);
  await page
    .getByRole("button", { name: "Close live encounter", exact: true })
    .click();
  await values(page, "w3Disposition", {
    dispositionChoice: "admit",
    visitDiagnosis: "R50.9",
    dispositionCondition: "stable",
  });
  const command = page.waitForRequest(
    (r) => r.url().endsWith("/commit/commands") && r.method() === "POST",
  );
  const admitted = await save(page, "w3Disposition", "disposition");
  const authorization = await (await command).headerValue("authorization");
  if (!authorization) throw new Error("Missing authenticated command");
  const patient = await page.evaluate(
    () => window.__buttonAuditSession?.snapshot().state.patientContext?.patient,
  );
  const chart = async () =>
    (
      await page.request.get(`/commit/patients/${patient}/chart`, {
        headers: { authorization },
      })
    ).json();
  const current = await chart();
  expect(current.adt.admitted).toBe(true);
  expect(current.version).toBe(admitted.version);
  const context = await browser.newContext({ baseURL });
  try {
    const surgeon = await context.newPage();
    await open(surgeon, "P5", mrn);
    await values(surgeon, "w6Discharge", {
      decision0: "continue",
      dischargeDiagnosis: "K35.80",
      dischargeCondition: "stable",
      dischargeDestination: "home",
      dischargeFollowUp: "week",
      dischargeInstructions: "Keep the incision clean and attend follow-up.",
    });
    await save(surgeon, "w6Discharge", "discharge");
    expect((await chart()).adt.admitted).toBe(false);
  } finally {
    await context.close();
  }
});
