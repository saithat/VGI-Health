import {describe, expect, it} from "vitest";
import {withCalendar, dateOf, dateTimeOf, weekdayOf} from "../src/calendar";
import {fullDayArrival, boardingMinutes} from "../src/timing/world-clock";
import {mergeTimedDays, withTiming} from "../src/timing/arrivals";
import {generateWorld, advanceDay} from "../src/world";
import {loadPopulation} from "../src/patients";
import {Rng} from "../src/rng";
import {DayScheduleSchema, PERSONAS} from "../src/schema";
import {FIXTURE_INDEX} from "./helpers";

function must<T>(x: T | undefined): T { if (x === undefined) throw new Error("missing test data"); return x; }

describe("wave3 calendar, arrivals and shared horizon", () => {
  it("scopes consecutive dates and midnight rollover; legacy remains byte-for-byte", () => {
    expect(dateOf(6)).toBe("2026-11-09");
    withCalendar("continuous", () => {
      expect(dateOf(6)).toBe("2026-11-07");
      expect(weekdayOf(7)).toBe("Sun");
      expect(dateTimeOf(1, 1501)).toBe("2026-11-03T01:01:00-08:00");
      expect(withCalendar("legacy", () => dateOf(6))).toBe("2026-11-09");
    });
    expect(dateOf(6)).toBe("2026-11-09");
  });
  it("offers independent night/weekend demand with declared after-hours reference", () => {
    const rng = new Rng("arrivals");
    const clocks = Array.from({length: 14000}, (_, i) => fullDayArrival(rng, i % 7 >= 5));
    expect(clocks.some(t => t >= 1440)).toBe(true);
    expect(clocks.every(t => t >= 420 && t < 1860)).toBe(true);
    const business = clocks.filter((t,i) => i % 7 < 5 && t >= 480 && t < 1020).length;
    expect(business / clocks.length).toBeCloseTo(0.437, 1);
    expect(Array.from({length: 500}, () => boardingMinutes(rng)).some(t => t > 1440)).toBe(true);
  });
  const patients = loadPopulation(FIXTURE_INDEX).patients;
  const run = generateWorld(1, 8, patients, undefined, {worldClock: "continuous"});
  it("keeps hospital arrivals on weekends, closes clinics and carries boarding", () => {
    for (const day of run.days.slice(5, 7)) {
      expect(day.state.today.ed.arrivals.length).toBeGreaterThan(0);
      expect(day.schedules.P1.tasks).toHaveLength(0);
      expect(day.schedules.P4.tasks).toHaveLength(0);
      expect(day.state.today.clinics.P5.seen).toBe(0);
    }
    for (const [i, day] of run.days.entries()) {
      expect(day.state.today.ward.admissions).toEqual(day.state.admissions.filter(a=>a.day === day.state.day).map(a=>a.id));
      const visits = day.state.today.ed.arrivals;
      for (const a of visits) {
        expect(a.providerReadyClock).toBeGreaterThanOrEqual(a.arrivalClock);
        if (a.admitDecisionClock !== undefined) {
          expect(a.bedDepartureClock).toBeGreaterThanOrEqual(a.admitDecisionClock);
          expect(a.boardingMin).toBe(must(a.bedDepartureClock) - a.admitDecisionClock);
        }
      }
      if (i) expect(day.state.today.ed.boardersAtShiftStart).toBe(must(must(run.days[i-1]).state.edCarry).filter(a=>a.admitDecisionClock !== undefined).length);
    }
    expect(run.days.some(d => must(d.state.edCarry).length > 0)).toBe(true);
    const next = advanceDay(must(run.days[6]).state, run.pop);
    expect(next.state.date).toBe("2026-11-09");
  });
  it("merges exogenous source days into one queue without losing identities or choices", () => {
    for (const p of PERSONAS) {
      const schedules = run.days.map(d => withTiming(d.schedules[p], d.state));
      const merged = mergeTimedDays(schedules, run.days.map(d => d.state.date));
      expect(DayScheduleSchema.parse(merged)).toEqual(merged);
      expect(merged.tasks.map(t => t.id)).toEqual(schedules.flatMap(s => s.tasks.map(t => t.id)));
      expect(merged.tasks.map(t => t.choices)).toEqual(schedules.flatMap(s => s.tasks.map(t => t.choices)));
      for (const t of merged.tasks) expect(must(t.timing).readyMs).toBeGreaterThanOrEqual(t.startMin * 60000);
      expect(must(must(merged.shifts).at(-1)).endMs).toBeGreaterThan(8*1440*60000);
    }
  });
  it("explicit legacy world retains weekday-only daytime source demand", () => {
    const a = generateWorld(1, 8, patients);
    const b = generateWorld(1, 8, patients, undefined, {worldClock: "legacy"});
    expect(a).toEqual(b);
    expect(must(b.days[5]).state.date).toBe("2026-11-09");
    expect(b.days.every(d => d.state.today.ed.arrivals.every(v => v.arrivalClock >= 420 && v.arrivalClock < 1020))).toBe(true);
    expect(b.days.every(d => d.state.edCarry === undefined)).toBe(true);
  });
});
