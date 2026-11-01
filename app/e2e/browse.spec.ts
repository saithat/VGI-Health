import { test, expect } from "@playwright/test";

// Navigation stays offline and each chosen node carries the exact certified artifact.
test("browser leads with the real run, filters charts and opens P3 day 5", async ({
  page,
}) => {
  await page.goto("/browse");
  await expect(
    page.getByRole("heading", { name: "Open a clinical UI" }),
  ).toBeVisible();
  await expect(page.getByLabel("Recorded run", { exact: true })).toHaveValue(
    "run1-P3",
  );
  await expect(
    page
      .getByLabel("Recorded run", { exact: true })
      .locator("option[value=mock]"),
  ).toHaveCount(0);
  const day5 = page.getByRole("button", {
    name: /^P3 Inpatient RN, day 5, revision 4, certified/,
  });
  await expect(day5).toBeVisible();
  await page.getByRole("button", { name: "pediatric", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "pediatric", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page
      .getByRole("group", { name: "Matching patients" })
      .getByRole("button")
      .first(),
  ).toContainText("pediatric");
  await page.getByRole("button", { name: "pediatric", exact: true }).click();
  await page.getByLabel("Search by name or MRN").fill("Aaron");
  await expect(page.locator(".patient-card")).toHaveCount(1);
  await page.locator(".patient-card").click();
  await expect(page.getByLabel("Selected patient summary")).toContainText(
    "Aaron",
  );
  await day5.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("button", { name: /^P3 Inpatient RN, day 6,/ }),
  ).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(
    /program=runs%2Frun1-P3%2Fprograms%2FP3%2Fv4.json/,
  );
  await expect(page).toHaveURL(/persona=P3/);
  await expect(page.locator(".clinical-app")).toBeVisible();
});

test("release grid orders v1 v2 v3 and exposes the vendor as a reference", async ({
  page,
}) => {
  await page.goto("/browse");
  const grid = page.getByRole("table", { name: "" });
  await expect(grid.locator("thead th")).toHaveText([
    "View",
    "v1Initial EHR",
    "v2Day 4 release",
    "v3Day 7 release",
    "Latest personalizedNewest real run per persona",
  ]);
  await expect(
    grid.getByRole("row").filter({ hasText: "Vendor master (reference)" }),
  ).toContainText("Reference");
  await expect(grid.locator("tbody tr")).toHaveCount(6);
  await page.getByLabel("Show mock data", { exact: true }).check();
  await expect(
    page
      .getByLabel("Recorded run", { exact: true })
      .locator("option[value=mock]"),
  ).toHaveCount(1);
  await page
    .getByText("Bad programs (should be rejected)", { exact: false })
    .click();
  await expect(page.locator(".bad-program-list")).toContainText("Rejected");
});
