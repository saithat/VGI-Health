import { useEffect, useMemo, useRef } from "react";
import type { Event, StepOutput } from "../../../lean/generated/ehr-types";
import { applyPatch } from "../../../agent/src/jsonpatch";
import {
  programSchema,
  type Program,
  type JsonPatchOp,
} from "../../../agent/src/schema";
import type { Interp } from "../core/interp";
import { mockReplayInterp } from "../mock/replay";
import { paint } from "../ehr/painter";
import type { Html } from "../ehr/html";
import { programAt, type RunData, type Replay } from "./data";

export type InterpFactory = (program: Program) => Interp;

export function renderReplay(
  interp: Interp,
  context: Replay["contexts"][number],
  program: Program,
  events: Event[],
): Html {
  const args = [
    JSON.stringify(context.spec),
    JSON.stringify(program),
    JSON.stringify(context.bundle),
    JSON.stringify(context.user),
  ] as const;
  let state = interp.init(...args);
  for (const event of events) {
    const response: StepOutput = JSON.parse(
      interp.step(...args, state, JSON.stringify(event)),
    );
    state = JSON.stringify(response.state);
  }
  return JSON.parse(interp.render(...args, state));
}

export function ReplayScreen({
  run,
  persona,
  version,
  specVersion,
  events = [],
  patch = [],
  highlight = [],
  factory,
}: {
  run: RunData;
  persona: string;
  version: number;
  specVersion?: string;
  events?: Event[];
  patch?: JsonPatchOp[];
  highlight?: string[];
  factory?: InterpFactory | undefined;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const result = useMemo(() => {
    try {
      if (!run.replay)
        throw new Error(
          "This run needs replay.json with spec, bundle, user and same-task traces. See app/README.md.",
        );
      const contexts = run.replay.contexts.filter((c) => c.persona === persona);
      const context =
        contexts.find(
          (c) =>
            c.version === version &&
            (!specVersion || c.specVersion === specVersion),
        ) ??
        contexts.find((c) => specVersion && c.specVersion === specVersion) ??
        contexts.find(
          (c) => c.version === undefined && c.specVersion === undefined,
        );
      if (!context) throw new Error(`No replay context for ${persona}`);
      const program = programSchema.parse(
        applyPatch(programAt(run, persona, version), patch).doc,
      );
      const interp = factory
        ? factory(program)
        : run.replay.mode === "mock" && run.manifest.ehr.mode === "fake"
          ? mockReplayInterp(program)
          : null;
      if (!interp)
        throw new Error(
          "WASM Interp is required for this real run. Inject an InterpFactory into Dashboard.",
        );
      return {
        page: renderReplay(interp, context, program, events),
        error: null,
      };
    } catch (error) {
      return {
        page: null,
        error: error instanceof Error ? error.message : "Replay failed",
      };
    }
  }, [run, persona, version, specVersion, events, patch, factory]);
  useEffect(() => {
    const nodes = ref.current?.querySelectorAll<HTMLElement>("[data-comp-id]");
    nodes?.forEach((node) => {
      node.dataset.replayHighlight = String(
        highlight.includes(node.dataset.compId ?? ""),
      );
    });
  }, [result, highlight]);
  return (
    <div className="replay-screen" ref={ref}>
      {result.error ? (
        <p role="alert">{result.error}</p>
      ) : result.page ? (
        paint(result.page, () => {})
      ) : null}
    </div>
  );
}

type Op = Replay["tasks"][number]["before"]["trace"][number]["ops"][number];
export function traceCounters(
  trace: { klmDeciSec: number; ops: Op[] }[],
  step: number,
) {
  const prefix = trace.slice(0, step);
  const count = (op: Op) =>
    prefix.reduce(
      (sum, e) => sum + e.ops.filter((value) => value === op).length,
      0,
    );
  return {
    clicks: count("click"),
    keystrokes: count("key"),
    scrolls: count("scroll"),
    seconds: (prefix.at(-1)?.klmDeciSec ?? 0) / 10,
  };
}
