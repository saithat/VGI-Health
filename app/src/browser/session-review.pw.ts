import { test, expect } from "@playwright/test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { sessionSchema } from "./session-schema";
async function fakeRecordedSession() {
  const { stdout } = await promisify(execFile)(process.execPath, [
    "--import",
    fileURLToPath(
      new URL(
        "../../../agent/node_modules/tsx/dist/loader.mjs",
        import.meta.url,
      ),
    ),
    fileURLToPath(
      new URL("../../../agent/test/session-fixture.ts", import.meta.url),
    ),
    "--emit-session",
  ]);
  return sessionSchema.parse(JSON.parse(stdout));
}

test("recorded simulator session compares own cases at 1440×900", async ({
  page,
}) => {
  const session = await fakeRecordedSession();
  await page.route(
    (url) => url.pathname === "/runs/sessions/simulated-weekly-demo.json",
    (route) => route.fulfill({ json: session }),
  );
  await page.goto("/browse?session=/runs/sessions/simulated-weekly-demo.json");
  await expect(
    page.getByRole("heading", { name: "Tailoring session", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/FAKE backend — certifies nothing/),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Keep current layout" }),
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(4);
  const first = page.getByRole("article").first();
  const slider = first.getByRole("slider");
  await expect(slider).toBeEnabled();
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveValue("1");
  const picker = page.getByRole("combobox");
  await picker.selectOption(session.schedules[0]?.tasks[1]?.id ?? "");
  await expect(slider).toHaveValue("0");
  await page.getByText("What changed", { exact: false }).first().click();
  await expect(page.getByText(/→/).first()).toBeVisible();
  await expect(page.locator(".session-layout")).toHaveCount(4);
  const cards = await page.getByRole("article").evaluateAll((nodes) =>
    nodes.map((n) => {
      const b = n.getBoundingClientRect();
      return { left: b.left, right: b.right };
    }),
  );
  expect(cards.every((b) => b.left >= 0 && b.right <= 1440)).toBe(true);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(1440);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `${process.env.TMPDIR}/sessions-review-1440x900.png`,
  });
});

test("bad and missing records show an explicit error", async ({ page }) => {
  await page.goto("/browse?session=https://example.com/remote.json");
  await expect(page.getByRole("alert")).toContainText(
    "Invalid session artifact path",
  );
  await page.goto("/browse?session=/runs/../runs/sessions/forbidden.json");
  await expect(page.getByRole("alert")).toContainText("Invalid session artifact path");
  await page.route(
    (url) => url.pathname === "/runs/sessions/missing.json",
    (route) => route.fulfill({ status: 404, body: "missing" }),
  );
  await page.goto("/browse?session=/runs/sessions/missing.json");
  await expect(page.getByRole("alert")).toContainText("Cannot load");
});

test("bounded evidence shows expert costs and retains signed relearning", async ({ page }) => {
  const session = await fakeRecordedSession();
  const option = session.options[0];
  if (!option) throw new Error("Missing option");
  option.evidence.relearning = {
    estimatedMinutes: 0,
    model: "bounded-matched-relearning-v1",
    simulatorOnly: true,
    bounded: {
      model: "bounded-matched-relearning-v1",
      assumption: "Matched train workloads and independent practice reference",
      k: 2, warmBlocks: 3,
      before: { seconds: 150, actions: 20 }, after: { seconds: 120, actions: 18 },
      expertBefore: { seconds: 90, actions: 15 }, expertAfter: { seconds: 80, actions: 14 },
      beforeExcess: { seconds: 50, actions: 3 }, afterExcess: { seconds: 20, actions: 1 },
      incremental: { seconds: -30, actions: -2 },
    },
  };
  await page.route(
    (url) => url.pathname === "/runs/cadence-example/runs/sessions/bounded-example.json",
    (route) => route.fulfill({ json: session }),
  );
  await page.goto("/browse?session=/runs/cadence-example/runs/sessions/bounded-example.json");
  await expect(page.getByText(/expert floor 90.0→80.0s/)).toBeVisible();
  await expect(page.getByText(/signed relearning -30.0s \/ -2 actions/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
