#!/usr/bin/env node
/** Lazy derived artifacts only. Source recordings are never copied or modified. */
import path from "node:path";
import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { completedPrefix } from "./run-prefix.mjs";
const read = async (file) => JSON.parse(await readFile(file, "utf8"));
const write = async (file, data) => {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp";
  await writeFile(tmp, JSON.stringify(data) + "\n");
  await rename(tmp, file);
};
export async function deriveRun(root, id, key, kind) {
  if (
    !/^[\w-]+$/.test(id) ||
    !/^\w{64}$/.test(key) ||
    !["trajectories", "replay", "complexity", "conformance"].includes(kind)
  )
    throw new Error("Invalid derived request");
  const dir = path.join(root, "runs", id),
    output = path.join(dir, ".cache", "completed", key);
  try {
    const ready = await read(path.join(output, kind + ".ready.json"));
    if (ready.key === key && ready.kind === kind) return;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const request = await read(path.join(output, "request.json"));
  const current = await completedPrefix(dir);
  if (
    request.key !== key ||
    request.files.some((file) => !current.files.includes(file))
  )
    throw new Error("Committed inputs no longer exist");
  const binary =
    process.env.EHR_BIN ??
    request.manifest.ehr.binary ??
    path.join(root, "lean/.lake/build/bin/ehr");
  process.env.EHR_BIN = binary;
  const files = request.files;
  if (kind === "trajectories") {
    const { indexTrajectories } = await import("./trajectories/index.mjs");
    await indexTrajectories({
      root,
      runDirectory: dir,
      runId: id,
      files,
      binary,
      outputDirectory: path.join(output, "trajectories"),
      contextCache: path.join(dir, ".cache", "contexts"),
    });
  } else if (kind === "replay") {
    const { exportReplay } = await import("./export-replay.mjs");
    await exportReplay({
      root,
      dir,
      runId: id,
      files,
      binary,
      outputFile: path.join(output, "replay.json"),
    });
  } else if (kind === "complexity") {
    const { compute } = await import("./complexity/compute.mjs");
    await compute({
      root,
      runDir: dir,
      files,
      canonical: false,
      releaseDirectory: "releases",
      outputFile: path.join(output, "complexity.json"),
    });
  } else {
    const { runTargets, runParallel } =
      await import("../conformance/index.mjs");
    const report = await runParallel({
      targets: runTargets(id, files),
      binary,
      runId: id,
      jobs: 2,
    });
    if (report.summary.failed)
      throw new Error(`Conformance failed: ${report.summary.failed} cases`);
    await write(path.join(output, "conformance.json"), report);
  }
  await write(path.join(output, kind + ".ready.json"), { key, kind });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
)
  await deriveRun(...process.argv.slice(2));
