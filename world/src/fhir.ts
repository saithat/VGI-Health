/**
 * Builders for the synthetic FHIR R4 resources the world adds "today"
 * (`Task.todayResources`): triage and clinic weights, lab results, newly
 * reported allergies, refill-request Tasks, consents, imaging reports.
 */
import { dateTimeOf, SHIFTS } from "./calendar";
import type { Json } from "./schema";
import type { OrderChoice } from "./schema";

const UCUM = "http://unitsofmeasure.org";
const LOINC = "http://loinc.org";
const RXNORM = "http://www.nlm.nih.gov/research/umls/rxnorm";
const SNOMED = "http://snomed.info/sct";
const OBS_CAT = "http://terminology.hl7.org/CodeSystem/observation-category";
const INTERP = "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation";

/** Tag on every world-made resource, so loaders and the app can tell them apart. */
const META: Json = { tag: [{ system: "urn:vgi:world", code: "synthetic-today" }] };

const patientRef = (patientId: string): Json => ({ reference: `Patient/${patientId}` });

/** Clinical facts without dedicated TaskChoices fields use structured FHIR,
 * not encoded note-section IDs. These local codes describe synthetic events. */
export type ClinicalObservation =
  | { code: "naloxoneOffer"; value: "accepted" | "declined" }
  | { code: "sedationScore"; value: number }
  | { code: "prnReason"; value: "nausea" | "anxiety" };

export function clinicalObservation(id: string, patientId: string, day: number, clock: number, fact: ClinicalObservation): Json {
  return {
    resourceType: "Observation", id, meta: META, status: "final",
    code: { coding: [{ system: "urn:vgi:world:clinical", code: fact.code }] },
    subject: patientRef(patientId), effectiveDateTime: dateTimeOf(day, clock),
    ...(typeof fact.value === "number" ? { valueInteger: fact.value } : { valueCodeableConcept: { coding: [{ system: "urn:vgi:world:clinical", code: fact.value }] } }),
  };
}

export function weightObservation(id: string, patientId: string, day: number, clock: number, value: number, unit: "kg" | "lb"): Json {
  return {
    resourceType: "Observation",
    id,
    meta: META,
    status: "final",
    category: [{ coding: [{ system: OBS_CAT, code: "vital-signs", display: "Vital Signs" }] }],
    code: { coding: [{ system: LOINC, code: "29463-7", display: "Body weight" }], text: "Body weight" },
    subject: patientRef(patientId),
    effectiveDateTime: dateTimeOf(day, clock),
    valueQuantity: { value, unit, system: UCUM, code: unit === "kg" ? "kg" : "[lb_av]" },
  };
}

export interface LabDef {
  key: string;
  loinc: string;
  display: string;
  unit: string;
  low?: number;
  high?: number;
  decimals: number;
  /** Text results (cultures, pathology) have no numeric value. */
  text?: { normal: string; abnormal: string };
}

export const LABS = {
  potassium: { key: "potassium", loinc: "2823-3", display: "Potassium [Moles/volume] in Serum or Plasma", unit: "mmol/L", low: 3.5, high: 5.1, decimals: 1 },
  creatinine: { key: "creatinine", loinc: "2160-0", display: "Creatinine [Mass/volume] in Serum or Plasma", unit: "mg/dL", low: 0.6, high: 1.3, decimals: 2 },
  a1c: { key: "a1c", loinc: "4548-4", display: "Hemoglobin A1c/Hemoglobin.total in Blood", unit: "%", high: 5.6, decimals: 1 },
  ldl: { key: "ldl", loinc: "18262-6", display: "Cholesterol in LDL [Mass/volume] in Serum or Plasma by Direct assay", unit: "mg/dL", high: 99, decimals: 0 },
  inr: { key: "inr", loinc: "6301-6", display: "INR in Platelet poor plasma by Coagulation assay", unit: "{INR}", low: 0.8, high: 1.2, decimals: 1 },
  hemoglobin: { key: "hemoglobin", loinc: "718-7", display: "Hemoglobin [Mass/volume] in Blood", unit: "g/dL", low: 12, high: 17.5, decimals: 1 },
  wbc: { key: "wbc", loinc: "6690-2", display: "Leukocytes [#/volume] in Blood by Automated count", unit: "10*3/uL", low: 4.5, high: 11, decimals: 1 },
  glucose: { key: "glucose", loinc: "2345-7", display: "Glucose [Mass/volume] in Serum or Plasma", unit: "mg/dL", low: 70, high: 99, decimals: 0 },
  sodium: { key: "sodium", loinc: "2951-2", display: "Sodium [Moles/volume] in Serum or Plasma", unit: "mmol/L", low: 135, high: 145, decimals: 0 },
  tsh: { key: "tsh", loinc: "3016-3", display: "Thyrotropin [Units/volume] in Serum or Plasma", unit: "m[IU]/L", low: 0.4, high: 4, decimals: 2 },
  bloodCulture: { key: "bloodCulture", loinc: "600-7", display: "Bacteria identified in Blood by Culture", unit: "", decimals: 0, text: { normal: "No growth at 5 days", abnormal: "Staphylococcus aureus" } },
  pathology: { key: "pathology", loinc: "22637-3", display: "Pathology report final diagnosis Narrative", unit: "", decimals: 0, text: { normal: "Benign tissue; no malignancy identified", abnormal: "Acute suppurative inflammation" } },
} as const satisfies Record<string, LabDef>;

export type LabKey = keyof typeof LABS;

export function labDef(key: LabKey): LabDef {
  return LABS[key];
}

/** A lab result Observation. `value` is ignored for text results; `text` overrides the default text. */
export function labObservation(
  id: string,
  patientId: string,
  day: number,
  clock: number,
  key: LabKey,
  value: number,
  interpretation: "H" | "L" | "N" | "A",
  text?: string,
): Json {
  const def = labDef(key);
  const base: { [k: string]: Json } = {
    resourceType: "Observation",
    id,
    meta: META,
    status: "final",
    category: [{ coding: [{ system: OBS_CAT, code: "laboratory", display: "Laboratory" }] }],
    code: { coding: [{ system: LOINC, code: def.loinc, display: def.display }], text: def.display },
    subject: patientRef(patientId),
    effectiveDateTime: dateTimeOf(day, clock),
    issued: dateTimeOf(day, clock + 60),
    interpretation: [{ coding: [{ system: INTERP, code: interpretation, display: interpDisplay(interpretation) }] }],
  };
  if (def.text !== undefined) {
    base["valueString"] = text ?? (interpretation === "N" ? def.text.normal : def.text.abnormal);
  } else {
    base["valueQuantity"] = { value, unit: def.unit, system: UCUM, code: def.unit };
    const range: { [k: string]: Json } = {};
    if (def.low !== undefined) range["low"] = { value: def.low, unit: def.unit, system: UCUM, code: def.unit };
    if (def.high !== undefined) range["high"] = { value: def.high, unit: def.unit, system: UCUM, code: def.unit };
    base["referenceRange"] = [range];
  }
  return base;
}

function interpDisplay(code: "H" | "L" | "N" | "A"): string {
  return code === "H" ? "High" : code === "L" ? "Low" : code === "A" ? "Abnormal" : "Normal";
}

/** A newly reported allergy (for example at ED triage). */
export function allergyIntolerance(id: string, patientId: string, day: number, clock: number, substance: string, rxnorm: string, reaction: string, criticality: "low" | "high"): Json {
  return {
    resourceType: "AllergyIntolerance",
    id,
    meta: META,
    clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical", code: "active" }] },
    verificationStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification", code: "unconfirmed" }] },
    type: "allergy",
    category: ["medication"],
    criticality,
    code: { coding: [{ system: RXNORM, code: rxnorm, display: substance }], text: substance },
    patient: patientRef(patientId),
    recordedDate: dateTimeOf(day, clock),
    reaction: [{ manifestation: [{ text: reaction }] }],
  };
}

function medicationRequestJson(id: string, patientId: string, o: OrderChoice, rxnorm: string, status: string, authoredOn: string): { [k: string]: Json } {
  const dose = o.doseTenths / 10;
  const mr: { [k: string]: Json } = {
    resourceType: "MedicationRequest",
    id,
    status,
    intent: "order",
    medicationCodeableConcept: { coding: [{ system: RXNORM, code: rxnorm, display: o.drug }], text: o.drug },
    subject: patientRef(patientId),
    authoredOn,
    dosageInstruction: [
      {
        text: `${o.drug} ${dose} ${o.unit} ${o.route} ${o.freq}${o.prn ? " PRN" : ""}`,
        route: { text: o.route },
        timing: { code: { text: o.freq } },
        asNeededBoolean: o.prn,
        doseAndRate: [{ doseQuantity: { value: dose, unit: o.unit } }],
      },
    ],
  };
  if (o.supplyDays !== undefined && o.supplyDays !== null) mr["dispenseRequest"] = { expectedSupplyDuration: { value: o.supplyDays, unit: "days", system: UCUM, code: "d" } };
  return mr;
}

/** An inbox refill request: a FHIR Task whose focus is the (contained) prescription to renew. */
export function refillTask(id: string, patientId: string, day: number, clock: number, current: OrderChoice, rxnorm: string, lastFilledDaysAgo: number): Json {
  const contained = medicationRequestJson("current-rx", patientId, current, rxnorm, "active", dateTimeOf(day - lastFilledDaysAgo, 9 * 60));
  return {
    resourceType: "Task",
    id,
    meta: META,
    contained: [contained],
    status: "requested",
    intent: "order",
    priority: "routine",
    code: { coding: [{ system: "http://hl7.org/fhir/CodeSystem/task-code", code: "fulfill" }], text: "Refill request" },
    description: `Refill request: ${current.drug} ${current.doseTenths / 10} ${current.unit} ${current.freq}`,
    focus: { reference: "#current-rx" },
    for: patientRef(patientId),
    authoredOn: dateTimeOf(day, clock),
    requester: { display: "Patient portal" },
  };
}

/** Surgical consent on file (verified at pre-op). */
export function surgicalConsent(id: string, patientId: string, day: number, clock: number, procedure: string): Json {
  return {
    resourceType: "Consent",
    id,
    meta: META,
    status: "active",
    scope: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/consentscope", code: "treatment" }] },
    category: [{ coding: [{ system: LOINC, code: "59284-0", display: "Patient Consent" }] }],
    patient: patientRef(patientId),
    dateTime: dateTimeOf(day, clock),
    provision: { type: "permit", code: [{ text: procedure }] },
  };
}

/** Imaging report reviewed during a surgical consult. */
export function imagingReport(id: string, patientId: string, day: number, clock: number, study: string, conclusion: string, snomed: string): Json {
  return {
    resourceType: "DiagnosticReport",
    id,
    meta: META,
    status: "final",
    category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/v2-0074", code: "RAD", display: "Radiology" }] }],
    code: { text: study },
    subject: patientRef(patientId),
    effectiveDateTime: dateTimeOf(day, clock),
    issued: dateTimeOf(day, clock + 40),
    conclusion,
    conclusionCode: [{ coding: [{ system: SNOMED, code: snomed, display: conclusion }] }],
  };
}

/** Synthetic critical-result route; 30 minutes is local simulation policy.
 * The source records the reporting clock, recipients and result identity. */
export function criticalResultObservation(id: string, patientId: string, day: number, availableAt: number): Json {
  const observation = labObservation(id, patientId, day, SHIFTS.P1.startClock + availableAt, "potassium", 6.8, "H");
  if (typeof observation !== "object" || observation === null || Array.isArray(observation)) throw new Error("Observation object required");
  return {
    ...observation,
    issued: dateTimeOf(day, SHIFTS.P1.startClock + availableAt),
    interpretation: [{ coding: [{ system: INTERP, code: "HH", display: "Critical high" }] }],
    extension: [{
      url: "https://vgi.health/fhir/StructureDefinition/critical-result-route",
      extension: [
        { url: "responsible", valueString: "P1" },
        { url: "covering", valueString: "P2" },
        { url: "availableAt", valueInteger: availableAt },
        { url: "limit", valueInteger: 30 },
      ],
    }],
  };
}
