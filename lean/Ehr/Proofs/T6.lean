import Ehr.Proofs.T3
import Ehr.Examples.TinyTests

/-!
T6: macros run their steps in order and stop at the first failure.
Their state and result match the reference in Ehr.Props.Defs.
T3 also gives the whole macro run the same human-only action limits.
-/

namespace Ehr.Proofs

open Ehr Ehr.Props

/-- A step with `actor := macro` is `stepCore` (macros never start macros). -/
theorem step_macro (sp : Spec) (prog : Program) (facts : Facts) (user : User) (s : State)
    (e : Event) : step sp prog facts user .«macro» s e = stepCore sp prog facts user .«macro» s e := by
  cases e <;> rfl

/-- The interpreter's macro step is the reference step. -/
theorem macroStep_eq_macroAct (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (s : State) (st : MacroStep) : macroStep sp prog facts user s st = macroAct sp prog facts user s st := by
  cases st <;> simp [macroStep, macroAct, step_macro]

/-- **T6 (macros are their expansion).** Running a macro's steps gives the
same state as the reference run; its result is `ok` exactly when the reference does
not stop; and when the reference stops at step `j` with result `r`, the macro's
result is `blocked (macroStopReason j r)`. -/
theorem T6_macro_is_fold (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (steps : List MacroStep) : ∀ (i : Nat) (s : State),
    (runMacro sp prog facts user i s steps).1 = (foldMacro sp prog facts user i s steps).1 ∧
    ((foldMacro sp prog facts user i s steps).2 = none →
      (runMacro sp prog facts user i s steps).2 = .ok) ∧
    (∀ j r, (foldMacro sp prog facts user i s steps).2 = some (j, r) →
      (runMacro sp prog facts user i s steps).2 = .blocked (macroStopReason j r)) := by
  induction steps with
  | nil => intro i s; simp [runMacro, foldMacro]
  | cons st rest ih =>
    intro i s
    have h := macroStep_eq_macroAct sp prog facts user s st
    simp only [runMacro, foldMacro, h]
    generalize macroAct sp prog facts user s st = p
    obtain ⟨s', r⟩ := p
    cases r with
    | ok => exact ih _ _
    | blocked why =>
      refine ⟨rfl, by simp, ?_⟩
      intro j r' hj
      simp only [Option.some.injEq, Prod.mk.injEq] at hj
      obtain ⟨rfl, rfl⟩ := hj
      rfl
    | ignored =>
      refine ⟨rfl, by simp, ?_⟩
      intro j r' hj
      simp only [Option.some.injEq, Prod.mk.injEq] at hj
      obtain ⟨rfl, rfl⟩ := hj
      rfl

/-- The macro result is `ok` exactly when the reference run does not stop. -/
theorem runMacro_ok_iff (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (steps : List MacroStep) (i : Nat) (s : State) :
    (runMacro sp prog facts user i s steps).2 = .ok ↔
      (foldMacro sp prog facts user i s steps).2 = none := by
  obtain ⟨_, hnone, hsome⟩ := T6_macro_is_fold sp prog facts user steps i s
  constructor
  · intro hok
    cases hf : (foldMacro sp prog facts user i s steps).2 with
    | none => rfl
    | some p =>
      obtain ⟨j, r⟩ := p
      rw [hsome j r hf] at hok
      cases hok
  · exact hnone

/-- Each reference step is safe, by T3 (one macro step) and `goTo_safe`. -/
theorem macroAct_safe (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (s : State) (st : MacroStep) : MacroSafe sp s (macroAct sp prog facts user s st).1 := by
  cases st with
  | setValue cid str =>
    obtain ⟨h1, h2, h3, h4⟩ := T3_macro_step sp prog facts user s
      (.enter cid (macroValue sp prog facts s cid str))
    exact ⟨h1, h2, h3, h4⟩
  | click cid =>
    obtain ⟨h1, h2, h3, h4⟩ := T3_macro_step sp prog facts user s (.click cid)
    exact ⟨h1, h2, h3, h4⟩
  | goto t =>
    simp only [macroAct]
    split
    · exact MacroSafe.refl _ _
    · exact goTo_safe ..

/-- The reference run is safe. -/
theorem foldMacro_safe (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (steps : List MacroStep) : ∀ (i : Nat) (s : State),
    MacroSafe sp s (foldMacro sp prog facts user i s steps).1 := by
  induction steps with
  | nil => intro i s; exact MacroSafe.refl _ _
  | cons st rest ih =>
    intro i s
    have h := macroAct_safe sp prog facts user s st
    unfold foldMacro
    split
    · rename_i s' heq
      rw [heq] at h
      exact h.trans (ih _ _)
    · rename_i s' r _ heq
      rw [heq] at h
      exact h

/-- **T6 (safety).** A macro run, started by a human click on a macro button,
ends with the same commits, acknowledged alerts, and receipts as before, and
with no newly captured value for a human-only element. Proved from T6 and T3. -/
theorem T6_macro_run_safe (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (s : State) (cid : CompId) (mac : Macro)
    (hmac : clickedMacro? sp prog facts s cid = some mac) (hpop : s.popup? = none) :
    let s' := (step sp prog facts user .human s (.click cid)).1
    s'.commits = s.commits ∧ s'.acked = s.acked ∧ s'.receipts = s.receipts ∧
    (∀ x ∈ s'.captured, sp.isHumanOnly x.element = true → x ∈ s.captured) := by
  have hrun : (step sp prog facts user .human s (.click cid)).1 =
      (foldMacro sp prog facts user 0 s mac.steps).1 := by
    simp only [step, hpop, hmac]
    exact (T6_macro_is_fold sp prog facts user mac.steps 0 s).1
  have h := foldMacro_safe sp prog facts user mac.steps 0 s
  rw [← hrun] at h
  exact ⟨h.commits, h.acked, h.receipts, h.humanOnly⟩

/-! ## The hypotheses are satisfiable -/

section Examples
open Ehr.Examples.Tiny Ehr.Examples.TinyTests

/-- On the tiny example, the amoxicillin macro's reference run stops at step 3
(typing the patient ID), and the click's result is the matching message. -/
theorem tiny_macro_stops_at_identity : (foldMacro spec program facts user 0 atOrder amoxMacro.steps).2 =
      some (3, .blocked "human only: patientIdReentry") ∧
    (step spec program facts user .human atOrder (.click "quickAmox")).2 =
      .blocked (macroStopReason 3 (.blocked "human only: patientIdReentry")) := by
  decide

/-- A macro without a human-only step runs to the end with result `ok`. -/
theorem tiny_safe_macro_prefix_succeeds : (runMacro spec program facts user 0 atOrder (amoxMacro.steps.take 3)).2 = .ok ∧
    (foldMacro spec program facts user 0 atOrder (amoxMacro.steps.take 3)).2 = none := by
  decide

end Examples

end Ehr.Proofs
