import { resolve, sep } from "node:path";
import type { Plugin } from "vite";
import { sendArtifact } from "./artifact-response";
// Shared with the dependency-free verdict generator.
import { buildCatalog, root } from "./catalog.mjs";

export function catalogPlugin(): Plugin {
  return {
    name: "offline-ui-catalog",
    configureServer(server) {
      attach(server);
    },
    configurePreviewServer(server) {
      attach(server);
    },
  };
  function attach(server: Pick<import("vite").ViteDevServer, "middlewares">) {
    let catalog: Promise<unknown> | undefined;
    server.middlewares.use(async (req, res, next) => {
      const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
      if (
        pathname !== "/catalog.json" &&
        !/^\/(releases|programs|fixtures)\//.test(pathname)
      )
        return next();
      try {
        res.setHeader("Content-Type", "application/json");
        if (pathname === "/catalog.json") {
          await sendArtifact(
            req,
            res,
            pathname,
            Buffer.from(JSON.stringify(await (catalog ??= buildCatalog()))),
          );
        } else {
          const directory = pathname.split("/")[1] ?? "";
          const file = resolve(root, decodeURIComponent(pathname.slice(1)));
          if (
            !file.startsWith(resolve(root, directory) + sep) ||
            !file.endsWith(".json")
          )
            throw new Error("Invalid static path");
          await sendArtifact(req, res, pathname, file);
        }
      } catch {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "Offline artifact unavailable" }));
      }
    });
  }
}
