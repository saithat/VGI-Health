/** Provisional local policy and uncalibrated rates: README administration outcomes. */
import { SHIFTS } from "../calendar";
import { hasClass } from "../formulary";
import type { Rng } from "../rng";
import type { AdministrationDecision, OrderChoice } from "../schema";
import type { Inpatient } from "../state";

export function criticalMedication(o: OrderChoice): boolean {
  return hasClass(o.drug, "insulin") || hasClass(o.drug, "antibiotic") || hasClass(o.drug, "anticoagulant");
}

/** Every scheduled occurrence is documented, including absence from the unit.
 * One optional re-offer; no catch-up dose after the local window closes.
 */
function legacyDoseAttempts(o: OrderChoice, ip: Inpatient, day: number, clock: number,
  occurrence: string, rng: Rng, timingLegacy = true): AdministrationDecision[] {
  const critical = criticalMedication(o);
  // Keep expiry documentation within the simulated shift; cross-shift ownership
  // is outside this dose-attempt model.
  const windowEndMin = Math.min(clock + (critical ? 30 : ["daily", "q24h"].includes(o.freq) ? 120 : 60),
    SHIFTS.P3.startClock + SHIFTS.P3.lengthMin - 1);
  const base = { occurrence, scheduledMin: clock, windowEndMin, attemptMin: clock,
    reoffer: false, notifyPrescriber: false };
  const held = (reason: string): AdministrationDecision[] =>
    [{ ...base, outcome: "held", reason, notifyPrescriber: critical }];
  const isNpo = ip.npo.some(w => w.day === day && clock < w.untilClock);
  if ((o.route === "PO" || o.drug === "insulin lispro") && isNpo) return held("npo");
  if (o.drug === "lisinopril" && rng.chance(0.08)) return held("sbp-below-100");
  if (o.drug === "insulin lispro" && rng.chance(0.08)) return held("poor-oral-intake");
  if (o.drug === "warfarin" && rng.chance(0.05)) return held("inr-above-range");
  if (["heparin", "enoxaparin"].includes(o.drug) && rng.chance(0.02)) return held("platelets-low");

  const absence = ip.offWard.find(w => w.day === day && clock >= w.fromClock && clock < w.toClock);
  let initial: AdministrationDecision;
  let retryClock = clock + (critical ? 20 : 45);
  let resolves = true;
  if (absence) {
    initial = { ...base, outcome: "delayed", reason: "patient-off-unit" };
    retryClock = Math.max(retryClock, absence.toClock);
  } else if (rng.chance(0.02)) {
    initial = { ...base, outcome: "delayed", reason: "medication-unavailable" };
    resolves = rng.chance(0.7);
  } else if (rng.chance(o.route === "SC" ? 0.05 : o.route === "PO" ? 0.025 : 0.005)) {
    initial = { ...base, outcome: "refused", reason: "patient-declines-after-explanation" };
    resolves = rng.chance(0.6);
  } else if (timingLegacy && rng.chance(0.005)) {
    return [{ ...base, outcome: "notGiven", reason: "window-expired", attemptMin: windowEndMin + 1,
      notifyPrescriber: critical }];
  } else return [{ ...base, outcome: "given", reason: "scheduled" }];

  // A discharge terminates ward responsibility; document the unresolved dose.
  const discharged = ip.plannedDischargeDay === day && retryClock >= ip.dischargeClock;
  if (retryClock > windowEndMin || discharged ||
      ip.offWard.some(w => w.day === day && retryClock >= w.fromClock && retryClock < w.toClock)) {
    return [initial, { ...base, outcome: "notGiven", reason: discharged ? "discharged-before-reoffer" : "window-expired",
      attemptMin: Math.min(windowEndMin + 1, discharged ? ip.dischargeClock : windowEndMin + 1),
      notifyPrescriber: critical }];
  }
  const outcome = resolves ? "given" : initial.outcome === "refused" ? "refused" : "notGiven";
  return [initial, { ...base, outcome, reason: resolves ? "accepted-on-reoffer" : initial.reason,
    attemptMin: retryClock, reoffer: true, notifyPrescriber: outcome === "refused" || (critical && outcome === "notGiven") }];
}

/** S14 (CMS SOM rev.248, 2026): classification remains hospital policy. */
export function doseWindowMinutes(o: OrderChoice): number {
  return criticalMedication(o) ? 30 : ["daily", "q24h"].includes(o.freq) ? 120 : 60;
}

/** Scenario signed offsets and charting lags, not fitted to N6/N7. N6
 * (2021–23 postpartum analgesics) and N7 (2021 publication) are comparators.
 * Legacy branch and RNG consumption remain available for archive comparisons. */
export function doseAttempts(o: OrderChoice, ip: Inpatient, day: number, clock: number,
  occurrence: string, rng: Rng, legacy = false): AdministrationDecision[] {
  if (legacy) return legacyDoseAttempts(o, ip, day, clock, occurrence, rng);
  const width = doseWindowMinutes(o);
  const windowStartMin = Math.max(0, clock - width);
  const windowEndMin = clock + width;
  // Retain holds/refusals, reoffer intervals and escalation rules. Timing alone
  // no longer uses the historical Bernoulli window-expiry draw.
  const attempts = legacyDoseAttempts(o, ip, day, clock, occurrence, rng.fork("clinical-policy"), false);
  const offset = Math.round(rng.fork("signed-offset").normal(15, 35));
  const lag = () => Math.max(0, Math.round(Math.exp(rng.fork("chart-lag").normal(Math.log(6), 0.8))));
  return attempts.map(a => {
    // The inherited shift cutoff is still a monitoring/reoffer rule; it does
    // not truncate the scheduled-dose CMS window itself.
    let attemptMin = a.attemptMin;
    let outcome = a.outcome;
    let reason = a.reason;
    if (outcome === "given" && !a.reoffer) {
      attemptMin = Math.max(windowStartMin, clock + offset);
      if (attemptMin > windowEndMin) { outcome = "notGiven"; reason = "window-expired"; }
      // No early dose before the admission/order exists or while off unit/NPO.
      if (attemptMin < ip.admitClock && ip.admitDay === day ||
          ip.offWard.some(w => w.day === day && attemptMin >= w.fromClock && attemptMin < w.toClock) ||
          (o.route === "PO" || o.drug === "insulin lispro") && ip.npo.some(w => w.day === day && attemptMin < w.untilClock)) attemptMin = clock;
    }
    if (outcome === "given" && ip.plannedDischargeDay === day && attemptMin >= ip.dischargeClock) {
      outcome = "notGiven"; reason = "discharged-before-administration";
    }
    return { ...a, outcome, reason, windowStartMin, windowEndMin, attemptMin,
      ...(outcome === "given" ? {administeredMin: attemptMin} : {}),
      chartedMin: attemptMin + lag(),
      notifyPrescriber: a.notifyPrescriber || outcome === "notGiven" && criticalMedication(o) };
  });
}
