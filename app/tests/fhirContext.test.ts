import { describe, expect, it } from "vitest";
import type { Bundle, BundleEntry } from "../src/data/fhir-r4";
import { fhirDisplayContext, reviewSources } from "../src/data/fhirContext";

const bundle: Bundle = {
  resourceType: "Bundle",
  type: "collection",
  entry: [
    {
      resource: {
        resourceType: "Patient",
        id: "server-id",
        meta: { versionId: "opaque-version" },
        name: [{ given: ["Live"], family: "Patient" }],
        birthDate: "1980-01-01",
      },
    },
    {
      resource: {
        resourceType: "Encounter",
        id: "visit",
        status: "in-progress",
        class: { code: "AMB" },
        serviceType: { coding: [{ code: "primary-care" }] },
        meta: { versionId: "version-a" },
      },
    },
    {
      resource: {
        resourceType: "Observation",
        id: "lab",
        meta: { versionId: "version-b" },
        status: "final",
        code: { text: "Panel" },
        category: [{ coding: [{ code: "laboratory" }] }],
        component: [
          {
            code: { text: "Potassium" },
            valueQuantity: { value: 4, unit: "mmol/L" },
          },
          {
            code: { text: "Creatinine" },
            valueQuantity: { value: 1, unit: "mg/dL" },
          },
        ],
      },
    },
    {
      resource: {
        resourceType: "Observation",
        id: "lab-2",
        meta: { versionId: "version-c" },
        status: "final",
        code: { text: "Hemoglobin" },
        category: [{ coding: [{ code: "laboratory" }] }],
        valueQuantity: { value: 14, unit: "g/dL" },
      },
    },
  ],
};
describe("version-bound FHIR display context", () => {
  it("uses only the newest recorded risk assessment for the selected encounter", () => {
    const assessment = (
      id: string,
      encounter: string,
      date: string,
      code: string,
    ): BundleEntry => ({
      resource: {
        resourceType: "Observation",
        id,
        status: "final",
        meta: { versionId: id },
        encounter: { reference: `Encounter/${encounter}` },
        effectiveDateTime: date,
        code: {
          coding: [
            {
              system:
                "https://vgi-health.example/fhir/CodeSystem/clinical-risk",
              code: "section741IncreasedOverdoseRisk",
            },
          ],
        },
        valueCodeableConcept: { coding: [{ code }] },
      },
    });
    const chart: Bundle = {
      ...bundle,
      entry: [
        ...(bundle.entry ?? []),
        assessment("old-visit", "previous", "2026-10-31T10:00:00Z", "no"),
        assessment("older", "visit", "2026-10-31T08:00:00Z", "no"),
        assessment("newer", "visit", "2026-10-31T09:00:00Z", "yes"),
      ],
    };
    expect(
      fhirDisplayContext(chart, "server-id", "server-id", "visit").clinical
        .risks,
    ).toEqual([
      [
        "section741IncreasedOverdoseRisk",
        expect.objectContaining({
          code: "yes",
          artifact: "Observation/newer/_history/newer",
        }),
      ],
    ]);
  });
  it("preserves Lean's stable patient identity and never invents missing clinical negatives", () => {
    const context = fhirDisplayContext(
      bundle,
      "server-id",
      "synthea|stable-id",
      "visit",
    );
    expect(context.clinical.risks).toEqual([]);
    expect(context.clinical.service?.code).toBe("primary-care");
    expect(
      context.infoPayloads.every((p) => p.patient === "synthea|stable-id"),
    ).toBe(true);
    expect(
      context.infoPayloads.find((p) => p.info === "patientPhoto")?.availability,
    ).toEqual([["photoUrl", false]]);
    expect(
      context.infoPayloads.find((p) => p.info === "orderingWeight"),
    ).toBeUndefined();
    expect(
      context.artifactBindings.some((b) =>
        b.artifact.endsWith("/_history/opaque-version"),
      ),
    ).toBe(true);
  });
  it("includes every result component with a source identity that changes on version changes", () => {
    const context = fhirDisplayContext(bundle, "server-id");
    const payload = context.infoPayloads.find(
      (p) => p.info === "groupedResultComponents",
    );
    expect(payload?.rows).toHaveLength(3);
    expect(
      payload?.rows.map((r) => r.fields.find(([k]) => k === "component")?.[1]),
    ).toEqual(["Potassium", "Creatinine", "Hemoglobin"]);
    expect(
      payload?.rows.map((r) => r.fields.find(([k]) => k === "testId")?.[1]),
    ).toEqual(["Panel", "Panel", "Hemoglobin"]);
    const next = structuredClone(bundle);
    const lab = next.entry?.[2]?.resource;
    if (lab) lab.meta = { versionId: "new-version" };
    expect(
      fhirDisplayContext(next, "server-id").infoPayloads.find(
        (p) => p.info === "groupedResultComponents",
      )?.artifact,
    ).not.toBe(payload?.artifact);
  });
  it("cannot issue a CURES review receipt without a CURES source record", () => {
    expect(
      reviewSources(bundle, "allergyList").map((r) => r.resourceType),
    ).toEqual(["Patient"]);
    expect(reviewSources(bundle, "resultTrend")).toHaveLength(2);
    expect(() => reviewSources(bundle, "curesReport")).toThrow(
      "No versioned source",
    );
  });
  it("binds fill-history reviews to dispensing records and explicit empty-chart review", () => {
    const chart: Bundle = {
      ...bundle,
      entry: [
        ...(bundle.entry ?? []),
        {
          resource: {
            resourceType: "MedicationStatement",
            id: "reported-use",
            status: "active",
            medicationCodeableConcept: { text: "Lisinopril" },
            subject: { reference: "Patient/server-id" },
          },
        },
        {
          resource: {
            resourceType: "MedicationDispense",
            id: "dispensed",
            status: "completed",
            medicationCodeableConcept: { text: "Lisinopril" },
            subject: { reference: "Patient/server-id" },
          },
        },
      ],
    };
    expect(
      reviewSources(chart, "adherence").map((r) => r.resourceType),
    ).toEqual(["MedicationDispense"]);
    expect(
      reviewSources(bundle, "adherence").map((r) => r.resourceType),
    ).toEqual(["Patient"]);
  });
  it("uses the chart's medical-record identifier rather than a resource or cohort ID", () => {
    const chart = structuredClone(bundle);
    const patient = chart.entry?.[0]?.resource;
    if (patient?.resourceType !== "Patient")
      throw new Error("Missing test patient");
    patient.identifier = [
      { value: "internal-cohort-uuid" },
      { type: { coding: [{ code: "MR" }] }, value: "12345678" },
    ];
    expect(
      fhirDisplayContext(chart, "server-id").infoPayloads.find(
        (p) => p.info === "careIdentity",
      )?.fields,
    ).toContainEqual(["mrn", "12345678"]);
  });
});
