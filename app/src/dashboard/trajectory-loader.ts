import { programSchema } from "../../../agent/src/schema";
import { readArtifact, recordingManifest, verifyRecordedBuild } from "../browser/data";
import { contentHash } from "../core/buildBinding";
import type { InterpFactory } from "./replay";
import { readRunJson, runArtifactPath } from "./data";
import {
  geometrySliceSchema,
  trajectorySchema,
  trajectoryBundleSchema,
  type TrajectoryEntry,
} from "./trajectories-data";
import type { LoadedTrajectory } from "./TrajectoryPlayer";
export async function loadTrajectory(
  runId: string,
  file: string,
  metrics: TrajectoryEntry["metrics"],
  factory: InterpFactory,
  prefixKey?: string,
): Promise<LoadedTrajectory> {
  await recordingManifest(runId);
  const task = trajectorySchema.parse(
    await readRunJson(
      runArtifactPath(runId, `trajectories/${file}`, prefixKey),
    ),
  );
  const [program, spec, fixture] = await Promise.all([
    readArtifact(`/${task.context.programPath}`),
    readArtifact(`/${task.context.specPath}`),
    readArtifact(`/${task.context.fixtureFile}`),
  ]);
  const design = await verifyRecordedBuild(
    task.context.programPath,
    program,
  );
  let geometry: LoadedTrajectory["geometry"] = null;
  if (typeof metrics.mouseTravelPx === "number") {
    const hash = await contentHash(program);
    const componentsHash = await contentHash(design.length ? {components: [], layouts: design} : []);
    // Geometry is optional evidence. Never substitute made-up pixel totals.
    for (const suffix of [`.${componentsHash}`, ""]) {
      try {
        const atlas = geometrySliceSchema.parse(
          await readRunJson(
            runArtifactPath(runId, `geometry/${hash}${suffix}/slices/${file}`, prefixKey),
          ),
        );
        if (
          atlas.programHash === hash &&
          (!atlas.componentsSha256 || atlas.componentsSha256 === componentsHash)
        ) {
          geometry = atlas;
          break;
        }
      } catch {
        /* Historical run may have totals but no geometry atlas. */
      }
    }
  }
  const bundle = trajectoryBundleSchema.parse(fixture);
  const parsedProgram = programSchema.parse(program);
  let resources: { resourceType: string; id?: string | undefined }[] =
    bundle.entry.map((e) => ({
      ...e.resource,
      id: e.resource.id ?? e.fullUrl?.replace(/^urn:uuid:/, ""),
    }));
  for (const r of task.context.resources)
    resources = [
      ...resources.filter(
        (x) => !r.id || x.resourceType !== r.resourceType || x.id !== r.id,
      ),
      r,
    ];
  const interp = factory(parsedProgram);
  const projection = JSON.parse(
    interp.facts(
      JSON.stringify({
        bundle: {
          resourceType: "Bundle",
          entry: resources.map((resource) => ({ resource })),
        },
        context: {
          today: task.context.today,
          now: task.context.startMin,
          receipts: [],
          record: [],
        },
      }),
    ),
  );
  if (projection.error) throw new Error(String(projection.error));
  return {
    task,
    geometry,
    program: parsedProgram,
    design,
    spec,
    display: projection.display,
  };
}
