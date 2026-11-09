/**
 * P3, inpatient RN, 12 h day shift (W4). The census at shift start is every
 * inpatient admitted before today. Scheduled meds are given at fixed pass
 * times; PRN analgesics need a pain score and a later reassessment;
 * high-alert meds (insulin, heparin) appear in the passes; some doses are
 * held, refused, delayed or missed with a reason; every patient gets a handoff.
 *
 * Typed pain scores and linked dose outcomes describe administration decisions.
 * Reassessment is a note section plus a typed pain score; PRN reasons and
 * sedation scores use structured FHIR observations.
 */
import type { DayBuild } from "../build";
import { SHIFTS } from "../calendar";
import { hasClass } from "../formulary";
import type { OrderChoice } from "../schema";
import type { Inpatient } from "../state";
import { criticalMedication, doseAttempts } from "../medication/outcomes";
import { activeOrders, dischargeInpatient } from "./common";

const P3_START = SHIFTS.P3.startClock;
const toMin = (clock: number) => clock - P3_START;

/** Fixed med-pass clock times (minutes since midnight): 07:30, 09:00, 12:00, 14:00, 17:00, 18:00. */
export const PASS_CLOCKS = [450, 540, 720, 840, 1020, 1080] as const;

/** Pass times (within the day shift) at which a scheduled order is due. */
export function dueClocks(o: OrderChoice): number[] {
  if (o.prn) return [];
  switch (o.freq) {
    case "daily":
    case "q24h":
      return [o.drug === "warfarin" ? 1020 : 540];
    case "BID":
    case "q12h":
      return [540];
    case "TID":
      return [540, 840];
    case "QID":
    case "q4h":
      return [540, 720, 1020];
    case "q6h":
      return [720, 1080];
    case "q8h":
      return [840];
    case "TIDAC":
      return [450, 720, 1020];
    default:
      return []; // once (given in ED/OR), nightly (night shift), q3h (PRN only)
  }
}

/** Census at shift start: admitted before today and not discharged before today. */
export function censusAtShiftStart(b: DayBuild): Inpatient[] {
  return b.state.inpatients
    .filter((ip) => ip.admitDay < b.day && ip.plannedDischargeDay >= b.day)
    .sort((x, y) => (x.room < y.room ? -1 : x.room > y.room ? 1 : 0));
}

function offWard(ip: Inpatient, day: number, clock: number): boolean {
  return ip.offWard.some((w) => w.day === day && clock >= w.fromClock && clock < w.toClock);
}

function gone(ip: Inpatient, day: number, clock: number): boolean {
  return ip.plannedDischargeDay === day && clock >= ip.dischargeClock;
}

/** Discharge today's planned medical discharges (no hospitalist persona; the world does it). */
export function dischargeMedicine(b: DayBuild): void {
  const rng = b.rng("ward-discharge");
  for (const ip of censusAtShiftStart(b)) {
    if (ip.service === "medicine" && ip.plannedDischargeDay === b.day) dischargeInpatient(b, ip, ip.dischargeClock, null, rng);
  }
}

export function runWard(b: DayBuild): void {
  const rng = b.rng("ward");
  const census = censusAtShiftStart(b);
  const day = b.day;
  census.forEach((ip, idx) => {
    const prng = rng.fork(ip.admissionId);
    let first = true;
    // Scheduled passes.
    for (const clock of PASS_CLOCKS) {
      if (gone(ip, day, clock)) continue;
      const due = activeOrders(ip, day, clock).filter((o) => dueClocks(o).includes(clock));
      const administer: OrderChoice[] = [];
      const notes: string[] = [];
      if (first && !offWard(ip, day, clock)) {
        notes.push("vitals", "assessment");
        if (ip.admitDay === day - 1) notes.push("newOrdersReview");
      } else if (clock === 840 && !offWard(ip, day, clock)) {
        notes.push("vitals"); // afternoon flowsheet vitals
      }
      for (const [orderIndex, o] of due.entries()) {
        const occurrence = `${ip.admissionId}:${day}:${clock}:${orderIndex}:${o.drug}`;
        const attempts = doseAttempts(o, ip, day, clock, occurrence, prng.fork(`outcome:${occurrence}`), b.workflowMode === "legacy");
        for (const [attemptIndex, administration] of attempts.entries()) {
          const decision = administration.outcome === "given" &&
            !activeOrders(ip, day, administration.attemptMin).includes(o)
            ? { ...administration, administeredMin: undefined, outcome: "notGiven" as const, reason: "order-no-longer-active",
              notifyPrescriber: criticalMedication(o) }
            : administration;
          const medication = { ...o, administration: decision };
          const chartClock = administration.chartedMin ?? administration.attemptMin;
          if (attemptIndex === 0 && chartClock === clock) administer.push(medication);
          else b.addTask("P3", "W4", ip.patientId, toMin(chartClock),
            { administer: [medication] }, [], b.interruptions("P3", prng.fork(`followup:${occurrence}`)));
        }
      }
      if (administer.length === 0 && notes.length === 0) continue;
      b.addTask("P3", "W4", ip.patientId, toMin(clock) + (idx % 6) * 3, { administer, noteSections: notes }, [], b.interruptions("P3", prng));
      if (notes.includes("assessment")) first = false;
    }
    // Every patient on the census gets at least an assessment, even if off the ward for the morning passes.
    if (first) {
      const clock = [...PASS_CLOCKS, 1110].find((c) => !gone(ip, day, c) && !offWard(ip, day, c)) ?? 450;
      b.addTask("P3", "W4", ip.patientId, toMin(clock) + 10, { noteSections: ["vitals", "assessment", ...(ip.admitDay === day - 1 ? ["newOrdersReview"] : [])] }, [], b.interruptions("P3", prng));
    }

    // PRN analgesia with pain score and reassessment.
    const prnCount = Math.min(4, prng.poisson(ip.prnPerShift * (b.ctx.personaLoad.P3 === "busy" ? 1.1 : 1)));
    const given: number[] = [];
    for (let k = 0; k < prnCount; k++) {
      const clock = prng.int(8 * 60, 18 * 60 + 15);
      if (gone(ip, day, clock) || offWard(ip, day, clock) || given.some((g) => Math.abs(g - clock) < 200)) continue;
      const prns = activeOrders(ip, day, clock).filter((o) => o.prn);
      const opioids = prns.filter((o) => hasClass(o.drug, "opioid"));
      const mild = prns.filter((o) => o.drug === "acetaminophen" || o.drug === "ibuprofen");
      const severe = prng.chance(ip.prnPerShift >= 1.5 ? 0.65 : 0.4);
      const choice = severe && opioids.length > 0 ? prng.pick(opioids) : mild.length > 0 ? prng.pick(mild) : opioids.length > 0 ? prng.pick(opioids) : undefined;
      if (choice === undefined) continue;
      given.push(clock);
      const score = hasClass(choice.drug, "opioid") ? prng.int(6, 9) : prng.int(3, 5);
      b.addTask("P3", "W4", ip.patientId, toMin(clock), { administer: [choice], painScore: score }, [], b.interruptions("P3", prng));
      const reassessAt = clock + (choice.route === "IV" ? 30 : 60);
      if (!gone(ip, day, reassessAt)) {
        b.addTask("P3", "W4", ip.patientId, toMin(reassessAt), { painScore: Math.max(0, score - prng.int(2, 5)), noteSections: ["painReassessment"] }, [], b.interruptions("P3", prng, 0.5));
      }
    }
    // PRN antiemetic.
    const nauseaClock = prng.int(8 * 60, 18 * 60);
    const antiemetic = activeOrders(ip, day, nauseaClock).find((o) => o.prn && o.drug === "ondansetron");
    if (antiemetic !== undefined && prng.chance(ip.service === "surgery" ? 0.35 : 0.12) && !gone(ip, day, nauseaClock) && !offWard(ip, day, nauseaClock)) {
      b.addTask("P3", "W4", ip.patientId, toMin(nauseaClock), { administer: [antiemetic], observations: [{ code: "prnReason", value: "nausea" }] }, [], b.interruptions("P3", prng));
    }

    // PRN benzodiazepine (home benzodiazepine continued, or new anxiety PRN): sedation check before giving.
    const anxClock = prng.int(9 * 60, 18 * 60);
    const benzo = activeOrders(ip, day, anxClock).find((o) => o.prn && hasClass(o.drug, "benzodiazepine"));
    if (benzo !== undefined && prng.chance(0.45) && !gone(ip, day, anxClock) && !offWard(ip, day, anxClock)) {
      b.addTask("P3", "W4", ip.patientId, toMin(anxClock), { administer: [benzo], observations: [{ code: "prnReason", value: "anxiety" }, { code: "sedationScore", value: prng.int(0, 1) }] }, [], b.interruptions("P3", prng));
    }

    // Handoff at end of shift.
    if (!(ip.plannedDischargeDay === day)) {
      b.addTask("P3", "W4", ip.patientId, toMin(18 * 60 + 30) + idx * 2, { noteSections: ["handoff"] }, [], 0);
    }
  });
}
