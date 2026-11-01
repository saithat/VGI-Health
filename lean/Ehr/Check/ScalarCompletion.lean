import Ehr.Check.Completion

/-! A nonempty completion fragment: one flat screen, one unrestricted scalar
entry, a pinned allergy review, and one alert of any condition and tier.
No assumptions on patient facts or reachable captures are added. -/
namespace Ehr.Check.Scalar
open Ehr Ehr.Props

/-- The fragment's human-entered scalar; its kind is a parameter. -/
def element (kind : ValueKind) (role : Role) : ElementSpec :=
  { id := "assessment", label := "Assessment", kind, enteredBy := [role],
    prefill := .never, friction := .safety, humanOnly := true, fhirTarget := "Observation.value" }

/-- The assessment must be entered before the clinical review is recorded. -/
def entry : EntryReq := { commit := "recordReview", element := "assessment" }

/-- The full allergy review is pinned, so either review mode can be satisfied. -/
def review (mode : ReviewMode) : ReviewReq :=
  { commit := "recordReview", info := "allergyList", mode }

/-- One clinical alert; the proof supports every condition and every tier. -/
def alert (cond : AlertCond) (tier : Tier) : AlertSpec :=
  { id := "clinicalAlert", commit := "recordReview", label := "Clinical alert", cond, tier, screens := ["clinical"] }

/-- A scalar clinical-review spec with real entry, review and alert obligations. -/
def spec (kind : ValueKind) (role : Role) (mode : ReviewMode) (cond : AlertCond) (tier : Tier) : Spec :=
  { version := "scalar-completion", elements := [element kind role],
    infos := [{ id := "allergyList", label := "Allergies", version := "allergyVersion" }],
    commits := [{ id := "recordReview", label := "Record review", roles := [role] }],
    entries := [entry], reviews := [review mode], alerts := [alert cond tier],
    design := { maxDepth := 0, minTextSize := 12, stabilityBudget := 0, landmarks := ["patientBanner"], catalog := ["banner", "field", "panel", "button", "alert"] } }

/-- The scalar-entry control is always visible and never prefilled. -/
def field : Component :=
  { id := "assessmentField", kind := .field "assessment" (.fixed 0) .none, label := "Assessment" }

/-- The human's commit button is always visible. -/
def button : Component :=
  { id := "recordButton", kind := .button (.commit "recordReview"), label := "Record review" }

/-- The fragment's flat screen pins its review and alert alongside the entry. -/
def screen : Screen :=
  { id := "clinical", title := "Clinical review", workflow := "clinical", components := [
    { id := "banner", kind := .banner }, field,
    { id := "allergies", kind := .panel "allergyList", label := "Allergies" }, button,
    { id := "alert", kind := .alert "clinicalAlert" false, label := "Clinical alert" }] }

/-- A single-screen clinical program, parameterized by the permitted role. -/
def program (role : Role) : Program :=
  { id := "scalar-clinical", version := 1, owner := "clinician", role,
    specVersion := "scalar-completion", start := "clinical", screens := [screen], macros := [] }

private theorem on_screen (k r m a t f u s)
    (h : Reachable ⟨spec k r m a t, program r, f, u⟩ s) : s.screen = "clinical" := by
  have hn := (reachable_screenNames ⟨spec k r m a t, program r, f, u⟩ (by simp [program, Program.screen?, screen]) s h).1
  exact (show "clinical" = s.screen by simpa [program, Program.screen?, screen] using hn).symm

private theorem shown_field (k r m a t f s) (hs : s.screen = "clinical") :
    shownComp? (spec k r m a t) (program r) f s field.id = some field := by
  simp [shownComp?, program, Program.compsOf, Program.screen?, screen, hs, field, button,
    compShown, layoutShown, layoutShownAux, ownVisible, spec]

private theorem shown_button (k r m a t f s) (hs : s.screen = "clinical") :
    shownComp? (spec k r m a t) (program r) f s button.id = some button := by
  simp [shownComp?, program, Program.compsOf, Program.screen?, screen, hs, field, button,
    compShown, layoutShown, layoutShownAux, ownVisible, spec]

/-- Completing this fragment needs no assumed continuation. Clear a popup,
enter a valid scalar value, then click/acknowledge until the commit succeeds.
Medication doses are excluded because they need a selected formulary drug. -/
theorem completable (k : ValueKind) (r : Role) (m : ReviewMode) (a : AlertCond) (t : Tier)
    (nonDose : k ≠ .medicationDose) :
    Completable (spec k r m a t) (program r) (program r) := by
  intro f u role scans s reachable c required _
  change u.role = r at role
  have hc : c = "recordReview" := by
    have buttons := (List.mem_filter.mp (List.mem_filter.mp required).1).1
    simpa [commitButtons, program, screen, field, button,
      presetScreen, Program.presetOwner] using buttons
  subst c
  have hs := on_screen k r m a t f u s reachable
  obtain ⟨clear, modal, sameScreen, _⟩ := human_clear_popup (spec k r m a t) (program r) f u s
  let s₀ := runAll (spec k r m a t) (program r) f u .human s clear
  have hs₀ : s₀.screen = "clinical" := sameScreen.trans hs
  obtain ⟨v, valid⟩ := declared_value_witness (spec k r m a t) f u scans (element k r) (by simp [spec])
  change valueSatisfies f u k v = true at valid
  have accepted : valueAccepted f u k v = true := by
    cases k <;> cases v <;> simp_all [valueSatisfies, valueAccepted]
  let x : Captured := { element := "assessment", slot := 0, value := v, byHuman := true, confirmed := true, provenance? := none }
  let s₁ := { s₀ with captured := setCaptured s₀.captured x }
  have entered : step (spec k r m a t) (program r) f u .human s₀ (.enter field.id v) = (s₁, .ok) :=
    human_enter _ _ _ _ _ field "assessment" (.fixed 0) .none (element k r) v modal
      (shown_field k r m a t f s₀ hs₀) rfl (by simp [spec, Spec.element?, element])
      (by simpa [element] using role) accepted (by simp [elementValueValid, element, nonDose])
  have ready : ∀ ack, guardBase (spec k r m a t) (program r) f u
      { s₁ with acked := ack, popup? := none } "recordReview" = true := by
    intro ack
    have good : hasGoodEntry f u { s₁ with acked := ack, popup? := none } (element k r) none = true := by
      apply List.any_eq_true.mpr
      exact ⟨storedCapture s₀.captured x, by simp [s₁, setCaptured], by simp [storedCapture, x, element, capturedSatisfies, valid, entryValueAllowed]⟩
    have info : infoShown (spec k r m a t) (program r) f
        { s₁ with acked := ack, popup? := none } "allergyList" = true := by
      simp [infoShown, program, Program.compsOf, Program.screen?, screen, s₁, hs₀, field, button,
        showsInfo, layoutShown, layoutShownAux, ownVisible, spec]
    simp only [element] at good
    simp only [spec, element, entry, review] at info
    simp [guardBase, commitRoleOk, roleOk, encounterRolesOk, CommitSpec.encounterRoleAllowed, spec, Spec.commit?, role,
      entriesOk, entryMet, entry, Spec.element?, element, good,
      reviewsOk, reviewMet, review, info, extraGuard, signingHasOrder, validationsOk, elementValueValid, nonDose,
      defaultsOk, displaysOk, actionLabelOk, whenHolds]
  have consistent : ∀ z, popupCandidates (spec k r m a t) (program r) f z "recordReview" = [] →
      alertsAcked (spec k r m a t) f z "recordReview" = true := by
    intro z hz
    cases t with
    | passive => simp [alertsAcked, spec, alert]
    | removable => simp [alertsAcked, spec, alert]
    | interruptive =>
      simpa [popupCandidates, canPopup, spec, Spec.alert?, alert, List.filter_eq_nil_iff,
        alertsAcked, List.all_eq_true] using hz
  obtain ⟨finish, done⟩ := human_finish_ready (spec k r m a t) (program r) f u s₁ "recordReview" button
    rfl modal ready (fun _ => shown_button k r m a t f _ hs₀) consistent
  refine ⟨clear ++ [.enter field.id v] ++ finish, ?_⟩
  simp only [Episode.afterHuman, runAll, List.foldl_append, List.foldl_cons, List.foldl_nil]
  change "recordReview" ∈ (runAll (spec k r m a t) (program r) f u .human
    (step (spec k r m a t) (program r) f u .human s₀ (.enter field.id v)).1 finish).commits
  rw [entered]
  exact done

#print axioms completable
end Ehr.Check.Scalar
