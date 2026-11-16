import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
const port = Number(process.env.LEAN_PAINTER_TEST_PORT ?? 4397);
export default defineConfig({
  testDir: ".",
  testMatch: "*.pw.ts",
  workers: 1,
  reporter: "list",
  timeout: 120000,
  outputDir: process.env.TMPDIR + "/lean-painter-playwright",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1440, height: 900 },
    browserName: "chromium",
    headless: true,
    screenshot: "only-on-failure",
    actionTimeout: 15000,
  },
  webServer: {
    cwd: fileURLToPath(new URL("../..", import.meta.url)),
    command: `pnpm exec vite --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}/lean.html`,
    reuseExistingServer: false,
    timeout: 120000,
  },
});
