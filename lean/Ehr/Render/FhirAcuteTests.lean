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
#guard (acuteDoseRows context (resources ++ [administration]) patient).getLast!.lookup "Recorded dose" == some "3"
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

/-- Longitudinal Chart Review retains raw historical values, units and flags,
while a current-encounter decision panel remains scoped to that encounter. -/
def historicalGlucose : Json := Json.mkObj
  [("resourceType", .str "Observation"), ("id", .str "prior-glucose"),
   ("subject", reference "Patient/selected"), ("status", .str "final"),
   ("encounter", reference "Encounter/prior-clinic"), ("code", concept "2339-0"),
   ("category", .arr #[concept "laboratory"]),
   ("effectiveDateTime", .str "2026-10-01T08:15:00-07:00"),
   ("valueQuantity", Json.mkObj [("value", toJson (99 : Nat)), ("unit", .str "mg/dL")]),
   ("interpretation", .arr #[concept "N"])]

/-- Both named projections read the same actual source bundle. -/
def longitudinalResultsContext : Ctx :=
  { latestVitalsContext with
    facts := factsOf context (resources ++ [historicalGlucose, glucose "Patient/selected", glucose "Patient/other"]) patient }

#guard (uiRows longitudinalResultsContext "labResults").length == 1
#guard (uiRows longitudinalResultsContext "resultTrend").length == 2
#guard (uiRows longitudinalResultsContext "resultTrend").any (fun row =>
  row.lookup "Value" == some "99" && row.lookup "Flag" == some "N")
#guard (uiRows longitudinalResultsContext "labResults").all (fun row => row.lookup "Value" != some "99")
#guard (uiSearchSource longitudinalResultsContext "chart").any (fun row => row.lookup "Value" == some "99")
#guard (uiRows { longitudinalResultsContext with facts := factsOf context resources patient } "resultTrend").isEmpty

/-- Missing birth dates are not displayed as a known newborn age. -/
def unknownAgeBoardExample := (acuteBoardRows context resources patient).head!.lookup "Age/sex"
#guard unknownAgeBoardExample == some "Age not recorded / U"

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

#guard (acuteMarRows context resources patient).length == 2
#guard (acuteMarRows context resources patient).all fun row =>
  !row.any (fun (_, value) => value.startsWith "Given")
#guard (acuteWorklistRows context [Json.mkObj [("resourceType", .str "Task"),
  ("for", reference "Patient/other")]] patient).isEmpty
#guard (acuteBoardRows context resources patient).length == 1

/-- A current panel whose glucose is a censored component, not a top-level scalar. -/
def componentPanel : Json := Json.mkObj
  [("resourceType", .str "Observation"), ("id", .str "chemistry-panel"),
   ("subject", reference "Patient/selected"), ("encounter", reference "Encounter/ed-1"),
   ("status", .str "corrected"), ("category", .arr #[concept "laboratory"]),
   ("code", concept "Chemistry panel"), ("effectiveDateTime", .str "2026-11-02T08:00:00-08:00"),
   ("component", .arr #[Json.mkObj [("code", concept "2339-0"),
     ("valueQuantity", Json.mkObj [("value", toJson (5 : Nat)), ("comparator", .str "<"), ("unit", .str "mg/dL")]),
     ("interpretation", .arr #[concept "N"]),
     ("referenceRange", .arr #[Json.mkObj [("text", .str "See laboratory report")]])]])]

#guard (acuteLabRowsFor componentPanel).length == 2
#guard (acuteLabsByCodes [componentPanel] ["2339-0"]).length == 1
#guard (acuteLabsByCodes [componentPanel] ["2339-0"]).head!.lookup "Value" == some "<5"
#guard (acuteLabsByCodes [componentPanel] ["2339-0"]).head!.lookup "Flag" == some "N"
#guard (acuteLabsByCodes [componentPanel] ["2339-0"]).head!.lookup "Range" == some "See laboratory report"
#guard (acuteLabsByCodes [componentPanel] ["2339-0"]).head!.lookup "Status" == some "corrected"
#guard (acuteLabsByCodes [componentPanel] ["2339-0"]).head!.lookup "Recorded" == some "2026-11-02T08:00:00-08:00"

/-- Tasks may belong to a different admission for this same patient. -/
def taskFor (subject encounterId : String) : Json := Json.mkObj
  [("resourceType", .str "Task"), ("for", reference subject), ("encounter", reference encounterId),
   ("status", .str "requested"), ("businessStatus", concept "Overdue"),
   ("description", .str "Morning medication pass"),
   ("restriction", Json.mkObj [("period", Json.mkObj [("end", .str "2026-11-02T08:00:00-08:00")])])]

#guard (acuteWorklistRows context (resources ++ [taskFor "Patient/selected" "Encounter/ed-1",
  taskFor "Patient/selected" "Encounter/previous", taskFor "Patient/other" "Encounter/ed-1"]) patient).length == 1
#guard (acuteWorklistRows context (resources ++ [taskFor "Patient/selected" "Encounter/ed-1"]) patient).head!.lookup "Status" == some "requested"
#guard (acuteWorklistRows context (resources ++ [taskFor "Patient/selected" "Encounter/ed-1"]) patient).head!.lookup "Task status" == some "Overdue"
#guard (acuteWorklistRows { context with record := [("selectedEncounterId", "missing")] }
  (resources ++ [taskFor "Patient/selected" "Encounter/ed-1"]) patient).isEmpty

/-- Bedside examinations and nursing assessments use their explicit FHIR category. -/
def bedside (subject encounterId code category time : String) (value : Json) : Json := Json.mkObj
  [("resourceType", .str "Observation"), ("subject", reference subject),
   ("encounter", reference encounterId), ("status", .str "final"),
   ("code", concept code), ("category", .arr #[concept category]),
   ("effectiveDateTime", .str time),
   (if category == "survey" then "valueString" else "valueQuantity", value)]

/-- Two recorded intake units remain distinct and a narrative is not made numeric. -/
def bedsideSources : List Json := currentVitalSources ++
  [bedside "Patient/selected" "Encounter/ed-1" "9000-1" "exam" "2026-11-02T08:15:00-08:00"
      (Json.mkObj [("value", toJson (250 : Nat)), ("unit", .str "mL")]),
   bedside "Patient/selected" "Encounter/ed-1" "9000-1" "exam" "2026-11-02T08:15:00-08:00"
      (Json.mkObj [("value", toJson (1 : Nat)), ("unit", .str "L")]),
   bedside "Patient/selected" "Encounter/ed-1" "Nursing assessment" "survey" "2026-11-02T08:00:00-08:00"
      (.str "Alert and oriented; breathing comfortably."),
   bedside "Patient/other" "Encounter/ed-1" "Wrong patient" "survey" "2026-11-02T08:00:00-08:00" (.str "Excluded"),
   bedside "Patient/selected" "Encounter/previous" "Prior admission" "survey" "2026-11-02T08:00:00-08:00" (.str "Excluded"),
   glucose "Patient/selected"]

/-- The nursing grid has one common time axis and preserves tied/conflicting values. -/
def bedsideGrid := acuteFlowsheetRows context bedsideSources patient
#guard bedsideGrid.length == 4
#guard bedsideGrid.any (fun row => row.lookup "Unit" == some "mL")
#guard bedsideGrid.any (fun row => row.lookup "Unit" == some "L")
#guard bedsideGrid.any (fun row => row.lookup "2026-11-02 08:00 -08:00" == some "82; 88")
#guard bedsideGrid.any (fun row => row.lookup "2026-11-02 08:00 -08:00" == some "Alert and oriented; breathing comfortably.")
#guard bedsideGrid.all (fun row => row.map (·.1) == (bedsideGrid.head!).map (·.1))
#guard bedsideGrid.all (fun row => row.lookup "Measure" != some "Wrong patient" && row.lookup "Measure" != some "Prior admission")
#guard bedsideGrid.all (fun row => row.lookup "Measure" != some "2339-0")

/-- A letter or another encounter's report is not the current nursing handoff. -/
def handoffFor (kind encounterId : String) : Json := Json.mkObj
  [("resourceType", .str "DocumentReference"), ("subject", reference "Patient/selected"),
   ("status", .str "current"), ("type", concept kind),
   ("context", Json.mkObj [("encounter", .arr #[reference encounterId])]),
   ("date", .str "2026-11-02T07:00:00-08:00"), ("description", .str "Shift report")]

#guard !acuteHandoffDocument (handoffFor "51852-2" "Encounter/ed-1")
#guard acuteHandoffDocument (handoffFor "handoff" "Encounter/ed-1")
#guard (((acuteSupportingRows context (resources ++ [handoffFor "handoff" "Encounter/ed-1",
  handoffFor "handoff" "Encounter/previous", handoffFor "51852-2" "Encounter/ed-1"]) patient).lookup "handoffSummary").getD []).length == 1

/-- An observation admission is a legitimate acute context, not an old clinic fallback. -/
def observationEncounter : Json := Json.mkObj
  [("resourceType", .str "Encounter"), ("id", .str "obs-1"), ("subject", reference "Patient/selected"),
   ("status", .str "in-progress"), ("class", Json.mkObj [("code", .str "OBSENC")])]

#guard (acuteEncounter { context with record := [] } [patient, observationEncounter] patient).isSome
#guard (acuteEncounter { context with record := [] } (resources ++ [observationEncounter]) patient).isNone
#guard (acuteEncounter context (resources ++ [observationEncounter]) patient).any (fun selected => str selected "id" == "ed-1")
#guard acuteProjectionVersion context resources == acuteProjectionVersion context resources.reverse
#guard acuteProjectionVersion context resources != acuteProjectionVersion { context with today := "2026-11-03" } resources
#guard acuteProjectionVersion context resources != acuteProjectionVersion { context with record := [("selectedEncounterId", "other")] } resources

/-- A due task names its exact order and encounter; execution time is separate. -/
def medicationTask (status business encounterId orderId due : String) : Json := Json.mkObj
  [("resourceType", .str "Task"), ("for", reference "Patient/selected"),
   ("encounter", reference encounterId), ("focus", reference orderId),
   ("intent", .str "order"), ("status", .str status), ("businessStatus", concept business),
   ("executionPeriod", Json.mkObj [("start", .str "2026-11-02T08:07:00-08:00")]),
   ("restriction", Json.mkObj [("period", Json.mkObj [("end", .str due)])])]

/-- The current selected order is supplied to the read-only MAR task projection. -/
def selectedMedication := medication "rx-2" "Encounter/ed-1" 4

#guard (acuteMarTaskEvents context (resources ++ [medicationTask "requested" "Overdue"
  "Encounter/ed-1" "MedicationRequest/rx-2" "2026-11-02T08:00:00-08:00"]) selectedMedication).head!.2.startsWith "Overdue"
#guard (acuteMarTaskEvents context (resources ++ [medicationTask "requested" "Overdue"
  "Encounter/previous" "MedicationRequest/rx-2" "2026-11-02T08:00:00-08:00"]) selectedMedication).isEmpty
#guard (acuteMarTaskEvents context (resources ++ [medicationTask "requested" "Overdue"
  "Encounter/ed-1" "MedicationRequest/rx-1" "2026-11-02T08:00:00-08:00"]) selectedMedication).isEmpty
#guard (acuteMarTaskEvents context (resources ++ [medicationTask "requested" "Due"
  "Encounter/ed-1" "MedicationRequest/rx-2" ""]) selectedMedication).isEmpty
#guard (acuteMarTaskEvents context (resources ++ [medicationTask "requested" "Due"
  "Encounter/ed-1" "MedicationRequest/rx-2" "2026-11-02"]) selectedMedication).isEmpty
#guard (acuteMarTaskEvents context (resources ++ [medicationTask "completed" "Given"
  "Encounter/ed-1" "MedicationRequest/rx-2" "2026-11-02T08:00:00-08:00"]) selectedMedication).all
  (fun (_, text) => text.startsWith "Task completed" && !text.startsWith "Given")

/-- Another dated visit and a first-listed nurse cannot replace this encounter's attending. -/
def chartVisit (id kind date location diagnosis : String) : Json := Json.mkObj
  [("resourceType", .str "Encounter"), ("id", .str id), ("subject", reference "Patient/selected"),
   ("status", .str (if kind == "EMER" then "in-progress" else "finished")),
   ("class", Json.mkObj [("code", .str kind)]), ("period", Json.mkObj [("start", .str date)]),
   ("reasonCode", .arr #[concept diagnosis]),
   ("location", .arr #[Json.mkObj [("location", Json.mkObj [("display", .str location)])]]),
   ("participant", .arr #[
     Json.mkObj [("type", .arr #[concept "RN"]), ("individual", Json.mkObj [("display", .str "Jordan Lee, RN")])],
     Json.mkObj [("type", .arr #[concept "ATND"]), ("individual", Json.mkObj [("display", .str "Morgan Patel, MD")])]])]

/-- The explicit selected encounter predates a newer historical clinic visit. -/
def chartSources := [patient,
  chartVisit "ed-1" "EMER" "2026-11-01T08:00:00-08:00" "ED A04" "R06.02",
  chartVisit "clinic-2" "AMB" "2026-11-02T09:00:00-08:00" "Clinic 2" "R51"]

#guard (bannerFor context chartSources patient).location == "ED A04"
#guard (bannerFor context chartSources patient).encounterClass == "EMER"
#guard (bannerFor context chartSources patient).attending == "Morgan Patel, MD"
#guard (bannerFor context chartSources patient).pcp == ""
#guard (bannerFor { context with record := [] } chartSources patient).location == "ED A04"
#guard (bannerFor { context with record := [("selectedEncounterId", "missing")] } chartSources patient).location == ""
#guard (factsOf { context with record := [] } chartSources patient).record.lookup "visitDiagnosis" == some "R06.02"
#guard (factsOf { context with record := [("selectedEncounterId", "ed-1"), ("visitDiagnosis", "J18.9")] }
  chartSources patient).record.lookup "visitDiagnosis" == some "J18.9"
/-- Invalid selection cannot make unrelated cached display data current. -/
def invalidEncounterContext : Ctx :=
  { latestVitalsContext with facts := factsOf { context with record := [("selectedEncounterId", "missing")] } chartSources patient }

/-- Ambiguous ongoing encounters likewise produce explicit empty current panels. -/
def ambiguousEncounterContext : Ctx :=
  { latestVitalsContext with facts := factsOf { context with record := [] } (resources ++ [observationEncounter]) patient }

#guard (uiRows invalidEncounterContext "vitals").isEmpty
#guard (uiRows invalidEncounterContext "labResults").isEmpty
#guard (uiRows ambiguousEncounterContext "vitals").isEmpty
#guard (uiRows ambiguousEncounterContext "labResults").isEmpty
#guard acuteCareClass "inpatient"

/-- A standard blood-pressure report has two separately recorded components. -/
def pressurePanel : Json := Json.mkObj
  [("resourceType", .str "Observation"), ("subject", reference "Patient/selected"),
   ("encounter", reference "Encounter/ed-1"), ("status", .str "final"),
   ("category", .arr #[concept "vital-signs"]), ("code", concept "85354-9"),
   ("effectiveDateTime", .str "2026-11-02T08:00:00-08:00"), ("component", .arr #[
     Json.mkObj [("code", concept "8480-6"), ("valueQuantity", Json.mkObj [("value", toJson (128 : Nat)), ("unit", .str "mmHg")])],
     Json.mkObj [("code", concept "8462-4"), ("valueQuantity", Json.mkObj [("value", toJson (82 : Nat)), ("unit", .str "mmHg")])]])]

#guard (acuteFlowsheetRows context (resources ++ [pressurePanel]) patient).length == 2
#guard (acuteFlowsheetRows context (resources ++ [pressurePanel]) patient).any
  (fun row => row.lookup "2026-11-02 08:00 -08:00" == some "128" && row.lookup "Unit" == some "mmHg")
#guard (acuteFlowsheetRows context (resources ++ [pressurePanel]) patient).any
  (fun row => row.lookup "2026-11-02 08:00 -08:00" == some "82")

/-- The single handoff's original narrative needs no invented attachment heading. -/
def singleHandoff : Json := Json.mkObj [("content", .arr #[Json.mkObj [("attachment", Json.mkObj
  [("contentType", .str "text/plain"), ("data", .str "U0JBUiByZXBvcnQ=")])]])]
#guard acuteHandoffText singleHandoff == "SBAR report"

/-- A current-dated administration can still belong to a previous admission. -/
def previousAdmissionAdministration : Json := Json.mkObj
  [("resourceType", .str "MedicationAdministration"), ("subject", reference "Patient/selected"),
   ("context", reference "Encounter/previous"), ("request", reference "MedicationRequest/prior-rx"),
   ("status", .str "completed"), ("effectiveDateTime", .str "2026-11-02T08:00:00-08:00")]

#guard (((acuteSupportingRows context (resources ++ [administration,
  medication "prior-rx" "Encounter/previous" 90, previousAdmissionAdministration]) patient).lookup "prnHistory").getD []).length == 1
#guard (((acuteSupportingRows { context with record := [("selectedEncounterId", "missing")] }
  (chartSources ++ [historicalGlucose]) patient).lookup "resultTrend").getD []).length == 1

/-- Two real administrations in one displayed hour remain separate source records. -/
def secondAdministration : Json := Json.mkObj
  [("resourceType", .str "MedicationAdministration"), ("id", .str "admin-2"),
   ("subject", reference "Patient/selected"), ("request", reference "MedicationRequest/rx-2"),
   ("status", .str "completed"), ("effectiveDateTime", .str "2026-11-02T08:22:00-08:00"),
   ("dosage", Json.mkObj [("dose", Json.mkObj [("value", toJson (4 : Nat)), ("unit", .str "units")])])]

/-- Repeated hour keys let the painter retain each record's supplied status tint. -/
def repeatedHourRows := (acuteMarRows context (resources ++ [administration, secondAdministration]) patient).getLast!
#guard (repeatedHourRows.filter (·.1 == "2026-11-02 08:00 -08:00")).length == 2
#guard repeatedHourRows.any (fun (key, value) => key == "2026-11-02 08:00 -08:00" && value.startsWith "Given · 08:07")
#guard repeatedHourRows.any (fun (key, value) => key == "2026-11-02 08:00 -08:00" && value.startsWith "Given · 08:22")

end Ehr.Render.Fhir.AcuteTests
