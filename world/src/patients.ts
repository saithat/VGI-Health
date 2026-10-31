/**
 * Loads the patient population: `fixtures/synthea/index.json` plus one FHIR
 * Bundle per patient (Synthea output, trimmed by the infra lane), or the
 * hand-written test fixtures in `world/test/fixtures/` (same layout).
 *
 * The index format is read leniently because the infra lane owns it:
 * - an array of entries, or an object with `patients` / `entries` / `items`;
 * - each entry: `id` | `patientId` | `medplumId` (optional), and a bundle path
 *   in `file` | `bundle` | `path` | `bundlePath` | `filename` (relative to the
 *   index file). If no path is given, `<id>.json` and `bundles/<id>.json` are tried.
 * - an entry may also be a bare string (the bundle path).
 * Patient facts (age, sex, conditions, meds, allergies, weight, labs,
 * immunizations) are always read from the bundle itself.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { ageYearsOn } from "./calendar";
import { type DrugName, type Freq, type Route } from "./formulary";
import { asArray, asString, codings, conceptText, getNumber, getPath, getString, isRecord } from "./json";

export type ConditionTag =
  | "htn"
  | "dm2"
  | "prediabetes"
  | "hld"
  | "afib"
  | "asthma"
  | "copd"
  | "ckd"
  | "obesity"
  | "otitis"
  | "cholelithiasis"
  | "appendectomy"
  | "cholecystectomy";

export interface HomeMed {
  drug: DrugName;
  dose: number;
  unit: "mg" | "mcg" | "units";
  route: Route;
  freq: Freq;
  prn: boolean;
  display: string;
  /** "record" if read from the bundle; "world" if assigned by the world generator (emitted as FHIR in todayResources). */
  origin: "record" | "world";
}

export interface Allergy {
  display: string;
  /** Drug classes this allergy rules out ("penicillin", "cephalosporin", "sulfonamide", ...) or "food"/"environment". */
  classes: string[];
  criticality: "low" | "high" | "unable-to-assess";
}

export interface LabValue {
  loinc: string;
  value: number;
  unit: string;
  date: string;
}

export interface PatientProfile {
  id: string;
  name: string;
  gender: "male" | "female" | "other" | "unknown";
  birthDate: string;
  /** Age in whole years on simulation day 1. */
  ageYears: number;
  tags: ConditionTag[];
  conditionDisplays: string[];
  homeMeds: HomeMed[];
  otherMedDisplays: string[];
  allergies: Allergy[];
  /** Most recent recorded body weight in kg, or an age/sex estimate. */
  weightKg: number;
  weightDate: string | null;
  weightEstimated: boolean;
  immunizations: { cvx: string; date: string }[];
  /** Latest value per LOINC code. */
  labs: Record<string, LabValue>;
  /** Number of encounters in the record (history length), for new-vs-established flavour. */
  encounterCount: number;
}

export interface Population {
  source: string;
  indexPath: string;
  patients: PatientProfile[];
}

const LOINC_WEIGHT = "29463-7";

const CONDITION_RULES: readonly [ConditionTag, RegExp][] = [
  ["htn", /\b59621000\b|hypertension/i],
  ["prediabetes", /\b15777000\b|prediabetes/i],
  ["dm2", /\b44054006\b|diabetes mellitus type 2|type 2 diabetes|diabetes(?! insipidus)/i],
  ["hld", /\b55822004\b|hyperlipidemia|hypercholesterol|hypertriglycerid/i],
  ["afib", /\b49436004\b|atrial fibrillation/i],
  ["asthma", /\b195967001\b|asthma/i],
  ["copd", /\b13645005\b|\b185086009\b|chronic obstructive|\bcopd\b|emphysema/i],
  ["ckd", /chronic kidney disease/i],
  ["obesity", /\b162864005\b|obes|body mass index 3\d/i],
  ["otitis", /otitis media/i],
  ["cholelithiasis", /cholelithiasis|gallstone/i],
  ["appendectomy", /\b80146002\b|appendectomy/i],
  ["cholecystectomy", /cholecystectomy/i],
];

const MED_RULES: readonly [DrugName, RegExp][] = [
  ["lisinopril", /lisinopril/i],
  ["metformin", /metformin/i],
  ["atorvastatin", /atorvastatin/i],
  ["warfarin", /warfarin/i],
  ["apixaban", /apixaban|eliquis/i],
  ["insulin glargine", /glargine|lantus|basaglar|semglee|toujeo/i],
  ["insulin lispro", /lispro|humalog|admelog|lyumjev/i],
  ["albuterol", /albuterol/i],
  ["hydrocodone-acetaminophen", /(?=.*(?:acetaminophen|apap))(?=.*hydrocodone)|norco|vicodin/i],
  ["oxycodone", /oxycodone|percocet|oxycontin/i],
  ["tramadol", /tramadol/i],
  ["lorazepam", /lorazepam|ativan/i],
  ["alprazolam", /alprazolam|xanax/i],
  ["morphine", /morphine/i],
  ["hydromorphone", /hydromorphone|dilaudid/i],
];

/** mg strength next to the drug's own name (so "Acetaminophen 325 MG / Oxycodone 5 MG" gives 5 for oxycodone). */
function strengthFor(display: string, word: RegExp): number | undefined {
  const near = new RegExp(`(?:${word.source})\\D{0,40}?(\\d+(?:\\.\\d+)?)\\s*MG\\b`, "i").exec(display);
  if (near?.[1] !== undefined) return Number(near[1]);
  const any = /(\d+(?:\.\d+)?)\s*MG\b/i.exec(display);
  return any?.[1] !== undefined ? Number(any[1]) : undefined;
}

function homeMedFrom(drug: DrugName, display: string): HomeMed {
  const rule = MED_RULES.find(([d]) => d === drug);
  const n = strengthFor(display, drug === "hydrocodone-acetaminophen" ? /hydrocodone|norco|vicodin/ : rule?.[1] ?? new RegExp(drug));
  return { ...homeMedCore(drug, display, n), origin: "record" };
}

function homeMedCore(drug: DrugName, display: string, n: number | undefined): Omit<HomeMed, "origin"> {
  switch (drug) {
    case "lisinopril":
      return { drug, dose: n ?? 10, unit: "mg", route: "PO", freq: "daily", prn: false, display };
    case "metformin": {
      const er = /24 HR|extended release|\bER\b/i.test(display);
      return { drug, dose: n ?? 500, unit: "mg", route: "PO", freq: er ? "daily" : "BID", prn: false, display };
    }
    case "atorvastatin":
      return { drug, dose: n ?? 20, unit: "mg", route: "PO", freq: "daily", prn: false, display };
    case "warfarin":
      return { drug, dose: n ?? 5, unit: "mg", route: "PO", freq: "daily", prn: false, display };
    case "apixaban":
      return { drug, dose: n ?? 5, unit: "mg", route: "PO", freq: "BID", prn: false, display };
    case "insulin glargine":
      return { drug, dose: 20, unit: "units", route: "SC", freq: "daily", prn: false, display };
    case "insulin lispro":
      return { drug, dose: 4, unit: "units", route: "SC", freq: "TIDAC", prn: false, display };
    case "albuterol":
      return { drug, dose: 180, unit: "mcg", route: "INH", freq: "q4h", prn: true, display };
    case "oxycodone": {
      const er = /extended release|oxycontin/i.test(display);
      return { drug, dose: n ?? 5, unit: "mg", route: "PO", freq: er ? "q12h" : "q6h", prn: !er, display };
    }
    case "hydrocodone-acetaminophen":
      return { drug, dose: n !== undefined && n <= 10 ? n : 5, unit: "mg", route: "PO", freq: "q6h", prn: true, display };
    case "tramadol":
      return { drug, dose: n ?? 50, unit: "mg", route: "PO", freq: "q6h", prn: true, display };
    case "lorazepam":
      return { drug, dose: n ?? 1, unit: "mg", route: "PO", freq: "BID", prn: true, display };
    case "alprazolam":
      return { drug, dose: n ?? 0.5, unit: "mg", route: "PO", freq: "TID", prn: true, display };
    case "morphine":
      return { drug, dose: n ?? 15, unit: "mg", route: "PO", freq: "q12h", prn: false, display };
    case "hydromorphone":
      return { drug, dose: n ?? 2, unit: "mg", route: "PO", freq: "q6h", prn: true, display };
    default:
      return { drug, dose: n ?? 1, unit: "mg", route: "PO", freq: "daily", prn: false, display };
  }
}

function allergyClasses(text: string, category: string): string[] {
  const out: string[] = [];
  if (/penicillin|amoxicillin|ampicillin|\b7980\b|\b7984\b|\b91936005\b|\b294505008\b/i.test(text)) out.push("penicillin");
  if (/cephalosporin|cefazolin|ceftriaxone|cephalexin|cefdinir/i.test(text)) out.push("cephalosporin");
  if (/sulfa|sulfonamide/i.test(text)) out.push("sulfonamide");
  if (/aspirin|nsaid|ibuprofen/i.test(text)) out.push("nsaid");
  if (/morphine|codeine|opioid/i.test(text)) out.push("opioid");
  if (out.length === 0) out.push(category === "food" ? "food" : category === "medication" ? "medication-other" : "environment");
  return out;
}

/** Rough weight estimate (kg) when the record has none. */
export function estimateWeightKg(ageYears: number, gender: string): number {
  if (ageYears < 1) return 7.5;
  if (ageYears <= 6) return 2 * ageYears + 8;
  if (ageYears <= 12) return (7 * ageYears - 5) / 2;
  if (ageYears < 18) return gender === "male" ? 45 + (ageYears - 12) * 4 : 42 + (ageYears - 12) * 3;
  return gender === "male" ? 86 : 74;
}

function refId(ref: string | undefined): string | undefined {
  if (ref === undefined) return undefined;
  const m = /(?:Patient\/|urn:uuid:)?([^/]+)$/.exec(ref);
  return m?.[1];
}

/** Parse one bundle into profiles (normally one patient per bundle). */
export function profilesFromBundle(bundle: unknown, idOverride?: string): PatientProfile[] {
  const resources = asArray(getPath(bundle, "entry"))
    .map((e) => getPath(e, "resource"))
    .filter(isRecord);
  const patients = resources.filter((r) => r["resourceType"] === "Patient");
  const out: PatientProfile[] = [];
  for (const p of patients) {
    const pid = asString(p["id"]) ?? "unknown";
    const own =
      patients.length === 1
        ? resources
        : resources.filter((r) => {
            const subj = refId(getString(r, "subject", "reference") ?? getString(r, "patient", "reference"));
            return subj === pid;
          });
    out.push(buildProfile(p, own, patients.length === 1 && idOverride !== undefined ? idOverride : pid));
  }
  return out;
}

function buildProfile(patient: Record<string, unknown>, resources: Record<string, unknown>[], id: string): PatientProfile {
  const given = asArray(getPath(patient, "name", 0, "given")).map(asString).filter((s): s is string => s !== undefined);
  const family = getString(patient, "name", 0, "family") ?? "";
  const name = `${given.join(" ")} ${family}`.replace(/\d+/g, "").replace(/\s+/g, " ").trim() || id;
  const g = getString(patient, "gender");
  const gender = g === "male" || g === "female" || g === "other" ? g : "unknown";
  const birthDate = getString(patient, "birthDate") ?? "1980-01-01";
  const ageYears = ageYearsOn(birthDate, 1);

  const tags = new Set<ConditionTag>();
  const conditionDisplays: string[] = [];
  const homeMeds = new Map<DrugName, HomeMed>();
  const otherMedDisplays: string[] = [];
  const allergies: Allergy[] = [];
  const immunizations: { cvx: string; date: string }[] = [];
  const labs: Record<string, LabValue> = {};
  let weight: { kg: number; date: string } | undefined;
  let encounterCount = 0;

  for (const r of resources) {
    const rt = r["resourceType"];
    if (rt === "Condition") {
      const text = conceptText(r["code"]);
      const resolved = getString(r, "abatementDateTime") !== undefined || /resolved|inactive|remission/.test(conceptText(r["clinicalStatus"]));
      const display = codings(r["code"])[0]?.display ?? text;
      for (const [tag, re] of CONDITION_RULES) {
        if (!re.test(text)) continue;
        // Past surgeries count even when "resolved"; active disease only otherwise.
        if (resolved && tag !== "appendectomy" && tag !== "cholecystectomy") continue;
        if (tag === "dm2" && /prediabetes/i.test(text)) continue;
        tags.add(tag);
      }
      if (!resolved && !conditionDisplays.includes(display)) conditionDisplays.push(display);
    } else if (rt === "Procedure") {
      const text = conceptText(r["code"]);
      if (/\b80146002\b|appendectomy/i.test(text)) tags.add("appendectomy");
      if (/cholecystectomy/i.test(text)) tags.add("cholecystectomy");
    } else if (rt === "MedicationRequest" || rt === "MedicationStatement") {
      const status = getString(r, "status") ?? "active";
      if (status !== "active" && status !== "on-hold") continue;
      const display = codings(r["medicationCodeableConcept"])[0]?.display ?? conceptText(r["medicationCodeableConcept"]);
      const rule = MED_RULES.find(([, re]) => re.test(display));
      if (rule !== undefined) {
        if (!homeMeds.has(rule[0])) homeMeds.set(rule[0], homeMedFrom(rule[0], display));
      } else if (display !== "" && !otherMedDisplays.includes(display)) {
        otherMedDisplays.push(display);
      }
    } else if (rt === "AllergyIntolerance") {
      const status = conceptText(r["clinicalStatus"]);
      if (/inactive|resolved/.test(status)) continue;
      const text = conceptText(r["code"]);
      const display = codings(r["code"])[0]?.display ?? text;
      const cat = asString(asArray(r["category"])[0]) ?? "";
      const crit = getString(r, "criticality");
      allergies.push({
        display,
        classes: allergyClasses(text, cat),
        criticality: crit === "high" || crit === "unable-to-assess" ? crit : "low",
      });
    } else if (rt === "Immunization") {
      const cvx = codings(r["vaccineCode"]).find((c) => /cvx/i.test(c.system))?.code ?? codings(r["vaccineCode"])[0]?.code;
      const date = getString(r, "occurrenceDateTime") ?? "";
      if (cvx !== undefined && cvx !== "") immunizations.push({ cvx, date: date.slice(0, 10) });
    } else if (rt === "Observation") {
      const loinc = codings(r["code"]).find((c) => /loinc/i.test(c.system) || /^\d+-\d$/.test(c.code))?.code;
      const value = getNumber(r, "valueQuantity", "value");
      const unit = getString(r, "valueQuantity", "unit") ?? getString(r, "valueQuantity", "code") ?? "";
      const date = (getString(r, "effectiveDateTime") ?? getString(r, "issued") ?? "").slice(0, 10);
      if (loinc === undefined || value === undefined) continue;
      if (loinc === LOINC_WEIGHT) {
        const kg = /lb/i.test(unit) ? value / 2.20462 : value;
        if (weight === undefined || date >= weight.date) weight = { kg, date };
      } else {
        const prev = labs[loinc];
        if (prev === undefined || date >= prev.date) labs[loinc] = { loinc, value, unit, date };
      }
    } else if (rt === "Encounter") {
      encounterCount++;
    }
  }

  const weightKg = weight?.kg ?? estimateWeightKg(ageYears, gender);

  return {
    id,
    name,
    gender,
    birthDate,
    ageYears,
    tags: [...tags].sort(),
    conditionDisplays,
    homeMeds: [...homeMeds.values()].sort((a, b) => (a.drug < b.drug ? -1 : 1)),
    otherMedDisplays,
    allergies,
    weightKg: Math.round(weightKg * 10) / 10,
    weightDate: weight?.date ?? null,
    weightEstimated: weight === undefined,
    immunizations: immunizations.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
    labs,
    encounterCount,
  };
}

interface IndexEntry {
  id: string | undefined;
  file: string | undefined;
}

function indexEntries(index: unknown): IndexEntry[] {
  const list = Array.isArray(index)
    ? index
    : asArray(getPath(index, "patients")).length > 0
      ? asArray(getPath(index, "patients"))
      : asArray(getPath(index, "entries")).length > 0
        ? asArray(getPath(index, "entries"))
        : asArray(getPath(index, "items"));
  return list.map((e) => {
    if (typeof e === "string") return { id: undefined, file: e };
    const id = getString(e, "id") ?? getString(e, "patientId") ?? getString(e, "medplumId");
    const file = getString(e, "file") ?? getString(e, "bundle") ?? getString(e, "path") ?? getString(e, "bundlePath") ?? getString(e, "filename");
    return { id, file };
  });
}

/** Load a population from an index.json path. */
export function loadPopulation(indexPath: string): Population {
  const abs = resolve(indexPath);
  const dir = dirname(abs);
  const index: unknown = JSON.parse(readFileSync(abs, "utf8"));
  const patients: PatientProfile[] = [];
  const seen = new Set<string>();
  for (const entry of indexEntries(index)) {
    const candidates = entry.file !== undefined ? [join(dir, entry.file)] : entry.id !== undefined ? [join(dir, `${entry.id}.json`), join(dir, "bundles", `${entry.id}.json`)] : [];
    const file = candidates.find((c) => existsSync(c));
    if (file === undefined) throw new Error(`patient bundle not found for index entry ${JSON.stringify(entry)} (tried ${candidates.join(", ")})`);
    const bundle: unknown = JSON.parse(readFileSync(file, "utf8"));
    for (const p of profilesFromBundle(bundle, entry.id)) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      patients.push(p);
    }
  }
  if (patients.length === 0) throw new Error(`no patients found via ${abs}`);
  patients.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const source = asString(getPath(index, "source")) ?? asString(getPath(index, "generator")) ?? "synthea";
  return { source, indexPath: abs, patients };
}

export function hasAllergyClass(p: PatientProfile, cls: string): boolean {
  return p.allergies.some((a) => a.classes.includes(cls));
}

export function isPediatric(p: PatientProfile): boolean {
  return p.ageYears < 18;
}

export function homeMed(p: PatientProfile, drug: DrugName): HomeMed | undefined {
  return p.homeMeds.find((m) => m.drug === drug);
}

export function anticoagulant(p: PatientProfile): HomeMed | undefined {
  return p.homeMeds.find((m) => m.drug === "warfarin" || m.drug === "apixaban");
}

