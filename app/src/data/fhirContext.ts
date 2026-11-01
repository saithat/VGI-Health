import type { Bundle, Patient, Resource } from "@medplum/fhirtypes";
import type { ArtifactBinding, ClinicalFacts, InfoPayload, PayloadIdentifier } from "../../../lean/generated/ehr-types";

/** Raw, version-bound display payloads for the core's caller-supplied context.
 * This adapter does not determine guards, alerts, required fields, or visibility.
 * Artifact identity includes the exact opaque FHIR version; the numeric revision
 * is 1 because each such immutable version is a separate artifact.
 */
export function fhirDisplayContext(bundle: Bundle, patientId: string, leanPatientId = patientId, encounterId?: string) {
  const resources = bundle.entry?.flatMap((e) => e.resource ? [e.resource] : []) ?? [];
  const patient = resources.find((r): r is Patient => r.resourceType === "Patient" && r.id === patientId);
  const artifactBindings: ArtifactBinding[] = [];
  const infoPayloads: InfoPayload[] = [];
  const clinical: ClinicalFacts = { risks: [], testResults: [] };
  const clinicalSource = (resource: Resource, key: string, code: string) => {
    const artifact = `${resource.resourceType}/${resource.id}/_history/${resource.meta?.versionId}`;
    artifactBindings.push({ key, artifact, version: 1 });
    return { code, artifactKey: key, artifact, version: 1 };
  };
  const encounter = resources.find((r) => r.resourceType === "Encounter" && r.id === encounterId);
  if (encounter?.resourceType === "Encounter" && encounter.meta?.versionId && encounter.serviceType?.coding?.[0]?.code) {
    clinical.service = clinicalSource(encounter, "live:service", encounter.serviceType.coding[0].code);
  }
  for (const r of resources) {
    if (r.resourceType !== "Observation" || !r.meta?.versionId || !["final", "amended", "corrected"].includes(r.status)) continue;
    const risk = r.code.coding?.find((c) => c.system === "https://vgi-health.example/fhir/CodeSystem/clinical-risk")?.code;
    const code = r.valueCodeableConcept?.coding?.[0]?.code;
    if (risk && code) clinical.risks.push([risk, clinicalSource(r, `live:risk:${risk}`, code)]);
  }
  if (!patient?.meta?.versionId) return { artifactBindings, infoPayloads, clinical };
  const identifiers: PayloadIdentifier[] = [{ category: "patient", system: "urn:ietf:rfc:3986", value: `Patient/${patient.id}` }];
  const add = (info: string, source: Resource, fields: [string, string][], rows: InfoPayload["rows"] = [], availability: [string, boolean][] = []) => {
    if (!source.id || !source.meta?.versionId) return;
    const artifact = `${source.resourceType}/${source.id}/_history/${source.meta.versionId}`;
    const key = `live:${info}`;
    artifactBindings.push({ key, artifact, version: 1 });
    infoPayloads.push({ info, patient: leanPatientId, artifactKey: key, artifact, version: 1, fields, identifiers, availability, rows });
  };
  const name = patient.name?.[0]?.text ?? [...(patient.name?.[0]?.given ?? []), patient.name?.[0]?.family].filter(Boolean).join(" ");
  const fields: [string, string][] = [["name", name], ["dateOfBirth", patient.birthDate ?? ""], ["mrn", patient.identifier?.[0]?.value ?? ""]];
  add("careIdentity", patient, fields);
  add("patientListIdentity", patient, [], [{ id: patient.id ?? "", slot: 0, fields }]);
  const photo = patient.photo?.[0]?.url;
  add("patientPhoto", patient, photo ? [["photoUrl", photo]] : [], [], [["photoUrl", Boolean(photo)]]);
  const weight = resources.filter((r) => r.resourceType === "Observation" && r.code.coding?.some((c) => ["29463-7", "3141-9"].includes(c.code ?? "")))
    .sort((a, b) => (b.resourceType === "Observation" ? b.effectiveDateTime ?? "" : "").localeCompare(a.resourceType === "Observation" ? a.effectiveDateTime ?? "" : ""))[0];
  if (weight?.resourceType === "Observation" && weight.valueQuantity?.value !== undefined && (weight.valueQuantity.code ?? weight.valueQuantity.unit) === "kg") {
    add("orderingWeight", weight, [["weightKg", String(weight.valueQuantity.value)], ["measuredAt", weight.effectiveDateTime ?? ""]]);
  }
  const labs = resources.filter((r) => r.resourceType === "Observation" && r.category?.some((c) => c.coding?.some((code) => code.code === "laboratory")));
  for (const lab of labs) {
    if (lab.resourceType !== "Observation") continue;
    // The selected result's DiagnosticReport is the grouping artifact. A
    // standalone Observation is itself a valid single-test group.
    const report = resources.find((r) => r.resourceType === "DiagnosticReport" && r.result?.some((ref) => ref.reference === `Observation/${lab.id}`));
    if (infoPayloads.some((p) => p.info === "groupedResultComponents")) continue;
    const observations = report?.resourceType === "DiagnosticReport" ? labs.filter((l) => report.result?.some((ref) => ref.reference === `Observation/${l.id}`)) : [lab];
    const rows: InfoPayload["rows"] = observations.flatMap((r, slot) => r.resourceType !== "Observation" ? [] : [{ id: r.id ?? "", slot, fields: [
      ["testId", report?.id ?? r.id ?? ""], ["component", r.code.text ?? r.code.coding?.[0]?.display ?? r.code.coding?.[0]?.code ?? ""],
      ["value", r.valueQuantity?.value !== undefined ? String(r.valueQuantity.value) : r.valueString ?? ""],
      ["unit", r.valueQuantity?.unit ?? r.valueQuantity?.code ?? "Not supplied"],
      ["referenceRange", r.referenceRange?.[0]?.text ?? `${r.referenceRange?.[0]?.low?.value ?? ""}–${r.referenceRange?.[0]?.high?.value ?? ""}`],
      ["abnormalFlag", r.interpretation?.[0]?.coding?.[0]?.code ?? r.interpretation?.[0]?.text ?? "Not supplied"],
    ] }]);
    add("groupedResultComponents", report ?? lab, [], rows);
  }
  return { artifactBindings, infoPayloads, clinical };
}
