import Ehr.Check.FixedLineCompletion
import Ehr.Check.DoseCompletionObstruction

/-! Comparator-only statements for completed completion fragments. The
placeholder bodies are challenge declarations, excluded from default imports. -/
namespace Ehr.Check
open Ehr Ehr.Props

/-- Completion is proved, rather than assumed, for the two-fixed-line fragment. -/
theorem satisfies_of_checked_fixed_lines (k : ValueKind) (r : Role) (m : ReviewMode)
    (a : AlertCond) (t : Tier) (nonDose : k ≠ .medicationDose) (prev : Option Program)
    (h : check (FixedLine.spec k r m a t) prev (FixedLine.program r) (FixedLine.program r) = .ok) :
    Satisfies (FixedLine.spec k r m a t) prev (FixedLine.program r) (FixedLine.program r) := by
  sorry

/-- The dose-only counterexample is rejected by the dependency check. -/
theorem completion_dependency_rejected :
    check DoseCompletionObstruction.spec none DoseCompletionObstruction.program
      DoseCompletionObstruction.program ≠ .ok := by
  sorry

theorem satisfies_of_checked_receipt_lines (k : ValueKind) (r : Role) (m : ReviewMode)
    (a : AlertCond) (t : Tier) (nonDose : k ≠ .medicationDose) (prev : Option Program)
    (h : check (FixedLine.spec k r m a t) prev
      (FixedLine.program r (some m)) (FixedLine.program r (some m)) = .ok) :
    Satisfies (FixedLine.spec k r m a t) prev
      (FixedLine.program r (some m)) (FixedLine.program r (some m)) := by
  sorry

theorem satisfies_of_checked_many_alerts (k : ValueKind) (r : Role) (m : ReviewMode)
    (a : AlertCond) (t : Tier) (moreAlerts : List AlertSpec) (receiptAware : Bool)
    (nonDose : k ≠ .medicationDose) (prev : Option Program)
    (h : check (FixedLine.spec k r m a t moreAlerts) prev
      (FixedLine.program r (if receiptAware then some m else none))
      (FixedLine.program r (if receiptAware then some m else none)) = .ok) :
    Satisfies (FixedLine.spec k r m a t moreAlerts) prev
      (FixedLine.program r (if receiptAware then some m else none))
      (FixedLine.program r (if receiptAware then some m else none)) := by
  sorry

theorem satisfies_of_checked_automated_lines (k : ValueKind) (r : Role) (m : ReviewMode)
    (a : AlertCond) (t : Tier) (moreAlerts : List AlertSpec) (receiptAware : Bool)
    (preset : Prefill) (automation : Option (List MacroStep))
    (nonDose : k ≠ .medicationDose) (prev : Option Program)
    (h : check (FixedLine.spec k r m a t moreAlerts automation.isSome) prev
      (FixedLine.program r (if receiptAware then some m else none) preset automation)
      (FixedLine.program r (if receiptAware then some m else none) preset automation) = .ok) :
    Satisfies (FixedLine.spec k r m a t moreAlerts automation.isSome) prev
      (FixedLine.program r (if receiptAware then some m else none) preset automation)
      (FixedLine.program r (if receiptAware then some m else none) preset automation) := by
  sorry

end Ehr.Check
