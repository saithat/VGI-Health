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

/-- An encounter-bound source vital differs from the historical display fallback. -/
def currentVital (encounterId time : String) (value : Nat) : Json := Json.mkObj
  [("resourceType", .str "Observation"), ("subject", reference "Patient/selected"),
   ("encounter", reference encounterId), ("status", .str "final"),
   ("code", concept "8867-4"), ("category", .arr #[concept "vital-signs"]),
   ("effectiveDateTime", .str time),
   ("valueQuantity", Json.mkObj [("value", toJson value), ("unit", .str "/min")])]

/-- Old-encounter values and older readings cannot replace current tied records. -/
def currentVitalSources : List Json := resources ++
  [currentVital "Encounter/old" "2026-11-02T09:00:00-08:00" 40,
   currentVital "Encounter/ed-1" "2026-11-02T07:00:00-08:00" 70,
   currentVital "Encounter/ed-1" "2026-11-02T08:00:00-08:00" 82,
   currentVital "Encounter/ed-1" "2026-11-02T08:00:00-08:00" 88]

/-- The real bound payload overrides an unrelated historical display fallback. -/
def currentVitalContext : Ctx := { latestVitalsContext with
  facts := factsOf context currentVitalSources patient }

#guard (uiRows currentVitalContext "vitals").length == 2
#guard (uiRows currentVitalContext "vitals").any (fun row => row.lookup "Value" == some "82")
#guard (uiRows currentVitalContext "vitals").any (fun row => row.lookup "Value" == some "88")
#guard (uiRows { latestVitalsContext with facts := factsOf context resources patient } "vitals").isEmpty
#guard (uiRows { latestVitalsContext with facts := factsOf context resources patient } "labResults").isEmpty

#guard acuteTimeColumn "2026-11-02T08:07:00-08:00" == "2026-11-02 08:07 -08:00"
#guard acuteTimeColumn "2026-11-02T16:07:00Z" == "2026-11-02 16:07 UTC"

/-- Hour layout preserves minutes in actual records and fills only an empty axis. -/
def hourlyAxisExample : List String := acuteMarAxis
  [("2026-11-02 08:00 -08:00", "Scheduled · 08:00"),
   ("2026-11-02 12:00 -08:00", "Scheduled · 12:00")]
#guard hourlyAxisExample.length == 5
#guard hourlyAxisExample.contains "2026-11-02 10:00 -08:00"
#guard acuteHourColumn "2026-11-02T08:07:00-08:00" == "2026-11-02 08:00 -08:00"
#guard (acuteMarAxis [("2026-11-02 30:00", "Source with invalid hour")]).contains "2026-11-02 30:00"

/-- A dose without a request can be displayed only by its explicit encounter;
its drug name cannot select either of the two same-drug orders. -/
def unmatchedAdministration (time : String) (status : String := "completed") : Json := Json.mkObj
  [("resourceType", .str "MedicationAdministration"), ("subject", reference "Patient/selected"),
   ("context", reference "Encounter/ed-1"), ("status", .str status),
   ("medicationCodeableConcept", concept "insulin lispro"), ("effectiveDateTime", .str time),
   ("dosage", Json.mkObj [("dose", Json.mkObj [("value", toJson (2 : Nat)), ("unit", .str "units")])])]

/-- The unmatched record stays a separate row, with its real minute retained. -/
def unmatchedMarExample := acuteMarRows context
  (resources ++ [unmatchedAdministration "2026-11-02T09:03:00-08:00"]) patient
#guard unmatchedMarExample.length == 3
#guard (unmatchedMarExample.take 2).all fun row =>
  !row.any (fun (_, value) => value.startsWith "Given")
#guard (unmatchedMarExample.getLast!.lookup "2026-11-02 09:00 -08:00").getD "" == "Given · 09:03 · 2 units"
#guard (acuteMarRows context
  (resources ++ [unmatchedAdministration "2026-11-01T09:03:00-08:00"]) patient).length == 2
#guard (acuteMarRows context
  (resources ++ [unmatchedAdministration "2026-11-01T09:03:00-08:00" "in-progress"]) patient).length == 3

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
