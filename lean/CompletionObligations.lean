import Ehr.Check.Sound

/-!
# General T1 obligation, opt-in only

This library records the exact remaining proposition and supplies no proof.
It is absent from defaultTargets. The proof-hole version of the proposed lemma
is recorded only in TODO_PROOFS.md, so no unfinished theorem enters any build.
-/
namespace Ehr.Check.Obligations
open Ehr Ehr.Props

/-- The remaining general T1 target: arbitrary checker acceptance implies
completion, with exactly the record/user/reachability domain of Completable.
Defining this proposition does not assert that it holds. -/
def AcceptedCompletion : Prop :=
  ∀ (sp : Spec) (prev : Option Program) (can p : Program),
    check sp prev can p = .ok → Completable sp can p

#print axioms AcceptedCompletion
end Ehr.Check.Obligations
