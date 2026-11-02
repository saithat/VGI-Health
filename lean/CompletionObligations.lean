import Ehr.Check.Sound

/-!
The exact general T1 completion requirement, without a supplied proof.
This library is opt-in and absent from the default build.
Rejecting the missing-drug case does not prove general completion.
-/
namespace Ehr.Check.Obligations
open Ehr Ehr.Props

/-- The general T1 repair target: arbitrary checker acceptance implies
completion, with exactly the record/user/reachability domain of Completable.
Defining this proposition does not assert that it holds. -/
def AcceptedCompletion : Prop :=
  ∀ (sp : Spec) (prev : Option Program) (can p : Program),
    check sp prev can p = .ok → Completable sp can p

/-- The former dose-only counterexample is rejected after the dependency repair. -/
theorem dose_dependency_rejected :
    check DoseCompletionObstruction.spec none DoseCompletionObstruction.program
      DoseCompletionObstruction.program ≠ .ok := completion_dependency_rejected

#print axioms AcceptedCompletion
#print axioms dose_dependency_rejected
end Ehr.Check.Obligations
