import { test, expect } from "@playwright/test";

test("trajectory filters, paging, same-task control and bookmarks on the complete run", async ({
  page,
}) => {
  test.setTimeout(90000);
  const requests: string[] = [];
  page.on("request", (request) =>
    requests.push(new URL(request.url()).pathname),
  );
  await page.goto(
    "/dashboard?run=core-10day-live&persona=P1&view=Trajectories",
  );
  const view = page.getByRole("region", { name: "All task trajectories" });
  await expect(
    view.getByRole("button", { name: "Play", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await expect(
    view.getByRole("region", { name: "Same task agent versus control" }),
  ).toContainText("No-agent");
  await view.getByLabel("Trajectory day").selectOption("");
  await expect(
    view.getByRole("listbox", { name: "Recorded tasks" }).getByRole("option"),
  ).toHaveCount(40);
  await view.getByRole("button", { name: "Next tasks", exact: true }).click();
  await expect(view.getByText(/Page 2 \/ /)).toBeVisible();
  await view.getByLabel("Trajectory completion").selectOption("false");
  await expect(
    view.getByRole("listbox", { name: "Recorded tasks" }).getByRole("option"),
  ).toHaveCount(8);
  await expect(view.locator(".trajectory-incomplete")).toHaveCount(8);
  await view.getByLabel("Trajectory workflow").selectOption("W1");
  await view
    .getByRole("searchbox", { name: "Search tasks" })
    .fill("d07-P1-W1-004");
  await expect(
    view.getByRole("listbox", { name: "Recorded tasks" }).getByRole("option"),
  ).toHaveCount(1);
  await expect(view.locator(".trajectory-playback > h3")).toContainText(
    "d07-P1-W1-004",
  );
  await expect(
    view.getByRole("button", { name: "Play", exact: true }),
  ).toBeEnabled();
  await expect(
    view.getByText(
      "Incomplete trajectory · the recorded task did not meet its goals.",
    ),
  ).toBeVisible();
  const bookmark = page.url();
  expect(bookmark).toContain("completed=false");
  expect(bookmark).toContain("task=d07-P1-W1-004");
  await page.reload();
  await expect(view.getByLabel("Trajectory completion")).toHaveValue("false");
  await expect(view.getByLabel("Trajectory workflow")).toHaveValue("W1");
  await expect(
    view.getByRole("searchbox", { name: "Search tasks" }),
  ).toHaveValue("d07-P1-W1-004");
  await expect(
    view.getByRole("button", { name: "Play", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await view.getByRole("button", { name: "Step", exact: true }).click();
  await expect(
    page.frameLocator('iframe[title="Recorded EHR"]').locator("html"),
  ).toHaveAttribute("data-replay-count", "1");
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(requests.some((path) => /geometry\/.+\/slices\//.test(path))).toBe(
    true,
  );
  expect(
    requests.some((path) => /geometry\/[a-f0-9.]+\.json$/.test(path)),
  ).toBe(false);
  await page.screenshot({
    path: `${test.info().outputDir}/trajectories.png`,
    fullPage: true,
  });
});

test("warm section switches reuse the index; Compare excludes incomplete tasks", async ({
  page,
}) => {
  test.setTimeout(90000);
  const requests: string[] = [];
  page.on("request", (request) =>
    requests.push(new URL(request.url()).pathname),
  );
  await page.goto(
    "/dashboard?run=core-10day-live&persona=P1&view=Trajectories&day=7&workflow=W1",
  );
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  const nav = page.getByRole("navigation", { name: "Dashboard areas" });
  await nav.getByRole("button", { name: "Compare", exact: true }).click();
  const compare = page.getByRole("region", {
    name: "Compare trajectories",
    exact: true,
  });
  await expect(compare.getByLabel("Right trajectory")).toBeVisible();
  const keys = await compare
    .getByLabel("Right trajectory")
    .locator("option")
    .evaluateAll((options) =>
      options.map((option) => option.getAttribute("value")),
    );
  expect(keys).not.toContain("d07-P1-W1-002");
  expect(keys).not.toContain("d07-P1-W1-004");
  expect(keys).not.toContain("d07-P1-W1-012");
  await expect(
    page.locator(".trajectory-comparison .trajectory-frame"),
  ).toHaveCount(2, {
    timeout: 30000,
  });
  await compare.getByRole("button", { name: "Play", exact: true }).click();
  await nav.getByRole("button", { name: "Releases", exact: true }).click();
  const hiddenCompare = page.locator(".trajectory-comparison");
  await expect(
    hiddenCompare.getByRole("button", {
      name: "Play",
      exact: true,
      includeHidden: true,
    }),
  ).toHaveCount(1);
  await nav.getByRole("button", { name: "Trajectories", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeEnabled();
  const hiddenPosition = await hiddenCompare
    .getByLabel("Compare replay position")
    .textContent();
  await page.getByRole("button", { name: "Step", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  expect(
    await hiddenCompare.getByLabel("Compare replay position").textContent(),
  ).toBe(hiddenPosition);
  expect(
    requests.filter(
      (path) => path === "/runs/core-10day-live/trajectories/index.json",
    ),
  ).toHaveLength(1);
  const slice = requests.find((path) => /geometry\/.+\/slices\//.test(path));
  if (!slice) throw new Error("Missing geometry slice request");
  const response = await page.request.get(slice);
  expect(response.status()).toBe(200);
  expect(response.headers().etag).toBeTruthy();
  const cached = await page.request.get(slice, {
    headers: { "If-None-Match": response.headers().etag ?? "" },
  });
  expect(cached.status()).toBe(304);
});
