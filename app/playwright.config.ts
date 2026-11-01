import { defineConfig } from "@playwright/test";
const port = Number(process.env.APP_TEST_PORT ?? 4179);
export default defineConfig({
  testDir: "./e2e",
  outputDir: `test-results/${port}`,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    screenshot: "only-on-failure",
    headless: true,
  },
  projects: [
    {
      name: "desktop",
      use: { browserName: "chromium", viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "narrow",
      use: { browserName: "chromium", viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: `pnpm exec vite ${process.env.APP_TEST_PREVIEW ? "preview" : ""} --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}/screen-check.html`,
    reuseExistingServer: false,
  },
});
