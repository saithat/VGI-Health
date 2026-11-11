import Ehr.Proofs.RuntimeWitnesses

/-! Regression for the former clinical-key counterexample. The spec declares a
coded element named like a critical-result action endpoint, and a clinical
alert reads it. The handler used to overwrite that capture with text while the
alert popup was open, leaving the popup with a key that no longer fired. It is
now refused under the popup, and afterwards stores a draft without touching
the capture. Every declaration is a new specification for owner review,
outside Comparator. -/

namespace Ehr.Runtime.ClinicalWitness
open Ehr Props Check

/-- New specification for owner review: a clinical predicate on an element
named like a critical-result action endpoint. The namespace is not reserved
by the checker for element IDs. -/
def predicate : ClinicalPredicate := .capturedCode "critical.action:k1" 0 "ready"

/-- New specification for owner review: a scalar spec with a declared coded
critical-action element and a clinical alert that reads it. -/
def spec : Spec :=
  { Scalar.spec (.coded "action") .physician .shownOnCommit (.clinical predicate) .interruptive with
    elements := [{ Scalar.element (.coded "action") .physician with id := "critical.action:k1" }],
    entries := [{ Scalar.entry with element := "critical.action:k1" }] }

/-- New specification for owner review: the corresponding ordinary scalar
field writes the declared element through the core interpreter. -/
def program : Program :=
  { Scalar.program .physician with screens := [{ Scalar.screen with components := [
    { id := "banner", kind := .banner },
    { Scalar.field with kind := .field "critical.action:k1" (.fixed 0) .none },
    { id := "allergies", kind := .panel "allergyList", label := "Allergies" }, Scalar.button,
    { id := "alert", kind := .alert "clinicalAlert" false, label := "Clinical alert" }] }] }

/-- New specification for owner review: API assembly using fixed critical facts. -/
def input (s : State) (e : Event) : StepInput :=
  ⟨spec, program, Witness.facts, Examples.Tiny.user, s, e⟩

/-- New specification for owner review: enter a confirmed code before opening
the alert. The control ID is not a critical handler endpoint. -/
def ready : State :=
  (runStep (input (runInit ⟨spec, program, Witness.facts, Examples.Tiny.user⟩)
    (.enter "assessmentField" (.code "ready")))).state

/-- New specification for owner review: open the alert for its known-true key. -/
def opened : State := (runStep (input ready (.click "alert"))).state

/-- New specification for owner review: acknowledge the alert, then send the
critical-result entry that names the declared element. -/
def documented : State :=
  (runStep (input (runStep (input opened (.ack "clinicalAlert"))).state Witness.action)).state

/-- New specification for owner review: the clinical-key witness is accepted. -/
theorem accepted : check spec none program program = .ok := by decide

/-- New specification for owner review: the signed-in user has the program role. -/
theorem user_role : Examples.Tiny.user.role = program.role := by decide

/-- New specification for owner review: a real fixed-facts deployed run. -/
theorem reachable :
    FixedReachable ⟨spec, program, Witness.facts, Examples.Tiny.user⟩ documented :=
  .event Witness.action (.event (.ack "clinicalAlert") (.event (.click "alert")
    (.event (.enter "assessmentField" (.code "ready")) .start)))

/-- New specification for owner review: with the clinical popup open, the
critical-result entry is refused and the state, including the popup key and
the capture it was computed from, is unchanged. -/
theorem blocked_under_popup :
    runStep (input opened Witness.action) =
      { state := opened, result := .blocked "popup: acknowledge the alert first" } :=
  popup_blocks_ordinary (input opened Witness.action) rfl (by decide) rfl

/-- New specification for owner review: after the acknowledgment the entry is
stored as a draft. The declared coded capture is not overwritten, so the
clinical predicate stays known true. -/
theorem clinical_unchanged :
    clinicalEval Witness.facts opened predicate = some true ∧
    clinicalEval Witness.facts documented predicate = some true ∧
    documented.captured = ready.captured ∧
    documented.criticalDrafts? = some [{ result := "k1", text := "called ICU" }] := by decide

/-- New specification for owner review: the former counterexample program now
has runtime property 10, by the general theorem for accepted ordinary programs. -/
theorem alerts_only_when_true :
    FixedAlertsOnlyWhenTrue ⟨spec, program, Witness.facts, Examples.Tiny.user⟩ :=
  (accepted_ordinary spec none program program accepted rfl Witness.facts Examples.Tiny.user
    user_role).alertsOnlyWhenTrue

#print axioms accepted
#print axioms user_role
#print axioms reachable
#print axioms blocked_under_popup
#print axioms clinical_unchanged
#print axioms alerts_only_when_true
end Ehr.Runtime.ClinicalWitness
