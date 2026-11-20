import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { completeKeycloakLogin } from "../live-backend";

test.skip(
  !process.env.VGI_START_TEST_URL,
  "Requires the isolated one-command app",
);

async function screenshot(page: Page, name: string) {
  const dir = process.env.VGI_START_SCREENSHOTS;
  if (dir) {
    await mkdir(dir, { recursive: true });
    await page.screenshot({ path: join(dir, name), animations: "disabled" });
  }
}

test("start page opens a chart after real Keycloak sign-in", async ({
  page,
}) => {
  test.setTimeout(90_000);
  test.skip(
    process.env.VGI_START_TEST_MODE !== "live",
    "Requires the isolated live stack",
  );
  await page.goto("/");
  await expect(page.getByText("EHR running", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Dashboard", exact: true }),
  ).toHaveAttribute("href", /run=/);
  await screenshot(page, "start.png");
  await page.getByRole("link", { name: "P1 Primary care" }).click();
  await expect(page).toHaveURL(/\/lean\.html\?persona=P1/);
  await page.getByRole("button", { name: "Sign in as P1" }).click();
  await completeKeycloakLogin(page, "P1");
  const root = page.locator("#root");
  await expect(root).toHaveAttribute("data-accepted", "true", {
    timeout: 30_000,
  });
  await page
    .getByRole("button", { name: "Open chart", exact: true })
    .first()
    .press("Enter");
  await expect(root).toHaveAttribute("data-screen", "chartSummary");
  await expect(page.locator("#status")).not.toContainText(
    /Error:|rejected|differs/i,
  );
});

test("launches a one-day replay recording and stops a second job", async ({
  page,
}) => {
  test.skip(
    process.env.VGI_START_TEST_MODE !== "live",
    "Requires the isolated recording launcher",
  );
  await page.goto("/#record");
  const launch = page.getByRole("button", { name: "Start recording" });
  const stop = page.getByRole("button", { name: "Stop recording" });
  const status = page.locator("#recording-status");
  await expect(launch).toBeEnabled();
  await screenshot(page, "record.png");
  await page.getByLabel("Run ID").fill("onecmd-record-" + Date.now());
  await page.getByLabel("Days", { exact: true }).fill("1");
  await page.getByLabel("Backend").selectOption("replay");
  await page.getByLabel("Replay source").selectOption("core-10day");
  await page
    .locator('select[name="world"]')
    .selectOption(process.env.VGI_START_TEST_WORLD ?? "2");
  for (const id of ["P2", "P3", "P4", "P5"])
    await page.getByLabel(id, { exact: true }).uncheck();
  await launch.click();
  await expect(status).toContainText("Running");
  await expect(page.getByLabel("Recording log")).toBeVisible({
    timeout: 30_000,
  });
  await expect(status).toContainText(/Completed · 1\/1 days/, {
    timeout: 540_000,
  });
  await expect(
    page.getByRole("link", { name: "Open recording" }),
  ).toBeVisible();
  await page.getByLabel("Run ID").fill("onecmd-stop-" + Date.now());
  await launch.click();
  await expect(stop).toBeEnabled();
  await stop.click();
  await expect(status).toContainText("Stopped", { timeout: 15_000 });
  await expect(launch).toBeEnabled();
});

test("offline start page keeps the dashboard and recorded task replays available", async ({
  page,
}) => {
  test.skip(
    process.env.VGI_START_TEST_MODE !== "offline",
    "Requires Docker to be unavailable to the isolated command",
  );
  await page.goto("/");
  await expect(
    page.getByText("Docker unavailable", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Start Docker and ensure your account can access it/),
  ).toBeVisible();
  await expect(page.locator("[data-live]").first()).not.toHaveAttribute(
    "href",
    /lean\.html/,
  );
  await page
    .getByLabel("Recording", { exact: true })
    .selectOption("core-10day");
  await page.getByLabel("Persona", { exact: true }).selectOption("P3");
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Evolution", exact: true }),
  ).toBeVisible();
  await page.goto("/");
  await page.getByRole("link", { name: "Replay tasks" }).click();
  await expect(
    page.getByRole("button", { name: "Trajectories", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("button", { name: "Play", exact: true }).first(),
  ).toBeVisible({ timeout: 30_000 });
  await page.goto("/");
  await page.locator("#view-day").selectOption("1");
  await page.locator("#view-version").selectOption("0");
  await page.getByRole("link", { name: "Compare trajectories" }).click();
  await expect(
    page.getByRole("button", { name: "Compare", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page).toHaveURL(/day=1.*revision=0|revision=0.*day=1/);
});
