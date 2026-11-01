import Ehr.Render.UiProofs
import Ehr.Render.FhirTests

namespace Ehr.Render.PresentationTests
open Lean Fhir

/-- A schedule resource uses references resolved from the supplied bundle. -/
def patient := Tests.json r#"{"resourceType":"Patient","id":"p","name":[{"family":"Morgan","given":["Alex"]}],"birthDate":"2016-02-11","gender":"female"}"#
def appointment := Tests.json r#"{"resourceType":"Appointment","start":"2026-11-01T09:00:00","status":"arrived","participant":[{"actor":{"reference":"Patient/p"}},{"actor":{"reference":"Practitioner/missing"}}],"appointmentType":{"text":"Well child"},"reasonCode":[{"text":"Annual visit"}]}"#
def scheduleExample := scheduleRows "2026-11-01" [patient, appointment]
#guard scheduleExample.length == 1
#guard scheduleExample.all (fun r => r.patient == "Morgan, Alex" && r.ageSex == "10 / F" && r.provider == "")
#guard (scheduleRows "2026-11-01" [appointment]).all (·.patient == "")
#guard humanRef [] (Tests.json r#"{"reference":"Patient/internal-identifier"}"#) == ""

/-- Frequency alone never invents scheduled times, and an order is never Given. -/
def request := Tests.json r#"{"resourceType":"MedicationRequest","id":"rx","status":"active","medicationCodeableConcept":{"text":"Acetaminophen 500 mg tablet"},"dosageInstruction":[{"text":"500 mg orally every 6 hours","route":{"text":"Oral"},"doseAndRate":[{"doseQuantity":{"value":500,"unit":"mg"}}]}]}"#
def given := Tests.json r#"{"resourceType":"MedicationAdministration","request":{"reference":"MedicationRequest/rx"},"status":"completed","medicationCodeableConcept":{"text":"Acetaminophen 500 mg tablet"},"effectiveDateTime":"2026-11-01T08:12:00","dosage":{"dose":{"value":500,"unit":"mg"},"route":{"text":"Oral"},"site":{"text":"Not applicable"}},"performer":[{"actor":{"display":"Jordan Reed, RN"}}]}"#
def orderOnly := { Display.empty with marOrders := marOrderRows [request] }
def documented := { orderOnly with administrations := administrationRows [given] }
#guard (marOrderRows [request]).all (·.scheduled.isEmpty)
#guard (marCells orderOnly).length == 1
#guard !(marCells orderOnly).any (fun row => row.any (fun (_, value) => value.startsWith "Given"))
#guard (marCells documented).length == 1
#guard (marCells documented).any (fun row => row.any (fun (_, value) => value == "Given · 08:12 · 500 mg · Oral · Not applicable · Jordan Reed, RN"))
#guard (marCells { Display.empty with administrations := administrationRows [given] }).length == 1
#guard (administrationRows [given.setObjVal! "status" (.str "entered-in-error")]).isEmpty
#guard administrationStatus "not-done" == "Not given"
#guard administrationStatus "unknown" == "unknown"

/-- Repeated same-time observations and differing units are never overwritten. -/
def observations : Display := { Display.empty with observations :=
  [{ measure := "Temperature", value := "37.1", unit := "Cel", time := "2026-11-01T08:00:00", status := "final" },
   { measure := "Temperature", value := "37.3", unit := "Cel", time := "2026-11-01T08:00:00", status := "final" },
   { measure := "Temperature", value := "99.0", unit := "[degF]", time := "2026-11-01T08:00:00", status := "final" }] }
#guard (flowsheetCells observations).length == 2
#guard ((flowsheetCells observations).headD []).length == 4

/-- Explicit H/L source flags survive; the painter performs no range comparison. -/
def low := Tests.json r#"{"valueQuantity":{"value":3.1,"unit":"mmol/L"},"interpretation":[{"coding":[{"code":"L"}]}]}"#
#guard labFlag low == "L"
#guard labFlag (Tests.json r#"{"valueQuantity":{"value":8},"referenceRange":[{"low":{"value":3},"high":{"value":5}}]}"#) == "H"

/-- Transparent presentation containers retain every info and action atom. -/
theorem presentation_presence_example (node : UiNode) :
    uiAtoms (.presentation .timeGrid [node]) = uiAtoms node := by simp [uiAtoms]

/-- A source group may select columns without dropping any child semantics. -/
theorem column_presence_example (children : List UiNode) :
    uiAtomsList (uiColumnChildren "layout.columns" children) =
      [.columns []] ++ uiAtomsList children := by simp [uiColumnTag]

/-- Unrelated source tags keep their existing single-column layout. -/
def unchangedLayout := uiColumnChildren "rooming" [.text "Chief complaint"]
#guard match unchangedLayout with | [.text s] => s == "Chief complaint" | _ => false

/-- Only a complete, explicit nonnegative row target selects row placement. -/
def firstRowTarget := uiRowTarget? "ward.present.row|worklist-records|0"
#guard firstRowTarget == some ("worklist-records", 0)
#guard uiRowTarget? "present.row|records|-1" == none
#guard uiRowTarget? "present.row||1" == none
#guard uiRowTarget? "unrelated|records|1" == none

/-- Row placement retains the event, label and enabled state exactly. -/
theorem row_action_presence_example (control : UiNode) :
    uiAtoms (uiWrapRow "present.row|records|0" control) = uiAtoms control := by simp

/-- JSON round trips include the new closed kind and the ordinary info child. -/
def semanticExample : UiNode := .presentation .timeGrid
  [.info "mar" "Medication administration" "mar" "table" (marCells documented)]
#guard (decodeJson UiNode (encodeJson semanticExample)).isOk
#guard roundTrips documented
#print axioms presentation_presence_example

end Ehr.Render.PresentationTests
