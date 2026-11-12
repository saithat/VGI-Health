import Ehr.Check.DomainObstruction
import Ehr.Check.ContractSound
import Ehr.Specs.V3

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
    (required : c ∈ requiredCommitsFor sp can p facts user) (rq : DisplayReq)
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

/-- New specification for owner review.
Prefilling one field preserves `clock`. -/
theorem prefillField_clock (sp : Spec) (facts : Facts) (s : State) (c : Component) :
    (prefillField sp facts s c).clock = s.clock := by
  simp only [prefillField]
  repeat' (first | rfl | split)

/-- New specification for owner review.
Prefilling a list of fields preserves `clock`. -/
theorem foldl_prefillField_clock (sp : Spec) (facts : Facts) (l : List Component) (s : State) :
    (l.foldl (prefillField sp facts) s).clock = s.clock := by
  induction l generalizing s with
  | nil => rfl
  | cons c rest ih => exact (ih (prefillField sp facts s c)).trans (prefillField_clock sp facts s c)

/-- New specification for owner review.
`init` starts at `clock = 0`. -/
theorem init_clock (sp : Spec) (prog : Program) (facts : Facts) (user : User) :
    (init sp prog facts user).clock = 0 :=
  foldl_prefillField_clock sp facts _ _

/-- New specification for owner review.
Option D excludes the missing-payload domain obstruction: if an active
required display has no trusted payload in `facts`, `¬ CommitFeasible` holds
at every `clock` and for every commit `c`. -/
theorem missing_payload_not_commitFeasible (sp : Spec) (facts : Facts)
    (user : User) (clock : Nat) (c : CommitId) (rq : DisplayReq)
    (member : rq ∈ sp.displays?.getD []) (missing : infoPayload facts rq.info = none)
    (active : ∀ s c, displayActive facts s (some c) rq = true) :
    ¬ CommitFeasible sp facts user clock c := by
  rintro ⟨p, events, _, done⟩
  let ep : Episode := ⟨sp, p, facts, user⟩
  have hclock : ep.start.clock = 0 := init_clock sp p facts user
  have reachWait : Reachable ep { ep.start with clock := clock } := by
    have h : { ep.start with clock := clock } = { ep.start with clock := ep.start.clock + clock } := by
      simp [hclock]
    rw [h]
    exact Reachable.wait clock .start
  have initial : ep.start.commits = [] := (prefillScreen_frame _ _ _ _).1
  have notDone : c ∉ ({ ep.start with clock := clock } : State).commits := by
    change c ∉ ep.start.commits
    simp [initial]
  obtain ⟨s, e, reachable, happened⟩ :=
    newCommit_witness ep events { ep.start with clock := clock } reachWait c notDone done
  exact missing_payload_blocks_commit ep rq member missing active s reachable .human e c happened

/-- New specification for owner review.
The payload-less record `{ replayFacts with medToGive? := some "acetaminophen" }`
used in `release_payload_domain_obstruction` and `v1_payload_domain_not_satisfies`
satisfies `RecordAllowsScans`, yet no commit is feasible on it at any clock
whenever `sp.displays? = some Specs.Rules.Features.displays`. -/
theorem release_payload_record_not_commitFeasible (sp : Spec)
    (displays : sp.displays? = some Specs.Rules.Features.displays)
    (user : User) (clock : Nat) (c : CommitId) :
    ¬ CommitFeasible sp { replayFacts with medToGive? := some "acetaminophen" } user clock c := by
  apply missing_payload_not_commitFeasible sp
    { replayFacts with medToGive? := some "acetaminophen" } user clock c
    Specs.Rules.Features.display002
  · rw [displays]
    decide
  · rfl
  · intro _ _
    rfl

/-- New specification for owner review.
Under the full-profile `specForProfile .full` rule set, the payload-less
obstruction record makes every commit infeasible at every clock, so
`CompletableWhereFeasible` vacuously excludes it. -/
theorem full_v1_payload_record_not_commitFeasible (user : User) (clock : Nat) (c : CommitId) :
    ¬ CommitFeasible (Specs.V1.specForProfile .full)
      { replayFacts with medToGive? := some "acetaminophen" } user clock c :=
  release_payload_record_not_commitFeasible (Specs.V1.specForProfile .full) rfl user clock c

#print axioms missing_payload_blocks_commit
#print axioms missing_payload_not_completable
#print axioms prefillField_clock
#print axioms foldl_prefillField_clock
#print axioms init_clock
#print axioms missing_payload_not_commitFeasible
#print axioms release_payload_record_not_commitFeasible
#print axioms full_v1_payload_record_not_commitFeasible

end Ehr.Check
