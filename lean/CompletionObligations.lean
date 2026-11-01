import Ehr.Check.Sound

/-!
# General T1 obligation, opt-in only

This library records the exact general target. The missing drug dependency
is now rejected; a general completion construction remains to be proved.
It is absent from defaultTargets. The proof-hole version of the proposed lemma
is recorded only in TODO_PROOFS.md, so no unfinished theorem enters any build.
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
