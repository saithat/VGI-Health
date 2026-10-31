import Ehr.Core.View
import Ehr.Props.Defs

/-!
# Frame lemmas

What each interpreter helper leaves unchanged. Used by the safety theorems.

`NoNewHumanOnly sp s s'`: every captured value in `s'` for a human-only
element was already captured in `s`.
-/

namespace Ehr.Proofs

open Ehr

/-- Every captured value in `s'` for a human-only element was already in `s`. -/
def NoNewHumanOnly (sp : Spec) (s s' : State) : Prop :=
  ∀ x ∈ s'.captured, sp.isHumanOnly x.element = true → x ∈ s.captured

theorem NoNewHumanOnly.refl (sp : Spec) (s : State) : NoNewHumanOnly sp s s :=
  fun _ hx _ => hx

theorem NoNewHumanOnly.trans {sp : Spec} {s₁ s₂ s₃ : State}
    (h₁ : NoNewHumanOnly sp s₁ s₂) (h₂ : NoNewHumanOnly sp s₂ s₃) : NoNewHumanOnly sp s₁ s₃ :=
  fun x hx hh => h₁ x (h₂ x hx hh) hh

theorem NoNewHumanOnly.of_captured_eq {sp : Spec} {s s' : State}
    (h : s'.captured = s.captured) : NoNewHumanOnly sp s s' := by
  intro x hx _; rw [h] at hx; exact hx

/-- A step that only changes "safe" things for a macro: commits, acks, and
receipts are unchanged, and no human-only value is newly captured. -/
structure MacroSafe (sp : Spec) (s s' : State) : Prop where
  commits : s'.commits = s.commits
  acked : s'.acked = s.acked
  receipts : s'.receipts = s.receipts
  humanOnly : NoNewHumanOnly sp s s'

theorem MacroSafe.refl (sp : Spec) (s : State) : MacroSafe sp s s :=
  ⟨rfl, rfl, rfl, NoNewHumanOnly.refl sp s⟩

theorem MacroSafe.trans {sp : Spec} {s₁ s₂ s₃ : State}
    (h₁ : MacroSafe sp s₁ s₂) (h₂ : MacroSafe sp s₂ s₃) : MacroSafe sp s₁ s₃ :=
  ⟨h₂.commits.trans h₁.commits, h₂.acked.trans h₁.acked, h₂.receipts.trans h₁.receipts,
   h₁.humanOnly.trans h₂.humanOnly⟩

/-- Changing only fields other than commits, acks, receipts, and captured is safe. -/
theorem MacroSafe.of_eq {sp : Spec} {s s' : State} (hc : s'.commits = s.commits)
    (ha : s'.acked = s.acked) (hr : s'.receipts = s.receipts) (hcap : s'.captured = s.captured) :
    MacroSafe sp s s' :=
  ⟨hc, ha, hr, NoNewHumanOnly.of_captured_eq hcap⟩

/-! ## Prefill -/

theorem prefillRecord_element {facts : Facts} {s : State} {e : ElementId} {el : ElementSpec}
    {n : Nat} {pf : Prefill} {x : Captured} (h : prefillRecord facts s e el n pf = some x) :
    x.element = e := by
  cases pf <;> simp [prefillRecord] at h
  all_goals (obtain ⟨_, _, rfl⟩ := h; rfl)

/-- Prefilling one field changes only `captured`, and adds no human-only value. -/
theorem prefillField_frame (sp : Spec) (facts : Facts) (s : State) (c : Component) :
    let s' := prefillField sp facts s c
    s'.commits = s.commits ∧ s'.acked = s.acked ∧ s'.receipts = s.receipts ∧
    s'.popup? = s.popup? ∧ s'.screen = s.screen ∧ NoNewHumanOnly sp s s' := by
  simp only [prefillField]
  split
  · rename_i e slot pf
    split
    · exact ⟨rfl, rfl, rfl, rfl, rfl, NoNewHumanOnly.refl _ _⟩
    · rename_i el hel
      split
      · exact ⟨rfl, rfl, rfl, rfl, rfl, NoNewHumanOnly.refl _ _⟩
      · rename_i hcond
        split
        · exact ⟨rfl, rfl, rfl, rfl, rfl, NoNewHumanOnly.refl _ _⟩
        · rename_i x hx
          refine ⟨rfl, rfl, rfl, rfl, rfl, ?_⟩
          intro y hy hh
          simp only [List.mem_append, List.mem_singleton] at hy
          rcases hy with hy | rfl
          · exact hy
          · exfalso
            have hxe := prefillRecord_element hx
            simp only [Bool.or_eq_true, beq_iff_eq, not_or, Bool.not_eq_true] at hcond
            simp [Spec.isHumanOnly, hxe, hel, hcond.1.2] at hh
  · exact ⟨rfl, rfl, rfl, rfl, rfl, NoNewHumanOnly.refl _ _⟩

/-- Prefilling a list of fields changes only `captured`, and adds no human-only value. -/
theorem foldl_prefillField_frame (sp : Spec) (facts : Facts) (l : List Component) (s : State) :
    let s' := l.foldl (prefillField sp facts) s
    s'.commits = s.commits ∧ s'.acked = s.acked ∧ s'.receipts = s.receipts ∧
    s'.popup? = s.popup? ∧ s'.screen = s.screen ∧ NoNewHumanOnly sp s s' := by
  induction l generalizing s with
  | nil => exact ⟨rfl, rfl, rfl, rfl, rfl, NoNewHumanOnly.refl _ _⟩
  | cons c rest ih =>
    obtain ⟨h1, h2, h3, h4, h5, h6⟩ := prefillField_frame sp facts s c
    obtain ⟨i1, i2, i3, i4, i5, i6⟩ := ih (prefillField sp facts s c)
    exact ⟨i1.trans h1, i2.trans h2, i3.trans h3, i4.trans h4, i5.trans h5, h6.trans i6⟩

/-- Prefilling a screen changes only `captured`, and adds no human-only value. -/
theorem prefillScreen_frame (sp : Spec) (prog : Program) (facts : Facts) (s : State) :
    let s' := prefillScreen sp prog facts s
    s'.commits = s.commits ∧ s'.acked = s.acked ∧ s'.receipts = s.receipts ∧
    s'.popup? = s.popup? ∧ s'.screen = s.screen ∧ NoNewHumanOnly sp s s' :=
  foldl_prefillField_frame sp facts _ s

theorem prefillScreen_safe (sp : Spec) (prog : Program) (facts : Facts) (s : State) :
    MacroSafe sp s (prefillScreen sp prog facts s) :=
  let h := prefillScreen_frame sp prog facts s
  ⟨h.1, h.2.1, h.2.2.1, h.2.2.2.2.2⟩

theorem prefillScreen_safe_of {sp : Spec} {prog : Program} {facts : Facts} {s s₁ : State}
    (h : MacroSafe sp s s₁) : MacroSafe sp s (prefillScreen sp prog facts s₁) :=
  h.trans (prefillScreen_safe sp prog facts s₁)

theorem prefillScreen_popup (sp : Spec) (prog : Program) (facts : Facts) (s : State) :
    (prefillScreen sp prog facts s).popup? = s.popup? :=
  (prefillScreen_frame sp prog facts s).2.2.2.1

/-! ## Navigation -/

theorem goTo_safe (sp : Spec) (prog : Program) (facts : Facts) (s : State) (t : ScreenId) :
    MacroSafe sp s (goTo sp prog facts s t).1 := by
  unfold goTo
  split
  · exact MacroSafe.refl _ _
  · exact prefillScreen_safe_of (MacroSafe.of_eq rfl rfl rfl rfl)

theorem goTo_popup (sp : Spec) (prog : Program) (facts : Facts) (s : State) (t : ScreenId) :
    (goTo sp prog facts s t).1.popup? = s.popup? := by
  unfold goTo
  split
  · rfl
  · exact prefillScreen_popup sp prog facts _

theorem goBack_safe (sp : Spec) (prog : Program) (facts : Facts) (s : State) :
    MacroSafe sp s (goBack sp prog facts s).1 := by
  unfold goBack
  split
  · exact MacroSafe.refl _ _
  · exact prefillScreen_safe_of (MacroSafe.of_eq rfl rfl rfl rfl)

theorem goBack_popup (sp : Spec) (prog : Program) (facts : Facts) (s : State) :
    (goBack sp prog facts s).1.popup? = s.popup? := by
  unfold goBack
  split
  · rfl
  · exact prefillScreen_popup sp prog facts _

end Ehr.Proofs
