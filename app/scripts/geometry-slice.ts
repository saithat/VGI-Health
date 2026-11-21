import { readGeometryJson } from "../../agent/src/geometry-json.mjs";
import { readStoredGeometry } from "../../agent/src/geometry-format.mjs";
import { isDeepStrictEqual } from "node:util";
import {
  pointingTarget,
  scrollLookahead,
  measuredPointingTrace,
  type TargetAtlas,
  type ReplayGeometry,
} from "../src/dashboard/trajectory-travel";
import type { DayResult } from "../../agent/src/schema";
import { dayResultSchema } from "../src/dashboard/agent-evidence";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  replayGeometrySchema,
  trajectorySchema,
  trajectoryIndexSchema,
} from "../src/dashboard/trajectories-data";
import type { PointerEvent } from "../src/metrics/geometry";
import type { Trajectory } from "../src/dashboard/trajectory-replay";

// Start at a screen entry so scroll offsets reset. Once a click on that visit
// sets the pointer, earlier visits cannot affect the selected task's costs.
function carryStart(trace: Trajectory["trace"], first: number) {
  for (let i = first - 1; i >= 0; i--) {
    const row = trace[i];
    if (
      row &&
      "click" in row.event &&
      row.event.click.comp &&
      row.ops.includes("click")
    ) {
      while (i > 0 && trace[i - 1]?.screen === row.screen) i--;
      return i;
    }
  }
  return 0;
}

/** Keep state selection order, scrollers and all boxes used by the measurement. */
export function sliceGeometry(
  atlas: TargetAtlas,
  task: Trajectory,
  recorded?: DayResult,
): ReplayGeometry {
  const { traceTargets: dayTargets, ...geometry } = atlas;
  const traceTargets: Record<string, string> = {};
  const carry: NonNullable<ReplayGeometry["carry"]> = [];
  const rows: PointerEvent[] = [];
  if (!recorded && dayTargets && Object.keys(dayTargets).length)
    throw Error("Missing day trace for geometry targets");
  const raw = recorded?.trace ?? task.trace;
  const indices = raw.flatMap((row, i) => (row.task === task.id ? [i] : []));
  if (
    recorded &&
    !isDeepStrictEqual(
      indices.map((i) => raw[i]),
      task.trace,
    )
  )
    throw Error("Task does not match its day trace");
  const { trace: measured } = measuredPointingTrace(raw, atlas, recorded);
  const hints = scrollLookahead(measured);
  const last = indices.at(-1) ?? -1;
  let local = 0;
  for (let i = carryStart(raw, indices[0] ?? 0); i <= last; i++) {
    const row = measured[i];
    if (!row) continue;
    rows.push(row);
    if (row.task === task.id) {
      const target = pointingTarget(row.event);
      if (target && row.event !== raw[i]?.event) traceTargets[local] = target;
      local++;
    } else {
      carry.push({
        before: local,
        task: row.task,
        screen: row.screen,
        event: row.event,
        ops: row.ops,
      });
      const hint = hints.get(i);
      if (hint) {
        carry.push({ before: local, ...hint });
        rows.push(hint);
      }
    }
  }
  const screens = new Set(rows.map((row) => row.screen));
  const targets = new Set(
    rows
      .map((row) => pointingTarget(row.event))
      .filter((id) => id !== undefined),
  );
  for (const target of [...targets])
    for (const alias of atlas.aliases?.[target] ?? []) targets.add(alias);
  const day = recorded?.day ?? Number(/^d(\d+)-/.exec(task.id)?.[1]);
  const sample = `workspace-d${String(day).padStart(2, "0")}`;
  return {
    ...geometry,
    traceTargets,
    ...(recorded && { day, carry }),
    aliases: Object.fromEntries(
      Object.entries(atlas.aliases ?? {}).filter(([id]) => targets.has(id)),
    ),
    states: atlas.states
      .filter(
        (state) =>
          screens.has(state.screen) &&
          (!state.sample?.startsWith("workspace-d") || state.sample === sample),
      )
      .map((state) => ({
        ...state,
        components: Object.fromEntries(
          Object.entries(state.components).filter(([id]) => targets.has(id)),
        ),
      })),
  };
}

const pending = new Map<string, Promise<string>>();
// One retained atlas bounds memory; simultaneous requests for the same atlas share parsing.
let atlasCache: { key: string; value: Promise<TargetAtlas> } | undefined;
const stamp = async (file: string) =>
  stat(file).then((s) => `${s.mtimeMs}-${s.ctimeMs}-${s.size}`);
export async function geometrySliceFile(
  runRoot: string,
  atlasName: string,
  taskFile: string,
  trajectoryDir = join(runRoot, "trajectories"),
): Promise<string> {
  if (
    !/^[a-f0-9]{64}(?:\.[a-f0-9]{64})?$/.test(atlasName) ||
    !/^(?:[\w.-]+\/)*[\w.-]+\.json$/.test(taskFile) ||
    taskFile.split("/").includes("..")
  )
    throw new Error("Invalid geometry slice path");
  const atlasPath = join(runRoot, "geometry", `${atlasName}.json`);
  const taskPath = join(trajectoryDir, taskFile);
  const read = async (file: string): Promise<unknown> =>
    JSON.parse(await readFile(file, "utf8"));
  const indexPath = join(trajectoryDir, "index.json");
  const indexStamp = await stamp(indexPath).catch((error) => {
    if (error.code !== "ENOENT") throw error;
    return undefined;
  });
  const index = indexStamp
    ? trajectoryIndexSchema.parse(await read(indexPath))
    : undefined;
  const entry =
    index &&
    index.tasks
      .flatMap((row) => [row, ...(row.baseline ? [row.baseline] : [])])
      .find((row) => row.file === taskFile);
  const dayPath =
    entry &&
    join(
      runRoot,
      "simulationSeed" in entry ? "baselines" : "days",
      `day-${String(entry.day).padStart(2, "0")}`,
      `${entry.persona}.json`,
    );
  const [atlasStamp, taskStamp, dayStamp] = await Promise.all([
    stamp(atlasPath),
    stamp(taskPath),
    dayPath ? stamp(dayPath) : undefined,
  ]);
  const key = createHash("sha256")
    .update(
      JSON.stringify([
        "task-geometry-v2",
        atlasPath,
        atlasStamp,
        taskPath,
        taskStamp,
        indexStamp,
        dayPath,
        dayStamp,
      ]),
    )
    .digest("hex");
  const destination = join(runRoot, ".cache", "geometry", `${key}.json`);
  const existing = pending.get(destination);
  if (existing) return existing;
  const work = (async () => {
    try {
      await stat(destination);
      return destination;
    } catch {
      /* Create the derived slice. */
    }
    const task = trajectorySchema.parse(await read(taskPath));
    const recorded = dayPath
      ? dayResultSchema.parse(await read(dayPath))
      : undefined;
    const [programHash, componentsHash] = atlasName.split(".");
    if (
      recorded &&
      (recorded.day !== entry?.day ||
        recorded.persona !== entry.persona ||
        recorded.programVersion !== entry.programVersion ||
        (recorded.geometry && recorded.geometry.programHash !== programHash))
    )
      throw Error("Day result does not match the trajectory program");
    const selection = recorded?.geometry
      ? { result: recorded }
      : entry && { day: entry.day };
    const atlasKey = JSON.stringify([
      atlasPath,
      atlasStamp,
      dayPath,
      dayStamp,
      selection && "result" in selection,
    ]);
    if (atlasCache?.key !== atlasKey) {
      const value = readStoredGeometry(
        atlasPath,
        readGeometryJson,
        selection,
      ).then((atlas) => replayGeometrySchema.parse(atlas));
      atlasCache = { key: atlasKey, value };
      void value.catch(() => {
        if (atlasCache?.value === value) atlasCache = undefined;
      });
    }
    const atlas = await atlasCache.value;
    if (
      atlas.programHash !== programHash ||
      (recorded?.geometry && recorded.geometry.appSha256 !== atlas.appSha256) ||
      (recorded?.geometry?.componentsSha256 &&
        recorded.geometry.componentsSha256 !== atlas.componentsSha256) ||
      (atlas.componentsSha256 &&
        componentsHash &&
        atlas.componentsSha256 !== componentsHash)
    )
      throw new Error("Geometry identity mismatch");
    const body = JSON.stringify(sliceGeometry(atlas, task, recorded));
    await mkdir(join(runRoot, ".cache", "geometry"), { recursive: true });
    const temporary = `${destination}.${randomUUID()}.tmp`;
    await writeFile(temporary, body);
    await rename(temporary, destination);
    return destination;
  })();
  pending.set(destination, work);
  try {
    return await work;
  } finally {
    pending.delete(destination);
  }
}
