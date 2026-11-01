import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

async function checkLayout(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const tiny = await page
    .locator(".dashboard")
    .evaluate((el) =>
      [
        ...el.querySelectorAll(
          "button, select, p, h1, h2, h3, h4, th, td, span",
        ),
      ]
        .filter(
          (e) =>
            e.getClientRects().length &&
            Number.parseFloat(getComputedStyle(e).fontSize) < 12,
        )
        .map((e) => e.textContent),
    );
  expect(tiny).toEqual([]);
}
test("real P3: four areas, version drawer, exact version EHR pair, and counterexample", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/dashboard");
  await expect(page.getByLabel("Recorded run")).toHaveValue("run1-P3");
  await expect(
    page.getByRole("heading", { name: "Evolution", exact: true }),
  ).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Dashboard areas" });
  await expect(nav.getByRole("button")).toHaveCount(4);
  await expect(
    page
      .getByRole("group", { name: "Persona", exact: true })
      .getByRole("button", { name: "P1", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "P3", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("region", { name: "Version history" }),
  ).toContainText("v7 · Night 8");
  await checkLayout(page);
  if (testInfo.project.name === "desktop") {
    await mkdir("shots", { recursive: true });
    await page.screenshot({
      path: "shots/dashboard-evolution.png",
      fullPage: true,
    });
  }

  const version = page.getByRole("button", { name: /^v3 · Night 4/ });
  await expect(version).toHaveAccessibleName(/vs previous:.*vs baseline:/);
  await version.click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toContainText("01 · Evidence");
  await expect(drawer).toContainText("02 · Hypothesis");
  await expect(drawer).toContainText("03 · Candidates");
  await expect(drawer).toContainText("04 · Choice");
  await expect(drawer.getByRole("table")).toHaveCount(1);
  await drawer
    .getByRole("button", { name: "Before / after on screen", exact: true })
    .click();
  const pair = page.getByRole("dialog", {
    name: "Before / after on screen",
    exact: true,
  });
  await expect(
    pair.getByRole("heading", { name: "Before · v2", exact: true }),
  ).toBeVisible();
  await expect(
    pair.getByRole("heading", { name: "After · v3", exact: true }),
  ).toBeVisible();
  await expect(pair.locator(".ehr-shell")).toHaveCount(2);
  if (testInfo.project.name === "desktop")
    await page.screenshot({ path: "shots/dashboard-before-after.png" });
  await pair
    .getByRole("button", { name: "Next task event", exact: true })
    .click();
  await expect(pair.getByText(/^Event 1 \/ /)).toBeVisible();
  await expect(pair.getByRole("alert")).toHaveCount(0);
  await pair.getByRole("button", { name: "Close EHR replay" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(version).toBeFocused();

  await page
    .getByRole("button", { name: /Rejected · Night 2.*humanOnlyKept/ })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Replay counterexample", exact: true })
    .first()
    .click();
  const replay = page.getByRole("dialog", {
    name: "Replay counterexample",
    exact: true,
  });
  await expect(replay.locator(".ehr-shell")).toHaveCount(1);
  await replay.getByRole("button", { name: "Next event", exact: true }).click();
  await expect(replay.getByText(/^State 1 of /)).toBeVisible();
  await expect(replay.getByRole("alert")).toHaveCount(0);
  await replay.getByRole("button", { name: "Close EHR replay" }).click();
  await page.keyboard.press("Escape");

  await nav.getByRole("button", { name: "Releases", exact: true }).click();
  await expect(page.getByRole("table")).toHaveCount(1);
  await expect(page.getByRole("row")).toHaveCount(11);
  await expect(page.getByRole("table")).toContainText("Old UI: fail");
  await checkLayout(page);
  if (testInfo.project.name === "desktop")
    await page.screenshot({
      path: "shots/dashboard-releases.png",
      fullPage: true,
    });
  await page
    .getByRole("button", { name: "Inspect P3 v2 migration", exact: true })
    .click();
  const migration = page.getByRole("dialog", {
    name: "Before / after on screen",
    exact: true,
  });
  await expect(
    migration.getByRole("heading", { name: "Before · v4", exact: true }),
  ).toBeVisible();
  await expect(
    migration.getByRole("heading", { name: "After · v5", exact: true }),
  ).toBeVisible();
  await expect(migration.locator(".ehr-shell")).toHaveCount(2);
  await expect(migration.getByRole("alert")).toHaveCount(0);
  await migration.getByRole("button", { name: "Close EHR replay" }).click();
  await page.keyboard.press("Escape");

  await nav
    .getByRole("button", { name: "Try to break it", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Show recorded verdict", exact: true })
    .click();
  await expect(page.locator(".failure-message")).toContainText("noFalseAlarms");
  await checkLayout(page);
  if (testInfo.project.name === "desktop")
    await page.screenshot({
      path: "shots/dashboard-break.png",
      fullPage: true,
    });
  await page
    .getByRole("button", { name: "Replay counterexample", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog", { name: "Replay counterexample", exact: true })
      .locator(".ehr-shell"),
  ).toHaveCount(1);
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("mock is explicitly selected and visibly labeled", async ({ page }) => {
  await page.goto("/dashboard?run=mock");
  await expect(
    page.getByText(/MOCK RUN · Authored example data/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "P1", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "P1", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "P1", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("navigation", { name: "Dashboard areas" })
    .getByRole("button", { name: "Try to break it", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Show recorded verdict", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Replay counterexample", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog", { name: "Replay counterexample", exact: true })
      .locator(".ehr-shell"),
  ).toHaveCount(1);
  await expect(page.getByRole("alert")).toHaveCount(0);
});
