import Ehr.Sim.Interaction

/-!
Minimum-action search forgets Back history, but preserves the complete captured
list (including its order), receipts, clock, tab and expansion lists. Preserving
more state than the proposed per-element key avoids a larger trusted quotient.
Back clicks, including those inside macros, are excluded. The lemmas below
show that forgetting history is exact for every remaining transition.
-/
namespace Ehr.Sim
open Ehr

def withHistory (s : State) (h : List ScreenId) : State := { s with history := h }
def forgetHistory (s : State) : State := withHistory s []
def forgetOutput (o : State × StepResult) : State × StepResult := (forgetHistory o.1, o.2)

@[simp] theorem withHistory_twice (s : State) (a b : List ScreenId) :
    withHistory (withHistory s a) b = withHistory s b := rfl
@[simp] theorem withHistory_self (s : State) : withHistory s s.history = s := rfl
@[simp] theorem forget_withHistory (s : State) (h) :
    forgetHistory (withHistory s h) = forgetHistory s := rfl

/- Event evidence and absolute time live in Facts, which is held fixed here.
Only the Back-navigation list is erased; captures and clock are preserved. -/
@[simp] theorem clinicalEval_history (facts s h p) :
    clinicalEval facts (withHistory s h) p = clinicalEval facts s p := by
  induction p <;> simp only [clinicalEval, *] <;> rfl

@[simp] theorem clinicalApplies_history (facts s h) :
    clinicalApplies facts (withHistory s h) = clinicalApplies facts s := by
  funext p
  simp only [clinicalApplies, clinicalEval_history]

@[simp] theorem validationHolds_history (facts s h slot v) :
    validationHolds facts (withHistory s h) slot v = validationHolds facts s slot v := by
  funext rule
  induction rule <;> simp only [validationHolds, *] <;> rfl

@[simp] theorem elementValueValid_history (facts s h el slot v) :
    elementValueValid facts (withHistory s h) el slot v = elementValueValid facts s el slot v := by
  simp only [elementValueValid, validationHolds_history]
  rfl

@[simp] theorem valueGoalMet_history (sp facts user s h) :
    valueGoalMet sp facts user (withHistory s h) = valueGoalMet sp facts user s := by
  funext g
  simp only [valueGoalMet, elementValueValid_history]
  rfl

@[simp] theorem validationsOk_history (sp facts s h) :
    validationsOk sp facts (withHistory s h) = validationsOk sp facts s := by
  simp only [validationsOk, elementValueValid_history]
  rfl

@[simp] theorem epochNow_history (facts s h) :
    epochNow facts (withHistory s h) = epochNow facts s := rfl

@[simp] theorem eventTime_history (facts s h ref planned) :
    eventTime facts (withHistory s h) ref planned = eventTime facts s ref planned := by
  simp only [eventTime, epochNow_history]

@[simp] theorem temporalStatus_history (facts s h rq) :
    temporalStatus facts (withHistory s h) rq = temporalStatus facts s rq := by
  simp only [temporalStatus, clinicalApplies_history, eventTime_history, epochNow_history]

@[simp] theorem expiryStatus_history (facts s h rq) :
    expiryStatus facts (withHistory s h) rq = expiryStatus facts s rq := by
  simp only [expiryStatus, clinicalApplies_history, epochNow_history]

@[simp] theorem alertKeys_history (facts s h cond) :
    alertKeys facts (withHistory s h) cond = alertKeys facts s cond := by
  cases cond <;> simp only [alertKeys, clinicalEval_history] <;> rfl

@[simp] theorem alertHolds_history (sp facts s h a) :
    alertHolds sp facts (withHistory s h) a = alertHolds sp facts s a := by
  simp only [alertHolds, alertKeys_history]

@[simp] theorem whenHolds_history (facts s h w) :
    whenHolds facts (withHistory s h) w = whenHolds facts s w := by
  cases w <;> simp only [whenHolds, clinicalApplies_history] <;> rfl

@[simp] theorem lineMatches_history (facts s h w slot drug) :
    lineMatches facts (withHistory s h) w slot drug = lineMatches facts s w slot drug := by
  cases w <;> simp only [lineMatches, clinicalApplies_history] <;> rfl

@[simp] theorem entryMet_history (sp facts user s h rq) :
    entryMet sp facts user (withHistory s h) rq = entryMet sp facts user s rq := by
  simp only [entryMet, lineMatches_history, whenHolds_history]
  rfl

@[simp] theorem entryReason_history (sp facts user s h rq) :
    entryReason sp facts user (withHistory s h) rq = entryReason sp facts user s rq := by
  simp only [entryReason, lineMatches_history]
  rfl

@[simp] theorem layout_history (sp facts s cs n c h) :
    layoutShownAux sp facts (withHistory s h) cs n c = layoutShownAux sp facts s cs n c := by
  induction n generalizing c with
  | zero => rfl
  | succ n ih => simp only [layoutShownAux, ih]; rfl

@[simp] theorem shownComp_history (sp prog facts s cid h) :
    shownComp? sp prog facts (withHistory s h) cid = shownComp? sp prog facts s cid := by
  simp only [shownComp?, compShown, layoutShown, layout_history, alertHolds_history]
  rfl

@[simp] theorem infoShown_history (sp prog facts s i h) :
    infoShown sp prog facts (withHistory s h) i = infoShown sp prog facts s i := by
  simp only [infoShown, layoutShown, layout_history]
  rfl

@[simp] theorem payloadFieldMet_history (facts s h slot fields availability) :
    payloadFieldMet facts (withHistory s h) slot fields availability =
      payloadFieldMet facts s slot fields availability := by
  funext rq
  simp only [payloadFieldMet, validationHolds_history]

@[simp] theorem payloadComplete_history (payload contract facts s h) :
    payloadComplete payload contract facts (withHistory s h) = payloadComplete payload contract facts s := by
  simp only [payloadComplete, payloadFieldMet_history]

@[simp] theorem displaysOk_history (sp prog facts s h cm) :
    displaysOk sp prog facts (withHistory s h) cm = displaysOk sp prog facts s cm := by
  simp only [displaysOk, displayActive, clinicalApplies_history, displayReqMet,
    displayShown, actionLabelOk, layoutShown, layout_history, payloadComplete_history]
  rfl

@[simp] theorem extraGuard_history (sp prog facts s h cm) :
    extraGuard sp prog facts (withHistory s h) cm = extraGuard sp prog facts s cm := by
  simp only [extraGuard, temporalStatus_history, expiryStatus_history, validationsOk_history, displaysOk_history]

@[simp] theorem obligationViews_history (sp facts s h) :
    obligationViews sp facts (withHistory s h) = obligationViews sp facts s := by
  simp only [obligationViews, temporalStatus_history, expiryStatus_history]

@[simp] theorem guardBase_history (sp prog facts user s cm h) :
    guardBase sp prog facts user (withHistory s h) cm = guardBase sp prog facts user s cm := by
  simp only [guardBase, entriesOk, entryMet_history, reviewsOk, reviewMet, whenHolds_history, infoShown_history, extraGuard_history]
  rfl

@[simp] theorem guardReason_history (sp prog facts user s cm h) :
    guardReason sp prog facts user (withHistory s h) cm = guardReason sp prog facts user s cm := by
  simp only [guardReason, validationsOk_history, displaysOk_history, entryMet_history, entryReason_history,
    reviewMet, whenHolds_history, infoShown_history, obligationViews_history, extraGuard_history]
  rfl

@[simp] theorem resolveSlot_history (s h sl) : resolveSlot (withHistory s h) sl = resolveSlot s sl := by
  cases sl <;> rfl
@[simp] theorem hasEntry_history (s h e n) : hasEntry (withHistory s h) e n = hasEntry s e n := rfl
@[simp] theorem prefillRecord_history (facts s h e el n pf) :
    prefillRecord facts (withHistory s h) e el n pf = prefillRecord facts s e el n pf := by
  cases pf <;> rfl
@[simp] theorem orderLines_history (s h) : orderLines (withHistory s h) = orderLines s := rfl
@[simp] theorem withHistory_captured (s h) : (withHistory s h).captured = s.captured := rfl
@[simp] theorem withHistory_screen (s h) : (withHistory s h).screen = s.screen := rfl
@[simp] theorem withHistory_popup (s h) : (withHistory s h).popup? = s.popup? := rfl
@[simp] theorem withHistory_slot (s h) : (withHistory s h).currentSlot = s.currentSlot := rfl

@[simp] theorem withHistory_commits (s h) : (withHistory s h).commits = s.commits := rfl
@[simp] theorem popupCandidates_history (sp prog facts s cm h) :
    popupCandidates sp prog facts (withHistory s h) cm = popupCandidates sp prog facts s cm := by
  simp only [popupCandidates, alertKeys_history, canPopup, programPopsUp]
  rfl
@[simp] theorem alertsAcked_history (sp facts s cm h) :
    alertsAcked sp facts (withHistory s h) cm = alertsAcked sp facts s cm := by
  simp only [alertsAcked, alertKeys_history]
  rfl

@[simp] theorem prefillField_history (sp facts s c h) :
    prefillField sp facts (withHistory s h) c = withHistory (prefillField sp facts s c) h := by
  cases hk : c.kind <;> simp only [prefillField, hk]
  all_goals try rfl
  all_goals simp only [hasEntry_history, resolveSlot_history, prefillValueValid, prefillRecord_history, elementValueValid_history]
  all_goals repeat' first | rfl | (split <;> try simp_all)

 theorem prefillFold_history (sp : Spec) (facts : Facts) (cs : List Component) (s : State) (h : List ScreenId) :
    cs.foldl (prefillField sp facts) (withHistory s h) =
      withHistory (cs.foldl (prefillField sp facts) s) h := by
  induction cs generalizing s with
  | nil => rfl
  | cons c cs ih => simp only [List.foldl_cons, prefillField_history, ih]

@[simp] theorem prefillScreen_history (sp prog facts s h) :
    prefillScreen sp prog facts (withHistory s h) = withHistory (prefillScreen sp prog facts s) h := by
  exact prefillFold_history sp facts (prog.compsOf s.screen) s h

/-- A component ID is safe only if it is never a Back button, on any screen. -/
def backId (prog : Program) (cid : CompId) : Bool :=
  prog.screens.any fun sc => sc.components.any fun c => c.id == cid && c.kind == .button .back

 theorem compsOf_mem {prog : Program} {scr : ScreenId} {c : Component}
    (hc : c ∈ prog.compsOf scr) : ∃ sc ∈ prog.screens, c ∈ sc.components := by
  unfold Program.compsOf at hc
  split at hc
  next sc he =>
    exact ⟨sc, List.mem_of_find?_eq_some he, hc⟩
  next => simp at hc

 theorem shown_not_back {sp prog facts s cid c}
    (hb : backId prog cid = false) (hc : shownComp? sp prog facts s cid = some c) :
    c.kind ≠ .button .back := by
  have mem := List.mem_of_find?_eq_some hc
  have pred := List.find?_some hc
  obtain ⟨sc, hsc, hcc⟩ := compsOf_mem mem
  intro hk
  have hid : c.id = cid := by simpa using (Bool.and_eq_true_iff.mp pred).1
  have : backId prog cid = true := by
    simp only [backId, List.any_eq_true]
    exact ⟨sc, hsc, c, hcc, by simp [hid, hk]⟩
  simp [hb] at this

/-- Erased output of a navigation to a named screen. -/
 theorem goTo_history (sp prog facts s target h) :
    forgetOutput (goTo sp prog facts (withHistory s h) target) =
      forgetOutput (goTo sp prog facts s target) := by
  unfold goTo
  split <;> simp only [forgetOutput, Prod.fst, Prod.snd, forget_withHistory]
  next =>
    change (forgetHistory (prefillScreen sp prog facts (withHistory { s with screen := target } (s.screen :: h))), StepResult.ok) =
      (forgetHistory (prefillScreen sp prog facts (withHistory { s with screen := target } (s.screen :: s.history))), StepResult.ok)
    simp only [prefillScreen_history, forget_withHistory]

/-- Non-navigation actions preserve the arbitrary history verbatim. -/
 theorem clickCore_history (sp prog facts user actor s c h)
    (hb : c.kind ≠ .button .back) :
    forgetOutput (clickCore sp prog facts user actor (withHistory s h) c) =
      forgetOutput (clickCore sp prog facts user actor s c) := by
  cases hk : c.kind with
  | alert a popup =>
    simp only [clickCore, hk]
    cases actor
    · simp only [clickAlert, popupCandidates_history]
      repeat' first | rfl | (split <;> try simp_all)
    · rfl
  | button action =>
    cases action with
    | goto target => simpa only [clickCore, hk] using goTo_history sp prog facts s target h
    | back => exact False.elim (hb hk)
    | commit cm =>
      simp only [clickCore, hk]
      cases actor <;> simp only [clickCommit, guardBase_history, guardReason_history]
      all_goals repeat' first | rfl | (split <;> try simp_all)
    | markReviewed i =>
      simp only [clickCore, hk]
      cases actor <;> simp only [markReviewed, infoShown_history]
      all_goals repeat' first | rfl | (split <;> try simp_all)
    | newOrderLine =>
      simp only [clickCore, hk]
      have hc : currentLineComplete sp facts user (withHistory s h) = currentLineComplete sp facts user s := by
        simp only [currentLineComplete, lineMatches_history, elementValueValid_history]
        rfl
      rw [hc]
      by_cases hh : currentLineComplete sp facts user s = true
      · simp only [hh, ite_true]
        change (forgetHistory (prefillScreen sp prog facts (withHistory { s with currentSlot := s.currentSlot + 1 } h)), StepResult.ok) = _
        simp only [prefillScreen_history, forget_withHistory, forgetOutput]
      · simp only [hh, ite_false]; rfl
    | requestPriorAuth =>
      simp only [clickCore, hk]
      cases actor <;> simp only [requestPriorAuth, priorAuthCaptured, hasOrderAt, serviceOrderAt, orderLines, withHistory]
      all_goals repeat' first | rfl | (split <;> try simp_all)
  | group collapsible start => simp only [clickCore, hk]; cases collapsible <;> rfl
  | «macro» mid => simp only [clickCore, hk]; cases actor <;> rfl
  | _ => simp only [clickCore, hk]; rfl

 theorem enterCore_history (sp prog facts user actor s cid v h) :
    forgetOutput (enterCore sp prog facts user actor (withHistory s h) cid v) =
      forgetOutput (enterCore sp prog facts user actor s cid v) := by
  simp only [enterCore, shownComp_history]
  cases actor <;> simp only [resolveSlot_history, withHistory_captured, elementValueValid_history]
  all_goals repeat' first | rfl | (split <;> try simp_all)

 theorem confirmCore_history (sp prog facts user actor s cid h) :
    forgetOutput (confirmCore sp prog facts user actor (withHistory s h) cid) =
      forgetOutput (confirmCore sp prog facts user actor s cid) := by
  cases actor <;> simp only [confirmCore, shownComp_history, resolveSlot_history, withHistory_captured]
  all_goals repeat' first | rfl | (split <;> try simp_all)

 theorem selectTab_history (sp prog facts s cid idx h) :
    forgetOutput (selectTabCore sp prog facts (withHistory s h) cid idx) =
      forgetOutput (selectTabCore sp prog facts s cid idx) := by
  simp only [selectTabCore, shownComp_history]
  split <;> try rfl
  split <;> rfl

 theorem stepCore_history (sp prog facts user actor s e h)
    (hb : ∀ cid, e = .click cid → backId prog cid = false) :
    forgetOutput (stepCore sp prog facts user actor (withHistory s h) e) =
      forgetOutput (stepCore sp prog facts user actor s e) := by
  unfold stepCore
  by_cases hp : (s.popup?.isSome && !e.isAck) = true
  · simp only [withHistory_popup, hp, ite_true]; rfl
  simp only [show (withHistory s h).popup? = s.popup? from rfl, hp, ite_false]
  cases e <;> simp only [stepEvent, shownComp_history]
  next cid =>
    cases hc : shownComp? sp prog facts s cid with
    | none => rfl
    | some c => exact clickCore_history sp prog facts user actor s c h (shown_not_back (hb cid rfl) hc)
  next cid idx => exact selectTab_history sp prog facts s cid idx h
  next cid v => exact enterCore_history sp prog facts user actor s cid v h
  next cid => exact confirmCore_history sp prog facts user actor s cid h
  next a =>
    cases actor <;> simp only [ackCore, withHistory_popup]
    all_goals repeat' first | rfl | (split <;> try simp_all)
  next scr => simp only [withHistory_screen]; repeat' first | rfl | (split <;> try simp_all)
  next query =>
    have hs : searchShown sp prog facts (withHistory s h) = searchShown sp prog facts s := by
      simp only [searchShown, compShown, layoutShown, layout_history, alertHolds_history]; rfl
    rw [hs]; repeat' first | rfl | (split <;> try simp_all)

/-- Equal erased states differ only in the history assigned here. -/
theorem eq_withHistory {s t : State} (h : forgetHistory s = forgetHistory t) :
    t = withHistory s t.history := by
  have hh := congrArg (fun x => withHistory x t.history) h
  simpa only [forgetHistory, withHistory_twice, withHistory_self] using hh.symm

theorem lift_history (f : State → State × StepResult)
    (hf : ∀ s h, forgetOutput (f (withHistory s h)) = forgetOutput (f s))
    {s t} (h : forgetHistory s = forgetHistory t) : forgetOutput (f s) = forgetOutput (f t) := by
  rw [eq_withHistory h, hf]

def macroSafe (prog : Program) (steps : List MacroStep) : Bool :=
  steps.all fun st => match st with | .click cid => !backId prog cid | _ => true

@[simp] theorem macroValue_history (sp prog facts s cid str h) :
    macroValue sp prog facts (withHistory s h) cid str = macroValue sp prog facts s cid str := by
  simp only [macroValue, shownComp_history]
  rfl

 theorem macroStep_history (sp prog facts user s st h)
    (hsafe : macroSafe prog [st] = true) :
    forgetOutput (macroStep sp prog facts user (withHistory s h) st) =
      forgetOutput (macroStep sp prog facts user s st) := by
  cases st with
  | setValue cid str =>
    simp only [macroStep, macroValue_history]
    exact stepCore_history sp prog facts user .macro s _ h (by intros; contradiction)
  | click cid =>
    exact stepCore_history sp prog facts user .macro s _ h (by
      intro c hc; cases hc; simpa [macroSafe] using hsafe)
  | goto target =>
    simp only [macroStep, withHistory_popup]
    by_cases hp : s.popup?.isSome = true
    · simp only [hp, ite_true]; rfl
    · simp only [hp, ite_false]; exact goTo_history sp prog facts s target h

 theorem runMacro_congr (sp prog facts user i steps s t)
    (heq : forgetHistory s = forgetHistory t) (hsafe : macroSafe prog steps = true) :
    forgetOutput (runMacro sp prog facts user i s steps) =
      forgetOutput (runMacro sp prog facts user i t steps) := by
  induction steps generalizing i s t with
  | nil => exact congrArg (fun x => (x, StepResult.ok)) heq
  | cons st rest ih =>
    have hsafe' : macroSafe prog [st] = true ∧ macroSafe prog rest = true := by
      simpa [macroSafe] using hsafe
    have hx := lift_history (fun s => macroStep sp prog facts user s st)
      (fun s h => macroStep_history sp prog facts user s st h hsafe'.1) heq
    cases ha : macroStep sp prog facts user s st with
    | mk a ra =>
      cases hb : macroStep sp prog facts user t st with
      | mk b rb =>
        have hx' : forgetHistory a = forgetHistory b ∧ ra = rb := by
          simpa [ha, hb, forgetOutput] using hx
        obtain ⟨hstate, rfl⟩ := hx'
        cases ra <;> simp only [runMacro, ha, hb]
        · exact ih (i + 1) a b hstate hsafe'.2
        · exact congrArg (fun x => (x, StepResult.blocked (macroStopReason i (.blocked _)))) hstate
        · exact congrArg (fun x => (x, StepResult.blocked (macroStopReason i .ignored))) hstate

@[simp] theorem clickedMacro_history (sp prog facts s cid h) :
    clickedMacro? sp prog facts (withHistory s h) cid = clickedMacro? sp prog facts s cid := by
  simp only [clickedMacro?, shownComp_history]

/-- Reject all Back IDs, and macros whose click steps can invoke Back. -/
def safeEvent (ctx : Context) (s : State) : Event → Bool
  | .click cid => !backId ctx.prog cid &&
      (clickedMacro? ctx.sp ctx.prog ctx.facts s cid).all (fun m => macroSafe ctx.prog m.steps)
  | _ => true

@[simp] theorem safeEvent_history (ctx s e h) :
    safeEvent ctx (withHistory s h) e = safeEvent ctx s e := by
  cases e <;> simp only [safeEvent, clickedMacro_history]

/-- Public interpreter transitions preserve the history equivalence for every
search move, including macros that stop at a blocked step. -/
theorem step_history (ctx : Context) (s : State) (e : Event) (h)
    (hsafe : safeEvent ctx s e = true) :
    forgetOutput (step ctx.sp ctx.prog ctx.facts ctx.user .human (withHistory s h) e) =
      forgetOutput (step ctx.sp ctx.prog ctx.facts ctx.user .human s e) := by
  cases e <;> simp only [step, withHistory_popup, clickedMacro_history]
  next cid =>
    have hs : backId ctx.prog cid = false ∧
      (clickedMacro? ctx.sp ctx.prog ctx.facts s cid).all (fun m => macroSafe ctx.prog m.steps) = true := by
      simpa [safeEvent] using hsafe
    cases hp : s.popup? <;> cases hm : clickedMacro? ctx.sp ctx.prog ctx.facts s cid <;>
      simp only [hp, hm]
    · exact stepCore_history _ _ _ _ _ _ _ _ (by intros; simp_all)
    · apply runMacro_congr
      · rfl
      · simpa [hm] using hs.2
    · exact stepCore_history _ _ _ _ _ _ _ _ (by intros; simp_all)
    · exact stepCore_history _ _ _ _ _ _ _ _ (by intros; simp_all)
  all_goals exact stepCore_history _ _ _ _ _ _ _ _ (by intros; contradiction)

/-- Scroll and search are state identities, even when blocked or ignored. -/
theorem scroll_state (ctx : Context) (s : State) (scr) : ctx.next s (.scroll scr) = s := by
  simp only [Context.next, step, stepCore, Event.isAck, stepEvent]
  simp only [Bool.not_false, Bool.and_true]
  split <;> try rfl
  split <;> rfl
theorem search_state (ctx : Context) (s : State) (q) : ctx.next s (.search q) = s := by
  simp only [Context.next, step, stepCore, Event.isAck, stepEvent]
  simp only [Bool.not_false, Bool.and_true]
  split <;> try rfl
  split <;> rfl

#print axioms step_history
end Ehr.Sim
