/**
 * P5, general surgeon (W6 + the post-op W1 variant). Alternates clinic days
 * (odd days) and OR days (even days). Urgent consults from the ED are operated
 * the next day as an add-on case, whatever the day type:
 *
 *   P2 consult (day c) -> P5 consult + admit -> P3 census (c+1) -> OR (c+1)
 *   -> P3 gives post-op meds -> P5 rounds -> P5 discharges
 *   -> P5 post-op clinic visit + P1 follow-up.
 *
 * W6 task kinds are told apart by their first note section: consultNote,
 * hAndPUpdate (pre-op), briefOpNote (op note + post-op order set),
 * progressNote (rounding), medRec (discharge).
 */
import { type DayBuild, type PopIndex, isPcnAllergic } from "../build";
import { SHIFTS } from "../calendar";
import { homeOrder, inpatientHomeMeds, isDiabetic, nsaidOk, opioidTolerant, prn, surgicalProphylaxis } from "../clinical";
import { controlledNotes } from "../controlled";
import { p5DayType } from "../context";
import { imagingReport, labObservation, surgicalConsent, weightObservation } from "../fhir";
import { order } from "../formulary";
import type { PatientProfile } from "../patients";
import { anticoagulant, homeMed } from "../patients";
import type { Rng } from "../rng";
import type { Json, OrderChoice } from "../schema";
import type { CaseDiagnosis, Inpatient, SurgicalCase } from "../state";
import { activeOrders, addPendingLab, admit, canAdmit, dischargeInpatient, dischargeSameDay, isInpatient, labValue, setRegimen } from "./common";

const P5_START = SHIFTS.P5.startClock;
const toClock = (m: number) => P5_START + m;
const toMin = (clock: number) => clock - P5_START;

/** Elective cases per OR day: 3, fewer for tiny test populations. */
export function electiveCap(pop: PopIndex): number {
  return Math.min(3, Math.max(1, Math.floor(pop.adults.length / 4)));
}

/** A patient can be booked if they have no open case and have not already had this procedure. */
export function canBook(cases: SurgicalCase[], patientId: string, procedure?: string): boolean {
  return !cases.some((c) => c.patientId === patientId && (c.stage !== "discharged" || (procedure !== undefined && c.procedure === procedure)));
}

export const PROCEDURES: Record<CaseDiagnosis, { procedure: string; durationMin: number; disposition: "overnight" | "same-day" | "either" }> = {
  appendicitis: { procedure: "laparoscopic appendectomy", durationMin: 70, disposition: "overnight" },
  "acute-cholecystitis": { procedure: "laparoscopic cholecystectomy", durationMin: 95, disposition: "overnight" },
  "symptomatic-cholelithiasis": { procedure: "laparoscopic cholecystectomy", durationMin: 85, disposition: "either" },
  "inguinal-hernia": { procedure: "laparoscopic inguinal hernia repair", durationMin: 70, disposition: "same-day" },
  "umbilical-hernia": { procedure: "open umbilical hernia repair", durationMin: 50, disposition: "same-day" },
};

function holdNotes(p: PatientProfile, reason: string): string[] {
  const ac = anticoagulant(p);
  return ac === undefined ? [] : [`hold:${ac.drug}:${reason}`];
}

/** Post-op order set (overnight) or PACU/discharge set (same-day). */
export function postopOrders(p: PatientProfile, kg: number, c: SurgicalCase): { orders: OrderChoice[]; holds: string[] } {
  const oxyMg = opioidTolerant(p) ? 10 : 5;
  if (c.disposition === "same-day") {
    const orders = [order("acetaminophen", 1000, "mg", "PO", "q6h", { prn: true }), ...(nsaidOk(p) ? [prn.ibuprofen()] : []), prn.oxycodonePO(oxyMg, "q6h"), order("ondansetron", 4, "mg", "PO", "q6h", { prn: true })];
    return { orders, holds: [] };
  }
  const home = inpatientHomeMeds(p, kg, { holdAnticoag: true, holdAntihypertensive: false });
  const vte = p.tags.includes("ckd") || p.ageYears >= 80 ? order("heparin", 5000, "units", "SC", "q8h") : order("enoxaparin", 40, "mg", "SC", "daily");
  const orders: OrderChoice[] = [
    order("acetaminophen", 1000, "mg", "PO", "q6h"),
    ...(nsaidOk(p) ? [prn.ibuprofen()] : []),
    prn.oxycodonePO(oxyMg),
    prn.hydromorphoneIV(),
    prn.ondansetronIV(),
    vte,
    ...(c.complicated ? [order("ceftriaxone", 2000, "mg", "IV", "q24h", { indication: "intra-abdominal-infection" })] : []),
    ...home.orders,
  ];
  return { orders, holds: [...home.holds.filter((h) => !h.startsWith("hold:warfarin") && !h.startsWith("hold:apixaban")), ...holdNotes(p, "postop-bleeding-risk")] };
}

/** Post-op discharge opioid: oxycodone (hydromorphone for some), higher dose if opioid-tolerant. */
function dischargeOpioid(p: PatientProfile, rng: Rng): OrderChoice {
  if (opioidTolerant(p)) return prn.oxycodonePO(10);
  return rng.chance(0.8) ? prn.oxycodonePO(5) : prn.hydromorphonePO();
}

/** Post-surgical opioid supply: mostly <= 5 days (CURES-exempt), some 7 days. */
function postopSupplyDays(rng: Rng): number {
  return rng.weighted<number>([
    [3, 5],
    [5, 3],
    [7, 2],
  ]);
}

/** Discharge prescriptions after surgery, plus home meds resumed. */
function dischargeRx(p: PatientProfile, rng: Rng): OrderChoice[] {
  const out: OrderChoice[] = [order("acetaminophen", 1000, "mg", "PO", "q6h", { prn: true }), ...(nsaidOk(p) ? [prn.ibuprofen()] : []), dischargeOpioid(p, rng)];
  for (const drug of ["warfarin", "apixaban", "metformin"] as const) {
    const m = homeMed(p, drug);
    if (m !== undefined) out.push(homeOrder(m));
  }
  return out;
}

/**
 * Called by the ED flow when P2 consults surgery: creates the case (OR
 * tomorrow), P5's consult task, and the surgical admission.
 */
export function createUrgentCase(b: DayBuild, p: PatientProfile, dx: CaseDiagnosis, edClock: number, edTaskId: string, kg: number, _pcn: boolean, rng: Rng): SurgicalCase {
  const id = b.nextId("case");
  const complicated = rng.chance(dx === "appendicitis" ? 0.2 : 0.15);
  const c: SurgicalCase = {
    id,
    patientId: p.id,
    diagnosis: dx,
    procedure: PROCEDURES[dx].procedure,
    urgency: "urgent",
    bookedDay: b.day,
    consultDay: b.day,
    consultClock: Math.min(toClock(SHIFTS.P5.lengthMin - 20), edClock + rng.int(60, 120)),
    edTaskId,
    orDay: b.day + 1,
    orStartClock: null,
    orEndClock: null,
    disposition: "overnight",
    complicated,
    admissionId: null,
    dischargeDay: null,
    stage: "consulted",
    postopVisitDay: null,
    p1FollowupDay: null,
  };
  b.state.surgicalCases.push(c);
  b.state.today.surgery.consults.push(id);

  const clock = c.consultClock ?? edClock;
  const home = inpatientHomeMeds(p, kg, { holdAnticoag: true, holdAntihypertensive: false });
  const regimen: OrderChoice[] = [
    prn.morphineIV(4),
    prn.ondansetronIV(),
    prn.acetaminophen(),
    ...(anticoagulant(p) === undefined ? [order("heparin", 5000, "units", "SC", "q8h")] : []),
    ...home.orders,
  ];
  const taskId = b.peekTaskId("P5", "W6");
  const study = dx === "appendicitis" ? "CT abdomen and pelvis with IV contrast" : "Ultrasound right upper quadrant";
  const conclusion = dx === "appendicitis" ? (complicated ? "Acute appendicitis with periappendiceal fluid" : "Acute appendicitis without perforation") : "Acute calculous cholecystitis";
  const resources: Json[] = [
    imagingReport(`${taskId}-imaging`, p.id, b.day, edClock + 45, study, conclusion, dx === "appendicitis" ? "85189001" : "65275009"),
    labObservation(`${taskId}-wbc`, p.id, b.day, edClock + 20, "wbc", labValue(rng, "wbc", true).value, "H"),
  ];
  b.addTask(
    "P5",
    "W6",
    p.id,
    toMin(clock),
    { orders: regimen, disposition: "admit", noteSections: ["consultNote", "imagingReview", "labReview", "surgicalDecision", ...home.holds] },
    resources,
    b.interruptions("P5", rng),
  );
  const ip = admit(
    b,
    {
      patient: p,
      clock: clock + 60,
      service: "surgery",
      source: "surgical-consult",
      diagnosis: dx === "appendicitis" ? "acute appendicitis" : "acute cholecystitis",
      losNights: 1 + (complicated ? rng.int(2, 3) : 1),
      regimen,
      regimenSource: `P5 consult orders ${taskId}`,
      prnPerShift: 1.5,
      caseId: id,
      fromTaskId: taskId,
      weightKg: kg,
      diabetic: isDiabetic(p),
    },
    rng,
  );
  c.admissionId = ip.admissionId;
  b.log(`surgical consult ${id}: ${p.id} ${dx} (ED ${edTaskId}) -> OR day ${c.orDay}`);
  return c;
}

/** Next OR day >= `from` with elective capacity left. */
export function nextElectiveSlot(cases: SurgicalCase[], from: number, cap: number): number {
  let d = from;
  while (p5DayType(d) !== "or" || cases.filter((c) => c.orDay === d && c.urgency === "elective").length >= cap) d++;
  return d;
}

export function electiveDiagnosis(p: PatientProfile, rng: Rng): CaseDiagnosis {
  return rng.weighted<CaseDiagnosis>([
    ["symptomatic-cholelithiasis", p.tags.includes("cholecystectomy") ? 0 : p.tags.includes("cholelithiasis") ? 12 : 4],
    ["inguinal-hernia", p.gender === "male" ? 4 : 1],
    ["umbilical-hernia", 2],
  ]);
}

export function bookElective(b: DayBuild, p: PatientProfile, dx: CaseDiagnosis, orDay: number, rng: Rng): SurgicalCase {
  const def = PROCEDURES[dx];
  const disposition = def.disposition === "either" ? (rng.chance(0.35) ? "overnight" : "same-day") : def.disposition;
  const c: SurgicalCase = {
    id: b.nextId("case"),
    patientId: p.id,
    diagnosis: dx,
    procedure: def.procedure,
    urgency: "elective",
    bookedDay: b.day,
    consultDay: null,
    consultClock: null,
    edTaskId: null,
    orDay,
    orStartClock: null,
    orEndClock: null,
    disposition,
    complicated: false,
    admissionId: null,
    dischargeDay: null,
    stage: "booked",
    postopVisitDay: null,
    p1FollowupDay: null,
  };
  b.state.surgicalCases.push(c);
  return c;
}

function surgicalInpatientsAtStart(b: DayBuild): Inpatient[] {
  return b.state.inpatients
    .filter((ip) => ip.service === "surgery" && ip.admitDay < b.day && ip.plannedDischargeDay >= b.day)
    .sort((x, y) => (x.room < y.room ? -1 : 1));
}

function dischargeTask(b: DayBuild, ip: Inpatient, startMin: number, rng: Rng): void {
  const p = b.patient(ip.patientId);
  const taskId = b.peekTaskId("P5", "W6");
  const rx = dischargeRx(p, rng);
  const notes = ["medRec", "dischargeInstructions", "followUp", ...controlledNotes(rx, postopSupplyDays(rng), p.homeMeds, rng)];
  b.addTask("P5", "W6", p.id, startMin, { orders: rx, noteSections: notes }, [], b.interruptions("P5", rng));
  const rec = dischargeInpatient(b, ip, toClock(startMin) + 60, taskId, rng);
  const c = b.state.surgicalCases.find((x) => x.id === ip.caseId);
  if (c !== undefined) {
    c.stage = "discharged";
    c.dischargeDay = b.day;
    const appts = b.state.appointments.filter((a) => rec.followUps.includes(a.id));
    c.postopVisitDay = appts.find((a) => a.persona === "P5")?.day ?? null;
    c.p1FollowupDay = appts.find((a) => a.persona === "P1")?.day ?? null;
  }
}

/** P5's day: rounds, OR cases, discharges, clinic, light in-basket. Must run after the ED flow. */
export function runSurgery(b: DayBuild): void {
  const rng = b.rng("surgery");
  const isOr = b.ctx.p5DayType === "or";
  let t = 15;

  // 1. Rounds on surgical inpatients (06:45 onward).
  const rounds = surgicalInpatientsAtStart(b);
  const toDischarge: Inpatient[] = [];
  for (const ip of rounds) {
    const c = b.state.surgicalCases.find((x) => x.id === ip.caseId);
    const operated = c !== undefined && c.orDay < b.day && c.stage === "operated";
    const notes = ["progressNote", "overnightEvents", "labReview"];
    let changes: OrderChoice[] = [];
    if (operated) {
      const current = activeOrders(ip, b.day, toClock(t));
      if (current.some((o) => o.drug === "hydromorphone" && o.route === "IV")) {
        // POD1: stop IV opioid; oral oxycodone (already on the order set) covers pain.
        const oxy = prn.oxycodonePO(opioidTolerant(b.patient(ip.patientId)) ? 10 : 5);
        const next = [...current.filter((o) => !(o.drug === "hydromorphone" && o.route === "IV") && o.drug !== "oxycodone"), oxy];
        changes = [oxy];
        setRegimen(ip, b.day, toClock(t + 5), "P5 rounding: stop IV opioid", next);
      }
    } else {
      notes.push("preopPlan");
    }
    b.addTask("P5", "W6", ip.patientId, t, { orders: changes, noteSections: notes }, [], b.interruptions("P5", rng, 0.5));
    t += 8;
    if (operated && ip.plannedDischargeDay === b.day) toDischarge.push(ip);
  }

  // 2. Clinic days: discharges right after rounds.
  if (!isOr) {
    for (const ip of toDischarge) {
      dischargeTask(b, ip, t, rng);
      t += 10;
    }
  }

  // 3. OR cases: urgent add-ons first, then electives.
  const today = b.state.surgicalCases
    .filter((c) => c.orDay === b.day && (c.stage === "booked" || c.stage === "consulted"))
    .sort((x, y) => (x.urgency === y.urgency ? (x.id < y.id ? -1 : 1) : x.urgency === "urgent" ? -1 : 1));
  let caseStart = Math.max(toClock(t + 30), isOr ? 7 * 60 + 30 : 7 * 60 + 15);
  let lastCaseEnd = toClock(t);
  let firstCaseEnd: number | null = null;
  for (const c of today) {
    const p = b.patient(c.patientId);
    const ownIp = b.state.inpatients.find((ip) => ip.patientId === p.id && ip.caseId === c.id && ip.plannedDischargeDay >= b.day);
    if (ownIp === undefined && isInpatient(b, p.id)) {
      const other = b.state.inpatients.find((ip) => ip.patientId === p.id && ip.plannedDischargeDay >= b.day);
      c.orDay = nextElectiveSlot(b.state.surgicalCases, (other?.plannedDischargeDay ?? b.day) + 2, electiveCap(b.pop));
      b.log(`case ${c.id} postponed to day ${c.orDay}: patient ${p.id} is an inpatient`);
      continue;
    }
    if (!isOr && c.urgency === "elective") continue;
    if (ownIp === undefined && c.disposition === "overnight" && !canAdmit(b)) {
      c.disposition = "same-day";
      b.log(`no ward bed: ${c.id} ${c.procedure} done as same-day surgery`);
    }
    const crng = rng.fork(c.id);
    const kg = ownIp?.weightKg ?? Math.round(p.weightKg * (1 + crng.normal(0, 0.01)) * 10) / 10;
    const pcn = isPcnAllergic(p);
    const dur = PROCEDURES[c.diagnosis].durationMin + crng.int(-10, 20);
    const start = caseStart;
    const end = start + dur;
    c.orStartClock = start;
    c.orEndClock = end;
    c.stage = "operated";
    b.state.today.surgery.casesOperated.push(c.id);

    // Pre-op (H&P update, consent, anticoagulant and allergy review, prophylaxis).
    const preId = b.peekTaskId("P5", "W6");
    const preOrders = [surgicalProphylaxis(kg, pcn), ...(c.disposition === "overnight" && anticoagulant(p) === undefined && ownIp === undefined ? [order("heparin", 5000, "units", "SC", "once")] : [])];
    b.addTask(
      "P5",
      "W6",
      p.id,
      toMin(start - 25),
      { orders: preOrders, noteSections: ["hAndPUpdate", "consentVerification", "allergyReview", "anticoagulantReview", ...holdNotes(p, "preop")] },
      [surgicalConsent(`${preId}-consent`, p.id, c.bookedDay, 10 * 60, c.procedure), weightObservation(`${preId}-weight`, p.id, b.day, start - 60, kg, "kg")],
      b.interruptions("P5", crng, 0.5),
    );

    // Brief op note + post-op order set.
    const post = postopOrders(p, kg, c);
    const postId = b.peekTaskId("P5", "W6");
    b.addTask("P5", "W6", p.id, toMin(end + 5), { orders: post.orders, noteSections: ["briefOpNote", "postOpOrders", ...post.holds] }, [], b.interruptions("P5", crng, 0.5));
    const pathAbnormal = c.diagnosis === "appendicitis" || c.diagnosis === "acute-cholecystitis" || c.diagnosis === "symptomatic-cholelithiasis";
    addPendingLab(b, {
      patientId: p.id,
      lab: "pathology",
      resultDay: b.day + 2,
      recipient: "P5",
      source: `case ${c.id}`,
      result: { value: 0, interpretation: pathAbnormal ? "A" : "N" },
      text:
        c.diagnosis === "appendicitis"
          ? "Appendix: acute suppurative appendicitis"
          : c.diagnosis.includes("chole")
            ? "Gallbladder: chronic cholecystitis with cholelithiasis"
            : "Hernia sac: fibroadipose tissue, no malignancy",
    });

    if (ownIp !== undefined) {
      ownIp.offWard.push({ day: b.day, fromClock: start - 45, toClock: end + 60 });
      ownIp.npo.push({ day: b.day, untilClock: end + 60 });
      setRegimen(ownIp, b.day, end + 60, `post-op order set ${postId}`, post.orders);
      ownIp.prnPerShift = 2;
    } else if (c.disposition === "overnight") {
      const ip = admit(
        b,
        {
          patient: p,
          clock: end + 90,
          service: "surgery",
          source: "postop",
          diagnosis: `s/p ${c.procedure}`,
          losNights: 1,
          regimen: post.orders,
          regimenSource: `post-op order set ${postId}`,
          prnPerShift: 1.5,
          caseId: c.id,
          fromTaskId: postId,
          weightKg: kg,
          diabetic: isDiabetic(p),
        },
        crng,
      );
      c.admissionId = ip.admissionId;
    } else {
      const dcMin = toMin(end + 110);
      const dcId = b.peekTaskId("P5", "W6");
      const sameDayNotes = ["medRec", "dischargeInstructions", "followUp", ...controlledNotes(post.orders, 3, p.homeMeds, crng)];
      b.addTask("P5", "W6", p.id, dcMin, { orders: post.orders, noteSections: sameDayNotes }, [], b.interruptions("P5", crng, 0.5));
      const rec = dischargeSameDay(b, p.id, c.id, c.procedure, end + 120, dcId, crng);
      c.stage = "discharged";
      c.dischargeDay = b.day;
      c.postopVisitDay = b.state.appointments.find((a) => rec.followUps.includes(a.id) && a.persona === "P5")?.day ?? null;
    }
    b.log(`OR ${c.id}: ${c.procedure} for ${p.id} ${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`);
    firstCaseEnd ??= end;
    lastCaseEnd = end;
    caseStart = end + 30;
  }

  // 4. OR days: discharges between cases (after the first case) or after rounds.
  if (isOr) {
    let m = firstCaseEnd !== null ? toMin(firstCaseEnd) + 15 : t;
    for (const ip of toDischarge) {
      dischargeTask(b, ip, m, rng);
      m += 10;
    }
  }

  // 5. Clinic days: post-op checks, new elective consults, follow-ups.
  if (!isOr) runP5Clinic(b, Math.max(90, toMin(lastCaseEnd) + 20), rng.fork("clinic"));
  else b.state.today.clinics.P5 = { booked: 0, seen: 0, noShows: [], addOns: [], newPatients: 0 };

  // 6. Light in-basket: pathology results.
  const arrived = b.state.pendingLabs.filter((l) => l.recipient === "P5" && l.resultDay <= b.day);
  let m = SHIFTS.P5.lengthMin - 45;
  for (const lab of arrived) {
    b.addTask(
      "P5",
      "W2",
      lab.patientId,
      m,
      { ackResult: true, noteSections: ["resultNote", "patientMessage"] },
      [labObservation(`${lab.id}-result`, lab.patientId, lab.resultDay, 8 * 60, lab.lab, lab.value, lab.interpretation, lab.text ?? undefined)],
      b.interruptions("P5", rng, 0.3),
    );
    m += 6;
  }
  b.state.pendingLabs = b.state.pendingLabs.filter((l) => !arrived.includes(l));
  b.state.today.inBasket.P5 = { arrived: arrived.length, handled: arrived.length };
}

function runP5Clinic(b: DayBuild, startMin: number, rng: Rng): void {
  const vol = b.ctx.personaVolume.P5;
  const target = Math.max(9, Math.min(15, Math.round(12 * vol) + rng.int(-1, 1)));
  const fixed = b.state.appointments.filter((a) => a.persona === "P5" && a.day === b.day);
  const slots: number[] = [];
  for (let m = startMin; m <= SHIFTS.P5.lengthMin - 60; m += 25) {
    if (m >= 330 && m < 390) continue; // lunch 12:00-13:00
    slots.push(m);
  }
  const noShows: string[] = [];
  let seen = 0;
  let newPatients = 0;
  let slotIdx = 0;
  const nextSlot = (): number => {
    const s = slots[slotIdx] ?? (slots[slots.length - 1] ?? startMin) + 10 * (slotIdx - slots.length + 1);
    slotIdx++;
    return s;
  };

  for (const a of fixed) {
    b.picker.use(a.patientId);
    if (isInpatient(b, a.patientId)) {
      a.day = b.day + 2;
      a.rescheduledFrom.push(b.day);
      continue;
    }
    if (rng.chance(0.05)) {
      noShows.push(a.patientId);
      continue;
    }
    const path = b.state.surgicalCases.some((c) => c.patientId === a.patientId && c.stage === "discharged");
    const orders = rng.chance(0.25) ? [order("acetaminophen", 650, "mg", "PO", "q6h", { prn: true })] : [];
    b.addTask("P5", "W1", a.patientId, nextSlot(), { orders, noteSections: ["postOpCheck", "woundCheck", ...(path ? ["pathologyReview"] : []), "assessmentPlan"] }, [], b.interruptions("P5", rng));
    seen++;
  }
  b.state.appointments = b.state.appointments.filter((a) => !(a.persona === "P5" && a.day === b.day));

  while (seen < target) {
    const isNew = rng.chance(0.3);
    const p = isNew
      ? (b.picker.pick(rng, (q) => q.ageYears >= 25 && q.ageYears <= 85 && canBook(b.state.surgicalCases, q.id)) ?? b.picker.pick(rng, (q) => q.ageYears >= 25 && q.ageYears <= 85))
      : b.picker.pick(rng, (q) => q.ageYears >= 25 && q.ageYears <= 85);
    if (p === undefined) break;
    const dx = electiveDiagnosis(p, rng);
    if (isNew && canBook(b.state.surgicalCases, p.id, PROCEDURES[dx].procedure)) {
      // About two thirds of new surgical consults are booked; the rest choose watchful waiting.
      const book = rng.chance(0.65);
      const orDay = nextElectiveSlot(b.state.surgicalCases, b.day + 4, electiveCap(b.pop));
      const c = book ? bookElective(b, p, dx, orDay, rng) : null;
      b.addTask(
        "P5",
        "W1",
        p.id,
        nextSlot(),
        { noteSections: c !== null ? ["hpi", "exam", "imagingReview", "assessmentPlan", "surgicalPlanning", "consentDiscussion", ...holdNotes(p, "planned-surgery")] : ["hpi", "exam", "imagingReview", "assessmentPlan"] },
        [],
        b.interruptions("P5", rng),
      );
      if (c !== null) b.log(`P5 clinic: booked ${c.id} ${c.procedure} for ${p.id} on day ${orDay}`);
      newPatients++;
    } else {
      b.addTask("P5", "W1", p.id, nextSlot(), { noteSections: ["hpi", "exam", "assessmentPlan"] }, [], b.interruptions("P5", rng));
    }
    seen++;
  }
  b.state.today.clinics.P5 = { booked: fixed.length + (seen - fixed.length + noShows.length), seen, noShows, addOns: [], newPatients };
}
