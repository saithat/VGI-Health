import { test, expect, type Page } from "@playwright/test";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
// Explicit live suite: no mocked Keycloak, Postgres, Lean or HTTP responses.
test.skip(
  process.env.MAR_E2E !== "1",
  "Set MAR_E2E=1 with Keycloak, Postgres and COMMIT_FIXTURE.",
);
let service: ChildProcess | undefined;
let directory: string;
let password: string;

test.beforeAll(async () => {
  if (process.env.MAR_E2E !== "1") return;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for the real MAR e2e");
  const env = await readFile(resolve("../.env"), "utf8");
  const secret = env.match(/^KEYCLOAK_PERSONA_PASSWORD=(.+)$/m)?.[1];
  if (!secret) throw new Error("Run node infra/keycloak/setup.mjs first");
  password = secret;
  directory = await mkdtemp(join(tmpdir(), "mar-e2e-"));
  execFileSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "../services/commit/test/mar-dev.ts",
      directory,
    ],
    { env: process.env },
  );
  service = spawn(
    process.execPath,
    [
      "--experimental-strip-types",
      "../services/commit/test/mar-e2e-host.ts",
      directory,
    ],
    {
      env: { ...process.env, EHR_BIN: resolve("../lean/.lake/build/bin/ehr") },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const child = service;
  await new Promise<void>((done, reject) => {
    const timer = setTimeout(
      () => reject(new Error("MAR service startup timed out")),
      20_000,
    );
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`MAR service exited (${code})`));
    });
    child.stderr?.on("data", (data) => process.stderr.write(data));
    child.stdout?.on("data", (data) => {
      if (String(data).includes("MAR_E2E_READY")) {
        clearTimeout(timer);
        done();
      }
    });
  });
});
test.afterAll(async () => {
  if (service) {
    const exited = once(service, "exit");
    service.kill("SIGTERM");
    await exited;
  }
  if (directory) await rm(directory, { recursive: true, force: true });
});
const component = (page: Page, id: string) =>
  page.locator(`[data-comp-id="${id}"][data-event]`);
async function action(page: Page, id: string) {
  const done = page.waitForResponse(
    (res) =>
      res.url().includes("/commit/sessions/") &&
      res.request().method() === "POST",
  );
  await component(page, id).click();
  await done;
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
}
async function enter(page: Page, id: string, value: string) {
  const done = page.waitForResponse(
    (res) =>
      res.url().includes("/commit/sessions/") &&
      res.request().method() === "POST",
  );
  await component(page, id).fill(value);
  await done;
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
}
async function login(page: Page, username: string) {
  await page.goto("/?workflow=mar");
  await page.getByRole("button", { name: "Sign in with Keycloak" }).click();
  await expect(page).toHaveURL(/localhost:18180/);
  await page.getByLabel("Username or email").fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Scheduled doses" }),
  ).toBeVisible();
}

test("Keycloak login → MAR → administer → second nurse receives the persisted dose and a refreshed chart", async ({
  browser,
  baseURL,
  viewport,
}) => {
  test.setTimeout(90_000);
  if (!baseURL) throw new Error("Playwright baseURL missing");
  const c1 = await browser.newContext({ baseURL, viewport });
  const c2 = await browser.newContext({ baseURL, viewport });
  const first = await c1.newPage();
  const second = await c2.newPage();
  const errors: string[] = [];
  for (const page of [first, second]) {
    expect(page.viewportSize()).toEqual(viewport);
    page.on("pageerror", (error) => errors.push(error.message));
    // Clinical sessions must never publish raw FHIR transactions.
    await page.route("**/fhir/R4**", (route) => {
      errors.push("Browser called an external FHIR writer");
      return route.abort();
    });
  }
  try {
    await login(first, "p3");
    await login(second, "rn2");
    for (const page of [first, second]) {
      await page.getByRole("button", { name: "Open MAR", exact: true }).click();
      await action(page, "home.work.w4Worklist");
      await action(page, "w4Worklist.review.allergyList");
      await action(page, "w4Worklist.toMar");
    }
    await action(first, "w4Mar.openDue");
    await enter(first, "w4Admin.wristbandScan", "mar-patient");
    await enter(first, "w4Admin.medScan", "amoxicillin");
    await enter(first, "w4Admin.adminStatus", "given");
    await enter(first, "w4Admin.adminReason", "scheduled");
    const saved = first.waitForResponse((res) =>
      res.url().endsWith("/commit/commands"),
    );
    await component(first, "w4Admin.commit.administerMed").click();
    expect((await (await saved).json()).version).toBe(2);
    await expect(
      first.getByText("Administration saved. MAR refreshed."),
    ).toBeVisible();
    await expect(second.getByTestId("mar-history")).toContainText("Given");
    await expect(second.getByRole("status")).toContainText(
      "MAR updated by another nurse",
    );
    // Stale evidence was discarded; a fresh review starts from home.
    await expect(component(second, "home.work.w4Worklist")).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await c1.close();
    await c2.close();
  }
});
