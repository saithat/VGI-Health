import { z } from "zod";

// Validate the FHIR R4 projection consumed by this UI. Unknown FHIR fields are
// stripped; clinical facts are never inferred here (that is Lean's boundary).
const coding = z.object({
  system: z.string().optional(),
  code: z.string().optional(),
  display: z.string().optional(),
});
const concept = z.object({
  text: z.string().optional(),
  coding: z.array(coding).optional(),
});
const quantity = z.object({
  value: z.number().optional(),
  unit: z.string().optional(),
  code: z.string().optional(),
});
const reference = z.object({
  reference: z.string().optional(),
  display: z.string().optional(),
});
const period = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
});
const base = {
  id: z.string(),
  meta: z
    .object({
      versionId: z.string().optional(),
      lastUpdated: z.string().optional(),
    })
    .optional(),
};
export const patientSchema = z.object({
  ...base,
  resourceType: z.literal("Patient"),
  name: z
    .array(
      z.object({
        given: z.array(z.string()).optional(),
        family: z.string().optional(),
        text: z.string().optional(),
      }),
    )
    .optional(),
  birthDate: z.string().optional(),
  gender: z.string().optional(),
  identifier: z
    .array(z.object({ value: z.string().optional(), type: concept.optional() }))
    .optional(),
  communication: z
    .array(z.object({ language: concept, preferred: z.boolean().optional() }))
    .optional(),
  generalPractitioner: z.array(reference).optional(),
});
export const allergySchema = z.object({
  ...base,
  resourceType: z.literal("AllergyIntolerance"),
  code: concept.optional(),
  clinicalStatus: concept.optional(),
  criticality: z.string().optional(),
  recordedDate: z.string().optional(),
  reaction: z
    .array(
      z.object({
        manifestation: z.array(concept),
        severity: z.string().optional(),
      }),
    )
    .optional(),
});
export const medicationSchema = z.object({
  ...base,
  resourceType: z.literal("MedicationRequest"),
  status: z.string(),
  medicationCodeableConcept: concept.optional(),
  medicationReference: reference.optional(),
  authoredOn: z.string().optional(),
  dosageInstruction: z
    .array(z.object({ text: z.string().optional() }))
    .optional(),
});
export const observationSchema = z.object({
  ...base,
  resourceType: z.literal("Observation"),
  status: z.string(),
  code: concept,
  category: z.array(concept).optional(),
  effectiveDateTime: z.string().optional(),
  valueQuantity: quantity.optional(),
  valueString: z.string().optional(),
  component: z
    .array(z.object({ code: concept, valueQuantity: quantity.optional() }))
    .optional(),
  interpretation: z.array(concept).optional(),
  referenceRange: z
    .array(
      z.object({
        text: z.string().optional(),
        low: quantity.optional(),
        high: quantity.optional(),
      }),
    )
    .optional(),
});
export const conditionSchema = z.object({
  ...base,
  resourceType: z.literal("Condition"),
  code: concept.optional(),
  clinicalStatus: concept.optional(),
  onsetDateTime: z.string().optional(),
  recordedDate: z.string().optional(),
});
export const immunizationSchema = z.object({
  ...base,
  resourceType: z.literal("Immunization"),
  status: z.string(),
  vaccineCode: concept,
  occurrenceDateTime: z.string().optional(),
  lotNumber: z.string().optional(),
  site: concept.optional(),
});
export const encounterSchema = z.object({
  ...base,
  resourceType: z.literal("Encounter"),
  status: z.string(),
  type: z.array(concept).optional(),
  period: period.optional(),
  serviceProvider: reference.optional(),
});
export const appointmentSchema = z.object({
  ...base,
  resourceType: z.literal("Appointment"),
  status: z.string(),
  start: z.string().optional(),
  description: z.string().optional(),
});
export const serviceRequestSchema = z.object({
  ...base,
  resourceType: z.literal("ServiceRequest"),
  status: z.string(),
  code: concept.optional(),
  authoredOn: z.string().optional(),
});
export const coverageSchema = z.object({
  ...base,
  resourceType: z.literal("Coverage"),
  status: z.string(),
  payor: z.array(reference),
});
export const resourceSchema = z.discriminatedUnion("resourceType", [
  patientSchema,
  allergySchema,
  medicationSchema,
  observationSchema,
  conditionSchema,
  immunizationSchema,
  encounterSchema,
  appointmentSchema,
  serviceRequestSchema,
  coverageSchema,
]);
export const bundleSchema = z.object({
  resourceType: z.literal("Bundle"),
  type: z.string(),
  entry: z.array(z.object({ resource: resourceSchema })).default([]),
});
export const chartSchema = z.object({
  patient: patientSchema,
  resources: z.array(resourceSchema),
  source: z.enum(["offline", "commit"]),
  message: z.string(),
  // Display-only labels, never used for guards or eligibility.
  context: z.object({
    codeStatus: z.string(),
    isolation: z.string(),
    careGaps: z.array(z.string()),
    criticalFlags: z.array(z.string()),
    asOf: z.string(),
  }),
});
export type FhirResource = z.infer<typeof resourceSchema>;
export type Observation = z.infer<typeof observationSchema>;
export type ChartData = z.infer<typeof chartSchema>;
export type Concept = z.infer<typeof concept>;
export function conceptText(value: Concept | undefined): string {
  return (
    value?.text ??
    value?.coding?.map((item) => item.display ?? item.code ?? "").join(", ") ??
    "—"
  );
}
export function dateText(value: string | undefined): string {
  return value?.slice(0, 10) ?? "—";
}
