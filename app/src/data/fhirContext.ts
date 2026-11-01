import type { Bundle, Patient, Resource } from "@medplum/fhirtypes";
import type {
  ArtifactBinding,
  ClinicalFacts,
  InfoPayload,
  PayloadIdentifier,
} from "../../../lean/generated/ehr-types";

/** Source selection for review receipts; unknown sources fail explicitly. */
export function reviewSources(bundle: Bundle, info: string): Resource[] {
  const resources =
    bundle.entry?.flatMap((e) => (e.resource ? [e.resource] : [])) ?? [];
  const selected = resources.filter((r) => {
    switch (info) {
      case "allergyList":
        return r.resourceType === "AllergyIntolerance";
      case "currentMeds":
      case "anticoagulantList":
      case "marDoseDetails":
        return r.resourceType === "MedicationRequest";
      case "vitals":
        return (
          r.resourceType === "Observation" &&
          Boolean(
            r.category?.some((c) =>
              c.coding?.some((code) => code.code === "vital-signs"),
            ),
          )
        );
      case "relevantLabs":
      case "resultDetail":
      case "resultAbnormalFlags":
      case "resultTrend":
      case "coagLabs":
      case "glucoseTrend":
        return (
          r.resourceType === "DiagnosticReport" ||
          (r.resourceType === "Observation" &&
            Boolean(
              r.category?.some((c) =>
                c.coding?.some((code) => code.code === "laboratory"),
              ),
            ))
        );
      case "immunizationHistory":
        return r.resourceType === "Immunization";
      case "lastVisit":
        return r.resourceType === "Encounter";
      case "adherence":
        return r.resourceType === "MedicationStatement";
      case "intraopRecord":
        return (
          r.resourceType === "Procedure" ||
          (r.resourceType === "DocumentReference" &&
            Boolean(r.type?.coding?.some((c) => c.code === "11504-8")))
        );
      case "curesReport":
        return (
          r.resourceType === "DocumentReference" &&
          Boolean(r.type?.coding?.some((c) => c.code === "cures-report"))
        );
      case "orderSummary":
        return (
          r.resourceType === "MedicationRequest" ||
          r.resourceType === "ServiceRequest"
        );
      default:
        return false;
    }
  });
  if (!selected.length && ["allergyList", "currentMeds"].includes(info))
    return resources.filter((r) => r.resourceType === "Patient");
  if (!selected.length)
    throw new Error(`No versioned source record for review: ${info}`);
  return selected;
}

/** Raw, version-bound display payloads for the core's caller-supplied context.
 * This adapter does not determine guards, alerts, required fields, or visibility.
 * Artifact identity includes the exact opaque FHIR version; the numeric revision
 * is 1 because each such immutable version is a separate artifact.
 */
export function fhirDisplayContext(
  bundle: Bundle,
  patientId: string,
  leanPatientId = patientId,
  encounterId?: string,
) {
  const resources =
    bundle.entry?.flatMap((e) => (e.resource ? [e.resource] : [])) ?? [];
  const patient = resources.find(
    (r): r is Patient => r.resourceType === "Patient" && r.id === patientId,
  );
  const artifactBindings: ArtifactBinding[] = [];
  const infoPayloads: InfoPayload[] = [];
  const clinical: ClinicalFacts = { risks: [], testResults: [] };
  const clinicalSource = (resource: Resource, key: string, code: string) => {
    const artifact = `${resource.resourceType}/${resource.id}/_history/${resource.meta?.versionId}`;
    artifactBindings.push({ key, artifact, version: 1 });
    return { code, artifactKey: key, artifact, version: 1 };
  };
  const encounter = resources.find(
    (r) => r.resourceType === "Encounter" && r.id === encounterId,
  );
  if (
    encounter?.resourceType === "Encounter" &&
    encounter.meta?.versionId &&
    encounter.serviceType?.coding?.[0]?.code
  ) {
    clinical.service = clinicalSource(
      encounter,
      "live:service",
      encounter.serviceType.coding[0].code,
    );
  }
  // Assessments are episode-specific. A negative from yesterday's visit must
  // never become evidence for the selected encounter, or shadow a newer one.
  const assessments = resources
    .filter(
      (r) =>
        r.resourceType === "Observation" &&
        r.encounter?.reference === `Encounter/${encounterId}`,
    )
    .sort((a, b) =>
      (b.resourceType === "Observation"
        ? (b.effectiveDateTime ?? "")
        : ""
      ).localeCompare(
        a.resourceType === "Observation" ? (a.effectiveDateTime ?? "") : "",
      ),
    );
  const seenRisks = new Set<string>();
  for (const r of assessments) {
    if (
      r.resourceType !== "Observation" ||
      !r.meta?.versionId ||
      !["final", "amended", "corrected"].includes(r.status)
    )
      continue;
    const risk = r.code.coding?.find(
      (c) =>
        c.system === "https://vgi-health.example/fhir/CodeSystem/clinical-risk",
    )?.code;
    const code = r.valueCodeableConcept?.coding?.[0]?.code;
    if (risk && code && !seenRisks.has(risk)) {
      clinical.risks.push([risk, clinicalSource(r, `live:risk:${risk}`, code)]);
      seenRisks.add(risk);
    }
  }
  if (!patient?.meta?.versionId)
    return { artifactBindings, infoPayloads, clinical };
  const identifiers: PayloadIdentifier[] = [
    {
      category: "patient",
      system: "urn:ietf:rfc:3986",
      value: `Patient/${patient.id}`,
    },
  ];
  const add = (
    info: string,
    source: Resource,
    fields: [string, string][],
    rows: InfoPayload["rows"] = [],
    availability: [string, boolean][] = [],
  ) => {
    if (!source.id || !source.meta?.versionId) return;
    const artifact = `${source.resourceType}/${source.id}/_history/${source.meta.versionId}`;
    const key = `live:${info}`;
    artifactBindings.push({ key, artifact, version: 1 });
    infoPayloads.push({
      info,
      patient: leanPatientId,
      artifactKey: key,
      artifact,
      version: 1,
      fields,
      identifiers,
      availability,
      rows,
    });
  };
  const name =
    patient.name?.[0]?.text ??
    [...(patient.name?.[0]?.given ?? []), patient.name?.[0]?.family]
      .filter(Boolean)
      .join(" ");
  const fields: [string, string][] = [
    ["name", name],
    ["dateOfBirth", patient.birthDate ?? ""],
    ["mrn", patient.identifier?.[0]?.value ?? ""],
  ];
  add("careIdentity", patient, fields);
  add(
    "patientListIdentity",
    patient,
    [],
    [{ id: patient.id ?? "", slot: 0, fields }],
  );
  const photo = patient.photo?.[0]?.url;
  add(
    "patientPhoto",
    patient,
    photo ? [["photoUrl", photo]] : [],
    [],
    [["photoUrl", Boolean(photo)]],
  );
  const weight = resources
    .filter(
      (r) =>
        r.resourceType === "Observation" &&
        !["entered-in-error", "cancelled"].includes(r.status) &&
        r.code.coding?.some((c) =>
          ["29463-7", "3141-9"].includes(c.code ?? ""),
        ),
    )
    .sort((a, b) =>
      (b.resourceType === "Observation"
        ? (b.effectiveDateTime ?? "")
        : ""
      ).localeCompare(
        a.resourceType === "Observation" ? (a.effectiveDateTime ?? "") : "",
      ),
    )[0];
  if (
    weight?.resourceType === "Observation" &&
    weight.valueQuantity?.value !== undefined &&
    (weight.valueQuantity.code ?? weight.valueQuantity.unit) === "kg"
  ) {
    add("orderingWeight", weight, [
      ["weightKg", String(weight.valueQuantity.value)],
      ["measuredAt", weight.effectiveDateTime ?? ""],
    ]);
  }
  const labs = resources.filter(
    (r) =>
      r.resourceType === "Observation" &&
      r.category?.some((c) =>
        c.coding?.some((code) => code.code === "laboratory"),
      ),
  );
  if (labs.length && labs.every((r) => r.meta?.versionId)) {
    const reports = resources.filter(
      (r) =>
        r.resourceType === "DiagnosticReport" &&
        r.result?.some((ref) =>
          labs.some((lab) => ref.reference === `Observation/${lab.id}`),
        ),
    );
    const rows: InfoPayload["rows"] = labs.flatMap((r, slot) => {
      if (r.resourceType !== "Observation") return [];
      const report = reports.find(
        (report) =>
          report.resourceType === "DiagnosticReport" &&
          report.result?.some((ref) => ref.reference === `Observation/${r.id}`),
      );
      const parts = r.component?.length ? r.component : [r];
      return parts.map((part, index) => ({
        id: `${r.id}/${index}`,
        slot,
        fields: [
          ["testId", report?.id ?? r.id ?? ""],
          [
            "component",
            part.code.text ??
              part.code.coding?.[0]?.display ??
              part.code.coding?.[0]?.code ??
              "",
          ],
          [
            "value",
            part.valueQuantity?.value !== undefined
              ? String(part.valueQuantity.value)
              : (part.valueString ?? ""),
          ],
          [
            "unit",
            part.valueQuantity?.unit ??
              part.valueQuantity?.code ??
              "Not supplied",
          ],
          [
            "referenceRange",
            part.referenceRange?.[0]?.text ??
              (part.referenceRange?.length
                ? `${part.referenceRange[0]?.low?.value ?? ""}–${part.referenceRange[0]?.high?.value ?? ""}`
                : "Not supplied"),
          ],
          [
            "abnormalFlag",
            part.interpretation?.[0]?.coding?.[0]?.code ??
              part.interpretation?.[0]?.text ??
              "Not supplied",
          ],
        ],
      }));
    });
    const artifact = `urn:vgi:result-set:${[...labs, ...reports]
      .map((r) => `${r.resourceType}/${r.id}/_history/${r.meta?.versionId}`)
      .sort()
      .join("|")}`;
    artifactBindings.push({ key: "live:results", artifact, version: 1 });
    infoPayloads.push({
      info: "groupedResultComponents",
      patient: leanPatientId,
      artifactKey: "live:results",
      artifact,
      version: 1,
      fields: [],
      identifiers,
      availability: [],
      rows,
    });
  }
  return { artifactBindings, infoPayloads, clinical };
}
