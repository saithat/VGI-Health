import Ehr.Proofs.RuntimeModel

/-! Per-call guarantees for the deployed API, including workspace hydration.
Every definition and theorem here is a new specification for owner review,
outside Comparator. Commit evidence is evaluated at `inputState`, exactly the
state seen by `Ehr.step`, rather than necessarily at the API's incoming state. -/

namespace Ehr.Runtime
open Ehr Props Proofs

/-- New specification for owner review: a commit new to the API input comes
from the inner interpreter on the effective input state. -/
theorem commit_core (i : StepInput) (c : CommitId)
    (hnew : c ∉ i.state.commits) (hafter : c ∈ (runStep i).state.commits) :
    c ∉ (inputState i).commits ∧
    c ∈ (step i.spec i.program i.facts i.user .human (inputState i) i.event).1.commits := by
  have hn : c ∉ (inputState i).commits := fun hc => hnew (input_commits i c hc)
  exact ⟨hn, new_commit_core i c hn hafter ▸ hafter⟩

/-- New specification for owner review: runtime T0, at the state the inner
interpreter saw (Workspace.bind for selection-enabled programs). -/
theorem T0_commit_needs_guard (i : StepInput) (c : CommitId)
    (hnew : c ∉ i.state.commits) (hafter : c ∈ (runStep i).state.commits) :
    commitGuard i.spec i.program i.facts i.user (inputState i) c = true := by
  obtain ⟨hn, ha⟩ := commit_core i c hnew hafter
  exact Proofs.T0_commit_needs_guard _ _ _ _ .human _ _ c hn ha

/-- New specification for owner review: runtime T0 entry values, including
allowed values, confirmation, human provenance and units on the same capture. -/
theorem T0_entry_values (i : StepInput) (c : CommitId)
    (hnew : c ∉ i.state.commits) (hafter : c ∈ (runStep i).state.commits)
    (rq : EntryReq) (hrq : rq ∈ i.spec.entries) (hc : rq.commit = c)
    (hper : rq.perOrderLine = false) (hwhen : whenHolds i.facts (inputState i) rq.when = true)
    (el : ElementSpec) (hel : i.spec.element? rq.element = some el) :
    ∃ x ∈ (inputState i).captured, x.element = el.id ∧ EntryCaptureValid el rq x := by
  obtain ⟨hn, ha⟩ := commit_core i c hnew hafter
  exact Proofs.T0_entry_values_allowed _ _ _ _ .human _ _ c hn ha rq hrq hc hper hwhen el hel

/-- New specification for owner review: runtime T3, a committed whole-episode
cosign names a human other than the signed-in user. -/
theorem T3_cosign_distinct (i : StepInput) (c : CommitId)
    (hnew : c ∉ i.state.commits) (hafter : c ∈ (runStep i).state.commits)
    (rq : EntryReq) (hrq : rq ∈ i.spec.entries) (hc : rq.commit = c)
    (hper : rq.perOrderLine = false) (hwhen : whenHolds i.facts (inputState i) rq.when = true)
    (el : ElementSpec) (hel : i.spec.element? rq.element = some el) (hk : el.kind = .cosign) :
    ∃ x ∈ (inputState i).captured, x.element = el.id ∧ x.byHuman = true ∧
      ∃ u, x.value = .user u ∧ u ≠ i.user.id := by
  obtain ⟨hn, ha⟩ := commit_core i c hnew hafter
  exact Proofs.T3_cosign_distinct _ _ _ _ .human _ _ c hn ha rq hrq hc hper hwhen el hel hk

/-- New specification for owner review: runtime T2, a hidden applicable
review at a new commit has a valid receipt or a human waiver. -/
theorem T2_receipts_sound (i : StepInput) (c : CommitId)
    (hnew : c ∉ i.state.commits) (hafter : c ∈ (runStep i).state.commits)
    (rq : ReviewReq) (hrq : rq ∈ i.spec.reviews) (hc : rq.commit = c)
    (hwhen : whenHolds i.facts (inputState i) rq.when = true)
    (hhidden : infoShown i.spec i.program i.facts (inputState i) rq.info = false) :
    ValidReceiptFor i.spec i.facts (inputState i) rq ∨ HumanWaiverFor (inputState i) rq := by
  obtain ⟨hn, ha⟩ := commit_core i c hnew hafter
  exact Proofs.T2_receipts_sound _ _ _ _ .human _ _ c hn ha rq hrq hc hwhen hhidden

/-- New specification for owner review: runtime T2, an applicable unwaivable
shown-on-commit review was shown at the actual inner interpreter input. -/
theorem T2_shownOnCommit_shown (i : StepInput) (c : CommitId)
    (hnew : c ∉ i.state.commits) (hafter : c ∈ (runStep i).state.commits)
    (rq : ReviewReq) (hrq : rq ∈ i.spec.reviews) (hc : rq.commit = c)
    (hwhen : whenHolds i.facts (inputState i) rq.when = true)
    (hmode : rq.mode = .shownOnCommit) (hnowaiver : rq.waivedBy? = none) :
    infoShown i.spec i.program i.facts (inputState i) rq.info = true := by
  obtain ⟨hn, ha⟩ := commit_core i c hnew hafter
  exact Proofs.T2_shownOnCommit_shown _ _ _ _ .human _ _ c hn ha rq hrq hc hwhen hmode hnowaiver

/-- New specification for owner review: neither wrapper adds an
acknowledgment; any pair new after hydration came from the inner interpreter. -/
theorem new_ack_core (i : StepInput) (pair : AlertId × String)
    (hnew : pair ∉ (inputState i).acked) (hafter : pair ∈ (runStep i).state.acked) :
    (runStep i).state = (step i.spec i.program i.facts i.user .human (inputState i) i.event).1 := by
  rcases step_shape i with h | h | h
  · exact h
  · have he : (runStep i).state.acked = (inputState i).acked :=
      congrArg (fun x => x.2.1) h
    exact False.elim (hnew (he ▸ hafter))
  · have he : (runStep i).state.acked = [] := congrArg (fun x => x.2.1) h
    rw [he] at hafter
    contradiction

/-- New specification for owner review: neither wrapper manufactures a
receipt after hydration. Loading host receipts in bind is expressly allowed. -/
theorem new_receipt_core (i : StepInput) (r : Receipt)
    (hnew : r ∉ (inputState i).receipts) (hafter : r ∈ (runStep i).state.receipts) :
    (runStep i).state = (step i.spec i.program i.facts i.user .human (inputState i) i.event).1 := by
  rcases step_shape i with h | h | h
  · exact h
  · have he : (runStep i).state.receipts = (inputState i).receipts :=
      congrArg (fun x => x.2.2.1) h
    exact False.elim (hnew (he ▸ hafter))
  · have he : (runStep i).state.receipts = [] := congrArg (fun x => x.2.2.1) h
    rw [he] at hafter
    contradiction

/-- New specification for owner review: runtime A2 at popup creation, using
the effective input. It does not by itself assert that an existing popup's key
still fires later; for ordinary fixed-facts runs that is
`ordinary_alertsOnlyWhenTrue`. -/
theorem A2_popup_holds (i : StepInput) (a : AlertId) (k : String)
    (hnew : i.state.popup? ≠ some (a, k))
    (hpop : (runStep i).state.popup? = some (a, k)) :
    ∃ al ∈ i.spec.alerts, al.id = a ∧ k ∈ alertKeys i.facts (inputState i) al.cond ∧
      (a, k) ∉ (inputState i).acked := by
  have hn : (inputState i).popup? ≠ some (a, k) := by
    rcases input_popup i with he | he
    · exact fun hp => hnew (he ▸ hp)
    · rw [he]
      simp
  rcases step_shape i with h | h | h
  · rw [h] at hpop
    exact Proofs.A2_popup_holds _ _ _ _ .human _ _ a k hn hpop
  · have he : (runStep i).state.popup? = (inputState i).popup? :=
      congrArg (fun x => x.2.2.2) h
    exact False.elim (hn (he ▸ hpop))
  · have he : (runStep i).state.popup? = none := congrArg (fun x => x.2.2.2) h
    rw [he] at hpop
    contradiction

/-- New specification for owner review: hydration preserves popup severity,
either keeping the popup or starting a fresh episode without one. -/
theorem input_notPassive (i : StepInput) (h : PopupNotPassive i.spec i.state) :
    PopupNotPassive i.spec (inputState i) := by
  unfold inputState
  split
  · rcases bind_evidence i.spec i.program i.facts i.user i.state with he | he
    · have hp : (Workspace.bind i.spec i.program i.facts i.user i.state).popup? =
          i.state.popup? := congrArg (fun x => x.2.2.2) he
      intro a k hk
      exact h a k (hp ▸ hk)
    · have hp : (Workspace.bind i.spec i.program i.facts i.user i.state).popup? = none :=
        congrArg (fun x => x.2.2.2) he
      intro a k hk
      rw [hp] at hk
      contradiction
  · exact h

/-- New specification for owner review: runtime A4 holds for every API state,
with no checker acceptance or fixed-facts premise. -/
theorem A4_step (i : StepInput) (h : PopupNotPassive i.spec i.state) :
    PopupNotPassive i.spec (runStep i).state := by
  have hi := input_notPassive i h
  rcases step_shape i with he | he | he
  · rw [he]
    exact Proofs.A4_step _ _ _ _ .human _ _ hi
  · have hp : (runStep i).state.popup? = (inputState i).popup? :=
      congrArg (fun x => x.2.2.2) he
    intro a k hk
    exact hi a k (hp ▸ hk)
  · have hp : (runStep i).state.popup? = none := congrArg (fun x => x.2.2.2) he
    intro a k hk
    rw [hp] at hk
    contradiction

/-- New specification for owner review: runtime A4 for all host-driven runs,
including fact replacement, selection/hydration, and passing time. -/
theorem A4_run (sp p u s) (hs : Reachable sp p u s) : PopupNotPassive sp s := by
  induction hs with
  | start f =>
    intro a k hp
    have hn : (runInit ⟨sp, p, f, u⟩).popup? = none := by
      unfold runInit
      split
      · rfl
      · exact init_popup ..
    rw [hn] at hp
    contradiction
  | event f e _ ih => exact A4_step ⟨sp, p, f, u, _, e⟩ ih
  | wait d _ ih => exact ih

/-- New specification for owner review: a runtime acknowledgment that is
neither in the API state nor stored for the selected patient must come from
the core; hydration and handlers cannot supply it. The stored-draft premise is
new: hydration restores the acknowledgments stored for the patient. -/
theorem ack_origin (i : StepInput) (pair : AlertId × String)
    (hnew : pair ∉ i.state.acked) (hstored : pair ∉ (pending i.state).acked)
    (hafter : pair ∈ (runStep i).state.acked) :
    (runStep i).state = (step i.spec i.program i.facts i.user .human (inputState i) i.event).1 :=
  new_ack_core i pair (fun hc => (input_acks i pair hc).elim hnew hstored) hafter

/-- New specification for owner review: every output receipt was already in
state, supplied in host facts, or produced by the core on its effective input. -/
theorem receipt_origin (i : StepInput) (r : Receipt) (hafter : r ∈ (runStep i).state.receipts) :
    r ∈ i.state.receipts ∨ r ∈ i.facts.receipts ∨
      (runStep i).state = (step i.spec i.program i.facts i.user .human (inputState i) i.event).1 := by
  by_cases hi : r ∈ (inputState i).receipts
  · rcases input_receipts i r hi with hs | hf
    · exact Or.inl hs
    · exact Or.inr (Or.inl hf)
  · exact Or.inr (Or.inr (new_receipt_core i r hi hafter))

/-- New specification for owner review: runtime view A2. Unbound workspace
views have no items; every shown alert in a clinical view has a true condition. -/
theorem A2_view_shown (i : ViewInput) (item : ItemView)
    (hi : item ∈ (runView i).items) (hs : item.shown = true)
    (a : AlertId) (p : Bool) (hk : item.comp.kind = .alert a p) :
    alertHolds i.spec i.facts i.state a = true := by
  unfold runView at hi
  split at hi
  · simp at hi
  · exact Proofs.A2_view_shown _ _ _ _ _ item hi hs a p hk

#print axioms commit_core
#print axioms T0_commit_needs_guard
#print axioms T0_entry_values
#print axioms T3_cosign_distinct
#print axioms T2_receipts_sound
#print axioms T2_shownOnCommit_shown
#print axioms new_ack_core
#print axioms new_receipt_core
#print axioms A2_popup_holds
#print axioms input_notPassive
#print axioms A4_step
#print axioms A4_run
#print axioms ack_origin
#print axioms receipt_origin
#print axioms A2_view_shown
end Ehr.Runtime
