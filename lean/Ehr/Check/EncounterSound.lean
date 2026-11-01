import Ehr.Check.GuardSound

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Proofs

/-- A commit that happens was permitted for the actual user and encounter. -/
theorem commit_encounter_allowed (ep : Episode) (s : State) (actor : Actor)
    (event : Event) (c : CommitId) (happened : CommitHappens ep s actor event c) :
    commitRoleOk ep.spec ep.facts ep.user c = true :=
  ((commitGuard_iff ..).mp
    (T0_commit_needs_guard _ _ _ _ actor s event c happened.1 happened.2)).1

/-- An active entry remains required in every encounter where this user may commit. -/
theorem entry_relevant_when_allowed (sp : Spec) (facts : Facts) (user : User)
    (s : State) (rq : EntryReq)
    (allowed : encounterRolesOk sp facts user rq.commit = true)
    (active : whenHolds facts s rq.when = true) :
    entryRelevantForRole sp user.role rq = true := by
  cases condition : rq.when <;> simp only [entryRelevantForRole, condition]
  case encounter kind =>
    have encounter : facts.encounterKind? = some kind := by
      simpa [condition, whenHolds, encounterMatches] using active
    cases lookup : sp.commit? rq.commit with
    | none => rfl
    | some cs =>
      simpa [encounterRolesOk, entryRelevantForRole, condition, lookup, encounter] using allowed

#print axioms commit_encounter_allowed
#print axioms entry_relevant_when_allowed
end Ehr.Check
