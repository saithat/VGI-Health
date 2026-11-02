import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import type { Plugin } from "vite";

/** Fingerprint what can change a certified screen, independent of the machine's `.env`:
 * - first-party modules outside src/dashboard and src/browser, as source text on disk (the painter,
 *   session, data adapters, styles); `.env` values never appear in source text;
 * - third-party modules as emitted code (React, Mantine and other rendering libraries);
 * - pnpm-lock.yaml, vite.config.ts and index.html, which pin the toolchain and dependency versions.
 * Review tooling (dashboard, UI browser) can change without invalidating certificates. The WASM
 * interpreter is bound separately (wasmSha256). */
export function buildBindingPlugin(): Plugin {
  return {
    name: "certified-build-binding",
    enforce: "post",
    generateBundle: {
      order: "post",
      handler(_options, bundle) {
        const hash = createHash("sha256");
        const repoRoot = resolve(process.cwd(), "..");
        const reviewOnly = /[\\/]src[\\/](dashboard|browser)[\\/]/;
        const modules = new Map<string, string>();
        for (const item of Object.values(bundle)) {
          if (item.type !== "chunk") continue;
          for (const [id, info] of Object.entries(item.modules)) {
            if (reviewOnly.test(id)) continue;
            const file = id.split("?")[0] ?? id;
            const thirdParty = /[\\/]node_modules[\\/]/.test(file);
            const firstPartySource = !thirdParty && file.startsWith(repoRoot) && existsSync(file);
            const key = thirdParty
              ? file.replace(/^.*[\\/]node_modules[\\/]/, "npm:")
              : firstPartySource
                ? "repo:" + file.slice(repoRoot.length).split(sep).join("/")
                : "virtual:" + id.split(repoRoot).join("<repo>").replace(/\0/g, "");
            modules.set(key, firstPartySource ? readFileSync(file, "utf8") : (info.code ?? ""));
          }
        }
        for (const pinned of ["../pnpm-lock.yaml", "vite.config.ts", "index.html"])
          modules.set("pinned:" + pinned, readFileSync(pinned, "utf8"));
        for (const [key, code] of [...modules].sort(([a], [b]) => a.localeCompare(b)))
          hash.update(key).update("\0").update(code).update("\0");
        this.emitFile({ type: "asset", fileName: "build.json", source: JSON.stringify({ schemaVersion: 1, appSha256: hash.digest("hex") }) });
      },
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== "/build.json") return next();
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ schemaVersion: 1, appSha256: "development-unbound" }));
      });
    },
  };
}
