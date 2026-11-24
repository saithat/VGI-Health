import Ehr.Check.RuleSound

namespace Ehr.Check.ReviewTrace
open Ehr Ehr.Props EntryWitness

/-- New specification for owner review. Checker acceptance supplies a native
trace from encounter initialization through every checkpoint, separately on
each applicable layout or counterfactual probe in the clinical catalog.
The clinical and entry catalogs use the same proof-carrying Trial relation. -/
theorem accepted_clinicalScenarios (sp prev canonical p) (accepted : check sp prev canonical p = .ok) :
    ∀ c ∈ clinicalCases sp canonical p, Realized c.input.toInitInput c.task := by
  let result := certifyCases (clinicalCases sp canonical p)
  have ok : result.isOk = true := (check_ok_iff ..).mp accepted
    { property := "clinicalScenarios", passes := result.isOk, explain := fun _ =>
      match result with | .error reason => plain "clinicalScenarios" reason | .ok _ => none }
    (by repeat' first | exact List.Mem.head _ | apply List.Mem.tail)
  cases h : result with
  | error msg => simp [h, Except.isOk, Except.toBool] at ok
  | ok proof => exact proof.down

/-- New specification for owner review. The tour includes the opening screen,
its existing Back history, and every goto or macro target. A Back action can
only pop one of these locations from its stack. -/
theorem tour_includes_destination (p : Program) (initial proposed : List ScreenId)
    (sc : Screen) (declared : sc ∈ p.screens)
    (destination : sc.id ∈ initial ∨ ∃ src ∈ closedTour p initial proposed, sc.id ∈ tourTargets p src) :
    sc ∈ closedTour p initial proposed := by
  unfold closedTour at *
  split at *
  · rename_i ok
    simp only [if_pos ok] at *
    obtain ⟨seeds, edges⟩ := Bool.and_eq_true_iff.mp ok
    refine List.mem_filter.mpr ⟨declared, ?_⟩
    rcases destination with h | ⟨src, included, move⟩
    · exact List.all_eq_true.mp seeds _ h
    · obtain ⟨mem, kept⟩ := List.mem_filter.mp included
      have closed := List.all_eq_true.mp edges src mem
      simp only [kept, Bool.not_true, Bool.false_or] at closed
      exact List.all_eq_true.mp closed _ move
  · rename_i bad
    simpa only [if_neg bad] using declared

#print axioms tour_includes_destination
#print axioms accepted_clinicalScenarios
end Ehr.Check.ReviewTrace
