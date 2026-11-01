import Ehr.Check.Deploy
import Ehr.Props.Examples

/-!
T4: only accepted programs appear in planned current-version writes.
Their planned certificate describes the checked spec, program and verdict.
These claims cover the plan, not atomic file writes.
-/

namespace Ehr.Proofs

open Ehr Ehr.Check

/-- **T4.** A planned write publishes (`current.json` or `current.cert.json`)
only if `check` returned `ok` for this spec, previous version, canonical
program, and candidate. -/
theorem T4_publish_only_if_ok (spec : Spec) (prev : Option Program) (canonical prog : Program)
    (time : String) :
    ∀ w ∈ (deployPlan spec prev canonical prog time).2, w.target.publishes = true →
      check spec prev canonical prog = .ok := by
  intro w hw hpub
  unfold deployPlan at hw
  simp only at hw
  split at hw
  · rename_i h
    exact beq_iff_eq.mp h
  · simp only [List.mem_cons, List.mem_nil_iff, or_false] at hw
    rcases hw with rfl | rfl <;> simp [Target.publishes] at hpub

/-- **T4 (contrapositive form).** A program the checker rejects is never
published. -/
theorem T4_rejected_not_published (spec : Spec) (prev : Option Program) (canonical prog : Program)
    (time : String) (h : check spec prev canonical prog ≠ .ok) :
    ∀ w ∈ (deployPlan spec prev canonical prog time).2, w.target.publishes = false := by
  intro w hw
  cases hp : w.target.publishes
  · rfl
  · exact absurd (T4_publish_only_if_ok spec prev canonical prog time w hw hp) h

/-- **T4 (certificate).** The published certificate is this spec's and this
program's certificate, with verdict `ok`. -/
theorem T4_published_certificate (spec : Spec) (prev : Option Program) (canonical prog : Program)
    (time : String) :
    ∀ w ∈ (deployPlan spec prev canonical prog time).2, w.target = .currentCert →
      w.content = (Lean.toJson (certificate spec prog .ok time)).pretty := by
  intro w hw ht
  have hok := T4_publish_only_if_ok spec prev canonical prog time w hw (by simp [ht, Target.publishes])
  unfold deployPlan at hw
  simp only [hok] at hw
  simp only [BEq.rfl, ite_true, List.mem_append, List.mem_cons, List.mem_nil_iff, or_false] at hw
  rcases hw with (rfl | rfl) | (rfl | rfl) <;> simp_all

/-! ## The hypotheses can be met: a concrete deploy that publishes -/

open Ehr.Examples.Tiny Ehr.Props.Examples in
/-- The corrected tiny program passes the checker, so deploy publishes it. -/
theorem tiny_accepted_deploy_publishes : (deployPlan spec none goodProgram goodProgram "t").2.any (·.target == .current) = true := by
  decide

open Ehr.Examples.Tiny Ehr.Props.Examples in
/-- The original tiny program fails the checker, so deploy does not publish it. -/
theorem tiny_rejected_deploy_does_not_publish : (deployPlan spec none goodProgram program "t").2.any (·.target.publishes) = false := by
  decide

/-! ## Axiom audit (expected: at most `propext`, `Classical.choice`, `Quot.sound`) -/

#print axioms T4_publish_only_if_ok
#print axioms T4_rejected_not_published
#print axioms T4_published_certificate

end Ehr.Proofs
