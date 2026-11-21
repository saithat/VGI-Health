import type { GeometryAtlas, PointerEvent } from "../metrics/geometry.js";
import { pointerTravel } from "../metrics/geometry.js";
import { pointingTrace } from "./bounded-pointing.js";
import type { Trajectory } from "./trajectory-replay.js";
import type { DayResult } from "../../../agent/src/schema.js";

type TraceTargets = Record<string, string>;
export type TargetAtlas = GeometryAtlas & { traceTargets?: TraceTargets };
export type ReplayGeometry = TargetAtlas & {
  day?: number;
  // Events from other tasks that establish the pointer and scroll offsets.
  carry?: (PointerEvent & { before: number })[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function rewriteTraceTargets(
  raw: readonly PointerEvent[],
  projected: PointerEvent[],
  targets?: TraceTargets,
): PointerEvent[] {
  if (!targets) return projected;
  return projected.map((row, i) => {
    const target = targets[i];
    // A projected bounded miss already identifies its measured virtual target.
    if (!target || row.event !== raw[i]?.event || !isRecord(row.event))
      return row;
    const event = Object.fromEntries(
      Object.entries(row.event).map(([kind, payload]) => {
        if (!isRecord(payload)) return [kind, payload];
        return [
          kind,
          {
            ...payload,
            ...("comp" in payload && { comp: target }),
            ...("alert" in payload && { alert: target }),
          },
        ];
      }),
    );
    return { ...row, event };
  });
}

export function measuredPointingTrace(
  raw: Trajectory["trace"],
  atlas: TargetAtlas,
  day?: DayResult,
) {
  const projected = pointingTrace(raw, atlas, day);
  return {
    trace: rewriteTraceTargets(raw, projected, atlas.traceTargets),
    bounded: projected.some((row, i) => row.event !== raw[i]?.event),
  };
}

export function pointingTarget(event: unknown) {
  if (!isRecord(event)) return undefined;
  for (const [kind, payload] of Object.entries(event)) {
    if (kind === "hotkey" || kind === "scroll" || !isRecord(payload)) continue;
    for (const [key, value] of Object.entries(payload))
      if ((key === "comp" || key === "alert") && typeof value === "string")
        return value;
  }
  return undefined;
}

// pointerTravel selects the scroll state from the next non-scroll event of that
// task. A target with no operations supplies that lookup without charging movement.
export function scrollLookahead(trace: readonly PointerEvent[]) {
  const next = new Map<string, string | undefined>();
  const hints = new Map<number, PointerEvent>();
  for (let i = trace.length - 1; i >= 0; i--) {
    const row = trace[i];
    if (!row) continue;
    if (isRecord(row.event) && "scroll" in row.event) {
      const comp = next.get(row.task);
      if (comp)
        hints.set(i, {
          task: row.task,
          screen: row.screen,
          ops: [],
          event: { click: { comp } },
        });
    } else next.set(row.task, pointingTarget(row.event));
  }
  return hints;
}

export function prepareTravel(task: Trajectory, atlas: ReplayGeometry) {
  const { trace: measured } = measuredPointingTrace(task.trace, atlas);
  const hints = scrollLookahead(measured);
  const rows: PointerEvent[] = [];
  const ends = [0];
  const carry = atlas.carry?.values();
  let prior = carry?.next().value;
  for (const [index, event] of measured.entries()) {
    while (prior?.before === index) {
      rows.push(prior);
      prior = carry?.next().value;
    }
    rows.push(event);
    ends.push(rows.length);
  }
  const day = atlas.day ?? Number(/^d(\d+)-/.exec(task.id)?.[1]);
  return (count: number) => {
    if (!count) return { mouseTravelPx: 0, scrollPx: 0 };
    const prefix = rows.slice(0, ends[count]);
    const hint = hints.get(count - 1);
    if (hint) prefix.push(hint);
    return pointerTravel(prefix, atlas, day)[task.id];
  };
}

export function travelLabel(
  measured: number | null | undefined,
  finished: boolean,
  recorded?: number | null,
) {
  if (typeof measured === "number") return `${measured} px mouse travel`;
  if (finished && typeof recorded === "number")
    return `${recorded} px mouse travel (recorded)`;
  return "mouse travel —";
}
