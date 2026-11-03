/** Target attribution mirrors pointerTravel's state machine; conservation is checked against it.
 * No timing model. Scroll-past means component centers crossed by a container offset.
 */
import { pointerTravel, type GeometryAtlas, type Point, type PointerEvent } from '../../app/src/metrics/geometry.js';
import type { DayResult } from './schema.js';
export interface Attribution {
  task: string; screen: string; component: string; clicks: number; keystrokes: number; visits: number;
  mouseTravelPx: number | null; scrollPx: number | null; scrolls: number;
  missingTargets: string[]; scrollPast: string[];
}
export function eventTarget(event: unknown): string | null {
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
/** One pointer starts at viewport center per day trace; screen scroll positions persist until navigation. */
function attributePixels(
  trace: readonly PointerEvent[],
  atlas: GeometryAtlas,
  day?: number,
): Attribution[] {
  const rows: Attribution[] = [];
  let pointer: Point | null = { x: 720, y: 450 },
    active = "";
  let offsets: Record<string, Point> = {};
  const isScroll = (event: unknown) =>
    Boolean(event && typeof event === "object" && "scroll" in event);
  for (const [index, ev] of trace.entries()) {
    const cost: Attribution = { task: ev.task, screen: ev.screen, component: eventTarget(ev.event) ?? '(untargeted)',
      clicks: 0, keystrokes: 0, visits: 0, mouseTravelPx: 0, scrollPx: 0, scrolls: 0, missingTargets: [], scrollPast: [] };
    rows.push(cost);
    if (ev.screen !== active) {
      active = ev.screen;
      offsets = {};
    }
    const id =
        eventTarget(ev.event) ??
        (isScroll(ev.event)
          ? eventTarget(
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
    cost.component = candidates.find(c => state.components[c]) ?? id ?? '(untargeted)';
    const scroll = (next: Record<string, Point>) => {
      for (const [key, to] of Object.entries(next)) {
        const from = offsets[key] ?? { x: 0, y: 0 };
        const distance = Math.hypot(to.x - from.x, to.y - from.y);
        if (distance > 0) {
          // Centers crossed in this scroll container, excluding the destination.
          for (const [component, box] of Object.entries(state.components)) {
            if (component === cost.component || !box.chain.includes(key)) continue;
            const low = Math.min(from.y, to.y), high = Math.max(from.y, to.y);
            if (box.center.y >= low && box.center.y < high && !cost.scrollPast.includes(component)) cost.scrollPast.push(component);
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
    const delta = box.chain.reduce(
      (p, key) => ({
        x: p.x + (offsets[key]?.x ?? 0),
        y: p.y + (offsets[key]?.y ?? 0),
      }),
      { x: 0, y: 0 },
    );
    let destination = { x: box.center.x - delta.x, y: box.center.y - delta.y };
    if (
      destination.x < 0 ||
      destination.x > 1440 ||
      destination.y < 0 ||
      destination.y > 900
    ) {
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
  return rows;
}

const round = (x: number) => Math.round(x * 100) / 100;
const plus = (a: number | null, b: number | null) => a === null || b === null ? null : a + b;

/** Includes an explicit untargeted bucket; never drops an interaction. */
export function attributeDay(day: DayResult, atlas: GeometryAtlas): Attribution[] {
  const rows = attributePixels(day.trace, atlas, day.day);
  let previous = '';
  for (const [i, ev] of day.trace.entries()) {
    const row = rows[i];
    if (!row) throw new Error('Attribution lost an event');
    row.visits = previous !== `${ev.task}/${ev.screen}` ? 1 : 0;
    previous = `${ev.task}/${ev.screen}`;
    row.clicks = 'scroll' in ev.event || ('enter' in ev.event && ev.ops.includes('scan')) ? 0 : 1;
    if ('search' in ev.event) row.keystrokes = [...ev.event.search.query].length;
    if ('enter' in ev.event && !ev.ops.includes('scan')) {
      const v = ev.event.enter.value;
      row.keystrokes = 'qty' in v ? String(v.qty.tenths / 10).length
        : 'code' in v ? Math.min([...v.code.c].length, 4) + 1
        : 'text' in v ? [...v.text.s].length : 'user' in v ? [...v.user.u].length : 0;
    }
  }
  const expected = pointerTravel(day.trace, atlas, day.day);
  for (const task of day.tasks) {
    const own = rows.filter(row => row.task === task.task);
    for (const key of ['clicks', 'keystrokes', 'scrolls', 'mouseTravelPx', 'scrollPx'] as const) {
      const total = own.reduce<number | null>((sum, row) => plus(sum, row[key]), 0);
      const wanted = key === 'clicks' || key === 'keystrokes' ? task[key] : expected[task.task]?.[key] ?? null;
      if ((total === null ? null : round(total)) !== wanted) throw new Error(`Attribution does not conserve ${task.task}/${key}: ${total} vs ${wanted}`);
      // Round cumulative prefixes, conserving the exact task total in hundredths.
      if ((key === 'mouseTravelPx' || key === 'scrollPx') && total !== null && wanted !== null) {
        let cumulative = 0, previousCents = 0;
        for (const row of own) {
          cumulative += row[key] ?? 0;
          const cents = Math.round(cumulative * 100);
          row[key] = (cents - previousCents) / 100;
          previousCents = cents;
        }
      }
      if (key !== 'clicks' && key !== 'keystrokes' && task[key] !== wanted) throw new Error(`Train task/atlas mismatch: ${task.task}/${key}`);
    }
  }
  return rows;
}

export interface PhysicalTotals {
  clicks: number; keystrokes: number; scrolls: number; scrollPx: number | null; mouseTravelPx: number | null; visits: number;
}
const empty = (): PhysicalTotals => ({clicks:0,keystrokes:0,scrolls:0,scrollPx:0,mouseTravelPx:0,visits:0});
const accumulate = (a: PhysicalTotals, b: PhysicalTotals) => {
  a.clicks += b.clicks; a.keystrokes += b.keystrokes; a.scrolls += b.scrolls; a.visits += b.visits;
  a.scrollPx = plus(a.scrollPx,b.scrollPx); a.mouseTravelPx = plus(a.mouseTravelPx,b.mouseTravelPx);
};

export function localityDigest(days: readonly { result: DayResult; atlas: GeometryAtlas }[], topN = 15) {
  const screens = new Map<string, PhysicalTotals>();
  const components = new Map<string, PhysicalTotals & {screen: string; component: string; scrollPast: Map<string, number>}>();
  const sequences = new Map<string, Set<string>>();
  const totals = empty();
  for (const {result, atlas} of days) {
    const completed = new Set(result.tasks.filter(t => t.completed).map(t => t.task));
    const rows = attributeDay(result, atlas).filter(r => completed.has(r.task));
    for (const row of rows) {
      const screen = screens.get(row.screen) ?? empty(); accumulate(screen,row); screens.set(row.screen,screen);
      const key = `${row.screen}/${row.component}`;
      const component = components.get(key) ?? {...empty(),screen:row.screen,component:row.component,scrollPast:new Map<string,number>()};
      accumulate(component,row);
      for (const past of row.scrollPast) component.scrollPast.set(past,(component.scrollPast.get(past)??0)+1);
      components.set(key,component); accumulate(totals,row);
    }
    for (const task of completed) {
      const steps = result.trace.filter(e => e.task === task && !('scroll' in e.event)).map(e => `${e.screen}:${Object.keys(e.event)[0]}:${eventTarget(e.event)??'(untargeted)'}`);
      for (let length=2; length<=4; length++) for (let i=0; i+length<=steps.length; i++) {
        const key=JSON.stringify(steps.slice(i,i+length)); const tasks=sequences.get(key)??new Set<string>(); tasks.add(`${result.day}/${task}`); sequences.set(key,tasks);
      }
    }
  }
  const ranked = [...components.values()].sort((a,b) => b.clicks+b.keystrokes+b.scrolls-a.clicks-a.keystrokes-a.scrolls || `${a.screen}/${a.component}`.localeCompare(`${b.screen}/${b.component}`));
  const aggregate = (rows: PhysicalTotals[]) => {const out=empty(); rows.forEach(r=>accumulate(out,r)); return out;};
  return {
    trainDays: days.map(d=>d.result.day), units: 'counts and CSS pixels at 1440×900; completed tasks; share = fraction of activations; scroll-past = centers crossed by scroll offsets',
    totals,
    screens:[...screens].sort(([a],[b])=>a.localeCompare(b)).map(([screen,cost])=>({screen,...cost,share:totals.clicks?cost.clicks/totals.clicks:0})),
    components:ranked.slice(0,topN).map(({scrollPast,...cost})=>({...cost,scrollPast:[...scrollPast].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([component,scrolls])=>({component,scrolls}))})),
    otherComponents:aggregate(ranked.slice(topN)),
    sequences:[...sequences].filter(([,tasks])=>tasks.size>1).sort((a,b)=>b[1].size-a[1].size||a[0].localeCompare(b[0])).slice(0,topN).map(([steps,tasks])=>({steps:JSON.parse(steps),tasks:tasks.size})),
  };
}
export type LocalityDigest = ReturnType<typeof localityDigest>;
