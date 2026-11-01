import Ehr.Check.RuleSound

namespace Ehr.Check
open Ehr Ehr.Props

/-- Every accepted program satisfies D5 on the navigation actually rendered. -/
theorem accepted_navigation (sp : Spec) (prev : Option Program) (can p : Program)
    (h : check sp prev can p = .ok) : NavigationSane p := by
  have hall := (check_ok_iff sp prev can p).mp h
  simp only [rules, List.mem_cons, forall_eq_or_imp, List.not_mem_nil] at hall
  rcases hall with ⟨_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, tail⟩
  exact of_decide_eq_true tail.2.1

#print axioms accepted_navigation
end Ehr.Check
