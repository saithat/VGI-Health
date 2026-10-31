import Ehr.Proofs.Frame

/-!
# T3: human-only steps are never automated

A macro runs as `Actor.macro`. Whatever event a macro step sends, and whatever
the program, the spec, and the state are, the step:
- does not commit (the list of commits is unchanged);
- does not acknowledge an alert (the list of acknowledged alerts is unchanged);
- does not create a review receipt;
- does not capture a value for a human-only element (marked `humanOnly`, or of
  kind `identity`, `scan`, or `cosign`).

The same holds for a whole macro run started by a human click.
-/

namespace Ehr.Proofs

open Ehr

/-- A macro's prior-auth request captures only the (non-human-only) request
element. -/
theorem requestPriorAuth_macro_safe (sp : Spec) (user : User) (s : State) :
    MacroSafe sp s (requestPriorAuth sp user .«macro» s).1 := by
  unfold requestPriorAuth
  split
  · exact MacroSafe.refl _ _
  · rename_i el hel
    split
    · exact MacroSafe.refl _ _
    · split
      · exact MacroSafe.refl _ _
      · split
        · exact MacroSafe.refl _ _
        · dsimp only
          split
          · exact MacroSafe.refl _ _
          · rename_i hnh
            refine ⟨rfl, rfl, rfl, ?_⟩
            intro y hy hh
            simp only [setCaptured, List.mem_append, List.mem_filter, List.mem_singleton] at hy
            rcases hy with ⟨hy, _⟩ | rfl
            · exact hy
            · exfalso
              simp only [Bool.or_eq_true, beq_iff_eq, not_or, Bool.not_eq_true] at hnh
              simp [Spec.isHumanOnly, hel, hnh.1] at hh

theorem clickCore_macro_safe (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (s : State) (c : Component) : MacroSafe sp s (clickCore sp prog facts user .«macro» s c).1 := by
  unfold clickCore
  split
  · exact MacroSafe.refl _ _
  · exact goTo_safe ..
  · exact goBack_safe ..
  · exact MacroSafe.refl _ _
  · exact MacroSafe.refl _ _
  · split
    · exact prefillScreen_safe_of (MacroSafe.of_eq rfl rfl rfl rfl)
    · exact MacroSafe.refl _ _
  · exact requestPriorAuth_macro_safe ..
  · exact MacroSafe.of_eq rfl rfl rfl rfl
  · exact MacroSafe.refl _ _
  · exact MacroSafe.refl _ _

theorem enterCore_macro_safe (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (s : State) (cid : CompId) (v : Value) :
    MacroSafe sp s (enterCore sp prog facts user .«macro» s cid v).1 := by
  unfold enterCore
  split
  · exact MacroSafe.refl _ _
  · split
    · rename_i e slot _ _
      split
      · exact MacroSafe.refl _ _
      · rename_i el hel
        split
        · exact MacroSafe.refl _ _
        · dsimp only
          split
          · exact MacroSafe.refl _ _
          · rename_i hnh
            split
            · exact MacroSafe.refl _ _
            · refine ⟨rfl, rfl, rfl, ?_⟩
              intro y hy hh
              simp only [setCaptured, List.mem_append, List.mem_filter, List.mem_singleton] at hy
              rcases hy with ⟨hy, _⟩ | rfl
              · exact hy
              · exfalso
                simp only [Bool.or_eq_true, beq_iff_eq, not_or, Bool.not_eq_true] at hnh
                simp [Spec.isHumanOnly, hel, hnh.1] at hh
    · exact MacroSafe.refl _ _

theorem selectTabCore_safe (sp : Spec) (prog : Program) (facts : Facts) (s : State)
    (cid : CompId) (idx : Nat) : MacroSafe sp s (selectTabCore sp prog facts s cid idx).1 := by
  unfold selectTabCore
  split
  · split
    · exact MacroSafe.of_eq rfl rfl rfl rfl
    · exact MacroSafe.refl _ _
  · exact MacroSafe.refl _ _

/-- One macro event (without running macros) is safe. -/
theorem stepCore_macro_safe (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (s : State) (e : Event) : MacroSafe sp s (stepCore sp prog facts user .«macro» s e).1 := by
  unfold stepCore
  split
  · exact MacroSafe.refl _ _
  · cases e with
    | click cid =>
      simp only [stepEvent]
      split
      · exact MacroSafe.refl _ _
      · exact clickCore_macro_safe ..
    | selectTab cid idx => exact selectTabCore_safe ..
    | enter cid v => exact enterCore_macro_safe ..
    | confirm cid => exact MacroSafe.refl _ _
    | ack a => exact MacroSafe.refl _ _
    | scroll scr =>
      simp only [stepEvent]
      split <;> exact MacroSafe.refl _ _
    | search q =>
      simp only [stepEvent]
      split <;> exact MacroSafe.refl _ _

/-- One macro step is safe. -/
theorem macroStep_safe (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (s : State) (st : MacroStep) : MacroSafe sp s (macroStep sp prog facts user s st).1 := by
  cases st with
  | setValue cid str => exact stepCore_macro_safe ..
  | click cid => exact stepCore_macro_safe ..
  | goto t =>
    simp only [macroStep]
    split
    · exact MacroSafe.refl _ _
    · exact goTo_safe ..

/-- A whole macro run is safe. -/
theorem runMacro_safe (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (steps : List MacroStep) : ∀ (i : Nat) (s : State),
    MacroSafe sp s (runMacro sp prog facts user i s steps).1 := by
  induction steps with
  | nil => intro i s; exact MacroSafe.refl _ _
  | cons st rest ih =>
    intro i s
    have h := macroStep_safe sp prog facts user s st
    unfold runMacro
    split
    · rename_i s' heq
      rw [heq] at h
      exact h.trans (ih _ _)
    · rename_i s' r _ heq
      rw [heq] at h
      exact h

/-- **T3 (one macro step).** Any event sent as `Actor.macro`: commits, acks,
and receipts stay the same, and every captured value of a human-only element
afterwards was already captured before. -/
theorem T3_macro_step (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (s : State) (e : Event) :
    let s' := (step sp prog facts user .«macro» s e).1
    s'.commits = s.commits ∧ s'.acked = s.acked ∧ s'.receipts = s.receipts ∧
    (∀ x ∈ s'.captured, sp.isHumanOnly x.element = true → x ∈ s.captured) := by
  have h : MacroSafe sp s (step sp prog facts user .«macro» s e).1 := by
    unfold step
    exact stepCore_macro_safe ..
  exact ⟨h.commits, h.acked, h.receipts, h.humanOnly⟩

/-- **T3 (a macro run).** A human clicks a macro button, and the macro runs.
The same four facts hold for the whole run. -/
theorem T3_macro_run (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (s : State) (cid : CompId) (mac : Macro)
    (hmac : clickedMacro? sp prog facts s cid = some mac) (hpop : s.popup? = none) :
    let s' := (step sp prog facts user .human s (.click cid)).1
    s'.commits = s.commits ∧ s'.acked = s.acked ∧ s'.receipts = s.receipts ∧
    (∀ x ∈ s'.captured, sp.isHumanOnly x.element = true → x ∈ s.captured) := by
  have h : MacroSafe sp s (step sp prog facts user .human s (.click cid)).1 := by
    simp only [step, hpop, hmac]
    exact runMacro_safe ..
  exact ⟨h.commits, h.acked, h.receipts, h.humanOnly⟩

/-- **T3 (prefill).** Prefilling a screen (done on every screen entry, by a
human or a macro) never captures a value for a human-only element. -/
theorem T3_prefill_never_human_only (sp : Spec) (prog : Program) (facts : Facts) (s : State) :
    ∀ x ∈ (prefillScreen sp prog facts s).captured, sp.isHumanOnly x.element = true →
      x ∈ s.captured :=
  (prefillScreen_frame sp prog facts s).2.2.2.2.2

end Ehr.Proofs
