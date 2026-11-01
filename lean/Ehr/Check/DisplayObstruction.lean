import Ehr.Check.DomainObstruction
import Ehr.Check.ContractSound
import Ehr.Specs.V2

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Proofs

/-- A missing trusted payload cannot be supplied by any UI event: facts stay
fixed throughout an episode, even when fields, receipts and screens change. -/
theorem missing_payload_blocks_commit (ep : Episode) (rq : DisplayReq)
    (member : rq ∈ ep.spec.displays?.getD [])
    (missing : infoPayload ep.facts rq.info = none)
    (active : ∀ s c, displayActive ep.facts s (some c) rq = true) :
    ∀ s, Reachable ep s → ∀ actor event c, ¬ CommitHappens ep s actor event c := by
  intro s reachable actor event c happened
  obtain ⟨_, _, _, _, _, _, display⟩ := commitContracts ep s reachable actor event c happened
  have requirement := List.all_eq_true.mp (Bool.and_eq_true_iff.mp display).1 rq member
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

end Ehr.Check
