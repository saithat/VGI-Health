import Ehr.Check.EntryConstruction
import Ehr.Check.ScreenSound
import Ehr.Check.AlertSound

/-! Constructive completion lemmas for the public interpreter. -/
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Proofs

/-- A human acknowledgment clears even an already open popup in one event. -/
theorem human_clear_popup (sp : Spec) (p : Program) (f : Facts) (u : User) (s : State) :
    ∃ es : List Event, (runAll sp p f u .human s es).popup? = none ∧
      (runAll sp p f u .human s es).screen = s.screen ∧
      (runAll sp p f u .human s es).captured = s.captured := by
  cases hp : s.popup? with
  | none => exact ⟨[], hp, rfl, rfl⟩
  | some pair =>
    exact ⟨[.ack pair.1], by simp [runAll, step, stepCore, stepEvent, Event.isAck, ackCore, hp],
      by simp [runAll, step, stepCore, stepEvent, Event.isAck, ackCore, hp],
      by simp [runAll, step, stepCore, stepEvent, Event.isAck, ackCore, hp]⟩

/-- Acknowledging a candidate removes it and any duplicates from the pending list.
No fact, capture, screen or alert condition changes during this operation. -/
theorem popupCandidates_ack (sp : Spec) (p : Program) (f : Facts) (s : State)
    (c : CommitId) (pair : AlertId × String) :
    popupCandidates sp p f { s with acked := s.acked ++ [pair], popup? := none } c =
      (popupCandidates sp p f s c).filter (· != pair) := by
  simp only [popupCandidates, List.filter_flatMap]
  congr 1
  funext al
  have keys : alertKeys f { s with acked := s.acked ++ [pair], popup? := none } al.cond =
      alertKeys f s al.cond := by
    cases al.cond <;> try rfl
    simp only [alertKeys]
    rw [clinicalEval_captured f s { s with acked := s.acked ++ [pair], popup? := none } _ rfl]
  have can : canPopup sp p { s with acked := s.acked ++ [pair], popup? := none } al.id =
      canPopup sp p s al.id := by
    unfold canPopup programPopsUp
    split <;> rfl
  rw [keys, can]
  split
  · simp only [List.filter_map, List.filter_filter]
    congr 1
    apply List.filter_congr
    intro k _
    apply Bool.eq_iff_iff.mpr
    simp [Bool.and_comm]
  · rfl

/-- Once the non-alert guard is met and a commit button stays shown while
acknowledgments accumulate, finitely many click/ack pairs finish the commit.
The final premise states the usual unique-ID alert-lookup consistency. -/
theorem human_finish_ready (sp : Spec) (p : Program) (f : Facts) (u : User)
    (s : State) (c : CommitId) (button : Component)
    (kind : button.kind = .button (.commit c)) (modal : s.popup? = none)
    (ready : ∀ ack, guardBase sp p f u { s with acked := ack, popup? := none } c = true)
    (shown : ∀ ack, shownComp? sp p f { s with acked := ack, popup? := none } button.id = some button)
    (consistent : ∀ t, popupCandidates sp p f t c = [] → alertsAcked sp f t c = true) :
    ∃ es : List Event, c ∈ (runAll sp p f u .human s es).commits := by
  by_cases done : c ∈ s.commits
  · exact ⟨[], done⟩
  have hs : { s with acked := s.acked, popup? := none } = s := by simp [← modal]
  have hb := ready s.acked
  have hv := shown s.acked
  rw [hs] at hb hv
  have clicked : step sp p f u .human s (.click button.id) = clickCommit sp p f u s c := by
    simp [step, clickedMacro?, hv, kind, modal, stepCore, stepEvent, Event.isAck, clickCore]
  cases hp : popupCandidates sp p f s c with
  | nil =>
    refine ⟨[.click button.id], ?_⟩
    simp [runAll, clicked, clickCommit, done, hb, hp, consistent s hp]
  | cons pair rest =>
    let t := { s with acked := s.acked ++ [pair], popup? := none }
    have pathStep : runAll sp p f u .human s [.click button.id, .ack pair.1] = t := by
      simp only [runAll, List.foldl_cons, List.foldl_nil]
      rw [clicked]
      simp only [clickCommit, List.contains_eq_mem, decide_eq_false done, Bool.false_eq_true,
        ↓reduceIte, hb, hp]
      simp [step, stepCore, stepEvent, Event.isAck, ackCore, t]
    have smaller : (popupCandidates sp p f t c).length < (popupCandidates sp p f s c).length := by
      rw [popupCandidates_ack, hp]
      simp only [List.filter_cons, bne_self_eq_false, Bool.false_eq_true, ↓reduceIte, List.length_cons]
      exact Nat.lt_succ_of_le (List.length_filter_le _ _)
    obtain ⟨es, he⟩ := human_finish_ready sp p f u t c button kind rfl
      (by intro ack; exact ready ack) (by intro ack; exact shown ack) consistent
    refine ⟨[.click button.id, .ack pair.1] ++ es, ?_⟩
    change c ∈ (runAll sp p f u .human
      (runAll sp p f u .human s [.click button.id, .ack pair.1]) es).commits
    rw [pathStep]
    exact he
termination_by (popupCandidates sp p f s c).length

#print axioms human_finish_ready
end Ehr.Check
