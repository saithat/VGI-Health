import { test, expect, type Page } from "@playwright/test";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";

test.skip(
  process.env.ADT_E2E !== "1",
  "Set ADT_E2E=1 with existing Keycloak/Postgres, COMMIT_FIXTURE and provisioned 4 West accounts (service README).",
);
let service: ChildProcess | undefined;
let directory: string;
let password: string;
test.beforeAll(async () => {
  if (process.env.ADT_E2E !== "1") return;
  const env = await readFile(resolve("../.env"), "utf8");
  const secret = env.match(/^KEYCLOAK_4WEST_PASSWORD=(.+)$/m)?.[1];
  if (!secret) throw new Error("Run infra/keycloak/provision-adt.mjs first");
  password = secret;
  directory = await mkdtemp(join(tmpdir(), "adt-e2e-"));
  execFileSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "../services/commit/test/adt-dev.ts",
      directory,
    ],
    { env: process.env },
  );
  service = spawn(
    process.execPath,
    [
      "--experimental-strip-types",
      "../services/commit/test/adt-e2e-host.ts",
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
      () => reject(new Error("ADT service startup timed out")),
      20_000,
    );
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`ADT service exited (${code})`));
    });
    child.stderr?.on("data", (data) => process.stderr.write(data));
    child.stdout?.on("data", (data) => {
      if (String(data).includes("ADT_E2E_READY")) {
        clearTimeout(timer);
        done();
      }
    });
  });
});
test.afterAll(async () => {
  if (service && service.exitCode === null) {
    const exited = once(service, "exit");
    service.kill("SIGTERM");
    await exited;
  }
  if (directory) await rm(directory, { recursive: true, force: true });
});
async function login(page: Page, username: string, workflow = "adt") {
  await page.goto(`/?workflow=${workflow}`);
  await page.getByRole("button", { name: "Sign in with Keycloak" }).click();
  await expect(page).toHaveURL(/localhost:18180/);
  await page.getByLabel("Username or email").fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
}
async function command(
  page: Page,
  action: string,
  label: string,
  bed?: string,
) {
  await page.getByLabel("Action", { exact: true }).selectOption(action);
  if (bed) await page.getByLabel("Bed", { exact: true }).selectOption(bed);
  const saved = page.waitForResponse((r) =>
    r.url().endsWith("/commit/adt/commands"),
  );
  await page.getByRole("button", { name: label, exact: true }).click();
  expect((await saved).status()).toBe(201);
}

test("bed manager admits, transfers, releases/reassigns, discharges and cleans; a second charge nurse sees atomic board updates; 4 West RN opens service MAR", async ({
  browser,
  baseURL,
}, testInfo) => {
  test.setTimeout(90_000);
  if (!baseURL) throw new Error("Playwright baseURL missing");
  const c1 = await browser.newContext({ baseURL });
  const c2 = await browser.newContext({ baseURL });
  const c3 = await browser.newContext({ baseURL });
  const first = await c1.newPage();
  const second = await c2.newPage();
  const rn = await c3.newPage();
  const errors: string[] = [];
  for (const page of [first, second, rn]) {
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/fhir/R4**", (route) => {
      errors.push("Browser called an external FHIR writer");
      return route.abort();
    });
  }
  try {
    await login(first, "bed-manager");
    await login(second, "charge-4west");
    await expect(
      first.getByRole("heading", { name: "Bed board", exact: true }),
    ).toBeVisible();
    await expect(
      second.getByRole("heading", { name: "Bed board", exact: true }),
    ).toBeVisible();
    await first
      .getByLabel("Patient", { exact: true })
      .selectOption("mar-patient");
    // The immutable inpatient baseline is already admitted, without a bed.
    await expect(second.getByTestId("patient-mar-patient")).toContainText(
      "Admitted · No bed",
    );
    await command(first, "assign", "Assign bed", "401");
    await expect(second.getByTestId("bed-401")).toContainText("mar-patient");
    await command(first, "transfer", "Transfer", "402");
    await expect(second.getByTestId("bed-401")).toContainText("dirty");
    await expect(second.getByTestId("bed-402")).toContainText("mar-patient");
    await expect(second.getByTestId("patient-mar-patient")).toContainText(
      "Bed 402",
    );
    await first.screenshot({
      path: testInfo.outputPath("bed-board.png"),
      fullPage: true,
    });
    await command(first, "release", "Release bed");
    await expect(second.getByTestId("patient-mar-patient")).toContainText(
      "Admitted · No bed",
    );
    await command(first, "clean", "Start cleaning", "401");
    await command(first, "ready", "Mark ready", "401");
    await command(first, "assign", "Assign bed", "401");
    await login(rn, "4west-rn1", "mar");
    await expect(
      rn.getByRole("heading", { name: "Scheduled doses" }),
    ).toBeVisible();
    await expect(
      rn.getByRole("button", { name: "Open MAR", exact: true }),
    ).toBeVisible();
    await rn.getByRole("button", { name: "Open MAR", exact: true }).click();
    await expect(
      rn.locator('[data-comp-id="home.work.w4Worklist"][data-event]'),
    ).toBeVisible();
    await command(first, "discharge", "Discharge");
    await expect(second.getByTestId("patient-mar-patient")).toContainText(
      "Not admitted · No bed",
    );
    await command(first, "clean", "Start cleaning", "402");
    await command(first, "ready", "Mark ready", "402");
    await expect(second.getByTestId("bed-402")).toContainText("ready");
    await rn.reload();
    await expect(
      rn.getByRole("heading", { name: "Scheduled doses" }),
    ).toBeVisible();
    await expect(
      rn.getByRole("button", { name: "Open MAR", exact: true }),
    ).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    await c1.close();
    await c2.close();
    await c3.close();
  }
});

test("an ambiguous ADT response reconciles the identical request before permitting a new command", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(60_000);
  if (!baseURL) throw new Error("Playwright baseURL missing");
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  const payloads: string[] = [];
  try {
    await login(page, "bed-manager");
    await expect(
      page.getByRole("heading", { name: "Bed board", exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("Patient", { exact: true })
      .selectOption("adt-patient");
    await page.getByLabel("Bed", { exact: true }).selectOption("402");
    await page.route("**/commit/adt/commands", async (route) => {
      payloads.push(route.request().postData() ?? "");
      if (payloads.length === 1) {
        // Playwright forwards the real command here so only its response is dropped.
        // eslint-disable-next-line boundary/single-data-module
        const result = await route.fetch();
        expect(result.status()).toBe(201);
        await route.abort("failed");
      } else await route.continue();
    });
    await page.getByRole("button", { name: "Admit", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Outcome unknown");
    await expect(page.getByLabel("Patient", { exact: true })).toBeDisabled();
    const reconciled = page.waitForResponse((r) =>
      r.url().endsWith("/commit/adt/commands"),
    );
    await page
      .getByRole("button", { name: "Reconcile command", exact: true })
      .click();
    expect((await reconciled).status()).toBe(201);
    await expect(page.getByRole("status")).toContainText("Admit saved.");
    expect(payloads).toHaveLength(2);
    expect(payloads[0]).toBe(payloads[1]);
    await expect(page.getByTestId("patient-adt-patient")).toContainText(
      "Bed 402",
    );
  } finally {
    await context.close();
  }
});
