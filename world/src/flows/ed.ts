/**
 * P2, ED shift (W3): a stream of new patients with triage weights (some typed
 * in lb), order sets, allergy-critical prescribing, weight-based doses, and
 * dispositions. "Admit" creates inpatient orders that P3 works on the next
 * day; "consult" hands a suspected appendicitis/cholecystitis to P5.
 */
import { type DayBuild, isPcnAllergic } from "../build";
import { anticoagContinued, inpatientHomeMeds, isDiabetic, nsaidOk, opioidTolerant, peds, prn, vancomycin, vteProphylaxis } from "../clinical";
import { acuteOpioidSupply, controlledNotes } from "../controlled";
import { SCRIPTED_APPENDICITIS_DAYS } from "../context";
import { SHIFTS } from "../calendar";
import { allergyIntolerance, weightObservation } from "../fhir";
import { FORMULARY, order, weightDose } from "../formulary";
import type { PatientProfile } from "../patients";
import { anticoagulant } from "../patients";
import type { Rng } from "../rng";
import type { Json, OrderChoice } from "../schema";
import type { CaseDiagnosis, EdVisit } from "../state";
import { addAppointment, admit, canAdmit } from "./common";
import { createUrgentCase } from "./surgery";

interface ScenarioCtx {
  p: PatientProfile;
  kg: number;
  pcn: boolean;
  rng: Rng;
}

interface AdmitPlan {
  diagnosis: string;
  losNights: number;
  /** Scenario-specific inpatient orders (home meds, VTE prophylaxis, PRNs are added). */
  specific: OrderChoice[];
  prns: OrderChoice[];
  prnPerShift: number;
  holdAntihypertensive?: boolean;
  /** The scenario already anticoagulates (no separate VTE prophylaxis). */
  anticoagulates?: boolean;
}

interface EdPlan {
  key: string;
  orderSet: string;
  esi: number;
  notes: string[];
  stat: OrderChoice[];
  admitProb: number;
  admit?: AdmitPlan;
  dischargeRx: OrderChoice[];
  /** Chance of an ED follow-up visit with P1 (if the patient is on P1's panel). */
  followupProb: number;
  /** Days supplied for controlled discharge prescriptions (ED supplies of <= 7 days are CURES-exempt). */
  supplyDays?: number;
}

const BASE_NOTES = ["triage", "hpi", "exam", "mdm", "disposition"];

function painRx(x: ScenarioCtx): OrderChoice {
  return nsaidOk(x.p) ? prn.ibuprofen() : prn.acetaminophen();
}

/** Inpatient PRN oral opioid for moderate pain (higher dose if opioid-tolerant). */
function oxyPrn(x: ScenarioCtx): OrderChoice {
  return prn.oxycodonePO(opioidTolerant(x.p) ? 10 : 5);
}

/** Adult and pediatric ED scenarios with their selection weight for a given patient. */
const ADULT_SCENARIOS: readonly { key: string; weight: (p: PatientProfile, flu: boolean) => number; build: (x: ScenarioCtx) => EdPlan }[] = [
  {
    key: "chest-pain",
    weight: (p) => (p.ageYears >= 35 ? 12 : 4),
    build: (x) => ({
      key: "chest-pain",
      orderSet: "ed-chest-pain",
      esi: 2,
      notes: ["ecgReview"],
      stat: x.rng.chance(0.4) ? [order("morphine", 2, "mg", "IV", "once")] : [],
      admitProb: 0.35,
      admit: { diagnosis: "chest pain, rule out acute coronary syndrome", losNights: 1, specific: [], prns: [prn.acetaminophen()], prnPerShift: 0.3 },
      dischargeRx: [],
      followupProb: 0.6,
    }),
  },
  {
    key: "abdominal-pain",
    weight: () => 10,
    build: (x) => ({
      key: "abdominal-pain",
      orderSet: "ed-abdominal-pain",
      esi: 3,
      notes: [],
      stat: [order("morphine", 4, "mg", "IV", "once"), order("ondansetron", 4, "mg", "IV", "once")],
      admitProb: 0.15,
      admit: { diagnosis: "abdominal pain, nonspecific", losNights: x.rng.int(1, 2), specific: [], prns: [prn.morphineIV(2), oxyPrn(x), prn.ondansetronIV(), prn.acetaminophen()], prnPerShift: 1.2 },
      dischargeRx: [prn.acetaminophen()],
      followupProb: 0.3,
    }),
  },
  {
    key: "pneumonia",
    weight: (p, flu) => (flu ? 13 : 8) * (p.ageYears >= 65 ? 1.4 : 1),
    build: (x) => ({
      key: "pneumonia",
      orderSet: "ed-pneumonia",
      esi: 3,
      notes: ["imagingReview"],
      stat: [
        order("ceftriaxone", 1000, "mg", "IV", "once", { indication: "community-acquired-pneumonia" }),
        order("azithromycin", 500, "mg", "IV", "once", { indication: "community-acquired-pneumonia" }),
        order("acetaminophen", 650, "mg", "PO", "once"),
      ],
      admitProb: x.p.ageYears >= 65 ? 0.75 : 0.5,
      admit: {
        diagnosis: "community-acquired pneumonia",
        losNights: x.rng.int(2, 4),
        specific: [
          order("ceftriaxone", 1000, "mg", "IV", "q24h", { indication: "community-acquired-pneumonia" }),
          order("azithromycin", 500, "mg", "IV", "q24h", { indication: "community-acquired-pneumonia" }),
        ],
        prns: [prn.acetaminophen()],
        prnPerShift: 0.4,
      },
      dischargeRx: x.pcn
        ? [order("azithromycin", 500, "mg", "PO", "daily", { indication: "community-acquired-pneumonia" })]
        : [order("amoxicillin", 1000, "mg", "PO", "TID", { indication: "community-acquired-pneumonia" })],
      followupProb: 0.7,
    }),
  },
  {
    key: "pyelonephritis",
    weight: (p) => (p.gender === "female" ? 8 : 4),
    build: (x) => ({
      key: "pyelonephritis",
      orderSet: "ed-uti",
      esi: 3,
      notes: [],
      stat: [order("ceftriaxone", 1000, "mg", "IV", "once", { indication: "pyelonephritis" }), order("ondansetron", 4, "mg", "IV", "once")],
      admitProb: 0.3,
      admit: {
        diagnosis: "pyelonephritis",
        losNights: x.rng.int(1, 3),
        specific: [order("ceftriaxone", 1000, "mg", "IV", "q24h", { indication: "pyelonephritis" })],
        prns: [prn.acetaminophen(), prn.ondansetronIV()],
        prnPerShift: 0.6,
      },
      dischargeRx: [prn.acetaminophen()],
      followupProb: 0.5,
    }),
  },
  {
    key: "cellulitis",
    weight: (p) => (p.tags.includes("dm2") ? 9 : 6),
    build: (x) => ({
      key: "cellulitis",
      orderSet: "ed-cellulitis",
      esi: 4,
      notes: ["woundExam"],
      stat: [x.pcn ? vancomycin(x.kg, "once", "cellulitis") : order("cefazolin", 2000, "mg", "IV", "once", { indication: "cellulitis" })],
      admitProb: 0.4,
      admit: {
        diagnosis: "cellulitis of lower limb",
        losNights: x.rng.int(2, 3),
        specific: [x.pcn ? vancomycin(x.kg, "q12h", "cellulitis") : order("cefazolin", 2000, "mg", "IV", "q8h", { indication: "cellulitis" })],
        prns: [prn.acetaminophen(), oxyPrn(x)],
        prnPerShift: 0.8,
      },
      dischargeRx: [
        x.pcn ? order("azithromycin", 500, "mg", "PO", "daily", { indication: "cellulitis" }) : order("amoxicillin", 500, "mg", "PO", "TID", { indication: "cellulitis" }),
      ],
      followupProb: 0.7,
    }),
  },
  {
    key: "copd-asthma-exacerbation",
    weight: (p, flu) => (p.tags.includes("asthma") || p.tags.includes("copd") ? 10 : 1.5) * (flu ? 1.5 : 1),
    build: (x) => {
      const copd = x.p.tags.includes("copd") || (x.p.ageYears >= 55 && !x.p.tags.includes("asthma"));
      const abx = copd ? [order("azithromycin", 500, "mg", "PO", "once", { indication: "copd-exacerbation" })] : [];
      return {
        key: "copd-asthma-exacerbation",
        orderSet: "ed-respiratory",
        esi: 3,
        notes: ["respiratoryAssessment"],
        stat: [order("albuterol", 2.5, "mg", "INH", "once"), ...abx],
        admitProb: copd ? 0.35 : 0.15,
        admit: {
          diagnosis: copd ? "COPD exacerbation" : "asthma exacerbation",
          losNights: x.rng.int(2, 3),
          specific: [
            order("albuterol", 2.5, "mg", "INH", "q4h"),
            ...(copd ? [order("azithromycin", 500, "mg", "PO", "daily", { indication: "copd-exacerbation" })] : []),
          ],
          prns: [prn.acetaminophen()],
          prnPerShift: 0.2,
        },
        dischargeRx: [order("albuterol", 180, "mcg", "INH", "q4h", { prn: true })],
        followupProb: 0.6,
      };
    },
  },
  {
    key: "hyperglycemia",
    weight: (p) => (isDiabetic(p) ? 6 : 0),
    build: (x) => ({
      key: "hyperglycemia",
      orderSet: "ed-hyperglycemia",
      esi: 3,
      notes: [],
      stat: [order("insulin lispro", Math.max(4, Math.round(0.1 * x.kg)), "units", "SC", "once")],
      admitProb: 0.5,
      admit: {
        diagnosis: "hyperglycemia, type 2 diabetes",
        losNights: x.rng.int(1, 2),
        specific: [
          order("insulin glargine", Math.max(8, Math.round(0.2 * x.kg)), "units", "SC", "daily"),
          order("insulin lispro", x.kg > 100 ? 6 : 4, "units", "SC", "TIDAC"),
        ],
        prns: [prn.acetaminophen()],
        prnPerShift: 0.2,
      },
      dischargeRx: [],
      followupProb: 0.9,
    }),
  },
  {
    key: "pulmonary-embolism",
    weight: (p) => (anticoagulant(p) === undefined ? 3 : 0),
    build: (x) => ({
      key: "pulmonary-embolism",
      orderSet: "ed-vte",
      esi: 2,
      notes: ["imagingReview"],
      stat: [order("heparin", weightDose("heparin", 80, x.kg, 100, 10000), "units", "IV", "once")],
      admitProb: 1,
      admit: {
        diagnosis: "pulmonary embolism",
        losNights: x.rng.int(2, 3),
        specific: [order("enoxaparin", enoxaparinTreatmentMg(x.kg), "mg", "SC", "q12h")],
        prns: [prn.acetaminophen(), oxyPrn(x)],
        prnPerShift: 0.5,
        anticoagulates: true,
      },
      dischargeRx: [order("apixaban", 10, "mg", "PO", "BID")],
      followupProb: 1,
    }),
  },
  {
    key: "migraine",
    weight: (p) => (p.ageYears < 60 ? 5 : 1),
    build: (x) => ({
      key: "migraine",
      orderSet: "ed-headache",
      esi: 3,
      notes: ["neuroExam"],
      stat: [order("ondansetron", 4, "mg", "IV", "once"), order("acetaminophen", 1000, "mg", "PO", "once"), ...(nsaidOk(x.p) ? [order("ibuprofen", 600, "mg", "PO", "once")] : [])],
      admitProb: 0,
      dischargeRx: [painRx(x)],
      followupProb: 0.2,
    }),
  },
  {
    key: "musculoskeletal-injury",
    weight: () => 9,
    build: (x) => {
      const fracture = x.rng.chance(0.35);
      return {
        key: fracture ? "fracture" : "musculoskeletal-injury",
        orderSet: "ed-msk",
        esi: fracture ? 3 : x.rng.chance(0.5) ? 4 : 5,
        notes: ["imagingReview", ...(fracture ? ["splintProcedureNote"] : [])],
        stat: fracture
          ? [order("hydrocodone-acetaminophen", 5, "mg", "PO", "once")]
          : [nsaidOk(x.p) ? order("ibuprofen", 600, "mg", "PO", "once") : order("acetaminophen", 1000, "mg", "PO", "once")],
        admitProb: 0,
        dischargeRx: fracture ? [order("hydrocodone-acetaminophen", 5, "mg", "PO", "q6h", { prn: true }), ...(nsaidOk(x.p) ? [prn.ibuprofen()] : [])] : [painRx(x)],
        followupProb: fracture ? 0.5 : 0.2,
        supplyDays: acuteOpioidSupply(x.rng, 0.2, [3, 5], 10),
      };
    },
  },
  {
    key: "acute-low-back-pain",
    weight: (p) => (p.ageYears >= 25 && p.ageYears <= 70 ? 5 : 1),
    build: (x) => {
      const tramadol = x.rng.chance(0.45);
      return {
        key: "acute-low-back-pain",
        orderSet: "ed-back-pain",
        esi: 4,
        notes: ["neuroExam"],
        stat: [nsaidOk(x.p) ? order("ibuprofen", 600, "mg", "PO", "once") : order("acetaminophen", 1000, "mg", "PO", "once")],
        admitProb: 0,
        dischargeRx: tramadol ? [order("tramadol", 50, "mg", "PO", "q6h", { prn: true }), painRx(x)] : [painRx(x)],
        followupProb: 0.4,
        supplyDays: acuteOpioidSupply(x.rng, 0.3, [5, 7], 14),
      };
    },
  },
  {
    key: "panic-attack",
    weight: (p) => (p.ageYears < 65 ? 3 : 1),
    build: (x) => ({
      key: "panic-attack",
      orderSet: "ed-anxiety",
      esi: 3,
      notes: ["ecgReview", "mentalStatusExam"],
      stat: [order("lorazepam", 0.5, "mg", "PO", "once")],
      admitProb: 0,
      dischargeRx: x.rng.chance(0.4) ? [order("lorazepam", 0.5, "mg", "PO", "BID", { prn: true })] : [],
      followupProb: 0.7,
      supplyDays: 3,
    }),
  },
  {
    key: "chronic-pain-flare",
    weight: (p) => (opioidTolerant(p) ? 6 : 0),
    build: (x) => ({
      key: "chronic-pain-flare",
      orderSet: "ed-pain",
      esi: 4,
      notes: [],
      stat: [order("hydromorphone", 1, "mg", "IV", "once"), order("ondansetron", 4, "mg", "IV", "once")],
      admitProb: 0,
      // A short bridge until the PCP visit; the home opioid continues.
      dischargeRx: x.rng.chance(0.5) ? [order("oxycodone", 5, "mg", "PO", "q6h", { prn: true })] : [],
      followupProb: 1,
      supplyDays: 3,
    }),
  },
  {
    key: "renal-colic",
    weight: (p) => (p.ageYears < 70 ? 4 : 1),
    build: (x) => ({
      key: "renal-colic",
      orderSet: "ed-renal-colic",
      esi: 3,
      notes: ["imagingReview"],
      stat: [x.rng.chance(0.5) ? order("morphine", 4, "mg", "IV", "once") : order("hydromorphone", 1, "mg", "IV", "once"), order("ondansetron", 4, "mg", "IV", "once")],
      admitProb: 0.15,
      admit: { diagnosis: "ureteral stone with renal colic", losNights: 1, specific: [], prns: [prn.morphineIV(2), oxyPrn(x), prn.ondansetronIV(), prn.acetaminophen()], prnPerShift: 1.5 },
      dischargeRx: [painRx(x), prn.oxycodonePO(5, "q6h")],
      followupProb: 0.4,
      supplyDays: acuteOpioidSupply(x.rng, 0.15, [3], 10),
    }),
  },
  {
    key: "influenza-like-illness",
    weight: (_p, flu) => (flu ? 16 : 3),
    build: (x) => ({
      key: "influenza-like-illness",
      orderSet: "ed-ili",
      esi: 4,
      notes: [],
      stat: [order("acetaminophen", 1000, "mg", "PO", "once")],
      admitProb: x.p.ageYears >= 75 ? 0.3 : 0.03,
      admit: { diagnosis: "influenza", losNights: x.rng.int(1, 2), specific: [], prns: [prn.acetaminophen()], prnPerShift: 0.3 },
      dischargeRx: [prn.acetaminophen()],
      followupProb: 0.2,
    }),
  },
  {
    key: "syncope",
    weight: (p) => (p.ageYears >= 50 ? 4 : 2),
    build: (x) => ({
      key: "syncope",
      orderSet: "ed-syncope",
      esi: 3,
      notes: ["ecgReview"],
      stat: [],
      admitProb: 0.3,
      admit: { diagnosis: "syncope", losNights: 1, specific: [], prns: [prn.acetaminophen()], prnPerShift: 0.1, holdAntihypertensive: x.rng.chance(0.5) },
      dischargeRx: [],
      followupProb: 0.6,
    }),
  },
  {
    key: "laceration",
    weight: () => 4,
    build: (x) => ({
      key: "laceration",
      orderSet: "ed-laceration",
      esi: 4,
      notes: ["procedureNote"],
      stat: x.rng.chance(0.5) ? [order("acetaminophen", 1000, "mg", "PO", "once")] : [],
      admitProb: 0,
      dischargeRx: [],
      followupProb: 0.1,
    }),
  },
];

const PEDS_SCENARIOS: readonly { key: string; weight: number; build: (x: ScenarioCtx) => EdPlan }[] = [
  {
    key: "peds-fever-otitis",
    weight: 6,
    build: (x) => ({
      key: "peds-fever-otitis",
      orderSet: "ed-peds-fever",
      esi: 4,
      notes: [],
      stat: [x.rng.chance(0.6) || x.p.ageYears < 1 ? order("acetaminophen", weightDose("acetaminophen", 15, x.kg, 10, 1000), "mg", "PO", "once") : order("ibuprofen", weightDose("ibuprofen", 10, x.kg, 10, 400), "mg", "PO", "once")],
      admitProb: 0,
      dischargeRx: [x.pcn ? peds.azithromycin(x.kg, "acute-otitis-media") : peds.amoxicillinAom(x.kg), peds.acetaminophen(x.kg)],
      followupProb: 0,
    }),
  },
  {
    key: "peds-asthma",
    weight: 3,
    build: (x) => ({
      key: "peds-asthma",
      orderSet: "ed-peds-asthma",
      esi: 3,
      notes: ["respiratoryAssessment"],
      stat: [order("albuterol", x.kg < 10 ? 1.25 : x.kg < 20 ? 2.5 : 5, "mg", "INH", "once")],
      admitProb: 0,
      dischargeRx: [peds.albuterolNeb(x.kg)],
      followupProb: 0,
    }),
  },
  {
    key: "peds-gastroenteritis",
    weight: 3,
    build: (x) => ({
      key: "peds-gastroenteritis",
      orderSet: "ed-peds-gastroenteritis",
      esi: 4,
      notes: ["hydrationAssessment"],
      stat: [peds.ondansetron(x.kg)],
      admitProb: 0,
      dischargeRx: [],
      followupProb: 0,
    }),
  },
];

/** Enoxaparin 1 mg/kg rounded to a prefilled syringe size. */
export function enoxaparinTreatmentMg(kg: number): number {
  const sizes = [40, 60, 80, 100, 120, 150];
  let best = 40;
  for (const s of sizes) if (Math.abs(s - kg) < Math.abs(best - kg)) best = s;
  return best;
}

/** ED arrival clock (minutes since midnight), weighted toward late morning and afternoon. */
function arrivalClock(rng: Rng): number {
  const hour = rng.weighted<number>([
    [7, 1],
    [8, 2],
    [9, 3],
    [10, 4],
    [11, 4],
    [12, 4],
    [13, 4],
    [14, 3],
    [15, 3],
    [16, 1.5],
  ]);
  return hour * 60 + rng.int(0, 59);
}

function dedupeOrders(orders: OrderChoice[]): OrderChoice[] {
  const seen = new Set<string>();
  return orders.filter((o) => {
    const k = `${o.drug}|${o.route}|${o.freq}|${o.prn}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Full inpatient regimen: scenario orders + home meds + VTE prophylaxis + PRNs. */
export function admissionRegimen(p: PatientProfile, kg: number, plan: AdmitPlan, rng: Rng): { orders: OrderChoice[]; holds: string[] } {
  const home = inpatientHomeMeds(p, kg, { holdAnticoag: plan.anticoagulates === true, holdAntihypertensive: plan.holdAntihypertensive === true });
  const specificDrugs = new Set(plan.specific.map((o) => o.drug));
  const homeOrders = home.orders.filter((o) => !specificDrugs.has(o.drug));
  const vte = plan.anticoagulates === true ? null : vteProphylaxis(p, rng, anticoagContinued(p, false));
  const hasBenzo = homeOrders.some((o) => o.drug === "lorazepam" || o.drug === "alprazolam");
  const anxiety = !hasBenzo && rng.chance(0.1) ? [prn.lorazepamPO()] : [];
  const homeDrugs = new Set(homeOrders.map((o) => o.drug));
  const prns = plan.prns.filter((o) => !homeDrugs.has(o.drug));
  return { orders: dedupeOrders([...plan.specific, ...homeOrders, ...(vte === null ? [] : [vte]), ...prns, ...anxiety]), holds: home.holds };
}

export function runEd(b: DayBuild): void {
  const rng = b.rng("ed");
  const ctx = b.ctx;
  const vol = ctx.personaVolume.P2;
  const n = Math.max(9, Math.min(26, Math.round(16 * vol) + rng.int(-1, 1)));

  // Surgical consults today: the scripted appendicitis plus random ones.
  const consults: CaseDiagnosis[] = [];
  if (SCRIPTED_APPENDICITIS_DAYS.includes(b.day) || rng.chance(0.18)) consults.push("appendicitis");
  if (rng.chance(0.1)) consults.push("acute-cholecystitis");

  const clocks = Array.from({ length: n }, () => arrivalClock(rng)).sort((a, c) => a - c);
  // Consults arrive mid-morning to early afternoon, so P5 can see them the same day.
  const consultAt = new Map<number, CaseDiagnosis>();
  for (const dx of consults) {
    const target = dx === "appendicitis" && SCRIPTED_APPENDICITIS_DAYS.includes(b.day) ? 10 * 60 + 30 : rng.int(9 * 60, 14 * 60);
    let bestIdx = -1;
    let bestDist = Infinity;
    clocks.forEach((c, i) => {
      if (consultAt.has(i)) return;
      const dist = Math.abs(c - target);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    });
    if (bestIdx >= 0) consultAt.set(bestIdx, dx);
  }

  const pedsShare = b.pop.peds.length > 0 ? 0.12 : 0;
  const arrivals: EdVisit[] = [];
  const stays: [number, number][] = [];

  clocks.forEach((clock, i) => {
    const prng = rng.fork(`arrival-${i}`);
    const consultDx = consultAt.get(i);
    let p: PatientProfile | undefined;
    if (consultDx !== undefined) {
      const hist = consultDx === "appendicitis" ? "appendectomy" : "cholecystectomy";
      const young = (q: PatientProfile) => q.ageYears >= 18 && q.ageYears <= (consultDx === "appendicitis" ? 40 : 65) && !q.tags.includes(hist);
      p = b.picker.pick(prng, young) ?? b.picker.pick(prng, (q) => q.ageYears >= 18 && q.ageYears <= 75 && !q.tags.includes(hist));
    } else if (prng.chance(pedsShare)) {
      p = b.picker.pick(prng, (q) => q.ageYears < 18, ctx.allergyShare);
    } else {
      p = b.picker.pick(prng, (q) => q.ageYears >= 18, ctx.allergyShare);
    }
    if (p === undefined) return;

    const kg = Math.round(Math.max(3, p.weightKg * (1 + prng.normal(0, 0.012))) * 10) / 10;
    const knownPcn = isPcnAllergic(p);
    const newAllergy = !knownPcn && prng.chance(0.06);
    const pcn = knownPcn || newAllergy;
    const x: ScenarioCtx = { p, kg, pcn, rng: prng };
    const taskId = b.peekTaskId("P2", "W3");
    const startMin = clock - SHIFTS.P2.startClock + prng.int(5, 25);

    const lb = prng.chance(p.ageYears < 18 ? Math.min(0.7, ctx.lbShare * 2) : ctx.lbShare);
    const resources: Json[] = [
      lb
        ? weightObservation(`${taskId}-weight`, p.id, b.day, clock, Math.round(kg * 2.20462), "lb")
        : weightObservation(`${taskId}-weight`, p.id, b.day, clock, kg, "kg"),
    ];
    if (newAllergy) {
      resources.push(allergyIntolerance(`${taskId}-allergy`, p.id, b.day, clock, "amoxicillin", FORMULARY.amoxicillin.rxnorm, "hives (reported at triage)", "low"));
    }

    if (consultDx !== undefined) {
      const stat = [
        order("morphine", 4, "mg", "IV", "once"),
        order("ondansetron", 4, "mg", "IV", "once"),
        order("ceftriaxone", 2000, "mg", "IV", "once", { indication: "intra-abdominal-infection" }),
      ];
      b.addTask("P2", "W3", p.id, startMin, { orders: stat, disposition: "consult", noteSections: [...BASE_NOTES, "imagingReview", "surgicalConsult"] }, resources, b.interruptions("P2", prng));
      const c = createUrgentCase(b, p, consultDx, clock, taskId, kg, pcn, prng);
      arrivals.push({ taskId, patientId: p.id, arrivalClock: clock, esi: 3, scenario: consultDx, orderSet: "ed-abdominal-pain-surgical", disposition: "consult", weightUnit: lb ? "lb" : "kg", newAllergy, admissionId: c.admissionId, caseId: c.id });
      stays.push([clock, clock + prng.int(240, 360)]);
      return;
    }

    let plan: EdPlan;
    if (p.ageYears < 18) {
      plan = prng.weighted(PEDS_SCENARIOS.map((s) => [s, s.weight] as const)).build(x);
    } else {
      const flu = ctx.fluWeek;
      const pp = p;
      plan = prng.weighted(ADULT_SCENARIOS.map((s) => [s, s.weight(pp, flu)] as const)).build(x);
    }

    let disposition: "admit" | "discharge" = plan.admit !== undefined && prng.chance(plan.admitProb) ? "admit" : "discharge";
    if (disposition === "admit" && !canAdmit(b)) {
      disposition = "discharge";
      b.log(`no ward bed: ${p.id} (${plan.key}) discharged from ED with close follow-up`);
    }

    let orders = plan.stat;
    let notes = [...BASE_NOTES, ...plan.notes];
    let admissionId: string | null = null;
    if (disposition === "admit" && plan.admit !== undefined) {
      const reg = admissionRegimen(p, kg, plan.admit, prng);
      orders = [...plan.stat, ...reg.orders];
      notes = [...notes, "admissionOrders", ...reg.holds];
      const ip = admit(
        b,
        {
          patient: p,
          clock: clock + prng.int(150, 300),
          service: "medicine",
          source: "ed",
          diagnosis: plan.admit.diagnosis,
          losNights: plan.admit.losNights,
          regimen: reg.orders,
          regimenSource: `ED admission orders ${taskId}`,
          prnPerShift: plan.admit.prnPerShift,
          caseId: null,
          fromTaskId: taskId,
          weightKg: kg,
          diabetic: isDiabetic(p),
        },
        prng,
      );
      admissionId = ip.admissionId;
      stays.push([clock, clock + prng.int(240, 420)]);
    } else {
      orders = [...plan.stat, ...plan.dischargeRx];
      notes = [...notes, "dischargeInstructions", ...controlledNotes(plan.dischargeRx, plan.supplyDays ?? 3, p.homeMeds, prng)];
      stays.push([clock, clock + prng.int(90, 240)]);
      if (b.state.p1Panel.includes(p.id) && prng.chance(plan.followupProb)) {
        addAppointment(b, "P1", p.id, b.day + prng.int(2, 4), "ed-followup", `ED follow-up: ${plan.key}`, taskId);
      }
    }
    b.addTask("P2", "W3", p.id, startMin, { orders, disposition, noteSections: notes }, resources, b.interruptions("P2", prng));
    arrivals.push({ taskId, patientId: p.id, arrivalClock: clock, esi: plan.esi, scenario: plan.key, orderSet: plan.orderSet, disposition, weightUnit: lb ? "lb" : "kg", newAllergy, admissionId, caseId: null });
  });

  let peak = 0;
  for (const [s] of stays) peak = Math.max(peak, stays.filter(([a, e]) => a <= s && s < e).length);
  const yesterdayLateAdmits = b.state.admissions.filter((a) => a.day === b.day - 1 && a.clock >= 15 * 60).length;
  b.state.today.ed = { arrivals, peakCensus: peak, boardersAtShiftStart: yesterdayLateAdmits };
}

/** An admission plan for an inpatient already on the ward when the simulation starts. */
export function initialAdmissionPlan(p: PatientProfile, kg: number, rng: Rng): { diagnosis: string; regimen: OrderChoice[]; prnPerShift: number } {
  const keys = ["pneumonia", "cellulitis", "copd-asthma-exacerbation", "pyelonephritis", ...(isDiabetic(p) ? ["hyperglycemia"] : [])];
  const key = rng.pick(keys);
  const scen = ADULT_SCENARIOS.find((s) => s.key === key);
  if (scen === undefined) throw new Error(`unknown scenario ${key}`);
  const plan = scen.build({ p, kg, pcn: isPcnAllergic(p), rng });
  if (plan.admit === undefined) throw new Error(`scenario ${key} has no admission plan`);
  const reg = admissionRegimen(p, kg, plan.admit, rng);
  return { diagnosis: plan.admit.diagnosis, regimen: reg.orders, prnPerShift: plan.admit.prnPerShift };
}
