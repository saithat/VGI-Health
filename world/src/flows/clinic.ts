/**
 * P1, primary care physician: a clinic day of 16-20 W1 visits (established,
 * new, follow-ups after discharges and ED visits, same-day add-ons; minus
 * no-shows), plus W2 results and W7 refill requests in bursts before clinic,
 * at lunch, and after clinic. Day 5 is the scripted urgent-care day: walk-in
 * acute visits, mostly new patients, and the inbox mostly waits.
 *
 * The inbox backlog is world-determined (a fixed handling capacity per
 * burst), so it does not depend on how fast the UI lets P1 work.
 */
import { workflowPlan } from "../workflows";
import { type DayBuild, isPcnAllergic } from "../build";
import { homeOrder, isDiabetic, nsaidOk, prn } from "../clinical";
import { controlledPrescriptions, hasChronicOpioid } from "../controlled";
import { criticalResultObservation, labObservation, refillTask, type LabKey, type ClinicalObservation } from "../fhir";
import { drugDef, isBenzodiazepine, isControlled, isOpioid, order, serviceOrder } from "../formulary";
import type { HomeMed, PatientProfile } from "../patients";
import { homeMed } from "../patients";
import type { Rng } from "../rng";
import { INBOX_RANDOM_STREAM } from "../seed-contract";
import type { Json, OrderChoice } from "../schema";
import type { InboxItem, PendingLab, RefillRequest } from "../state";
import { addPendingLab, isInpatient, labValue, warfarinInr } from "./common";
import { type CaseMixMode, mixWeights, settingQualifies } from "../case-mix";

interface VisitPlan {
  /** Chronic focus or acute problem key (mix.mjs RULES); absent for new/follow-up visits. */
  kind?: string;
  orders: OrderChoice[];
  notes: string[];
  observations?: ClinicalObservation[];
  labs: { lab: LabKey; abnormalProb: number; followUp?: (abnormal: boolean) => OrderChoice[]; warfarin?: boolean }[];
}

const DOC = ["hpi", "ros", "exam", "assessmentPlan"];

// ---------- dose steps ----------

const STEPS: Partial<Record<string, readonly number[]>> = {
  lisinopril: [2.5, 5, 10, 20, 40],
  atorvastatin: [10, 20, 40, 80],
  warfarin: [1, 2, 2.5, 3, 4, 5, 6, 7.5, 10],
  oxycodone: [5, 10, 15, 20, 30],
  "hydrocodone-acetaminophen": [5, 7.5, 10],
  alprazolam: [0.25, 0.5, 1],
  lorazepam: [0.5, 1, 2],
};

function step(drug: string, dose: number, dir: 1 | -1): number {
  const s = STEPS[drug];
  if (s === undefined) return dose;
  let idx = s.findIndex((x) => x >= dose - 1e-9);
  if (idx < 0) idx = s.length - 1;
  const next = s[Math.max(0, Math.min(s.length - 1, idx + dir))];
  return next ?? dose;
}

function titrated(m: HomeMed, dir: 1 | -1): OrderChoice {
  if (m.drug === "metformin") {
    if (dir === 1) return m.freq === "daily" ? order("metformin", 500, "mg", "PO", "BID") : order("metformin", Math.min(1000, m.dose + 500), "mg", "PO", "BID");
    return order("metformin", 500, "mg", "PO", m.freq);
  }
  if (m.drug === "insulin glargine") return order("insulin glargine", Math.max(4, Math.round(m.dose * (dir === 1 ? 1.1 : 0.9))), "units", "SC", "daily");
  if (m.drug === "tramadol") return order("tramadol", 50, "mg", "PO", dir === 1 ? "q6h" : "q8h", { prn: true });
  return order(m.drug, step(m.drug, m.dose, dir), m.unit, m.route, m.freq, { prn: m.prn });
}

// ---------- visit plans ----------

function chronicFocus(p: PatientProfile, rng: Rng, caseMix: CaseMixMode = "legacy"): string {
  const options: string[] = [];
  if (hasChronicOpioid(p)) options.push("chronic-pain", "chronic-pain");
  if (p.tags.includes("htn")) options.push("htn");
  if (isDiabetic(p)) options.push("dm2");
  if (p.tags.includes("hld") || homeMed(p, "atorvastatin") !== undefined) options.push("hld");
  if (homeMed(p, "warfarin") !== undefined) options.push("warfarin");
  if (homeMed(p, "apixaban") !== undefined) options.push("apixaban");
  if (p.tags.includes("asthma") || p.tags.includes("copd")) options.push("respiratory");
  if (p.tags.includes("prediabetes") || p.tags.includes("obesity")) options.push("metabolic");
  if (options.length === 0) return "wellness";
  // Legacy picks uniformly (chronic pain listed twice); dataset mode weights each distinct focus.
  return caseMix === "legacy" || !settingQualifies("clinicChronic") ? rng.pick(options) : rng.weighted(mixWeights(caseMix, "clinicChronic", [...new Set(options)].map((o) => [o, 1] as const), (o) => o));
}

function chronicVisit(p: PatientProfile, focus: string, rng: Rng): VisitPlan {
  switch (focus) {
    case "htn": {
      const lis = homeMed(p, "lisinopril");
      const uncontrolled = rng.chance(0.35);
      const orders = uncontrolled ? [lis !== undefined ? titrated(lis, 1) : order("lisinopril", 10, "mg", "PO", "daily")] : lis !== undefined && rng.chance(0.4) ? [homeOrder(lis)] : [];
      return { orders, notes: [...DOC, ...(rng.chance(0.3) ? ["depressionScreen"] : [])], labs: rng.chance(0.6) ? [{ lab: "potassium", abnormalProb: 0.1 }, { lab: "creatinine", abnormalProb: 0.1 }] : [] };
    }
    case "dm2": {
      const met = homeMed(p, "metformin");
      const glar = homeMed(p, "insulin glargine");
      let orders: OrderChoice[] = [];
      if (rng.chance(0.45)) {
        if (met === undefined && glar === undefined) orders = [order("metformin", 500, "mg", "PO", "BID")];
        else if (met !== undefined && !(met.dose >= 1000 && met.freq === "BID")) orders = [titrated(met, 1)];
        else if (glar !== undefined) orders = [titrated(glar, 1)];
        else orders = [order("insulin glargine", Math.max(10, Math.round(p.weightKg * 0.1)), "units", "SC", "daily")];
      } else if (met !== undefined && rng.chance(0.4)) orders = [homeOrder(met)];
      return { orders, notes: [...DOC, "footExam"], labs: rng.chance(0.7) ? [{ lab: "a1c", abnormalProb: 0.65 }] : [] };
    }
    case "hld": {
      const ator = homeMed(p, "atorvastatin");
      const orders = ator === undefined ? (rng.chance(0.5) ? [order("atorvastatin", 20, "mg", "PO", "daily")] : []) : rng.chance(0.3) ? [titrated(ator, 1)] : rng.chance(0.4) ? [homeOrder(ator)] : [];
      return { orders, notes: DOC, labs: rng.chance(0.5) ? [{ lab: "ldl", abnormalProb: 0.45, followUp: (ab) => (ab && ator !== undefined ? [titrated(ator, 1)] : []) }] : [] };
    }
    case "warfarin": {
      const w = homeMed(p, "warfarin");
      const orders = w !== undefined && rng.chance(0.4) ? [homeOrder(w)] : [];
      return { orders, notes: [...DOC, "anticoagulationReview"], labs: rng.chance(0.9) ? [{ lab: "inr", abnormalProb: 0.4, warfarin: true }] : [] };
    }
    case "apixaban": {
      const a = homeMed(p, "apixaban");
      return { orders: a !== undefined && rng.chance(0.5) ? [homeOrder(a)] : [], notes: [...DOC, "anticoagulationReview"], labs: rng.chance(0.4) ? [{ lab: "creatinine", abnormalProb: 0.1 }, { lab: "hemoglobin", abnormalProb: 0.1 }] : [] };
    }
    case "respiratory":
      return { orders: rng.chance(0.6) ? [order("albuterol", 180, "mcg", "INH", "q4h", { prn: true })] : [], notes: [...DOC, "asthmaControlTest"], labs: [] };
    case "metabolic":
      return { orders: [], notes: [...DOC, "lifestyleCounseling"], labs: rng.chance(0.6) ? [{ lab: "a1c", abnormalProb: 0.3 }] : [] };
    case "chronic-pain": {
      // Monthly controlled-substance visit: renew the opioid (and benzodiazepine), sometimes taper.
      const controlled = p.homeMeds.filter((m) => isControlled(m.drug) && m.route === "PO");
      const taper = rng.chance(0.2);
      const orders = controlled.map((m) => (taper && isOpioid(m.drug) ? titrated(m, -1) : homeOrder(m)));
      orders.push(serviceOrder("imaging", "mri-lumbar-spine-without-contrast", "persistent-low-back-pain"), serviceOrder("procedure", "physical-therapy-evaluation", "persistent-low-back-pain"));
      return { orders, notes: [...DOC, "painAgreementReview", "functionalAssessment"], observations: controlledPrescriptions(orders, 30, p.homeMeds, rng), labs: [] };
    }
    default:
      return { orders: [], notes: [...DOC, "depressionScreen", "careGaps"], labs: rng.chance(0.5) ? [{ lab: rng.pick<LabKey>(["glucose", "tsh", "hemoglobin"]), abnormalProb: 0.15 }] : [] };
  }
}

/** Flu-week and urgent-care multipliers of the legacy weights (scenario; declared, uncited). */
function acuteFactor(kind: string, flu: boolean, urgentCare: boolean): number {
  if (flu && kind === "influenza-like") return 8;
  if (flu && kind === "cap-outpatient") return 3;
  if (urgentCare && kind === "ankle-sprain") return 4;
  return 1;
}

/** Same-day acute problems (add-ons and the urgent-care day). */
function acuteVisit(p: PatientProfile, rng: Rng, flu: boolean, urgentCare: boolean, caseMix: CaseMixMode = "legacy"): VisitPlan {
  const pcn = isPcnAllergic(p);
  const kind = rng.weighted<string>(mixWeights(caseMix, "clinicAcute", [
    ["sinusitis", 4],
    ["strep-pharyngitis", 3],
    ["bronchitis", 3],
    ["uri", 4],
    ["back-pain", 3],
    ["influenza-like", flu ? 8 : 1],
    ["cap-outpatient", flu ? 3 : 1],
    ["cellulitis", 2],
    ["ankle-sprain", urgentCare ? 4 : 1],
    ["laceration", urgentCare ? 3 : 0],
    ["dental-pain", urgentCare ? 1 : 0],
  ], (k) => k, (k) => acuteFactor(k, flu, urgentCare)));
  return { ...acutePlan(p, rng, kind, pcn, urgentCare), kind };
}

function acutePlan(p: PatientProfile, rng: Rng, kind: string, pcn: boolean, urgentCare: boolean): VisitPlan {
  const notes = [...DOC, ...(urgentCare ? ["urgentCareTriage"] : [])];
  switch (kind) {
    case "sinusitis":
      return { orders: [pcn ? order("azithromycin", 500, "mg", "PO", "daily", { indication: "acute-sinusitis" }) : order("amoxicillin", 875, "mg", "PO", "BID", { indication: "acute-sinusitis" })], notes, labs: [] };
    case "strep-pharyngitis":
      return { orders: [pcn ? order("azithromycin", 500, "mg", "PO", "daily", { indication: "strep-pharyngitis" }) : order("amoxicillin", 500, "mg", "PO", "BID", { indication: "strep-pharyngitis" })], notes, labs: [] };
    case "bronchitis":
      return { orders: [order("albuterol", 180, "mcg", "INH", "q4h", { prn: true })], notes, labs: [] };
    case "back-pain":
      return { orders: [nsaidOk(p) ? prn.ibuprofen() : prn.acetaminophen()], notes: [...notes, "neuroExam"], labs: [] };
    case "influenza-like":
      return { orders: [prn.acetaminophen()], notes, labs: [] };
    case "cap-outpatient":
      return { orders: [pcn ? order("azithromycin", 500, "mg", "PO", "daily", { indication: "community-acquired-pneumonia" }) : order("amoxicillin", 1000, "mg", "PO", "TID", { indication: "community-acquired-pneumonia" })], notes, labs: [] };
    case "cellulitis":
      return { orders: [pcn ? order("azithromycin", 500, "mg", "PO", "daily", { indication: "cellulitis" }) : order("amoxicillin", 500, "mg", "PO", "TID", { indication: "cellulitis" })], notes, labs: [] };
    case "ankle-sprain":
      return { orders: [nsaidOk(p) ? prn.ibuprofen() : prn.acetaminophen()], notes: [...notes, "imagingReview"], labs: [] };
    case "laceration":
      return { orders: [], notes: [...notes, "procedureNote"], labs: [] };
    case "dental-pain": {
      // Urgent-care opioid: a 3-day supply.
      const rx = [order("hydrocodone-acetaminophen", 5, "mg", "PO", "q6h", { prn: true })];
      return { orders: rx, notes, observations: controlledPrescriptions(rx, 3, p.homeMeds, rng), labs: [] };
    }
    default:
      return { orders: [], notes, labs: [] };
  }
}

function newPatientVisit(p: PatientProfile, rng: Rng): VisitPlan {
  // Transfer of care: repeat prescriptions for every chronic formulary med.
  const chronic = p.homeMeds.filter((m) => !m.prn || m.drug === "albuterol" || isControlled(m.drug));
  const orders = chronic.map(homeOrder);
  if (p.ageYears >= 50 && p.ageYears <= 75) orders.push(serviceOrder("procedure", "screening-colonoscopy", "colorectal-cancer-screening"));
  const labs: VisitPlan["labs"] = rng.chance(0.7) ? [{ lab: "a1c", abnormalProb: isDiabetic(p) ? 0.6 : 0.1 }, { lab: "ldl", abnormalProb: 0.35 }] : [];
  return { orders, notes: ["hpi", "pmh", "socialHistory", "familyHistory", "ros", "exam", "medRec", "assessmentPlan", "depressionScreen"], observations: controlledPrescriptions(orders, 30, p.homeMeds, rng), labs };
}

function followupVisit(p: PatientProfile, kind: string, rng: Rng): VisitPlan {
  if (kind === "ed-followup") return { orders: [], notes: ["hpi", "edRecordReview", "exam", "assessmentPlan"], labs: [] };
  const renewable = p.homeMeds.filter((m) => !m.prn && !isControlled(m.drug));
  const renew = renewable.length > 0 && rng.chance(0.5) ? [homeOrder(rng.pick(renewable))] : [];
  return { orders: renew, notes: ["hpi", "dischargeReview", "medRec", "exam", "assessmentPlan"], labs: rng.chance(0.4) ? [{ lab: "potassium", abnormalProb: 0.1 }, { lab: "creatinine", abnormalProb: 0.15 }] : [] };
}

function orderLabs(b: DayBuild, p: PatientProfile, plan: VisitPlan, rng: Rng, source: string): void {
  for (const l of plan.labs) {
    const abnormal = rng.chance(l.abnormalProb);
    let result = labValue(rng, l.lab, abnormal);
    let followUp: OrderChoice[] = l.followUp?.(abnormal) ?? [];
    if (l.warfarin === true) {
      const w = homeMed(p, "warfarin");
      const kind = !abnormal ? "therapeutic" : rng.chance(0.5) ? "high" : "low";
      result = warfarinInr(rng, kind);
      followUp = w !== undefined && kind !== "therapeutic" ? [titrated(w, kind === "high" ? -1 : 1)] : [];
    }
    if (l.lab === "a1c" && abnormal && result.value >= 8) {
      const met = homeMed(p, "metformin");
      if (met !== undefined && !(met.dose >= 1000 && met.freq === "BID")) followUp = [titrated(met, 1)];
    }
    addPendingLab(b, { patientId: p.id, lab: l.lab, resultDay: b.day + rng.int(1, 2), recipient: "P1", source, result, followUp });
  }
}

// ---------- the clinic day ----------

const AM_SLOTS = Array.from({ length: 12 }, (_, i) => 30 + i * 20); // 08:00-11:40
const PM_SLOTS = Array.from({ length: 12 }, (_, i) => 330 + i * 20); // 13:00-16:40

type Visit = { patient: PatientProfile; kind: "established" | "new" | "post-discharge" | "ed-followup" | "add-on"; noShow: boolean; source: string };

export function runP1(b: DayBuild): void {
  if (b.ctx.urgentCareDay) runUrgentCare(b);
  else runClinic(b);
  runInbox(b);
}

function runClinic(b: DayBuild): void {
  const rng = b.rng("p1-clinic");
  const load = b.ctx.personaLoad.P1;
  const target = load === "quiet" ? rng.int(16, 17) : load === "busy" ? rng.int(19, 20) : rng.int(17, 19);
  const panel = new Set(b.state.p1Panel);

  // Fixed appointments (follow-ups). Inpatients are rescheduled; extras beyond the day roll forward.
  const fixed = b.state.appointments.filter((a) => a.persona === "P1" && a.day === b.day).sort((x, y) => (x.id < y.id ? -1 : 1));
  const visits: Visit[] = [];
  for (const a of fixed) {
    if (isInpatient(b, a.patientId)) {
      const ip = b.state.inpatients.find((i) => i.patientId === a.patientId && i.plannedDischargeDay >= b.day);
      a.rescheduledFrom.push(a.day);
      a.day = Math.max(b.day + 1, (ip?.plannedDischargeDay ?? b.day) + 2);
      continue;
    }
    if (visits.length >= target - 1) {
      a.rescheduledFrom.push(a.day);
      a.day = b.day + 1;
      continue;
    }
    b.picker.use(a.patientId);
    visits.push({ patient: b.patient(a.patientId), kind: a.kind === "ed-followup" ? "ed-followup" : "post-discharge", noShow: rng.chance(0.05), source: a.id });
  }
  b.state.appointments = b.state.appointments.filter((a) => !(a.persona === "P1" && a.day === b.day));

  const seenFixed = visits.filter((v) => !v.noShow).length;
  let addOns = (b.ctx.monday ? rng.int(2, 4) : rng.int(0, 2)) + (b.ctx.fluWeek ? rng.int(1, 2) : 0);
  addOns = Math.max(0, Math.min(addOns, target - seenFixed));
  const routine = Math.max(0, target - seenFixed - addOns);
  const newShare = b.ctx.monday ? 0.15 : 0.12;

  // Routine booked visits; about 1 in 10 does not show.
  let routineSeen = 0;
  let guard = 0;
  while (routineSeen < routine && guard++ < 200) {
    const isNew = rng.chance(newShare);
    let p: PatientProfile | undefined;
    if (isNew) p = b.picker.pick(rng, (q) => q.ageYears >= 18 && !panel.has(q.id), b.ctx.allergyShare);
    const kind: Visit["kind"] = p !== undefined ? "new" : "established";
    p ??= b.picker.pick(rng, (q) => q.ageYears >= 18 && panel.has(q.id), b.ctx.allergyShare) ?? b.picker.pick(rng, (q) => q.ageYears >= 18);
    if (p === undefined) break;
    const noShow = rng.chance(0.1);
    visits.push({ patient: p, kind, noShow, source: "booked" });
    if (!noShow) routineSeen++;
  }

  // Assign booked visits to slots, then fill no-show gaps and open slots with add-ons.
  const slots = [...AM_SLOTS, ...PM_SLOTS];
  const order_ = rng.shuffle(visits.map((_, i) => i));
  const startOf = new Map<number, number>();
  order_.forEach((vi, k) => startOf.set(vi, slots[k] ?? (slots[slots.length - 1] ?? 30) + 10 * (k - slots.length + 1)));
  const free = slots.filter((s) => ![...startOf.entries()].some(([vi, t]) => t === s && visits[vi]?.noShow === false)).sort((x, y) => x - y);
  const addOnVisits: { v: Visit; start: number }[] = [];
  for (let k = 0; k < addOns; k++) {
    const p = b.picker.pick(rng, (q) => q.ageYears >= 18 && (rng.chance(0.75) ? panel.has(q.id) : true), b.ctx.allergyShare);
    if (p === undefined) break;
    const start = free[k] ?? (slots[k] ?? 30) + 10;
    addOnVisits.push({ v: { patient: p, kind: "add-on", noShow: false, source: "same-day" }, start });
  }

  const all = [...visits.map((v, i) => ({ v, start: startOf.get(i) ?? 30 })), ...addOnVisits].sort((x, y) => x.start - y.start || (x.v.patient.id < y.v.patient.id ? -1 : 1));
  const noShows: string[] = [];
  let newPatients = 0;
  for (const { v, start } of all) {
    if (v.noShow) {
      noShows.push(v.patient.id);
      continue;
    }
    const vr = rng.fork(`visit-${start}-${v.patient.id}`);
    let plan: VisitPlan;
    if (v.kind === "new") {
      plan = newPatientVisit(v.patient, vr);
      newPatients++;
      if (!b.state.p1Panel.includes(v.patient.id)) b.state.p1Panel.push(v.patient.id);
    } else if (v.kind === "post-discharge" || v.kind === "ed-followup") plan = followupVisit(v.patient, v.kind, vr);
    else if (v.kind === "add-on") plan = acuteVisit(v.patient, vr, b.ctx.fluWeek, false, b.caseMix);
    else {
      const focus = chronicFocus(v.patient, vr, b.caseMix);
      plan = { ...chronicVisit(v.patient, focus, vr), kind: focus };
    }
    const taskId = b.peekTaskId("P1", "W1");
    const task = b.addTask("P1", "W1", v.patient.id, start, { orders: plan.orders, noteSections: plan.notes, observations: plan.observations ?? [] }, [], b.interruptions("P1", vr));
    if (plan.kind !== undefined) b.visitKinds[task.id] = plan.kind;
    orderLabs(b, v.patient, plan, vr, `visit ${taskId}`);
  }
  b.state.today.clinics.P1 = { booked: visits.length, seen: all.length - noShows.length, noShows, addOns: addOnVisits.map((x) => x.v.patient.id), newPatients };
}

function runUrgentCare(b: DayBuild): void {
  const rng = b.rng("p1-urgent-care");
  const n = rng.int(18, 22);
  const panel = new Set(b.state.p1Panel);
  let newPatients = 0;
  const seenIds: string[] = [];
  for (let k = 0; k < n; k++) {
    const vr = rng.fork(`uc-${k}`);
    const wantNew = vr.chance(0.5);
    const p = (wantNew ? b.picker.pick(vr, (q) => q.ageYears >= 18 && !panel.has(q.id), b.ctx.allergyShare) : undefined) ?? b.picker.pick(vr, (q) => q.ageYears >= 18, b.ctx.allergyShare);
    if (p === undefined) break;
    const isNew = !panel.has(p.id);
    if (isNew) newPatients++;
    const plan = acuteVisit(p, vr, b.ctx.fluWeek, true, b.caseMix);
    const start = 30 + Math.round((k * 590) / n) + vr.int(0, 8);
    const task = b.addTask("P1", "W1", p.id, start, { orders: plan.orders, noteSections: isNew ? [...plan.notes, "pmh", "medRec"] : plan.notes, observations: plan.observations ?? [] }, [], b.interruptions("P1", vr, 1.3));
    if (plan.kind !== undefined) b.visitKinds[task.id] = plan.kind;
    seenIds.push(p.id);
  }
  b.state.today.clinics.P1 = { booked: 0, seen: seenIds.length, noShows: [], addOns: seenIds, newPatients };
  b.log(`P1 covers urgent care: ${seenIds.length} walk-ins, inbox deferred`);
}

// ---------- inbox: results (W2) and refill requests (W7) ----------

const REFILLABLE = new Set(["lisinopril", "metformin", "atorvastatin", "warfarin", "apixaban", "albuterol", "insulin glargine", "oxycodone", "hydrocodone-acetaminophen", "tramadol", "lorazepam", "alprazolam"]);

type RefillLab = RefillRequest["labs"][number];

function refillLabs(rng: Rng, keys: { lab: LabKey; abnormal: boolean; dir?: "H" | "L" }[]): RefillLab[] {
  return keys.map(({ lab, abnormal, dir }) => {
    const r = labValue(rng, lab, abnormal, dir);
    const interp: "H" | "L" | "N" = r.interpretation === "H" || r.interpretation === "L" ? r.interpretation : "N";
    return { lab, value: r.value, interpretation: interp, daysAgo: rng.int(20, 150) };
  });
}

/** Fixed clinical decision for a refill request, with the labs that justify it. */
export function decideRefill(m: HomeMed, rng: Rng, early: boolean): Pick<RefillRequest, "decision" | "modified" | "reason" | "labs"> {
  if (isControlled(m.drug)) {
    if (early) return { decision: "deny", modified: null, reason: "early-refill", labs: [] };
    const r = rng.next();
    if (r < 0.1) return { decision: "deny", modified: null, reason: "cures-multiple-prescribers", labs: [] };
    if (r < 0.25 && (isOpioid(m.drug) || isBenzodiazepine(m.drug))) return { decision: "modify", modified: titrated(m, -1), reason: "taper", labs: [] };
    return { decision: "approve", modified: null, reason: "stable-on-agreement", labs: [] };
  }
  switch (m.drug) {
    case "lisinopril": {
      const highK = rng.chance(0.1);
      const labs = refillLabs(rng, [{ lab: "potassium", abnormal: highK, dir: "H" }, { lab: "creatinine", abnormal: false }]);
      if (highK) return rng.chance(0.5) ? { decision: "deny", modified: null, reason: "hyperkalemia-needs-visit", labs } : { decision: "modify", modified: titrated(m, -1), reason: "hyperkalemia-dose-reduction", labs };
      if (rng.chance(0.1)) return { decision: "modify", modified: titrated(m, 1), reason: "bp-above-goal", labs };
      return { decision: "approve", modified: null, reason: "labs-ok", labs };
    }
    case "metformin": {
      const highA1c = rng.chance(0.3);
      const highCr = !highA1c && rng.chance(0.05);
      const labs = refillLabs(rng, [{ lab: "a1c", abnormal: highA1c }, { lab: "creatinine", abnormal: highCr }]);
      if (highCr) return { decision: "deny", modified: null, reason: "renal-function-needs-review", labs };
      if (highA1c && !(m.dose >= 1000 && m.freq === "BID")) return { decision: "modify", modified: titrated(m, 1), reason: "a1c-above-goal", labs };
      return { decision: "approve", modified: null, reason: "labs-ok", labs };
    }
    case "warfarin": {
      const kind = rng.weighted<"therapeutic" | "high" | "low">([
        ["therapeutic", 65],
        ["high", 20],
        ["low", 15],
      ]);
      const inr = warfarinInr(rng, kind);
      const labs: RefillLab[] = [{ lab: "inr", value: inr.value, interpretation: "H", daysAgo: rng.int(3, 20) }];
      if (kind === "therapeutic") return { decision: "approve", modified: null, reason: "inr-therapeutic", labs };
      return { decision: "modify", modified: titrated(m, kind === "high" ? -1 : 1), reason: `inr-${kind}`, labs };
    }
    case "atorvastatin": {
      const labs = refillLabs(rng, [{ lab: "ldl", abnormal: rng.chance(0.3) }]);
      const r = rng.next();
      if (r < 0.1) return { decision: "deny", modified: null, reason: "overdue-annual-visit", labs };
      if (r < 0.15) return { decision: "modify", modified: titrated(m, 1), reason: "ldl-above-goal", labs };
      return { decision: "approve", modified: null, reason: "labs-ok", labs };
    }
    case "apixaban": {
      const lowHgb = rng.chance(0.1);
      const labs = refillLabs(rng, [{ lab: "creatinine", abnormal: false }, { lab: "hemoglobin", abnormal: lowHgb, dir: "L" }]);
      return lowHgb ? { decision: "deny", modified: null, reason: "anemia-evaluate-bleeding", labs } : { decision: "approve", modified: null, reason: "labs-ok", labs };
    }
    case "insulin glargine": {
      const highA1c = rng.chance(0.3);
      const labs = refillLabs(rng, [{ lab: "a1c", abnormal: highA1c }, { lab: "glucose", abnormal: highA1c }]);
      return highA1c ? { decision: "modify", modified: titrated(m, 1), reason: "a1c-above-goal", labs } : { decision: "approve", modified: null, reason: "labs-ok", labs };
    }
    case "albuterol":
      return rng.chance(0.2) ? { decision: "deny", modified: null, reason: "overuse-needs-asthma-visit", labs: [] } : { decision: "approve", modified: null, reason: "ok", labs: [] };
    default:
      return { decision: "approve", modified: null, reason: "ok", labs: [] };
  }
}

function generateRefills(b: DayBuild, rng: Rng, target?: number): InboxItem[] {
  const vol = b.ctx.personaVolume.P1;
  const n = target ?? Math.max(2, Math.min(12, rng.poisson(5 * vol * (b.ctx.monday ? 1.6 : 1))));
  const pending = new Set(b.state.inboxBacklog.filter((i) => i.refill !== null).map((i) => `${i.patientId}|${i.refill?.current.drug ?? ""}`));
  const pairs: { p: PatientProfile; m: HomeMed }[] = [];
  for (const id of b.state.p1Panel) {
    const p = b.pop.byId.get(id);
    if (p === undefined || isInpatient(b, id)) continue;
    for (const m of p.homeMeds) if (REFILLABLE.has(m.drug) && !pending.has(`${id}|${m.drug}`)) pairs.push({ p, m });
  }
  const items: InboxItem[] = [];
  const make = (p: PatientProfile, m: HomeMed, early: boolean, r: Rng): void => {
    const d = decideRefill(m, r, early);
    const req: RefillRequest = {
      id: b.nextId("rx"),
      patientId: p.id,
      requestedDay: b.day,
      current: homeOrder(m),
      decision: d.decision,
      modified: d.modified,
      reason: d.reason,
      labs: d.labs,
      lastFilledDaysAgo: early ? r.int(14, 22) : r.int(26, 34),
    };
    pending.add(`${p.id}|${m.drug}`);
    items.push({ id: b.nextId("item"), kind: "refill", patientId: p.id, arrivedDay: b.day, priority: 1, lab: null, refill: req });
  };
  // Controlled substances are filled monthly: each chronic patient's fill comes due on a fixed day of the cycle.
  for (const { p, m } of pairs) {
    if (!isControlled(m.drug)) continue;
    const r = rng.fork(`controlled-${p.id}-${m.drug}`);
    const dueDay = 1 + (Math.abs(hashCode(`${b.state.seed}|${p.id}|${m.drug}`)) % 10);
    if (b.day === dueDay || b.day === dueDay + 30) make(p, m, false, r);
    else if (r.chance(0.04)) make(p, m, true, r);
  }
  const routine = rng.shuffle(pairs.filter(({ p, m }) => !isControlled(m.drug) && !pending.has(`${p.id}|${m.drug}`)));
  for (const { p, m } of routine.slice(0, target === undefined ? n : Math.max(0, n - items.length))) make(p, m, false, rng.fork(`refill-${p.id}-${m.drug}`));
  return items;
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

function resultTask(b: DayBuild, lab: PendingLab, start: number, rng: Rng): void {
  const abnormal = lab.interpretation !== "N";
  const notes = abnormal ? ["resultNote", "patientMessage"] : rng.chance(0.6) ? ["patientMessage"] : [];
  const firstResult = !b.tasks.P1.some((task) => task.workflow === "W2");
  b.addTask(
    "P1",
    "W2",
    lab.patientId,
    start,
    { ackResult: true, orders: lab.followUp, noteSections: notes },
    [labObservation(`${lab.id}-result`, lab.patientId, lab.resultDay, 7 * 60 + 15, lab.lab, lab.value, lab.interpretation, lab.text ?? undefined),
      ...(firstResult ? [criticalResultObservation(`${lab.id}-critical`, lab.patientId, b.day, start)] : [])],
    b.interruptions("P1", rng, 0.5),
  );
}

function refillTaskFor(b: DayBuild, req: RefillRequest, start: number, rng: Rng): void {
  const p = b.patient(req.patientId);
  const rx = { ...(req.modified ?? req.current) };
  const observations = req.decision === "deny" ? [] : controlledPrescriptions([rx], 30, p.homeMeds, rng);
  // Approval renews the contained prescription; modification carries its replacement order.
  const current = req.decision === "approve" ? rx : req.current;
  const resources: Json[] = [refillTask(`${req.id}-task`, req.patientId, req.requestedDay, 6 * 60 + 30, current, drugDef(current.drug)?.rxnorm ?? "", req.lastFilledDaysAgo)];
  req.labs.forEach((l, i) => resources.push(labObservation(`${req.id}-lab${i}`, req.patientId, req.requestedDay - l.daysAgo, 8 * 60, l.lab, l.value, l.interpretation)));
  b.addTask("P1", "W7", req.patientId, start, {
    refill: req.decision,
    ...(req.decision === "approve" ? {} : { refillReason: req.reason }),
    orders: req.modified !== null ? [rx] : [],
    noteSections: req.decision === "approve" ? [] : ["patientMessage"], observations,
  }, resources, b.interruptions("P1", rng, 0.5));
}

function runInbox(b: DayBuild): void {
  if (b.workflowMode !== "legacy") return runContemporaryInbox(b);
  const rng = b.rng(INBOX_RANDOM_STREAM);
  const arrivedLabs = b.state.pendingLabs.filter((l) => l.recipient === "P1" && l.resultDay <= b.day);
  b.state.pendingLabs = b.state.pendingLabs.filter((l) => !arrivedLabs.includes(l));
  const newItems: InboxItem[] = arrivedLabs.map((lab) => ({ id: b.nextId("item"), kind: "result", patientId: lab.patientId, arrivedDay: b.day, priority: lab.interpretation === "N" ? 2 : 0, lab, refill: null }));
  newItems.push(...generateRefills(b, rng.fork("refills")));
  const queue = [...b.state.inboxBacklog, ...newItems].sort((x, y) => x.priority - y.priority || x.arrivedDay - y.arrivedDay || (x.id < y.id ? -1 : 1));

  const bursts: { start: number; cap: number }[] = b.ctx.urgentCareDay
    ? [{ start: 630, cap: 5 }]
    : [
        { start: 0, cap: 6 },
        { start: 272, cap: 6 },
        { start: 590, cap: 10 },
      ];
  let qi = 0;
  for (const burst of bursts) {
    for (let k = 0; k < burst.cap && qi < queue.length; k++, qi++) {
      const item = queue[qi];
      if (item === undefined) break;
      const start = burst.start + k * 4;
      const ir = rng.fork(item.id);
      if (item.lab !== null) resultTask(b, item.lab, start, ir);
      else if (item.refill !== null) refillTaskFor(b, item.refill, start, ir);
    }
  }
  b.state.inboxBacklog = queue.slice(qi);
  b.state.today.inbox.P1 = { arrived: newItems.length, handled: qi, backlogAfter: b.state.inboxBacklog.length };
}


/** N1 (2022–23, publication 2024): message means per 8 scheduled clinic hours.
 * Poisson counts, uniform arrival shape and routing are declared scenarios.
 * No per-burst handling cap; the serial simulator determines service/backlog. */
export const INBOX_STREAMS = {
  advice: 15.3, prescription: 14.3, result: 12.3, call: 23.5, consult: 0.31,
} as const;
function runContemporaryInbox(b: DayBuild): void {
  const rng = b.rng("inbox-streams-v3");
  const count = (kind: keyof typeof INBOX_STREAMS) => rng.fork(kind).poisson(INBOX_STREAMS[kind]);
  const counts = {advice:count("advice"), prescription:count("prescription"), result:count("result"), call:count("call"), consult:count("consult")};
  const arrived = b.state.pendingLabs.filter(l => l.recipient === "P1" && l.resultDay <= b.day);
  b.state.pendingLabs = b.state.pendingLabs.filter(l => !arrived.includes(l));
  const incoming: InboxItem[] = arrived.map(lab => ({id:b.nextId("item"), kind:"result",
    patientId:lab.patientId, arrivedDay:b.day, priority:lab.interpretation === "N" ? 2 : 0, lab, refill:null}));
  incoming.push(...generateRefills(b, rng.fork("prescription"), counts.prescription));
  const queue = [...b.state.inboxBacklog, ...incoming];
  const panel = b.pop.adults.filter(p => b.state.p1Panel.includes(p.id) && !isInpatient(b, p.id));
  const patients = panel.length ? panel : b.pop.adults;
  let handled = 0;
  for (const item of queue) {
    const r = rng.fork(item.id);
    const start = r.int(0, 479);
    const before = b.tasks.P1.length;
    if (item.lab) resultTask(b, item.lab, start, r);
    else if (item.refill) refillTaskFor(b, item.refill, start, r);
    for (const t of b.tasks.P1.slice(before)) {
      t.workflowPlan = workflowPlan(item.refill ? "refill" : "result", "P1",
        item.refill && !isControlled(item.refill.current.drug) ? "P1-pharmacy-review" : undefined);
    }
    handled++;
  }
  // Additional externally ordered results represent an independent stream,
  // preserving every locally generated result even above the reference mean.
  for (const kind of ["advice", "result", "call", "consult"] as const) {
    const count = kind === "result" ? Math.max(0, counts.result - queue.filter(i => i.lab).length) : counts[kind];
    for (let k = 0; k < count && patients.length; k++) {
      const r = rng.fork(`${kind}:${k}`);
      const p = r.pick(patients);
      const start = r.int(0, 479);
      const resources: Json[] = kind === "result"
        ? [labObservation(b.nextId("external-result"), p.id, b.day, 450 + start, "creatinine", 0.9, "N")]
        : [];
      const t = b.addTask("P1", "W2", p.id, start,
        {ackResult:kind === "result", noteSections:["hpi", "assessmentPlan"]}, resources, b.interruptions("P1", r, 0.5));
      t.workflowPlan = workflowPlan(kind, "P1", kind === "call" ? "P1-triage" : undefined);
      t.todayResources.push({resourceType:"Task", id:`${t.id}-inbox`, status:"ready", intent:"order",
        for:{reference:`Patient/${p.id}`}, owner:{reference:`Practitioner/${t.workflowPlan.owner}`},
        code:{text:`inbox-${kind}`}, description:`scenario routing; ${kind} stream; N1 2022–23 mean only`});
      handled++;
    }
  }
  b.state.inboxBacklog = [];
  b.state.today.inbox.P1 = {arrived:handled, handled, backlogAfter:0};
}
