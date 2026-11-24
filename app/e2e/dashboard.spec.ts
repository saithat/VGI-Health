import { test, expect } from "@playwright/test";

test("opens the recorded run and its persona timeline", async ({ page }) => {
  const run = process.env.VGI_RUN ?? "";
  test.skip(!run, "Set VGI_RUN to a locally available recording");
  await page.goto(`/dashboard?run=${encodeURIComponent(run)}&persona=P3`);
  await expect(page.getByLabel("Recorded run")).toHaveValue(run);
  await expect(page.getByRole("navigation", { name: "Dashboard areas" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Version history" })).toBeVisible();
});

test("the empty dashboard points to the sample recording on the start page", async ({ page }) => {
  await page.route("**/runs/index.json", route => route.fulfill({json: []}));
  await page.route("**/runs/default.json", route => route.fulfill({json: {runId: null}}));
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", {name: "No recordings yet"})).toBeVisible();
  await expect(page.getByText(/Download sample recording/)).toBeVisible();
  await expect(page.getByRole("link", {name: "start page"})).toHaveAttribute("href", "/");
});

test("spec review defaults to the trusted base and shows all class counts", async ({
  page,
}) => {
  await page.route("**/runs/index.json", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/runs/default.json", (route) =>
    route.fulfill({ json: { runId: null } }),
  );
  await page.goto("/dashboard?view=Spec%20review");
  const catalog = await (await page.request.get("/spec-review.json")).json();
  const region = page.getByRole("region", {
    name: "Specifications awaiting owner review",
  });
  await expect(region.getByLabel("Class")).toHaveValue("trusted");
  await expect(region.getByRole("status")).toContainText(
    `${catalog.classes.trusted} shown`,
  );
  for (const label of [
    "Trusted base, review",
    "Proven lemma, no review needed",
    "Unverified code",
  ])
    await expect(region.locator("dt", { hasText: label })).toBeVisible();
  await expect(
    region.getByText("No headline theorem", { exact: false }),
  ).toBeVisible();
  await region.locator("summary").first().click();
  await expect(region.locator(".spec-item").first()).toBeVisible();
  await page.screenshot({
    path: `${process.env.TMPDIR}/review-surface/spec-review-1440x900.png`,
  });
  for (const key of ["proven", "unverified"]) {
    await region.getByLabel("Class").selectOption(key);
    await expect(region.getByRole("status")).toContainText(
      `${catalog.classes[key]} shown`,
    );
  }
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 1440);
});
