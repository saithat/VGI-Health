import Ehr.Check.ReplayContext
import Ehr.Check.GuardSound
import Ehr.Specs.V1

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Proofs Ehr.Specs.V1

/-- If a human event list adds a commit, some event genuinely adds it from a
reachable intermediate state. This includes lists with ignored/blocked events. -/
theorem newCommit_witness (ep : Episode) (es : List Event) (s : State)
    (hs : Reachable ep s) (c : CommitId) (hn : c ∉ s.commits)
    (hc : c ∈ (ep.afterHuman s es).commits) :
    ∃ t e, Reachable ep t ∧ CommitHappens ep t .human e c := by
  induction es generalizing s with
  | nil => exact False.elim (hn hc)
  | cons e es ih =>
    by_cases ht : c ∈ (ep.next .human s e).commits
    · exact ⟨s, e, hs, hn, ht⟩
    · exact ih _ (.step .human e hs) ht hc

def preopFacts : Facts :=
  { replayFacts with encounterKind? := some "preop", medToGive? := some "acetaminophen" }
def npUser : User := { id := "np-domain-witness", role := .np }

/-- The current completeness domain includes NP/preop episodes, but the
preserved consent permission excludes NP. Consequently *no* NP program
required to sign orders can satisfy the full current property set. This is
an explicit domain obstruction, not an excuse to broaden consent permissions. -/
theorem np_preop_obstruction (can p : Program) (hp : p.role = .np)
    (hrequired : "signOrders" ∈ requiredCommits specV1 can p) :
    ¬ Satisfies specV1 none can p := by
  intro h
  let ep : Episode := ⟨specV1, p, preopFacts, npUser⟩
  have hrole : npUser.role = p.role := hp.symm
  have hscans : RecordAllowsScans specV1 preopFacts := fun _ => rfl
  have hinit : ep.start.commits = [] := (prefillScreen_frame _ _ _ _).1
  obtain ⟨es, hes⟩ := h.2.2.2.2.2.1 preopFacts npUser hrole hscans ep.start
    .start "signOrders" hrequired (by simp [hinit])
  obtain ⟨s, e, hs, hn, hc⟩ := newCommit_witness ep es ep.start .start "signOrders"
    (by simp [hinit]) hes
  have hentry := T0_entry_values specV1 p preopFacts npUser .human s e "signOrders" hn hc
    (requires signOrders consentVerified (.encounter "preop")) (by decide) rfl rfl rfl
    consentVerified (by decide)
  obtain ⟨x, hx, hxe, _, _, _⟩ := hentry
  have hw := (h.2.2.1.2 preopFacts npUser hrole s hs).1 x hx
  obtain ⟨el, hel, hallowed⟩ := hw
  rw [hxe] at hel
  have hconsent : specV1.element? consentVerified.id = some consentVerified := by decide
  rw [hconsent] at hel
  cases hel
  exact (by decide : Role.np ∉ consentVerified.enteredBy) hallowed

#print axioms newCommit_witness
#print axioms np_preop_obstruction
end Ehr.Check
