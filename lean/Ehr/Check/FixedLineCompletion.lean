import Ehr.Check.ScalarCompletion
import Ehr.Check.CaptureSlots
import Ehr.Check.PinSound
import Ehr.Check.AlertCompletion

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
def spec (k : ValueKind) (r : Role) (m : ReviewMode) (a : AlertCond) (t : Tier) (moreAlerts : List AlertSpec := []) (macroCatalog : Bool := false) : Spec :=
  { Scalar.spec k r m a t with elements := [drug r, Scalar.element k r], entries := [entry], alerts := Scalar.alert a t :: moreAlerts, design := { (Scalar.spec k r m a t).design with catalog := (Scalar.spec k r m a t).design.catalog ++ (if macroCatalog then ["macro"] else []) } }

/-- A shown drug field for one fixed order-line slot. -/
def drugField (n : Nat) (preset : Prefill := .none) : Component :=
  { id := "drug" ++ toString n, kind := .field "drug" (.fixed n) preset, label := "Drug" }

/-- A shown assessment field for one fixed order-line slot. -/
def assessmentField (n : Nat) : Component :=
  { id := "assessment" ++ toString n, kind := .field "assessment" (.fixed n) .none, label := "Assessment" }

/-- A receipt-aware review hides only while a valid receipt covers it. -/
def reviewVisibility : Option ReviewMode → Visibility
  | some (.shownOrReceipt _ _) => .unlessReceipt "allergyList"
  | _ => .always

/-- An optional macro button runs the supplied order-fill steps. -/
def macroButton : Component :=
  { id := "fillOrdersButton", kind := .«macro» "fillOrders", label := "Fill orders" }

/-- A caller-supplied macro; acceptance enforces its existing automation rules. -/
def orderMacro (steps : List MacroStep) : Macro :=
  { id := "fillOrders", label := "Fill orders", steps }

/-- Both lines remain editable even after a new-line action advances currentSlot. -/
def screen (mode : Option ReviewMode := none) (preset : Prefill := .none)
    (withMacro : Bool := false) : Screen :=
  { Scalar.screen with components := [
    { id := "banner", kind := .banner }, drugField 0 preset, drugField 1 preset,
    assessmentField 0, assessmentField 1,
    { id := "allergies", kind := .panel "allergyList", label := "Allergies", visibility := reviewVisibility mode }, Scalar.button,
    { id := "alert", kind := .alert "clinicalAlert" false, label := "Clinical alert" },
    { id := "newLine", kind := .button .newOrderLine, label := "Next line" }] ++ (if withMacro then [macroButton] else []) }

/-- The two-line composer, including its real new-order-line action. -/
def program (r : Role) (mode : Option ReviewMode := none) (preset : Prefill := .none)
    (automation : Option (List MacroStep) := none) : Program :=
  { Scalar.program r with screens := [screen mode preset automation.isSome], macros := automation.toList.map orderMacro }

private theorem on_screen (k r m a t f u s moreAlerts catalog o preset automation)
    (h : Reachable ⟨spec k r m a t moreAlerts catalog, program r o preset automation, f, u⟩ s) : s.screen = "clinical" := by
  have hn := (reachable_screenNames ⟨spec k r m a t moreAlerts catalog, program r o preset automation, f, u⟩
    (by simp [program, Scalar.program, Program.screen?, screen, Scalar.screen]) s h).1
  exact (show "clinical" = s.screen by
    simpa [program, Scalar.program, Program.screen?, screen, Scalar.screen] using hn).symm

private theorem fixed_slots (r : Role) (o : Option ReviewMode) (preset : Prefill) (automation : Option (List MacroStep)) : FixedDrugSlots (program r o preset automation) [0, 1] := by
  intro sc hc slot pf hk
  simp only [allComps, program, Scalar.program, List.flatMap_cons, List.flatMap_nil,
    List.append_nil, List.mem_map] at hc
  obtain ⟨c, hc, rfl⟩ := hc
  cases automation <;> simp [screen] at hc
  all_goals
    repeat' first | (rcases hc with hc | hc) | cases hc
    all_goals simp [drugField, assessmentField, Scalar.button, macroButton, drugElement] at hk
    all_goals obtain ⟨rfl, rfl⟩ := hk; simp

private theorem shown_assessment (k r m a t f s n moreAlerts catalog o preset automation) (hs : s.screen = "clinical") (hn : n = 0 ∨ n = 1) :
    shownComp? (spec k r m a t moreAlerts catalog) (program r o preset automation) f s (assessmentField n).id = some (assessmentField n) := by
  rcases hn with rfl | rfl <;>
    simp [shownComp?, program, Scalar.program, Program.compsOf, Program.screen?, screen, Scalar.screen,
      hs, drugField, assessmentField, Scalar.button, compShown, layoutShown, layoutShownAux, ownVisible] <;> decide

private theorem shown_button (k r m a t f s moreAlerts catalog o preset automation) (hs : s.screen = "clinical") :
    shownComp? (spec k r m a t moreAlerts catalog) (program r o preset automation) f s Scalar.button.id = some Scalar.button := by
  simp [shownComp?, program, Scalar.program, Program.compsOf, Program.screen?, screen, Scalar.screen,
    hs, drugField, assessmentField, Scalar.button, compShown, layoutShown, layoutShownAux, ownVisible] <;> decide

-- Abbreviations for the fixed spec and program of `completable_many_alerts`;
-- hygiene is off so they name that theorem's own variables (and its local `o`).
set_option hygiene false in
local notation "𝕊" => spec k r m a t moreAlerts automation.isSome
set_option hygiene false in
local notation "ℙ" => program r o preset automation

/-- The two-fixed-slot composer stays completable from every reachable state,
including states after new-line advancement. Both per-line captures are repaired
before the finite alert-discharge path. Medication doses remain excluded. -/
theorem completable_many_alerts (k : ValueKind) (r : Role) (m : ReviewMode) (a : AlertCond) (t : Tier)
    (nonDose : k ≠ .medicationDose) (moreAlerts : List AlertSpec)
    (unique : ((spec k r m a t moreAlerts).alerts.map (·.id)).Nodup)
    (receiptAware : Bool := false) (preset : Prefill := .none)
    (automation : Option (List MacroStep) := none) :
    Completable (spec k r m a t moreAlerts automation.isSome)
      (program r (if receiptAware then some m else none) preset automation)
      (program r (if receiptAware then some m else none) preset automation) := by
  let o := if receiptAware then some m else none
  change Completable 𝕊 ℙ ℙ
  intro f u role scans s reachable c required _
  change u.role = r at role
  obtain rfl : c = "recordReview" := by
    have buttons := (List.mem_filter.mp (List.mem_filter.mp required).1).1
    cases automation <;> simpa [commitButtons, program, screen, drugField, assessmentField, Scalar.button, Scalar.program, macroButton, presetScreen, Program.presetOwner] using buttons
  have hs := on_screen k r m a t f u s moreAlerts automation.isSome o preset automation reachable
  have slots := reachable_drugSlots ⟨𝕊, ℙ, f, u⟩ [0, 1] (fixed_slots r o preset automation) s reachable
  obtain ⟨clear, modal, sameScreen, sameCaptured⟩ := human_clear_popup 𝕊 ℙ f u s
  let s₀ := runAll 𝕊 ℙ f u .human s clear
  have hs₀ : s₀.screen = "clinical" := sameScreen.trans hs
  obtain ⟨v, valid⟩ := declared_value_witness 𝕊 f u scans (Scalar.element k r) (by simp [spec])
  change valueSatisfies f u k v = true at valid
  have accepted : valueAccepted f u k v = true := by
    cases k <;> cases v <;> simp_all [valueSatisfies, valueAccepted]
  let capture (n : Nat) : Captured :=
    { element := "assessment", slot := n, value := v, byHuman := true, confirmed := true, provenance? := none, enteredAt? := epochNow f s₀ }
  let s₁ := { s₀ with captured := setCaptured s₀.captured (capture 0) }
  let s₂ := { s₁ with captured := setCaptured s₁.captured (capture 1) }
  have enter0 : step 𝕊 ℙ f u .human s₀ (.enter (assessmentField 0).id v) = (s₁, .ok) :=
    human_enter _ _ _ _ _ _ "assessment" (.fixed 0) .none (Scalar.element k r) v modal
      (shown_assessment k r m a t f s₀ 0 moreAlerts automation.isSome o preset automation hs₀ (Or.inl rfl)) rfl
      (by simp [spec, Spec.element?, drug, Scalar.element]) (by simpa [Scalar.element] using role)
      accepted (by simp [elementValueValid, Scalar.element, nonDose])
  have enter1 : step 𝕊 ℙ f u .human s₁ (.enter (assessmentField 1).id v) = (s₂, .ok) :=
    human_enter _ _ _ _ _ _ "assessment" (.fixed 1) .none (Scalar.element k r) v modal
      (shown_assessment k r m a t f s₁ 1 moreAlerts automation.isSome o preset automation hs₀ (Or.inr rfl)) rfl
      (by simp [spec, Spec.element?, drug, Scalar.element]) (by simpa [Scalar.element] using role)
      accepted (by simp [elementValueValid, Scalar.element, nonDose])
  have drug_slots : DrugSlotsWithin [0, 1] s₂ := by
    have h0 := step_drugSlots 𝕊 ℙ f u .human s₀ (.enter (assessmentField 0).id v) [0, 1]
      (fixed_slots r o preset automation) (by simpa only [DrugSlotsWithin, s₀, sameCaptured] using slots)
    rw [enter0] at h0
    have h1 := step_drugSlots 𝕊 ℙ f u .human s₁ (.enter (assessmentField 1).id v) [0, 1]
      (fixed_slots r o preset automation) h0
    rwa [enter1] at h1
  have ready : ∀ ack, guardBase 𝕊 ℙ f u { s₂ with acked := ack, popup? := none } "recordReview" = true := by
    intro ack
    have good (n : Nat) (hn : n = 0 ∨ n = 1) : hasGoodEntry f u
        { s₂ with acked := ack, popup? := none } (Scalar.element k r) (some n) = true := by
      apply List.any_eq_true.mpr
      refine ⟨if n = 0 then storedCapture s₀.captured (capture 0) else storedCapture s₁.captured (capture 1), ?_, ?_⟩
      · rcases hn with rfl | rfl <;> simp [s₂, s₁, setCaptured, storedCapture, capture, List.contains_iff_mem]
      · rcases hn with rfl | rfl <;> simp [storedCapture, capture, Scalar.element, capturedSatisfies, valid, entryValueAllowed]
    have perLine : entryMet 𝕊 f u { s₂ with acked := ack, popup? := none } entry = true := by
      simp only [entryMet, spec, Spec.element?, Scalar.element, drug, entry,
        List.find?_cons, beq_self_eq_true, ↓reduceIte]
      apply List.all_eq_true.mpr
      intro line hl
      have hn : line.1 = 0 ∨ line.1 = 1 := by
        change line ∈ orderLines s₂ at hl
        simpa using orderLines_slots [0, 1] s₂ drug_slots line hl
      simpa [lineMatches, Scalar.element] using good line.1 hn
    have entries : entriesOk 𝕊 f u { s₂ with acked := ack, popup? := none } "recordReview" = true := by
      change (entryMet 𝕊 f u _ entry && true) = true
      simp only [perLine, Bool.and_true]
    have reviews : reviewsOk 𝕊 ℙ f { s₂ with acked := ack, popup? := none } "recordReview" = true := by
      change (reviewMet 𝕊 ℙ f _ (Scalar.review m) && true) = true
      apply Bool.and_eq_true_iff.mpr
      refine ⟨(reviewMet_iff ⟨𝕊, ℙ, f, u⟩ _ (Scalar.review m)).mpr ?_, rfl⟩
      apply pinnedForReview_sound _ _ (Scalar.review m)
        { id := "allergies", kind := .panel "allergyList", label := "Allergies", visibility := reviewVisibility o }
      · simp [program, Scalar.program, Program.compsOf, Program.screen?, screen, Scalar.screen,
          s₂, s₁, hs₀]
      · cases receiptAware <;> cases m <;>
          simp [pinnedForReview, showsInfo, parentsFixed,
            reviewVisibility, o, receiptHideSafe, spec, Scalar.spec, Scalar.review,
            List.all_eq_true]
    rw [guardBase, entries, reviews]
    simp [spec, Scalar.spec, Spec.commit?, extraGuard, signingHasOrder, validationsOk, elementValueValid, drug, Scalar.element,
      nonDose, defaultsOk, displaysOk, actionLabelOk, entry, drugElement, waiverEligible]
    change (List.contains [r] u.role && true) = true
    simp [role]
  obtain ⟨finish, done⟩ := human_finish_ready_unique 𝕊 ℙ f u s₂ "recordReview" Scalar.button rfl modal ready
    (fun _ => shown_button k r m a t f _ moreAlerts automation.isSome o preset automation hs₀) unique
  refine ⟨clear ++ [.enter (assessmentField 0).id v, .enter (assessmentField 1).id v] ++ finish, ?_⟩
  simp only [Episode.afterHuman, runAll, List.foldl_append, List.foldl_cons, List.foldl_nil]
  change "recordReview" ∈ (runAll 𝕊 ℙ f u .human (step 𝕊 ℙ f u .human
    (step 𝕊 ℙ f u .human s₀ (.enter (assessmentField 0).id v)).1 (.enter (assessmentField 1).id v)).1 finish).commits
  rw [enter0, enter1]
  exact done

/-- The original one-alert fragment is the singleton case of the finite-family
completion construction, with its receipt-aware presentation option retained. -/
theorem completable (k : ValueKind) (r : Role) (m : ReviewMode) (a : AlertCond) (t : Tier)
    (nonDose : k ≠ .medicationDose) (receiptAware : Bool := false) :
    Completable (spec k r m a t)
      (program r (if receiptAware then some m else none))
      (program r (if receiptAware then some m else none)) :=
  completable_many_alerts k r m a t nonDose [] (by simp [spec]) receiptAware

#print axioms completable
#print axioms completable_many_alerts
end Ehr.Check.FixedLine
