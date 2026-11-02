import { useMemo } from "react";
import type { Program } from "../../../agent/src/schema";
import type { PresentationBundle } from "../ehr/ui/presentation-types";
import type { UiScreen } from "../ehr/ui/types";
import type { GeometryAtlas } from "../metrics/geometry";
import { pointerTravel } from "../metrics/geometry";
import type { InterpFactory } from "./replay";
import type { TrajectoryEntry } from "./trajectories-data";
import { replayTrajectory, type Trajectory } from "./trajectory-replay";
import { TrajectoryFrame } from "./TrajectoryFrame";
export type LoadedTrajectory = {
  presentations: PresentationBundle | null;
  geometry: GeometryAtlas | null;
  task: Trajectory;
  program: Program;
  spec: unknown;
  display: unknown;
};
export function TrajectoryPlayer({
  loaded,
  count,
  factory,
  label,
  speed,
  metrics,
}: {
  loaded: LoadedTrajectory;
  count: number;
  factory: InterpFactory;
  label: string;
  speed: number;
  metrics: TrajectoryEntry["metrics"];
}) {
  const result = useMemo(() => {
    const interp = factory(loaded.program);
    const result = replayTrajectory(
      interp,
      loaded.task,
      loaded.spec,
      loaded.program,
      count,
      loaded.display,
    );
    if (!interp.renderUi) throw new Error("Semantic WASM renderer is required");
    const screen: UiScreen = JSON.parse(
      interp.renderUi(...result.args, JSON.stringify(result.state)),
    );
    return { ...result, screen };
  }, [loaded, count, factory]);
  const next = loaded.task.trace[count];
  const prefix = loaded.task.trace.slice(0, count);
  const ops = prefix.flatMap((e) => e.ops);
  const travel = loaded.geometry
    ? count === 0
      ? 0
      : pointerTravel(prefix, loaded.geometry)[loaded.task.id]?.mouseTravelPx
    : count === loaded.task.trace.length
      ? metrics.mouseTravelPx
      : null;
  return (
    <article className="trajectory-side" aria-label={label}>
      <h3>
        {label} · {count}/{loaded.task.trace.length} events
      </h3>
      <p className="trajectory-counters" aria-live="polite">
        {ops.filter((o) => o === "click").length} clicks ·{" "}
        {ops.filter((o) => o === "key").length} keys ·{" "}
        {ops.filter((o) => o === "scroll").length} scrolls · {prefix.length}{" "}
        events ·{" "}
        {typeof travel === "number"
          ? `${travel} px mouse travel`
          : "mouse travel —"}
      </p>
      <p className="trajectory-event">
        {next ? `Next: ${JSON.stringify(next.event)}` : "Trajectory finished"}
      </p>
      {Boolean(result.firstMismatch || loaded.task.nativeMismatch) && (
        <p role="alert">
          Replay divergence:{" "}
          {JSON.stringify(result.firstMismatch ?? loaded.task.nativeMismatch)}
        </p>
      )}
      <TrajectoryFrame
        presentations={loaded.presentations}
        title={`${label} EHR`}
        screen={result.screen}
        trace={loaded.task.trace}
        count={count}
        speed={speed}
      />
    </article>
  );
}
