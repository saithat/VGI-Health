import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4179",
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
    command: "pnpm exec vite --host 127.0.0.1 --port 4179 --strictPort",
    url: "http://127.0.0.1:4179/screen-check.html",
    reuseExistingServer: false,
  },
});
