import { createHash } from "node:crypto";
import type { Plugin } from "vite";

/** Fingerprint the actual emitted painter/app code, styles and HTML, excluding run data. */
export function buildBindingPlugin(): Plugin {
  return {
    name: "certified-build-binding",
    enforce: "post",
    generateBundle: {
      order: "post",
      handler(_options, bundle) {
        const hash = createHash("sha256");
        for (const [name, item] of Object.entries(bundle).sort(([a], [b]) => a.localeCompare(b))) {
          if (!/\.(js|css|html)$/.test(name)) continue;
          hash.update(name).update("\0").update(item.type === "chunk" ? item.code : item.source).update("\0");
        }
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
