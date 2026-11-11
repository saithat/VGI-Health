import Ehr.Proofs.RuntimeWitnesses

/-! A clinical alert counterexample that avoids trusting evaluation of
reprStr (its pretty printer contains opaque partial functions). The handler
changes a confirmed coded capture into text, so the key's known-true prefix
becomes unknown. Distinct prefixes suffice for a kernel proof. Every
declaration is a new specification for owner review, outside Comparator. -/

namespace Ehr.Runtime.ClinicalWitness
open Ehr Props Check

/-- New specification for owner review: a clinical predicate on the element
that the critical-result handler can overwrite. The namespace is not reserved
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

/-- New specification for owner review: the handler replaces the code with
text while keeping the previous popup, changing its key's clinical snapshot. -/
def documented : State := (runStep (input opened Witness.action)).state

/-- New specification for owner review: the clinical-key witness is accepted. -/
theorem accepted : check spec none program program = .ok := by decide

/-- New specification for owner review: the signed-in user has the program role. -/
theorem user_role : Examples.Tiny.user.role = program.role := by decide

/-- New specification for owner review: a real fixed-facts deployed run. -/
theorem reachable :
    FixedReachable ⟨spec, program, Witness.facts, Examples.Tiny.user⟩ documented :=
  .event Witness.action (.event (.click "alert")
    (.event (.enter "assessmentField" (.code "ready")) .start))

/-- New specification for owner review: the handler changes the clinical
predicate from known true to unknown, and the core keeps unknown alerts active. -/
theorem clinical_changed :
    clinicalEval Witness.facts opened predicate = some true ∧
    clinicalEval Witness.facts documented predicate = none := by decide

/-- New specification for owner review: an accepted ordinary program reaches
a popup whose key is not in any matching rule's current clinical keys.
This is a kernel counterexample to runtime AlertsOnlyWhenTrue at fixed facts. -/
theorem stale_clinical_key :
    ∃ a k, documented.popup? = some (a, k) ∧
      ∀ al ∈ spec.alerts, al.id = a → k ∉ alertKeys Witness.facts documented al.cond := by
  refine ⟨"clinicalAlert", "clinical:true:" ++
    reprStr (Witness.facts.clinical?, Witness.facts.artifactBindings?, ready.captured), rfl, ?_⟩
  intro al hal _
  have he : al = Scalar.alert (.clinical predicate) .interruptive := by
    simpa only [spec, Scalar.spec, List.mem_singleton] using hal
  subst al
  change _ ∉ ["clinical:unknown:" ++
    reprStr (Witness.facts.clinical?, Witness.facts.artifactBindings?, documented.captured)]
  simp only [List.mem_singleton]
  intro he
  have hp := congrArg (fun s : String => s.toList.take 10) he
  simp only [String.toList_append] at hp
  change ['c', 'l', 'i', 'n', 'i', 'c', 'a', 'l', ':', 't'] =
    ['c', 'l', 'i', 'n', 'i', 'c', 'a', 'l', ':', 'u'] at hp
  contradiction

#print axioms accepted
#print axioms user_role
#print axioms reachable
#print axioms clinical_changed
#print axioms stale_clinical_key
end Ehr.Runtime.ClinicalWitness
