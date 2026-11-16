import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".",
  testMatch: "gallery.pw.ts",
  workers: 1,
  reporter: "list",
  outputDir:
    (process.env.TMPDIR ?? "/home/saithat/Projects/run-tmp") +
    "/discovery-playwright",
  use: {
    baseURL: "http://127.0.0.1:5191",
    browserName: "chromium",
    headless: true,
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    cwd: fileURLToPath(new URL("../../../..", import.meta.url)),
    command: "node scripts/discovery/test-server.mjs",
    url: "http://127.0.0.1:5191",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
