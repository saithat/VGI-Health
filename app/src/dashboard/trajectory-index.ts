import { trajectoryReleaseLabels } from "../../../scripts/historical-releases.mjs";
import { readRunJson, runArtifactPath } from "./data";
import {
  trajectoryIndexSchema,
  type TrajectoryIndex,
} from "./trajectories-data";
const validated = new WeakMap<object, TrajectoryIndex>();
/** Share validation as well as fetching; refreshed responses get validated again. */
export async function loadTrajectoryIndex(runId: string, prefixKey?: string) {
  const raw = await readRunJson(
    runArtifactPath(runId, "trajectories/index.json", prefixKey),
  );
  if (typeof raw === "object" && raw !== null) {
    const cached = validated.get(raw);
    if (cached) {
      if (cached.runId !== runId)
        throw new Error("Trajectory index belongs to another run");
      return cached;
    }
  }
  const index = trajectoryReleaseLabels(trajectoryIndexSchema.parse(raw));
  if (index.runId !== runId)
    throw new Error("Trajectory index belongs to another run");
  if (typeof raw === "object" && raw !== null) validated.set(raw, index);
  return index;
}
