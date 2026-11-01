import { defineConfig } from "vitest/config";
import { catalogPlugin } from "./scripts/catalog-plugin";
import react from "@vitejs/plugin-react";
import { runsPlugin } from "./scripts/runs-plugin";
import { tailscalePlugin } from "./scripts/tailscale-plugin";
import { devPersonaPlugin } from "./scripts/dev-persona-plugin";

export default defineConfig({
  envDir: "..",
  build: {
    rollupOptions: {
      input: { app: "index.html", screenCheck: "screen-check.html" },
    },
  },
  plugins: [
    react(),
    runsPlugin(),
    catalogPlugin(),
    tailscalePlugin(),
    devPersonaPlugin(),
  ],
  test: { environment: "jsdom", include: ["tests/**/*.test.{ts,tsx,js}"] },
});
