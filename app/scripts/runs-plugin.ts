import { readdir, readFile, cp, mkdir, writeFile } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import type { Plugin } from "vite";

export interface RecordedRun {
  id: string;
  files: string[];
  real: boolean;
  days: number;
  createdAt: string;
  replayable: boolean;
}

// Prefer usable real runs, then the longest recording, newest timestamp and id.
// World-generator manifests and incomplete recordings cannot become the demo.
export function selectDefaultRun(
  runs: RecordedRun[],
  requested = process.env.VGI_RUN,
): string {
  if (requested) {
    if (!runs.some((run) => run.id === requested && run.replayable))
      throw new Error(`VGI_RUN=${requested} is not a replayable recorded run`);
    return requested;
  }
  const best = runs
    .filter((run) => run.real && run.replayable)
    .sort(
      (a, b) =>
        b.days - a.days ||
        b.createdAt.localeCompare(a.createdAt) ||
        a.id.localeCompare(b.id),
    )[0];
  if (best) return best.id;
  if (runs.some((run) => run.id === "mock" && run.replayable)) return "mock";
  throw new Error("No replayable recorded runs; runs/mock must be committed");
}

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
    const all = (await files(root)).filter((file) => file.endsWith(".json"));
    const runs: RecordedRun[] = [];
    for (const file of all
      .filter((file) => /^[\w-]+\/manifest.json$/.test(file))
      .sort()) {
      const id = file.slice(0, -"/manifest.json".length);
      const manifest = JSON.parse(await readFile(resolve(root, file), "utf8"));
      if (
        manifest.runId !== id ||
        !["real", "fake"].includes(manifest.ehr?.mode)
      )
        continue;
      const runFiles = all
        .filter((path) => path.startsWith(`${id}/`))
        .map((path) => path.slice(id.length + 1));
      let replayable = false;
      if (runFiles.includes("replay.json")) {
        const replay = JSON.parse(
          await readFile(resolve(root, id, "replay.json"), "utf8"),
        );
        replayable = ["P1", "P2", "P3", "P4", "P5"].every(
          (persona) =>
            manifest.personas?.includes(persona) &&
            replay.contexts?.some(
              (context: { persona: string }) => context.persona === persona,
            ) &&
            runFiles.some((path) =>
              new RegExp(`^programs/${persona}/v\\d+\\.json$`).test(path),
            ),
        );
      }
      runs.push({
        id,
        files: runFiles,
        real: manifest.ehr.mode === "real",
        days: manifest.days ?? 0,
        createdAt: manifest.createdAt ?? "",
        replayable,
      });
    }
    return runs;
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
          if (url.pathname === "/runs/default.json") {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ runId: selectDefaultRun(await index()) }));
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
      await writeFile(
        resolve(output, "default.json"),
        JSON.stringify({ runId: selectDefaultRun(await index()) }),
      );
      // Directory index also supports static hosts without an SPA rewrite.
      const dashboard = resolve(import.meta.dirname, "../dist/dashboard");
      await mkdir(dashboard, { recursive: true });
      await cp(
        resolve(output, "../index.html"),
        resolve(dashboard, "index.html"),
      );
    },
  };
}
