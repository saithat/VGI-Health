import { expectRecordedWorkspace } from "./recorded-frame";
import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  trajectoryIndexSchema,
  trajectorySchema,
} from "../src/dashboard/trajectories-data";
const base = "/dashboard?view=compare&run=core-10day&persona=P3&workflow=W4";
async function counts(file: string) {
  const task = trajectorySchema.parse(
    JSON.parse(
      await readFile(
        new URL(`../../runs/core-10day/trajectories/${file}`, import.meta.url),
        "utf8",
      ),
    ),
  );
  const ops = task.trace.flatMap((event) => event.ops);
  return {
    events: task.trace.length,
    clicks: ops.filter((op) => op === "click").length,
    scrolls: ops.filter((op) => op === "scroll").length,
    keys: ops.filter((op) => op === "key").length,
    screens: new Set(task.trace.map((event) => event.screen)).size,
  };
}
test("compare defaults to a saved same-task control and synchronizes fixed frames", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base);
  const view = page.getByRole("region", {
    name: "Compare trajectories",
    exact: true,
  });
  // The cold preview loads the run and index before it can resolve the pair.
  await expect(view.getByLabel("Left trajectory")).toHaveValue(
    "d07-P3-W4-001:baseline",
    { timeout: 15000 },
  );
  await expect(view.getByLabel("Right trajectory")).toHaveValue(
    "d07-P3-W4-001",
  );
  await expect(view.getByTestId("comparison-context")).toContainText(
    "Same scheduled task",
  );
  const left = page.frameLocator('iframe[title="Left EHR"]'),
    right = page.frameLocator('iframe[title="Right EHR"]');
  await expectRecordedWorkspace(left);
  await expectRecordedWorkspace(right);
  const frames = page.locator(".comparison-player iframe");
  const size = () =>
    frames.evaluateAll((elements) =>
      elements.map((el) => ({
        width: el.clientWidth,
        height: el.clientHeight,
        viewport:
          el instanceof HTMLIFrameElement
            ? [el.contentWindow?.innerWidth, el.contentWindow?.innerHeight]
            : [],
      })),
    );
  const initial = await size();
  expect(initial).toEqual([
    { width: 1440, height: 900, viewport: [1440, 900] },
    { width: 1440, height: 900, viewport: [1440, 900] },
  ]);
  const [a, b] = await Promise.all([
    counts("tasks/d07-P3-W4-001.baseline.json"),
    counts("tasks/d07-P3-W4-001.json"),
  ]);
  for (const metric of ["clicks", "scrolls", "keys", "screens"] as const) {
    const l = a?.[metric] ?? 0,
      r = b?.[metric] ?? 0;
    const card = view.locator(`[data-metric="${metric}"]`);
    await expect(card).toHaveAttribute("data-left", String(l));
    await expect(card).toHaveAttribute("data-right", String(r));
    await expect(card).toHaveAttribute("data-delta", String(r - l));
    await expect(card).toContainText(`${l} → ${r}`);
  }
  await expect(view.locator('[data-metric="scrollPx"]')).toHaveAttribute(
    "data-delta",
    "unavailable",
  );
  await view.getByLabel("Compare playback speed").selectOption("4");
  for (let count = 1; count <= 10; count++) {
    await view.getByRole("button", { name: "Step", exact: true }).click();
    await expect(left.locator("html")).toHaveAttribute(
      "data-replay-count",
      String(count),
    );
    await expect(right.locator("html")).toHaveAttribute(
      "data-replay-count",
      String(count),
    );
    await expect(view.getByLabel("Compare replay position")).toHaveText(
      `L ${count}/${a.events} · R ${count}/${b.events}`,
    );
    if (count === 2) {
      await expect(left.getByRole("banner", { name: "Patient banner" })).toBeVisible();
      await expect(right.getByRole("banner", { name: "Patient banner" })).toBeVisible();
    }
  }
  expect(await size()).toEqual(initial);
  const boxes = await frames.all(),
    l = await boxes[0]?.boundingBox(),
    r = await boxes[1]?.boundingBox();
  if (info.project.name === "desktop") expect(l?.y).toBe(r?.y);
  else expect(r?.y).toBeGreaterThan((l?.y ?? 0) + (l?.height ?? 0));
  const jump = view
    .getByRole("region", { name: "Changes between revisions" })
    .getByRole("button", { name: /^Jump.*(?:L[1-9]\d*|R[1-9]\d*)/ })
    .first();
  await expect(jump).toBeVisible();
  const moment = /L(\d+) \/ R(\d+)/.exec(await jump.innerText());
  await jump.click();
  await expect(left.locator("html")).toHaveAttribute(
    "data-replay-count",
    moment?.[1] ?? "0",
  );
  await expect(right.locator("html")).toHaveAttribute(
    "data-replay-count",
    moment?.[2] ?? "0",
  );
  await view.getByRole("button", { name: "Reset", exact: true }).click();
  await view.getByRole("button", { name: "Play", exact: true }).click();
  await expect(view.getByLabel("Compare replay position")).not.toHaveText(
    `L 0/${a.events} · R 0/${b.events}`,
  );
  await view.getByRole("button", { name: "Pause", exact: true }).click();
  await view.getByLabel("Left day", { exact: true }).selectOption("4");
  await expect(view.getByLabel("Left trajectory")).toHaveValue(
    "d04-P3-W4-001:baseline",
  );
  await expect(view.getByLabel("Right trajectory")).toHaveValue(
    "d04-P3-W4-001",
  );
  expect(errors).toEqual([]);
});
test("compare bookmarks cross-day selections and holds the shorter replay", async ({
  page,
}, info) => {
  await page.goto(`${base}&left=d01-P3-W4-001&right=d10-P3-W4-001`);
  const view = page.getByRole("region", {
    name: "Compare trajectories",
    exact: true,
  });
  await expect(view.getByLabel("Comparison type")).toHaveValue("cross-day");
  await expect(view.getByLabel("Left trajectory")).toHaveValue("d01-P3-W4-001");
  await expect(view.getByLabel("Right trajectory")).toHaveValue(
    "d10-P3-W4-001",
  );
  const left = page.frameLocator('iframe[title="Left EHR"]'),
    right = page.frameLocator('iframe[title="Right EHR"]');
  await expectRecordedWorkspace(left);
  await expectRecordedWorkspace(right);
  await view.getByLabel("Compare replay step").fill("32");
  await expect(view.getByLabel("Compare replay position")).toHaveText(
    "L 32/33 · R 21/21",
  );
  await view.getByRole("button", { name: "Step", exact: true }).click();
  await expect(left.locator("html")).toHaveAttribute("data-replay-count", "33");
  await expect(right.locator("html")).toHaveAttribute(
    "data-replay-count",
    "21",
  );
  await expect(
    view.getByRole("button", { name: "Step", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(view.getByLabel("Left trajectory")).toHaveValue("d01-P3-W4-001");
  await expect(view.getByLabel("Right trajectory")).toHaveValue(
    "d10-P3-W4-001",
  );
  await expectRecordedWorkspace(left);
  await view.getByLabel("Compare replay step").fill("12");
  await expect(left.locator("html")).toHaveAttribute("data-replay-count", "12");
  await expect(right.locator("html")).toHaveAttribute(
    "data-replay-count",
    "12",
  );
  if (info.project.name === "desktop") {
    await page.setViewportSize({ width: 1600, height: 1100 });
    await expect(
      view
        .getByRole("region", { name: "Changes between revisions" })
        .getByRole("button", { name: /^Jump/ })
        .first(),
    ).toBeVisible();
    await view.screenshot({ path: "shots/final/compare.png" });
  }
  await view.getByLabel("Right day", { exact: true }).selectOption("7");
  await expect(view.getByLabel("Right trajectory")).toHaveValue(
    "d07-P3-W4-001",
  );
  await view.getByLabel("Left day", { exact: true }).selectOption("4");
  await expect(view.getByLabel("Left trajectory")).toHaveValue("d04-P3-W4-001");
  await view.getByLabel("Right revision", { exact: true }).selectOption("0");
  await expect(view.locator(".comparison-side-label").last()).toContainText(
    "Baseline control",
  );
  await expect(right.locator("html")).toHaveAttribute("data-replay-count", "0");
  await expect(page.getByRole("alert")).toHaveCount(0);
});
test("Evolution, Trajectories and timeline link to compare", async ({
  page,
}) => {
  await page.goto("/dashboard?run=core-10day&persona=P3&view=Evolution");
  await page
    .getByRole("link", {
      name: "Compare recorded trajectories across revisions",
    })
    .click();
  await expect(
    page.getByRole("region", { name: "Compare trajectories", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Single trajectory" }).click();
  await page.getByRole("link", { name: "Compare two trajectories" }).click();
  await expect(
    page.getByRole("region", { name: "Compare trajectories", exact: true }),
  ).toBeVisible();
  await page.goto("/browse?run=core-10day");
  const link = page.getByRole("link", {
    name: "Compare with baseline",
    exact: false,
  });
  await expect(link).toBeVisible();
  await link.click();
  await expect(
    page.getByRole("region", { name: "Compare trajectories", exact: true }),
  ).toBeVisible();
});

test("a partial index without saved controls falls back to a cross-day pair", async ({
  page,
}) => {
  await page.route("**/runs/core-10day/trajectories/index.json", async (route) => {
    const index = trajectoryIndexSchema.parse(
      JSON.parse(
        await readFile(
          new URL(
            "../../runs/core-10day/trajectories/index.json",
            import.meta.url,
          ),
          "utf8",
        ),
      ),
    );
    for (const task of index.tasks) delete task.baseline;
    // A partial run has only its first few days indexed so far.
    index.tasks = index.tasks.filter((task) => task.day <= 4);
    await route.fulfill({ json: index });
  });
  await page.goto(`${base}&comparison=paired&version=4`);
  const view = page.getByRole("region", {
    name: "Compare trajectories",
    exact: true,
  });
  await expect(view.getByLabel("Comparison type")).toHaveValue("cross-day");
  await expect(view.getByLabel("Left day", { exact: true })).toHaveValue("1");
  await expect(view.getByLabel("Right day", { exact: true })).toHaveValue("4");
  await expectRecordedWorkspace(page.frameLocator('iframe[title="Left EHR"]'));
  await expectRecordedWorkspace(page.frameLocator('iframe[title="Right EHR"]'));
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
