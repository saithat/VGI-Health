// Download the synthetic data snapshot before installing dependencies in a clean clone.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import console from "node:console";

const root = fileURLToPath(new URL("../", import.meta.url));
// Synthetic data snapshot published outside git history (see README).
const DATA_URL = "https://github.com/saithat/VGI-Health/releases/download/data-2026-11-20/vgi-data-2026-11-20.tar.gz";
const dataPaths = ["runs", "fixtures", "programs"];
const missing = dataPaths.filter((path) => !existsSync(join(root, path)));
if (missing.length === dataPaths.length) {
  const scratch = mkdtempSync(join(tmpdir(), "vgi-archive-"));
  try {
    const archive = join(scratch, "data.tar.gz");
    execFileSync("curl", ["-fsSL", "-o", archive, DATA_URL], { stdio: "inherit" });
    execFileSync("tar", ["-xzf", archive, "-C", root], { stdio: "inherit" });
    console.log(`Restored runs/world/2, fixtures and programs from ${DATA_URL}.`);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
} else if (missing.length) {
  throw new Error(`Partial data: missing ${missing.join(", ")}. Extract ${DATA_URL} at the repository root.`);
}
if (process.argv[2] === "--extract-data") process.exit(0);

// Resolve the browser dependency from its owning workspace package.
import { createRequire } from "node:module";
const require = createRequire(new URL("../app/package.json", import.meta.url));
const { chromium, expect: baseExpect } = require("@playwright/test");
const expect = baseExpect.configure({ timeout: 30_000 });
import { URL } from "node:url";
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
  // The clinical entry opens the Lean page.
  await page.goto(`${base}/`);
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
