import { test, expect } from "@playwright/test";

// Navigation stays offline and each chosen node carries the exact certified artifact.
test("browser opens P3 day 5 and leaves patient selection inside the EHR", async ({
  page,
}) => {
  await page.goto("/browse?run=core-10day-live");
  await expect(
    page.getByRole("heading", { name: "Open a clinical UI" }),
  ).toBeVisible();
  await expect(page.getByLabel("Recorded run", { exact: true })).toHaveValue(
    "core-10day-live",
    { timeout: 30000 },
  );
  await expect(
    page
      .getByLabel("Recorded run", { exact: true })
      .locator("option[value=mock]"),
  ).toHaveCount(0);
  const day5 = page.getByRole("button", {
    name: /^P3 Inpatient RN, day 5, revision 2, certified/,
  });
  await expect(day5).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Choose a patient" }),
  ).toHaveCount(0);
  await expect(page.locator(".patient-card")).toHaveCount(0);
  for (const href of await page
    .locator('a[href*="/ehr?"]')
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute("href") ?? ""),
    ))
    expect(new URL(href, "http://localhost").searchParams.has("patient")).toBe(
      false,
    );
  await day5.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("button", { name: /^P3 Inpatient RN, day 6,/ }),
  ).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(
    /program=runs%2Fcore-10day-live%2Fprograms%2FP3%2Fv2.json/,
  );
  await expect(page).toHaveURL(/persona=P3/);
  await expect(page).toHaveURL(/day=5/);
  expect(new URL(page.url()).searchParams.has("patient")).toBe(false);
  await expect(page.locator(".clinical-app")).toBeVisible({ timeout: 30000 });
  await page.goBack();
  await expect(
    page.getByRole("region", { name: "Choose a patient" }),
  ).toHaveCount(0);
});

test("release grid orders v1 v2 v3 and exposes the vendor as a reference", async ({
  page,
}) => {
  await page.goto("/browse?run=core-10day-live");
  const grid = page.getByRole("table", { name: "" });
  await expect(grid.locator("thead th")).toHaveText([
    "View",
    "v1Initial EHR",
    "v2Day 4 release",
    "v3Day 7 release",
    "Latest personalizedNewest real run per persona",
  ]);
  await expect(
    grid.getByRole("row").filter({ hasText: "Vendor reference" }),
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

test("recorded changes and check-only history use actual artifacts and native verdicts", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/browse?run=core-10day-live");
  const card = page.getByRole("complementary", {
    name: "Selected revision details",
  });
  await page.locator('[data-node-key="P3-9"]').focus();
  await expect(
    card.getByLabel("Before and after changes", { exact: true }),
  ).toBeVisible();
  await expect(card).toContainText("Before");
  await expect(card).toContainText("After");
  await card.getByText("Raw JSON patch", { exact: true }).click();
  await expect(
    card
      .locator("details")
      .filter({ has: page.getByText("Raw JSON patch", { exact: true }) })
      .locator("pre"),
  ).toContainText('"op"');
  await card.getByText("Raw JSON patch", { exact: true }).click();
  await expect(card).toContainText("Check only: nothing is changed");
  await page.locator('[data-node-key="P2-8"]').focus();
  await expect(card.getByRole('region',{name:'Rejected candidates',exact:true})).toContainText('reviewsBeforeCommit');
  await page.locator('[data-node-key="P3-0"]').focus();
  const requests: string[] = [];
  page.on("request", (request) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method()))
      requests.push(new URL(request.url()).pathname);
  });
  await card
    .getByRole("button", {
      name: "Re-check against current release",
      exact: true,
    })
    .click();
  await expect(card.getByRole("status")).toContainText("Would be rejected:", {
    timeout: 60000,
  });
  expect(requests).toEqual(["/__dev/try-to-break-it"]);
  await page.locator('[data-node-key="P3-6"]').focus();
  await expect(card.getByRole("heading", { level: 3 })).toHaveText(
    /revision 3|rev 3/i,
  );
  await card
    .getByRole("button", {
      name: "Re-check against current release",
      exact: true,
    })
    .click();
  await expect(card.getByRole("status")).toHaveText("Still certified · v3", {
    timeout: 60000,
  });
  await page.locator('[data-node-key="P3-10"]').focus();
  await expect(card.getByLabel("Before and after changes", {exact:true})).toBeVisible();
  const check = await page.request.post("/__dev/try-to-break-it", {
    headers: { Origin: "https://untrusted.example" },
    data: {
      action: "check-revision",
      persona: "P1",
      program: "releases/v3/personas/P1.json",
    },
  });
  expect(check.status()).toBe(403);
});

test("timeline change comparison screenshot", async ({ page }) => {
  test.skip(!process.env.HISTORY_SHOTS, "Opt-in history screenshot");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/browse?run=core-10day-live");
  await expect(
    page.getByLabel("Before and after changes", { exact: true }),
  ).toBeVisible();
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: "shots/realism/punch/timeline-diff.png",
    animations: "disabled",
  });
});
