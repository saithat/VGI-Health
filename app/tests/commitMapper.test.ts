import { describe, expect, it } from "vitest";
import spec from "../../releases/v2/spec.json";
import { mapCommit, systems, type CommitInput } from "../src/data/commitMapper";
import type { Captured, Value } from "../../lean/generated/ehr-types";

export const captured = (
  element: string,
  value: string | number | Value,
  slot = 0,
): Captured => ({
  element,
  slot,
  confirmed: true,
  byHuman: true,
  value:
    typeof value === "string"
      ? { text: { s: value } }
      : typeof value === "number"
        ? { qty: { tenths: value * 10, unit: "mg" } }
        : value,
});
export const base: CommitInput = {
  commitId: "signOrders",
  captured: [],
  elements: spec.elements,
  patient: { resourceType: "Patient", id: "patient" },
  encounter: {
    resourceType: "Encounter",
    id: "encounter",
    status: "in-progress",
    class: { code: "AMB" },
    subject: { reference: "Patient/patient" },
    meta: { versionId: "7" },
  },
  user: { resourceType: "Practitioner", id: "doctor" },
  now: "2026-10-31T09:00:00Z",
  transactionId: "01234567-0123-4567-8901-012345678901",
};
const entries = (input: Partial<CommitInput>) =>
  mapCommit({ ...base, ...input }).entry ?? [];
const resources = (input: Partial<CommitInput>) =>
  entries(input).flatMap((e) => (e.resource ? [e.resource] : []));
const order = [
  captured("drug", "lisinopril"),
  captured("dose", 10),
  captured("doseUnit", "mg"),
  captured("route", "oral"),
  captured("freq", "daily"),
  captured("quantity", 30),
  captured("duration", 30),
  captured("refills", 3),
  captured("indication", "Hypertension"),
];

describe("pure Lean commit → FHIR transaction", () => {
  it("preserves order slots, dosing, supply, refills, indication, and discharge category", () => {
    const input = { ...base, captured: order };
    const copy = structuredClone(input);
    const first = mapCommit(input);
    expect(mapCommit(input)).toEqual(first);
    expect(input).toEqual(copy);
    const medication = first.entry?.[0]?.resource;
    expect(medication).toMatchObject({
      resourceType: "MedicationRequest",
      intent: "order",
      subject: { reference: "Patient/patient" },
      encounter: { reference: "Encounter/encounter" },
      requester: { reference: "Practitioner/doctor" },
      dispenseRequest: {
        numberOfRepeatsAllowed: 3,
        quantity: { value: 30 },
        expectedSupplyDuration: { value: 30 },
      },
      reasonCode: [{ text: "Hypertension" }],
      dosageInstruction: [
        { doseAndRate: [{ doseQuantity: { value: 10, unit: "mg" } }] },
      ],
    });
    const result = resources({
      commitId: "discharge",
      captured: [...order, captured("dischargeDestination", "home")],
      intent: "plan",
    });
    expect(
      result.find((r) => r.resourceType === "MedicationRequest"),
    ).toMatchObject({
      intent: "plan",
      category: [{ coding: [{ code: "discharge" }] }],
    });
    expect(result.find((r) => r.resourceType === "Encounter")).toMatchObject({
      status: "finished",
      hospitalization: { dischargeDisposition: { coding: [{ code: "home" }] } },
    });
  });
  it("maps multiple medication lines and a lab without conflating their fields", () => {
    const result = resources({
      captured: [
        ...order,
        ...order.map((c) => ({ ...c, slot: 1 })),
        captured("dose", 20, 1),
        captured("labTest", "24323-8"),
        captured("labDiagnosis", "I10"),
      ],
    });
    expect(
      result.filter((r) => r.resourceType === "MedicationRequest"),
    ).toHaveLength(2);
    expect(
      result.find((r) => r.resourceType === "ServiceRequest"),
    ).toMatchObject({
      code: { coding: [{ system: systems.loinc, code: "24323-8" }] },
      encounter: { reference: "Encounter/encounter" },
    });
  });
  it("files UTF-8 note sections, vitals, ICD-10 diagnosis linked to Encounter, and CPT", () => {
    const result = entries({
      commitId: "signNote",
      captured: [
        captured("hpi", "Café — follow-up"),
        captured("exam", "Normal"),
        captured("visitDiagnosis", "I10"),
        captured("levelOfService", "99213"),
        captured("weight", 72),
        captured("bpSystolic", 120),
        captured("bpDiastolic", 80),
      ],
    });
    const note = result.find(
      (e) => e.resource?.resourceType === "DocumentReference",
    )?.resource;
    if (note?.resourceType !== "DocumentReference")
      throw new Error("Missing note");
    expect(
      new TextDecoder().decode(
        Uint8Array.from(atob(note.content[0]?.attachment.data ?? ""), (c) =>
          c.charCodeAt(0),
        ),
      ),
    ).toContain("Café — follow-up");
    expect(note.context?.encounter).toEqual([
      { reference: "Encounter/encounter" },
    ]);
    const condition = result.find(
      (e) => e.resource?.resourceType === "Condition",
    );
    expect(condition?.resource).toMatchObject({
      code: { coding: [{ system: systems.icd10, code: "I10" }] },
    });
    expect(
      result.find((e) => e.resource?.resourceType === "Encounter"),
    ).toMatchObject({
      request: { method: "PUT", ifMatch: 'W/"7"' },
      resource: {
        diagnosis: [{ condition: { reference: condition?.fullUrl } }],
      },
    });
    expect(
      result.find((e) => e.resource?.resourceType === "ChargeItem")?.resource,
    ).toMatchObject({
      context: { reference: "Encounter/encounter" },
      code: { coding: [{ system: systems.cpt, code: "99213" }] },
    });
    expect(
      result.filter((e) => e.resource?.resourceType === "Observation"),
    ).toHaveLength(2);
  });
  it("admits into a bed and links the new inpatient encounter to the ED", () => {
    const result = resources({
      commitId: "disposition",
      captured: [captured("dispositionChoice", "admit")],
      bed: { resourceType: "Location", id: "bed", name: "Bed 1" },
    });
    expect(result[0]).toMatchObject({
      resourceType: "Encounter",
      class: { code: "IMP" },
      partOf: { reference: "Encounter/encounter" },
      location: [{ location: { reference: "Location/bed" } }],
    });
    expect(() =>
      resources({
        commitId: "disposition",
        captured: [captured("dispositionChoice", "admit")],
      }),
    ).toThrow("bed");
  });
  it("records completed or not-done MAR administration with a distinct second performer", () => {
    const medication = {
      resourceType: "MedicationRequest",
      id: "medication",
      status: "active",
      intent: "order",
      subject: { reference: "Patient/patient" },
      medicationCodeableConcept: { text: "Insulin" },
    } as const;
    const result = resources({
      commitId: "administerMed",
      medication,
      cosigner: { resourceType: "Practitioner", id: "rn2" },
      captured: [
        captured("adminStatus", "given"),
        captured("administeredDose", "5 units"),
        captured("highAlertCosign", "rn2"),
      ],
    });
    expect(result[0]).toMatchObject({
      resourceType: "MedicationAdministration",
      status: "completed",
      dosage: { dose: { value: 5, unit: "units" } },
      performer: [
        { actor: { reference: "Practitioner/doctor" } },
        { actor: { reference: "Practitioner/rn2" } },
      ],
    });
    expect(
      resources({
        commitId: "administerMed",
        medication,
        captured: [
          captured("adminStatus", "refused"),
          captured("adminReason", "Patient declined"),
        ],
      })[0],
    ).toMatchObject({
      status: "not-done",
      statusReason: [{ text: "Patient declined" }],
    });
    expect(() =>
      resources({
        commitId: "administerMed",
        medication,
        captured: [captured("adminStatus", "held")],
      }),
    ).toThrow("reason");
  });
  it("records CVX vaccine, lot, manufacturer, site, performer and VIS dates", () => {
    const result = resources({
      commitId: "recordImmunization",
      captured: Object.entries({
        vaccine: "140",
        vaccineLot: "LOT-42",
        vaccineManufacturer: "Acme",
        vaccineSite: "left arm",
        visGiven: "2026-10-31",
        visEditionDate: "2025-01-31",
      }).map(([id, value]) => captured(id, value)),
    });
    expect(result[0]).toMatchObject({
      resourceType: "Immunization",
      vaccineCode: { coding: [{ system: systems.cvx, code: "140" }] },
      lotNumber: "LOT-42",
      manufacturer: { display: "Acme" },
      education: [
        { presentationDate: "2026-10-31", publicationDate: "2025-01-31" },
      ],
    });
    const fields = [
      captured("vaccine", "140"),
      captured("vaccineLot", "LOT-42"),
      captured("vaccineManufacturer", "Acme"),
      captured("vaccineSite", "left arm"),
      captured("visEditionDate", "2025-01-31"),
      captured("vaccineAdministrationDate", "2026-10-30"),
    ];
    expect(
      resources({
        commitId: "recordImmunization",
        captured: [...fields, captured("visGiven", { flag: { b: true } })],
      })[0],
    ).toMatchObject({
      occurrenceDateTime: "2026-10-30",
      education: [{ presentationDate: "2026-10-30" }],
    });
    expect(() =>
      resources({
        commitId: "recordImmunization",
        captured: [...fields, captured("visGiven", { flag: { b: false } })],
      }),
    ).toThrow("VIS presentation date");
  });
  it("completes results tasks, communicates with the patient and links renewal prescriptions", () => {
    const task = {
      resourceType: "Task",
      id: "task",
      status: "requested",
      intent: "order",
      for: { reference: "Patient/patient" },
    } as const;
    expect(
      resources({
        commitId: "ackResult",
        task,
        captured: [
          captured("resultAction", "reviewed"),
          captured("patientMessage", "Your result is improving"),
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ resourceType: "Task", status: "completed" }),
        expect.objectContaining({
          resourceType: "Communication",
          recipient: [{ reference: "Patient/patient" }],
        }),
      ]),
    );
    const renewal = {
      resourceType: "MedicationRequest",
      id: "old",
      status: "active",
      intent: "order",
      subject: { reference: "Patient/patient" },
      medicationCodeableConcept: { text: "Lisinopril" },
    } as const;
    expect(
      resources({
        commitId: "approveRefill",
        task,
        renewal,
        captured: [
          captured("refillQuantity", 90),
          captured("refillRefills", 2),
        ],
      })[0],
    ).toMatchObject({
      priorPrescription: { reference: "MedicationRequest/old" },
      dispenseRequest: { quantity: { value: 90 }, numberOfRepeatsAllowed: 2 },
    });
  });
  it("files an operative note and procedure, and records consent", () => {
    expect(
      resources({
        commitId: "signOpNote",
        captured: [
          captured("opProcedure", "Appendectomy"),
          captured("opFindings", "Inflamed appendix"),
        ],
      }).map((r) => r.resourceType),
    ).toEqual(["DocumentReference", "Procedure"]);
    expect(
      resources({
        commitId: "documentTreatmentConsent",
        captured: [
          captured("treatmentDecision", "deny"),
          captured("consentVerified", { flag: { b: true } }),
        ],
      })[0],
    ).toMatchObject({
      resourceType: "Consent",
      provision: { type: "deny" },
      verification: [{ verified: true }],
    });
  });
  it("targets the exact reviewed version; rejects unknown elements and unsupported commits", () => {
    expect(
      resources({
        commitId: "markReviewed",
        reviewed: [
          { resourceType: "Patient", id: "patient", meta: { versionId: "12" } },
        ],
        receipt: {
          info: "patientBanner",
          dataVersion: 12,
          time: 540,
          role: "physician",
          user: "doctor",
        },
      })[0],
    ).toMatchObject({
      resourceType: "Provenance",
      target: [{ reference: "Patient/patient/_history/12" }],
      agent: [{ who: { reference: "Practitioner/doctor" } }],
      recorded: base.now,
    });
    expect(() => resources({ commitId: "surprise" })).toThrow("mapping");
    expect(() =>
      resources({ captured: [captured("surprise", "value")] }),
    ).toThrow("fhirTarget");
    expect(() =>
      resources({
        commitId: "signNote",
        captured: [
          captured("hpi", "note"),
          captured("levelOfService", "99999"),
        ],
      }),
    ).toThrow("CPT");
  });
});
