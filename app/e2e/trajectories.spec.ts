import { test, expect } from "@playwright/test";
import { trajectoryIndexSchema } from "../src/dashboard/trajectories-data";

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
  const iframe = page.locator('iframe[title="Recorded EHR"]');
  const logicalSize = () =>
    iframe.evaluate((element) => ({
      width: element.clientWidth,
      height: element.clientHeight,
      viewportWidth:
        element instanceof HTMLIFrameElement
          ? element.contentWindow?.innerWidth
          : undefined,
      viewportHeight:
        element instanceof HTMLIFrameElement
          ? element.contentWindow?.innerHeight
          : undefined,
    }));
  const initialSize = await logicalSize();
  expect(initialSize).toEqual({
    width: 1440,
    height: 900,
    viewportWidth: 1440,
    viewportHeight: 900,
  });
  const initialBounds = await iframe.boundingBox();
  await view.getByLabel("Playback speed").selectOption("4");
  for (let count = 1; count <= 10; count++) {
    await view.getByRole("button", { name: "Step", exact: true }).click();
    await expect(frame.locator("html")).toHaveAttribute(
      "data-replay-count",
      String(count),
    );
  }
  expect(await logicalSize()).toEqual(initialSize);
  const afterBounds = await iframe.boundingBox();
  expect(afterBounds?.width).toBe(initialBounds?.width);
  expect(afterBounds?.height).toBe(initialBounds?.height);
  // Browser resize changes only the transform, never the recorded layout.
  await page.setViewportSize({ width: 1120, height: 760 });
  expect(await logicalSize()).toEqual(initialSize);
  await page.setViewportSize({ width: 1440, height: 900 });
  await view.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(frame.locator("html")).toHaveAttribute("data-replay-count", "0");
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
  await view.getByLabel("Compare baseline rev 0").check();
  await expect(
    page
      .frameLocator('iframe[title="Baseline rev 0 EHR"]')
      .getByRole("banner", { name: "Patient banner" }),
  ).toBeVisible();
  await view.getByLabel("Compare baseline rev 0").uncheck();
  // Jump across both episode resets and a clinical alert, keeping the controls usable.
  await view.getByLabel("Replay event").fill("30");
  await expect(frame.getByRole("dialog")).toBeVisible();
  await view.getByRole("button", { name: "Step", exact: true }).click();
  await expect(frame.getByRole("dialog")).toHaveCount(0);
  await view.getByLabel("Replay event").fill("69");
  await expect(
    view.getByText("Trajectory finished", { exact: true }),
  ).toBeVisible();
  await expect(view.locator(".trajectory-counters")).toContainText(
    "27 clicks · 39 keys · 40 scrolls · 69 events",
  );
  await view.getByLabel("Trajectory day").selectOption("7");
  await view
    .getByRole("searchbox", { name: "Search tasks" })
    .fill("d07-P3-W4-001");
  await expect(
    view.getByRole("listbox", { name: "Recorded tasks" }).getByRole("option"),
  ).toHaveCount(1);
  await expect(
    view.getByRole("heading", { name: /d07-P3-W4-001 · W4 · rev 5 \/ v3/ }),
  ).toBeVisible();
  await expect(
    frame.getByRole("banner", { name: "Patient banner" }),
  ).toBeVisible();
  await view.getByRole("button", { name: "Step", exact: true }).click();
  await expect(view.getByLabel("Replay position")).toContainText("1 /");
  await view.getByRole("button", { name: "Step", exact: true }).click();
  await expect(view.getByLabel("Replay position")).toContainText("2 /");
  // Scroll the recorded screen inside its iframe as well as the outer page.
  // The complete narrow navigator can place the heading below the initial frame.
  await frame.getByRole("heading", { level: 1 }).scrollIntoViewIfNeeded();
  await expect(frame.getByRole("heading", { level: 1 })).toBeInViewport();
  await page.screenshot({ path: "shots/trajectories.png", fullPage: true });
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(errors).toEqual([]);
  await page.close();
});

test("fixed playback supports fullscreen, shortcuts and visible interactions", async ({
  page,
}, testInfo) => {
  await page.goto("/dashboard?run=run1-P3&view=Trajectories");
  const view = page.getByRole("region", { name: "All task trajectories" });
  const frame = page.frameLocator('iframe[title="Recorded EHR"]');
  const iframe = page.locator('iframe[title="Recorded EHR"]');
  await expect(
    frame.getByRole("banner", { name: "Patient banner" }),
  ).toBeVisible();
  await view.getByLabel("Playback speed").selectOption("2");
  await view.getByRole("button", { name: "Step", exact: true }).click();
  await expect(frame.locator(".trajectory-cursor")).toHaveCSS("opacity", "1");
  await expect(frame.locator("html")).toHaveAttribute("data-replay-count", "1");
  // Scrolls move the recorded document while its logical viewport stays fixed.
  const before = await frame.locator("html").evaluate(() => window.scrollY);
  const outerBefore = await page.evaluate(() => window.scrollY);
  await view.getByRole("button", { name: "Step", exact: true }).click();
  await expect(frame.locator("html")).toHaveAttribute("data-replay-count", "2");
  await expect
    .poll(() => frame.locator("html").evaluate(() => window.scrollY))
    .toBeGreaterThan(before);
  expect(await page.evaluate(() => window.scrollY)).toBe(outerBefore);
  await view.getByRole("button", { name: "Step", exact: true }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(view.getByLabel("Replay position")).toHaveText("1 / 69");
  await page.keyboard.press("ArrowRight");
  await expect(view.getByLabel("Replay position")).toHaveText("2 / 69");
  await page.keyboard.press("Space");
  await expect(
    view.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Space");
  await expect(
    view.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await view.getByLabel("Replay event").fill("19");
  await expect(frame.locator("html")).toHaveAttribute(
    "data-replay-count",
    "19",
  );
  await view.getByLabel("Playback speed").selectOption("0.5");
  const field = frame.getByRole("textbox", {
    name: "Double check: second nurse",
    exact: true,
  });
  await view.getByRole("button", { name: "Step", exact: true }).click();
  await expect.poll(() => field.inputValue()).toMatch(/^P/);
  await expect(frame.locator("html")).toHaveAttribute(
    "data-replay-count",
    "20",
  );
  await expect(field).toHaveValue("P3-second");
  await iframe.scrollIntoViewIfNeeded();
  if (testInfo.project.name === "desktop")
    await page.screenshot({ path: "shots/final/trajectory-playback.png" });
  await view.getByRole("button", { name: "Fullscreen", exact: true }).click();
  if (await page.evaluate(() => document.fullscreenEnabled)) {
    await expect
      .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
      .toBe(true);
    await expect(
      view.getByRole("button", { name: "Exit fullscreen", exact: true }),
    ).toBeVisible();
    expect(
      await iframe.evaluate((element) => [
        element.clientWidth,
        element.clientHeight,
      ]),
    ).toEqual([1440, 900]);
    if (testInfo.project.name === "desktop")
      await page.screenshot({
        path: "shots/final/trajectory-playback-fullscreen.png",
      });
    await page.keyboard.press("Escape");
    // Some headless Chromium builds keep fullscreen on synthetic Escape.
    if (await page.evaluate(() => Boolean(document.fullscreenElement)))
      await view
        .getByRole("button", { name: "Exit fullscreen", exact: true })
        .click();
    await expect
      .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
      .toBe(false);
  } else {
    expect(
      await iframe.evaluate((element) => [
        element.clientWidth,
        element.clientHeight,
      ]),
    ).toEqual([1440, 900]);
    if (testInfo.project.name === "desktop")
      await page.screenshot({
        path: "shots/final/trajectory-playback-fullscreen.png",
      });
  }
});

test("new-run identifiers and optional mouse geometry use the shared playback", async ({
  page,
}) => {
  // This is an aliased recording fixture, not evidence of a real core-10day run.
  await page.route("**/runs/index.json", async (route) => {
    const response = await page.request.get(route.request().url());
    await route.fulfill({
      response,
      body: (await response.text()).replaceAll("run1-P3", "core-10day"),
    });
  });
  await page.route("**/runs/core-10day/**", async (route) => {
    const url = route.request().url();
    const geometry =
      /\/geometry\/([a-f0-9]{64})(?:\.([a-f0-9]{64}))?(?:\.json|\/slices\/tasks\/[\w.-]+\.json)$/.exec(
        url,
      );
    if (geometry) {
      await route.fulfill({
        json: {
          schemaVersion: 1,
          programHash: geometry[1],
          componentsSha256: geometry[2],
          appSha256: "fixture",
          viewport: { width: 1440, height: 900 },
          source: "recorded-fixture",
          states: [
            {
              screen: "home",
              state: "fixture",
              viewport: { width: 1440, height: 900 },
              components: {
                "home.work.w1Rooming": {
                  center: { x: 820, y: 450 },
                  reveal: { x: 820, y: 450 },
                  chain: [],
                  offsets: {},
                },
              },
              scrollers: {},
            },
          ],
        },
      });
      return;
    }
    const response = await page.request.get(
      url.replace("/core-10day/", "/run1-P3/"),
    );
    let body = (await response.text()).replaceAll("run1-P3", "core-10day");
    if (url.endsWith("/trajectories/index.json")) {
      const index = trajectoryIndexSchema.parse(JSON.parse(body));
      const first = index.tasks[0];
      if (first) first.metrics.mouseTravelPx = 100;
      body = JSON.stringify(index);
    }
    await route.fulfill({ response, body });
  });
  await page.goto("/dashboard?run=core-10day&view=Trajectories");
  const view = page.getByRole("region", { name: "All task trajectories" });
  const frame = page.frameLocator('iframe[title="Recorded EHR"]');
  await expect(
    frame.getByRole("banner", { name: "Patient banner" }),
  ).toBeVisible();
  await view.getByLabel("Playback speed").selectOption("4");
  await view.getByRole("button", { name: "Step", exact: true }).click();
  await expect(view.locator(".trajectory-counters")).toContainText(
    "100 px mouse travel",
  );
  await expect(frame.locator("html")).toHaveAttribute("data-replay-count", "1");
  await view.getByRole("button", { name: "Step", exact: true }).click();
  // A missing screen measurement must remain unavailable, never become zero.
  await expect(view.locator(".trajectory-counters")).toContainText(
    "mouse travel —",
  );
  await expect(frame.locator("html")).toHaveAttribute("data-replay-count", "2");
});
