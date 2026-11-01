import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
test("live P1 In Basket opens its patient without clinical writes", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?date=2026-11-02&audit=buttons");
  await page.getByRole("button", { name: /^P1 ·/ }).click();
  await expect(
    page.getByLabel("Patient search by name or MRN", { exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: /^In Basket · Results/ }).click();
  const open = page.getByRole("button", { name: /^Open chart:/ }).first();
  await expect(open).toBeVisible();
  mkdirSync("shots/realism/live-select", { recursive: true });
  await page.screenshot({ path: "shots/realism/live-select/P1-inbasket.png" });
  await open.click();
  await expect(
    page.getByRole("banner", { name: "Patient banner", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: "shots/realism/live-select/P1-chart.png" });
});
