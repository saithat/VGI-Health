import {describe, expect, it} from "vitest";
import {coverage, withTiming} from "../src/timing/arrivals";
import {loadPopulation} from "../src/patients";
import {generateWorld} from "../src/world";
import {DayScheduleSchema, PERSONAS} from "../src/schema";
import {personaParams} from "../src/personas";
import {FIXTURE_INDEX} from "./helpers";

describe("exogenous continuous timing", () => {
  const world = generateWorld(1, 2, loadPopulation(FIXTURE_INDEX).patients);
  it("preserves source choices, IDs and scheduled times and uses ED source clocks/acuity", () => {
    for(const day of world.days) for(const persona of PERSONAS) {
      const original=day.schedules[persona], timed=withTiming(original,day.state);
      expect(DayScheduleSchema.parse(timed)).toEqual(timed);
      expect(timed.tasks).toEqual(original.tasks.map((t,i)=>({...t,timing:timed.tasks[i]?.timing})));
      for(const t of timed.tasks) {
        expect(t.timing?.readyMs).toBeGreaterThanOrEqual(t.timing?.arrivalMs ?? 0);
        expect(t.timing?.readyMs).toBeGreaterThanOrEqual(t.startMin*60000);
        const ed=day.state.today.ed.arrivals.find(a=>a.taskId===t.id);
        if(ed) {
          expect(t.timing?.arrivalMs).toBe(Math.max(0,ed.arrivalClock-420)*60000);
          expect(t.timing?.priority).toBe(ed.esi<=2?0:2);
        }
        for(const dose of t.choices.administer) if(dose.administration) {
          expect(t.timing?.doseWindows).toContainEqual([dose.administration.occurrence,
            Math.max(0,dose.administration.windowEndMin-420)*60000]);
        }
      }
    }
  });
  it("same seed gives identical arrival metadata across expert/bounded UI arms", () => {
    const regenerate=generateWorld(1,2,loadPopulation(FIXTURE_INDEX).patients);
    for(const [index,day] of world.days.entries()) for(const persona of PERSONAS) {
      expect(personaParams(persona,1,"expert").policy).not.toBe(personaParams(persona,1,"bounded").policy);
      const other=regenerate.days[index];
      if(!other) throw new Error("missing day");
      expect(withTiming(day.schedules[persona],day.state)).toEqual(withTiming(other.schedules[persona],other.state));
    }
  });
  it("covers hospital nights/weekends and reopens clinic on Monday", () => {
    const hospital=coverage("P3","2026-11-06"), clinic=coverage("P1","2026-11-06");
    expect(hospital[1]?.startMs).toBe(705*60000);
    expect(hospital.some(w=>w.startMs>=2*1440*60000)).toBe(true);
    expect(clinic[1]?.startMs).toBe(3*1440*60000);
    const saturday=coverage("P1","2026-11-07");
    expect(saturday[0]?.startMs).toBe(2*1440*60000);
  });
});
