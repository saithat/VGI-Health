import { describe, expect, it } from "vitest";
import { allergyDisplay, cleanClinicalText, fieldCaption, fieldPlaceholder, formatClinicalRecord, formatMedicationLine, formatSig, sectionCaption } from "../src/ehr/ui/clinical-display";

describe("deterministic clinical display", () => {
  it.each([
    ["Gingivitis (disorder)", "Gingivitis"],
    ["Social isolation (finding) (active)", "Social isolation (active)"],
    ["Medication review due (situation)", "Medication review due"],
    ["Appendectomy (procedure)", "Appendectomy"],
    ["Every six hours (qualifier value)", "Every six hours"],
    ["Diabetes (type 1)", "Diabetes (type 1)"],
    ["Pain (left arm)", "Pain (left arm)"],
    ["Amoxicillin 250 MG Oral Capsule", "Amoxicillin 250 mg oral capsule"],
    ["Naloxone 4 MG/0.1 ML nasal spray", "Naloxone 4 mg/0.1 mL nasal spray"],
    ["Albuterol 180 MCG", "Albuterol 180 mcg"],
    ["MG antibodies", "MG antibodies"],
  ])("cleans only recognized terminology noise: %s", (raw, displayed) => {
    expect(cleanClinicalText(raw)).toBe(displayed);
  });
  it("formats an explicitly supplied tablet amount, oral route and daily timing", () => {
    expect(formatMedicationLine("lisinopril 10 MG Oral Tablet", "1, 1x per 1 d"))
      .toBe("lisinopril 10 mg tablet: 1 tab PO daily");
    expect(formatClinicalRecord("lisinopril 10 MG Oral Tablet — 1, 1x per 1 d"))
      .toBe("lisinopril 10 mg tablet: 1 tab PO daily");
    expect(formatMedicationLine("Amoxicillin 250 MG Oral Capsule", "2, 3x per 1 d"))
      .toBe("Amoxicillin 250 mg capsule: 2 cap PO TID");
    expect(formatMedicationLine("lisinopril 10 MG Oral Tablet", "10 mg, 1x per 1 d"))
      .toBe("lisinopril 10 mg tablet: 10 mg PO daily");
  });
  it("preserves explicit routes, unknown units, timing periods and unfamiliar directions", () => {
    expect(formatMedicationLine("lisinopril 10 MG Oral Tablet", "1 tab IV daily"))
      .toBe("lisinopril 10 mg oral tablet: 1 tab IV daily");
    expect(formatMedicationLine("Unknown product", "1, 1x per 1 d"))
      .toBe("Unknown product: 1 daily");
    expect(formatSig("2 mg, 1x per 2 d")).toBe("2 mg 1 time every 2 d");
    expect(formatSig("1, 2x per 6 h")).toBe("1 2 times every 6 h");
    expect(formatSig("Use according to the taper schedule")).toBe("Use according to the taper schedule");
    expect(formatMedicationLine("Insulin 100 units/mL", "5 units SC before meals"))
      .toBe("Insulin 100 units/mL: 5 units SC before meals");
    expect(formatMedicationLine("lisinopril 10 MG Oral Tablet", "Give 1 tablet via PEG tube daily"))
      .toBe("lisinopril 10 mg oral tablet: Give 1 tablet via PEG tube daily");
    expect(formatMedicationLine("lisinopril 10 MG Oral Tablet", "Use according to the taper schedule"))
      .toBe("lisinopril 10 mg oral tablet: Use according to the taper schedule");
  });
  it("does not equate absent allergy records with explicit negative allergy findings", () => {
    expect(allergyDisplay("No allergy records on file")).toBe("Allergies not on file");
    expect(allergyDisplay("")).toBe("Allergies not on file");
    expect(allergyDisplay("No known allergy (situation)")).toBe("No Known Allergies");
    expect(allergyDisplay("No known allergy (situation) (active)")).toBe("No Known Allergies (active)");
    expect(allergyDisplay("NKDA")).toBe("No Known Drug Allergies");
    expect(allergyDisplay("Penicillin — anaphylaxis")).toBe("Penicillin — anaphylaxis");
  });
  it("uses clinical captions and context placeholders while preserving acronyms and units", () => {
    expect(fieldCaption("Enter Medication")).toBe("Medication");
    expect(fieldCaption("BP Systolic")).toBe("BP systolic");
    expect(fieldCaption("As Needed (PRN)")).toBe("As needed (PRN)");
    expect(sectionCaption("H&P update (day of surgery)")).toBe("H&P Update (Day of Surgery)");
    expect(sectionCaption("Dosing weight (kg)")).toBe("Dosing Weight (kg)");
    expect(fieldPlaceholder("Enter Medication", "code")).toBe("Search medications");
    expect(fieldPlaceholder("Route", "code")).toBe("Select route");
    expect(fieldPlaceholder("Frequency", "code")).toBe("Select frequency");
  });
});
