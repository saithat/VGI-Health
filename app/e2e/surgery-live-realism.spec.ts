import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { backendAvailable } from "../src/data/medplum";

async function openClinic(
  page: Page,
  name: "Aaron" | "Terrance",
  inspect: boolean,
) {
  await page.goto(`/?audit=buttons${inspect ? "&inspect=1" : ""}`);
  await page.getByRole("button", { name: /^P5 · / }).click();
  await page.getByLabel("Patient search", { exact: true }).fill(name);
  await page
    .getByRole("button", { name: "Search patients", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: new RegExp(
        `${name}.*${name === "Aaron" ? "Ankunding" : "Abshire"}`,
      ),
    })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Start new encounter", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Open EHR", exact: true }),
  ).toBeEnabled();
}

test("surgical live review keeps readable receipts and the saved record binding", async ({
  page,
}) => {
  test.skip(!(await backendAvailable()), "Local Medplum is down");
  test.setTimeout(120000);
  page.setDefaultTimeout(15000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const stage = process.env.SURG_LIVE_REVIEW === "before" ? "before" : "after";
  const capture = async (name: string) => {
    if (!process.env.SURG_LIVE_REVIEW) return;
    await mkdir(`shots/realism/surg/${stage}`, { recursive: true });
    await page.screenshot({
      path: `shots/realism/surg/${stage}/${name}.png`,
      animations: "disabled",
    });
  };
  await openClinic(page, "Aaron", true);
  if (stage === "after")
    await expect(page.locator("main.live-home")).not.toContainText(
      /Patient\/|[0-9a-f]{8}-[0-9a-f]{4}-/i,
    );
  await capture("live-encounter-picker");
  await page.getByRole("button", { name: "Open EHR", exact: true }).click();
  await expect(page.locator(".clinical-app")).toBeVisible();
  if (stage === "after") {
    await expect(page.locator(".clinical-encounter")).toHaveText(
      /^.+ · General surgeon$/,
    );
    await expect(
      page.getByRole("banner", { name: "Patient banner", exact: true }),
    ).toContainText("Office Visit");
    await expect(
      page.getByRole("banner", { name: "Patient banner", exact: true }),
    ).not.toContainText("Preoperative chart review");
  }
  await page
    .locator('[data-comp-id="home.work.w1Rooming"][data-event="click"]')
    .click();
  await page
    .getByRole("button", { name: "Mark allergies reviewed", exact: true })
    .click();
  const notice = page
    .locator(".mantine-Notification-root")
    .filter({ has: page.locator("button[data-resource-link]") })
    .last();
  await expect(notice).toBeVisible();
  if (stage === "after") {
    await expect(notice).toContainText("Allergies");
    await expect(notice).not.toContainText(
      /\/medplum\/fhir\/|markReviewed|[0-9a-f]{8}-[0-9a-f]{4}-/i,
    );
    const banner = await page.getByRole("banner").boundingBox();
    const toast = await notice.boundingBox();
    expect(banner).not.toBeNull();
    expect(toast).not.toBeNull();
    if (banner && toast)
      expect(toast.y).toBeGreaterThanOrEqual(banner.y + banner.height);
  }
  await capture("live-review-save");
  await page
    .getByRole("button", { name: "Live encounter", exact: true })
    .click();
  const details = page.getByRole("dialog", {
    name: "Live Medplum encounter",
    exact: true,
  });
  await expect(details).toBeVisible();
  if (stage === "after")
    await expect(details).not.toContainText(
      /Encounter\/|\/medplum\/fhir\/|[0-9a-f]{8}-[0-9a-f]{4}-/i,
    );
  await capture("live-encounter-details");
  const record = details.locator("button[data-resource-link]").first();
  const link = await record.getAttribute("data-resource-link");
  await record.click();
  const saved = page.getByRole("dialog", {
    name: "Saved Medplum resource",
    exact: true,
  });
  const json = saved.getByLabel("Saved resource JSON", { exact: true });
  await expect(json).toContainText('"resourceType": "Provenance"');
  const resource: unknown = JSON.parse(await json.innerText());
  if (
    typeof resource !== "object" ||
    resource === null ||
    !("id" in resource) ||
    typeof resource.id !== "string"
  )
    throw new Error("Expected saved review record");
  expect(link).toContain(resource.id);
  await saved
    .getByRole("button", { name: "Close saved resource", exact: true })
    .click();
  await details
    .getByRole("button", { name: "Close live encounter", exact: true })
    .click();
});

test("normal surgical clinic keeps technical save controls out of the patient workspace", async ({
  page,
}) => {
  test.skip(!(await backendAvailable()), "Local Medplum is down");
  page.setDefaultTimeout(15000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openClinic(page, "Terrance", false);
  await page.getByRole("button", { name: "Open EHR", exact: true }).click();
  await expect(page.locator(".clinical-app")).toBeVisible();
  await expect(page.locator(".clinical-encounter")).toHaveText(
    /^.+ · General surgeon$/,
  );
  await expect(
    page.getByRole("button", { name: "Live encounter", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Inspector", exact: true }),
  ).toHaveCount(0);
  await page
    .locator('[data-comp-id="home.work.w1Rooming"][data-event="click"]')
    .click();
  await expect(
    page.getByRole("banner", { name: "Patient banner", exact: true }),
  ).toContainText("Office Visit");
  await page
    .getByRole("button", { name: "Mark allergies reviewed", exact: true })
    .click();
  const notice = page
    .locator(".mantine-Notification-root")
    .filter({ hasText: "Allergies review recorded" })
    .last();
  await expect(notice).toBeVisible();
  await expect(notice).not.toContainText(
    /\/medplum\/fhir\/|markReviewed|[0-9a-f]{8}-[0-9a-f]{4}-/i,
  );
  await page.getByRole("tab", { name: "Results", exact: true }).click();
  await expect(
    page.locator('[data-info-id="labResults"]').first(),
  ).toContainText("eGFR (MDRD)");
  await expect(page.locator("button[data-resource-link]")).toHaveCount(0);
  if (process.env.SURG_LIVE_REVIEW) {
    await mkdir("shots/realism/surg/after", { recursive: true });
    await page.screenshot({
      path: "shots/realism/surg/after/live-review-save-normal.png",
      animations: "disabled",
    });
  }
  await page.getByRole("button", { name: "Close chart", exact: true }).click();
  await expect(page.locator("main.live-home")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Refresh worklist", exact: true }),
  ).toBeVisible();
});
