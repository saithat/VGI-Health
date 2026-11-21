import { fetchData } from "./fetch-data.mjs";
import { localEnvironment } from "./local-build.mjs";
import console from "node:console";

const base = process.argv[2];
if (!base)
  throw new Error(
    "Usage: node scripts/clean-clone-smoke.mjs http://127.0.0.1:5189",
  );
await localEnvironment();
await fetchData();
if (process.argv[2] === "--extract-data") process.exit(0);
await fetchData(true); // The browser smoke opens a recorded pair.

// Resolve the browser dependency from its owning workspace package.
import { createRequire } from "node:module";
const require = createRequire(new URL("../app/package.json", import.meta.url));
const { chromium, expect: baseExpect } = require("@playwright/test");
const expect = baseExpect.configure({ timeout: 30_000 });
import { URL } from "node:url";
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
  await page.goto(`${base}/lean.html`);
  await expect(page).toHaveURL(/\/lean\.html$/);
  await expect(page.getByRole("button", { name: "Sign in as P1" })).toBeVisible();
  console.log("Lean clinical sign-in loaded");
  await page.goto(`${base}/dashboard`);
  await expect(
    page.getByRole("navigation", { name: "Dashboard areas" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Evolution", exact: true }),
  ).toBeVisible();
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
