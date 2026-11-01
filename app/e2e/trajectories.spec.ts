import { test, expect } from "@playwright/test";

test("all trajectories load on selection and replay on the semantic WASM EHR", async ({
  page,
}) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) =>
    requests.push(new URL(request.url()).pathname),
  );
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/dashboard?run=run1-P3&view=Evolution");
  await expect(
    page.getByRole("heading", { name: "Evolution", exact: true }),
  ).toBeVisible();
  expect(requests.filter((p) => /trajectories\/tasks\//.test(p))).toHaveLength(
    0,
  );
  await page.getByRole("button", { name: "Trajectories", exact: true }).click();
  const view = page.getByRole("region", { name: "All task trajectories" });
  await expect(
    view.getByText("424 logged tasks for P3.", { exact: false }),
  ).toBeVisible();
  await expect(
    view.getByRole("listbox", { name: "Recorded tasks" }).getByRole("option"),
  ).toHaveCount(38);
  const frame = page.frameLocator('iframe[title="Recorded EHR"]');
  await expect(
    frame.getByRole("banner", { name: "Patient banner" }),
  ).toBeVisible();
  await expect(
    frame.locator('[data-trajectory-highlight="true"]').first(),
  ).toBeVisible();
  // Only the selected task is fetched; task data remains outside the eager run loader.
  expect(
    new Set(requests.filter((p) => /trajectories\/tasks\//.test(p))),
  ).toHaveProperty("size", 1);
  await view.getByRole("button", { name: "Step", exact: true }).click();
  await expect(view.getByLabel("Replay position")).toHaveText("1 / 69");
  await expect(frame.getByRole("heading", { level: 1 })).not.toHaveText(
    "Patient workspace",
  );
  await view.getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    view.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await expect(view.getByLabel("Replay position")).not.toHaveText("1 / 69");
  await view.getByRole("button", { name: "Pause", exact: true }).click();
  await view.getByLabel("Compare baseline v0").check();
  await expect(
    page
      .frameLocator('iframe[title="Baseline v0 EHR"]')
      .getByRole("banner", { name: "Patient banner" }),
  ).toBeVisible();
  await view.getByLabel("Compare baseline v0").uncheck();
  // Jump across both episode resets and a clinical alert, keeping the controls usable.
  await view.getByLabel("Replay event").fill("30");
  await expect(frame.getByRole("dialog")).toBeVisible();
  await view.getByRole("button", { name: "Step", exact: true }).click();
  await expect(frame.getByRole("dialog")).toHaveCount(0);
  await view.getByLabel("Replay event").fill("69");
  await expect(
    view.getByText("Trajectory finished", { exact: true }),
  ).toBeVisible();
  await expect(
    view.getByText("27 clicks · 39 keys · 40 scrolls · 255.1s KLM", {
      exact: true,
    }),
  ).toBeVisible();
  await view.getByLabel("Trajectory day").selectOption("7");
  await view
    .getByRole("searchbox", { name: "Search tasks" })
    .fill("d07-P3-W4-001");
  await expect(
    view.getByRole("listbox", { name: "Recorded tasks" }).getByRole("option"),
  ).toHaveCount(1);
  await expect(
    view.getByRole("heading", { name: /d07-P3-W4-001 · W4 · v5 \/ v2/ }),
  ).toBeVisible();
  await expect(
    frame.getByRole("banner", { name: "Patient banner" }),
  ).toBeVisible();
  await view.getByRole("button", { name: "Step", exact: true }).click();
  await expect(view.getByLabel("Replay position")).toContainText("1 /");
  await view.getByRole("button", { name: "Step", exact: true }).click();
  await expect(view.getByLabel("Replay position")).toContainText("2 /");
  await expect(frame.getByRole("heading", { level: 1 })).toBeInViewport();
  await page.screenshot({ path: "shots/trajectories.png", fullPage: true });
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(errors).toEqual([]);
  await page.close();
});
