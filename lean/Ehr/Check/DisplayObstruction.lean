import Ehr.Check.DomainObstruction
import Ehr.Check.ContractSound
import Ehr.Specs.V2

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props

/-- A missing trusted payload cannot be supplied by any UI event: facts stay
fixed throughout an episode, even when fields, receipts and screens change. -/
theorem missing_payload_blocks_commit (ep : Episode) (rq : DisplayReq)
    (member : rq ∈ ep.spec.displays?.getD [])
    (missing : infoPayload ep.facts rq.info = none)
    (active : ∀ s c, displayActive ep.facts s (some c) rq = true) :
    ∀ s, Reachable ep s → ∀ actor event c, ¬ CommitHappens ep s actor event c := by
  intro s reachable actor event c happened
  obtain ⟨_, _, _, _, _, _, display⟩ := commitContracts ep s reachable actor event c happened
  have requirement := List.all_eq_true.mp (Bool.and_eq_true.mp display).1 rq member
  have absent : displayReqMet ep.spec ep.prog ep.facts s rq = false := by
    unfold displayReqMet
    rw [missing]
    cases ep.spec.info? rq.info <;> simp
  simp [active s c, absent] at requirement

/-- Universal completion is impossible if an active required display has no
trusted payload, regardless of how many editable fields the program supplies. -/
theorem missing_payload_not_completable (sp : Spec) (can p : Program)
    (facts : Facts) (user : User) (role : user.role = p.role)
    (scans : RecordAllowsScans sp facts) (c : CommitId)
    (required : c ∈ requiredCommits sp can p) (rq : DisplayReq)
    (member : rq ∈ sp.displays?.getD []) (missing : infoPayload facts rq.info = none)
    (active : ∀ s c, displayActive facts s (some c) rq = true) :
    ¬ Completable sp can p := by
  intro completes
  let ep : Episode := ⟨sp, p, facts, user⟩
  have initial : ep.start.commits = [] := (prefillScreen_frame _ _ _ _).1
  have notDone : c ∉ ep.start.commits := by simp [initial]
  obtain ⟨events, done⟩ := completes facts user role scans ep.start .start c required notDone
  obtain ⟨s, e, reachable, happened⟩ := newCommit_witness ep events ep.start .start c notDone done
  exact missing_payload_blocks_commit ep rq member missing active s reachable .human e c happened

#print axioms missing_payload_blocks_commit
#print axioms missing_payload_not_completable

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
  apply missing_payload_not_completable sp can p facts user rfl (fun _ => rfl) c required
    Specs.Rules.Features.display002
  · rw [displays]
    decide +kernel
  · rfl
  · intro s c
    rfl

/-- No UI redesign can certify a nonempty task family against v1 in the
current evidence domain; trusted payloads are not fabricated by UI inputs. -/
theorem v1_payload_domain_not_satisfies (can p : Program)
    (tasks : ∃ c, c ∈ requiredCommits Specs.V1.specV1 can p) :
    ¬ Satisfies Specs.V1.specV1 none can p :=
  fun h => release_payload_domain_obstruction _ can p rfl tasks h.2.2.2.2.2.1

/-- The same inherited display contract blocks v1.1 in the same record domain. -/
theorem v1_1_payload_domain_not_satisfies (can p : Program)
    (tasks : ∃ c, c ∈ requiredCommits Specs.V1_1.specV1_1 can p) :
    ¬ Satisfies Specs.V1_1.specV1_1 none can p :=
  fun h => release_payload_domain_obstruction _ can p rfl tasks h.2.2.2.2.2.1

/-- The v2 entry extension retains this obstruction, for every persona role. -/
theorem v2_payload_domain_not_satisfies (can p : Program)
    (tasks : ∃ c, c ∈ requiredCommits Specs.V2.specV2 can p) :
    ¬ Satisfies Specs.V2.specV2 none can p :=
  fun h => release_payload_domain_obstruction _ can p rfl tasks h.2.2.2.2.2.1

#print axioms release_payload_domain_obstruction
#print axioms v1_payload_domain_not_satisfies
#print axioms v1_1_payload_domain_not_satisfies
#print axioms v2_payload_domain_not_satisfies
end Ehr.Check
