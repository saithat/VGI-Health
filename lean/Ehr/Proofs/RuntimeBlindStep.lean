import Ehr.Proofs.RuntimeBlind

/-! The interpreter step and the screen view do not read the two critical-result
workflow fields, and the step carries them through unchanged. Every definition
and theorem here is a new specification for owner review, outside Comparator. -/

namespace Ehr.Runtime
open Ehr

/-- New specification for owner review: an interpreter output whose state has
its critical workflow fields replaced. -/
def liftCritical (o : State × StepResult) (c : Option (List Multi.Critical.Ticket))
    (d : Option (List CriticalDraft)) : State × StepResult :=
  (withCritical o.1 c d, o.2)

/-- Slot resolution does not read the critical fields. -/
@[simp] theorem resolveSlot_critical (s c d sl) :
    resolveSlot (withCritical s c d) sl = resolveSlot s sl := by
  cases sl <;> rfl

/-- Capture lookup does not read the critical fields. -/
@[simp] theorem hasEntry_critical (s c d e n) :
    hasEntry (withCritical s c d) e n = hasEntry s e n := rfl

/-- Prefill values do not read the critical fields. -/
@[simp] theorem prefillRecord_critical (facts s c d e el n pf) :
    prefillRecord facts (withCritical s c d) e el n pf = prefillRecord facts s e el n pf := by
  cases pf <;> rfl

/-- Prefilling one field carries the critical fields through. -/
theorem prefillField_critical (sp facts s comp c d) :
    prefillField sp facts (withCritical s c d) comp = withCritical (prefillField sp facts s comp) c d := by
  cases hk : comp.kind <;> simp only [prefillField, hk]
  all_goals try rfl
  all_goals simp only [hasEntry_critical, resolveSlot_critical, prefillValueValid,
    prefillRecord_critical, elementValueValid_critical]
  all_goals repeat' first | rfl | (split <;> try simp_all)

/-- Prefilling a list of fields carries the critical fields through. -/
theorem prefillFold_critical (sp : Spec) (facts : Facts) (cs : List Component) (s : State) (c d) :
    cs.foldl (prefillField sp facts) (withCritical s c d) =
      withCritical (cs.foldl (prefillField sp facts) s) c d := by
  induction cs generalizing s with
  | nil => rfl
  | cons comp cs ih => simp only [List.foldl_cons, prefillField_critical, ih]

/-- Prefilling a screen carries the critical fields through. -/
@[simp] theorem prefillScreen_critical (sp prog facts s c d) :
    prefillScreen sp prog facts (withCritical s c d) = withCritical (prefillScreen sp prog facts s) c d :=
  prefillFold_critical sp facts (prog.compsOf s.screen) s c d

/-- Navigation to a screen carries the critical fields through. -/
theorem goTo_critical (sp prog facts s target c d) :
    goTo sp prog facts (withCritical s c d) target = liftCritical (goTo sp prog facts s target) c d := by
  cases ht : prog.screen? target with
  | none => simp only [goTo, ht]; rfl
  | some sc =>
    simp only [goTo, ht, liftCritical]
    exact congrArg (fun x => (x, StepResult.ok))
      (prefillScreen_critical sp prog facts { s with screen := target, history := s.screen :: s.history } c d)

/-- Back navigation carries the critical fields through. -/
theorem goBack_critical (sp prog facts s c d) :
    goBack sp prog facts (withCritical s c d) = liftCritical (goBack sp prog facts s) c d := by
  cases hh : s.history with
  | nil =>
    have hw : (withCritical s c d).history = [] := hh
    simp only [goBack, hh, hw]
    rfl
  | cons h t =>
    have hw : (withCritical s c d).history = h :: t := hh
    simp only [goBack, hh, hw, liftCritical]
    exact congrArg (fun x => (x, StepResult.ok))
      (prefillScreen_critical sp prog facts { s with screen := h, history := t } c d)

/-- Opening an alert carries the critical fields through. -/
theorem clickAlert_critical (sp prog facts s a c d) :
    clickAlert sp prog facts (withCritical s c d) a = liftCritical (clickAlert sp prog facts s a) c d := by
  simp only [clickAlert, popupCandidates_critical]
  repeat' first | rfl | (split <;> try simp_all)

/-- The per-line completeness check does not read the critical fields. -/
@[simp] theorem currentLineComplete_critical (sp facts user s c d) :
    currentLineComplete sp facts user (withCritical s c d) = currentLineComplete sp facts user s := by
  simp only [currentLineComplete, lineMatches_critical, elementValueValid_critical]
  rfl

/-- A click on a shown component carries the critical fields through. -/
theorem clickCore_critical (sp prog facts user actor s comp c d) :
    clickCore sp prog facts user actor (withCritical s c d) comp =
      liftCritical (clickCore sp prog facts user actor s comp) c d := by
  cases hk : comp.kind with
  | alert a popup =>
    simp only [clickCore, hk]
    cases actor
    · exact clickAlert_critical sp prog facts s a c d
    · rfl
  | button action =>
    cases action with
    | goto target => simpa only [clickCore, hk] using goTo_critical sp prog facts s target c d
    | back => simpa only [clickCore, hk] using goBack_critical sp prog facts s c d
    | commit cm =>
      simp only [clickCore, hk]
      cases actor <;> simp only [clickCommit, guardBase_critical, guardReason_critical,
        popupCandidates_critical, alertsAcked_critical, withCritical_commits]
      all_goals repeat' first | rfl | (split <;> try simp_all)
    | markReviewed i =>
      simp only [clickCore, hk]
      cases actor <;> simp only [markReviewed, infoShown_critical]
      all_goals repeat' first | rfl | (split <;> try simp_all)
    | newOrderLine =>
      simp only [clickCore, hk, currentLineComplete_critical]
      by_cases hh : currentLineComplete sp facts user s = true
      · simp only [hh, ite_true, liftCritical]
        exact congrArg (fun x => (x, StepResult.ok))
          (prefillScreen_critical sp prog facts { s with currentSlot := s.currentSlot + 1 } c d)
      · simp only [hh]; rfl
    | requestPriorAuth =>
      simp only [clickCore, hk]
      cases actor <;> simp only [requestPriorAuth, priorAuthCaptured, hasOrderAt, serviceOrderAt,
        orderLines, withCritical_captured, withCritical_slot]
      all_goals repeat' first | rfl | (split <;> try simp_all)
  | group collapsible start => simp only [clickCore, hk]; cases collapsible <;> rfl
  | «macro» mid => simp only [clickCore, hk]; cases actor <;> rfl
  | _ => simp only [clickCore, hk]; rfl

/-- A reconciliation decision carries the critical fields through. -/
theorem reconcileCore_critical (sp user actor s cid v c d) :
    reconcileCore sp user actor (withCritical s c d) cid v =
      liftCritical (reconcileCore sp user actor s cid v) c d := by
  have hs : reconcileSlots (withCritical s c d) = reconcileSlots s := rfl
  unfold reconcileCore
  rw [hs]
  cases actor <;> simp only [withCritical_captured]
  all_goals repeat' first | rfl | (split <;> try simp_all [liftCritical, withCritical])

/-- A field entry carries the critical fields through. -/
theorem enterCore_critical (sp prog facts user actor s cid v c d) :
    enterCore sp prog facts user actor (withCritical s c d) cid v =
      liftCritical (enterCore sp prog facts user actor s cid v) c d := by
  simp only [enterCore, shownComp_critical]
  cases actor <;> simp only [resolveSlot_critical, withCritical_captured, elementValueValid_critical]
  all_goals repeat' first | rfl | exact reconcileCore_critical .. | (split <;> try simp_all)

/-- A confirmation carries the critical fields through. -/
theorem confirmCore_critical (sp prog facts user actor s cid c d) :
    confirmCore sp prog facts user actor (withCritical s c d) cid =
      liftCritical (confirmCore sp prog facts user actor s cid) c d := by
  cases actor <;> simp only [confirmCore, shownComp_critical, resolveSlot_critical, withCritical_captured]
  all_goals repeat' first | rfl | (split <;> try simp_all)

/-- A tab selection carries the critical fields through. -/
theorem selectTab_critical (sp prog facts s cid idx c d) :
    selectTabCore sp prog facts (withCritical s c d) cid idx =
      liftCritical (selectTabCore sp prog facts s cid idx) c d := by
  simp only [selectTabCore, shownComp_critical]
  split <;> try rfl
  split <;> rfl

/-- One event without macros carries the critical fields through. -/
theorem stepCore_critical (sp prog facts user actor s e c d) :
    stepCore sp prog facts user actor (withCritical s c d) e =
      liftCritical (stepCore sp prog facts user actor s e) c d := by
  unfold stepCore
  by_cases hp : (s.popup?.isSome && !e.isAck) = true
  · simp only [withCritical_popup, hp, ite_true]; rfl
  simp only [withCritical_popup, hp]
  cases e <;> simp only [stepEvent, shownComp_critical]
  next cid =>
    cases hc : shownComp? sp prog facts s cid with
    | none => rfl
    | some comp => exact clickCore_critical sp prog facts user actor s comp c d
  next cid idx => exact selectTab_critical sp prog facts s cid idx c d
  next cid v => exact enterCore_critical sp prog facts user actor s cid v c d
  next cid => exact confirmCore_critical sp prog facts user actor s cid c d
  next a =>
    cases actor <;> simp only [ackCore, withCritical_popup]
    all_goals repeat' first | rfl | (split <;> try simp_all)
  next scr => simp only [withCritical_screen]; repeat' first | rfl | (split <;> try simp_all)
  next query =>
    have hs : searchShown sp prog facts (withCritical s c d) = searchShown sp prog facts s := by
      simp only [searchShown, compShown_critical]; rfl
    rw [hs]; repeat' first | rfl | (split <;> try simp_all)

/-- A macro's entered value does not read the critical fields. -/
@[simp] theorem macroValue_critical (sp prog facts s cid str c d) :
    macroValue sp prog facts (withCritical s c d) cid str = macroValue sp prog facts s cid str := by
  simp only [macroValue, shownComp_critical]
  rfl

/-- One macro step carries the critical fields through. -/
theorem macroStep_critical (sp prog facts user s st c d) :
    macroStep sp prog facts user (withCritical s c d) st =
      liftCritical (macroStep sp prog facts user s st) c d := by
  cases st with
  | setValue cid str =>
    simp only [macroStep, macroValue_critical]
    exact stepCore_critical sp prog facts user .macro s _ c d
  | click cid => exact stepCore_critical sp prog facts user .macro s _ c d
  | goto target =>
    simp only [macroStep, withCritical_popup]
    by_cases hp : s.popup?.isSome = true
    · simp only [hp, ite_true]; rfl
    · simp only [hp]; exact goTo_critical sp prog facts s target c d

/-- A macro run carries the critical fields through. -/
theorem runMacro_critical (sp prog facts user i steps s c d) :
    runMacro sp prog facts user i (withCritical s c d) steps =
      liftCritical (runMacro sp prog facts user i s steps) c d := by
  induction steps generalizing i s with
  | nil => rfl
  | cons st rest ih =>
    have hx := macroStep_critical sp prog facts user s st c d
    cases ha : macroStep sp prog facts user s st with
    | mk a ra =>
      rw [ha] at hx
      cases ra <;> simp only [runMacro, ha, hx, liftCritical]
      exact ih (i + 1) a

/-- Macro lookup does not read the critical fields. -/
@[simp] theorem clickedMacro_critical (sp prog facts s cid c d) :
    clickedMacro? sp prog facts (withCritical s c d) cid = clickedMacro? sp prog facts s cid := by
  simp only [clickedMacro?, shownComp_critical]

/-- New specification for owner review: the interpreter step neither reads nor
writes the critical workflow fields. Stepping a state with other critical
fields gives the same result, and the same state up to those fields. -/
theorem step_critical (sp prog facts user actor s e c d) :
    step sp prog facts user actor (withCritical s c d) e =
      liftCritical (step sp prog facts user actor s e) c d := by
  cases actor <;> cases e <;> simp only [step, withCritical_popup, clickedMacro_critical]
  case human.click cid =>
    cases s.popup? <;> cases clickedMacro? sp prog facts s cid <;> dsimp only
    all_goals first | exact stepCore_critical .. | exact runMacro_critical ..
  all_goals exact stepCore_critical ..

/-- The initial state has no critical workflow data. -/
theorem init_critical (sp prog facts user) :
    forgetCritical (init sp prog facts user) = init sp prog facts user :=
  (prefillScreen_critical sp prog facts _ none none).symm

/-- Grouped payload rows do not read the critical fields. -/
@[simp] theorem payloadView_critical (sp facts s c d i) :
    payloadView sp facts (withCritical s c d) i = payloadView sp facts s i := by
  simp only [payloadView, displayActive_critical]
  rfl

/-- Pinning does not read the critical fields. -/
@[simp] theorem infoPinned_critical (sp facts s c d i) :
    infoPinned sp facts (withCritical s c d) i = infoPinned sp facts s i := by
  simp only [infoPinned, displayActive_critical]

/-- Enabled/blocked status does not read the critical fields. -/
@[simp] theorem actionStatus_critical (sp prog facts user s comp c d) :
    actionStatus sp prog facts user (withCritical s c d) comp = actionStatus sp prog facts user s comp := by
  simp only [actionStatus, clickAlert_critical, liftCritical, guardBase_critical, guardReason_critical,
    infoShown_critical, currentLineComplete_critical, withCritical_commits]
  rfl

/-- One painted component does not read the critical fields. -/
@[simp] theorem itemView_critical (sp facts s comps c d) :
    itemView sp facts (withCritical s c d) comps = itemView sp facts s comps := by
  funext comp
  simp only [itemView, resolveSlot_critical, payloadView_critical, infoPinned_critical,
    elementValueValid_critical, compShown_critical, alertHolds_critical]
  rfl

/-- New specification for owner review: the screen view does not read the
critical workflow fields. -/
@[simp] theorem view_critical (sp prog facts user s c d) :
    view sp prog facts user (withCritical s c d) = view sp prog facts user s := by
  simp only [view, withCritical_screen, withCritical_popup, compShown_critical,
    actionStatus_critical, obligationViews_critical, itemView_critical]

#print axioms payloadView_critical
#print axioms infoPinned_critical
#print axioms actionStatus_critical
#print axioms itemView_critical
#print axioms view_critical
#print axioms resolveSlot_critical
#print axioms hasEntry_critical
#print axioms prefillRecord_critical
#print axioms prefillField_critical
#print axioms prefillFold_critical
#print axioms prefillScreen_critical
#print axioms goTo_critical
#print axioms goBack_critical
#print axioms clickAlert_critical
#print axioms currentLineComplete_critical
#print axioms clickCore_critical
#print axioms enterCore_critical
#print axioms confirmCore_critical
#print axioms selectTab_critical
#print axioms stepCore_critical
#print axioms macroValue_critical
#print axioms macroStep_critical
#print axioms runMacro_critical
#print axioms clickedMacro_critical
#print axioms step_critical
#print axioms init_critical
end Ehr.Runtime
