import { readdir, readFile } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import type { Plugin } from "vite";
import { sendArtifact } from "./artifact-response";

export interface RecordedRun {
  id: string;
  files: string[];
  real: boolean;
  days: number;
  createdAt: string;
  replayable: boolean;
}

// Prefer usable real runs, then the newest timestamp, recording length and id.
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
        b.createdAt.localeCompare(a.createdAt) ||
        b.days - a.days ||
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
        replayable =
          Array.isArray(manifest.personas) &&
          manifest.personas.length > 0 &&
          manifest.personas.every(
            (persona: string) =>
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
      attach(server);
    },
    configurePreviewServer(server) {
      attach(server);
    },
  };
  function attach(server: Pick<import("vite").ViteDevServer, "middlewares">) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith("/runs/")) {
        next();
        return;
      }
      try {
        const url = new URL(req.url, "http://localhost");
        if (url.pathname === "/runs/index.json") {
          res.setHeader("Content-Type", "application/json");
          await sendArtifact(
            req,
            res,
            url.pathname,
            Buffer.from(JSON.stringify(await index())),
          );
          return;
        }
        if (url.pathname === "/runs/default.json") {
          res.setHeader("Content-Type", "application/json");
          await sendArtifact(
            req,
            res,
            url.pathname,
            Buffer.from(
              JSON.stringify({ runId: selectDefaultRun(await index()) }),
            ),
          );
          return;
        }
        const summary = /^\/runs\/([\w-]+)\/summary.json$/.exec(url.pathname);
        if (summary) {
          res.setHeader("Content-Type", "application/json");
          const id = summary[1] ?? "";
          const entry = (await index()).find((r) => r.id === id);
          if (!entry) throw new Error("Unknown run");
          const get = async (file: string) =>
            JSON.parse(await readFile(resolve(root, id, file), "utf8"));
          const records = [],
            days = [],
            baselines = [],
            noAgentDays = [];
          const certificates: Record<string, unknown> = {};
          let complexity = null;
          for (const file of entry.files) {
            if (/^(decisions|break)\/.+\.json$/.test(file))
              records.push(await get(file));
            else if (/^days\/day-\d+\/[\w-]+\.json$/.test(file))
              days.push({ ...(await get(file)), trace: [] });
            else if (/^baselines\/day-\d+\/[\w-]+\.json$/.test(file))
              baselines.push({ ...(await get(file)), trace: [] });
            else if (/^no-agent\/days\/day-\d+\/[\w-]+\.json$/.test(file))
              noAgentDays.push({ ...(await get(file)), trace: [] });
            else if (file === "complexity.json") complexity = await get(file);
            else if (/^certs\/P[1-5]\/v\d+\.json$/.test(file))
              certificates[file] = await get(file);
          }
          await sendArtifact(
            req,
            res,
            url.pathname,
            Buffer.from(
              JSON.stringify({
                manifest: await get("manifest.json"),
                records,
                days,
                baselines,
                noAgentDays,
                complexity,
                files: entry.files,
                certificates,
              }),
            ),
          );
          return;
        }
        const file = resolve(root, decodeURIComponent(url.pathname.slice(6)));
        if (!file.startsWith(root + sep) || !file.endsWith(".json")) {
          res.statusCode = 403;
          res.end("Invalid run path");
          return;
        }
        res.setHeader("Content-Type", "application/json");
        await sendArtifact(req, res, url.pathname, file);
      } catch {
        res.statusCode = 404;
        res.end("Run file not found");
      }
    });
  }
}
