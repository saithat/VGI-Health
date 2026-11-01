import Ehr.Core.Types

/-! Department quick picks are display data, not defaults or validation rules.
Diagnosis labels are concise descriptions checked against CMS FY 2027 ICD-10-CM.
Procedure codes and original labels match infra/scripts/seed-world.mjs.
Manual code entry remains available beyond these lists.
-/
namespace Ehr.Render

/-- Common surgical and clinic diagnoses. Nothing selects one for a patient. -/
def surgicalDiagnosisChoices : List (String × String) :=
  [("K35.80", "Acute appendicitis, unspecified"),
   ("K80.00", "Gallbladder stones with acute cholecystitis, no obstruction"),
   ("K80.20", "Gallbladder stones, no cholecystitis or obstruction"),
   ("K81.0", "Acute cholecystitis"),
   ("K40.90", "Unilateral inguinal hernia, no obstruction or gangrene; not specified as recurrent"),
   ("K42.9", "Umbilical hernia, no obstruction or gangrene"),
   ("R10.11", "Pain, right upper abdomen"),
   ("R10.13", "Epigastric pain"),
   ("R10.31", "Pain, right lower abdomen"),
   ("R10.9", "Abdominal pain, unspecified"),
   ("Z48.815", "Surgical aftercare, digestive system"),
   ("Z48.89", "Surgical aftercare, other specified"),
   ("Z09", "Follow-up after completed treatment, nonmalignant condition"),
   ("I10", "Primary hypertension"),
   ("E11.9", "Type 2 diabetes, without complications")]

/-- Original procedure names for the three procedure codes in the case feed. -/
def surgicalProcedureChoices : List (String × String) :=
  [("44970", "Laparoscopic appendectomy"),
   ("47562", "Laparoscopic cholecystectomy"),
   ("49650", "Laparoscopic inguinal hernia repair")]

/-- Department favorites retain their existing local code values. They do not
restrict a clinician's manual entry or mark any field reviewed. -/
def surgicalChoices : ValueKind → List (String × String)
  | .coded "icd10" => surgicalDiagnosisChoices
  | .coded "cpt" => surgicalProcedureChoices
  | .coded "anesthesia-type" =>
      [("general", "General anesthesia"), ("regional", "Regional anesthesia"),
       ("spinal", "Spinal anesthesia"), ("epidural", "Epidural anesthesia"),
       ("local", "Local anesthesia"), ("mac", "Monitored anesthesia care"),
       ("other", "Other anesthesia")]
  | .coded "diet" =>
      [("npo", "Nothing by mouth (NPO)"), ("clear-liquids", "Clear liquids"),
       ("full-liquids", "Full liquids"), ("soft", "Soft diet"), ("regular", "Regular diet")]
  | .coded "activity" =>
      [("ambulate-tid", "Ambulate three times daily"),
       ("as-tolerated", "Activity as tolerated"), ("bed-rest", "Bed rest"),
       ("up-with-assistance", "Up with assistance")]
  | .coded "continue-stop-modify" =>
      [("continue", "Continue"), ("stop", "Stop"), ("modify", "Modify")]
  | .coded "boolean" => [("true", "Yes"), ("false", "No")]
  | .coded "yes-no" => [("yes", "Yes"), ("no", "No")]
  | .coded "pain-0-10" => (List.range 11).map fun n => (toString n, toString n)
  | _ => []

end Ehr.Render
