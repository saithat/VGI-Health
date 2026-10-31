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

/-- The sign screen with the allergy list pinned (not in a tab). -/
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
    { id := "backButton", kind := .button .back, label := "Back", tag := "back" }
  ]

/-- The order screen without the "add order" button (one order line). -/
def goodOrderScreen : Screen :=
  { orderScreen with components := orderScreen.components.filter (·.id != "newLine") }

/-- A macro that only fills the order and goes to the sign screen. -/
def goodMacro : Macro where
  id := "amoxOrder"
  label := "Amoxicillin 500 mg"
  steps := [.setValue "drugField" "amoxicillin", .setValue "doseField" "500", .goto "sign"]

/-- The fixed tiny program. -/
def goodProgram : Program :=
  { program with screens := [roomingScreen, goodOrderScreen, goodSignScreen], macros := [goodMacro] }

/-- An episode of the good program for the tiny patient and physician. -/
def goodEp : Episode := ⟨spec, goodProgram, facts, user⟩

/-- An episode of the (bad) tiny program. -/
def tinyEp : Episode := ⟨spec, program, facts, user⟩

/-! ## Property 1: well-formed -/

/-- The good program uses only catalog kinds. -/
example : CatalogOnly spec goodProgram := by decide

/-- A program with a component kind outside the catalog fails. -/
example : ¬ CatalogOnly { spec with design := { spec.design with catalog := ["banner"] } } goodProgram := by
  decide

/-- The sign screen is two "go to" clicks from the start. -/
example : WithinClicks goodProgram 2 "sign" :=
  ⟨["order", "sign"], .hop (by decide) (.hop (by decide) (.here _)), by decide⟩

/-- IDs are unique and every reference resolves. -/
example : IdsUnique goodProgram ∧ ReferencesResolve spec goodProgram := by decide

/-! ## Property 2: captures all, once -/

/-- No element of the tiny spec is auto-linked, so nothing is retyped. -/
example : LinkedNotRetyped spec goodProgram := by decide

/-! ## Property 3: writes only -/

/-- Every field, commit, and review button of the good program is in the spec. -/
example : DeclaredWritesInSpec spec goodProgram := by decide

/-- A nurse's copy of the program may not sign orders. -/
example : ¬ DeclaredWritesInSpec spec { goodProgram with role := .rn } := by decide

/-! ## Property 4: reviews before commit -/

/-- On the tiny program's sign screen, with the allergy tab closed, the sign
button is shown but the allergy list is not: property 4 fails there. -/
def tinyAtSign : State :=
  tinyEp.afterHuman tinyEp.start
    [.confirm "weightField", .click "toOrder", .enter "drugField" (.code "acetaminophen"),
     .enter "doseField" (.qty 3000 .mg), .click "toSign"]

example : CommitButtonShown tinyEp tinyAtSign "signOrders" := by decide
example : ¬ InfoShown tinyEp tinyAtSign "allergyList" := by decide

/-- In the good program the allergy list is shown on the sign screen. -/
def goodAtSign : State :=
  goodEp.afterHuman goodEp.start
    [.confirm "weightField", .click "toOrder", .enter "drugField" (.code "acetaminophen"),
     .enter "doseField" (.qty 3000 .mg), .click "toSign"]

example : InfoShown goodEp goodAtSign "allergyList" := by decide

/-! ## Property 5: human-only kept -/

/-- The good program never tries to automate a human step. -/
example : NoAutomationAttempts spec goodProgram := by decide

/-- The tiny program's macro types the patient ID and clicks Sign: rejected. -/
example : ¬ NoAutomationAttempts spec program := by decide

/-! ## Property 6: completable -/

/-- In the good program, signing is reachable from the sign screen: type the
patient ID, then sign. -/
example : "signOrders" ∈
    (goodEp.afterHuman goodAtSign [.enter "patientIdField" (.text "JD/F/34"), .click "signButton"]).commits := by
  decide

/-! ## Property 7: units -/

/-- The weight field is prefilled from `weightToday`, which keeps its unit. -/
example : QuantityPrefillsKeepUnits spec goodProgram := by decide

/-- A weight prefilled from a bare record number (here, yesterday's weight)
fails. -/
example : ¬ QuantityPrefillsKeepUnits spec
    { goodProgram with screens := [{ roomingScreen with components := [
        { id := "weightField", kind := .field "weight" (.fixed 0) (.fromRecord "weightYesterday") }] }] } := by
  decide

/-! ## Property 8: budgets -/

/-- Going back to the tiny program moves two components (the meds table and
the allergy panel go back into the tab container). -/
example : movedTags goodProgram program = ["meds", "signAllergies"] := by decide

/-- With a stability budget of 5, two moves are within budget. -/
example : StabilityBudget spec (some goodProgram) program := by
  intro p hp; cases hp; decide

/-! ## Alerts -/

/-- A1: no macro step touches an alert component. -/
example : NoAlertSuppression goodProgram := by decide

/-- A2: the good program never asks an interruptive alert to pop up. -/
example : NoInterruptivePopupRequests spec goodProgram := by decide

/-- A3: no alert is asked to pop up on two screens. -/
example : PopupRequestedOnce spec goodProgram := by decide

/-- A4: the good program never asks a passive alert to pop up. -/
example : NoPassivePopupRequests spec goodProgram := by decide

/-- A4: asking the passive care-gap alert to pop up fails. -/
example : ¬ NoPassivePopupRequests spec
    { goodProgram with screens := [{ goodOrderScreen with components := [
        { id := "careGapAlert", kind := .alert "careGap" true }] }] } := by
  decide

end Ehr.Props.Examples
