import Ehr.Proofs.T0

/-!
# Alert properties A2 and A4

- **A2 (no false alarms).** In the screen view, an alert component is marked
  as firing, or counts as shown, only if its condition holds. A step opens a
  new popup `(a, k)` only if some alert rule `a` fires for key `k` in the state
  before the step.
- **A4 (severity tiers).** A passive alert never pops up: in every state
  reached from `init`, the open popup (if any) belongs to an alert rule that is
  interruptive or removable.

(A3, "no repeat interruptions", holds because a popup is only chosen from
`popupCandidates`, which leave out acknowledged `(alert, key)` pairs; see the
`mem_popupCandidates` lemma and the tiny tests.)
-/

namespace Ehr.Proofs

open Ehr Ehr.Props

/-! ## A2 in the view -/

/-- **A2 (view, firing).** If the view marks an item as firing, the item is an
alert component and its alert's condition holds. -/
theorem A2_view_firing (sp : Spec) (prog : Program) (facts : Facts) (user : User) (s : State)
    (item : ItemView) (hi : item ∈ (view sp prog facts user s).items) (hf : item.firing = true) :
    ∃ a p, item.comp.kind = .alert a p ∧ alertHolds sp facts s a = true := by
  simp only [view, List.mem_map] at hi
  obtain ⟨c, _, rfl⟩ := hi
  simp only [itemView] at hf ⊢
  split at hf
  · rename_i a p hk
    exact ⟨a, p, hk, hf⟩
  · exact absurd hf (by decide)

/-- **A2 (view, shown).** If the view shows an alert component, its alert's
condition holds. -/
theorem A2_view_shown (sp : Spec) (prog : Program) (facts : Facts) (user : User) (s : State)
    (item : ItemView) (hi : item ∈ (view sp prog facts user s).items) (hs : item.shown = true)
    (a : AlertId) (p : Bool) (hk : item.comp.kind = .alert a p) :
    alertHolds sp facts s a = true := by
  simp only [view, List.mem_map] at hi
  obtain ⟨c, _, rfl⟩ := hi
  simp only [itemView, compShown, Bool.and_eq_true] at hs hk
  obtain ⟨_, hs⟩ := hs
  rw [hk] at hs
  exact hs

/-! ## Where a popup can come from -/

/-- What a popup candidate is: an alert rule for the commit that may pop up,
fires for the key, and is not yet acknowledged for it. -/
theorem mem_popupCandidates {sp : Spec} {prog : Program} {facts : Facts} {s : State}
    {c : CommitId} {p : AlertId × String} (h : p ∈ popupCandidates sp prog facts s c) :
    ∃ al ∈ sp.alerts, al.id = p.1 ∧ al.commit = c ∧ canPopup sp prog s al.id = true ∧
      p.2 ∈ alertKeys facts s al.cond ∧ p ∉ s.acked := by
  simp only [popupCandidates, List.mem_flatMap] at h
  obtain ⟨al, hal, hp⟩ := h
  split at hp
  · rename_i hcond
    simp only [Bool.and_eq_true, beq_iff_eq] at hcond
    simp only [List.mem_map, List.mem_filter] at hp
    obtain ⟨k, ⟨hk, hna⟩, rfl⟩ := hp
    refine ⟨al, hal, rfl, hcond.1, hcond.2, hk, ?_⟩
    simpa using hna
  · simp at hp

/-- An alert that may pop up is not passive. -/
theorem canPopup_not_passive {sp : Spec} {prog : Program} {s : State} {a : AlertId}
    (h : canPopup sp prog s a = true) : ∃ al, sp.alert? a = some al ∧ al.tier ≠ .passive := by
  unfold canPopup at h
  split at h
  · rename_i al hal
    refine ⟨al, hal, ?_⟩
    intro ht
    rw [ht] at h
    simp at h
  · simp at h

/-- The popup after a step is the old one, none, or a popup candidate of the
state before the step. -/
def PopupFrom (sp : Spec) (prog : Program) (facts : Facts) (s s' : State) : Prop :=
  s'.popup? = s.popup? ∨ s'.popup? = none ∨
    ∃ c p, p ∈ popupCandidates sp prog facts s c ∧ s'.popup? = some p

theorem PopupFrom.same {sp : Spec} {prog : Program} {facts : Facts} {s s' : State}
    (h : s'.popup? = s.popup?) : PopupFrom sp prog facts s s' := Or.inl h

theorem clickCommit_popup (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (s : State) (cm : CommitId) :
    PopupFrom sp prog facts s (clickCommit sp prog facts user s cm).1 := by
  unfold clickCommit
  split
  · exact PopupFrom.same rfl
  · split
    · split
      · rename_i p rest heq
        exact Or.inr (Or.inr ⟨cm, p, by rw [heq]; exact List.mem_cons_self, rfl⟩)
      · split <;> exact PopupFrom.same rfl
    · exact PopupFrom.same rfl

theorem markReviewed_popup (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (s : State) (i : InfoId) : (markReviewed sp prog facts user s i).1.popup? = s.popup? := by
  unfold markReviewed
  repeat' (first | rfl | split | dsimp only)

theorem requestPriorAuth_popup (sp : Spec) (user : User) (actor : Actor) (s : State) :
    (requestPriorAuth sp user actor s).1.popup? = s.popup? := by
  unfold requestPriorAuth
  repeat' (first | rfl | split | dsimp only)

theorem clickCore_popup (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (s : State) (c : Component) :
    PopupFrom sp prog facts s (clickCore sp prog facts user actor s c).1 := by
  unfold clickCore
  split
  · exact PopupFrom.same (goTo_popup ..)
  · exact PopupFrom.same (goBack_popup ..)
  · cases actor
    · apply clickCommit_popup
    · exact PopupFrom.same rfl
  · cases actor
    · exact PopupFrom.same (markReviewed_popup ..)
    · exact PopupFrom.same rfl
  · exact PopupFrom.same (prefillScreen_popup ..)
  · exact PopupFrom.same (requestPriorAuth_popup ..)
  · exact PopupFrom.same rfl
  · cases actor <;> exact PopupFrom.same rfl
  · exact PopupFrom.same rfl

theorem enterCore_popup (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (s : State) (cid : CompId) (v : Value) :
    (enterCore sp prog facts user actor s cid v).1.popup? = s.popup? := by
  unfold enterCore
  repeat' (first | rfl | split | dsimp only)

theorem confirmCore_popup (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (s : State) (cid : CompId) :
    (confirmCore sp prog facts user actor s cid).1.popup? = s.popup? := by
  unfold confirmCore
  repeat' (first | rfl | split | dsimp only)

theorem selectTabCore_popup (sp : Spec) (prog : Program) (facts : Facts) (s : State)
    (cid : CompId) (idx : Nat) : (selectTabCore sp prog facts s cid idx).1.popup? = s.popup? := by
  unfold selectTabCore
  repeat' (first | rfl | split | dsimp only)

theorem ackCore_popup (actor : Actor) (s : State) (a : AlertId) :
    (ackCore actor s a).1.popup? = s.popup? ∨ (ackCore actor s a).1.popup? = none := by
  unfold ackCore
  split
  · exact Or.inl rfl
  · split
    · split
      · exact Or.inr rfl
      · exact Or.inl rfl
    · exact Or.inl rfl

/-- One event without macros: the popup is old, none, or a candidate. -/
theorem stepCore_popup (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (s : State) (e : Event) :
    PopupFrom sp prog facts s (stepCore sp prog facts user actor s e).1 := by
  unfold stepCore
  split
  · exact PopupFrom.same rfl
  · cases e with
    | click cid =>
      simp only [stepEvent]
      split
      · exact PopupFrom.same rfl
      · apply clickCore_popup
    | selectTab cid idx => exact PopupFrom.same (selectTabCore_popup ..)
    | enter cid v => exact PopupFrom.same (enterCore_popup ..)
    | confirm cid => exact PopupFrom.same (confirmCore_popup ..)
    | ack a =>
      rcases ackCore_popup actor s a with h | h
      · exact Or.inl h
      · exact Or.inr (Or.inl h)
    | scroll scr =>
      simp only [stepEvent]
      split <;> exact PopupFrom.same rfl
    | search q =>
      simp only [stepEvent]
      split <;> exact PopupFrom.same rfl

/-- A macro event never changes the popup (a macro cannot commit or acknowledge). -/
theorem stepCore_macro_popup (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (s : State) (e : Event) : (stepCore sp prog facts user .«macro» s e).1.popup? = s.popup? := by
  unfold stepCore
  split
  · rfl
  · cases e with
    | click cid =>
      simp only [stepEvent]
      split
      · rfl
      · unfold clickCore
        split
        · exact goTo_popup ..
        · exact goBack_popup ..
        · rfl
        · rfl
        · exact prefillScreen_popup ..
        · exact requestPriorAuth_popup ..
        · rfl
        · rfl
        · rfl
    | selectTab cid idx => exact selectTabCore_popup ..
    | enter cid v => exact enterCore_popup ..
    | confirm cid => exact confirmCore_popup ..
    | ack a => rfl
    | scroll scr =>
      simp only [stepEvent]
      split <;> rfl
    | search q =>
      simp only [stepEvent]
      split <;> rfl

theorem runMacro_popup (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (steps : List MacroStep) : ∀ (i : Nat) (s : State),
    (runMacro sp prog facts user i s steps).1.popup? = s.popup? := by
  induction steps with
  | nil => intro i s; rfl
  | cons st rest ih =>
    intro i s
    have h : (macroStep sp prog facts user s st).1.popup? = s.popup? := by
      cases st with
      | setValue cid str => exact stepCore_macro_popup ..
      | click cid => exact stepCore_macro_popup ..
      | goto t =>
        simp only [macroStep]
        split
        · rfl
        · exact goTo_popup ..
    unfold runMacro
    split
    · rename_i s' heq
      rw [heq] at h
      exact (ih _ _).trans h
    · rename_i s' r _ heq
      rw [heq] at h
      exact h

/-- Any step: the popup is old, none, or a candidate of the state before. -/
theorem step_popup (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (s : State) (e : Event) :
    PopupFrom sp prog facts s (step sp prog facts user actor s e).1 := by
  unfold step
  split
  · split
    · exact PopupFrom.same (runMacro_popup ..)
    · apply stepCore_popup
  · apply stepCore_popup

/-! ## A2 for popups -/

/-- **A2 (popups).** If a step opens a popup `(a, k)` that was not open before,
then some alert rule with ID `a` fires for key `k` in the state before the
step, and `(a, k)` had not been acknowledged (A3). -/
theorem A2_popup_holds (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (s : State) (e : Event) (a : AlertId) (k : String)
    (hnew : s.popup? ≠ some (a, k))
    (hpop : (step sp prog facts user actor s e).1.popup? = some (a, k)) :
    ∃ al ∈ sp.alerts, al.id = a ∧ k ∈ alertKeys facts s al.cond ∧ (a, k) ∉ s.acked := by
  rcases step_popup sp prog facts user actor s e with h | h | ⟨c, p, hp, h⟩
  · rw [h] at hpop; exact absurd hpop hnew
  · rw [h] at hpop; exact absurd hpop (by simp)
  · rw [h] at hpop
    cases hpop
    obtain ⟨al, hal, hid, _, _, hk, hna⟩ := mem_popupCandidates hp
    exact ⟨al, hal, hid, hk, hna⟩

/-! ## A4 -/

/-- The initial state has no popup. -/
theorem init_popup (sp : Spec) (prog : Program) (facts : Facts) (user : User) :
    (init sp prog facts user).popup? = none := by
  unfold init
  rw [prefillScreen_popup]

/-- **A4 (one step).** If the popup before a step is not passive, neither is
the popup after it. -/
theorem A4_step (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (s : State) (e : Event) (h : PopupNotPassive sp s) :
    PopupNotPassive sp (step sp prog facts user actor s e).1 := by
  intro a k hpop
  rcases step_popup sp prog facts user actor s e with h' | h' | ⟨c, p, hp, h'⟩
  · rw [h'] at hpop; exact h a k hpop
  · rw [h'] at hpop; exact absurd hpop (by simp)
  · rw [h'] at hpop
    cases hpop
    obtain ⟨al, _, hid, _, hcan, _, _⟩ := mem_popupCandidates hp
    rw [hid] at hcan
    exact canPopup_not_passive hcan

/-- **A4 (every run).** After any list of events from the initial state, the
open popup (if any) belongs to an alert rule that is not passive. -/
theorem A4_run (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (es : List Event) :
    PopupNotPassive sp (runAll sp prog facts user actor (init sp prog facts user) es) := by
  unfold runAll
  suffices ∀ s, PopupNotPassive sp s →
      PopupNotPassive sp (es.foldl (fun s e => (step sp prog facts user actor s e).1) s) by
    apply this
    intro a k hpop
    rw [init_popup] at hpop
    exact absurd hpop (by simp)
  induction es with
  | nil => intro s h; exact h
  | cons e rest ih =>
    intro s h
    exact ih _ (A4_step sp prog facts user actor s e h)

/-- **A4 (plain form).** A passive alert rule never pops up in any run from the
initial state. (`sp.alert? al.id = some al` says `al` is the rule its ID names.) -/
theorem A4_passive_never_popup (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (es : List Event) (al : AlertSpec) (hid : sp.alert? al.id = some al)
    (hpas : al.tier = .passive) (k : String) :
    (runAll sp prog facts user actor (init sp prog facts user) es).popup? ≠ some (al.id, k) := by
  intro hpop
  obtain ⟨al', hal', hnp⟩ := A4_run sp prog facts user actor es al.id k hpop
  rw [hid] at hal'
  cases hal'
  exact hnp hpas

/-! ## The hypotheses are satisfiable -/

section Examples
open Ehr.Examples.Tiny Ehr.Examples.TinyTests

/-- A2: on the order screen, the care-gap alert item fires and is shown. -/
example : ∃ item ∈ (view spec program facts user atOrder).items,
    item.firing = true ∧ item.shown = true := by
  decide

/-- A2 (popups): clicking Sign with an amoxicillin order opens a new popup. -/
example : atSignAmox.popup? ≠ some ("drugAllergy", "amoxicillin@3") ∧
    (step spec program facts user .human atSignAmox (.click "signButton")).1.popup? =
      some ("drugAllergy", "amoxicillin@3") := by
  decide

/-- The tiny spec's care-gap rule (passive). -/
def careGapRule : AlertSpec :=
  { id := "careGap", label := "Care gap due", cond := .careGap, tier := .passive,
    commit := "signOrders", screens := ["order"] }

/-- A4's hypotheses hold on the tiny spec: the care-gap rule is passive and is
the rule its ID names. -/
example : spec.alert? careGapRule.id = some careGapRule ∧ careGapRule.tier = .passive := by
  decide

/-- So no run of the tiny program ever pops up the care-gap alert. -/
example (es : List Event) (k : String) :
    (runAll spec program facts user .human (init spec program facts user) es).popup? ≠
      some ("careGap", k) :=
  A4_passive_never_popup spec program facts user .human es careGapRule (by decide) rfl k

/-- A4 rejects a bad state: a state whose popup is the passive care-gap alert
does not satisfy `PopupNotPassive`. -/
example : ¬ PopupNotPassive spec { s0 with popup? := some ("careGap", "colorectalScreening") } := by
  intro h
  obtain ⟨al, hal, hnp⟩ := h "careGap" "colorectalScreening" rfl
  have : spec.alert? "careGap" = some careGapRule := by decide
  rw [this] at hal
  cases hal
  exact hnp rfl

end Examples

end Ehr.Proofs
