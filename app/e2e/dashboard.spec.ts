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
