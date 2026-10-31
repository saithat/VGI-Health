/**
 * P4, pediatric NP (W5): well-child visits with immunizations, sick visits
 * with weight-based (mg/kg) prescriptions, rechecks (the child seen yesterday
 * comes back with a new weight), and flu-shot visits in flu season. Every
 * visit records today's weight in kg (an Observation in `todayResources`);
 * every dose is computed from that weight.
 */
import { type DayBuild, isPcnAllergic } from "../build";
import { ageDaysOn, daysBefore } from "../calendar";
import { peds } from "../clinical";
import { weightObservation } from "../fhir";
import type { PatientProfile } from "../patients";
import { Rng } from "../rng";
import type { OrderChoice } from "../schema";
import type { PedsChild } from "../state";
import { addAppointment } from "./common";

// CVX codes.
const CVX = { hepB: "08", dtap: "20", ipv: "10", hib: "49", pcv: "133", rota: "116", mmr: "03", varicella: "21", hepA: "83", tdap: "115", menacwy: "114", hpv: "165", flu: "150" } as const;

/** Vaccines due at a well visit for a given age (simplified AAP schedule). */
export function vaccinesForAge(ageDays: number): string[] {
  const m = ageDays / 30.4;
  const y = ageDays / 365.25;
  if (m < 1.5) return [CVX.hepB];
  if (m < 3.5) return [CVX.dtap, CVX.ipv, CVX.hib, CVX.pcv, CVX.rota, CVX.hepB];
  if (m < 5.5) return [CVX.dtap, CVX.ipv, CVX.hib, CVX.pcv, CVX.rota];
  if (m < 8) return [CVX.dtap, CVX.pcv, CVX.rota, CVX.hepB];
  if (m < 11.5) return [];
  if (m < 14) return [CVX.mmr, CVX.varicella, CVX.hepA, CVX.pcv, CVX.hib];
  if (m < 20) return [CVX.dtap, CVX.hepA];
  if (y >= 4 && y < 7) return [CVX.dtap, CVX.ipv, CVX.mmr, CVX.varicella];
  if (y >= 11 && y < 13) return [CVX.tdap, CVX.menacwy, CVX.hpv];
  if (y >= 16 && y < 17) return [CVX.menacwy];
  return [];
}

/** Growth rate in kg/day by age (rough population medians). */
export function growthKgPerDay(ageYears: number): number {
  if (ageYears < 1) return 0.018;
  if (ageYears < 2) return 0.0068;
  if (ageYears < 10) return 0.0058;
  if (ageYears < 15) return 0.012;
  return 0.007;
}

export function initPedsChild(p: PatientProfile): PedsChild {
  const anchorDay = p.weightDate !== null ? 1 - Math.max(0, daysBefore(p.weightDate, 1)) : 0;
  return {
    patientId: p.id,
    birthDate: p.birthDate,
    gender: p.gender,
    anchorKg: p.weightKg,
    anchorDay,
    growthKgPerDay: growthKgPerDay(p.ageYears),
    lastVisitDay: null,
    weights: {},
    vaccinesGiven: [],
  };
}

/**
 * Today's measured weight: the growth curve from the record's last weight,
 * plus a small deterministic measurement wobble per (child, day).
 */
export function weightOnDay(c: PedsChild, day: number, seed: number): number {
  const key = String(day);
  const known = c.weights[key];
  if (known !== undefined) return known;
  const wobble = new Rng(`${seed}:weight:${c.patientId}:${day}`).normal(0, 0.008);
  const kg = Math.max(2.5, (c.anchorKg + c.growthKgPerDay * (day - c.anchorDay)) * (1 + wobble));
  const rounded = Math.round(kg * 10) / 10;
  c.weights[key] = rounded;
  return rounded;
}

type VisitKind = "well" | "sick" | "recheck" | "flu-shot";

interface PedsPlan {
  orders: OrderChoice[];
  immunizations: string[];
  notes: string[];
  recheckInDays: number | null;
  reason: string;
}

function sickPlan(p: PatientProfile, kg: number, rng: Rng, flu: boolean): PedsPlan {
  const pcn = isPcnAllergic(p);
  const ageY = p.ageYears;
  const kind = rng.weighted<string>([
    ["otitis-media", ageY < 7 ? 6 : 2],
    ["strep-pharyngitis", ageY >= 3 ? 4 : 0],
    ["uri-fever", flu ? 8 : 4],
    ["asthma-flare", p.tags.includes("asthma") ? 6 : ageY >= 2 ? 1 : 0],
    ["gastroenteritis", 3],
  ]);
  const fever = (): OrderChoice => (ageY >= 1 && rng.chance(0.4) ? peds.ibuprofen(kg) : peds.acetaminophen(kg));
  const notes = ["hpi", "exam", "assessmentPlan"];
  switch (kind) {
    case "otitis-media":
      return { orders: [pcn ? peds.azithromycin(kg, "acute-otitis-media") : peds.amoxicillinAom(kg), fever()], immunizations: [], notes, recheckInDays: rng.chance(0.3) ? rng.int(1, 2) : null, reason: "otitis-media" };
    case "strep-pharyngitis":
      return { orders: [pcn ? peds.azithromycin(kg, "strep-pharyngitis") : peds.amoxicillinStrep(kg)], immunizations: [], notes, recheckInDays: null, reason: "strep-pharyngitis" };
    case "asthma-flare":
      return { orders: [peds.albuterolNeb(kg)], immunizations: [], notes: [...notes, "asthmaActionPlan"], recheckInDays: rng.chance(0.5) ? 1 : null, reason: "asthma-flare" };
    case "gastroenteritis":
      return { orders: [peds.ondansetron(kg)], immunizations: [], notes: [...notes, "hydrationAssessment"], recheckInDays: rng.chance(0.3) ? 1 : null, reason: "gastroenteritis" };
    default:
      return { orders: [fever()], immunizations: [], notes, recheckInDays: null, reason: "uri-fever" };
  }
}

export function runPeds(b: DayBuild): void {
  const rng = b.rng("p4");
  const vol = b.ctx.personaVolume.P4;
  const target = Math.max(12, Math.min(22, Math.round(16 * vol) + rng.int(-1, 1)));
  const fluShots = b.ctx.fluWeek ? rng.int(2, 4) : rng.chance(0.4) ? 1 : 0;
  const children = new Map(b.state.peds.map((c) => [c.patientId, c]));
  if (b.pop.peds.length === 0) {
    b.state.today.clinics.P4 = { booked: 0, seen: 0, noShows: [], addOns: [], newPatients: 0 };
    return;
  }

  const visits: { p: PatientProfile; kind: VisitKind; noShow: boolean; reason: string }[] = [];
  const rechecks = b.state.appointments.filter((a) => a.persona === "P4" && a.day === b.day);
  const addOns = rng.int(1, 3) + (b.ctx.monday ? 1 : 0);
  for (const a of rechecks) {
    if (visits.filter((v) => !v.noShow).length >= target - addOns - fluShots) {
      a.rescheduledFrom.push(b.day);
      a.day = b.day + 1;
      continue;
    }
    b.picker.use(a.patientId);
    visits.push({ p: b.patient(a.patientId), kind: "recheck", noShow: rng.chance(0.08), reason: a.reason });
  }
  b.state.appointments = b.state.appointments.filter((a) => !(a.persona === "P4" && a.day === b.day));

  let guard = 0;
  while (visits.filter((v) => !v.noShow).length < target - addOns - fluShots && guard++ < 200) {
    const kind: VisitKind = rng.chance(b.ctx.fluWeek ? 0.4 : 0.5) ? "well" : "sick";
    const p = b.picker.pick(rng, (q) => q.ageYears < 18, b.ctx.allergyShare);
    if (p === undefined) break;
    visits.push({ p, kind, noShow: rng.chance(0.1), reason: kind });
  }
  for (let k = 0; k < addOns + fluShots; k++) {
    const p = b.picker.pick(rng, (q) => q.ageYears < 18 && (k < addOns || ageDaysOn(q.birthDate, b.day) >= 183), b.ctx.allergyShare);
    if (p === undefined) break;
    visits.push({ p, kind: k < addOns ? "sick" : "flu-shot", noShow: false, reason: k < addOns ? "same-day sick" : "flu shot" });
  }

  // 20-minute slots, 08:00-12:00 and 13:00-17:00; flu shots squeeze in between.
  const slots = [...Array.from({ length: 12 }, (_, i) => i * 20), ...Array.from({ length: 12 }, (_, i) => 300 + i * 20)];
  const order_ = rng.shuffle(visits.map((_, i) => i));
  const noShows: string[] = [];
  let seen = 0;
  order_.forEach((vi, k) => {
    const v = visits[vi];
    if (v === undefined) return;
    const start = (slots[k] ?? 500 + (k - slots.length) * 7) + (v.kind === "flu-shot" ? 10 : 0);
    if (v.noShow) {
      noShows.push(v.p.id);
      return;
    }
    const vr = rng.fork(`visit-${k}-${v.p.id}`);
    let c = children.get(v.p.id);
    if (c === undefined) {
      c = initPedsChild(v.p);
      b.state.peds.push(c);
      children.set(v.p.id, c);
    }
    const kg = weightOnDay(c, b.day, b.state.seed);
    const ageDays = ageDaysOn(v.p.birthDate, b.day);
    const seasonFlu = ageDays >= 183 && !c.vaccinesGiven.some((g) => g.cvx === CVX.flu);
    let plan: PedsPlan;
    if (v.kind === "well") {
      const given = new Set([...c.vaccinesGiven.map((g) => g.cvx), ...v.p.immunizations.filter((i) => daysBefore(i.date, b.day) < 120).map((i) => i.cvx)]);
      const due = vaccinesForAge(ageDays).filter((x) => !given.has(x));
      const imms = seasonFlu ? [...due, CVX.flu] : due;
      plan = {
        orders: vr.chance(0.15) ? [peds.acetaminophen(kg)] : [],
        immunizations: imms,
        notes: ["growthChart", "development", "anticipatoryGuidance", "exam", "assessmentPlan", ...(imms.length > 0 ? ["visGiven"] : [])],
        recheckInDays: null,
        reason: "well-child",
      };
    } else if (v.kind === "flu-shot") {
      plan = { orders: [], immunizations: seasonFlu ? [CVX.flu] : [], notes: ["visGiven"], recheckInDays: null, reason: "flu-shot" };
    } else if (v.kind === "recheck") {
      // Treatment failure on amoxicillin for otitis: one IM ceftriaxone dose by today's weight.
      const failure = v.reason.includes("otitis") && vr.chance(0.35);
      plan = {
        orders: failure ? [peds.ceftriaxoneIm(kg)] : [],
        immunizations: [],
        notes: ["hpi", "exam", "assessmentPlan", "weightComparison"],
        recheckInDays: null,
        reason: `recheck ${v.reason}`,
      };
    } else {
      plan = sickPlan(v.p, kg, vr, b.ctx.fluWeek);
    }
    for (const cvx of plan.immunizations) c.vaccinesGiven.push({ cvx, day: b.day });
    c.lastVisitDay = b.day;
    const taskId = b.peekTaskId("P4", "W5");
    b.addTask(
      "P4",
      "W5",
      v.p.id,
      start,
      { orders: plan.orders, immunizations: plan.immunizations, noteSections: plan.notes },
      [weightObservation(`${taskId}-weight`, v.p.id, b.day, 8 * 60 + start, kg, "kg")],
      b.interruptions("P4", vr),
    );
    if (plan.recheckInDays !== null) addAppointment(b, "P4", v.p.id, b.day + plan.recheckInDays, "recheck", plan.reason, taskId);
    seen++;
  });
  b.state.today.clinics.P4 = { booked: visits.length, seen, noShows, addOns: visits.filter((v) => v.reason === "same-day sick").map((v) => v.p.id), newPatients: 0 };
}
