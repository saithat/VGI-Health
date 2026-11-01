import { chromium, expect } from "@playwright/test";
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
  for (const persona of ["P1", "P2", "P3", "P4", "P5"]) {
    await page.goto(`${base}/?persona=${persona}`);
    await expect(page.getByLabel("Persona", { exact: true })).toHaveValue(
      persona,
    );
    const banner = page.locator(".ehr-banner").first();
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/MRN|DOB|born/i);
    await expect(page.getByRole("alert")).toHaveCount(0);
    console.log(`${persona}: EHR patient banner loaded`);
  }
  await page.goto(`${base}/dashboard`);
  await expect(
    page.getByRole("navigation", { name: "Dashboard views" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Evolution", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  // Exercise a recorded EHR frame through the production preview's static runs.
  await page
    .getByRole("navigation", { name: "Dashboard views" })
    .getByRole("button", { name: "Day replay", exact: false })
    .click();
  await expect(page.locator(".paired-screens .ehr-banner")).toHaveCount(2);
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
