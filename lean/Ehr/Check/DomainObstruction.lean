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

private theorem signingPolicy :
    (specV1.commit? "signOrders").map (·.encounterRoles?) = some (some [preopSigningRoles]) := by
  decide

/-- Hospital policy (not law), owner decision 2026-10-31.
No event adds an NP pre-op signature without a human attending response. -/
theorem np_preop_without_cosign_never_signs (p : Program) (facts : Facts) (user : User)
    (encounter : facts.encounterKind? = some "preop") (role : user.role = .np)
    (s : State)
    (noCosign : humanWaiverMet specV1 facts user s (some "attendingCosign") = false) (actor : Actor) (event : Event) :
    ¬ CommitHappens ⟨specV1, p, facts, user⟩ s actor event "signOrders" := by
  intro happened
  have permission := ((commitGuard_iff specV1 p facts user s "signOrders").mp
    (T0_commit_needs_guard _ _ _ _ actor s event "signOrders" happened.1 happened.2)).1
  have forbidden : encounterRolesOk specV1 facts user s "signOrders" = false := by
    cases lookup : specV1.commit? "signOrders" with
    | none => simp [encounterRolesOk, lookup]
    | some cs =>
      have policy := signingPolicy
      simp only [lookup, Option.map_some, Option.some.injEq] at policy
      simp [encounterRolesOk, lookup, policy,
        preopSigningRoles, encounterMatches, encounter, role, noCosign]
  simp [commitRoleOk, forbidden] at permission

#print axioms newCommit_witness
#print axioms np_preop_without_cosign_never_signs
end Ehr.Check
