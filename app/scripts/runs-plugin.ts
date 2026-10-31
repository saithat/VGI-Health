import { readdir, readFile, cp, mkdir, writeFile } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import type { Plugin } from "vite";

// Index existing agent directories without requiring changes to its manifest.
export function runsPlugin(): Plugin {
  const root = resolve(import.meta.dirname, "../../runs");
  async function files(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true });
    return (
      await Promise.all(
        entries.map(async (entry) =>
          entry.isDirectory()
            ? files(resolve(dir, entry.name))
            : [relative(root, resolve(dir, entry.name)).split(sep).join("/")],
        ),
      )
    ).flat();
  }
  async function index() {
    const all = await files(root);
    return all
      .filter((file) => file.endsWith("/manifest.json"))
      .map((file) => ({
        id: file.slice(0, -"/manifest.json".length),
        files: all
          .filter((path) =>
            path.startsWith(file.slice(0, -"manifest.json".length)),
          )
          .map((path) => path.slice(file.length - "manifest.json".length)),
      }));
  }
  return {
    name: "recorded-runs",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/runs/")) {
          next();
          return;
        }
        try {
          const url = new URL(req.url, "http://localhost");
          if (url.pathname === "/runs/index.json") {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(await index()));
            return;
          }
          const file = resolve(root, decodeURIComponent(url.pathname.slice(6)));
          if (!file.startsWith(root + sep) || !file.endsWith(".json")) {
            res.statusCode = 403;
            res.end("Invalid run path");
            return;
          }
          res.setHeader("Content-Type", "application/json");
          res.end(await readFile(file));
        } catch {
          res.statusCode = 404;
          res.end("Run file not found");
        }
      });
    },
    async closeBundle() {
      const output = resolve(import.meta.dirname, "../dist/runs");
      await mkdir(output, { recursive: true });
      await cp(root, output, { recursive: true });
      await writeFile(
        resolve(output, "index.json"),
        JSON.stringify(await index()),
      );
    },
  };
}
