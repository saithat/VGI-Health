import { leanBundlePlugin } from "./scripts/lean-bundle-plugin";
import { buildBindingPlugin } from "./scripts/build-binding-plugin";
import { defineConfig } from "vitest/config";
import { catalogPlugin } from "./scripts/catalog-plugin";
import { tryBreakPlugin } from "./scripts/try-break-plugin";
import { compressionPlugin } from "./scripts/compression-plugin";
import { readFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import { runsPlugin } from "./scripts/runs-plugin";
import { tailscalePlugin } from "./scripts/tailscale-plugin";

/** Same-origin guarded commit authority. */
const commitProxy = {
  "/commit": {
    target: process.env.COMMIT_INTERNAL_URL ?? "http://127.0.0.1:18090",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/commit/, ""),
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
  server: { proxy: commitProxy },
  preview: { proxy: commitProxy },
  build: {
    rollupOptions: {
      input: {
        app: "index.html",
        lean: "lean.html",
        trajectoryFrame: "trajectory-frame.html",
      },
    },
  },
  plugins: [
    buildBindingPlugin(),
    leanBundlePlugin(),
    react(),
    runsPlugin(),
    catalogPlugin(),
    tailscalePlugin(),
    tryBreakPlugin(),
    compressionPlugin(),
  ],
  test: { environment: "jsdom", include: ["tests/**/*.test.{ts,tsx,js}"] },
});
