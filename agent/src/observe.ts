import { expandProgram } from './composites.js';
/**
 * Step 1 (observe): summarize TRAIN days into the evidence the LLM sees.
 * Also: metric aggregation shared by pre-screen, validation, and the record.
 *
 * Integrity (BRIEF 8.4): `summarizeTrain` is only ever called with days <= d.
 * The night loop gets later days solely through the opaque `Holdout` in
 * night.ts, which never feeds a prompt.
 */
import type { DayResult, DaySchedule, Metrics, PctAboveFloor, Program, SignedMetrics, TaskMetrics, TrainSummary } from './schema.js';
import { componentById, fieldElement, isBackButton, markReviewedOf } from './program.js';

export function sumMetrics(tasks: readonly TaskMetrics[]): Metrics {
  const m: Metrics = { tasks: 0, completed: 0, clicks: 0, keystrokes: 0, scrolls: 0, popups: 0, overrides: 0, searches: 0, backtracks: 0, klmDeciSec: 0 };
  for (const t of tasks) {
    m.tasks++;
    if (t.completed) m.completed++;
    else continue;
    m.clicks += t.clicks;
    m.keystrokes += t.keystrokes;
    m.scrolls += t.scrolls;
    m.popups += t.popups;
    m.overrides += t.overrides;
    m.searches += t.searches;
    m.backtracks += t.backtracks;
    m.klmDeciSec += t.klmDeciSec;
  }
  return m;
}

export function addMetrics(a: Metrics, b: Metrics): Metrics {
  return {
    tasks: a.tasks + b.tasks, completed: a.completed + b.completed, clicks: a.clicks + b.clicks, keystrokes: a.keystrokes + b.keystrokes,
    scrolls: a.scrolls + b.scrolls, popups: a.popups + b.popups, overrides: a.overrides + b.overrides, searches: a.searches + b.searches,
    backtracks: a.backtracks + b.backtracks, klmDeciSec: a.klmDeciSec + b.klmDeciSec,
  };
}

/** before - after (positive = saving), optionally averaged over `days`. */
export function saving(before: Metrics, after: Metrics, days = 1): SignedMetrics {
  const d = Math.max(1, days);
  return {
    clicks: Math.round((before.clicks - after.clicks) / d),
    keystrokes: Math.round((before.keystrokes - after.keystrokes) / d),
    scrolls: Math.round((before.scrolls - after.scrolls) / d),
    klmDeciSec: Math.round((before.klmDeciSec - after.klmDeciSec) / d),
  };
}

export function pctAboveFloor(day: DayResult): PctAboveFloor | null {
  if (day.floor.length === 0) return null;
  const m = sumMetrics(day.tasks);
  const f = sumMetrics(day.floor);
  const pct = (x: number, fl: number) => (fl > 0 ? Math.round(((x - fl) / fl) * 1000) / 10 : 0);
  return { clicks: pct(m.clicks, f.clicks), keystrokes: pct(m.keystrokes, f.keystrokes), scrolls: pct(m.scrolls, f.scrolls), klmDeciSec: pct(m.klmDeciSec, f.klmDeciSec) };
}

const round1 = (x: number) => Math.round(x * 10) / 10;

export interface TrainDay {
  result: DayResult;
  schedule: DaySchedule;
}

function topN<T>(xs: T[], n: number, score: (x: T) => number): T[] {
  return [...xs].sort((a, b) => score(b) - score(a)).slice(0, n);
}

export function summarizeTrain(persona: string, current: Program, days: readonly TrainDay[], programs: ReadonlyMap<number, Program>): TrainSummary {
  const allTasks = days.flatMap((d) => d.result.tasks);
  const taskWorkflow = new Map(days.flatMap((d) => d.schedule.tasks.map((t) => [t.id, t.workflow] as const)));

  // Workflow averages.
  const byWf = new Map<string, TaskMetrics[]>();
  for (const t of allTasks) {
    const wf = taskWorkflow.get(t.task) ?? '?';
    byWf.set(wf, [...(byWf.get(wf) ?? []), t]);
  }
  const byWorkflow = [...byWf.entries()].map(([workflow, ts]) => {
    const m = sumMetrics(ts);
    const n = Math.max(1, ts.length);
    return { workflow, tasks: ts.length, avgClicks: round1(m.clicks / n), avgKeystrokes: round1(m.keystrokes / n), avgScrolls: round1(m.scrolls / n), avgKlmSec: round1(m.klmDeciSec / n / 10) };
  }).sort((a, b) => a.workflow.localeCompare(b.workflow));

  // Trace-derived statistics.
  const screenTime = new Map<string, { events: number; dt: number }>();
  const searches = new Map<string, { count: number; screens: Set<string> }>();
  const acks = new Map<string, number>();
  const backs = new Map<string, number>();
  const redundant = new Map<string, { comps: Set<string>; tasks: Set<string>; extra: number }>();
  const receipts = new Map<string, { created: number; reprompted: number }>();
  let totalDt = 0;

  for (const d of days) {
    const prog = programs.get(d.result.programVersion) ?? current;
    const comps = componentById(expandProgram(prog));
    let prevTask = '';
    let prevT = 0;
    const enteredPerTask = new Map<string, Map<string, Set<string>>>();
    const reviewedPerTask = new Map<string, Map<string, number>>();
    for (const ev of d.result.trace) {
      const dt = ev.task === prevTask ? Math.max(0, ev.t - prevT) : 0;
      prevTask = ev.task;
      prevT = ev.t;
      totalDt += dt;
      const st = screenTime.get(ev.screen) ?? { events: 0, dt: 0 };
      st.events++;
      st.dt += dt;
      screenTime.set(ev.screen, st);

      const e = ev.event;
      if ('search' in e) {
        const s = searches.get(e.search.query) ?? { count: 0, screens: new Set<string>() };
        s.count++;
        s.screens.add(ev.screen);
        searches.set(e.search.query, s);
      } else if ('ack' in e) {
        acks.set(e.ack.alert, (acks.get(e.ack.alert) ?? 0) + 1);
      } else if ('click' in e) {
        const comp = comps.get(e.click.comp)?.component;
        if (e.click.comp === 'back' || (comp && isBackButton(comp))) backs.set(ev.screen, (backs.get(ev.screen) ?? 0) + 1);
        const info = comp ? markReviewedOf(comp) : null;
        if (info) {
          const per = reviewedPerTask.get(ev.task) ?? new Map<string, number>();
          per.set(info, (per.get(info) ?? 0) + 1);
          reviewedPerTask.set(ev.task, per);
        }
      } else if ('enter' in e || 'confirm' in e) {
        const compId = 'enter' in e ? e.enter.comp : e.confirm.comp;
        const comp = comps.get(compId)?.component;
        const el = comp ? fieldElement(comp) : null;
        if (el) {
          const per = enteredPerTask.get(ev.task) ?? new Map<string, Set<string>>();
          const set = per.get(el) ?? new Set<string>();
          set.add(compId);
          per.set(el, set);
          enteredPerTask.set(ev.task, per);
        }
      }
    }
    for (const [task, per] of enteredPerTask) {
      for (const [el, compsSeen] of per) {
        if (compsSeen.size < 2) continue;
        const r = redundant.get(el) ?? { comps: new Set<string>(), tasks: new Set<string>(), extra: 0 };
        compsSeen.forEach((x) => r.comps.add(x));
        r.tasks.add(task);
        r.extra += compsSeen.size - 1;
        redundant.set(el, r);
      }
    }
    for (const per of reviewedPerTask.values()) {
      for (const [info, n] of per) {
        const r = receipts.get(info) ?? { created: 0, reprompted: 0 };
        r.created += n;
        receipts.set(info, r);
      }
    }
    // A receipt is "unused" when the same info is still re-shown/re-asked later (complaint log).
    for (const c of d.result.complaints) {
      for (const [info, r] of receipts) if (c.includes(info)) r.reprompted++;
    }
  }

  const complaintCounts = new Map<string, number>();
  for (const d of days) for (const c of d.result.complaints) complaintCounts.set(c, (complaintCounts.get(c) ?? 0) + 1);
  const orderCounts = new Map<string, number>();
  for (const d of days) for (const t of d.schedule.tasks) for (const o of t.choices.orders) orderCounts.set(o.drug, (orderCounts.get(o.drug) ?? 0) + 1);

  const latest = days[days.length - 1];
  return {
    persona,
    trainDays: days.map((d) => d.result.day),
    programVersion: current.version,
    totals: days.map((d) => sumMetrics(d.result.tasks)).reduce(addMetrics, sumMetrics([])),
    perDay: days.map((d) => ({ day: d.result.day, load: d.schedule.load, programVersion: d.result.programVersion, metrics: sumMetrics(d.result.tasks) })),
    pctAboveFloor: latest ? pctAboveFloor(latest.result) : null,
    byWorkflow,
    timeSinksByScreen: topN([...screenTime.entries()], 10, ([, v]) => v.dt).map(([screen, v]) => ({
      screen, events: v.events, klmSec: round1(v.dt / 10), share: totalDt > 0 ? Math.round((v.dt / totalDt) * 1000) / 1000 : 0,
    })),
    redundantPrompts: [...redundant.entries()].map(([element, r]) => ({ element, components: [...r.comps], tasksAffected: r.tasks.size, extraEntries: r.extra })),
    unusedReceipts: [...receipts.entries()].map(([info, r]) => ({ info, created: r.created, reprompted: r.reprompted })),
    buriedSearches: topN([...searches.entries()], 10, ([, v]) => v.count).map(([query, v]) => ({ query, count: v.count, screens: [...v.screens] })),
    alertOverrides: [...acks.entries()].map(([alert, popups]) => ({ alert, popups })),
    totalOverrides: allTasks.reduce((n, t) => n + t.overrides, 0),
    backtracks: [...backs.entries()].map(([screen, count]) => ({ screen, count })),
    complaints: topN([...complaintCounts.entries()], 15, ([, n]) => n).map(([text, count]) => ({ text, count })),
    orderMix: topN([...orderCounts.entries()], 15, ([, n]) => n).map(([drug, count]) => ({ drug, count })),
  };
}

/** Costs used in a saving are restricted to identical tasks completed in BOTH arms. */
export function pairedMetrics(before: DayResult, after: DayResult): { before: Metrics; after: Metrics } {
  const common = new Set(before.tasks.filter((t) => t.completed && after.tasks.some((a) => a.task === t.task && a.completed)).map((t) => t.task));
  const b = sumMetrics(before.tasks.filter((t) => common.has(t.task)));
  const a = sumMetrics(after.tasks.filter((t) => common.has(t.task)));
  return { before: { ...b, tasks: before.tasks.length, completed: before.tasks.filter((t) => t.completed).length }, after: { ...a, tasks: after.tasks.length, completed: after.tasks.filter((t) => t.completed).length } };
}
