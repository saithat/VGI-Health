import Ehr.Check.CaptureSlots
import Ehr.Check.ScalarCompletion
import Ehr.Check.DoseSound
import Ehr.Check.Check

/-! A dose-only program has no completion path. The dependency rule rejects it. -/
namespace Ehr.Check.DoseCompletionObstruction
open Ehr Ehr.Props Ehr.Proofs

/-- A dose entry requires a selected drug, but this spec declares no drug input. -/
def spec : Spec := Scalar.spec .medicationDose .physician .shownOnCommit .careGap .passive

/-- The existing scalar program has an assessment field and no drug field. -/
def program : Program := Scalar.program .physician

/-- The checker rejects a dose field without reachable drug selection. -/
theorem rejected : check spec none program program ≠ .ok := by decide

private theorem no_drug_fields : FixedDrugSlots program [] := by
  intro sc hc slot pf hk
  simp only [allComps, program, Scalar.program, List.flatMap_cons, List.flatMap_nil,
    List.append_nil, List.mem_map] at hc
  obtain ⟨c, hc, rfl⟩ := hc
  simp only [Scalar.screen, List.mem_cons, List.not_mem_nil, or_false] at hc
  rcases hc with rfl | rfl | rfl | rfl | rfl <;>
    simp [Scalar.field, Scalar.button, drugElement] at hk

private theorem dose_invalid (s : State) (bound : DrugSlotsWithin [] s) (slot : Nat) (v : Value) :
    doseValueValid s slot v = false := by
  have empty : s.captured.filter (fun x => x.slot == slot && x.element == drugElement) = [] := by
    apply List.filter_eq_nil_iff.mpr
    intro x hx
    have ne : x.element ≠ drugElement := fun he => by cases bound x hx he
    simp [ne]
  cases v <;> simp [doseValueValid, doseUnitsAt, doseDrug?, empty]

private theorem cannot_add (facts : Facts) (user : User) (s : State)
    (bound : DrugSlotsWithin [] s) (actor : Actor) (e : Event)
    (old : "recordReview" ∉ s.commits) :
    "recordReview" ∉ (step spec program facts user actor s e).1.commits := by
  intro added
  have guard := (commitGuard_iff spec program facts user s "recordReview").mp
    (T0_commit_needs_guard spec program facts user actor s e "recordReview" old added)
  have met := guard.2.1 Scalar.entry (by simp [spec, Scalar.spec]) rfl
  change hasGoodEntry facts user s (Scalar.element .medicationDose .physician) none = true at met
  obtain ⟨x, hx, good⟩ := List.any_eq_true.mp met
  have xe : x.element = "assessment" := by
    simp only [Bool.and_eq_true, Bool.and_true, Scalar.element, beq_iff_eq] at good
    exact good.1.1
  have valid := committed_dose_native ⟨spec, program, facts, user⟩ s actor e "recordReview"
    ⟨old, added⟩ (Scalar.element .medicationDose .physician) (by simp [spec, Scalar.spec]) rfl x hx xe
  rw [dose_invalid s bound x.slot x.value] at valid
  contradiction

/-- No reachable state of the dose-only program ever contains its required commit. -/
theorem never_commits (facts : Facts) (user : User) :
    Always ⟨spec, program, facts, user⟩ (fun s => "recordReview" ∉ s.commits) := by
  intro s hs
  have slots := reachable_drugSlots ⟨spec, program, facts, user⟩ [] no_drug_fields
  induction hs with
  | start =>
    change "recordReview" ∉ (prefillScreen spec program facts _).commits
    rw [(prefillScreen_frame spec program facts _).1]
    simp
  | step actor e hs ih => exact cannot_add facts user _ (slots _ hs) actor e ih
  | wait d hs ih => exact ih

private theorem after_reachable (ep : Episode) (s : State) (hs : Reachable ep s) (es : List Event) :
    Reachable ep (ep.afterHuman s es) := by
  induction es generalizing s with
  | nil => exact hs
  | cons e es ih => exact ih _ (.step .human e hs)

/-- The missing drug dependency makes this program non-completable. -/
theorem not_completable : ¬ Completable spec program program := by
  intro complete
  let facts := Ehr.Examples.Tiny.facts
  let user := Ehr.Examples.Tiny.user
  let ep : Episode := ⟨spec, program, facts, user⟩
  have required : "recordReview" ∈ requiredCommitsFor spec program program facts user := by decide
  obtain ⟨es, done⟩ := complete facts user rfl (by
    rintro ⟨el, hel, hk⟩
    simp [spec, Scalar.spec, Scalar.element] at hel
    subst el
    contradiction) ep.start .start "recordReview" required (never_commits facts user _ .start)
  exact never_commits facts user _ (after_reachable ep ep.start .start es) done

/-! Dependency checks cover missing, hidden and mismatched-slot drug fields. -/
def declaredDrug : Spec := { spec with elements := spec.elements ++
  [{ id := drugElement, label := "Drug", kind := .coded "formulary", enteredBy := [.physician],
     prefill := .never, friction := .safety, humanOnly := true, fhirTarget := "MedicationRequest.medication" }] }

def withDrug (slot : Slot) (size : Size := .normal) : Program :=
  { program with screens := program.screens.map fun scr => { scr with components :=
      scr.components ++ [{ id := "drugSelect", label := "Drug", size := size, kind := .field drugElement slot .none }] } }

#guard (doseDependencyIssue declaredDrug program "recordReview" ["clinical"]).isSome
#guard (doseDependencyIssue declaredDrug (withDrug (.fixed 1)) "recordReview" ["clinical"]).isSome
#guard (doseDependencyIssue declaredDrug (withDrug (.fixed 0) .tiny) "recordReview" ["clinical"]).isSome
#guard (doseDependencyIssue declaredDrug (withDrug (.fixed 0)) "recordReview" []).isSome
#guard (doseDependencyIssue declaredDrug (withDrug .current) "recordReview" ["clinical"]).isNone

def archivedMismatch : Program :=
  { (withDrug .current) with screens := (withDrug .current).screens.map fun scr =>
    { scr with components := scr.components ++
      [{ id := "nextLine", label := "Next order", kind := .button .newOrderLine }] } }
#guard (doseDependencyIssue declaredDrug archivedMismatch "recordReview" ["clinical"]).isSome

/-- A reachable selector on the correct line remains accepted. -/
theorem dependency_repaired_accepted :
    check declaredDrug none (withDrug (.fixed 0)) (withDrug (.fixed 0)) = .ok := by decide

/-- The repaired input is a real completion path, not just a structural witness. -/
example : "recordReview" ∈ (runAll declaredDrug (withDrug (.fixed 0))
    Ehr.Examples.Tiny.facts Ehr.Examples.Tiny.user .human
    (init declaredDrug (withDrug (.fixed 0)) Ehr.Examples.Tiny.facts Ehr.Examples.Tiny.user)
    [.enter "drugSelect" (.code "acetaminophen"), .enter "assessmentField" (.qty 10 .mg),
     .click "recordButton"]).commits := by decide

#print axioms dependency_repaired_accepted
#print axioms rejected
#print axioms never_commits
#print axioms not_completable
end Ehr.Check.DoseCompletionObstruction
