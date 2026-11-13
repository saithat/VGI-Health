import Ehr.Check.GuardSound

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Proofs

/-- The current screen and every back-stack entry name program screens. -/
def ScreenNames (p : Program) (s : State) : Prop :=
  (p.screen? s.screen).isSome = true ∧
  ∀ z ∈ s.history, (p.screen? z).isSome = true

/-- Prefilling one field preserves valid current-screen and back-stack names. -/
theorem prefillField_names (sp p f s c) (h : ScreenNames p s) :
    ScreenNames p (prefillField sp f s c) := by
  unfold prefillField
  repeat' (first | exact h | split | (dsimp only; exact h) | dsimp only)

/-- Prefilling the current screen preserves valid screen and back-stack names. -/
theorem prefillScreen_names (sp p f s) (h : ScreenNames p s) :
    ScreenNames p (prefillScreen sp p f s) := by
  unfold prefillScreen
  generalize p.compsOf s.screen = cs
  induction cs generalizing s with
  | nil => exact h
  | cons c cs ih => exact ih _ (prefillField_names sp p f s c h)

/-- Successful or ignored navigation preserves valid screen and back-stack names. -/
theorem goTo_names (sp p f s z) (h : ScreenNames p s) :
    ScreenNames p (goTo sp p f s z).1 := by
  unfold goTo
  split
  · exact h
  · rename_i sc hz
    apply prefillScreen_names
    exact ⟨by simp [hz], by simpa using And.intro h.1 h.2⟩

/-- Returning through a valid back stack preserves valid screen names. -/
theorem goBack_names (sp p f s) (h : ScreenNames p s) :
    ScreenNames p (goBack sp p f s).1 := by
  unfold goBack
  split
  · exact h
  · rename_i z zs hs
    apply prefillScreen_names
    exact ⟨h.2 z (by simp [hs]), fun x hx => h.2 x (by simp [hs, hx])⟩

/-- A commit click preserves valid current-screen and back-stack names. -/
theorem clickCommit_names (sp p f u s c) (h : ScreenNames p s) :
    ScreenNames p (clickCommit sp p f u s c).1 := by
  unfold clickCommit
  repeat' (first | exact h | split | (dsimp only; exact h) | dsimp only)

/-- Creating a review receipt preserves valid screen and back-stack names. -/
theorem markReviewed_names (sp p f u s i) (h : ScreenNames p s) :
    ScreenNames p (markReviewed sp p f u s i).1 := by
  unfold markReviewed
  repeat' (first | exact h | split | (dsimp only; exact h) | dsimp only)

/-- A prior-authorization request preserves valid screen and back-stack names. -/
theorem requestPriorAuth_names (sp p u actor s) (h : ScreenNames p s) :
    ScreenNames p (requestPriorAuth sp u actor s).1 := by
  unfold requestPriorAuth
  repeat' (first | exact h | split | (dsimp only; exact h) | dsimp only)

/-- Opening an alert preserves valid screen and back-stack names. -/
theorem clickAlert_names (sp p f s a) (h : ScreenNames p s) :
    ScreenNames p (clickAlert sp p f s a).1 := by
  unfold clickAlert
  repeat' (first | exact h | split | (dsimp only; exact h) | dsimp only)

/-- Every non-macro button action preserves valid screen and back-stack names. -/
theorem clickCore_names (sp p f u actor s c) (h : ScreenNames p s) :
    ScreenNames p (clickCore sp p f u actor s c).1 := by
  unfold clickCore
  split
  · cases actor
    · exact clickAlert_names _ _ _ _ _ h
    · exact h
  · exact goTo_names _ _ _ _ _ h
  · exact goBack_names _ _ _ _ h
  · cases actor
    · exact clickCommit_names _ _ _ _ _ _ h
    · exact h
  · cases actor
    · exact markReviewed_names _ _ _ _ _ _ h
    · exact h
  · split
    · exact prefillScreen_names _ _ _ _ h
    · exact h
  · exact requestPriorAuth_names _ _ _ _ _ h
  · exact h
  · cases actor <;> exact h
  · exact h

/-- Entering a field value preserves valid screen and back-stack names. -/
theorem enterCore_names (sp p f u actor s cid v) (h : ScreenNames p s) :
    ScreenNames p (enterCore sp p f u actor s cid v).1 := by
  unfold enterCore
  split
  · unfold ScreenNames at h ⊢
    rw [reconcileCore_screen, (reconcileCore_frame sp u actor s cid v).2.2.2.2.2.1]
    exact h
  repeat' (first | exact h | split | (dsimp only; exact h) | dsimp only)

/-- Confirming a field preserves valid screen and back-stack names. -/
theorem confirmCore_names (sp p f u actor s cid) (h : ScreenNames p s) :
    ScreenNames p (confirmCore sp p f u actor s cid).1 := by
  unfold confirmCore
  repeat' (first | exact h | split | (dsimp only; exact h) | dsimp only)

/-- Acknowledging a popup preserves valid screen and back-stack names. -/
theorem ackCore_names (p actor s a) (h : ScreenNames p s) :
    ScreenNames p (ackCore actor s a).1 := by
  unfold ackCore
  repeat' (first | exact h | split | (dsimp only; exact h) | dsimp only)

/-- Selecting a tab preserves valid screen and back-stack names. -/
theorem selectTabCore_names (sp p f s cid idx) (h : ScreenNames p s) :
    ScreenNames p (selectTabCore sp p f s cid idx).1 := by
  unfold selectTabCore
  repeat' (first | exact h | split | (dsimp only; exact h) | dsimp only)

/-- A core event preserves valid screen and back-stack names. -/
theorem stepCore_names (sp p f u actor s e) (h : ScreenNames p s) :
    ScreenNames p (stepCore sp p f u actor s e).1 := by
  unfold stepCore
  split
  · exact h
  · cases e with
    | click cid =>
      simp only [stepEvent]
      split
      · exact h
      · exact clickCore_names _ _ _ _ _ _ _ h
    | enter cid v => exact enterCore_names _ _ _ _ _ _ _ _ h
    | confirm cid => exact confirmCore_names _ _ _ _ _ _ _ h
    | ack a => exact ackCore_names _ _ _ _ h
    | selectTab cid idx => exact selectTabCore_names _ _ _ _ _ _ h
    | scroll z => simp only [stepEvent]; split <;> exact h
    | search q => simp only [stepEvent]; split <;> exact h

/-- One macro action preserves valid screen and back-stack names. -/
theorem macroStep_names (sp p f u s st) (h : ScreenNames p s) :
    ScreenNames p (macroStep sp p f u s st).1 := by
  cases st with
  | setValue cid v => exact stepCore_names _ _ _ _ _ _ _ h
  | click cid => exact stepCore_names _ _ _ _ _ _ _ h
  | goto z => simp only [macroStep]; split; exact h; exact goTo_names _ _ _ _ _ h

/-- A complete or stopped macro preserves valid screen and back-stack names. -/
theorem runMacro_names (sp p f u) (steps : List MacroStep) (i s)
    (h : ScreenNames p s) : ScreenNames p (runMacro sp p f u i s steps).1 := by
  induction steps generalizing i s with
  | nil => exact h
  | cons st rest ih =>
    have ht := macroStep_names sp p f u s st h
    unfold runMacro
    split
    · rename_i t he; rw [he] at ht; exact ih _ _ ht
    · rename_i t r hr he; rw [he] at ht; exact ht

/-- The public interpreter step preserves valid screen and back-stack names. -/
theorem step_names (sp p f u actor s e) (h : ScreenNames p s) :
    ScreenNames p (step sp p f u actor s e).1 := by
  unfold step
  split
  · split
    · exact runMacro_names _ _ _ _ _ _ _ h
    · exact stepCore_names _ _ _ _ _ _ _ h
  · exact stepCore_names _ _ _ _ _ _ _ h

/-- Every reachable state has a valid screen and back stack. -/
theorem reachable_screenNames (ep : Episode)
    (hstart : (ep.prog.screen? ep.prog.start).isSome = true) :
    Always ep (ScreenNames ep.prog) := by
  intro s hs
  induction hs with
  | start => exact prefillScreen_names _ _ _ _ ⟨hstart, by simp⟩
  | step actor e _ ih => exact step_names _ _ _ _ _ _ _ ih
  | wait d _ ih => exact ih

#print axioms reachable_screenNames
end Ehr.Check
