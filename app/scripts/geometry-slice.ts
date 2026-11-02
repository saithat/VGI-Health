import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  replayGeometrySchema,
  trajectorySchema,
} from "../src/dashboard/trajectories-data";
import type { GeometryAtlas } from "../src/metrics/geometry";
import type { Trajectory } from "../src/dashboard/trajectory-replay";

/** Preserve state order/selection and scrollers; remove only boxes never used by this trace.
 * Scroll lookahead can use any later target, so retain all task targets and their aliases.
 */
export function sliceGeometry(
  atlas: GeometryAtlas,
  task: Trajectory,
): GeometryAtlas {
  const screens = new Set(task.trace.map((event) => event.screen));
  const targets = new Set<string>();
  for (const { event } of task.trace)
    for (const payload of Object.values(event))
      if (payload && typeof payload === "object") {
        if ("comp" in payload) targets.add(String(payload.comp));
        if ("alert" in payload) targets.add(String(payload.alert));
      }
  for (const target of [...targets])
    for (const alias of atlas.aliases?.[target] ?? []) targets.add(alias);
  const day = `workspace-d${/^d(\d+)-/.exec(task.id)?.[1]}`;
  return {
    ...atlas,
    aliases: Object.fromEntries(
      Object.entries(atlas.aliases ?? {}).filter(([id]) => targets.has(id)),
    ),
    states: atlas.states
      .filter(
        (state) =>
          screens.has(state.screen) &&
          (!state.sample?.startsWith("workspace-d") || state.sample === day),
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
let atlasCache: { key: string; value: Promise<GeometryAtlas> } | undefined;
const stamp = async (file: string) =>
  stat(file).then((s) => `${s.mtimeMs}-${s.ctimeMs}-${s.size}`);
export async function geometrySliceFile(
  runRoot: string,
  atlasName: string,
  taskFile: string,
): Promise<string> {
  if (
    !/^[a-f0-9]{64}(?:\.[a-f0-9]{64})?$/.test(atlasName) ||
    !/^(?:[\w.-]+\/)*[\w.-]+\.json$/.test(taskFile) ||
    taskFile.split("/").includes("..")
  )
    throw new Error("Invalid geometry slice path");
  const atlasPath = join(runRoot, "geometry", `${atlasName}.json`);
  const taskPath = join(runRoot, "trajectories", taskFile);
  const [atlasStamp, taskStamp] = await Promise.all([
    stamp(atlasPath),
    stamp(taskPath),
  ]);
  const key = createHash("sha256")
    .update(
      JSON.stringify(["slice-v1", atlasPath, atlasStamp, taskFile, taskStamp]),
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
    const atlasKey = `${atlasPath}:${atlasStamp}`;
    if (atlasCache?.key !== atlasKey) {
      const value = readFile(atlasPath, "utf8").then((raw) =>
        replayGeometrySchema.parse(JSON.parse(raw)),
      );
      atlasCache = { key: atlasKey, value };
      void value.catch(() => {
        if (atlasCache?.value === value) atlasCache = undefined;
      });
    }
    const [atlas, task] = await Promise.all([
      atlasCache.value,
      readFile(taskPath, "utf8").then((raw) =>
        trajectorySchema.parse(JSON.parse(raw)),
      ),
    ]);
    const [programHash, componentsHash] = atlasName.split(".");
    if (
      atlas.programHash !== programHash ||
      (atlas.componentsSha256 &&
        componentsHash &&
        atlas.componentsSha256 !== componentsHash)
    )
      throw new Error("Geometry identity mismatch");
    const body = JSON.stringify(sliceGeometry(atlas, task));
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
