import { test, expect } from "@playwright/test";

test("renamed recording opens the four dashboard views at 1440×900", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const summary = await request.get("/runs/core-10day/summary.json");
  expect(summary.ok()).toBe(true);
  expect((await summary.json()).manifest).toMatchObject({
    runId: "core-10day",
    daysCompleted: 10,
    nightsCompleted: 9,
  });
  await page.goto("/dashboard?run=core-10day&persona=P3&view=Evolution");
  await expect(
    page.getByRole("heading", { name: "UI evolution", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Recorded run")).toHaveValue("core-10day");
  const nav = page.getByRole("navigation", { name: "Dashboard areas" });
  await nav.getByRole("button", { name: "Trajectories", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "All task trajectories" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("listbox", { name: "Recorded tasks" })
      .getByRole("option")
      .first(),
  ).toBeVisible();
  await nav.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Compare trajectories", exact: true }),
  ).toBeVisible();
  await nav.getByRole("button", { name: "Releases", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Releases", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => ({ width: innerWidth, height: innerHeight })),
  ).toEqual({ width: 1440, height: 900 });
  expect(errors).toEqual([]);
});

test("active summary refresh keeps the selected view and page document", async ({
  page,
}) => {
  await page.clock.install();
  let reads = 0;
  await page.route("**/runs/core-10day/summary.json", async (route) => {
    const response = await page.request.get(route.request().url());
    const body = await response.json();
    const count = ++reads === 1 ? 1 : 2;
    body.manifest = {
      ...body.manifest,
      status: "running",
      warning: null,
      daysCompleted: count,
      nightsCompleted: count - 1,
      prefixKey: `prefix-${count}`,
    };
    body.days = body.days.filter((day: { day: number }) => day.day <= count);
    body.baselines = body.baselines.filter(
      (day: { day: number }) => day.day <= count,
    );
    body.noAgentDays = body.noAgentDays.filter(
      (day: { day: number }) => day.day <= count,
    );
    body.records = body.records.filter(
      (record: { night: number }) => record.night < count,
    );
    body.files = [];
    body.complexity = null;
    body.ruleConformance = null;
    await route.fulfill({ response, json: body });
  });
  await page.goto("/dashboard?run=core-10day&persona=P3&view=Releases");
  await expect(
    page.getByRole("status").filter({ hasText: "1 completed days" }),
  ).toBeVisible();
  const document = await page.locator("html").elementHandle();
  await page.clock.fastForward(30_100);
  await expect(
    page.getByRole("status").filter({ hasText: "2 completed days" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Releases", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  expect(
    await document?.evaluate(
      (element) => element === window.document.documentElement,
    ),
  ).toBe(true);
  expect(reads).toBe(2);
});
