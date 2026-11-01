import Ehr.Render.UiProofs
import Ehr.Render.Api
import Ehr.Render.NavRules

namespace Ehr.Render

/-- Nonempty parsed clinical records and a real interpreter state. -/
def uiRoomCtx : Ctx := tinyFhirCtx
def uiSignCtx : Ctx := { uiRoomCtx with s := { uiRoomCtx.s with screen := "sign" } }
def uiWeightItem : ItemView :=
  itemView uiRoomCtx.sp uiRoomCtx.facts uiRoomCtx.s (uiRoomCtx.prog.compsOf uiRoomCtx.s.screen)
    { id := "weightField", kind := .field "weight" (.fixed 0) (.fromRecord "weightToday"), label := "Weight", tag := "weight" }
def uiSignItem : ItemView :=
  itemView uiSignCtx.sp uiSignCtx.facts uiSignCtx.s (uiSignCtx.prog.compsOf uiSignCtx.s.screen)
    { id := "signButton", kind := .button (.commit "signOrders"), label := "Sign", hotkey? := some "Ctrl+Enter", tag := "sign" }
def uiReview : ReviewReq :=
  { commit := "signOrders", info := "allergyList", mode := .shownOrReceipt 720 [.physician, .np, .rn] }
def uiScreenTest : UiScreen :=
  renderUi uiRoomCtx.sp uiRoomCtx.prog uiRoomCtx.facts uiRoomCtx.disp uiRoomCtx.user uiRoomCtx.s

example : ("Patient", uiRoomCtx.disp.banner.name) ∈ uiScreenTest.banner ∧
    ("DOB", uiRoomCtx.disp.banner.dob) ∈ uiScreenTest.banner :=
  ⟨(D1_landmark _ _ _ _ _ _).2.1, (D1_landmark _ _ _ _ _ _).2.2.1⟩

example : ∃ comp label display, UiPresent
    (renderUi uiSignCtx.sp uiSignCtx.prog uiSignCtx.facts uiSignCtx.disp uiSignCtx.user uiSignCtx.s)
    (.info comp label uiReview.info display (uiRows uiSignCtx uiReview.info)) := by
  exact D2_commit_review uiSignCtx uiReview (by decide) (by decide) uiSignItem
    (by decide) (by decide) (by decide)

example : ∀ n, n ∈ uiAtomsList
    ((renderUi uiSignCtx.sp uiSignCtx.prog uiSignCtx.facts uiSignCtx.disp uiSignCtx.user uiSignCtx.s).workspace ++
     (renderUi uiSignCtx.sp uiSignCtx.prog uiSignCtx.facts uiSignCtx.disp uiSignCtx.user uiSignCtx.s).side ++
     (renderUi uiSignCtx.sp uiSignCtx.prog uiSignCtx.facts uiSignCtx.disp uiSignCtx.user uiSignCtx.s).modal.toList) →
    UiActionHonest uiSignCtx n := D3_all_buttons uiSignCtx

example : (renderUi uiRoomCtx.sp uiRoomCtx.prog uiRoomCtx.facts uiRoomCtx.disp uiRoomCtx.user
    { uiRoomCtx.s with popup? := some ("drugAllergy", "amoxicillin") }).modal =
      some (.section "drugAllergy" "Drug–allergy match"
        [.text "Drug–allergy match", .button "drugAllergy" "Acknowledge" "ack" true none none]) := by
  apply D4_interruptive_modal { uiRoomCtx with s := { uiRoomCtx.s with popup? := some ("drugAllergy", "amoxicillin") } }
    "drugAllergy" "amoxicillin"
    { id := "drugAllergy", label := "Drug–allergy match", cond := .drugAllergy, tier := .interruptive, commit := "signOrders" }
    rfl (by decide) rfl

example : (renderUi uiRoomCtx.sp uiRoomCtx.prog uiRoomCtx.facts uiRoomCtx.disp uiRoomCtx.user
    { uiRoomCtx.s with popup? := some ("careGap", "due") }).modal = none := by
  apply D4_passive_no_modal { uiRoomCtx with s := { uiRoomCtx.s with popup? := some ("careGap", "due") } }
    "careGap" "due"
    { id := "careGap", label := "Care gap due", cond := .careGap, tier := .passive, commit := "signOrders", screens := ["W1"] }
    rfl (by decide) rfl

example : UiPresent uiScreenTest (uiField uiRoomCtx uiWeightItem "weight") :=
  (D6_clear_fields uiRoomCtx uiWeightItem "weight" (.fixed 0) (.fromRecord "weightToday")
    (by decide) (by decide) rfl).1

-- The real weight prefill is pending: confirmation is not a vacuous branch.
example : uiWeightItem.pendingConfirm = true := by decide
example : UiPresent uiScreenTest
    (.button "weightField" "Confirm prefilled value" "confirm" (uiEnabled uiRoomCtx "weightField")
      (uiBlocked uiRoomCtx "weightField") none) :=
  (D6_clear_fields uiRoomCtx uiWeightItem "weight" (.fixed 0) (.fromRecord "weightToday")
    (by decide) (by decide) rfl).2.2 (by decide)

-- Empty labels are repaired, rather than rendering an unnamed field/button.
example : uiLabel "" "Clinical entry" ≠ "" := uiLabel_nonempty _ _ (by decide)

example : ∃ comp label display rows, UiPresent uiScreenTest
    (.info comp label "allergyList" display rows) ∧ allergyCells (Fhir.allergyRow Fhir.tinyAllergy) ∈ rows := by
  apply T11_ui_allergy_fhir uiRoomCtx Tests.context Fhir.tinyBundle Fhir.tinyAllergy
  · exact Fhir.tiny_parse
  · change Fhir.tinyAllergy ∈ [Fhir.tinyPatient, Fhir.tinyAllergy, Fhir.tinyMed, Fhir.tinyWeight]; simp
  · decide
  · decide
  · decide

example : ∃ comp label display rows,
    UiPresent (renderUi uiSignCtx.sp uiSignCtx.prog uiSignCtx.facts uiSignCtx.disp uiSignCtx.user uiSignCtx.s)
      (.info comp label "currentMeds" display rows) ∧ medCells (Fhir.medRow Fhir.tinyMed) ∈ rows := by
  apply T11_ui_med_fhir uiSignCtx Tests.context Fhir.tinyBundle Fhir.tinyMed
  · exact Fhir.tiny_parse
  · change Fhir.tinyMed ∈ [Fhir.tinyPatient, Fhir.tinyAllergy, Fhir.tinyMed, Fhir.tinyWeight]; simp
  · decide
  · decide
  · decide

-- A component on another screen must be absent here; the concrete premise holds.
example : ∀ n, UiPresent uiScreenTest n → uiComp n ≠ some "signButton" := by
  apply T10_ui_hidden uiRoomCtx "signButton" (by decide)
  intro h
  obtain ⟨it, hm, hs, hid⟩ := h
  change it ∈ (view Examples.Tiny.spec Examples.Tiny.program Fhir.tinyFacts Examples.Tiny.user
    (init Examples.Tiny.spec Examples.Tiny.program Fhir.tinyFacts Examples.Tiny.user)).items at hm
  have : ∀ it ∈ uiRoomCtx.v.items, it.comp.id ≠ "signButton" := by decide
  exact this it hm hid

-- A malformed program containing only the commit still gets its review rows.
def uiMissingCtx : Ctx :=
  { uiSignCtx with prog := { uiSignCtx.prog with screens :=
    [{ id := "sign", title := "Sign", workflow := "W1", components := [uiSignItem.comp] }] } }

example : ∃ comp label display, UiPresent
    (renderUi uiMissingCtx.sp uiMissingCtx.prog uiMissingCtx.facts uiMissingCtx.disp uiMissingCtx.user uiMissingCtx.s)
    (.info comp label uiReview.info display (uiRows uiMissingCtx uiReview.info)) :=
  D2_required_info uiMissingCtx uiReview (by decide)

-- Passive alert presentation uses a satisfiable firing interpreter view.
def uiPassiveCtx : Ctx :=
  { tinyCtx with s := { tinyCtx.s with screen := "order" } }
def uiPassiveItem : ItemView :=
  itemView uiPassiveCtx.sp uiPassiveCtx.facts uiPassiveCtx.s (uiPassiveCtx.prog.compsOf "order")
    { id := "careGapAlert", kind := .alert "careGap" false, label := "Care gap", tag := "careGap" }
example : UiPresent
    (renderUi uiPassiveCtx.sp uiPassiveCtx.prog uiPassiveCtx.facts uiPassiveCtx.disp uiPassiveCtx.user uiPassiveCtx.s)
    (.alert "careGapAlert" "careGap" "Care gap due" "passive") :=
  D4_passive_inline uiPassiveCtx uiPassiveItem "careGap" false
    { id := "careGap", label := "Care gap due", cond := .careGap, tier := .passive, commit := "signOrders", screens := ["W1"] }
    (by decide) (by decide) rfl (by decide) rfl

#guard uiFieldKind .identity == "identity"
#guard uiFieldKind (.scan "wristband") == "scan"
#guard uiFieldKind .cosign == "cosign"
#guard (uiFieldKind (.coded "formulary")).startsWith "code:"
#guard (uiClinicalBanner uiRoomCtx.facts uiRoomCtx.disp).lookup "Code status" == some "Not recorded"
#guard uiHundredths 405 == "4.05"
#guard uiHundredths 450 == "4.50"
#guard (Lean.Json.parse (encodeJson uiScreenTest)).isOk
#guard match decodeJson UiScreen (encodeJson uiScreenTest) with
  | .ok screen => Lean.toJson screen == Lean.toJson uiScreenTest
  | .error _ => false
#guard (uiSteps uiRoomCtx).length == 3
#guard decide (NavSane uiRoomCtx.sp uiRoomCtx.prog)
#guard (uiRows uiRoomCtx "allergyList").length == 1
#guard (uiRows uiSignCtx "currentMeds").length == 1
#guard (uiMissingReviews uiMissingCtx).length == 2
#guard uiWeightItem.pendingConfirm
#guard uiBlocked uiSignCtx "signButton" != none

#print axioms D1_landmark
#print axioms D2_required_info
#print axioms D2_commit_review
#print axioms D3_honest_actions
#print axioms D3_all_buttons
#print axioms D4_interruptive_modal
#print axioms D4_passive_no_modal
#print axioms D4_passive_inline
#print axioms D6_clear_fields
#print axioms D6_field_labels
#print axioms T10_ui_shown
#print axioms T10_ui_only_shown
#print axioms T10_ui_hidden
#print axioms T11_ui_info
#print axioms T11_ui_allergy_rows
#print axioms T11_ui_med_rows
#print axioms T11_ui_allergy_fhir
#print axioms T11_ui_med_fhir

end Ehr.Render
