import Ehr.Render.Fhir
import Ehr.Core.Basics
import Ehr.Render.Ui

/-! Acute readers must preserve exact patient/order selection and source status.
The examples use FHIR resources, not preconstructed Facts or captured State. -/
namespace Ehr.Render.Fhir.AcuteTests
open Lean

/-- A reference used by the named examples. -/
def reference (id : String) : Json := Json.mkObj [("reference", .str id)]

/-- A CodeableConcept used by the named examples. -/
def concept (code : String) : Json := Json.mkObj
  [("coding", .arr #[Json.mkObj [("code", .str code)]])]

/-- The selected patient and a second patient with the same clinical test. -/
def patient : Json := Json.mkObj [("resourceType", .str "Patient"), ("id", .str "selected")]

/-- An ongoing selected ED encounter. -/
def encounter : Json := Json.mkObj [("resourceType", .str "Encounter"), ("id", .str "ed-1"),
  ("subject", reference "Patient/selected"), ("status", .str "in-progress"),
  ("class", Json.mkObj [("code", .str "EMER")])]

/-- Two same-drug orders may have different doses or encounter bindings. -/
def medication (id encounterId : String) (dose : Nat) : Json :=
  let quantity := Json.mkObj [("value", toJson dose), ("unit", .str "units")]
  let rate := Json.mkObj [("doseQuantity", quantity)]
  let instruction := Json.mkObj [("asNeededBoolean", .bool true), ("doseAndRate", .arr #[rate])]
  Json.mkObj [("resourceType", .str "MedicationRequest"), ("id", .str id),
   ("subject", reference "Patient/selected"), ("encounter", reference encounterId),
   ("status", .str "active"), ("medicationCodeableConcept", concept "insulin lispro"),
   ("dosageInstruction", .arr #[instruction])]

/-- The adapter's exact encounter and medication task selectors. -/
def context : FactsContext := { today := "2026-11-02", record :=
  [("selectedEncounterId", "ed-1"), ("selectedMedicationRequestId", "rx-2")] }

/-- The chosen order is the second of two same-drug orders. -/
def resources : List Json := [patient, encounter,
  medication "rx-1" "Encounter/ed-1" 80, medication "rx-2" "Encounter/ed-1" 4]

#guard (acuteDoseRows context resources patient).head!.lookup "Ordered dose" == some "4"
#guard (acuteDoseRows context resources patient).length == 1
#guard (acuteDoseRows { context with record := [("selectedEncounterId", "ed-1")], medToGive? := some "insulin lispro" }
  resources patient).isEmpty
#guard (acuteDoseRows context [patient, encounter, medication "rx-2" "Encounter/another" 4] patient).isEmpty
#guard ((factsOf context resources patient).infoPayloads?.getD []).all
  (fun payload => (infoPayload (factsOf context resources patient) payload.info).isSome)

/-- A documented administration carries its own dose and time. -/
def administration : Json := Json.mkObj [("resourceType", .str "MedicationAdministration"),
  ("id", .str "admin-1"), ("subject", reference "Patient/selected"),
  ("request", reference "MedicationRequest/rx-2"), ("status", .str "completed"),
  ("effectiveDateTime", .str "2026-11-02T08:07:00-08:00"),
  ("dosage", Json.mkObj [("dose", Json.mkObj [("value", toJson (3 : Nat)), ("unit", .str "units")])])]

#guard (acuteDoseRows context (resources ++ [administration]) patient).length == 2
#guard (acuteDoseRows context (resources ++ [administration]) patient).getLast!.lookup "Actual dose" == some "3"
#guard (acuteDoseRows context (resources ++ [administration]) patient).getLast!.lookup "Status" == some "Given"
#guard !(acuteDoseRows context resources patient).any (fun row => row.lookup "Status" == some "Given")

/-- No flag is inferred from a numeric result or another patient's observation. -/
def glucose (subject : String) : Json := Json.mkObj [("resourceType", .str "Observation"),
  ("id", .str "glucose-1"), ("subject", reference subject), ("status", .str "final"),
  ("encounter", reference "Encounter/ed-1"),
  ("code", concept "2339-0"),
  ("category", .arr #[concept "laboratory"]),
  ("valueQuantity", Json.mkObj [("value", toJson (300 : Nat)), ("unit", .str "mg/dL")])]

#guard (acuteLabRow (glucose "Patient/selected")).lookup "Flag" == some ""
#guard ((acuteSupportingRows context (resources ++ [glucose "Patient/other"]) patient).lookup "glucoseTrend").getD [] == []
#guard (((acuteSupportingRows context (resources ++ [glucose "Patient/selected"]) patient).lookup "glucoseTrend").getD []).length == 1

/-- A latest-vitals panel retains conflicting records at the same latest time. -/
def latestVitalsDisplay : Display := { Display.empty with vitals :=
  [{ id := "old", code := "8867-4", name := "Heart rate", value := "70", unit := "/min", date := "2026-11-02T06:00" },
   { id := "new", code := "8867-4", name := "Heart rate", value := "82", unit := "/min", date := "2026-11-02T07:30" },
   { id := "conflict", code := "8867-4", name := "Heart rate", value := "88", unit := "/min", date := "2026-11-02T07:30" },
   { id := "spo2", code := "2708-6", name := "SpO2", value := "96", unit := "%", date := "2026-11-02T07:00" }] }

/-- A real renderer context with dated vital-sign records. -/
def latestVitalsContext : Ctx :=
  { sp := default, prog := default, facts := default, disp := latestVitalsDisplay, user := default, s := default }

#guard (uiRows latestVitalsContext "vitals").length == 3
#guard (uiRows latestVitalsContext "vitals").all (fun row => row.lookup "Value" != some "70")
#guard (uiRows latestVitalsContext "vitals").any (fun row => row.lookup "Value" == some "82")
#guard (uiRows latestVitalsContext "vitals").any (fun row => row.lookup "Value" == some "88")

/-- Same-time MAR cells preserve both source dose records. -/
def repeatedMarTimeExample : List (String × String) :=
  acuteMergeColumns [("08:00", "Given 3 units"), ("08:00", "Given 4 units")]
#guard repeatedMarTimeExample == [("08:00", "Given 3 units; Given 4 units")]
#guard (acuteMarRows context resources patient).length == 2
#guard (acuteMarRows context resources patient).all fun row =>
  !row.any (fun (_, value) => value.startsWith "Given")
#guard (acuteWorklistRows [Json.mkObj [("resourceType", .str "Task"),
  ("for", reference "Patient/other")]] patient).isEmpty
#guard (acuteBoardRows context resources patient).length == 1

end Ehr.Render.Fhir.AcuteTests
