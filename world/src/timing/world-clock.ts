/** Wave-3 world assumptions. S15 (NHAMCS 2022) supplies the 56.3%
 * after-business-hours reference and 16-minute median provider wait. E4 (2006)
 * motivates an hourly curve only; every hour/weekday weight here is scenario.
 * N9 (2017–24) is a peak-month stress comparator, not the default boarding fit. */
import type { Rng } from "../rng";
import type { EdVisit } from "../state";

export const WORLD_CLOCK_PARAMETERS = {
  arrivalShape: {kind: "scenario", sources: ["E4:2006", "S15:2022"], weekdayBusinessShare: 0.437 * 7 / 5},
  providerWait: {kind: "scenario", source: "S15:2022", medianMinutes: 16, min: 4, max: 28},
  boarding: {kind: "scenario", comparator: "N9:2017-2024", tailOver4h: 0.25, tailOver24h: 0.03},
  clinicalMinutes: {kind: "scenario", W1: 5, W2: 0, W3: 10, W4: 2, W5: 5, W6: 6, W7: 0},
} as const;

/** 07:00 → next 07:00. No negative Lean Nat task times or clipped night arrivals. */
export function fullDayArrival(rng: Rng, weekend: boolean): number {
  const hours = Array.from({length: 24}, (_, i) => i + 7);
  const business = (h: number) => h >= 8 && h < 17;
  const inBusiness = !weekend && rngBusiness(rng);
  const group = weekend ? hours : hours.filter(h => business(h) === inBusiness);
  // Do not redraw group membership independently for each hour.
  return rng.weighted(group.map(h => [h, h % 24 >= 10 && h % 24 < 22 ? 2 : 1] as const)) * 60 + rng.int(0, 59);
}
function rngBusiness(rng: Rng): boolean { return rng.chance(WORLD_CLOCK_PARAMETERS.arrivalShape.weekdayBusinessShare); }

export function boardingMinutes(rng: Rng): number {
  const p = rng.next();
  return p < 0.03 ? rng.int(1441, 2160) : p < 0.25 ? rng.int(241, 720) : rng.int(15, 240);
}

export function stages(visit: EdVisit, rng: Rng): EdVisit {
  const providerReadyClock = visit.providerReadyClock ?? visit.arrivalClock + rng.int(4, 28);
  const admitted = visit.disposition === "admit" || visit.admissionId !== null;
  const decision = providerReadyClock + 10;
  const boardingMin = admitted ? boardingMinutes(rng) : 0;
  return {...visit, providerReadyClock, ...(admitted ? {admitDecisionClock: decision, boardingMin,
    bedDepartureClock: decision + boardingMin} : {bedDepartureClock: decision + rng.int(30, 120)})};
}
