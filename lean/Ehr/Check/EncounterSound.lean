import Ehr.Check.GuardSound

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Proofs

/-- A commit that happens was permitted for the actual user and encounter. -/
theorem commit_encounter_allowed (ep : Episode) (s : State) (actor : Actor)
    (event : Event) (c : CommitId) (happened : CommitHappens ep s actor event c) :
    commitRoleOk ep.spec ep.facts ep.user s c = true :=
  ((commitGuard_iff ..).mp
    (T0_commit_needs_guard _ _ _ _ actor s event c happened.1 happened.2)).1

/-- The literal entry or its human attestation is met whenever a commit happens. -/
theorem entry_direct_or_attested (ep : Episode) (s : State) (actor : Actor)
    (event : Event) (c : CommitId) (happened : CommitHappens ep s actor event c)
    (rq : EntryReq) (member : rq ∈ ep.spec.entries) (same : rq.commit = c) :
    entryWaiver ep.spec ep.facts ep.user s rq = true ∨
      entryDirectMet ep.spec ep.facts ep.user s rq = true := by
  have h := ((commitGuard_iff ..).mp
    (T0_commit_needs_guard _ _ _ _ actor s event c happened.1 happened.2)).2.1 rq member same
  exact Bool.or_eq_true_iff.mp h

#print axioms commit_encounter_allowed
#print axioms entry_direct_or_attested
end Ehr.Check
