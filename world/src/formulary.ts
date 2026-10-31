/**
 * The world's formulary: the 25 drugs scenarios may order, keyed by lowercase
 * generic name (what `OrderChoice.drug` carries). Lean owns the real formulary
 * (`Ehr/Formulary.lean`); this table only drives the generator and its tests,
 * and should be kept aligned with the Lean one. Each entry carries the RxNorm
 * ingredient code for FHIR medication codings.
 *
 * `weightRange` is the per-dose range the generator keeps weight-based doses
 * inside (the Lean `minMgPerKgTenths`/`maxMgPerKgTenths` should match). A missing
 * range corresponds to Lean’s 0/0 (no mg/kg check).
 *
 * Controlled substances (California CURES rule, owner-approved addition):
 * `schedule` is the DEA schedule; `mmeFactor` is the CDC 2022 oral morphine
 * milligram equivalent factor per mg. For hydrocodone-acetaminophen the dose
 * (`doseTenths`) is the hydrocodone component in mg (acetaminophen 325 mg per tablet).
 */
import type { OrderChoice, UnitKind } from "./schema";

export type DrugName =
  | "amoxicillin"
  | "cefazolin"
  | "ceftriaxone"
  | "azithromycin"
  | "vancomycin"
  | "lisinopril"
  | "metformin"
  | "atorvastatin"
  | "warfarin"
  | "apixaban"
  | "enoxaparin"
  | "heparin"
  | "insulin glargine"
  | "insulin lispro"
  | "morphine"
  | "hydromorphone"
  | "ondansetron"
  | "acetaminophen"
  | "ibuprofen"
  | "albuterol"
  | "oxycodone"
  | "hydrocodone-acetaminophen"
  | "tramadol"
  | "lorazepam"
  | "alprazolam";

export interface DrugDef {
  name: DrugName;
  rxnorm: string;
  classes: readonly string[];
  /** ISMP-style high-alert flag used by the generator (insulin and heparin per BRIEF W4). */
  highAlert: boolean;
  antibiotic: boolean;
  interactsWith: readonly string[];
  /** Per-dose weight-based range (mg/kg, matching Lean). */
  weightRange?: { min: number; max: number };
  /** DEA schedule for controlled substances. */
  schedule?: "II" | "III" | "IV" | "V";
  /** Oral MME per mg (CDC 2022 conversion factors). */
  mmeFactor?: number;
}

export const FORMULARY: Record<DrugName, DrugDef> = {
  "amoxicillin": { name: "amoxicillin", rxnorm: "723", classes: ["penicillin", "betaLactam", "antibiotic"], highAlert: false, antibiotic: true, interactsWith: ["vitaminKAntagonist"], weightRange: { min: 10, max: 50 } },
  "cefazolin": { name: "cefazolin", rxnorm: "2180", classes: ["cephalosporin", "betaLactam", "antibiotic"], highAlert: false, antibiotic: true, interactsWith: [], weightRange: { min: 20, max: 50 } },
  "ceftriaxone": { name: "ceftriaxone", rxnorm: "2193", classes: ["cephalosporin", "betaLactam", "antibiotic"], highAlert: false, antibiotic: true, interactsWith: ["calciumIv"], weightRange: { min: 25, max: 100 } },
  "azithromycin": { name: "azithromycin", rxnorm: "18631", classes: ["macrolide", "antibiotic", "qtProlonging"], highAlert: false, antibiotic: true, interactsWith: ["qtProlonging", "vitaminKAntagonist"], weightRange: { min: 5, max: 10 } },
  "vancomycin": { name: "vancomycin", rxnorm: "11124", classes: ["glycopeptide", "antibiotic"], highAlert: false, antibiotic: true, interactsWith: ["aminoglycoside", "nsaid"], weightRange: { min: 10, max: 20 } },
  "lisinopril": { name: "lisinopril", rxnorm: "29046", classes: ["aceInhibitor", "antihypertensive"], highAlert: false, antibiotic: false, interactsWith: ["potassiumSparing", "nsaid"], weightRange: { min: 0.1, max: 0.6 } },
  "metformin": { name: "metformin", rxnorm: "6809", classes: ["biguanide", "antidiabetic"], highAlert: false, antibiotic: false, interactsWith: ["iodinatedContrast"] },
  "atorvastatin": { name: "atorvastatin", rxnorm: "83367", classes: ["statin", "lipidLowering"], highAlert: false, antibiotic: false, interactsWith: ["strongCyp3a4Inhibitor"] },
  "warfarin": { name: "warfarin", rxnorm: "11289", classes: ["anticoagulant", "vitaminKAntagonist"], highAlert: true, antibiotic: false, interactsWith: ["anticoagulant", "nsaid", "antiplatelet", "macrolide"], weightRange: { min: 0.1, max: 0.3 } },
  "apixaban": { name: "apixaban", rxnorm: "1364430", classes: ["anticoagulant", "factorXaInhibitor"], highAlert: true, antibiotic: false, interactsWith: ["anticoagulant", "nsaid", "antiplatelet"] },
  "enoxaparin": { name: "enoxaparin", rxnorm: "67108", classes: ["anticoagulant", "lowMolecularWeightHeparin"], highAlert: true, antibiotic: false, interactsWith: ["anticoagulant", "nsaid", "antiplatelet"], weightRange: { min: 0.5, max: 1.5 } },
  "heparin": { name: "heparin", rxnorm: "5224", classes: ["anticoagulant", "unfractionatedHeparin"], highAlert: true, antibiotic: false, interactsWith: ["anticoagulant", "nsaid", "antiplatelet"] },
  "insulin glargine": { name: "insulin glargine", rxnorm: "274783", classes: ["basalInsulin", "insulin"], highAlert: true, antibiotic: false, interactsWith: [] },
  "insulin lispro": { name: "insulin lispro", rxnorm: "86009", classes: ["bolusInsulin", "insulin"], highAlert: true, antibiotic: false, interactsWith: [] },
  "morphine": { name: "morphine", rxnorm: "7052", classes: ["opioid", "analgesic", "controlled-II-IV"], highAlert: true, antibiotic: false, interactsWith: ["opioid", "benzodiazepine", "sedative"], weightRange: { min: 0.1, max: 0.2 }, schedule: "II", mmeFactor: 1 },
  "hydromorphone": { name: "hydromorphone", rxnorm: "3423", classes: ["opioid", "analgesic", "controlled-II-IV"], highAlert: true, antibiotic: false, interactsWith: ["opioid", "benzodiazepine", "sedative"], schedule: "II", mmeFactor: 4 },
  "oxycodone": { name: "oxycodone", rxnorm: "7804", classes: ["opioid", "analgesic", "controlled-II-IV"], highAlert: true, antibiotic: false, interactsWith: ["opioid", "benzodiazepine", "sedative"], weightRange: { min: 0.1, max: 0.2 }, schedule: "II", mmeFactor: 1.5 },
  "hydrocodone-acetaminophen": { name: "hydrocodone-acetaminophen", rxnorm: "214182", classes: ["opioid", "analgesic", "acetaminophen", "controlled-II-IV"], highAlert: true, antibiotic: false, interactsWith: ["opioid", "benzodiazepine", "sedative"], weightRange: { min: 0.1, max: 0.2 }, schedule: "II", mmeFactor: 1 },
  "tramadol": { name: "tramadol", rxnorm: "10689", classes: ["opioid", "analgesic", "serotonergic", "controlled-II-IV"], highAlert: true, antibiotic: false, interactsWith: ["opioid", "benzodiazepine", "sedative", "serotonergic"], weightRange: { min: 1, max: 2 }, schedule: "IV", mmeFactor: 0.2 },
  "lorazepam": { name: "lorazepam", rxnorm: "6470", classes: ["benzodiazepine", "sedative", "controlled-II-IV"], highAlert: false, antibiotic: false, interactsWith: ["opioid", "sedative"], schedule: "IV" },
  "alprazolam": { name: "alprazolam", rxnorm: "596", classes: ["benzodiazepine", "sedative", "controlled-II-IV"], highAlert: false, antibiotic: false, interactsWith: ["opioid", "sedative"], schedule: "IV" },
  "ondansetron": { name: "ondansetron", rxnorm: "26225", classes: ["serotoninAntagonist", "antiemetic", "qtProlonging"], highAlert: false, antibiotic: false, interactsWith: ["qtProlonging"], weightRange: { min: 0.1, max: 0.2 } },
  "acetaminophen": { name: "acetaminophen", rxnorm: "161", classes: ["acetaminophen", "analgesic", "antipyretic"], highAlert: false, antibiotic: false, interactsWith: [], weightRange: { min: 10, max: 15 } },
  "ibuprofen": { name: "ibuprofen", rxnorm: "5640", classes: ["nsaid", "analgesic", "antipyretic"], highAlert: false, antibiotic: false, interactsWith: ["anticoagulant", "aceInhibitor", "glycopeptide"], weightRange: { min: 5, max: 10 } },
  "albuterol": { name: "albuterol", rxnorm: "435", classes: ["betaAgonist", "bronchodilator"], highAlert: false, antibiotic: false, interactsWith: ["betaBlocker"], weightRange: { min: 0.1, max: 0.2 } },
};

export const DRUG_NAMES: readonly DrugName[] = [
  "amoxicillin", "cefazolin", "ceftriaxone", "azithromycin", "vancomycin", "lisinopril", "metformin",
  "atorvastatin", "warfarin", "apixaban", "enoxaparin", "heparin", "insulin glargine", "insulin lispro",
  "morphine", "hydromorphone", "ondansetron", "acetaminophen", "ibuprofen", "albuterol",
  "oxycodone", "hydrocodone-acetaminophen", "tramadol", "lorazepam", "alprazolam",
];

export function isDrugName(s: string): s is DrugName {
  return DRUG_NAMES.some((d) => d === s);
}

export function drugDef(name: string): DrugDef | undefined {
  return isDrugName(name) ? FORMULARY[name] : undefined;
}

/** Route vocabulary used in `OrderChoice.route`. */
export const ROUTES = ["PO", "IV", "IM", "SC", "INH"] as const;
export type Route = (typeof ROUTES)[number];

/** Frequency vocabulary used in `OrderChoice.freq`. TIDAC = three times daily with meals. */
export const FREQS = ["once", "daily", "BID", "TID", "QID", "q3h", "q4h", "q6h", "q8h", "q12h", "q24h", "nightly", "TIDAC"] as const;
export type Freq = (typeof FREQS)[number];

/** Antibiotic indication codes (value set "abx-indications"; slugs pending the Lean value set). */
export const ABX_INDICATIONS = [
  "community-acquired-pneumonia",
  "acute-sinusitis",
  "strep-pharyngitis",
  "acute-otitis-media",
  "cellulitis",
  "urinary-tract-infection",
  "pyelonephritis",
  "intra-abdominal-infection",
  "surgical-prophylaxis",
  "copd-exacerbation",
  "sepsis",
] as const;
export type AbxIndication = (typeof ABX_INDICATIONS)[number];

/** Round to a step, e.g. roundTo(817, 10) = 820. */
export function roundTo(x: number, step: number): number {
  return Math.round(x / step) * step;
}

export interface OrderOpts {
  indication?: AbxIndication;
  prn?: boolean;
}

/** Build an `OrderChoice`. `dose` is in `unit` (mg, units, mcg ...). */
export function order(drug: DrugName, dose: number, unit: UnitKind, route: Route, freq: Freq, opts: OrderOpts = {}): OrderChoice {
  const o: OrderChoice = {
    drug,
    doseTenths: Math.round(dose * 10),
    unit,
    route,
    freq,
    prn: opts.prn ?? false,
  };
  if (FORMULARY[drug].antibiotic) {
    if (opts.indication === undefined) throw new Error(`antibiotic ${drug} ordered without an indication`);
    o.indication = opts.indication;
  }
  return o;
}

/**
 * Weight-based dose in mg (or units): `perKg` × weight, capped at `maxDose`,
 * rounded to `step`, and nudged so the result stays inside the drug's
 * weight range when the cap allows it.
 */
export function weightDose(drug: DrugName, perKg: number, weightKg: number, step: number, maxDose: number): number {
  const raw = Math.min(perKg * weightKg, maxDose);
  let dose = Math.min(maxDose, Math.max(step, roundTo(raw, step)));
  const range = FORMULARY[drug].weightRange;
  if (range !== undefined) {
    while (dose / weightKg > range.max && dose - step >= step) dose -= step;
    while (dose / weightKg < range.min && dose + step <= maxDose) dose += step;
  }
  return Math.round(dose * 1000) / 1000;
}

/** Dose per kg of an order, for range checks (mg/kg or units/kg). */
export function dosePerKg(o: OrderChoice, weightKg: number): number {
  const dose = o.doseTenths / 10;
  const mg = o.unit === "mcg" ? dose / 1000 : o.unit === "g" ? dose * 1000 : dose;
  return mg / weightKg;
}

export function isAntibiotic(drug: string): boolean {
  return drugDef(drug)?.antibiotic ?? false;
}

export function isHighAlert(drug: string): boolean {
  return drugDef(drug)?.highAlert ?? false;
}

export function hasClass(drug: string, cls: string): boolean {
  return drugDef(drug)?.classes.includes(cls) ?? false;
}

export function isControlled(drug: string): boolean {
  return drugDef(drug)?.schedule !== undefined;
}

export function isOpioid(drug: string): boolean {
  return hasClass(drug, "opioid");
}

export function isBenzodiazepine(drug: string): boolean {
  return hasClass(drug, "benzodiazepine");
}

/** Doses per day at the order's frequency (PRN orders count at their maximum frequency). */
export function dosesPerDay(freq: string): number {
  switch (freq) {
    case "q3h":
      return 8;
    case "q4h":
      return 6;
    case "q6h":
    case "QID":
      return 4;
    case "q8h":
    case "TID":
    case "TIDAC":
      return 3;
    case "q12h":
    case "BID":
      return 2;
    case "daily":
    case "q24h":
    case "nightly":
    case "once":
      return 1;
    default:
      return 1;
  }
}

/** Oral morphine milligram equivalents per day for an outpatient opioid order (0 if not an oral opioid). */
export function mmePerDay(o: OrderChoice): number {
  const f = drugDef(o.drug)?.mmeFactor;
  if (f === undefined || o.route !== "PO" || o.unit !== "mg") return 0;
  return (o.doseTenths / 10) * dosesPerDay(o.freq) * f;
}

/** MME/day at or above which the naloxone-offer rule applies (California, owner-approved spec addition). */
export const NALOXONE_MME_THRESHOLD = 90;

/**
 * Absolute per-dose caps used by the pediatric regimens (mg). Once a dose hits
 * its cap, mg/kg may fall below the range minimum for heavy children; that is
 * correct dosing. (Lean's `DrugInfo` has no absolute cap yet; see STATUS.md.)
 */
export const PEDS_DOSE_CAPS: Partial<Record<DrugName, readonly number[]>> = {
  amoxicillin: [2000, 1000],
  azithromycin: [500],
  ceftriaxone: [1000],
  acetaminophen: [1000],
  ibuprofen: [400],
  ondansetron: [4],
  albuterol: [5],
};

export function pedsDoseCaps(drug: string): readonly number[] {
  return isDrugName(drug) ? (PEDS_DOSE_CAPS[drug] ?? []) : [];
}
