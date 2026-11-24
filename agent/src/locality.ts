import { measuredPointingTrace } from '../../app/src/dashboard/trajectory-travel.js';
/** Target attribution mirrors pointerTravel's state machine; conservation is checked against it.
 * No timing model. Scroll-past means component reveal offsets traversed in a container.
 */
import { pointerTravel, pointerSteps, type GeometryAtlas, type PointerEvent } from '../../app/src/metrics/geometry.js';
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
export function attributePixels(
  trace: readonly PointerEvent[],
  atlas: GeometryAtlas,
  day?: number,
): Attribution[] {
  return pointerSteps(trace, atlas, day).map((cost, i) => {
    const event = trace[i];
    if (!event) throw Error('Attribution lost an event');
    return { ...cost, task: event.task, screen: event.screen,
      clicks: 0, keystrokes: 0, visits: 0 };
  });
}

const round = (x: number) => Math.round(x * 100) / 100;
const plus = (a: number | null, b: number | null) => a === null || b === null ? null : a + b;

/** Includes an explicit untargeted bucket; never drops an interaction. */
export function attributeDay(day: DayResult, atlas: GeometryAtlas & {traceTargets?:Record<string,string>}): Attribution[] {
  const {trace} = measuredPointingTrace(day.trace, atlas, day);
  const rows = attributePixels(trace, atlas, day.day);
  let previous = '';
  for (const [i, ev] of day.trace.entries()) {
    const row = rows[i];
    if (!row) throw new Error('Attribution lost an event');
    // Exact trace aliases choose the right geometry, but clinical component
    // IDs keep repeated fields grouped in the night workspace's breakdown.
    row.component = eventTarget(ev.event) ?? row.component;
    row.scrollPast = row.scrollPast.filter(id => !id.startsWith('lean-event-') && id !== row.component);
    row.visits = previous !== `${ev.task}/${ev.screen}` ? 1 : 0;
    previous = `${ev.task}/${ev.screen}`;
    row.clicks = 'scroll' in ev.event || ('enter' in ev.event && ev.ops.includes('scan')) ? 0 : 1;
    if ('search' in ev.event) row.keystrokes = [...ev.event.search.query].length;
    if ('enter' in ev.event && !ev.ops.includes('scan')) {
      const v = ev.event.enter.value;
      row.keystrokes = v === 'cleared' ? 1 : 'qty' in v ? String(v.qty.tenths / 10).length
        : 'code' in v ? Math.min([...v.code.c].length, 4) + 1
        : 'text' in v ? [...v.text.s].length : 'user' in v ? [...v.user.u].length : 0;
    }
  }
  const expected = pointerTravel(trace, atlas, day.day);
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
const rounded = (cost:PhysicalTotals):PhysicalTotals => ({...cost,
  scrollPx:cost.scrollPx===null?null:round(cost.scrollPx),
  mouseTravelPx:cost.mouseTravelPx===null?null:round(cost.mouseTravelPx),
});
const accumulate = (a: PhysicalTotals, b: PhysicalTotals) => {
  a.clicks += b.clicks; a.keystrokes += b.keystrokes; a.scrolls += b.scrolls; a.visits += b.visits;
  a.scrollPx = plus(a.scrollPx,b.scrollPx); a.mouseTravelPx = plus(a.mouseTravelPx,b.mouseTravelPx);
};

export function createLocalityDigest(topN = 15) {
  const trainDays:number[]=[];
  const screens = new Map<string, PhysicalTotals>();
  const components = new Map<string, PhysicalTotals & {screen: string; component: string; scrollPast: Map<string, number>}>();
  const sequences = new Map<string, Set<string>>();
  const totals = empty();
  const add=(result:DayResult,atlas:GeometryAtlas)=>{
    trainDays.push(result.day);
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
  const finish=()=>{
  const ranked = [...components.values()].sort((a,b) => b.clicks+b.scrolls-a.clicks-a.scrolls
    || (b.mouseTravelPx??0)-(a.mouseTravelPx??0) || b.keystrokes-a.keystrokes
    || `${a.screen}/${a.component}`.localeCompare(`${b.screen}/${b.component}`));
  const aggregate = (rows: PhysicalTotals[]) => {const out=empty(); rows.forEach(r=>accumulate(out,r)); return out;};
  return {
    trainDays, units: 'counts and CSS pixels at 1440×900; completed tasks; share = fraction of activations; scroll-past = component reveal offsets traversed within a container',
    totals:rounded(totals),
    screens:[...screens].sort(([a],[b])=>a.localeCompare(b)).map(([screen,cost])=>({screen,...rounded(cost),share:totals.clicks?cost.clicks/totals.clicks:0})),
    components:ranked.slice(0,topN).map(({scrollPast,...cost})=>({...cost,...rounded(cost),scrollPast:[...scrollPast].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([component,scrolls])=>({component,scrolls}))})),
    otherComponents:rounded(aggregate(ranked.slice(topN))),
    sequences:[...sequences].filter(([,tasks])=>tasks.size>1).sort((a,b)=>b[1].size-a[1].size||a[0].localeCompare(b[0])).slice(0,topN).map(([steps,tasks])=>({steps:JSON.parse(steps),tasks:tasks.size})),
  };
  };
  return {add,finish};
}
export function localityDigest(days:Iterable<{result:DayResult;atlas:GeometryAtlas}>,topN=15){
  const digest=createLocalityDigest(topN);
  for(const {result,atlas}of days)digest.add(result,atlas);
  return digest.finish();
}
export type LocalityDigest = ReturnType<typeof localityDigest>;
