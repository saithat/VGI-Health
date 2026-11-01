import Ehr.Check.ReplayTypes
import Ehr.Props.OldObligations
import Ehr.Props.Contracts
import Ehr.Props.Navigation
import Ehr.Specs.V2

/-! Comparator challenge statements for the completed semantic checker clauses.
The `sorry` bodies are intentional challenge placeholders, exactly as in the
repository's Statements.lean. This file is not imported by the implementation.
General T1 and completeness are not claimed here. -/
namespace Ehr.Check
open Ehr Ehr.Props

theorem accepted_wellFormed (sp : Spec) (prev : Option Program) (can p : Program)
    (h : check sp prev can p = .ok) : WellFormed sp can p := by
  sorry

theorem accepted_capturesAllOnce (sp : Spec) (prev : Option Program) (can p : Program)
    (h : check sp prev can p = .ok) : CapturesAllOnce sp p := by
  sorry

theorem accepted_writesOnly (sp : Spec) (prev : Option Program) (can p : Program)
    (h : check sp prev can p = .ok) : WritesOnly sp p := by
  sorry

theorem accepted_reviewsBeforeCommit (sp : Spec) (prev : Option Program) (can p : Program)
    (h : check sp prev can p = .ok) : ReviewsBeforeCommit sp p := by
  sorry

theorem accepted_humanOnlyKept (sp : Spec) (prev : Option Program) (can p : Program)
    (h : check sp prev can p = .ok) : HumanOnlyKept sp p := by
  sorry

theorem accepted_units (sp : Spec) (prev : Option Program) (can p : Program)
    (h : check sp prev can p = .ok) : UnitsRight sp p := by
  sorry

theorem accepted_budgets (sp : Spec) (prev : Option Program) (can p : Program)
    (h : check sp prev can p = .ok) : WithinBudgets sp prev can p := by
  sorry

theorem accepted_alertsFire (sp : Spec) (prev : Option Program) (can p : Program)
    (h : check sp prev can p = .ok) : AlertsFire sp p := by
  sorry

theorem accepted_noFalseAlarms (sp : Spec) (prev : Option Program) (can p : Program)
    (h : check sp prev can p = .ok) : NoFalseAlarms sp p := by
  sorry

theorem accepted_noRepeatInterruptions (sp : Spec) (prev : Option Program) (can p : Program)
    (h : check sp prev can p = .ok) : NoRepeatInterruptions sp p := by
  sorry

theorem accepted_severityTiers (sp : Spec) (prev : Option Program) (can p : Program)
    (h : check sp prev can p = .ok) : SeverityTiers sp p := by
  sorry

theorem satisfies_of_checked_completable (sp : Spec) (prev : Option Program) (can p : Program)
    (h : check sp prev can p = .ok) (hc : Completable sp can p) : Satisfies sp prev can p := by
  sorry

theorem T7_counterexample_replays (sp : Spec) (p : Program) (finding : Finding) :
    ValidCounterexample sp p (counterexample sp p finding).1 := by
  sorry

theorem T7_rejection (sp : Spec) (prev : Option Program) (can p : Program)
    (property message : String) (es : List Event) (screens : List ScreenId)
    (h : check sp prev can p = .violation property message es screens) :
    (∃ r ∈ rules sp prev can p, r.passes = false) ∧ ValidCounterexample sp p es := by
  sorry


theorem T8_old_obligations {new old : Spec} {prev : Option Program}
    {canonical p : Program} (he : new.Extends old)
    (hs : Satisfies new prev canonical p) :
    ∀ facts user, user.role = p.role → OldObligations old ⟨new, p, facts, user⟩ := by
  sorry

theorem accepted_contracts (sp : Spec) (prev : Option Program) (can p : Program)
    (h : check sp prev can p = .ok) :
    ∀ facts user, user.role = p.role → CommitContracts ⟨sp, p, facts, user⟩ := by
  sorry

theorem T8_checked_old_obligations {new old : Spec} {prev : Option Program}
    {canonical p : Program} (he : new.Extends old)
    (h : check new prev canonical p = .ok) :
    ∀ facts user, user.role = p.role → OldObligations old ⟨new, p, facts, user⟩ := by
  sorry

theorem T8_v1_to_v1_1 {prev : Option Program} {canonical p : Program}
    (hs : check Specs.V1_1.specV1_1 prev canonical p = .ok) :
    ∀ facts user, user.role = p.role →
      OldObligations Specs.V1.specV1 ⟨Specs.V1_1.specV1_1, p, facts, user⟩ := by
  sorry

theorem T8_v1_1_to_v2 {prev : Option Program} {canonical p : Program}
    (hs : check Specs.V2.specV2 prev canonical p = .ok) :
    ∀ facts user, user.role = p.role →
      OldObligations Specs.V1_1.specV1_1 ⟨Specs.V2.specV2, p, facts, user⟩ := by
  sorry

theorem accepted_navigation (sp : Spec) (prev : Option Program) (can p : Program)
    (h : check sp prev can p = .ok) : NavigationSane p := by
  sorry

end Ehr.Check
