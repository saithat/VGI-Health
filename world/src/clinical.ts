/**
 * Reusable clinical building blocks: home-medication continuation, VTE
 * prophylaxis, PRN sets, and weight-based dosing. All choices are fixed by the
 * scenario and the patient's record, never by the UI.
 */
import { type AbxIndication, order, weightDose } from "./formulary";
import type { HomeMed, PatientProfile } from "./patients";
import { anticoagulant } from "./patients";
import type { Rng } from "./rng";
import type { OrderChoice } from "./schema";

export function isDiabetic(p: PatientProfile): boolean {
  return p.tags.includes("dm2") || p.homeMeds.some((m) => m.drug === "metformin" || m.drug === "insulin glargine" || m.drug === "insulin lispro");
}

/** Outpatient prescription for a home med (what a refill renews). */
export function homeOrder(m: HomeMed): OrderChoice {
  return order(m.drug, m.dose, m.unit, m.route, m.freq, { prn: m.prn });
}

export interface InpatientMeds {
  orders: OrderChoice[];
  /** noteSections entries `hold:<drug>:<reason>` for home meds held on admission. */
  holds: string[];
}

/** Home meds continued, held, or substituted on admission. */
export function inpatientHomeMeds(p: PatientProfile, weightKg: number, opts: { holdAnticoag: boolean; holdAntihypertensive: boolean }): InpatientMeds {
  const orders: OrderChoice[] = [];
  const holds: string[] = [];
  for (const m of p.homeMeds) {
    switch (m.drug) {
      case "lisinopril":
        if (opts.holdAntihypertensive) holds.push("hold:lisinopril:hypotension-risk");
        else orders.push(order("lisinopril", m.dose, "mg", "PO", "daily"));
        break;
      case "atorvastatin":
        orders.push(order("atorvastatin", m.dose, "mg", "PO", "daily"));
        break;
      case "metformin":
        holds.push("hold:metformin:inpatient");
        break;
      case "insulin glargine":
        orders.push(order("insulin glargine", Math.max(6, Math.round(0.8 * Math.min(m.dose, weightKg * 0.4))), "units", "SC", "daily"));
        break;
      case "warfarin":
      case "apixaban":
        if (opts.holdAnticoag) holds.push(`hold:${m.drug}:procedure-or-bleeding-risk`);
        else orders.push(order(m.drug, m.dose, "mg", "PO", m.drug === "warfarin" ? "daily" : "BID"));
        break;
      case "albuterol":
        orders.push(order("albuterol", 2.5, "mg", "INH", "q4h", { prn: true }));
        break;
      case "oxycodone":
      case "hydrocodone-acetaminophen":
      case "tramadol":
      case "hydromorphone":
      case "morphine":
      case "lorazepam":
      case "alprazolam":
        // Chronic opioids and benzodiazepines continue at the home dose to avoid withdrawal.
        orders.push(homeOrder(m));
        break;
      default:
        break;
    }
  }
  if (isDiabetic(p) && !orders.some((o) => o.drug === "insulin lispro")) {
    orders.push(order("insulin lispro", weightKg > 100 ? 6 : 4, "units", "SC", "TIDAC"));
  }
  return { orders, holds };
}

/** VTE prophylaxis for an inpatient not already on a continued anticoagulant. */
export function vteProphylaxis(p: PatientProfile, rng: Rng, anticoagContinued: boolean): OrderChoice | null {
  if (anticoagContinued) return null;
  if (p.tags.includes("ckd") || p.ageYears >= 80 || rng.chance(0.4)) return order("heparin", 5000, "units", "SC", "q8h");
  return order("enoxaparin", 40, "mg", "SC", "daily");
}

export function anticoagContinued(p: PatientProfile, holdAnticoag: boolean): boolean {
  return anticoagulant(p) !== undefined && !holdAnticoag;
}

export const prn = {
  acetaminophen: (): OrderChoice => order("acetaminophen", 650, "mg", "PO", "q6h", { prn: true }),
  ondansetronIV: (): OrderChoice => order("ondansetron", 4, "mg", "IV", "q6h", { prn: true }),
  morphineIV: (mg: number): OrderChoice => order("morphine", mg, "mg", "IV", "q4h", { prn: true }),
  hydromorphoneIV: (): OrderChoice => order("hydromorphone", 0.5, "mg", "IV", "q3h", { prn: true }),
  hydromorphonePO: (): OrderChoice => order("hydromorphone", 2, "mg", "PO", "q4h", { prn: true }),
  ibuprofen: (): OrderChoice => order("ibuprofen", 600, "mg", "PO", "q6h", { prn: true }),
  oxycodonePO: (mg: number, freq: "q4h" | "q6h" = "q4h"): OrderChoice => order("oxycodone", mg, "mg", "PO", freq, { prn: true }),
  lorazepamPO: (): OrderChoice => order("lorazepam", 0.5, "mg", "PO", "q8h", { prn: true }),
};

/** A patient already taking opioids at home (opioid-tolerant: higher PRN doses). */
export function opioidTolerant(p: PatientProfile): boolean {
  return p.homeMeds.some((m) => m.route === "PO" && (m.drug === "oxycodone" || m.drug === "hydrocodone-acetaminophen" || m.drug === "tramadol" || m.drug === "morphine" || m.drug === "hydromorphone"));
}

/** NSAIDs avoided with anticoagulants or kidney disease. */
export function nsaidOk(p: PatientProfile): boolean {
  return anticoagulant(p) === undefined && !p.tags.includes("ckd") && p.ageYears < 75;
}

/** Vancomycin 15 mg/kg IV, rounded to 250 mg, max 2 g (PCN-allergic alternative to cefazolin). */
export function vancomycin(weightKg: number, freq: "once" | "q12h", indication: AbxIndication): OrderChoice {
  return order("vancomycin", weightDose("vancomycin", 15, weightKg, 250, 2000), "mg", "IV", freq, { indication });
}

/** Surgical prophylaxis: cefazolin 2 g (3 g if >= 120 kg), or vancomycin if penicillin-allergic. */
export function surgicalProphylaxis(weightKg: number, pcnAllergic: boolean): OrderChoice {
  if (pcnAllergic) return vancomycin(weightKg, "once", "surgical-prophylaxis");
  return order("cefazolin", weightKg >= 120 ? 3000 : 2000, "mg", "IV", "once", { indication: "surgical-prophylaxis" });
}

// ---------- Pediatric weight-based prescriptions (dose computed from today's kg) ----------

export const peds = {
  amoxicillinAom: (kg: number): OrderChoice =>
    order("amoxicillin", weightDose("amoxicillin", 45, kg, 10, 2000), "mg", "PO", "BID", { indication: "acute-otitis-media" }),
  amoxicillinStrep: (kg: number): OrderChoice =>
    order("amoxicillin", weightDose("amoxicillin", 25, kg, 10, 500), "mg", "PO", "BID", { indication: "strep-pharyngitis" }),
  azithromycin: (kg: number, indication: AbxIndication): OrderChoice =>
    order("azithromycin", weightDose("azithromycin", 10, kg, 5, 500), "mg", "PO", "daily", { indication }),
  ceftriaxoneIm: (kg: number): OrderChoice =>
    order("ceftriaxone", weightDose("ceftriaxone", 50, kg, 50, 1000), "mg", "IM", "once", { indication: "acute-otitis-media" }),
  acetaminophen: (kg: number): OrderChoice => order("acetaminophen", weightDose("acetaminophen", 15, kg, 10, 1000), "mg", "PO", "q6h", { prn: true }),
  ibuprofen: (kg: number): OrderChoice => order("ibuprofen", weightDose("ibuprofen", 10, kg, 10, 400), "mg", "PO", "q6h", { prn: true }),
  ondansetron: (kg: number): OrderChoice => order("ondansetron", weightDose("ondansetron", 0.15, kg, 0.5, 4), "mg", "PO", "once"),
  albuterolNeb: (kg: number): OrderChoice => order("albuterol", kg < 10 ? 1.25 : kg < 20 ? 2.5 : 5, "mg", "INH", "q4h", { prn: true }),
};
