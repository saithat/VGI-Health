import Ehr.Props.Properties
import Ehr.Examples.Tiny

/-!
# Examples for the properties

Concrete instances that show each property means what it says, on the tiny
example spec. `Ehr.Examples.Tiny.program` is a *bad* program on purpose: its
sign screen keeps the allergy list in a closed tab, and its macro tries to
type the patient ID and to sign. `goodProgram` below fixes both.

Every example here is checked by Lean's kernel (`decide`), not by running
compiled code.
-/

namespace Ehr.Props.Examples

open Ehr Ehr.Examples.Tiny

/-! ## A good tiny program -/

/-- The sign screen with the allergy list pinned (not in a tab), and a button
back to rooming (without it, a user who reaches this screen with the weight
unconfirmed can never sign: the order screen has no way back). -/
def goodSignScreen : Screen where
  id := "sign"
  title := "Sign orders"
  workflow := "W1"
  components := [
    { id := "banner", kind := .banner, tag := "banner" },
    { id := "doseCheckPanel", kind := .panel "doseCheck", label := "Dose check", tag := "doseCheck" },
    { id := "signAllergies", kind := .panel "allergyList", label := "Allergies", tag := "signAllergies" },
    { id := "medsTable", kind := .table "currentMeds", label := "Current meds", tag := "meds" },
    { id := "patientIdField", kind := .field "patientIdReentry" (.fixed 0) .none
      label := "Re-enter patient ID", tag := "patientId" },
    { id := "cosignField", kind := .field "cosigner" (.fixed 0) .none
      label := "Second signer", tag := "cosign" },
    { id := "signButton", kind := .button (.commit "signOrders"), label := "Sign", tag := "sign" },
    { id := "backButton", kind := .button .back, label := "Back", tag := "back" },
    { id := "toRooming", kind := .button (.goto "rooming"), label := "Rooming", tag := "toRooming" }
  ]

/-- The order screen without the "add order" button (one order line). -/
def goodOrderScreen : Screen :=
  { orderScreen with components := orderScreen.components.filter (·.id != "newLine") }

/-- A macro that only fills the order and goes to the sign screen. -/
def goodMacro : Macro where
  id := "amoxOrder"
  label := "Amoxicillin 500 mg"
  steps := [.setValue "drugField" "amoxicillin", .setValue "doseField" "500", .goto "sign"]

/-- Core targets passive alerts by workflow, so every W1 screen needs the pin. -/
def pinTinyAlerts (scr : Screen) : Screen :=
  if scr.components.any (fun c => c.kind == .alert "careGap" false) then scr
  else { scr with components := scr.components ++
    [{ id := "careGapAlert", kind := .alert "careGap" false, label := "Care gap" }] }

/-- The fixed tiny program. -/
def goodProgram : Program :=
  { program with screens := [roomingScreen, goodOrderScreen, goodSignScreen].map pinTinyAlerts, macros := [goodMacro] }

/-- An episode of the good program for the tiny patient and physician. -/
def goodEp : Episode := ⟨spec, goodProgram, facts, user⟩

/-- An episode of the (bad) tiny program. -/
def tinyEp : Episode := ⟨spec, program, facts, user⟩

/-! ## Property 1: well-formed -/

/-- The good program uses only catalog kinds. -/
theorem good_catalog_only : CatalogOnly spec goodProgram := by decide

/-- A program with a component kind outside the catalog fails. -/
theorem restricted_catalog_rejects : ¬ CatalogOnly { spec with design := { spec.design with catalog := ["banner"] } } goodProgram := by
  decide

/-- The sign screen is two "go to" clicks from the start. -/
theorem sign_within_two_clicks : WithinClicks goodProgram 2 "sign" :=
  ⟨["order", "sign"], .hop (by decide) (.hop (by decide) (.here _)), by decide⟩

/-- IDs are unique and every reference resolves. -/
theorem good_ids_and_references : IdsUnique goodProgram ∧ ReferencesResolve spec goodProgram := by decide

/-! ## Property 2: captures all, once -/

/-- No element of the tiny spec is auto-linked, so nothing is retyped. -/
theorem good_linked_not_retyped : LinkedNotRetyped spec goodProgram := by decide

/-! ## Property 3: writes only -/

/-- Every field, commit, and review button of the good program is in the spec. -/
theorem good_declared_writes : DeclaredWritesInSpec spec goodProgram := by decide

/-- A nurse's copy of the program may not sign orders. -/
theorem nurse_cannot_declare_signing : ¬ DeclaredWritesInSpec spec { goodProgram with role := .rn } := by decide

/-! ## Property 4: reviews before commit -/

/-- On the tiny program's sign screen, with the allergy tab closed, the sign
button is shown but the allergy list is not: property 4 fails there. -/
def tinyAtSign : State :=
  tinyEp.afterHuman tinyEp.start
    [.confirm "weightField", .click "toOrder", .enter "drugField" (.code "acetaminophen"),
     .enter "doseField" (.qty 3000 .mg), .click "toSign"]

/-- The bad program shows Sign while its allergy review is hidden. -/
theorem hidden_review_commit_button_shown : CommitButtonShown tinyEp tinyAtSign "signOrders" := by decide
/-- The bad program keeps allergies hidden in the closed tab. -/
theorem closed_allergy_tab_hides_review : ¬ InfoShown tinyEp tinyAtSign "allergyList" := by decide

/-- In the good program the allergy list is shown on the sign screen. -/
def goodAtSign : State :=
  goodEp.afterHuman goodEp.start
    [.confirm "weightField", .click "toOrder", .enter "drugField" (.code "acetaminophen"),
     .enter "doseField" (.qty 3000 .mg), .click "toSign"]

/-- The corrected sign screen shows the allergy review. -/
theorem good_sign_shows_allergies : InfoShown goodEp goodAtSign "allergyList" := by decide

/-! ## Property 5: human-only kept -/

/-- The good program never tries to automate a human step. -/
theorem good_no_automation : NoAutomationAttempts spec goodProgram := by decide

/-- The tiny program's macro types the patient ID and clicks Sign: rejected. -/
theorem bad_macro_attempts_automation : ¬ NoAutomationAttempts spec program := by decide

/-! ## Property 6: completable -/

/-- In the good program, signing is reachable from the sign screen: type the
patient ID, then sign. -/
theorem good_sign_has_one_continuation : "signOrders" ∈
    (goodEp.afterHuman goodAtSign [.enter "patientIdField" (.text "JD/F/34"), .click "signButton"]).commits := by
  decide

/-! ## Property 7: units -/

/-- The weight field is prefilled from `weightToday`, which keeps its unit. -/
theorem good_quantity_prefills_keep_units : QuantityPrefillsKeepUnits spec goodProgram := by decide

/-- A weight prefilled from a bare record number (here, yesterday's weight)
fails. -/
theorem yesterday_weight_prefill_rejected : ¬ QuantityPrefillsKeepUnits spec
    { goodProgram with screens := [{ roomingScreen with components := [
        { id := "weightField", kind := .field "weight" (.fixed 0) (.fromRecord "weightYesterday") }] }] } := by
  decide

/-! ## Property 8: budgets -/

/-- Going back to the tiny program moves two components (the meds table and
the allergy panel go back into the tab container). -/
theorem two_components_moved : movedTags goodProgram program = ["meds", "signAllergies"] := by decide

/-- With a stability budget of 5, two moves are within budget. -/
theorem two_moves_within_budget : StabilityBudget spec (some goodProgram) program := by
  intro p hp; cases hp; decide

/-! ## Alerts -/

/-- A1: no macro step touches an alert component. -/
theorem good_no_alert_suppression : NoAlertSuppression goodProgram := by decide

/-- A2: the good program never asks an interruptive alert to pop up. -/
theorem good_no_interruptive_requests : NoInterruptivePopupRequests spec goodProgram := by decide

/-- A3: no alert is asked to pop up on two screens. -/
theorem good_popup_requested_once : PopupRequestedOnce spec goodProgram := by decide

/-- A4: the good program never asks a passive alert to pop up. -/
theorem good_no_passive_requests : NoPassivePopupRequests spec goodProgram := by decide

/-- A4: asking the passive care-gap alert to pop up fails. -/
theorem passive_popup_request_rejected : ¬ NoPassivePopupRequests spec
    { goodProgram with screens := [{ goodOrderScreen with components := [
        { id := "careGapAlert", kind := .alert "careGap" true }] }] } := by
  decide

end Ehr.Props.Examples
