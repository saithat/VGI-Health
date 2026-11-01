import { resolve } from "node:path";
import { defineConfig } from "@playwright/test";
const port = Number(process.env.APP_TEST_PORT ?? 4186);
export default defineConfig({
  testDir: ".", testMatch: "buttons.spec.ts", workers: 1, fullyParallel: false,
  timeout: 3600000, reporter: "list", outputDir: "../../test-results/buttons",
  use: { baseURL: `http://127.0.0.1:${port}`, browserName: "chromium", viewport: { width: 1440, height: 1000 }, headless: true },
  webServer: { cwd: resolve(import.meta.dirname, "../.."), command: `pnpm exec vite preview --host 127.0.0.1 --port ${port} --strictPort`, url: `http://127.0.0.1:${port}`, reuseExistingServer: false },
});
