import Ehr.Proofs.RuntimeModel

/-! The guard, the alert rules and layout visibility do not read the two
critical-result workflow fields (`criticalResults?`, `criticalDrafts?`).
Every theorem here is a new specification for owner review, outside
Comparator. The same technique is applied to Back history in `Ehr.Sim.History`. -/

namespace Ehr.Runtime
open Ehr

/-- New specification for owner review: the state without critical workflow data. -/
def forgetCritical (s : State) : State := withCritical s none none

/-- Replacing the critical fields twice keeps the last replacement. -/
@[simp] theorem withCritical_twice (s : State) (c d c' d') :
    withCritical (withCritical s c d) c' d' = withCritical s c' d' := rfl
/-- Replacing the critical fields by themselves changes nothing. -/
@[simp] theorem withCritical_self (s : State) :
    withCritical s s.criticalResults? s.criticalDrafts? = s := rfl
/-- Forgetting discards a replacement. -/
@[simp] theorem forget_withCritical (s : State) (c d) :
    forgetCritical (withCritical s c d) = forgetCritical s := rfl
/-- Forgetting twice is forgetting once. -/
@[simp] theorem forgetCritical_twice (s : State) :
    forgetCritical (forgetCritical s) = forgetCritical s := rfl
/-- Captures are not a critical field. -/
@[simp] theorem withCritical_captured (s : State) (c d) : (withCritical s c d).captured = s.captured := rfl
/-- The screen is not a critical field. -/
@[simp] theorem withCritical_screen (s : State) (c d) : (withCritical s c d).screen = s.screen := rfl
/-- The popup is not a critical field. -/
@[simp] theorem withCritical_popup (s : State) (c d) : (withCritical s c d).popup? = s.popup? := rfl
/-- Commits are not a critical field. -/
@[simp] theorem withCritical_commits (s : State) (c d) : (withCritical s c d).commits = s.commits := rfl
/-- Acknowledgments are not a critical field. -/
@[simp] theorem withCritical_acked (s : State) (c d) : (withCritical s c d).acked = s.acked := rfl
/-- Receipts are not a critical field. -/
@[simp] theorem withCritical_receipts (s : State) (c d) : (withCritical s c d).receipts = s.receipts := rfl
/-- The current order line is not a critical field. -/
@[simp] theorem withCritical_slot (s : State) (c d) : (withCritical s c d).currentSlot = s.currentSlot := rfl

/-- Clinical predicates do not read the critical fields. -/
@[simp] theorem clinicalEval_critical (facts s c d p) :
    clinicalEval facts (withCritical s c d) p = clinicalEval facts s p := by
  induction p <;> simp only [clinicalEval, *] <;> rfl

/-- Clinical applicability does not read the critical fields. -/
@[simp] theorem clinicalApplies_critical (facts s c d) :
    clinicalApplies facts (withCritical s c d) = clinicalApplies facts s := by
  funext p
  simp only [clinicalApplies, clinicalEval_critical]

/-- Value validation does not read the critical fields. -/
@[simp] theorem validationHolds_critical (facts s c d slot v) :
    validationHolds facts (withCritical s c d) slot v = validationHolds facts s slot v := by
  funext rule
  induction rule <;> simp only [validationHolds, *] <;> rfl

/-- Element value checks do not read the critical fields. -/
@[simp] theorem elementValueValid_critical (facts s c d el slot v) :
    elementValueValid facts (withCritical s c d) el slot v = elementValueValid facts s el slot v := by
  simp only [elementValueValid, validationHolds_critical]
  rfl

/-- Whole-state validation does not read the critical fields. -/
@[simp] theorem validationsOk_critical (sp facts s c d) :
    validationsOk sp facts (withCritical s c d) = validationsOk sp facts s := by
  simp only [validationsOk, elementValueValid_critical]
  rfl

/-- Absolute time does not read the critical fields. -/
@[simp] theorem epochNow_critical (facts s c d) :
    epochNow facts (withCritical s c d) = epochNow facts s := rfl

/-- Receipt time does not read the critical fields. -/
@[simp] theorem nowMin_critical (facts s c d) :
    nowMin facts (withCritical s c d) = nowMin facts s := rfl

/-- Event evidence does not read the critical fields. -/
@[simp] theorem eventTime_critical (facts s c d ref planned) :
    eventTime facts (withCritical s c d) ref planned = eventTime facts s ref planned := by
  simp only [eventTime, epochNow_critical]

/-- Temporal obligations do not read the critical fields. -/
@[simp] theorem temporalStatus_critical (facts s c d rq) :
    temporalStatus facts (withCritical s c d) rq = temporalStatus facts s rq := by
  simp only [temporalStatus, clinicalApplies_critical, eventTime_critical, epochNow_critical]

/-- Expiry obligations do not read the critical fields. -/
@[simp] theorem expiryStatus_critical (facts s c d rq) :
    expiryStatus facts (withCritical s c d) rq = expiryStatus facts s rq := by
  simp only [expiryStatus, clinicalApplies_critical, epochNow_critical]

/-- Alert keys do not read the critical fields of the state. The
critical-result condition reads the facts only. -/
@[simp] theorem alertKeys_critical (facts s c d cond) :
    alertKeys facts (withCritical s c d) cond = alertKeys facts s cond := by
  cases cond <;> simp only [alertKeys, clinicalEval_critical] <;> rfl

/-- Alert truth does not read the critical fields. -/
@[simp] theorem alertHolds_critical (sp facts s c d a) :
    alertHolds sp facts (withCritical s c d) a = alertHolds sp facts s a := by
  simp only [alertHolds, alertKeys_critical]

/-- Requirement conditions do not read the critical fields. -/
@[simp] theorem whenHolds_critical (facts s c d w) :
    whenHolds facts (withCritical s c d) w = whenHolds facts s w := by
  cases w <;> simp only [whenHolds, clinicalApplies_critical] <;> rfl

/-- Per-line requirement conditions do not read the critical fields. -/
@[simp] theorem lineMatches_critical (facts s c d w slot drug) :
    lineMatches facts (withCritical s c d) w slot drug = lineMatches facts s w slot drug := by
  cases w <;> simp only [lineMatches, clinicalApplies_critical] <;> rfl

/-- Entry requirements do not read the critical fields. -/
@[simp] theorem entryMet_critical (sp facts user s c d rq) :
    entryMet sp facts user (withCritical s c d) rq = entryMet sp facts user s rq := by
  simp only [entryMet, lineMatches_critical, whenHolds_critical]
  rfl

/-- Entry refusal reasons do not read the critical fields. -/
@[simp] theorem entryReason_critical (sp facts user s c d rq) :
    entryReason sp facts user (withCritical s c d) rq = entryReason sp facts user s rq := by
  simp only [entryReason, lineMatches_critical]
  rfl

/-- Layout visibility does not read the critical fields. -/
@[simp] theorem layout_critical (sp facts s cs n comp c d) :
    layoutShownAux sp facts (withCritical s c d) cs n comp = layoutShownAux sp facts s cs n comp := by
  induction n generalizing comp with
  | zero => rfl
  | succ n ih => simp only [layoutShownAux, ih]; rfl

/-- A component's shown test does not read the critical fields. -/
@[simp] theorem compShown_critical (sp facts s comps c d) :
    compShown sp facts (withCritical s c d) comps = compShown sp facts s comps := by
  funext comp
  simp only [compShown, layoutShown, layout_critical, alertHolds_critical]

/-- Shown-component lookup does not read the critical fields. -/
@[simp] theorem shownComp_critical (sp prog facts s cid c d) :
    shownComp? sp prog facts (withCritical s c d) cid = shownComp? sp prog facts s cid := by
  simp only [shownComp?, compShown_critical]
  rfl

/-- Info visibility does not read the critical fields. -/
@[simp] theorem infoShown_critical (sp prog facts s i c d) :
    infoShown sp prog facts (withCritical s c d) i = infoShown sp prog facts s i := by
  simp only [infoShown, layoutShown, layout_critical]
  rfl

/-- Payload field checks do not read the critical fields. -/
@[simp] theorem payloadFieldMet_critical (facts s c d slot fields availability) :
    payloadFieldMet facts (withCritical s c d) slot fields availability =
      payloadFieldMet facts s slot fields availability := by
  funext rq
  simp only [payloadFieldMet, validationHolds_critical]

/-- Payload completeness does not read the critical fields. -/
@[simp] theorem payloadComplete_critical (payload contract facts s c d) :
    payloadComplete payload contract facts (withCritical s c d) =
      payloadComplete payload contract facts s := by
  simp only [payloadComplete, payloadFieldMet_critical]

/-- Display requirement activity does not read the critical fields. -/
@[simp] theorem displayActive_critical (facts s c d commit) :
    displayActive facts (withCritical s c d) commit = displayActive facts s commit := by
  funext r
  simp only [displayActive, clinicalApplies_critical]

/-- Display contracts do not read the critical fields. -/
@[simp] theorem displaysOk_critical (sp prog facts s c d cm) :
    displaysOk sp prog facts (withCritical s c d) cm = displaysOk sp prog facts s cm := by
  simp only [displaysOk, displayActive_critical, displayReqMet, displayShown, actionLabelOk,
    layoutShown, layout_critical, payloadComplete_critical]
  rfl

/-- The order-presence check does not read the critical fields. -/
@[simp] theorem signingHasOrder_critical (sp s c d cm) :
    signingHasOrder sp (withCritical s c d) cm = signingHasOrder sp s cm := rfl

/-- The additional commit contracts do not read the critical fields. -/
@[simp] theorem extraGuard_critical (sp prog facts s c d cm) :
    extraGuard sp prog facts (withCritical s c d) cm = extraGuard sp prog facts s cm := by
  simp only [extraGuard, signingHasOrder_critical, temporalStatus_critical, expiryStatus_critical,
    validationsOk_critical, displaysOk_critical]

/-- Obligation views do not read the critical fields. -/
@[simp] theorem obligationViews_critical (sp facts s c d) :
    obligationViews sp facts (withCritical s c d) = obligationViews sp facts s := by
  simp only [obligationViews, temporalStatus_critical, expiryStatus_critical]

/-- Review requirements do not read the critical fields. -/
@[simp] theorem reviewMet_critical (sp prog facts s c d rq) :
    reviewMet sp prog facts (withCritical s c d) rq = reviewMet sp prog facts s rq := by
  simp only [reviewMet, whenHolds_critical, infoShown_critical]
  rfl

/-- Guard items 1–3 do not read the critical fields. -/
@[simp] theorem guardBase_critical (sp prog facts user s cm c d) :
    guardBase sp prog facts user (withCritical s c d) cm = guardBase sp prog facts user s cm := by
  simp only [guardBase, entriesOk, entryMet_critical, reviewsOk, reviewMet_critical, extraGuard_critical]

/-- Guard refusal reasons do not read the critical fields. -/
@[simp] theorem guardReason_critical (sp prog facts user s cm c d) :
    guardReason sp prog facts user (withCritical s c d) cm = guardReason sp prog facts user s cm := by
  simp only [guardReason, validationsOk_critical, displaysOk_critical, entryMet_critical,
    entryReason_critical, reviewMet_critical, obligationViews_critical, extraGuard_critical]
  rfl

/-- Popup candidates do not read the critical fields. -/
@[simp] theorem popupCandidates_critical (sp prog facts s cm c d) :
    popupCandidates sp prog facts (withCritical s c d) cm = popupCandidates sp prog facts s cm := by
  simp only [popupCandidates, alertKeys_critical, canPopup, programPopsUp]
  rfl

/-- The acknowledgment check does not read the critical fields. -/
@[simp] theorem alertsAcked_critical (sp facts s cm c d) :
    alertsAcked sp facts (withCritical s c d) cm = alertsAcked sp facts s cm := by
  simp only [alertsAcked, alertKeys_critical]
  rfl

/-- The full commit guard does not read the critical fields. -/
@[simp] theorem commitGuard_critical (sp prog facts user s cm c d) :
    commitGuard sp prog facts user (withCritical s c d) cm = commitGuard sp prog facts user s cm := by
  simp only [commitGuard, guardBase_critical, alertsAcked_critical]

#print axioms withCritical_twice
#print axioms withCritical_self
#print axioms forget_withCritical
#print axioms forgetCritical_twice
#print axioms withCritical_captured
#print axioms withCritical_screen
#print axioms withCritical_popup
#print axioms withCritical_commits
#print axioms withCritical_acked
#print axioms withCritical_receipts
#print axioms withCritical_slot
#print axioms clinicalEval_critical
#print axioms clinicalApplies_critical
#print axioms validationHolds_critical
#print axioms elementValueValid_critical
#print axioms validationsOk_critical
#print axioms epochNow_critical
#print axioms nowMin_critical
#print axioms eventTime_critical
#print axioms temporalStatus_critical
#print axioms expiryStatus_critical
#print axioms alertKeys_critical
#print axioms alertHolds_critical
#print axioms whenHolds_critical
#print axioms lineMatches_critical
#print axioms entryMet_critical
#print axioms entryReason_critical
#print axioms layout_critical
#print axioms compShown_critical
#print axioms shownComp_critical
#print axioms infoShown_critical
#print axioms payloadFieldMet_critical
#print axioms payloadComplete_critical
#print axioms displayActive_critical
#print axioms displaysOk_critical
#print axioms signingHasOrder_critical
#print axioms extraGuard_critical
#print axioms obligationViews_critical
#print axioms reviewMet_critical
#print axioms guardBase_critical
#print axioms guardReason_critical
#print axioms popupCandidates_critical
#print axioms alertsAcked_critical
#print axioms commitGuard_critical
end Ehr.Runtime
