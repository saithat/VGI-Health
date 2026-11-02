import Ehr.Render.UiTests

/-!
Named examples for the renderer claims in the verification audit.
Each uses the public fixtures and states the particular claim it proves.
-/
namespace Ehr.Proofs.RenderExamples
open Ehr Ehr.Render

/-- A rebuilt context cache equals the public interpreter view. -/
theorem context_cache_matches_view (cx : Ctx) : cx.v = view cx.sp cx.prog cx.facts cx.user cx.s := cx.v_exact

/-- The rendered banner includes the actual patient name and birth date. -/
theorem patient_banner_present : ("Patient", uiRoomCtx.disp.banner.name) ∈ uiScreenTest.banner ∧
    ("DOB", uiDate uiRoomCtx.disp.banner.dob) ∈ uiScreenTest.banner :=
  ⟨(D1_landmark _ _ _ _ _ _).2.1, (D1_landmark _ _ _ _ _ _).2.2.1⟩

/-- The actual sign screen contains its required allergy review. -/
theorem sign_allergy_review_present : ∃ comp label display, UiPresent
    (renderUi uiSignCtx.sp uiSignCtx.prog uiSignCtx.facts uiSignCtx.disp uiSignCtx.user uiSignCtx.s)
    (.info comp label uiReview.info display (uiRows uiSignCtx uiReview.info)) := by
  exact D2_commit_review uiSignCtx uiReview (by decide) (by decide) uiSignItem
    (uiSourceItem_mem uiSignCtx _ (by decide)) (by decide) (by decide)

/-- Every present Sign-screen button meets D3 action honesty. -/
theorem all_sign_screen_actions_honest : ∀ n, UiPresent
    (renderUi uiSignCtx.sp uiSignCtx.prog uiSignCtx.facts uiSignCtx.disp uiSignCtx.user uiSignCtx.s) n ∨
    n ∈ uiAtomsList
      (renderUi uiSignCtx.sp uiSignCtx.prog uiSignCtx.facts uiSignCtx.disp uiSignCtx.user uiSignCtx.s).modal.toList →
    UiActionHonest uiSignCtx n := D3_all_buttons uiSignCtx

/-- An interruptive allergy popup renders its enabled acknowledgment. -/
theorem interruptive_allergy_modal : (renderUi uiRoomCtx.sp uiRoomCtx.prog uiRoomCtx.facts uiRoomCtx.disp uiRoomCtx.user
    { uiRoomCtx.s with popup? := some ("drugAllergy", "amoxicillin") }).modal =
      some (.section "drugAllergy" "Drug–allergy match"
        [.button "drugAllergy" "Acknowledge" "ack" true none none]) := by
  apply D4_interruptive_modal { uiRoomCtx with viewCache := ⟨_, rfl⟩, s := { uiRoomCtx.s with popup? := some ("drugAllergy", "amoxicillin") } }
    "drugAllergy" "amoxicillin"
    { id := "drugAllergy", label := "Drug–allergy match", cond := .drugAllergy, tier := .interruptive, commit := "signOrders" }
    rfl (by decide) rfl

/-- A passive rule cannot produce a semantic modal, even in a supplied state. -/
theorem passive_rule_has_no_modal : (renderUi uiRoomCtx.sp uiRoomCtx.prog uiRoomCtx.facts uiRoomCtx.disp uiRoomCtx.user
    { uiRoomCtx.s with popup? := some ("careGap", "due") }).modal = none := by
  apply D4_passive_no_modal { uiRoomCtx with viewCache := ⟨_, rfl⟩, s := { uiRoomCtx.s with popup? := some ("careGap", "due") } }
    "careGap" "due"
    { id := "careGap", label := "Care gap due", cond := .careGap, tier := .passive, commit := "signOrders", screens := ["W1"] }
    rfl (by decide) rfl

/-- The real rooming weight field is present. -/
theorem weight_field_present : UiPresent uiScreenTest (uiField uiRoomCtx uiWeightItem "weight") :=
  (D6_clear_fields uiRoomCtx uiWeightItem "weight" (.fixed 0) (.fromRecord "weightToday")
    (uiSourceItem_mem uiRoomCtx _ (by decide)) (by decide) rfl).1

/-- The real rooming prefill has a pending confirmation. -/
theorem weight_confirmation_pending : uiWeightItem.pendingConfirm = true := by decide

/-- The pending prefill has a present confirm action. -/
theorem weight_confirmation_action_present : UiPresent uiScreenTest
    (.button "weightField" "Confirm prefilled value" "confirm" (uiEnabled uiRoomCtx "weightField")
      (uiBlocked uiRoomCtx "weightField") none) :=
  (D6_clear_fields uiRoomCtx uiWeightItem "weight" (.fixed 0) (.fromRecord "weightToday")
    (uiSourceItem_mem uiRoomCtx _ (by decide)) (by decide) rfl).2.2 (by decide)

/-- An empty source label receives a nonempty clinical fallback. -/
theorem empty_label_has_fallback : uiLabel "" "Clinical entry" ≠ "" := uiLabel_nonempty _ _ (by decide)

/-- Parsed FHIR allergy data appears in the rendered screen. -/
theorem fhir_allergy_rows_present : ∃ comp label display rows, UiPresent uiScreenTest
    (.info comp label "allergyList" display rows) ∧ (allergyCells (Fhir.allergyRow Fhir.tinyAllergy) ∈ rows ∨ uiAllergySummary (Fhir.allergyRow Fhir.tinyAllergy) ∈ rows) := by
  apply T11_ui_allergy_fhir uiRoomCtx Tests.context Fhir.tinyBundle Fhir.tinyAllergy
  · exact Fhir.tiny_parse
  · change Fhir.tinyAllergy ∈ [Fhir.tinyPatient, Fhir.tinyAllergy, Fhir.tinyMed, Fhir.tinyWeight]; simp
  · decide
  · decide
  · decide

/-- Parsed FHIR medication data appears in the rendered screen. -/
theorem fhir_medication_rows_present : ∃ comp label display rows,
    UiPresent (renderUi uiSignCtx.sp uiSignCtx.prog uiSignCtx.facts uiSignCtx.disp uiSignCtx.user uiSignCtx.s)
      (.info comp label "currentMeds" display rows) ∧ (medCells (Fhir.medRow Fhir.tinyMed) ∈ rows ∨ uiMedSummary (Fhir.medRow Fhir.tinyMed) ∈ rows) := by
  apply T11_ui_med_fhir uiSignCtx Tests.context Fhir.tinyBundle Fhir.tinyMed
  · exact Fhir.tiny_parse
  · change Fhir.tinyMed ∈ [Fhir.tinyPatient, Fhir.tinyAllergy, Fhir.tinyMed, Fhir.tinyWeight]; simp
  · decide
  · decide
  · decide

/-- The Sign button is absent from the rooming screen. -/
theorem other_screen_sign_button_absent : ∀ n, UiPresent uiScreenTest n → uiComp n ≠ some "signButton" := by
  apply T10_ui_hidden uiRoomCtx "signButton" (by decide)
  intro h
  obtain ⟨it, hm, hs, hid⟩ := h
  change it ∈ (view Examples.Tiny.spec Examples.Tiny.program Fhir.tinyFacts Examples.Tiny.user
    (init Examples.Tiny.spec Examples.Tiny.program Fhir.tinyFacts Examples.Tiny.user)).items at hm
  have : ∀ it ∈ uiRoomCtx.v.items, it.comp.id ≠ "signButton" := by decide
  exact this it hm hid

/-- Even a malformed sign-only program receives its required review rows. -/
theorem missing_review_is_supplemented : ∃ comp label display, UiPresent
    (renderUi uiMissingCtx.sp uiMissingCtx.prog uiMissingCtx.facts uiMissingCtx.disp uiMissingCtx.user uiMissingCtx.s)
    (.info comp label uiReview.info display (uiRows uiMissingCtx uiReview.info)) :=
  D2_required_info uiMissingCtx uiReview (by decide)

/-- A real firing passive care-gap alert appears inline. -/
theorem passive_care_gap_inline : UiPresent
    (renderUi uiPassiveCtx.sp uiPassiveCtx.prog uiPassiveCtx.facts uiPassiveCtx.disp uiPassiveCtx.user uiPassiveCtx.s)
    (.alert "careGapAlert" "careGap" "Care gap due" "passive") :=
  D4_passive_inline uiPassiveCtx uiPassiveItem "careGap" false
    { id := "careGap", label := "Care gap due", cond := .careGap, tier := .passive, commit := "signOrders", screens := ["W1"] }
    (by decide) (by decide) rfl (by decide) rfl

/-- Required allergy review rows remain in the workspace with the shell sidebar. -/
theorem shell_review_in_workspace : ∃ comp label display, UiWorkspacePresent uiShellScreen
    (.info comp label uiReview.info display (uiRows uiShellCtx uiReview.info)) :=
  D2_workspace_required uiShellCtx uiReview (by decide)

end Ehr.Proofs.RenderExamples
