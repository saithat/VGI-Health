/**
 * Controlled-substance facts for the California rules in the spec
 * (owner-approved addition):
 * - CURES report review before a Schedule II-IV prescription, or a documented
 *   exemption (for example an ED or post-surgical supply of 7 days or less);
 * - a naloxone offer when an opioid is prescribed at >= 90 MME/day, or
 *   concurrently with a benzodiazepine.
 *
 * Supply and exemption facts use OrderChoice fields. Naloxone responses are
 * structured FHIR observations because TaskChoices has no response field.
 *
 * It also assigns chronic opioid therapy to a few P1 patients when the
 * population has too few (world-assigned home meds, emitted as FHIR).
 */
import type { ClinicalObservation } from "./fhir";
import { dateTimeOf } from "./calendar";
import { FORMULARY, NALOXONE_MME_THRESHOLD, isBenzodiazepine, isControlled, isOpioid, mmePerDay, order } from "./formulary";
import type { HomeMed, PatientProfile } from "./patients";
import { Rng } from "./rng";
import type { Json, OrderChoice } from "./schema";

export interface NaloxoneCheck {
  mme: number;
  benzo: boolean;
  applies: boolean;
}

/** The world's own check of the naloxone rule for a set of new outpatient prescriptions. */
export function naloxoneCheck(newRx: OrderChoice[], home: HomeMed[]): NaloxoneCheck {
  const newDrugs = new Set(newRx.map((o) => o.drug));
  const homeOrders = home.filter((m) => !newDrugs.has(m.drug)).map((m) => order(m.drug, m.dose, m.unit, m.route, m.freq, { prn: m.prn }));
  const all = [...newRx, ...homeOrders];
  const mme = all.reduce((s, o) => s + mmePerDay(o), 0);
  const opioid = all.some((o) => isOpioid(o.drug) && o.route === "PO");
  const benzo = all.some((o) => isBenzodiazepine(o.drug));
  const prescribingRisky = newRx.some((o) => isOpioid(o.drug) || isBenzodiazepine(o.drug));
  return { mme, benzo, applies: prescribingRisky && opioid && (mme >= NALOXONE_MME_THRESHOLD || benzo) };
}

/** Attach supply facts to outpatient orders and return any naloxone response. */
export function controlledPrescriptions(rx: OrderChoice[], supplyDays: number, home: HomeMed[], rng: Rng, setting?: "ed" | "postoperative"): ClinicalObservation[] {
  const controlled = rx.filter((o) => isControlled(o.drug) && o.route === "PO");
  if (controlled.length === 0) return [];
  for (const o of controlled) {
    o.supplyDays = supplyDays;
    if (supplyDays <= 7 && setting !== undefined) o.curesExemptReason = `${setting}-supply-7-days-or-less`;
  }
  return naloxoneCheck(rx, home).applies ? [{ code: "naloxoneOffer", value: rng.chance(0.65) ? "accepted" : "declined" }] : [];
}

/** Short-supply opioid choice for an acute outpatient prescription. */
export function acuteOpioidSupply(rng: Rng, longChance: number, short: readonly number[], long: number): number {
  return rng.chance(longChance) ? long : rng.pick(short);
}

/** World-assigned chronic regimens (opioid +/- benzodiazepine), cycled in order. */
const CHRONIC_REGIMENS: readonly (readonly Omit<HomeMed, "origin" | "display">[])[] = [
  [{ drug: "oxycodone", dose: 15, unit: "mg", route: "PO", freq: "q6h", prn: true }], // 90 MME
  [
    { drug: "oxycodone", dose: 10, unit: "mg", route: "PO", freq: "q6h", prn: true }, // 60 MME + benzo
    { drug: "alprazolam", dose: 0.5, unit: "mg", route: "PO", freq: "TID", prn: true },
  ],
  [{ drug: "hydrocodone-acetaminophen", dose: 10, unit: "mg", route: "PO", freq: "q6h", prn: true }], // 40 MME
  [
    { drug: "tramadol", dose: 50, unit: "mg", route: "PO", freq: "q6h", prn: true }, // 40 MME + benzo
    { drug: "lorazepam", dose: 1, unit: "mg", route: "PO", freq: "BID", prn: true },
  ],
  [{ drug: "hydrocodone-acetaminophen", dose: 7.5, unit: "mg", route: "PO", freq: "q6h", prn: true }], // 30 MME
  [{ drug: "oxycodone", dose: 20, unit: "mg", route: "PO", freq: "q6h", prn: true }], // 120 MME
];

function displayOf(m: Omit<HomeMed, "origin" | "display">): string {
  return `${m.drug} ${m.dose} MG Oral Tablet`;
}

/**
 * Make sure a few adults are on chronic opioids (some with a benzodiazepine).
 * Patients whose record already has them count; the rest are assigned
 * deterministically from the seed. Returns new profiles (inputs untouched).
 */
export function assignChronicOpioids(patients: PatientProfile[], seed: number): PatientProfile[] {
  const adults = patients.filter((p) => p.ageYears >= 18);
  const target = Math.max(2, Math.min(8, Math.round(adults.length * 0.05)));
  const already = adults.filter((p) => p.homeMeds.some((m) => isOpioid(m.drug)));
  const need = Math.max(0, target - already.length);
  if (need === 0) return patients;
  const rng = new Rng(`${seed}:chronic-opioids`);
  // Prefer middle-aged and older adults without anticoagulants (keeps the anticoagulant cases distinct).
  const pool = adults
    .filter((p) => !already.includes(p) && p.ageYears >= 35 && p.ageYears <= 80 && !p.homeMeds.some((m) => m.drug === "warfarin" || m.drug === "apixaban"))
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  const chosen = rng.shuffle(pool).slice(0, need);
  const assign = new Map<string, readonly Omit<HomeMed, "origin" | "display">[]>();
  chosen.forEach((p, i) => {
    const reg = CHRONIC_REGIMENS[i % CHRONIC_REGIMENS.length];
    if (reg !== undefined) assign.set(p.id, reg);
  });
  return patients.map((p) => {
    const reg = assign.get(p.id);
    if (reg === undefined) return p;
    const extra: HomeMed[] = reg.map((m) => ({ ...m, display: displayOf(m), origin: "world" }));
    return { ...p, homeMeds: [...p.homeMeds, ...extra] };
  });
}

/** Active MedicationRequests for world-assigned home meds, so FHIR-derived facts (current med classes) see them. */
export function worldHomeMedResources(p: PatientProfile): Json[] {
  return p.homeMeds
    .filter((m) => m.origin === "world")
    .map((m) => ({
      resourceType: "MedicationRequest",
      id: `${p.id}-home-${m.drug.replace(/[^a-z]/g, "")}`,
      meta: { tag: [{ system: "urn:vgi:world", code: "world-assigned-home-med" }] },
      status: "active",
      intent: "order",
      medicationCodeableConcept: { coding: [{ system: "http://www.nlm.nih.gov/research/umls/rxnorm", code: FORMULARY[m.drug].rxnorm, display: m.drug }], text: m.display },
      subject: { reference: `Patient/${p.id}` },
      authoredOn: dateTimeOf(-20, 10 * 60),
      dosageInstruction: [{ text: `${m.drug} ${m.dose} ${m.unit} ${m.route} ${m.freq}${m.prn ? " PRN" : ""}`, asNeededBoolean: m.prn }],
      dispenseRequest: { expectedSupplyDuration: { value: 30, unit: "days", system: "http://unitsofmeasure.org", code: "d" } },
    }));
}

export function hasChronicOpioid(p: PatientProfile): boolean {
  return p.homeMeds.some((m) => isOpioid(m.drug) && m.route === "PO");
}
