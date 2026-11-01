import Ehr.Render.PresentationProofs
import Ehr.Render.PresentationTests
import Ehr.Render.LabResultsTests

namespace Ehr.Render.ObservationTests
open Lean Fhir

/-- Blood-pressure slices can arrive diastolic first without reversing the reading. -/
def reversedBloodPressure := Tests.json r#"{"resourceType":"Observation","status":"final","category":[{"coding":[{"code":"vital-signs"}]}],"code":{"text":"Blood pressure","coding":[{"system":"http://loinc.org","code":"85354-9"}]},"effectiveDateTime":"2026-11-01T08:00:00","component":[{"code":{"text":"Diastolic blood pressure","coding":[{"system":"http://loinc.org","code":"8462-4"}]},"valueQuantity":{"value":76,"unit":"mmHg"}},{"code":{"text":"Systolic blood pressure","coding":[{"system":"http://loinc.org","code":"8480-6"}]},"valueQuantity":{"value":128,"unit":"mmHg"}}]}"#
#guard observationBpValue? reversedBloodPressure == some ("128/76", "mmHg")
#guard (observationRow reversedBloodPressure).value == "128/76"
#guard (observationRows [reversedBloodPressure]).length == 3
#guard (observationRows [reversedBloodPressure]).any (fun r => r.measure == "Blood pressure • Diastolic blood pressure" && r.value == "76")

/-- Uncoded or incomplete panels never acquire meaning from array position. -/
def uncodedPanel := reversedBloodPressure.setObjVal! "code" (Tests.json r#"{"text":"Assessment panel"}"#)
#guard observationBpValue? uncodedPanel == none
#guard (observationRow uncodedPanel).value == "See component results"
#guard (observationRows [uncodedPanel]).length == 3
#guard observationBpValue? (reversedBloodPressure.setObjVal! "valueQuantity" (Tests.json r#"{"value":42,"unit":"mmHg"}"#)) == none
#guard (observationRow (reversedBloodPressure.setObjVal! "valueQuantity" (Tests.json r#"{"value":42,"unit":"mmHg"}"#))).value == "42"

/-- A categorical assessment component retains the parent's time, status and category. -/
def assessment := Tests.json r#"{"resourceType":"Observation","status":"preliminary","category":[{"coding":[{"code":"exam"}]}],"code":{"text":"Mobility assessment"},"effectiveDateTime":"2026-11-01T09:00:00","component":[{"code":{"text":"Ambulates independently"},"valueBoolean":false},{"code":{"text":"Assistance"},"valueCodeableConcept":{"text":"One person assist"}}]}"#
def assessmentRows := observationRows [assessment]
#guard assessmentRows.length == 3
#guard assessmentRows.any (fun r => r.value == "No" && r.measure == "Mobility assessment • Ambulates independently")
#guard assessmentRows.any (·.value == "One person assist")
#guard assessmentRows.all (fun r => r.time == "2026-11-01T09:00:00" && r.status == "preliminary" && r.categories == ["exam"])

/-- Nursing display preserves comparison operators and missing-result explanations. -/
def censoredOutput := Tests.json r#"{"resourceType":"Observation","status":"final","category":[{"coding":[{"code":"exam"}]}],"code":{"text":"Output"},"valueQuantity":{"value":5,"comparator":"<","unit":"mL"}}"#
def absentAssessment := Tests.json r#"{"resourceType":"Observation","status":"final","code":{"text":"Pain assessment"},"dataAbsentReason":{"text":"Patient declined"}}"#
#guard (observationRow censoredOutput).value == "<5"
#guard (observationRow absentAssessment).value == "Not available · Patient declined"

/-- Whole-chart input keeps labs in Display/Results without mixing them into nursing rows. -/
def lab := LabResultsTests.hemoglobinDl
def wholeChart : Display := { Display.empty with
  observations := observationRows [reversedBloodPressure, assessment, lab],
  labResults := labResultRows [lab] }
#guard wholeChart.observations.length == 7
#guard wholeChart.labResults.length == 1
#guard (flowsheetCells wholeChart).length == 6
#guard !(flowsheetCells wholeChart).any (fun row => row.any (·.2 == "Hemoglobin"))
#guard flowsheetObservation { measure := "Legacy value", value := "1", unit := "", time := "", status := "" }
#guard flowsheetObservation { measure := "Vital", value := "1", unit := "", time := "", status := "final", categories := ["laboratory", "vital-signs"] }
#guard (observationRows [assessment, assessment]).length == 6

/-- Category metadata is additive on the JSON wire, with strict supplied values. -/
def legacyRow := Tests.json r#"{"measure":"Pain","value":"2","unit":"score","time":"08:00","status":"final"}"#
#guard (fromJson? legacyRow : Except String ObservationRow).toOption.any (·.categories.isEmpty)
#guard !(fromJson? (legacyRow.setObjVal! "categories" (.str "bad")) : Except String ObservationRow).isOk
#guard roundTrips wholeChart
#guard (fromJson? ((toJson wholeChart).setObjVal! "observations" (.arr #[legacyRow])) : Except String Display).isOk

/-- A single untitled inline note needs no generated attachment heading. -/
def plainNote := Tests.json r#"{"content":[{"attachment":{"contentType":"text/plain","data":"YQ=="}}]}"#
#guard (noteRow plainNote).text == "a"
#guard !(noteCells (noteRow plainNote)).any (fun (key, _) => key == "Source date" || key == "Shift days")
#guard (noteCells (noteRow Tests.note)).contains ("Source date", "Jan 1, 2020")
#guard (noteCells (noteRow Tests.note)).contains ("Shift days", "-12")

end Ehr.Render.ObservationTests
