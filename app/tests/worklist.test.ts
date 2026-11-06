import { describe, expect, it } from "vitest";
import type { MedicationRequest } from "../src/data/fhir-r4";
import { medicationDue, orderTiming } from "../src/data/worklist";

const request: MedicationRequest = {
  resourceType: "MedicationRequest",
  id: "med",
  status: "active",
  intent: "order",
  subject: { reference: "Patient/patient" },
  authoredOn: "2026-10-31T08:00:00Z",
  dosageInstruction: [{ timing: orderTiming("q6h", "2026-10-31T08:00:00Z") }],
};
describe("home medication schedule", () => {
  it("distinguishes due, overdue, scheduled and a completed administration", () => {
    expect(medicationDue(request, [], "2026-10-31T08:00:00Z").status).toBe(
      "Due",
    );
    expect(medicationDue(request, [], "2026-10-31T10:00:00Z").status).toBe(
      "Overdue",
    );
    expect(
      medicationDue(
        request,
        [
          {
            resourceType: "MedicationAdministration",
            status: "completed",
            subject: request.subject,
            request: { reference: "MedicationRequest/med" },
            effectiveDateTime: "2026-10-31T08:00:00Z",
          },
        ],
        "2026-10-31T10:00:00Z",
      ),
    ).toEqual({ status: "Scheduled", due: "2026-10-31T14:00:00.000Z" });
  });
  it("does not guess due times for narratives or PRN medication", () => {
    expect(
      medicationDue(
        { ...request, dosageInstruction: [{ text: "Take as directed" }] },
        [],
        "2026-10-31T10:00:00Z",
      ).status,
    ).toBe("Schedule needs review");
    expect(
      medicationDue(
        { ...request, dosageInstruction: [{ asNeededBoolean: true }] },
        [],
        "2026-10-31T10:00:00Z",
      ).status,
    ).toBe("PRN");
  });
});
