import Ehr.Render.PresentationProofs
import Ehr.Render.FhirTests

namespace Ehr.Render.LabResultsTests
open Lean Fhir

/-- Two historical hemoglobin results use different recorded mass-concentration units. -/
def hemoglobinDl := Tests.json r#"{"resourceType":"Observation","category":[{"coding":[{"code":"laboratory"}]}],"status":"final","code":{"text":"Hemoglobin","coding":[{"code":"718-7"}]},"effectiveDateTime":"2026-10-01T08:00:00","valueQuantity":{"value":12,"unit":"g/dL"},"referenceRange":[{"low":{"value":12,"unit":"g/dL"},"high":{"value":17.5,"unit":"g/dL"}}]}"#
def hemoglobinL := Tests.json r#"{"resourceType":"Observation","category":[{"coding":[{"code":"laboratory"}]}],"status":"final","code":{"text":"Hemoglobin","coding":[{"code":"718-7"}]},"effectiveDateTime":"2026-11-01T08:00:00","valueQuantity":{"value":120,"unit":"g/L"},"referenceRange":[{"low":{"value":120,"unit":"g/L"},"high":{"value":175,"unit":"g/L"}}]}"#
def unitHistory := labResultRows [hemoglobinDl, hemoglobinL]
#guard unitHistory.length == 2
#guard unitHistory.any (fun r => r.value == "12" && r.unit == "g/dL" && r.refRange == "12–17.5")
#guard unitHistory.any (fun r => r.value == "120" && r.unit == "g/L" && r.refRange == "120–175")
#guard unitHistory.all (·.flag == "")
#guard (labResultRows [hemoglobinDl, hemoglobinDl]).length == 2

/-- Censored quantities remain censored and do not acquire an exact-value flag. -/
def censored := Tests.json r#"{"resourceType":"Observation","category":[{"coding":[{"code":"laboratory"}]}],"status":"final","code":{"text":"Example assay"},"valueQuantity":{"value":5,"comparator":"<","unit":"mg/L"},"referenceRange":[{"low":{"value":0,"unit":"mg/L"},"high":{"value":3,"unit":"mg/L"}}]}"#
#guard (labResultRow censored).value == "<5"
#guard labFlag censored == "H"
#guard (labResultRow censored).flag == ""
#guard (labResultRow (censored.setObjVal! "interpretation" (.arr #[Tests.json r#"{"coding":[{"code":"H"}]}"#]))).flag == "H"

/-- A critical interval is not silently treated as an ordinary normal interval. -/
def criticalInterval := Tests.json r#"{"valueQuantity":{"value":5,"unit":"mg/L"},"referenceRange":[{"type":{"coding":[{"code":"critical"}]},"low":{"value":0,"unit":"mg/L"},"high":{"value":3,"unit":"mg/L"}}]}"#
#guard labFlag criticalInterval == "H"
#guard (labResultRow criticalInterval).flag == ""

/-- Negative and qualitative source values are never replaced with zero or dropped. -/
def signed := Tests.json r#"{"resourceType":"Observation","category":[{"coding":[{"code":"laboratory"}]}],"status":"final","code":{"text":"Example signed result"},"valueQuantity":{"value":-3.2,"unit":"mmol/L"},"interpretation":[{"coding":[{"code":"L"}]}]}"#
def culture := Tests.json r#"{"resourceType":"Observation","category":[{"coding":[{"code":"laboratory"}]}],"status":"final","code":{"text":"Culture result"},"valueString":"No growth","referenceRange":[{"text":"No growth"}],"interpretation":[{"coding":[{"code":"N"}]}]}"#
#guard (labResultRow signed).value == "-3.2"
#guard (labResultRow signed).flag == "L"
#guard (labResultRow culture).value == "No growth"
#guard (labResultRow culture).refRange == "No growth"
#guard (labResultRow culture).flag == "N"

/-- Integer, boolean and missing-result explanations retain their source meaning. -/
def integerResult := Tests.json r#"{"valueInteger":-2}"#
def booleanResult := Tests.json r#"{"valueBoolean":false}"#
def absentResult := Tests.json r#"{"dataAbsentReason":{"text":"Specimen insufficient"}}"#
#guard (labResultRow integerResult).value == "-2"
#guard (labResultRow booleanResult).value == "No"
#guard (labResultRow absentResult).value == "Not available · Specimen insufficient"

/-- Complex values remain text instead of being plotted as a made-up scalar. -/
def ratioResult := Tests.json r#"{"valueRatio":{"numerator":{"value":5,"unit":"mg","comparator":"<"},"denominator":{"value":1,"unit":"g"}}}"#
def sampledResult := Tests.json r#"{"valueSampledData":{"origin":{"value":0,"unit":"mV"},"period":4,"factor":0.5,"dimensions":1,"data":"1 2 3"}}"#
#guard (labResultRow ratioResult).value == "<5 mg / 1 g"
#guard (labResultRow sampledResult).value == "Samples: 1 2 3 · Origin: 0 mV · Factor: 0.5 · Period (ms): 4 · Dimensions: 1"

/-- A report and all components retain their own values and inherited report metadata. -/
def panel := Tests.json r#"{"resourceType":"Observation","category":[{"coding":[{"code":"laboratory"}]}],"status":"preliminary","code":{"text":"Basic metabolic panel"},"effectiveDateTime":"2026-11-01T08:00:00","component":[{"code":{"text":"Sodium"},"valueQuantity":{"value":138,"unit":"mmol/L"}},{"code":{"text":"Potassium"},"valueQuantity":{"value":3.2,"unit":"mmol/L"},"interpretation":[{"coding":[{"code":"L"}]}]}]}"#
def componentResults := labResultRows [panel]
#guard componentResults.length == 3
#guard componentResults.any (fun r => r.name == "Basic metabolic panel" && r.value == "See component results")
#guard componentResults.any (fun r => r.name == "Basic metabolic panel • Potassium" && r.value == "3.2" && r.unit == "mmol/L" && r.flag == "L")
#guard componentResults.all (fun r => r.status == "preliminary" && r.date == "2026-11-01T08:00:00")
#guard (labResultRows [panel.setObjVal! "status" (.str "entered-in-error")]).isEmpty

/-- Old demo reference intervals cannot be stamped onto a different recorded unit. -/
def differentCatalogUnit := hemoglobinL.setObjVal! "referenceRange" (.arr #[])
#guard (labResultRow differentCatalogUnit).refRange == ""
#guard (labResultRow differentCatalogUnit).flag == ""
#guard (labResultRow (hemoglobinDl.setObjVal! "referenceRange" (.arr #[]))).refRange == "12–17.5"

/-- Per-result display JSON retains raw units without changing legacy lab aggregates. -/
def fullDisplay := { Display.empty with labs := labRows [hemoglobinDl, hemoglobinL], labResults := unitHistory }
#guard roundTrips fullDisplay
#guard fullDisplay.labs.length == 1
#guard fullDisplay.labResults.length == 2

end Ehr.Render.LabResultsTests
