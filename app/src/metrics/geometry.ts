/** Geometry only; no timing model or inferred coordinates. */
export interface Point {
  x: number;
  y: number;
}
export interface BoxGeometry {
  center: Point;
  reveal: Point;
  chain: string[];
  offsets: Record<string, Point>;
  bounds?: { x: number; y: number; w: number; h: number };
  clips?: Record<string, { x: number; y: number; w: number; h: number }>;
}
export interface ScreenGeometry {
  screen: string;
  state: string;
  sample?: string;
  viewport: { width: number; height: number };
  components: Record<string, BoxGeometry>;
  scrollers: Record<
    string,
    { maxX: number; maxY: number; width: number; height: number }
  >;
}
export interface GeometryAtlas {
  schemaVersion: 1;
  programHash: string;
  componentsSha256?: string;
  appSha256: string;
  viewport: { width: 1440; height: 900 };
  states: ScreenGeometry[];
  aliases?: Record<string, string[]>;
  source: "chromium" | "recorded-fixture";
}
export interface PointerEvent {
  task: string;
  screen: string;
  event: unknown;
  ops: readonly string[];
}
export interface PointerCost {
  mouseTravelPx: number | null;
  scrollPx: number | null;
  scrolls: number;
  missingTargets: string[];
}
function target(event: unknown): string | null {
  if (!event || typeof event !== "object") return null;
  for (const [kind, payload] of Object.entries(event)) {
    if (kind === "hotkey" || kind === "scroll") continue;
    if (payload && typeof payload === "object") {
      const id = Object.entries(payload).find(
        ([key, value]) =>
          ["comp", "alert"].includes(key) && typeof value === "string",
      )?.[1];
      if (typeof id === "string") return id;
    }
  }
  return null;
}
export interface PointerStep extends PointerCost {
  component: string;
  scrollPast: string[];
}
/** New specification for owner review: reveal only a clipped target, retaining
 * each container offset until navigation. Lean rectangles determine clipping;
 * no field-order fold or new time coefficient is used here. Historical atlases
 * without rectangles retain their recorded center/reveal approximation. */
export function pointerSteps(
  trace: readonly PointerEvent[],
  atlas: GeometryAtlas,
  day?: number,
): PointerStep[] {
  const result: PointerStep[] = [];
  let pointer: Point | null = { x: 720, y: 450 },
    active = "";
  let offsets: Record<string, Point> = {};
  const isScroll = (event: unknown) =>
    Boolean(event && typeof event === "object" && "scroll" in event);
  for (const [index, ev] of trace.entries()) {
    const cost: PointerStep = {
      component: target(ev.event) ?? "(untargeted)",
      scrollPast: [],
      mouseTravelPx: 0,
      scrollPx: 0,
      scrolls: 0,
      missingTargets: [],
    };
    result.push(cost);
    if (ev.screen !== active) {
      active = ev.screen;
      offsets = {};
    }
    const id =
        target(ev.event) ??
        (isScroll(ev.event)
          ? target(
              trace
                .slice(index + 1)
                .find((next) => next.task === ev.task && !isScroll(next.event))
                ?.event,
            )
          : null),
      candidates = id ? [id, ...(atlas.aliases?.[id] ?? [])] : [],
      states = atlas.states.filter(
        (s) =>
          s.screen === ev.screen &&
          (id?.startsWith("workspace.")
            ? s.sample ===
              `workspace-d${String(day ?? Number(/^d(\d+)-/.exec(ev.task)?.[1])).padStart(2, "0")}`
            : !s.sample?.startsWith("workspace-d")),
      );
    const ordered = [...states].sort(
      (a, b) =>
        Number(a.state.includes("-popup-")) * 2 +
        Number(a.state.includes("-expanded")) -
        Number(b.state.includes("-popup-")) * 2 -
        Number(b.state.includes("-expanded")),
    );
    const state =
      ordered.find((s) => id && s.components[id]) ??
      ordered.find((s) => candidates.some((c) => s.components[c])) ??
      ordered[0];
    if (!state) {
      cost.missingTargets.push(`${ev.screen}/${id ?? "scroll"}`);
      cost.mouseTravelPx = null;
      cost.scrollPx = null;
      pointer = null;
      continue;
    }
    cost.component = candidates.find(c => state.components[c]) ?? id ?? "(untargeted)";
    const scroll = (next: Record<string, Point>) => {
      for (const [key, to] of Object.entries(next)) {
        const from = offsets[key] ?? { x: 0, y: 0 };
        const distance = Math.hypot(to.x - from.x, to.y - from.y);
        if (distance > 0) {
          for (const [component, box] of Object.entries(state.components)) {
            if (component === cost.component || !box.chain.includes(key)) continue;
            const reveal = box.offsets[key];
            if (reveal && (["x", "y"] as const).some(axis =>
              reveal[axis] >= Math.min(from[axis], to[axis]) &&
              reveal[axis] < Math.max(from[axis], to[axis])) &&
              !cost.scrollPast.includes(component)) cost.scrollPast.push(component);
          }
          cost.scrollPx =
            cost.scrollPx === null ? null : cost.scrollPx + distance;
          cost.scrolls++;
        }
        offsets[key] = to;
      }
    };
    if (ev.event && typeof ev.event === "object" && "scroll" in ev.event) {
      const entry = Object.entries(state.scrollers).find(([, s]) => s.maxY > 0);
      if (entry) {
        const [key, s] = entry,
          old = offsets[key] ?? { x: 0, y: 0 };
        scroll({ [key]: { x: old.x, y: Math.min(s.maxY, old.y + s.height) } });
      }
      continue;
    }
    if (
      !id ||
      (!ev.ops.some((op) => ["point", "click"].includes(op)) &&
        !(
          ev.event &&
          typeof ev.event === "object" &&
          ("enter" in ev.event || "confirm" in ev.event)
        ))
    )
      continue;
    const box = candidates.map((c) => state.components[c]).find(Boolean);
    if (!box) {
      cost.missingTargets.push(`${ev.screen}/${id}`);
      cost.mouseTravelPx = null;
      cost.scrollPx = null;
      pointer = null;
      continue;
    }
    // clips are ordered from the innermost container to the outermost, as
    // in the painter. Outer translations cancel in a container-local test.
    if (box.bounds && box.clips) {
      let inner: Point = { x: 0, y: 0 };
      for (const key of box.chain) {
        const clip = box.clips[key], region = state.scrollers[key];
        const old = offsets[key] ?? { x: 0, y: 0 };
        if (clip && region) {
          const next = { ...old };
          for (const [axis, size, max] of [["x", "w", "maxX"], ["y", "h", "maxY"]] as const) {
            const lo = box.bounds[axis] - inner[axis] - clip[axis];
            const hi = lo + box.bounds[size] - clip[size];
            // Nearest edge reveals the full control when it fits. Oversized
            // info panels reveal the component's center, as before.
            const desired = box.bounds[size] <= clip[size]
              ? Math.max(hi, Math.min(old[axis], lo))
              : box.center[axis] - inner[axis] - clip[axis] - clip[size] / 2;
            next[axis] = Math.max(0, Math.min(region[max], desired));
          }
          scroll({ [key]: next });
        }
        inner = { x: inner.x + (offsets[key]?.x ?? 0), y: inner.y + (offsets[key]?.y ?? 0) };
      }
    }
    const delta = box.chain.reduce(
      (p, key) => ({ x: p.x + (offsets[key]?.x ?? 0), y: p.y + (offsets[key]?.y ?? 0) }),
      { x: 0, y: 0 },
    );
    let destination = { x: box.center.x - delta.x, y: box.center.y - delta.y };
    if (!box.bounds && (destination.x < 0 || destination.x > state.viewport.width ||
        destination.y < 0 || destination.y > state.viewport.height)) {
      scroll(box.offsets);
      destination = box.reveal;
    }
    if (!pointer) cost.mouseTravelPx = null;
    else if (cost.mouseTravelPx !== null)
      cost.mouseTravelPx += Math.hypot(
        destination.x - pointer.x,
        destination.y - pointer.y,
      );
    pointer = destination;
  }
  return result;
}
/** Aggregate the same event measurements used by attribution and scroll planning. */
export function pointerTravel(
  trace: readonly PointerEvent[], atlas: GeometryAtlas, day?: number,
): Record<string, PointerCost> {
  const result: Record<string, PointerCost> = {};
  for (const [i, step] of pointerSteps(trace, atlas, day).entries()) {
    const event = trace[i];
    if (!event) throw Error('Pointer measurement lost an event');
    const task = event.task;
    const cost = result[task] ??= { mouseTravelPx: 0, scrollPx: 0, scrolls: 0, missingTargets: [] };
    for (const key of ["mouseTravelPx", "scrollPx"] as const)
      cost[key] = cost[key] === null || step[key] === null ? null : cost[key] + step[key];
    cost.scrolls += step.scrolls;
    cost.missingTargets.push(...step.missingTargets);
  }
  for (const cost of Object.values(result))
    for (const key of ["mouseTravelPx", "scrollPx"] as const)
      if (cost[key] !== null) cost[key] = Math.round(cost[key] * 100) / 100;
  return result;
}
