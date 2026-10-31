import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadPopulation } from "../src/patients";
import { generateWorld } from "../src/world";
import { DayScheduleSchema, PERSONAS } from "../src/schema";
import { FIXTURE_INDEX } from "./helpers";

describe("population loader", () => {
  it("reads the hand-written fixture: ages, conditions, meds, allergies, weights", () => {
    const pop = loadPopulation(FIXTURE_INDEX);
    expect(pop.patients.length).toBe(10);
    const byId = new Map(pop.patients.map((p) => [p.id, p]));
    expect(pop.patients.filter((p) => p.ageYears < 18).length).toBe(2);
    expect(byId.get("p04-pcn-allergy")?.allergies[0]?.classes).toContain("penicillin");
    expect(byId.get("p05-warfarin")?.homeMeds.map((m) => m.drug)).toContain("warfarin");
    expect(byId.get("p06-apixaban")?.homeMeds.map((m) => m.drug)).toContain("apixaban");
    expect(byId.get("p02-dm-htn")?.tags).toEqual(expect.arrayContaining(["dm2", "htn"]));
    expect(byId.get("p03-dm-insulin")?.homeMeds.find((m) => m.drug === "metformin")?.dose).toBe(1000);
    expect(byId.get("p10-htn-chronic-pain")?.homeMeds.find((m) => m.drug === "oxycodone")?.dose).toBe(10);
    expect(byId.get("p10-htn-chronic-pain")?.allergies[0]?.classes).toEqual(["food"]);
    expect(byId.get("p09-peds-asthma")?.weightKg).toBeCloseTo(37.6);
  });

  it("reads Synthea-style transaction bundles (urn:uuid refs, numbered names, stopped meds, array index)", () => {
    const dir = mkdtempSync(join(tmpdir(), "world-synthea-"));
    mkdirSync(join(dir, "fhir"));
    const pid = "8f6e2c1a-0000-4000-8000-000000000001";
    const bundle = {
      resourceType: "Bundle",
      type: "transaction",
      entry: [
        { fullUrl: `urn:uuid:${pid}`, resource: { resourceType: "Patient", id: pid, name: [{ given: ["Alfonso758"], family: "Kemmer137" }], gender: "male", birthDate: "1961-02-03" }, request: { method: "POST", url: "Patient" } },
        { fullUrl: "urn:uuid:c1", resource: { resourceType: "Condition", id: "c1", clinicalStatus: { coding: [{ code: "active" }] }, code: { coding: [{ system: "http://snomed.info/sct", code: "44054006", display: "Diabetes mellitus type 2 (disorder)" }] }, subject: { reference: `urn:uuid:${pid}` } } },
        { fullUrl: "urn:uuid:c2", resource: { resourceType: "Condition", id: "c2", clinicalStatus: { coding: [{ code: "resolved" }] }, abatementDateTime: "2010-01-01", code: { coding: [{ system: "http://snomed.info/sct", code: "59621000", display: "Essential hypertension (disorder)" }] }, subject: { reference: `urn:uuid:${pid}` } } },
        { fullUrl: "urn:uuid:m1", resource: { resourceType: "MedicationRequest", id: "m1", status: "stopped", medicationCodeableConcept: { coding: [{ code: "314076", display: "lisinopril 10 MG Oral Tablet" }] }, subject: { reference: `urn:uuid:${pid}` } } },
        { fullUrl: "urn:uuid:m2", resource: { resourceType: "MedicationRequest", id: "m2", status: "active", medicationCodeableConcept: { coding: [{ code: "860975", display: "24 HR Metformin hydrochloride 500 MG Extended Release Oral Tablet" }] }, subject: { reference: `urn:uuid:${pid}` } } },
        { fullUrl: "urn:uuid:m3", resource: { resourceType: "MedicationRequest", id: "m3", status: "active", medicationCodeableConcept: { coding: [{ code: "856987", display: "Acetaminophen 325 MG / Oxycodone Hydrochloride 5 MG Oral Tablet" }] }, subject: { reference: `urn:uuid:${pid}` } } },
        { fullUrl: "urn:uuid:a1", resource: { resourceType: "AllergyIntolerance", id: "a1", clinicalStatus: { coding: [{ code: "active" }] }, category: ["medication"], criticality: "high", code: { coding: [{ code: "7984", display: "Penicillin V" }] }, patient: { reference: `urn:uuid:${pid}` } } },
        { fullUrl: "urn:uuid:o1", resource: { resourceType: "Observation", id: "o1", code: { coding: [{ system: "http://loinc.org", code: "29463-7" }] }, effectiveDateTime: "2024-01-01T10:00:00Z", valueQuantity: { value: 99.1, unit: "kg" }, subject: { reference: `urn:uuid:${pid}` } } },
        { fullUrl: "urn:uuid:o2", resource: { resourceType: "Observation", id: "o2", code: { coding: [{ system: "http://loinc.org", code: "29463-7" }] }, effectiveDateTime: "2026-01-01T10:00:00Z", valueQuantity: { value: 95.4, unit: "kg" }, subject: { reference: `urn:uuid:${pid}` } } },
      ],
    };
    writeFileSync(join(dir, "fhir", "Alfonso758_Kemmer137.json"), JSON.stringify(bundle));
    writeFileSync(join(dir, "index.json"), JSON.stringify([{ id: pid, bundle: "fhir/Alfonso758_Kemmer137.json" }]));
    const pop = loadPopulation(join(dir, "index.json"));
    const p = pop.patients[0];
    expect(p?.name).toBe("Alfonso Kemmer");
    expect(p?.tags).toEqual(["dm2"]);
    expect(p?.homeMeds.map((m) => m.drug).sort()).toEqual(["metformin", "oxycodone"]);
    expect(p?.homeMeds.find((m) => m.drug === "metformin")?.freq).toBe("daily");
    expect(p?.homeMeds.find((m) => m.drug === "oxycodone")?.dose).toBe(5);
    expect(p?.allergies[0]?.classes).toContain("penicillin");
    expect(p?.weightKg).toBeCloseTo(95.4);
    // A one-patient world still produces valid schedules.
    const run = generateWorld(1, 2, pop.patients);
    for (const d of run.days) for (const ps of PERSONAS) expect(DayScheduleSchema.safeParse(d.schedules[ps]).success).toBe(true);
  });
});
