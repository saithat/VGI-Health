// Resolve the browser dependency from its owning workspace package.
import { createRequire } from "node:module";
const require = createRequire(new URL("../app/package.json", import.meta.url));
const { chromium, expect: baseExpect } = require("@playwright/test");
const expect = baseExpect.configure({ timeout: 30_000 });
import { URL } from "node:url";
import console from "node:console";

const base = process.argv[2];
if (!base)
  throw new Error(
    "Usage: node scripts/clean-clone-smoke.mjs http://127.0.0.1:5189",
  );
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext();
  const external = [],
    errors = [],
    failed = [];
  // Enforce the post-install contract: external requests cannot succeed.
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
      return route.continue();
    external.push(url.origin);
    return route.abort("internetdisconnected");
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400)
      failed.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(`${base}/`);
  await expect(page.getByRole("heading", { name: "Choose a clinician" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^P1 · / })).toBeVisible();
  console.log("Live clinician sign-in loaded");
  for (const persona of ["P1", "P2", "P3", "P4", "P5"]) {
    await page.goto(`${base}/ehr?mode=replay&persona=${persona}&inspect=1`);
    await page.getByRole("button", { name: "Inspector", exact: true }).click();
    await expect(page.getByLabel("Persona", { exact: true })).toHaveValue(
      persona,
    );
    await page.getByRole("button", { name: "Close inspector", exact: true }).click();
    await page.getByRole("button", { name: /^Open chart:/ }).first().click();
    const banner = page.getByRole("banner", { name: "Patient banner" }).first();
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/MRN|DOB|born/i);
    await expect(page.getByRole("alert")).toHaveCount(0);
    console.log(`${persona}: EHR patient banner loaded`);
  }
  await page.goto(`${base}/dashboard`);
  await expect(
    page.getByRole("navigation", { name: "Dashboard areas" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Evolution", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  // Exercise a recorded EHR pair through the current version drawer.
  await page.locator(".version-row:not(.baseline-row)").first().click();
  await page.getByRole("dialog").getByRole("button", {
    name: "Before / after on screen", exact: true,
  }).click();
  await expect(page.locator(".paired-screens .ehr-shell")).toHaveCount(2);
  await expect(page.getByRole("alert")).toHaveCount(0);
  const wasm = await page.request.get(`${base}/ehr/ehr-interp.wasm`);
  expect(wasm.ok()).toBe(true);
  expect([...new Uint8Array(await wasm.body()).slice(0, 4)]).toEqual([
    0, 97, 115, 109,
  ]);
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
  expect(external).toEqual([]);
  console.log(
    "Dashboard, recorded task frames and WASM loaded; no external requests or browser errors.",
  );
} finally {
  await browser.close();
}
