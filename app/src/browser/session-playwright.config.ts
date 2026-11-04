import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";
const port = 4193;
export default defineConfig({
  testDir: ".",
  testMatch: "session-review.pw.ts",
  workers: 1,
  outputDir: "../../../test-results/session-review",
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    browserName: "chromium",
    viewport: { width: 1440, height: 900 },
    headless: true,
  },
  webServer: {
    cwd: fileURLToPath(new URL("../..", import.meta.url)),
    command: `pnpm exec vite preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}/browse`,
    timeout: 120000,
    reuseExistingServer: false,
  },
});
