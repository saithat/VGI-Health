import Ehr.Proofs.RuntimeFrom
import Ehr.Check.Sound

/-! The accepted properties for core runs from an arbitrary start state. Each
theorem states what it needs of the start state `s₀`: nothing, a program
screen, an allowed set of writes, human-entered human-only values, or no open
popup. The proofs are the per-step lemmas behind the `Ehr.Check` soundness
theorems, which hold from every state. Every theorem here is a new
specification for owner review, outside Comparator. -/

namespace Ehr.Runtime
open Ehr Props

variable (ep : Episode) (s₀ : State)

/-- Runs from a state with program screen names keep program screen names. -/
theorem screenNames_from (h0 : Check.ScreenNames ep.prog s₀) :
    AlwaysFrom ep s₀ (Check.ScreenNames ep.prog) := by
  intro s hs
  induction hs with
  | start => exact h0
  | step actor e _ ih => exact Check.step_names _ _ _ _ _ _ _ ih
  | wait d _ ih => exact ih

/-- New specification for owner review: property 1's reachable-state clause from `s₀`. -/
theorem landmarksShown_from (h0 : Check.ScreenNames ep.prog s₀)
    (hpin : Check.landmarksPinned ep.spec ep.prog = true) : LandmarksShownFrom ep s₀ :=
  fun s hs => Check.landmarksPinned_at ep hpin s (screenNames_from ep s₀ h0 s hs).1

/-- New specification for owner review: property 2's commit clause from any `s₀`. -/
theorem commitCapturesAll_from : CommitCapturesAllFrom ep s₀ := by
  intro s _ actor e c hc rq hrq hrc
  apply (Check.entryMet_iff ep s rq).mp
  exact ((Proofs.commitGuard_iff ..).mp
    (Proofs.T0_commit_needs_guard _ _ _ _ actor s e c hc.1 hc.2)).2.1 rq hrq hrc

/-- New specification for owner review: property 2's retention clause from any `s₀`. -/
theorem enteredOnce_from : EnteredOnceFrom ep s₀ :=
  fun s _ actor e hne hmacro => Check.enteredOnce_at ep s actor e hne hmacro

/-- New specification for owner review: property 3's reachable-state clause from `s₀`. -/
theorem writesAllowed_from (h0 : Check.WritesState ep.spec ep.facts ep.user s₀)
    (hd : DeclaredWritesInSpec ep.spec ep.prog) (hu : ep.user.role = ep.prog.role) :
    WritesAllowedFrom ep s₀ := by
  intro s hs
  change Check.WritesState ep.spec ep.facts ep.user s
  induction hs with
  | start => exact h0
  | step actor e _ ih => exact Check.step_writesState _ _ _ _ _ _ _ ih hd hu
  | wait d _ ih => exact ih

/-- New specification for owner review: property 4's commit clause from any `s₀`. -/
theorem commitReviewsMet_from : CommitReviewsMetFrom ep s₀ := by
  intro s _ actor e c hc rq hrq hrc
  apply (Check.reviewMet_iff ep s rq).mp
  exact ((Proofs.commitGuard_iff ..).mp
    (Proofs.T0_commit_needs_guard _ _ _ _ actor s e c hc.1 hc.2)).2.2.1 rq hrq hrc

/-- New specification for owner review: property 4's commit-screen clause from `s₀`. -/
theorem commitScreenShowsReviews_from (h0 : Check.ScreenNames ep.prog s₀)
    (hpin : Check.reviewsPinned ep.spec ep.prog = true) : CommitScreenShowsReviewsFrom ep s₀ :=
  fun s hs => Check.reviewsPinned_at ep hpin s (screenNames_from ep s₀ h0 s hs).1

/-- Runs from a state whose human-only values are confirmed human entries keep that. -/
theorem humanCaptured_from (h0 : Check.HumanCaptured ep.spec s₀) :
    AlwaysFrom ep s₀ (Check.HumanCaptured ep.spec) := by
  intro s hs
  induction hs with
  | start => exact h0
  | step actor e _ ih => exact Check.step_humanCaptured _ _ _ _ _ _ _ ih
  | wait d _ ih => exact ih

/-- New specification for owner review: property 5's per-step human-entry
clause from a start whose human-only values are confirmed human entries. -/
theorem humanEntries_from (h0 : Check.HumanCaptured ep.spec s₀) : HumanEntriesFrom ep s₀ := by
  intro s hs actor e x hx hnew el hel hh
  by_cases hn : actor = .human ∧ ∃ cid v, e = .enter cid v
  · exact hn
  · exact False.elim (hnew (Check.step_noNewHuman _ _ _ _ _ _ _
      (humanCaptured_from ep s₀ h0 s hs) hn x hx el hel hh))

/-- New specification for owner review: property 5's human-entry clause from `s₀`. -/
theorem humanStepsByHuman_from
    (hnone : ∀ x ∈ s₀.captured, ∀ el, ep.spec.element? x.element = some el → ¬ HumanMustEnter el)
    (h0 : Check.HumanCaptured ep.spec s₀) : HumanStepsByHumanFrom ep s₀ :=
  ⟨hnone, humanEntries_from ep s₀ h0⟩

/-- New specification for owner review: property 5's commit/acknowledgment clause from any `s₀`. -/
theorem onlyHumanCommitsAndAcks_from : OnlyHumanCommitsAndAcksFrom ep s₀ :=
  fun s _ actor e => Check.onlyHumanCommitsAndAcks_at ep s actor e

/-- New specification for owner review: property 5's cosign clause from any `s₀`. -/
theorem cosignIsSecondUser_from : CosignIsSecondUserFrom ep s₀ := by
  intro s _ actor e c hc rq hrq hrc el hel hk hw hp
  exact Proofs.T3_cosign_distinct _ _ _ _ actor s e c hc.1 hc.2 rq hrq hrc
    (by simpa using hp) hw el hel hk

/-- New specification for owner review: property 7's commit clause from any `s₀`. -/
theorem commitUnitsRight_from : CommitUnitsRightFrom ep s₀ := by
  intro s _ actor e c hc rq hrq hrc el u hel hk hw hp
  have hper : rq.perOrderLine = false := by simpa using hp
  obtain ⟨x, hx, hxe, hconf, _, hv⟩ :=
    Proofs.T0_entry_values _ _ _ _ actor s e c hc.1 hc.2 rq hrq hrc hper hw el hel
  exact ⟨x, hx, hxe, hconf, hv u hk⟩

/-- New specification for owner review: property 9's commit clause from any `s₀`. -/
theorem interruptiveHandled_from : InterruptiveHandledFrom ep s₀ := by
  intro s _ actor e c hc al hal hac hat k hk
  exact ((Proofs.commitGuard_iff ..).mp
    (Proofs.T0_commit_needs_guard _ _ _ _ actor s e c hc.1 hc.2)).2.2.2.1 al hal hac hat k hk

/-- New specification for owner review: property 9's passive-inline clause from any `s₀`. -/
theorem passiveShownInline_from (hpin : Check.passivePinned ep.spec ep.prog = true) :
    PassiveShownInlineFrom ep s₀ :=
  fun s _ => Check.passivePinned_at ep hpin s

/-- New specification for owner review: property 10 from a start without a popup. -/
theorem alertsOnlyWhenTrue_from (h0 : s₀.popup? = none) : AlertsOnlyWhenTrueFrom ep s₀ := by
  intro s hs
  refine ⟨?_, fun a ha => Check.inlineAlert_holds ep s a ha⟩
  induction hs with
  | start => intro a k hp; rw [h0] at hp; contradiction
  | @step s actor e _ ih => exact Check.popupKeys_step ep s actor e ih
  | @wait s d _ ih =>
    intro a k hp
    obtain ⟨al, hal, hid, hk⟩ := ih a k hp
    exact ⟨al, hal, hid,
      (Check.alertKeys_of_captured ep.facts s { s with clock := s.clock + d } al.cond rfl).symm ▸ hk⟩

/-- New specification for owner review: property 11 from a start without a popup. -/
theorem interruptsOnce_from (h0 : s₀.popup? = none) : InterruptsOnceFrom ep s₀ := by
  refine ⟨fun s _ actor e => Check.interruptsOnce_at ep s actor e, ?_⟩
  intro s hs
  induction hs with
  | start => intro p hp; rw [h0] at hp; contradiction
  | @step s actor e _ ih => exact Check.popupUnacked_step ep s actor e ih
  | @wait s d _ ih => exact ih

#print axioms screenNames_from
#print axioms landmarksShown_from
#print axioms commitCapturesAll_from
#print axioms enteredOnce_from
#print axioms writesAllowed_from
#print axioms commitReviewsMet_from
#print axioms commitScreenShowsReviews_from
#print axioms humanCaptured_from
#print axioms humanEntries_from
#print axioms humanStepsByHuman_from
#print axioms onlyHumanCommitsAndAcks_from
#print axioms cosignIsSecondUser_from
#print axioms commitUnitsRight_from
#print axioms interruptiveHandled_from
#print axioms passiveShownInline_from
#print axioms alertsOnlyWhenTrue_from
#print axioms interruptsOnce_from
end Ehr.Runtime
