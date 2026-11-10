import { WORLD_CLOCK_PARAMETERS } from "./world-clock";
/** Exogenous timing projection. Only source-world data enters this module;
 * UI arms, user policies and their RNGs are intentionally absent. */
import { SHIFTS, dateOf } from "../calendar";
import type { DaySchedule, Task, Json } from "../schema";
import type { WorldState } from "../state";
import type { Arrival, Shift } from "./schema";
const MINUTE = 60_000;

/** Coverage uses calendar time through nights/weekends. A 15-minute overlap
 * is provisional; there is still one serial server per persona. */
export function coverage(persona: DaySchedule["persona"], date: string, horizonDays = 6): Shift[] {
  const length = SHIFTS[persona].lengthMin;
  if (persona === "P2" || persona === "P3") {
    // ED retains its historical ten-hour tour; ward tours are twelve hours.
    return Array.from({length: Math.max(16, Math.ceil(horizonDays * 1440 / (length - 15)) + 1)}, (_, i) => ({id: `coverage-${i}`,
      startMs: i * (length - 15) * MINUTE, endMs: (i * (length - 15) + length) * MINUTE}));
  }
  const origin = Date.parse(`${date}T00:00:00Z`);
  return Array.from({length: Math.max(9, horizonDays + 3)}, (_, i) => i).filter(i => {
    const weekday = new Date(origin + i * 86_400_000).getUTCDay();
    return weekday !== 0 && weekday !== 6;
  }).map(i => ({id: `clinic-${i}`, startMs: i * 1440 * MINUTE,
    endMs: (i * 1440 + length) * MINUTE}));
}

export function taskArrival(task: Task, state: WorldState): Arrival {
  const shift = SHIFTS[task.persona];
  const ed = state.today.ed.arrivals.find(a => a.taskId === task.id);
  const inbox = state.inboxBacklog.find(a => a.patientId === task.patientId &&
    ((task.workflow === "W2" && a.kind === "result") || (task.workflow === "W7" && a.kind === "refill")));
  let arrivalMin = ed ? Math.max(0, ed.arrivalClock - shift.startClock)
    : inbox && inbox.arrivedDay < state.day ? 0 : task.startMin;
  const doses = task.choices.administer.flatMap(o => o.administration ? [o.administration] : []);
  const observations = task.todayResources.filter((r): r is {[key:string]:Json} =>
    typeof r === "object" && r !== null && !Array.isArray(r) && r.resourceType === "Observation");
  const interpretation = JSON.stringify(observations.map(r=>r.interpretation));
  const critical = /"(HH|LL|AA)"/.test(interpretation);
  const abnormal = /"(H|L|A|HH|LL|AA)"/.test(interpretation);
  const urgent = ed ? ed.esi <= 2 : critical;
  const origin = Date.parse(`${state.date}T00:00:00-08:00`) + shift.startClock * MINUTE;
  const released = observations.flatMap(r=> {
    const time = typeof r.issued === "string" ? r.issued : r.effectiveDateTime;
    if(typeof time !== "string") return [];
    const at = Date.parse(time) - origin;
    return Number.isFinite(at) ? [at] : [];
  });
  // A result task may contain several results. It becomes actionable when its
  // last source result arrives; pre-origin backlog age remains measurable.
  const resultAt = task.workflow === "W2" && released.length ? Math.max(...released) : undefined;
  if(resultAt !== undefined) arrivalMin = Math.max(0,resultAt / MINUTE);
  if(doses.length) arrivalMin = Math.max(0,Math.min(...doses.map(d=>(d.windowStartMin ?? d.scheduledMin)-shift.startClock)));
  const priority = urgent ? 0 : doses.length > 0 || (task.workflow === "W2" && abnormal) || inbox?.priority === 0 ? 1 : 2;
  const doseWindows: [string, number][] = doses.map(d =>
    [d.occurrence, Math.max(0, d.windowEndMin - shift.startClock) * MINUTE]);
  const deadlines = doseWindows.map(([, end]) => end);
  // ESI-based queue targets are modeling assumptions, not clinical guarantees.
  if (ed) deadlines.push(arrivalMin * MINUTE + (ed.esi <= 2 ? 10 : ed.esi === 3 ? 30 : 60) * MINUTE);
  return {arrivalMs: arrivalMin * MINUTE,
    readyMs: Math.max(arrivalMin, task.startMin) * MINUTE, priority, doseWindows,
    ...(state.worldClock === "continuous" ? {clinicalServiceMs: WORLD_CLOCK_PARAMETERS.clinicalMinutes[task.workflow] * MINUTE,
      ...(ed?.boardingMin !== undefined ? {boardingMs: ed.boardingMin * MINUTE} : {})} : {}),
    resultAgeMs: resultAt === undefined ? 0 : Math.max(0,-resultAt),
    ...(deadlines.length ? {deadlineMs: Math.min(...deadlines)} : {}),
    ...(task.workflow === "W2" ? {resultAvailableMs: arrivalMin * MINUTE} : {})};
}

/** Preserve all clinical choices and original startMin values. Arrival patterns
 * remain the world's ED hourly/acuity stream, clinic slots, inbox and med passes.
 * Source days lacking night/weekend arrivals are not filled by duplicating cases. */
export function withTiming(schedule: DaySchedule, state: WorldState): DaySchedule {
  return {...schedule, ...(state.worldClock === "continuous" ? {sourceDates: sourceDates([schedule], [state.date])} : {}), shifts: coverage(schedule.persona, state.date || dateOf(schedule.day)),
    tasks: schedule.tasks.map(t => ({...t, timing: taskArrival(t, state)}))};
}

/** One queue and clock for a horizon of adjacent source days. Original task
 * identity and choices survive; all release/deadline fields use the first day’s
 * origin. Running each daily schedule separately cannot model queue carry-over. */
export function mergeTimedDays(schedules: DaySchedule[], dates: string[]): DaySchedule {
  const first = schedules[0], firstDate = dates[0];
  if (!first || !firstDate || schedules.length !== dates.length) throw new Error("need matching schedules and dates");
  const base = Date.parse(firstDate);
  return {...first, sourceDates: sourceDates(schedules, dates), shifts: coverage(first.persona, firstDate, Math.ceil((Date.parse(dates.at(-1) ?? firstDate) - base) / 86400000) + 2), tasks: schedules.flatMap((s, i) => {
    if (s.persona !== first.persona) throw new Error("cannot merge different personas");
    const offset = (Date.parse(dates[i] ?? "") - base) / MINUTE;
    if (!Number.isInteger(offset) || offset < 0) throw new Error("dates must be ordered");
    return s.tasks.map(t => {
      if (!t.timing) throw new Error("merge requires timed source tasks");
      const a = t.timing, delta = offset * MINUTE;
      return {...t, startMin: t.startMin + offset, timing: {...a, arrivalMs: a.arrivalMs + delta, readyMs: a.readyMs + delta,
        ...(a.deadlineMs !== undefined ? {deadlineMs: a.deadlineMs + delta} : {}),
        ...(a.resultAvailableMs !== undefined ? {resultAvailableMs: a.resultAvailableMs + delta} : {}),
        doseWindows: a.doseWindows.map(([id, end]): [string, number] => [id, end + delta])}};
    });
  })};
}

function sourceDates(schedules: DaySchedule[], dates: string[]): [number, string][] {
  return schedules.map((s, i) => [s.day, dates[i] ?? ""]);
}
