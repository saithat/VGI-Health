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
test("real P3: five areas, version drawer, exact version EHR pair, and counterexample", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/dashboard?run=core-10day&persona=P3");
  await expect(page.getByLabel("Recorded run")).toHaveValue("core-10day");
  await expect(
    page
      .getByRole("navigation", { name: "Dashboard areas" })
      .getByRole("button", { name: "Evolution", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("heading", { name: /^Inpatient RN/ }),
  ).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Dashboard areas" });
  await expect(nav.getByRole("button")).toHaveCount(5);
  await expect(
    page
      .getByRole("group", { name: "Persona", exact: true })
      .getByRole("button", { name: "P1", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "P3", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("region", { name: "Version history" }),
  ).toContainText("rev 4 · Night 9");
  await checkLayout(page);
  if (testInfo.project.name === "desktop") {
    await mkdir("shots", { recursive: true });
    await page.screenshot({
      path: "shots/dashboard-evolution.png",
      fullPage: true,
    });
  }

  const version = page.getByRole("button", { name: /^rev 4 · Night 9/ });
  await expect(version).toHaveAccessibleName(/Effect:.*clicks.*Status:/);
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
    pair.getByRole("heading", { name: "Before · rev 3", exact: true }),
  ).toBeVisible();
  await expect(
    pair.getByRole("heading", { name: "After · rev 4", exact: true }),
  ).toBeVisible();
  await expect(pair.locator(".clinical-shell")).toHaveCount(2);
  if (testInfo.project.name === "desktop")
    await page.screenshot({ path: "shots/dashboard-before-after.png" });
  await pair
    .getByRole("button", { name: "Next task event", exact: true })
    .click();
  await pair
    .getByRole("button", { name: "Next task event", exact: true })
    .click();
  await expect(pair.getByText(/^Event 2 \/ /)).toBeVisible();
  // Both replays retain their active high-alert condition in the pinned strip.
  // The exact set also rejects unexpected runtime-error alerts.
  const alerts = pair.getByRole("alert");
  await expect(alerts).toHaveCount(2);
  for (const alert of await alerts.all()) {
    await expect(alert).toHaveAttribute("data-alert-id", "highAlertAdmin");
    await expect(alert).toHaveAccessibleName("High-alert medication: double check required");
    await expect(alert).toBeVisible();
  }
  await pair.getByRole("button", { name: "Close EHR replay" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(version).toBeFocused();

  // This retained run's checker counterexample belongs to P2, night 8.
  await page.getByRole('button', {name:'P2', exact:true}).click();
  await page.getByRole('button', {name:/Rejected · Night 8.*reviewsBeforeCommit/}).click();
  await page.getByRole('dialog').getByRole('button', {name:'Replay counterexample', exact:true}).first().click();
  const counterexample = page.getByRole('dialog', {name:'Replay counterexample', exact:true});
  await expect(counterexample.locator('.clinical-shell')).toHaveCount(1);
  await counterexample.getByRole('button', {name:'Next event', exact:true}).click();
  await expect(counterexample.getByText(/^State 1 of /)).toBeVisible();
  await counterexample.getByRole('button', {name:'Close EHR replay'}).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name:'P3', exact:true}).click();

  await nav.getByRole("button", { name: "Releases", exact: true }).click();
  await expect(page.getByRole("table")).toHaveCount(1);
  await expect(page.getByRole("row")).toHaveCount(6);
  await expect(page.getByRole("rowheader")).toHaveCount(5);
  await expect(page.getByRole("table")).toContainText("Old UI failed");
  await checkLayout(page);
  if (testInfo.project.name === "desktop")
    await page.screenshot({
      path: "shots/dashboard-releases.png",
      fullPage: true,
    });
  await page
    .getByRole("button", { name: "Inspect P3 v3 migration", exact: true })
    .click();
  const migration = page.getByRole("dialog", {
    name: "Before / after on screen",
    exact: true,
  });
  await expect(
    migration.getByRole("heading", { name: "Before · rev 2", exact: true }),
  ).toBeVisible();
  await expect(
    migration.getByRole("heading", { name: "After · rev 3", exact: true }),
  ).toBeVisible();
  await expect(migration.locator(".clinical-shell")).toHaveCount(2);
  // Select and hydrate the exported patient, then reach medication administration.
  // Checker prefixes alone do not select a patient in the clinical workspace.
  for (let event = 0; event < 6; event++)
    await migration.getByRole("button", { name: "Next task event", exact: true }).click();
  await expect(migration.getByText(/^Event 6 \/ /)).toBeVisible();
  await expect(
    migration.getByRole("alert", {
      name: "High-alert medication: double check required",
      exact: true,
    }),
  ).toHaveCount(4);
  await expect(migration.locator(".urgent-alert-strip [data-alert-id='highAlertAdmin']")).toHaveCount(2);
  await expect(migration.getByRole("alert")).toHaveCount(4);
  await expect(migration.getByRole("alertdialog")).toHaveCount(0);
  await migration.getByRole("button", { name: "Close EHR replay" }).click();
  await page.keyboard.press("Escape");

  await nav
    .getByRole("button", { name: "Try to break it", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Show recorded verdict", exact: true })
    .click();
  // Try to break it lists the run's actual rejected proposals across personas.
  await expect(page.locator(".failure-message")).toContainText("reviewsBeforeCommit");
  await expect(page.locator(".failure-message")).toContainText("anticoagulantList");
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
      .locator(".clinical-shell"),
  ).toHaveCount(1);
  const recordedFailure = page.getByRole("dialog", { name: "Replay counterexample", exact: true });
  await recordedFailure.getByRole("button", { name: "Next event", exact: true }).click();
  await expect(recordedFailure.getByText(/^State 1 of /)).toBeVisible();
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
