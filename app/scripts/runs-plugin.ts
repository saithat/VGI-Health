import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import {
  completedPrefix,
  derived,
  runSummary,
  savedPrefix,
  readDecision,
} from "../../scripts/live-run-data.mjs";
import { readdir, access } from "node:fs/promises";
import { resolve } from "node:path";
import type { Plugin } from "vite";
import { geometrySliceFile } from "./geometry-slice";
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
  const waiting = runs
    .filter((run) => run.real)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (waiting) return waiting.id;
  throw new Error("No replayable recorded runs; wait for a completed day");
}

/** Direct completed-prefix access, for both dev and preview servers. */
export function runsPlugin(): Plugin {
  const middleware = runMiddleware();
  const attach = (
    server: Pick<import("vite").ViteDevServer, "middlewares">,
  ) => {
    server.middlewares.use(middleware);
  };
  return {
    name: "recorded-runs",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}
export function runMiddleware(root = resolve(import.meta.dirname, "../..")) {
  const runRoot = resolve(root, "runs");
  async function index(): Promise<RecordedRun[]> {
    const runs: RecordedRun[] = [];
    for (const entry of await readdir(runRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || !/^[\w-]+$/.test(entry.name)) continue;
      try {
        const prefix = await completedPrefix(resolve(runRoot, entry.name));
        if (
          prefix.manifest.runId !== entry.name ||
          !["real", "fake"].includes(prefix.manifest.ehr.mode)
        )
          continue;
        runs.push({
          id: entry.name,
          files: prefix.files,
          real: prefix.manifest.ehr.mode === "real",
          days: prefix.manifest.daysCompleted,
          createdAt: prefix.manifest.createdAt ?? "",
          replayable: prefix.manifest.daysCompleted > 0,
        });
      } catch (error) {
        if (
          (error instanceof Error && "code" in error ? error.code : null) !==
          "ENOENT"
        )
          console.error(`Run ${entry.name}:`, error);
      }
    }
    return runs;
  }
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) => {
    if (!req.url?.startsWith("/runs/")) return next();
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      res.setHeader("Content-Type", "application/json");
      const send = (value: unknown) =>
        sendArtifact(req, res, pathname, Buffer.from(JSON.stringify(value)));
      if (pathname === "/runs/index.json") return await send(await index());
      if (pathname === "/runs/default.json")
        return await send({ runId: selectDefaultRun(await index()) });
      const match = /^\/runs\/([\w-]+)\/((?:[\w.-]+\/)*[\w.-]+\.json)$/.exec(
        pathname,
      );
      if (!match || pathname.split("/").includes(".."))
        throw new Error("Invalid run path");
      const [, id = "", requestedFile = ""] = match;
      let file = requestedFile;
      let prefix = await completedPrefix(resolve(runRoot, id));
      const requested = /^\.cache\/completed\/([a-f0-9]{64})\/(.+)$/.exec(file);
      if (requested) {
        prefix = await savedPrefix(prefix, requested[1] ?? "");
        file = requested[2] ?? "";
      }
      if (prefix.manifest.runId !== id)
        throw new Error("Run identity mismatch");
      if (file === "manifest.json") return await send(prefix.manifest);
      if (file === "summary.json")
        return await send(await runSummary(prefix, root));
      const kinds: Record<string, string> = {
        "trajectories/index.json": "trajectories",
        "replay.json": "replay",
        "complexity.json": "complexity",
        "conformance.json": "conformance",
      };
      const kind = kinds[file];
      if (kind) return await send(await derived(prefix, kind, root));
      const pointer = /^programs\/(P[1-5])\/deployed\.json$/.exec(file);
      if (pointer) {
        const persona = pointer[1] ?? "",
          version = Math.max(...(prefix.versions.get(persona) ?? []));
        if (!Number.isFinite(version)) throw new Error("Unknown persona");
        return await send({
          version,
          program: `programs/${persona}/v${version}.json`,
          certificate: `certs/${persona}/v${version}.json`,
        });
      }
      const slice =
        /^geometry\/([a-f0-9]{64}(?:\.[a-f0-9]{64})?)\/slices\/((?:[\w.-]+\/)*[\w.-]+\.json)$/.exec(
          file,
        );
      if (slice)
        return await sendArtifact(
          req,
          res,
          pathname,
          await geometrySliceFile(prefix.dir, slice[1] ?? "", slice[2] ?? ""),
        );
      // Derived task paths belong to the index of this committed prefix.
      if (file.startsWith("trajectories/tasks/")) {
        const data = z
          .object({
            tasks: z.array(
              z.object({
                file: z.string(),
                baseline: z.object({ file: z.string() }).optional(),
              }),
            ),
          })
          .parse(await derived(prefix, "trajectories", root));
        if (
          !data.tasks.some(
            (t) =>
              `trajectories/${t.file}` === file ||
              (t.baseline && `trajectories/${t.baseline.file}` === file),
          )
        )
          throw new Error("Uncommitted task");
        const cached = resolve(
          prefix.dir,
          ".cache/completed",
          prefix.key,
          file,
        );
        const source = await Promise.all([
          access(cached),
          access(
            resolve(
              prefix.dir,
              ".cache/completed",
              prefix.key,
              "trajectories.ready.json",
            ),
          ),
        ]).then(
          () => cached,
          () => resolve(prefix.dir, file),
        );
        return await sendArtifact(req, res, pathname, source);
      }
      if (requested && file.startsWith("trajectories/")) {
        const cachedFile = resolve(
          prefix.dir,
          ".cache/completed",
          prefix.key,
          file,
        );
        const ready = resolve(
          prefix.dir,
          ".cache/completed",
          prefix.key,
          "trajectories.ready.json",
        );
        if (
          await access(ready).then(
            () => true,
            () => false,
          )
        )
          return await sendArtifact(req, res, pathname, cachedFile);
      }
      if (!prefix.files.includes(file)) throw new Error("Uncommitted run file");
      if (/^decisions\/night-\d+\/P[1-5]\.json$/.test(file))
        return await send(await readDecision(prefix, file));
      return await sendArtifact(req, res, pathname, resolve(prefix.dir, file));
    } catch (error) {
      console.error("Run read failed:", req.url, error);
      res.statusCode = 404;
      res.end("Run file not found");
    }
  };
}
