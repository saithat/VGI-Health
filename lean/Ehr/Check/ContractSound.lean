import Ehr.Props.Contracts
import Ehr.Check.GuardSound
import Ehr.Check.Check

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Proofs

/-- The real interpreter enforces all five new contract families, for every
program, patient record, human/macro event and reachable state. -/
theorem commitContracts (ep : Episode) : CommitContracts ep := by
  intro s _ actor event c happened
  have guard := T0_extra_contract ep.spec ep.prog ep.facts ep.user actor s event c
    happened.1 happened.2
  unfold extraGuard at guard
  cases hc : ep.spec.commit? c with
  | none => simp [hc] at guard
  | some cs =>
    simp only [hc, Bool.and_eq_true, List.all_eq_true, beq_iff_eq] at guard
    exact ⟨cs, rfl, guard.1.1.1.1.2, guard.1.1.1.2, guard.1.1.2, guard.1.2, guard.2⟩

/-- Certification retains the interpreter's complete contract guarantee. -/
theorem accepted_contracts (sp : Spec) (prev : Option Program) (can p : Program)
    (_h : check sp prev can p = .ok) :
    ∀ facts user, user.role = p.role → CommitContracts ⟨sp, p, facts, user⟩ := by
  intro facts user _
  exact commitContracts _

#print axioms commitContracts
#print axioms accepted_contracts
end Ehr.Check
