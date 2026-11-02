import { test, expect } from "@playwright/test";

test("P3 evolution chart distinguishes fixed exact minimum from simulated workload", async ({
  page,
}, testInfo) => {
  await page.goto("/dashboard?run=run1-P3");
  const chart = page.getByRole("region", {
    name: "Union workflow complexity",
    exact: true,
  });
  await expect(
    chart.getByRole("img", {
      name: "P3 union exact expert minimum by UI iteration",
    }),
  ).toBeVisible();
  await expect(
    chart.getByText("Release v2 · rev 2", { exact: true }),
  ).toBeVisible();
  await expect(
    chart.getByText("Release v3 · rev 5", { exact: true }),
  ).toBeVisible();
  await chart
    .getByText("Chart data and measurement definitions", { exact: true })
    .click();
  const table = chart.getByRole("table");
  await expect(table.getByRole("row")).toHaveCount(9);
  await expect(
    table
      .getByRole("row")
      .filter({ hasText: "rev 0 · baseline" })
      .getByRole("cell")
      .nth(2),
  ).toHaveText("25");
  const final = table
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name: "rev 7", exact: true }) });
  await expect(final.getByRole("cell").nth(2)).toHaveText("23");
  for (const [label, value] of [
    ["Keystrokes (secondary)", "39"],
    ["Scrolls", "Unavailable"],
    ["Scroll distance", "Unavailable"],
    ["Mouse travel", "Unavailable"],
  ] as const) {
    await chart.getByLabel("Complexity metric").selectOption({ label });
    await expect(final.getByRole("cell").nth(2)).toHaveText(value);
  }
  await expect(chart.getByLabel("Complexity metric").locator('option')).toHaveCount(5);
  await chart.getByLabel("Complexity metric").selectOption("clicks");
  await chart.getByLabel("Complexity measure").selectOption("workload");
  await expect(chart.getByLabel("Complexity metric")).toHaveValue("clicks");
  await expect(
    chart.getByRole("img", {
      name: "P3 union simulated realistic workload by UI iteration",
    }),
  ).toBeVisible();
  await expect(final).toContainText("Days 9, 10 · 89/89 tasks completed");
  await expect(final.getByRole("cell").nth(2)).toHaveText("15.629");
  await chart.getByLabel("Complexity metric").selectOption("mouseTravelPx");
  await expect(final.getByRole("cell").nth(2)).toHaveText("Unavailable");
  await expect(chart.getByText(/straight-line travel/)).toBeVisible();
  await chart
    .getByText("Chart data and measurement definitions", { exact: true })
    .click();
  if (testInfo.project.name === "desktop")
    await page.screenshot({
      path: "shots/dashboard-workload.png",
      fullPage: true,
    });
  await expect(
    chart.getByText(/Patient mix varies by iteration/),
  ).toBeVisible();
  await chart.getByLabel("Complexity metric").selectOption("clicks");
  await chart.getByLabel("Compare personas").check();
  await expect(chart.locator(".complexity-multiples article")).toHaveCount(5);
  await expect(
    chart.getByText("No measured iterations in this run.", { exact: true }),
  ).toHaveCount(4);
  await chart.getByLabel("Compare personas").uncheck();
  await expect(chart.getByRole("img")).toHaveCount(1);
  await expect(page.getByRole("alert")).toHaveCount(0);
});
