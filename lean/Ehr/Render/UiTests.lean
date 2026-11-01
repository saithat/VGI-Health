import Ehr.Render.UiProofs
import Ehr.Render.Api
import Ehr.Render.NavRules

namespace Ehr.Render

/-- Nonempty parsed clinical records and a real interpreter state. -/
def uiRoomCtx : Ctx := tinyFhirCtx
def uiSignCtx : Ctx := { uiRoomCtx with viewCache := ⟨_, rfl⟩, s := { uiRoomCtx.s with screen := "sign" } }
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

/-- Focused documentation uses the program's reports instead of a duplicate
generated rail. The ordinary field and commit-review proofs still apply. -/
def focusedClinicProgram : Program :=
  { uiRoomCtx.prog with screens := uiRoomCtx.prog.screens.map fun screen =>
      { screen with components := screen.components.map fun c =>
          if c.kind == .banner then { c with tag := "layout.focusedWorkspace" } else c } }
def focusedClinicUi : UiScreen :=
  renderUi uiRoomCtx.sp focusedClinicProgram uiRoomCtx.facts uiRoomCtx.disp uiRoomCtx.user uiRoomCtx.s
#guard focusedClinicUi.side.isEmpty

/-- Ambulatory activities use their real navigator without a wizard progress strip. -/
def clinicalActivityProgram : Program :=
  { uiRoomCtx.prog with screens := uiRoomCtx.prog.screens.map fun screen =>
      { screen with components := screen.components.map fun c =>
          if c.kind == .banner then { c with tag := "layout.clinicalActivity" } else c } }
def clinicalActivityUi : UiScreen :=
  renderUi uiRoomCtx.sp clinicalActivityProgram uiRoomCtx.facts uiRoomCtx.disp uiRoomCtx.user uiRoomCtx.s
#guard !clinicalActivityUi.workspace.any (fun n => match n with | .stepper .. => true | _ => false)
#guard clinicalActivityUi.screen? == some uiRoomCtx.s.screen

/-- Banner conversion preserves the source units; it cannot confirm dosing weight. -/
def poundsBannerExample : Display :=
  { uiRoomCtx.disp with banner := { uiRoomCtx.disp.banner with weight? := some (1880, .lb, "") } }
#guard uiBannerWeight uiRoomCtx.facts poundsBannerExample == "85.3 kg (from 188.0 lb)"
def poundsFactsExample : Facts := { uiRoomCtx.facts with weightToday? := some (1880, .lb) }
#guard uiBannerWeight poundsFactsExample { poundsBannerExample with asOf := "", banner :=
  { poundsBannerExample.banner with weight? := none } } == "85.3 kg (from 188.0 lb)"
#guard poundsFactsExample.weightToday? == some (1880, .lb)

/-- A valid insulin dose stays in units in its daily preview and review status. -/
def nativeUnitReviewCtx : Ctx :=
  { uiSignCtx with viewCache := ⟨_, rfl⟩, s := { uiSignCtx.s with captured :=
      [{ element := "drug", slot := 0, value := .code "insulin lispro", byHuman := true, confirmed := true },
       { element := "dose", slot := 0, value := .qty 20 .units, byHuman := true, confirmed := true },
       { element := "freq", slot := 0, value := .code "daily", byHuman := true, confirmed := true }] } }
#guard (uiDoseRows nativeUnitReviewCtx).any fun row =>
  row.lookup "At entered frequency" == some "2.0 units/day" &&
  row.lookup "Dose check" == some "No out-of-range flag"

-- A narrative editor keeps the original interpreter's human-entry marker.
#guard match uiField uiRoomCtx uiWeightItem "hpi" with
  | .field _ _ kind _ _ _ _ human _ => kind == "textarea" && human == uiWeightItem.humanOnly
  | _ => false

-- Input updates rebuild the dependent cache; a rooming view cannot leak
-- into a sign state. The equality also holds for every arbitrary context.
#guard uiRoomCtx.v.screen == uiRoomCtx.s.screen
#guard uiSignCtx.v.screen == "sign"
example (cx : Ctx) : cx.v = view cx.sp cx.prog cx.facts cx.user cx.s := cx.v_exact
#print axioms Ctx.v_exact

example : ("Patient", uiRoomCtx.disp.banner.name) ∈ uiScreenTest.banner ∧
    ("DOB", uiDate uiRoomCtx.disp.banner.dob) ∈ uiScreenTest.banner :=
  ⟨(D1_landmark _ _ _ _ _ _).2.1, (D1_landmark _ _ _ _ _ _).2.2.1⟩

example : ∃ comp label display, UiPresent
    (renderUi uiSignCtx.sp uiSignCtx.prog uiSignCtx.facts uiSignCtx.disp uiSignCtx.user uiSignCtx.s)
    (.info comp label uiReview.info display (uiRows uiSignCtx uiReview.info)) := by
  exact D2_commit_review uiSignCtx uiReview (by decide) (by decide) uiSignItem
    (by decide) (by decide) (by decide)

example : ∀ n, UiPresent
    (renderUi uiSignCtx.sp uiSignCtx.prog uiSignCtx.facts uiSignCtx.disp uiSignCtx.user uiSignCtx.s) n ∨
    n ∈ uiAtomsList
      (renderUi uiSignCtx.sp uiSignCtx.prog uiSignCtx.facts uiSignCtx.disp uiSignCtx.user uiSignCtx.s).modal.toList →
    UiActionHonest uiSignCtx n := D3_all_buttons uiSignCtx

example : (renderUi uiRoomCtx.sp uiRoomCtx.prog uiRoomCtx.facts uiRoomCtx.disp uiRoomCtx.user
    { uiRoomCtx.s with popup? := some ("drugAllergy", "amoxicillin") }).modal =
      some (.section "drugAllergy" "Drug–allergy match"
        [.button "drugAllergy" "Acknowledge" "ack" true none none]) := by
  apply D4_interruptive_modal { uiRoomCtx with viewCache := ⟨_, rfl⟩, s := { uiRoomCtx.s with popup? := some ("drugAllergy", "amoxicillin") } }
    "drugAllergy" "amoxicillin"
    { id := "drugAllergy", label := "Drug–allergy match", cond := .drugAllergy, tier := .interruptive, commit := "signOrders" }
    rfl (by decide) rfl

example : (renderUi uiRoomCtx.sp uiRoomCtx.prog uiRoomCtx.facts uiRoomCtx.disp uiRoomCtx.user
    { uiRoomCtx.s with popup? := some ("careGap", "due") }).modal = none := by
  apply D4_passive_no_modal { uiRoomCtx with viewCache := ⟨_, rfl⟩, s := { uiRoomCtx.s with popup? := some ("careGap", "due") } }
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
    (.info comp label "allergyList" display rows) ∧ (allergyCells (Fhir.allergyRow Fhir.tinyAllergy) ∈ rows ∨ uiAllergySummary (Fhir.allergyRow Fhir.tinyAllergy) ∈ rows) := by
  apply T11_ui_allergy_fhir uiRoomCtx Tests.context Fhir.tinyBundle Fhir.tinyAllergy
  · exact Fhir.tiny_parse
  · change Fhir.tinyAllergy ∈ [Fhir.tinyPatient, Fhir.tinyAllergy, Fhir.tinyMed, Fhir.tinyWeight]; simp
  · decide
  · decide
  · decide

example : ∃ comp label display rows,
    UiPresent (renderUi uiSignCtx.sp uiSignCtx.prog uiSignCtx.facts uiSignCtx.disp uiSignCtx.user uiSignCtx.s)
      (.info comp label "currentMeds" display rows) ∧ (medCells (Fhir.medRow Fhir.tinyMed) ∈ rows ∨ uiMedSummary (Fhir.medRow Fhir.tinyMed) ∈ rows) := by
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
  { uiSignCtx with viewCache := ⟨_, rfl⟩, prog := { uiSignCtx.prog with screens :=
    [{ id := "sign", title := "Sign", workflow := "W1", components := [uiSignItem.comp] }] } }

example : ∃ comp label display, UiPresent
    (renderUi uiMissingCtx.sp uiMissingCtx.prog uiMissingCtx.facts uiMissingCtx.disp uiMissingCtx.user uiMissingCtx.s)
    (.info comp label uiReview.info display (uiRows uiMissingCtx uiReview.info)) :=
  D2_required_info uiMissingCtx uiReview (by decide)

/-- Overview omits automatic summaries but keeps explicit side info and controls. -/
def uiOverviewCtx : Ctx :=
  { uiMissingCtx with viewCache := ⟨_, rfl⟩, prog := { uiMissingCtx.prog with screens :=
    [{ id := "sign", title := "Sign", workflow := "W1", components :=
      [uiSignItem.comp,
       { id := "overview", kind := .table "labResults", label := "Results", tag := "layout.overview.present.results" },
       { id := "explicit-allergies", kind := .panel "allergyList", label := "Allergies", tag := "sidebar" },
       { id := "explicit-action", kind := .button (.goto "sign"), label := "Return", tag := "sidebar" }] }] } }
#guard uiOverview uiOverviewCtx
#guard (uiSide uiOverviewCtx).length == 2
#guard (uiAtomsList (uiSide uiOverviewCtx)).any (fun n => uiComp n == some "explicit-action")
#guard (uiAtomsList (uiSide uiOverviewCtx)).any (fun n => uiComp n == some "explicit-allergies")

/-- Required commit reviews remain visible on a source-selected overview screen. -/
theorem overview_commit_review_example : ∃ comp label display, UiPresent
    (renderUi uiOverviewCtx.sp uiOverviewCtx.prog uiOverviewCtx.facts uiOverviewCtx.disp uiOverviewCtx.user uiOverviewCtx.s)
    (.info comp label uiReview.info display (uiRows uiOverviewCtx uiReview.info)) :=
  D2_required_info uiOverviewCtx uiReview (by decide)

-- Passive alert presentation uses a satisfiable firing interpreter view.
def uiPassiveCtx : Ctx :=
  { tinyCtx with viewCache := ⟨_, rfl⟩, s := { tinyCtx.s with screen := "order" } }
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

/-- A real interpreter fixture for shell relocation and current-episode orders. -/
def uiShellCtx : Ctx :=
  { uiRoomCtx with
    viewCache := ⟨_, rfl⟩
    prog := { uiRoomCtx.prog with start := "shell", screens :=
      [{ id := "shell", title := "Shell regression", workflow := "W1", components :=
        [{ id := "shell.banner", kind := .banner, label := "Patient banner" },
         { id := "shell.nav", kind := .group false false, tag := "navigator", label := "Visit" },
         { id := "shell.nav.next", kind := .button (.goto "next"), parent? := some "shell.nav", label := "Next screen" },
         { id := "shell.sidebar", kind := .group true false, tag := "sidebar", label := "Clinical summary" },
         { id := "shell.side.problems", kind := .table "problemList", parent? := some "shell.sidebar", label := "Active problems" },
         { id := "shell.side.meds", kind := .table "currentMeds", parent? := some "shell.sidebar", label := "Medications" },
         { id := "shell.side.allergies", kind := .panel "allergyList", parent? := some "shell.sidebar", label := "Allergies" },
         { id := "shell.allergyReview", kind := .group false false, label := "Allergies" },
         { id := "shell.allergyDetail", kind := .group false false, parent? := some "shell.allergyReview", label := "Allergies" },
         { id := "shell.allergyRecords", kind := .panel "allergyList", parent? := some "shell.allergyDetail", label := "Allergies" },
         { id := "shell.medication", kind := .group false false, label := "Medication" },
         { id := "shell.drug", kind := .field "drug" (.fixed 0) .none, parent? := some "shell.medication", label := "Medication" },
         { id := "shell.allProblems", kind := .table "problemList", label := "Full problem list" },
         { id := "shell.orders", kind := .panel "orderSummary", label := "Order summary" },
         { id := "shell.sign", kind := .button (.commit "signOrders"), label := "Sign" }] },
       { id := "next", title := "Next screen", workflow := "W1", components := [] }] }
    s := { uiRoomCtx.s with screen := "shell", expanded := ["shell.sidebar"], captured :=
      [{ element := "drug", slot := 0, value := .code "amoxicillin", confirmed := true, byHuman := true },
       { element := "dose", slot := 0, value := .qty 5000 .mg, confirmed := true, byHuman := true },
       { element := "route", slot := 0, value := .code "PO", confirmed := true, byHuman := true },
       { element := "freq", slot := 0, value := .code "bid", confirmed := true, byHuman := true },
       { element := "duration", slot := 0, value := .text "7 days", confirmed := true, byHuman := true },
       { element := "quantity", slot := 0, value := .qty 140 .none, confirmed := true, byHuman := true },
       { element := "refills", slot := 0, value := .qty 0 .none, confirmed := true, byHuman := true },
       { element := "prescriptionDirections", slot := 0, value := .text "Take by mouth twice daily", confirmed := true, byHuman := true },
       { element := "abxIndication", slot := 0, value := .text "Otitis media", confirmed := true, byHuman := true },
       { element := "controlledPrescriberName", slot := 0, value := .text "Alex Chen", confirmed := true, byHuman := true },
       { element := "prescriberFederalRegistration", slot := 0, value := .text "AB1234567", confirmed := true, byHuman := true },
       { element := "drug", slot := 1, value := .code "ibuprofen", confirmed := true, byHuman := true }] }
    disp := { uiRoomCtx.disp with asOf := "2026-05-06", problems :=
      [{ id := "active", name := "Hypertension", code := "htn", onset := "2026-05-06", abatement := "", status := "active" },
       { id := "resolved", name := "Otitis media", code := "om", onset := "2025-05-06", abatement := "2025-06-01", status := "resolved" }] } }

def uiShellScreen : UiScreen := renderUi uiShellCtx.sp uiShellCtx.prog uiShellCtx.facts uiShellCtx.disp uiShellCtx.user uiShellCtx.s

#guard uiNavGroup { uiSignItem with comp := { uiSignItem.comp with kind := .group false true, tag := "nav" } }
-- A non-collapsible group is open in the interpreter regardless of its saved
-- startCollapsed bit. Exercise the full shell, not just tag classification.
def uiNavSavedCollapsedCtx : Ctx :=
  { uiShellCtx with viewCache := ⟨_, rfl⟩, prog := { uiShellCtx.prog with screens := uiShellCtx.prog.screens.map fun sc =>
    { sc with components := sc.components.map fun c =>
      if c.id == "shell.nav" then { c with kind := .group false true } else c } } }

#guard (renderUi uiNavSavedCollapsedCtx.sp uiNavSavedCollapsedCtx.prog uiNavSavedCollapsedCtx.facts
    uiNavSavedCollapsedCtx.disp uiNavSavedCollapsedCtx.user uiNavSavedCollapsedCtx.s).nav ==
    [("Visit", [("shell.nav.next", "Next screen")])]
#guard uiShellScreen.nav == [("Visit", [("shell.nav.next", "Next screen")])]
#guard (step uiShellCtx.sp uiShellCtx.prog uiShellCtx.facts uiShellCtx.user .human uiShellCtx.s (.click "shell.nav.next")).1.screen == "next"
#guard !(uiAtomsList uiShellScreen.workspace).any (fun n => match n with
  | .info _ _ "patientBanner" _ _ | .section "shell.nav" _ _ | .section "shell.sidebar" _ _ | .button "shell.nav.next" _ _ _ _ _ => true
  | _ => false)
#guard (uiAtomsList uiShellScreen.side).any (fun n => match n with
  | .info "shell.side.problems" _ "problemList" "list" rows => rows == [[("Record", "Hypertension (active)")]]
  | _ => false)
#guard (uiAtomsList uiShellScreen.workspace).any (fun n => match n with
  | .info "shell.allProblems" _ "problemList" "table" rows => rows.length == 2
  | _ => false)
#guard (uiAtomsList uiShellScreen.side).any (fun n => match n with
  | .button "shell.sidebar" "Collapse section" "toggle" _ _ _ => true
  | _ => false)
#guard (uiAtomsList uiShellScreen.workspace).any (fun n => match n with
  | .info "shell.orders" _ "orderSummary" "table" rows => rows.length == 2 &&
      rows.head!.lookup "Dose" == some "500.0 mg" &&
      rows.head!.lookup "Directions" == some "Take by mouth twice daily" &&
      rows.head!.lookup "Indication" == some "Otitis media" &&
      rows[1]!.lookup "Prescriber" == some "Alex Chen" &&
      rows[1]!.lookup "Registration" == some "AB1234567"
  | _ => false)
#guard (uiAtomsList uiShellScreen.workspace).any (fun n => match n with
  | .field "shell.drug" "Enter Medication" _ _ _ _ _ _ _ => true | _ => false)
#guard (uiAtomsList uiShellScreen.workspace).any (fun n => match n with
  | .info "shell.allergyRecords" "Records" _ _ _ => true | _ => false)
#guard (uiAtomsList uiShellScreen.workspace).any (fun n => match n with
  | .section "shell.allergyDetail" "Details" _ => true | _ => false)
#guard uiRows uiShellCtx "controlledSigningQuantity" == uiRows uiShellCtx "orderSummary"
#guard uiDate "2026-05-06T13:28:42-07:00" == "May 6, 2026 13:28"
#guard uiDate "2024-02-29" == "Feb 29, 2024"
#guard uiDate "2025-02-29" == "2025-02-29"
#guard uiDate "2026-05-06 start the new medication" == "2026-05-06 start the new medication"
#guard uiDate "Not recorded" == "Not recorded"
#guard uiReasonText uiRoomCtx "entry required: patientIdReentry" == "Re-enter patient ID (initials / sex / age) to sign"
#guard !(uiReasonText uiRoomCtx "review required: allergyList must be shown").startsWith "review required: allergyList"

example : ∃ comp label display, UiWorkspacePresent uiShellScreen
    (.info comp label uiReview.info display (uiRows uiShellCtx uiReview.info)) :=
  D2_workspace_required uiShellCtx uiReview (by decide)

#print axioms T11_ui_full_info
#print axioms D2_workspace_required
#print axioms uiNav_mem

-- Both current and recorded Notes routes use the same complete display rows.
def uiNotesCtx : Ctx :=
  { uiRoomCtx with
    disp := { uiRoomCtx.disp with
      notes := [Fhir.noteRow Tests.note]
      history := Fhir.historyRows [Tests.homeMed, Tests.family, Tests.social, Tests.surgery] } }
#guard uiRows uiNotesCtx "encounterNotes" == [noteCells (Fhir.noteRow Tests.note)]
#guard uiRows uiNotesCtx "priorNotes" == uiRows uiNotesCtx "encounterNotes"
#guard (uiRows uiNotesCtx "importedHistory").length == 5
#guard (uiRows uiNotesCtx "familyHistory").length == 2
#guard (uiRows uiNotesCtx "socialHistory").length == 1
#guard (uiRows uiNotesCtx "surgicalHistory").length == 1
#guard uiRows uiNotesCtx "currentMeds" == uiRows uiRoomCtx "currentMeds"
#guard uiNotesCtx.facts.receipts == uiRoomCtx.facts.receipts

/-- A real shown search input, independent from clinical capture. -/
def uiSearchCtx : Ctx :=
  { uiRoomCtx with viewCache := ⟨_, rfl⟩, prog := { uiRoomCtx.prog with
      screens := uiRoomCtx.prog.screens.map fun screen =>
        if screen.id == uiRoomCtx.s.screen then { screen with components := screen.components ++
          [{ id := "chartSearch", label := "Search chart", kind := .search "chart", tag := "search" }] }
        else screen } }

def uiSearchEntered : State × StepResult :=
  enterCore uiSearchCtx.sp uiSearchCtx.prog uiSearchCtx.facts uiSearchCtx.user .human
    uiSearchCtx.s "chartSearch" (.text "Acetaminophen")

#guard uiSearchEntered.2 == .ok
#guard uiSearchEntered.1.captured == uiSearchCtx.s.captured
#guard uiSearchEntered.1.commits == uiSearchCtx.s.commits
#guard uiSearchEntered.1.receipts == uiSearchCtx.s.receipts
#guard uiSearchEntered.1.searchQueries? == some [("chartSearch", "Acetaminophen")]
#guard (uiSearchRows uiSearchCtx "formulary" "METFORMIN").any (fun row =>
  row.any (fun pair => (pair.2.splitOn "metformin").length > 1))
#guard uiSearchRows uiSearchCtx "chart" "no-such-record-xxxxxxxx" == [[("Search", "No matching records")]]
#guard (enterCore uiSearchCtx.sp uiSearchCtx.prog uiSearchCtx.facts uiSearchCtx.user .human
  uiSearchEntered.1 "chartSearch" (.text "")).1.searchQueries? == none
#guard (enterCore uiSearchCtx.sp uiSearchCtx.prog uiSearchCtx.facts uiSearchCtx.user .human
  uiSearchCtx.s "hiddenSearch" (.text "metformin")).2 == .ignored
#guard (stepEvent uiSearchCtx.sp uiSearchCtx.prog uiSearchCtx.facts uiSearchCtx.user .human
  uiSearchCtx.s (.search "legacy abstract search")).1 == uiSearchCtx.s
#guard match (Lean.toJson uiSearchCtx.s).getObjVal? "searchQueries" with
  | .error _ => true
  | .ok _ => false
#guard match (Lean.fromJson? (Lean.toJson uiSearchCtx.s) : Except String State) with
  | .ok state => state == uiSearchCtx.s
  | .error _ => false

/-- Search snippets omit source plumbing and preserve matching clinical text. -/
def uiSearchNoteSummary := uiSearchSummary
  [("Date", "2026-10-31"), ("Type", "Progress note"), ("Encounter", "urn:uuid:opaque"),
   ("Title", "Unknown"), ("Text", "Current medications include lisinopril daily."),
   ("Source date", "2020-03-15"), ("Shift days", "Unknown")] "lisinopril"
#guard uiSearchNoteSummary.any (fun pair => (pair.2.splitOn "Excerpt: ").length > 1)
#guard uiSearchNoteSummary.all (fun pair => (pair.2.splitOn "urn:uuid:").length == 1)
#guard uiSearchNoteSummary.all (fun pair => (pair.2.splitOn "Shift days").length == 1)
#guard (uiClinicalBanner uiRoomCtx.facts uiRoomCtx.disp).lookup "Weight" != none
#guard (uiClinicalBanner uiRoomCtx.facts uiRoomCtx.disp).lookup "Isolation" == some "Not recorded"

end Ehr.Render
