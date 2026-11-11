import Ehr.Render.PatientWorkspace
import Ehr.Check.RuleSound
import Ehr.Examples.Tiny

namespace Ehr.Workspace
#guard patientMatches "Riley Ellis" { id := "B", name := "Ellis, Riley", mrn := "SH00001675" }
#guard patientMatches "Ellis, Riley" { id := "B", name := "Ellis, Riley", mrn := "SH00001675" }
#guard patientMatches "sh00001675" { id := "B", name := "Ellis, Riley", mrn := "SH00001675" }
#guard !patientMatches "," { id := "B", name := "Ellis, Riley", mrn := "SH00001675" }
/-- Patient B never inherits captures, acknowledgments, commits or receipts from patient A.
Patient A's captures and acknowledgments are kept apart, in A's stored draft. -/
theorem opening_clears_patient_state (p : Program) (s : State) (patient target : String) :
    (openPatient p s patient target).captured = [] ∧
    (openPatient p s patient target).receipts = [] ∧
    (openPatient p s patient target).acked = [] ∧
    (openPatient p s patient target).commits = [] := by simp [openPatient, init]

/-- The landing workspace cannot be bound to any patient's facts. -/
theorem initial_not_bound (p : Program) (f : Facts) : bound f (init p) = false := by
  simp [bound, init]

#print axioms opening_clears_patient_state
#print axioms initial_not_bound

/-- Facts from another source cannot display or operate the selected patient's chart. -/
theorem foreign_facts_not_bound (f : Facts) (s : State)
    (different : (s.patientContext?.bind (·.patient?)) ≠ f.sourcePatientId?) : bound f s = false := by
  cases hc : s.patientContext? with
  | none => simp [bound, hc]
  | some c =>
    have h : c.patient? ≠ f.sourcePatientId? := by simpa [hc] using different
    simp [bound, hc, h]

/-- A real entry in A's state is absent when the same interpreter opens B. -/
example : (openPatient Ehr.Examples.Tiny.program
    { (init Ehr.Examples.Tiny.program) with captured := [{
      element := "patientIdReentry", slot := 0, value := .text "patient-A", byHuman := true, confirmed := true }] }
    "patient-B" "orders").captured = [] := rfl

#print axioms foreign_facts_not_bound
end Ehr.Workspace

namespace Ehr.Render
/-- No patient banner, sidebar or modal can appear before source identity binding. -/
theorem unbound_has_no_chart (sp : Spec) (p : Program) (f : Facts) (d : Display) (u : User) (s : State)
    (enabled : Workspace.enabled p = true) (unbound : Workspace.bound f s = false) :
    (renderPatientWorkspace sp p f d u s).banner = [] ∧
    (renderPatientWorkspace sp p f d u s).side = [] ∧
    (renderPatientWorkspace sp p f d u s).modal = none := by
  simp [renderPatientWorkspace, enabled, unbound, patientLandingUi]

#print axioms unbound_has_no_chart
end Ehr.Render

namespace Ehr.Check
/-- A certified candidate cannot remove the canonical workspace selection requirement. -/
theorem accepted_patientSelection (sp : Spec) (prev : Option Program) (can p : Program)
    (checked : check sp prev can p = .ok) (required : can.patientSelection? = some true) :
    p.patientSelection? = some true := by
  have hall := (check_ok_iff sp prev can p).mp checked
  have rule := hall {
    property := "patientSelection", passes := can.patientSelection? != some true || p.patientSelection? == some true,
    explain := fun _ => plain "patientSelection" "Patient selection inside the workspace must be retained" }
    (by simp [rules])
  simpa [required] using rule
#print axioms accepted_patientSelection
end Ehr.Check
