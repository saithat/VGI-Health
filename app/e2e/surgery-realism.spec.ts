import {
  enterPatientChart,
  navigateClinicalScreen,
} from "./clinical-navigation";
import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const shotDirectory =
  process.env.SURG_REALISM_SHOT_DIR ?? "shots/realism/surg/after";

function control(page: Page, comp: string, event = "click") {
  return page.locator(`[data-comp-id="${comp}"][data-event="${event}"]`);
}

test("surgeon opens a case, documents a note, loads orders and returns to clinic through Lean", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(120000);
  const desktop = (page.viewportSize()?.width ?? 0) > 700;
  if (desktop) await page.setViewportSize({ width: 1440, height: 900 });
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
      audit: "buttons",
    })}`,
  );
  await enterPatientChart(page, "38529840");
  expect(
    await page.evaluate(
      () => window.__buttonAuditSession?.snapshot().state.patientContext?.bound,
    ),
  ).toBe("7cf1e4aa-23ea-3b40-5a62-7aa19e62c5bf");
  await navigateClinicalScreen(page, "w6PreOp");
  const nav = page.locator("nav [data-comp-id]");
  const assertSourceNavigation = async () => {
    const expected = await page.evaluate(() =>
      window.__buttonAuditSession
        ?.snapshot()
        .ui?.nav.flatMap(([, items]) => items.map(([id]) => id)),
    );
    expect(expected?.length).toBeGreaterThan(0);
    expect(
      await nav.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-comp-id")),
      ),
    ).toEqual(expected);
  };
  await assertSourceNavigation();
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
    ["w6Sign", "Sign Orders"],
    ["w6OpNote", "Brief Op Note"],
    ["w6PostOp", "Postprocedure Orders"],
    ["w6Rounding", "Rounding"],
    ["w6Discharge", "Discharge"],
    ["w6Consults", "Consults"],
    ["w6Consult", "Consult Note"],
    ["w6ConsultClose", "Sign Consult"],
    ["w6Schedule", "OR Schedule"],
  ]) {
    await control(page, `${current}.nav.${target}`).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      title ?? "",
    );
    if (desktop)
      await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
    current = target ?? "";
    await expect(control(page, `${current}.nav.${current}`)).toHaveAttribute(
      "aria-current",
      "page",
    );
  }
  await control(page, "w6Schedule.nav.w6OpNote").click();
  const procedure = control(page, "w6OpNote.opProcedure", "enter");
  await procedure.fill("cholecystectomy");
  await control(page, "w6OpNote.opSurgeons", "enter").click();
  await expect(procedure).toHaveValue("");
  // A stationary pointer over a moving option clears Mantine's keyboard highlight.
  await page.mouse.move(0, 0);
  await procedure.fill("cholecystectomy");
  const procedureOption = page.getByRole("option", {
    name: "Laparoscopic cholecystectomy (47562)",
    exact: true,
  });
  await expect(procedureOption).toBeVisible();
  // Wait for the search's first-option highlight before exercising keyboard moves.
  await expect(procedureOption).toHaveAttribute("data-combobox-selected");
  await procedure.press("ArrowDown");
  await expect(
    page.getByRole("option", {
      name: "Use code: cholecystectomy",
      exact: true,
    }),
  ).toHaveAttribute("data-combobox-selected");
  await procedure.press("ArrowUp");
  await expect(procedureOption).toHaveAttribute("data-combobox-selected");
  const optionContrast = await procedureOption.evaluate((element) => {
    const rgb = (value: string) =>
      (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const luminance = (channels: number[]) =>
      channels.reduce((sum, channel, index) => {
        const value = channel / 255;
        const linear =
          value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        return sum + linear * ([0.2126, 0.7152, 0.0722][index] ?? 0);
      }, 0);
    const foreground = luminance(
      rgb(getComputedStyle(element.querySelector("span") ?? element).color),
    );
    const background = luminance(
      rgb(getComputedStyle(element).backgroundColor),
    );
    return (
      (Math.max(foreground, background) + 0.05) /
      (Math.min(foreground, background) + 0.05)
    );
  });
  expect(optionContrast).toBeGreaterThanOrEqual(4.5);
  if (desktop) {
    await mkdir(shotDirectory, { recursive: true });
    await page.screenshot({
      path: `${shotDirectory}/w6OpNote-code-search.png`,
      animations: "disabled",
    });
  }
  await procedureOption.click();
  await expect(procedure).toHaveValue("47562");
  const diagnosis = control(page, "w6OpNote.opPreopDiagnosis", "enter");
  await diagnosis.fill("gallbladder");
  await page
    .getByRole("option", {
      name: "Gallbladder stones, no cholecystitis or obstruction (K80.20)",
      exact: true,
    })
    .click();
  await expect(diagnosis).toHaveValue("K80.20");
  const postoperativeDiagnosis = control(
    page,
    "w6OpNote.opPostopDiagnosis",
    "enter",
  );
  await postoperativeDiagnosis.fill("R10.84");
  await page
    .getByRole("option", { name: "Use code: R10.84", exact: true })
    .click();
  await expect(postoperativeDiagnosis).toHaveValue("R10.84");
  if (desktop)
    await page.screenshot({
      path: `${shotDirectory}/w6OpNote-code-selected.png`,
      animations: "disabled",
    });
  const findings = control(page, "w6OpNote.opFindings", "enter");
  await expect(findings).toHaveJSProperty("tagName", "TEXTAREA");
  await findings.fill("Operative findings:\nDocumented by the surgeon.");
  await control(page, "w6OpNote.opSpecimens", "enter").scrollIntoViewIfNeeded();
  if (desktop)
    await expect(page.getByRole("banner")).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole("banner")).toContainText("General surgeon");
  await control(page, "w6OpNote.nav.w6Rounding").click();
  await control(page, "w6Rounding.nav.w6OpNote").click();
  await expect(findings).toHaveValue(
    "Operative findings:\nDocumented by the surgeon.",
  );
  await expect(procedure).toHaveValue("47562");
  await expect(diagnosis).toHaveValue("K80.20");
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
  await assertSourceNavigation();
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
