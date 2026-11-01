import Ehr.Check.ScalarCompletion
import Ehr.Check.CaptureSlots

/-! Completion for two independently editable order lines. New-line clicks may
advance the current slot; the fixed fields can still repair both archived lines.
There are no encounter-specific routes or entry attestations in this fragment. -/
namespace Ehr.Check.FixedLine
open Ehr Ehr.Props

/-- A declared drug input; this fragment adds no clinical drug-value constraint. -/
def drug (r : Role) : ElementSpec :=
  { id := "drug", label := "Drug", kind := .coded "formulary", enteredBy := [r],
    prefill := .defaultConfirm, friction := .safety, fhirTarget := "MedicationRequest.medication" }

/-- Each order line needs its own valid human assessment, on that line's slot. -/
def entry : EntryReq :=
  { commit := "recordReview", element := "assessment", perOrderLine := true }

/-- The scalar spec extended to a genuine per-order-line requirement. -/
def spec (k : ValueKind) (r : Role) (m : ReviewMode) (a : AlertCond) (t : Tier) : Spec :=
  { Scalar.spec k r m a t with elements := [drug r, Scalar.element k r], entries := [entry] }

/-- A shown drug field for one fixed order-line slot. -/
def drugField (n : Nat) : Component :=
  { id := "drug" ++ toString n, kind := .field "drug" (.fixed n) .none, label := "Drug" }

/-- A shown assessment field for one fixed order-line slot. -/
def assessmentField (n : Nat) : Component :=
  { id := "assessment" ++ toString n, kind := .field "assessment" (.fixed n) .none, label := "Assessment" }

/-- Both lines remain editable even after a new-line action advances currentSlot. -/
def screen : Screen :=
  { Scalar.screen with components := [
    { id := "banner", kind := .banner }, drugField 0, drugField 1,
    assessmentField 0, assessmentField 1,
    { id := "allergies", kind := .panel "allergyList", label := "Allergies" }, Scalar.button,
    { id := "alert", kind := .alert "clinicalAlert" false, label := "Clinical alert" },
    { id := "newLine", kind := .button .newOrderLine, label := "Next line" }] }

/-- The two-line composer, including its real new-order-line action. -/
def program (r : Role) : Program := { Scalar.program r with screens := [screen] }

private theorem on_screen (k r m a t f u s)
    (h : Reachable ⟨spec k r m a t, program r, f, u⟩ s) : s.screen = "clinical" := by
  have hn := (reachable_screenNames ⟨spec k r m a t, program r, f, u⟩
    (by simp [program, Scalar.program, Program.screen?, screen, Scalar.screen]) s h).1
  exact (show "clinical" = s.screen by
    simpa [program, Scalar.program, Program.screen?, screen, Scalar.screen] using hn).symm

private theorem fixed_slots (r : Role) : FixedDrugSlots (program r) [0, 1] := by
  intro sc hc slot pf hk
  simp only [allComps, program, Scalar.program, List.flatMap_cons, List.flatMap_nil,
    List.append_nil, List.mem_map] at hc
  obtain ⟨c, hc, rfl⟩ := hc
  simp only [screen, List.mem_cons, List.not_mem_nil, or_false] at hc
  rcases hc with rfl | rfl | rfl | rfl | rfl | rfl | rfl | rfl | rfl <;>
    simp [drugField, assessmentField, Scalar.button, drugElement] at hk
  all_goals obtain ⟨rfl, rfl⟩ := hk; simp

private theorem shown_assessment (k r m a t f s n) (hs : s.screen = "clinical") (hn : n = 0 ∨ n = 1) :
    shownComp? (spec k r m a t) (program r) f s (assessmentField n).id = some (assessmentField n) := by
  rcases hn with rfl | rfl <;>
    simp [shownComp?, program, Scalar.program, Program.compsOf, Program.screen?, screen, Scalar.screen,
      hs, drugField, assessmentField, Scalar.button, compShown, layoutShown, layoutShownAux, ownVisible] <;> decide

private theorem shown_button (k r m a t f s) (hs : s.screen = "clinical") :
    shownComp? (spec k r m a t) (program r) f s Scalar.button.id = some Scalar.button := by
  simp [shownComp?, program, Scalar.program, Program.compsOf, Program.screen?, screen, Scalar.screen,
    hs, drugField, assessmentField, Scalar.button, compShown, layoutShown, layoutShownAux, ownVisible] <;> decide

/-- The two-fixed-slot composer stays completable from every reachable state,
including states after new-line advancement. Both per-line captures are repaired
before the finite alert-discharge path. Medication doses remain excluded. -/
theorem completable (k : ValueKind) (r : Role) (m : ReviewMode) (a : AlertCond) (t : Tier)
    (nonDose : k ≠ .medicationDose) :
    Completable (spec k r m a t) (program r) (program r) := by
  intro f u role scans s reachable c required _
  change u.role = r at role
  have hc : c = "recordReview" := by
    have buttons := (List.mem_filter.mp (List.mem_filter.mp required).1).1
    simpa [commitButtons, program, screen, drugField, assessmentField, Scalar.button, Scalar.program] using buttons
  subst c
  have hs := on_screen k r m a t f u s reachable
  have slots := reachable_drugSlots ⟨spec k r m a t, program r, f, u⟩ [0, 1] (fixed_slots r) s reachable
  obtain ⟨clear, modal, sameScreen, sameCaptured⟩ := human_clear_popup (spec k r m a t) (program r) f u s
  let s₀ := runAll (spec k r m a t) (program r) f u .human s clear
  have hs₀ : s₀.screen = "clinical" := sameScreen.trans hs
  obtain ⟨v, valid⟩ := declared_value_witness (spec k r m a t) f u scans (Scalar.element k r)
    (by simp [spec])
  change valueSatisfies f u k v = true at valid
  have accepted : valueAccepted f u k v = true := by
    cases k <;> cases v <;> simp_all [valueSatisfies, valueAccepted]
  let capture (n : Nat) : Captured :=
    { element := "assessment", slot := n, value := v, byHuman := true, confirmed := true, provenance? := none }
  let s₁ := { s₀ with captured := setCaptured s₀.captured (capture 0) }
  let s₂ := { s₁ with captured := setCaptured s₁.captured (capture 1) }
  have enter0 : step (spec k r m a t) (program r) f u .human s₀ (.enter (assessmentField 0).id v) = (s₁, .ok) :=
    human_enter _ _ _ _ _ _ "assessment" (.fixed 0) .none (Scalar.element k r) v modal
      (shown_assessment k r m a t f s₀ 0 hs₀ (Or.inl rfl)) rfl
      (by simp [spec, Spec.element?, drug, Scalar.element]) (by simpa [Scalar.element] using role)
      accepted (by simp [elementValueValid, Scalar.element, nonDose])
  have enter1 : step (spec k r m a t) (program r) f u .human s₁ (.enter (assessmentField 1).id v) = (s₂, .ok) :=
    human_enter _ _ _ _ _ _ "assessment" (.fixed 1) .none (Scalar.element k r) v modal
      (shown_assessment k r m a t f s₁ 1 hs₀ (Or.inr rfl)) rfl
      (by simp [spec, Spec.element?, drug, Scalar.element]) (by simpa [Scalar.element] using role)
      accepted (by simp [elementValueValid, Scalar.element, nonDose])
  have drug_slots : DrugSlotsWithin [0, 1] s₂ := by
    have h0 := step_drugSlots (spec k r m a t) (program r) f u .human s₀
      (.enter (assessmentField 0).id v) [0, 1] (fixed_slots r)
      (by simpa only [DrugSlotsWithin, s₀, sameCaptured] using slots)
    rw [enter0] at h0
    have h1 := step_drugSlots (spec k r m a t) (program r) f u .human s₁
      (.enter (assessmentField 1).id v) [0, 1] (fixed_slots r) h0
    rwa [enter1] at h1
  have ready : ∀ ack, guardBase (spec k r m a t) (program r) f u
      { s₂ with acked := ack, popup? := none } "recordReview" = true := by
    intro ack
    have good (n : Nat) (hn : n = 0 ∨ n = 1) : hasGoodEntry f u
        { s₂ with acked := ack, popup? := none } (Scalar.element k r) (some n) = true := by
      apply List.any_eq_true.mpr
      refine ⟨capture n, ?_, ?_⟩
      · rcases hn with rfl | rfl <;> simp [s₂, s₁, setCaptured, capture]
      · simp [capture, Scalar.element, capturedSatisfies, valid, entryValueAllowed]
    have perLine : entryDirectMet (spec k r m a t) f u
        { s₂ with acked := ack, popup? := none } entry = true := by
      simp only [entryDirectMet, spec, Spec.element?, Scalar.element, drug, entry,
        List.find?_cons, beq_self_eq_true, ↓reduceIte]
      apply List.all_eq_true.mpr
      intro line hl
      have hn : line.1 = 0 ∨ line.1 = 1 := by
        change line ∈ orderLines s₂ at hl
        simpa using orderLines_slots [0, 1] s₂ drug_slots line hl
      simpa [lineMatches, Scalar.element] using good line.1 hn
    have info : infoShown (spec k r m a t) (program r) f
        { s₂ with acked := ack, popup? := none } "allergyList" = true := by
      simp [infoShown, program, Scalar.program, Program.compsOf, Program.screen?, screen, Scalar.screen,
        s₂, s₁, hs₀, drugField, assessmentField, Scalar.button, showsInfo,
        layoutShown, layoutShownAux, ownVisible, spec, Scalar.spec]
    have entries : entriesOk (spec k r m a t) f u { s₂ with acked := ack, popup? := none } "recordReview" = true := by
      change (entryMet (spec k r m a t) f u _ entry && true) = true
      simp only [entryMet, perLine, Bool.or_true, Bool.true_and]
    have reviews : reviewsOk (spec k r m a t) (program r) f { s₂ with acked := ack, popup? := none } "recordReview" = true := by
      change (reviewMet (spec k r m a t) (program r) f _ (Scalar.review m) && true) = true
      simp [reviewMet, Scalar.review, info, whenHolds]
    rw [guardBase, entries, reviews]
    simp [spec, Scalar.spec, Spec.commit?, extraGuard, validationsOk, elementValueValid, drug, Scalar.element,
      nonDose, defaultsOk, displaysOk, actionLabelOk]
    change (List.contains [r] u.role && true) = true
    simp [role]
  have consistent : ∀ z, popupCandidates (spec k r m a t) (program r) f z "recordReview" = [] →
      alertsAcked (spec k r m a t) f z "recordReview" = true := by
    intro z hz
    cases t with
    | passive => simp [alertsAcked, spec, Scalar.spec, Scalar.alert]
    | removable => simp [alertsAcked, spec, Scalar.spec, Scalar.alert]
    | interruptive =>
      simpa [popupCandidates, canPopup, spec, Scalar.spec, Spec.alert?, Scalar.alert,
        List.filter_eq_nil_iff, alertsAcked, List.all_eq_true] using hz
  obtain ⟨finish, done⟩ := human_finish_ready (spec k r m a t) (program r) f u s₂ "recordReview" Scalar.button
    rfl modal ready (fun _ => shown_button k r m a t f _ hs₀) consistent
  refine ⟨clear ++ [.enter (assessmentField 0).id v, .enter (assessmentField 1).id v] ++ finish, ?_⟩
  simp only [Episode.afterHuman, runAll, List.foldl_append, List.foldl_cons, List.foldl_nil]
  change "recordReview" ∈ (runAll (spec k r m a t) (program r) f u .human
    (step (spec k r m a t) (program r) f u .human
      (step (spec k r m a t) (program r) f u .human s₀ (.enter (assessmentField 0).id v)).1
      (.enter (assessmentField 1).id v)).1 finish).commits
  rw [enter0, enter1]
  exact done

#print axioms completable
end Ehr.Check.FixedLine
