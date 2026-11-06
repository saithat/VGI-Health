#!/usr/bin/env node
/** One-time marker upgrade of a stopped legacy recording, in place. Explicit
 * counts prevent an unfinished directory being mistaken for a finished phase.
 */
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
export async function markCompletedRun(
  id,
  days,
  nights,
  { root = path.resolve(import.meta.dirname, "..") } = {},
) {
  if (
    !/^[\w-]+$/.test(id) ||
    !Number.isSafeInteger(days) ||
    days < 1 ||
    !Number.isSafeInteger(nights) ||
    ![days - 1, days].includes(nights)
  )
    throw new Error(
      "Usage: mark-completed-run.mjs <id> <completed-days> <completed-nights>",
    );
  const dir = path.join(root, "runs", id),
    read = async (file) =>
      JSON.parse(await readFile(path.join(dir, file), "utf8"));
  const manifest = await read("manifest.json");
  if (
    manifest.runId !== id ||
    ["running", "initializing"].includes(manifest.status)
  )
    throw new Error("Expected matching stopped run");
  if (
    days > (manifest.daysPlanned ?? manifest.days) ||
    nights >= (manifest.daysPlanned ?? manifest.days)
  )
    throw new Error("Counts exceed the run calendar");
  const { dayResultSchema, decisionRecordSchema } =
    await import("../agent/src/schema.js");
  const { loadWorld } = await import("../agent/src/world.js");
  const { recordedWorld } = await import("./trajectories/daily-canonical.mjs");
  const world = await loadWorld(await recordedWorld({ root, manifest }));
  // Validate the whole requested prefix before writing its first marker.
  for (let day = 1; day <= days; day++)
    for (const persona of manifest.personas) {
      const row = dayResultSchema.parse(
        await read(`days/day-${String(day).padStart(2, "0")}/${persona}.json`),
      );
      if (row.day !== day || row.persona !== persona)
        throw new Error("Day identity mismatch");
      const schedule = await world.schedule(day, persona),
        ids = new Set(row.tasks.map((t) => t.task));
      if (
        !schedule ||
        schedule.tasks.length !== row.tasks.length ||
        ids.size !== row.tasks.length ||
        schedule.tasks.some((t) => !ids.has(t.id)) ||
        row.trace.some((t) => !ids.has(t.task))
      )
        throw new Error("Incomplete day task set");
      await access(
        path.join(dir, `programs/${persona}/v${row.programVersion}.json`),
      );
      if (manifest.noAgentRequired)
        for (const file of [
          `baselines/day-${String(day).padStart(2, "0")}/${persona}.json`,
          `no-agent/days/day-${String(day).padStart(2, "0")}/${persona}.json`,
        ]) {
          const control = dayResultSchema.parse(await read(file));
          if (
            control.day !== day ||
            control.persona !== persona ||
            control.tasks.length !== ids.size ||
            control.tasks.some((t) => !ids.has(t.task))
          )
            throw new Error("Incomplete control arm");
        }
      if (day <= nights) {
        const record = decisionRecordSchema.parse(
          await read(
            `decisions/night-${String(day).padStart(2, "0")}/${persona}.json`,
          ),
        );
        const pointer = await read(`programs/${persona}/deployed.json`);
        if (
          record.runId !== id ||
          record.night !== day ||
          record.persona !== persona ||
          pointer.version < record.versionAfter
        )
          throw new Error("Uncommitted night");
      }
    }
  const { writeDayDigest, writeNightDigest, contentDigest } =
    await import("../agent/src/content-digest.js");
  const { writeJsonAtomic } = await import("../agent/src/util.js");
  for (let day = 1; day <= days; day++) {
    await writeDayDigest(dir, day, manifest.personas);
    if (day <= nights) await writeNightDigest(dir, day, manifest.personas);
  }
  const current = { ...manifest, completionProtocol: "atomic-prefix-v1" };
  await writeJsonAtomic(path.join(dir, "manifest.json"), current);
  if ("contentDigest" in current) {
    const digest = await contentDigest(dir);
    await writeJsonAtomic(path.join(dir, "digest.json"), digest);
    await writeJsonAtomic(path.join(dir, "manifest.json"), {
      ...current,
      contentDigest: digest.contentDigest,
    });
  }
  return { id, days, nights };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const { register } =
    await import("../agent/node_modules/tsx/dist/esm/api/index.mjs");
  register();
  console.log(
    await markCompletedRun(
      process.argv[2],
      Number(process.argv[3]),
      Number(process.argv[4]),
    ),
  );
}
