import { fileURLToPath } from "node:url";
import { buildBindingPlugin } from "./scripts/build-binding-plugin";
import { defineConfig } from "vitest/config";
import { catalogPlugin } from "./scripts/catalog-plugin";
import { tryBreakPlugin } from "./scripts/try-break-plugin";
import { compressionPlugin } from "./scripts/compression-plugin";
import { readFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import { runsPlugin } from "./scripts/runs-plugin";
import { tailscalePlugin } from "./scripts/tailscale-plugin";
import { devPersonaPlugin } from "./scripts/dev-persona-plugin";

/** Same-origin Medplum: the browser talks to `/medplum/*` on the app server,
 * which forwards to the local Medplum API. This works from any device that
 * can reach the app (for example over Tailscale), where "localhost:8103" in
 * the browser would point at the wrong machine. */
const medplumProxy = {
  "/commit": {
    target: process.env.COMMIT_INTERNAL_URL ?? "http://127.0.0.1:8090",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/commit/, ""),
  },
  "/medplum": {
    target: process.env.MEDPLUM_INTERNAL_URL ?? "http://localhost:8103",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/medplum/, ""),
  },
};

export default defineConfig({
  envDir: "..",
  define: {
    __LEAN_HASH__: JSON.stringify(
      JSON.parse(
        readFileSync(
          new URL("./public/ehr/manifest.json", import.meta.url),
          "utf8",
        ),
      ).leanSourceHash,
    ),
  },
  resolve: {
    alias: {
      "@ehr/presentation": fileURLToPath(
        new URL("./src/ehr/ui/presentation-helpers.tsx", import.meta.url),
      ),
    },
  },
  server: { proxy: medplumProxy },
  preview: { proxy: medplumProxy },
  build: {
    rollupOptions: {
      input: {
        app: "index.html",
        screenCheck: "screen-check.html",
        trajectoryFrame: "trajectory-frame.html",
      },
    },
  },
  plugins: [
    buildBindingPlugin(),
    react(),
    runsPlugin(),
    catalogPlugin(),
    tailscalePlugin(),
    devPersonaPlugin(),
    tryBreakPlugin(),
    compressionPlugin(),
  ],
  test: { environment: "jsdom", include: ["tests/**/*.test.{ts,tsx,js}"] },
});
