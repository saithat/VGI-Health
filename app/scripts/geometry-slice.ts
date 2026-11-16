import {readGeometryJson} from '../../agent/src/geometry-json.mjs';
import {readStoredGeometry} from '../../agent/src/geometry-format.mjs';
import {dayResultSchema} from '../src/dashboard/agent-evidence';
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  replayGeometrySchema,
  trajectorySchema,
  trajectoryIndexSchema,
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
    const read=async (file:string):Promise<unknown>=>JSON.parse(await readFile(file,'utf8'));
    const task=trajectorySchema.parse(await read(taskPath));
    const pointer=await read(atlasPath);
    let selection:import('../../agent/src/geometry-format.mjs').GeometrySelection|undefined;
    let selectionKey='legacy';
    if(pointer&&typeof pointer==='object'&&'schemaVersion' in pointer&&pointer.schemaVersion===2){
      const index=trajectoryIndexSchema.parse(await read(join(runRoot,'trajectories/index.json')));
      const entry=index.tasks.flatMap(row=>[row,...(row.baseline?[row.baseline]:[])]).find(row=>row.file===taskFile);
      if(!entry)throw Error('Missing trajectory geometry context');
      selectionKey=`${entry.day}:${entry.persona}:${entry.programVersion}`;
      const recorded=dayResultSchema.parse(await read(join(runRoot,'days',`day-${String(entry.day).padStart(2,'0')}`,`${entry.persona}.json`)));
      selection=recorded.geometry?.programHash===atlasName.split('.')[0]?{result:recorded}:{day:entry.day};
    }
    const atlasKey = `${atlasPath}:${atlasStamp}:${selectionKey}`;
    if (atlasCache?.key !== atlasKey) {
      const value = readStoredGeometry(atlasPath,readGeometryJson,selection).then(atlas=>replayGeometrySchema.parse(atlas));
      atlasCache = { key: atlasKey, value };
      void value.catch(() => {
        if (atlasCache?.value === value) atlasCache = undefined;
      });
    }
    const atlas=await atlasCache.value;
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
