import { buildBindingPlugin } from "./scripts/build-binding-plugin";
import { defineConfig } from "vitest/config";
import { catalogPlugin } from "./scripts/catalog-plugin";
import react from "@vitejs/plugin-react";
import { runsPlugin } from "./scripts/runs-plugin";
import { tailscalePlugin } from "./scripts/tailscale-plugin";
import { devPersonaPlugin } from "./scripts/dev-persona-plugin";

/** Same-origin Medplum: the browser talks to `/medplum/*` on the app server,
 * which forwards to the local Medplum API. This works from any device that
 * can reach the app (for example over Tailscale), where "localhost:8103" in
 * the browser would point at the wrong machine. */
const medplumProxy = {
  "/medplum": {
    target: process.env.MEDPLUM_INTERNAL_URL ?? "http://localhost:8103",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/medplum/, ""),
  },
};

export default defineConfig({
  envDir: "..",
  server: { proxy: medplumProxy },
  preview: { proxy: medplumProxy },
  build: {
    rollupOptions: {
      input: { app: "index.html", screenCheck: "screen-check.html" },
    },
  },
  plugins: [
    buildBindingPlugin(),
    react(),
    runsPlugin(),
    catalogPlugin(),
    tailscalePlugin(),
    devPersonaPlugin(),
  ],
  test: { environment: "jsdom", include: ["tests/**/*.test.{ts,tsx,js}"] },
});
