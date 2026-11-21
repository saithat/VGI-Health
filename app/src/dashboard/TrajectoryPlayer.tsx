import {replayScreen,createReferencePainter,referenceLimit} from "../lean-ui/reference";
import { pointingTrace } from "./bounded-pointing";
import { useMemo } from "react";
import type { Program } from "../../../agent/src/schema";
import type { LayoutDesign } from "../../../agent/src/layout-design";
import type { UiScreen } from "../core/types";
import type { GeometryAtlas } from "../metrics/geometry";
import { pointerTravel } from "../metrics/geometry";
import type { InterpFactory } from "./replay";
import type { TrajectoryEntry } from "./trajectories-data";
import { replayTrajectory, type Trajectory } from "./trajectory-replay";
import { TrajectoryFrame } from "./TrajectoryFrame";
export type LoadedTrajectory = {
  design: LayoutDesign | null;
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
    if (!interp.renderUi || !interp.layout) throw new Error("Semantic WASM renderer is required");
    const screen: UiScreen = replayScreen(interp.layout, JSON.parse(
      interp.renderUi(...result.args, JSON.stringify(result.state)),
    ));
    const persona = loaded.task.context.programPath.split("/").find(part => /^P[1-5]$/.test(part)) ?? loaded.task.context.user.id;
    const {output} = createReferencePainter(interp.layout, loaded.design ?? [])(screen,{w:1440*64,h:900*64},referenceLimit(loaded.program.specVersion,persona,screen.screen ?? ""));
    if (!output.accepted) throw Error("Lean refused trajectory layout");
    return { ...result, screen, output };
  }, [loaded, count, factory]);
  const next = loaded.task.trace[count];
  const prefix = loaded.task.trace.slice(0, count);
  const ops = prefix.flatMap((e) => e.ops);
  const travel = loaded.geometry
    ? count === 0
      ? 0
      : pointerTravel(pointingTrace(prefix, loaded.geometry), loaded.geometry)[loaded.task.id]?.mouseTravelPx
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
        output={result.output}
        title={`${label} EHR`}
        screen={result.screen}
        trace={loaded.task.trace}
        count={count}
        speed={speed}
      />
    </article>
  );
}
