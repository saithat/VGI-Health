import { test, expect } from "@playwright/test";

test("opens the recorded run and its persona timeline", async ({ page }) => {
  const run = process.env.VGI_RUN ?? "";
  test.skip(!run, "Set VGI_RUN to a locally available recording");
  await page.goto(`/dashboard?run=${encodeURIComponent(run)}&persona=P3`);
  await expect(page.getByLabel("Recorded run")).toHaveValue(run);
  await expect(page.getByRole("navigation", { name: "Dashboard areas" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Version history" })).toBeVisible();
});
