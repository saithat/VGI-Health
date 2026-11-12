import Ehr.Check.DisplayObstruction

namespace Ehr.Check
open Ehr Ehr.Props

set_option maxRecDepth 16384 in
/-- The release requires decision-support sources when phase is unknown. The
current completion domain permits such a record with no trusted payload at all.
Thus any nonempty required task family is impossible in that domain, even if
every field and review is perfectly placed. This applies to all persona roles. -/
theorem release_payload_domain_obstruction (sp : Spec) (can p : Program)
    (displays : sp.displays? = Specs.V1.specV1.displays?)
    (tasks : ∃ c, c ∈ requiredCommits sp can p) :
    ¬ Completable sp can p := by
  obtain ⟨c, required⟩ := tasks
  let facts : Facts := { replayFacts with medToGive? := some "acetaminophen" }
  let user : User := { id := "payload-domain-witness", role := p.role }
  have permitted : commitRoleOk sp facts user c = true := by
    have role := (List.mem_filter.mp required).2
    cases lookup : sp.commit? c with
    | none => simp [lookup] at role
    | some cs =>
      have ordinary : cs.roles.contains p.role = true := by simpa [lookup] using role
      simpa [commitRoleOk, roleOk, encounterRolesOk, lookup,
        CommitSpec.encounterRoleAllowed, encounterMatches, facts, user, replayFacts] using ordinary
  have episodeRequired : c ∈ requiredCommitsFor sp can p facts user :=
    List.mem_filter.mpr ⟨required, permitted⟩
  apply missing_payload_not_completable sp can p facts user rfl (fun _ => rfl) c episodeRequired
    Specs.Rules.Features.display002
  · rw [displays]
    decide +kernel
  · rfl
  · intro s c
    rfl

set_option maxRecDepth 16384 in
/-- No UI redesign can certify a nonempty task family against v1 in the
current evidence domain; trusted payloads are not fabricated by UI inputs. -/
theorem v1_payload_domain_not_satisfies (can p : Program)
    (tasks : ∃ c, c ∈ requiredCommits Specs.V1.specV1 can p) :
    ¬ Satisfies Specs.V1.specV1 none can p :=
  fun h => release_payload_domain_obstruction Specs.V1.specV1 can p rfl tasks h.2.2.2.2.2.1

set_option maxRecDepth 16384 in
/-- The same inherited display contract blocks v2 in the same record domain. -/
theorem v2_payload_domain_not_satisfies (can p : Program)
    (tasks : ∃ c, c ∈ requiredCommits Specs.V2.specV2 can p) :
    ¬ Satisfies Specs.V2.specV2 none can p :=
  fun h => release_payload_domain_obstruction Specs.V2.specV2 can p rfl tasks h.2.2.2.2.2.1

set_option maxRecDepth 16384 in
/-- The v3 entry extension retains this obstruction, for every persona role. -/
theorem v3_payload_domain_not_satisfies (can p : Program)
    (tasks : ∃ c, c ∈ requiredCommits Specs.V3.specV3 can p) :
    ¬ Satisfies Specs.V3.specV3 none can p :=
  fun h => release_payload_domain_obstruction Specs.V3.specV3 can p rfl tasks h.2.2.2.2.2.1

set_option maxRecDepth 16384 in
/-- New specification for owner review.
Option D (`CommitFeasible`) excludes the payload-less obstruction record at
every clock and for every commit whenever `sp` inherits the v1 display rules. -/
theorem release_payload_domain_not_commitFeasible (sp : Spec)
    (displays : sp.displays? = Specs.V1.specV1.displays?)
    (user : User) (clock : Nat) (c : CommitId) :
    ¬ CommitFeasible sp { replayFacts with medToGive? := some "acetaminophen" } user clock c := by
  apply missing_payload_not_commitFeasible sp
    { replayFacts with medToGive? := some "acetaminophen" } user clock c
    Specs.Rules.Features.display002
  · rw [displays]
    decide +kernel
  · rfl
  · intro _ _
    rfl

set_option maxRecDepth 16384 in
/-- New specification for owner review.
Under `specV1`, the payload-less record is excluded by `¬ CommitFeasible`. -/
theorem v1_payload_domain_not_commitFeasible (user : User) (clock : Nat) (c : CommitId) :
    ¬ CommitFeasible Specs.V1.specV1
      { replayFacts with medToGive? := some "acetaminophen" } user clock c :=
  release_payload_domain_not_commitFeasible Specs.V1.specV1 rfl user clock c

set_option maxRecDepth 16384 in
/-- New specification for owner review.
Under `specV2`, the payload-less record is excluded by `¬ CommitFeasible`. -/
theorem v2_payload_domain_not_commitFeasible (user : User) (clock : Nat) (c : CommitId) :
    ¬ CommitFeasible Specs.V2.specV2
      { replayFacts with medToGive? := some "acetaminophen" } user clock c :=
  release_payload_domain_not_commitFeasible Specs.V2.specV2 rfl user clock c

set_option maxRecDepth 16384 in
/-- New specification for owner review.
Under `specV3`, the payload-less record is excluded by `¬ CommitFeasible`. -/
theorem v3_payload_domain_not_commitFeasible (user : User) (clock : Nat) (c : CommitId) :
    ¬ CommitFeasible Specs.V3.specV3
      { replayFacts with medToGive? := some "acetaminophen" } user clock c :=
  release_payload_domain_not_commitFeasible Specs.V3.specV3 rfl user clock c

#print axioms release_payload_domain_obstruction
#print axioms v1_payload_domain_not_satisfies
#print axioms v2_payload_domain_not_satisfies
#print axioms v3_payload_domain_not_satisfies
#print axioms release_payload_domain_not_commitFeasible
#print axioms v1_payload_domain_not_commitFeasible
#print axioms v2_payload_domain_not_commitFeasible
#print axioms v3_payload_domain_not_commitFeasible
end Ehr.Check
