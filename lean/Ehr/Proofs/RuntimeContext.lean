import Ehr.Proofs.RuntimeModel

/-! The interpreter step never changes the patient-selection context
(`State.patientContext?`). Only `Workspace.bind`, `Workspace.step` and
`Workspace.init` write it. So a chart stays bound to its patient for as long as
events go to the interpreter. Every theorem here is a new specification for
owner review, outside Comparator. -/

namespace Ehr.Runtime
open Ehr

/-- Prefilling one field keeps the patient context. -/
theorem prefillField_context (sp facts s comp) :
    (prefillField sp facts s comp).patientContext? = s.patientContext? := by
  unfold prefillField
  repeat' (first | rfl | split | dsimp only)

/-- Prefilling a list of fields keeps the patient context. -/
theorem prefillFold_context (sp : Spec) (facts : Facts) (cs : List Component) (s : State) :
    (cs.foldl (prefillField sp facts) s).patientContext? = s.patientContext? := by
  induction cs generalizing s with
  | nil => rfl
  | cons comp cs ih => exact (ih _).trans (prefillField_context sp facts s comp)

/-- Prefilling a screen keeps the patient context. -/
theorem prefillScreen_context (sp prog facts s) :
    (prefillScreen sp prog facts s).patientContext? = s.patientContext? :=
  prefillFold_context sp facts _ s

/-- Navigation to a screen keeps the patient context. -/
theorem goTo_context (sp prog facts s target) :
    (goTo sp prog facts s target).1.patientContext? = s.patientContext? := by
  unfold goTo
  split
  · rfl
  · exact prefillScreen_context sp prog facts _

/-- Back navigation keeps the patient context. -/
theorem goBack_context (sp prog facts s) :
    (goBack sp prog facts s).1.patientContext? = s.patientContext? := by
  unfold goBack
  split
  · rfl
  · exact prefillScreen_context sp prog facts _

/-- A click on a shown component keeps the patient context. -/
theorem clickCore_context (sp prog facts user actor s comp) :
    (clickCore sp prog facts user actor s comp).1.patientContext? = s.patientContext? := by
  unfold clickCore clickCommit clickAlert markReviewed requestPriorAuth
  repeat' (first
    | rfl
    | exact goTo_context ..
    | exact goBack_context ..
    | exact prefillScreen_context sp prog facts _
    | split
    | dsimp only)

/-- One event without macros keeps the patient context. -/
theorem stepCore_context (sp prog facts user actor s e) :
    (stepCore sp prog facts user actor s e).1.patientContext? = s.patientContext? := by
  unfold stepCore
  split
  · rfl
  · cases e <;> simp only [stepEvent]
    case click cid =>
      split
      · rfl
      · exact clickCore_context ..
    case selectTab cid idx => unfold selectTabCore; repeat' (first | rfl | split | dsimp only)
    case enter cid v => unfold enterCore; repeat' (first | rfl | split | dsimp only)
    case confirm cid => unfold confirmCore; repeat' (first | rfl | split | dsimp only)
    case ack a => unfold ackCore; repeat' (first | rfl | split | dsimp only)
    all_goals split <;> rfl

/-- One macro step keeps the patient context. -/
theorem macroStep_context (sp prog facts user s st) :
    (macroStep sp prog facts user s st).1.patientContext? = s.patientContext? := by
  cases st with
  | setValue cid str => exact stepCore_context ..
  | click cid => exact stepCore_context ..
  | goto target =>
    simp only [macroStep]
    split
    · rfl
    · exact goTo_context ..

/-- A macro run keeps the patient context. -/
theorem runMacro_context (sp prog facts user) (steps : List MacroStep) (i s) :
    (runMacro sp prog facts user i s steps).1.patientContext? = s.patientContext? := by
  induction steps generalizing i s with
  | nil => rfl
  | cons st steps ih =>
    have ht := macroStep_context sp prog facts user s st
    unfold runMacro
    split
    · rename_i t he
      rw [he] at ht
      exact (ih _ _).trans ht
    · rename_i t r hr he
      rw [he] at ht
      exact ht

/-- New specification for owner review: the interpreter step never changes
the patient-selection context, for either actor and every event. -/
theorem step_context (sp prog facts user actor s e) :
    (step sp prog facts user actor s e).1.patientContext? = s.patientContext? := by
  unfold step
  split
  · split
    · exact runMacro_context ..
    · exact stepCore_context ..
  · exact stepCore_context ..

/-- The core initial state has no patient context. -/
theorem init_context (sp prog facts user) :
    (init sp prog facts user).patientContext? = none :=
  prefillScreen_context sp prog facts _

/-- New specification for owner review: whether a chart is bound depends on
the state only through its patient context. -/
theorem bound_of_context (f : Facts) {s t : State}
    (h : s.patientContext? = t.patientContext?) : Workspace.bound f s = Workspace.bound f t := by
  simp only [Workspace.bound, h]

#print axioms prefillField_context
#print axioms prefillFold_context
#print axioms prefillScreen_context
#print axioms goTo_context
#print axioms goBack_context
#print axioms clickCore_context
#print axioms stepCore_context
#print axioms macroStep_context
#print axioms runMacro_context
#print axioms step_context
#print axioms init_context
#print axioms bound_of_context
end Ehr.Runtime
