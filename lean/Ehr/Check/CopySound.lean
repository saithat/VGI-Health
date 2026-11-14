import Ehr.Check.RuleSound

/-! R3 (copy budget). New specification for owner review, outside Comparator. -/
namespace Ehr.Check
open Ehr Ehr.Props

/-- New specification for owner review: accepted programs meet the copy budget
for every tag (at most one copy per screen, at most `copyBudget` per program),
and copies added since the previous version are charged, together with moved
tags, to `stabilityBudget`. -/
theorem accepted_copyBudget (sp prev can p) (h : check sp prev can p = .ok) :
    CopyBudget sp p ∧ CopyStability sp prev p := by
  have hall := (check_ok_iff sp prev can p).mp h
  simp only [rules, List.mem_cons, forall_eq_or_imp, List.not_mem_nil] at hall
  rcases hall with ⟨_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _,
    hcopies, hstable, _⟩
  exact ⟨copyBudget_of_checked sp p (of_decide_eq_true hcopies), of_decide_eq_true hstable⟩

/-- New specification for owner review: per-tag form, for any tag string. -/
theorem accepted_copyBudget_tag (sp prev can p) (h : check sp prev can p = .ok) (t : String) :
    (∀ scr ∈ p.screens, screenCopies p scr t ≤ 1) ∧ programCopies p t ≤ sp.design.copyBudget :=
  (accepted_copyBudget sp prev can p h).1 t

#print axioms accepted_copyBudget
#print axioms accepted_copyBudget_tag
#print axioms copyBudget_of_checked
#print axioms copyStability_stability
end Ehr.Check
