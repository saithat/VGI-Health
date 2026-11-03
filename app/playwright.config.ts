import { captureSettings } from "./e2e/capture-environment";
import { defineConfig } from "@playwright/test";
const port = Number(process.env.APP_TEST_PORT ?? 4179);
// Recorded certificates require the built renderer. Explicit 1 reuses an
// existing build (the screen gate); explicit 0 opts into unbound development.
const preview = process.env.APP_TEST_PREVIEW !== "0";
const build = process.env.APP_TEST_PREVIEW ? "" : "pnpm run build && ";
export default defineConfig({
  testDir: "./e2e",
  // The longer control/performance audits use their own preview/timeout config.
  testIgnore: "**/audit/**",
  outputDir: `test-results/${port}`,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    ...captureSettings,
    baseURL: `http://127.0.0.1:${port}`,
    screenshot: "only-on-failure",
    headless: true,
  },
  projects: [
    {
      name: "desktop",
      use: { browserName: "chromium", viewport: { width: 1440, height: 900 } },
    },
    {
      name: "narrow",
      use: { browserName: "chromium", viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: `${build}pnpm exec vite ${preview ? "preview" : ""} --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}/screen-check.html`,
    reuseExistingServer: false,
    timeout: 120000,
  },
});
