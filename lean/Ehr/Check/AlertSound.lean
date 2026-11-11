import Ehr.Check.HumanEventsSound

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Proofs

private theorem clickAlert_captured (sp p f s a) :
    (clickAlert sp p f s a).1.captured = s.captured := by
  unfold clickAlert
  repeat' (first | rfl | split | dsimp only)
private theorem clickCommit_captured (sp p f u s c) :
    (clickCommit sp p f u s c).1.captured = s.captured := by
  unfold clickCommit
  repeat' (first | rfl | split | dsimp only)

private theorem clickCore_popup_captured (sp p f u actor s comp a k)
    (hn : s.popup? = none) :
    (clickCore sp p f u actor s comp).1.popup? = some (a,k) →
    (clickCore sp p f u actor s comp).1.captured = s.captured := by
  unfold clickCore
  split
  · cases actor
    · intro _; exact clickAlert_captured ..
    · intro _; rfl
  · intro hp; rw [goTo_popup, hn] at hp; contradiction
  · intro hp; rw [goBack_popup, hn] at hp; contradiction
  · cases actor
    · intro _; exact clickCommit_captured ..
    · intro _; rfl
  · cases actor
    · intro hp; rw [markReviewed_popup, hn] at hp; contradiction
    · intro _; rfl
  · split
    · intro hp; rw [prefillScreen_popup, hn] at hp; contradiction
    · intro _; rfl
  · intro hp; rw [requestPriorAuth_popup, hn] at hp; contradiction
  · intro _; rfl
  · cases actor <;> intro _ <;> rfl
  · intro _; rfl

private theorem stepCore_popup_captured (sp p f u actor s e a k)
    (hn : s.popup? = none) :
    (stepCore sp p f u actor s e).1.popup? = some (a,k) →
    (stepCore sp p f u actor s e).1.captured = s.captured := by
  unfold stepCore
  split
  · intro _; rfl
  · cases e with
    | click cid =>
      simp only [stepEvent]
      split
      · intro _; rfl
      · exact clickCore_popup_captured _ _ _ _ _ _ _ _ _ hn
    | enter cid v => intro hp; simp only [stepEvent] at hp; rw [enterCore_popup, hn] at hp; contradiction
    | confirm cid => intro hp; simp only [stepEvent] at hp; rw [confirmCore_popup, hn] at hp; contradiction
    | selectTab cid idx => intro hp; simp only [stepEvent] at hp; rw [selectTabCore_popup, hn] at hp; contradiction
    | ack a => intro _; simp only [stepEvent]; unfold ackCore; repeat' (first | rfl | split | dsimp only)
    | scroll z => simp only [stepEvent]; split <;> intro _ <;> rfl
    | search q => simp only [stepEvent]; split <;> intro _ <;> rfl

/-- While a popup remains open, captured values cannot change. -/
theorem popup_captured (sp p f u actor s e a k) :
    (step sp p f u actor s e).1.popup? = some (a,k) →
    (step sp p f u actor s e).1.captured = s.captured := by
  cases hn : s.popup? with
  | some pop =>
    intro _
    cases actor <;> cases e <;>
      simp [step, stepCore, hn, Event.isAck, stepEvent, ackCore] <;> split <;> rfl
  | none =>
    unfold step
    split
    · split
      · intro hp; rw [runMacro_popup, hn] at hp; contradiction
      · exact stepCore_popup_captured _ _ _ _ _ _ _ _ _ hn
    · exact stepCore_popup_captured _ _ _ _ _ _ _ _ _ hn

/-- Clinical predicates inspect captures, never UI navigation or elapsed time. -/
theorem clinicalEval_captured (facts : Facts) (s t : State) (p : ClinicalPredicate)
    (h : t.captured = s.captured) : clinicalEval facts t p = clinicalEval facts s p := by
  induction p <;> simp_all only [clinicalEval]

private theorem alertKeys_captured (facts : Facts) (s t : State) (c : AlertCond)
    (h : t.captured = s.captured) : alertKeys facts t c = alertKeys facts s c := by
  cases c <;> simp only [alertKeys, drugsInPlay, orderLines, doseOutOfRange,
    lineDoseMgTenths?, weightKgTenths?, capturedWeightKg?, h, clinicalEval_captured facts s t _ h] <;> rfl

/-- Alert keys depend on the state only through its captures. -/
theorem alertKeys_of_captured (facts : Facts) (s t : State) (c : AlertCond)
    (h : t.captured = s.captured) : alertKeys facts t c = alertKeys facts s c :=
  alertKeys_captured facts s t c h

/-- One step from any state, reachable or not, keeps the popup truth invariant. -/
theorem popupKeys_step (ep : Episode) (s : State) (actor : Actor) (e : Event)
    (ih : ∀ a k, s.popup? = some (a, k) →
      ∃ al ∈ ep.spec.alerts, al.id = a ∧ k ∈ alertKeys ep.facts s al.cond) :
    ∀ a k, (ep.next actor s e).popup? = some (a, k) →
      ∃ al ∈ ep.spec.alerts, al.id = a ∧ k ∈ alertKeys ep.facts (ep.next actor s e) al.cond := by
  intro a k hp
  have he := popup_captured ep.spec ep.prog ep.facts ep.user actor s e a k hp
  by_cases hold : s.popup? = some (a,k)
  · obtain ⟨al, hal, hid, hk⟩ := ih a k hold
    exact ⟨al, hal, hid, (alertKeys_captured ep.facts s _ al.cond he).symm ▸ hk⟩
  · obtain ⟨al, hal, hid, hk, _⟩ := A2_popup_holds _ _ _ _ actor s e a k hold hp
    exact ⟨al, hal, hid, (alertKeys_captured ep.facts s _ al.cond he).symm ▸ hk⟩

/-- The popup truth invariant holds after every event and every clock advance. -/
theorem alertsOnlyWhenTrue (ep : Episode) : AlertsOnlyWhenTrue ep := by
  intro s hs
  refine ⟨?_, fun a ha => inlineAlert_holds ep s a ha⟩
  induction hs with
  | start => intro a k hp; simp only [Episode.start, init_popup] at hp; contradiction
  | @step s actor e hs ih => exact popupKeys_step ep s actor e ih
  | @wait s d hs ih =>
    intro a k hp
    obtain ⟨al, hal, hid, hk⟩ := ih a k hp
    exact ⟨al, hal, hid, (alertKeys_captured ep.facts s { s with clock := s.clock + d } al.cond rfl).symm ▸ hk⟩

private theorem ackCore_popup_acked (s : State) (a : AlertId) (p : AlertId × String) :
    (ackCore .human s a).1.popup? = some p →
    (ackCore .human s a).1.acked = s.acked := by
  simp only [ackCore]
  split
  · split
    · intro hp; contradiction
    · intro _; rfl
  · intro _; rfl

private theorem popup_acked (ep : Episode) (s : State)
    (actor : Actor) (e : Event) (p : AlertId × String)
    (hp : (ep.next actor s e).popup? = some p) : (ep.next actor s e).acked = s.acked := by
  by_cases hn : (ep.next actor s e).acked = s.acked
  · exact hn
  · obtain ⟨rfl, a, rfl⟩ := (onlyHumanCommitsAndAcks_at ep s actor e).2 hn
    have he : ep.next .human s (.ack a) = (ackCore .human s a).1 := by
      simp [Episode.next, step, stepCore, Event.isAck, stepEvent]
    rw [he] at hp hn
    exact False.elim (hn (ackCore_popup_acked s a p hp))

private theorem acked_monotone (ep : Episode) (s : State)
    (actor : Actor) (e : Event) : ∀ p ∈ s.acked, p ∈ (ep.next actor s e).acked := by
  by_cases he : (ep.next actor s e).acked = s.acked
  · intro p hp; simpa [he] using hp
  · obtain ⟨rfl, a, rfl⟩ := (onlyHumanCommitsAndAcks_at ep s actor e).2 he
    intro p hp
    simp only [Episode.next, step, stepCore, Event.isAck, Bool.not_true, Bool.and_false,
      Bool.false_eq_true, ↓reduceIte, stepEvent, ackCore]
    split
    · split
      · exact List.mem_append.mpr (Or.inl hp)
      · exact hp
    · exact hp

private theorem popup_continues (sp p f u actor s e) (pair : AlertId × String)
    (hp : s.popup? = some pair) :
    (step sp p f u actor s e).1.popup? = some pair ∨
      pair ∈ (step sp p f u actor s e).1.acked := by
  cases actor <;> cases e <;>
    simp [step, stepCore, hp, Event.isAck, stepEvent, ackCore]
  split <;> simp_all

/-- One step from any state, reachable or not: acknowledgments persist and an
open popup stays until it is acknowledged. -/
theorem interruptsOnce_at (ep : Episode) (s : State) (actor : Actor) (e : Event) :
    (∀ p ∈ s.acked, p ∈ (ep.next actor s e).acked) ∧
    (∀ p, s.popup? = some p → (ep.next actor s e).popup? = some p ∨ p ∈ (ep.next actor s e).acked) :=
  ⟨acked_monotone ep s actor e, fun pair hp => popup_continues _ _ _ _ _ _ _ pair hp⟩

/-- One step from any state, reachable or not, keeps the open popup unacknowledged. -/
theorem popupUnacked_step (ep : Episode) (s : State) (actor : Actor) (e : Event)
    (ih : ∀ p, s.popup? = some p → p ∉ s.acked) :
    ∀ p, (ep.next actor s e).popup? = some p → p ∉ (ep.next actor s e).acked := by
  intro p hp
  have ha := popup_acked ep s actor e p hp
  rw [ha]
  by_cases hold : s.popup? = some p
  · exact ih p hold
  · exact (A2_popup_holds _ _ _ _ actor s e p.1 p.2 hold hp).choose_spec.2.2.2

/-- Acknowledgments persist, open popups are modal until acknowledged, and an
acknowledged alert/key never becomes the current popup (property 11's semantics). -/
theorem interruptsOnce (ep : Episode) : InterruptsOnce ep := by
  constructor
  · intro s _ actor e
    exact interruptsOnce_at ep s actor e
  · intro s hs
    induction hs with
    | start => intro p hp; simp only [Episode.start, init_popup] at hp; contradiction
    | @step s actor e hs ih => exact popupUnacked_step ep s actor e ih
    | @wait s d hs ih => exact ih

/-- Accepted programs have no false popup declarations, and every actual
popup/inline alert is firing for its real key (property 10 / A2). -/
theorem accepted_noFalseAlarms (sp prev can p) (h : check sp prev can p = .ok) : NoFalseAlarms sp p := by
  have ht := accepted_structural sp prev can p h
  exact ⟨ht.2.2.2.2.2.2.2.1, fun facts user _ => alertsOnlyWhenTrue ⟨sp, p, facts, user⟩⟩

/-- Accepted programs request no repeated interruptive popups and preserve
acknowledgments throughout every episode (property 11 / A3). -/
theorem accepted_noRepeatInterruptions (sp prev can p) (h : check sp prev can p = .ok) :
    NoRepeatInterruptions sp p := by
  have ht := accepted_structural sp prev can p h
  exact ⟨ht.2.2.2.2.2.2.1, fun facts user _ => interruptsOnce ⟨sp, p, facts, user⟩⟩

#print axioms clinicalEval_captured
#print axioms popup_captured
#print axioms alertKeys_of_captured
#print axioms popupKeys_step
#print axioms interruptsOnce_at
#print axioms popupUnacked_step
#print axioms alertsOnlyWhenTrue
#print axioms interruptsOnce
#print axioms accepted_noFalseAlarms
#print axioms accepted_noRepeatInterruptions
end Ehr.Check
