import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import type { Plugin } from "vite";

/** Fingerprint what can change a certified screen: the emitted code of every module except the
 * dashboard and UI browser (src/dashboard, src/browser), including third-party rendering libraries,
 * plus the CSS sources outside those folders. Review tooling can change without invalidating
 * certificates; the painter, session, data adapters, styles and libraries cannot. The WASM
 * interpreter is bound separately (wasmSha256). */
export function buildBindingPlugin(): Plugin {
  return {
    name: "certified-build-binding",
    enforce: "post",
    generateBundle: {
      order: "post",
      handler(_options, bundle) {
        const hash = createHash("sha256");
        const reviewOnly = /[\\/]src[\\/](dashboard|browser)[\\/]/;
        const modules = new Map<string, string>();
        for (const item of Object.values(bundle)) {
          if (item.type !== "chunk") continue;
          for (const [id, info] of Object.entries(item.modules)) {
            if (reviewOnly.test(id)) continue;
            const key = id.replace(/^.*[\\/]node_modules[\\/]\.pnpm[\\/]/, "pnpm:").replace(process.cwd(), ".");
            const clean = id.split("?")[0] ?? id;
            modules.set(key, /\.css$/.test(clean) && existsSync(clean) ? readFileSync(clean, "utf8") : (info.code ?? ""));
          }
        }
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
