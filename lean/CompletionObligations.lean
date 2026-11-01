import Ehr.Check.Sound

/-!
# General T1 obligation, opt-in only

This library records the exact general target. The current checker refutes it;
a checker repair is required before a positive proof can exist.
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

/-- The unchanged target is false for the current checker, as witnessed in
Sound. A future checker repair must make this counterexample impossible. -/
theorem refuted : ¬ AcceptedCompletion := by
  intro h
  obtain ⟨sp, p, accepted, impossible⟩ := completion_acceptance_counterexample
  exact impossible (h sp none p p accepted)

#print axioms AcceptedCompletion
#print axioms refuted
end Ehr.Check.Obligations
