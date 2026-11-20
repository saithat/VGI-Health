import { defineConfig } from "@playwright/test";
import { captureSettings } from "./capture-environment";

export default defineConfig({
  testDir: "./one-command",
  outputDir: "../test-results/one-command",
  workers: 1,
  timeout: 240_000,
  reporter: "list",
  use: {
    ...captureSettings,
    baseURL: process.env.VGI_START_TEST_URL,
    browserName: "chromium",
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
  },
});
