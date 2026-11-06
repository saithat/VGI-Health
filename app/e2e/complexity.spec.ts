import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { dayResultSchema } from "../../agent/src/schema";

test("P2 evolution chart distinguishes fixed exact minimum from simulated workload", async ({
  page,
}, testInfo) => {
  await page.goto("/dashboard?run=core-10day-live&persona=P2");
  const chart = page.getByRole("region", {
    name: "Union workflow complexity",
    exact: true,
  });
  await expect(
    chart.getByRole("img", {
      name: "P2 union exact expert minimum by UI iteration",
    }),
  ).toBeVisible();
  await expect(
    chart.getByText("Release v2 · rev 3", { exact: true }),
  ).toBeVisible();
  await expect(
    chart.getByText("Release v3 · rev 6", { exact: true }),
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
  ).toHaveText("55");
  const final = table
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name: "rev 7", exact: true }) });
  await expect(final.getByRole("cell").nth(2)).toHaveText("51");
  for (const [label, value] of [
    ["Keystrokes (secondary)", "231"],
    ["Scrolls", "6"],
    ["Scroll distance", "12,461"],
    ["Mouse travel", "17,296.09"],
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
      name: "P2 union simulated realistic workload by UI iteration",
    }),
  ).toBeVisible();
  await expect(final).toContainText("Days 10 · 14/14 tasks completed");
  await expect(final.getByRole("cell").nth(2)).toHaveText("59.286");
  await chart.getByLabel("Complexity metric").selectOption("mouseTravelPx");
  const day=dayResultSchema.parse(JSON.parse(await readFile(new URL('../../runs/core-10day-live/days/day-10/P2.json',import.meta.url),'utf8')));
  expect(day.tasks).toHaveLength(14);
  const mouseMean=day.tasks.reduce((sum,task)=>{
    if(typeof task.mouseTravelPx!=='number')throw Error('Recorded workload lacks mouse geometry');
    return sum+task.mouseTravelPx;
  },0)/day.tasks.length;
  await expect(final.getByRole("cell").nth(2)).toHaveText(new Intl.NumberFormat('en-US',{maximumFractionDigits:3}).format(mouseMean));
  await expect(chart.getByText(/straight-line travel/)).toBeVisible();
  if (testInfo.project.name === "desktop")
    await page.screenshot({
      path: "shots/dashboard-workload.png",
      fullPage: true,
    });
  await expect(
    chart.getByText(/Patient mix varies by iteration/),
  ).toBeVisible();
  await chart
    .getByText("Chart data and measurement definitions", { exact: true })
    .click();
  await chart.getByLabel("Complexity metric").selectOption("clicks");
  await chart.getByLabel("Compare personas").check();
  await expect(chart.locator(".complexity-multiples article")).toHaveCount(5);
  await expect(
    chart.getByText("No measured iterations in this run.", { exact: true }),
  ).toHaveCount(0);
  await chart.getByLabel("Compare personas").uncheck();
  await expect(chart.getByRole("img")).toHaveCount(1);
  await expect(page.getByRole("alert")).toHaveCount(0);
});
