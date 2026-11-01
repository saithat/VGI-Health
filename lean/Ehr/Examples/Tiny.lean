import Ehr.Core.Json

/-!
# A tiny example

A small spec and a 3-screen program (rooming → order → sign), used by tests
and as a JSON sample for the other lanes.

The spec has:
- weight in kg (copied from the record; a human confirms it);
- patient-ID re-entry (`identity`, human-only, never prefilled);
- an order line: drug and dose (defaults allowed; a human confirms them);
- a cosign for high-alert drugs;
- the allergy list, reviewed on the sign screen or with a receipt;
- the dose check, shown on the sign screen (no receipt);
- one interruptive drug–allergy alert and one passive care-gap alert.

This is test data, not clinical advice.
-/

namespace Ehr.Examples.Tiny

/-- All roles that place orders. -/
def prescribers : List Role := [.physician, .np, .surgeon]

/-- The tiny spec. -/
def spec : Spec where
  version := "tiny-1"
  elements := [
    { id := "weight", label := "Weight (kg)", kind := .quantity .kg
      enteredBy := [.rn, .physician, .np, .surgeon], prefill := .recordConfirm
      recordFact? := some "weightToday"
      friction := .compliance, fhirTarget := "Observation.valueQuantity" },
    { id := "patientIdReentry", label := "Re-enter patient ID", kind := .identity
      enteredBy := [.rn, .physician, .np, .surgeon], prefill := .never
      friction := .safety, humanOnly := true
      fhirTarget := "Provenance.extension.identityCheck" },
    { id := "drug", label := "Drug", kind := .coded "formulary"
      enteredBy := prescribers, prefill := .defaultConfirm
      friction := .safety, fhirTarget := "MedicationRequest.medicationCodeableConcept" },
    { id := "dose", label := "Dose (mg)", kind := .quantity .mg
      enteredBy := prescribers, prefill := .defaultConfirm
      friction := .safety, fhirTarget := "MedicationRequest.dosageInstruction.doseAndRate" },
    { id := "cosigner", label := "Second signer", kind := .cosign
      enteredBy := prescribers, prefill := .never
      friction := .safety, humanOnly := true
      fhirTarget := "Provenance.agent" }
  ]
  infos := [
    { id := "patientBanner", label := "Patient banner", version := "" },
    { id := "allergyList", label := "Allergies", version := "allergyVersion" },
    { id := "currentMeds", label := "Current medications", version := "medsVersion" },
    { id := "doseCheck", label := "Weight-based dose check", version := "" }
  ]
  commits := [{ id := "signOrders", label := "Sign orders", roles := prescribers }]
  entries := [
    { commit := "signOrders", element := "patientIdReentry" },
    { commit := "signOrders", element := "weight" },
    { commit := "signOrders", element := "drug" },
    { commit := "signOrders", element := "dose", perOrderLine := true },
    { commit := "signOrders", element := "cosigner", when := .highAlertMed }
  ]
  reviews := [
    { commit := "signOrders", info := "allergyList"
      mode := .shownOrReceipt 720 [.physician, .np, .rn] },
    { commit := "signOrders", info := "doseCheck", mode := .shownOnCommit }
  ]
  alerts := [
    { id := "drugAllergy", label := "Drug–allergy match", cond := .drugAllergy
      tier := .interruptive, commit := "signOrders" },
    { id := "careGap", label := "Care gap due", cond := .careGap
      tier := .passive, commit := "signOrders", screens := ["W1"] }
  ]
  design := {
    maxDepth := 3, minTextSize := 12, stabilityBudget := 5
    landmarks := ["patientBanner"]
    catalog := ["banner", "field", "panel", "table", "trend", "alert", "button",
                "group", "tabs", "macro", "search"] }

/-- Rooming: confirm today's weight and look at the allergy list. -/
def roomingScreen : Screen where
  id := "rooming"
  title := "Rooming"
  workflow := "W1"
  components := [
    { id := "banner", kind := .banner, tag := "banner" },
    { id := "weightField", kind := .field "weight" (.fixed 0) (.fromRecord "weightToday")
      label := "Weight", tag := "weight" },
    { id := "allergyPanel", kind := .panel "allergyList", label := "Allergies"
      tag := "allergies" },
    { id := "reviewAllergies", kind := .button (.markReviewed "allergyList")
      label := "Mark allergies reviewed", tag := "reviewAllergies" },
    { id := "toOrder", kind := .button (.goto "order"), label := "Orders"
      tag := "toOrder" }
  ]

/-- Order composer: one order line per slot. -/
def orderScreen : Screen where
  id := "order"
  title := "Order composer"
  workflow := "W1"
  components := [
    { id := "banner", kind := .banner, tag := "banner" },
    { id := "careGapAlert", kind := .alert "careGap" false, label := "Care gap"
      tag := "careGap" },
    { id := "drugField", kind := .field "drug" .current .none, label := "Drug"
      tag := "drug" },
    { id := "doseField", kind := .field "dose" .current .none, label := "Dose"
      tag := "dose" },
    { id := "newLine", kind := .button .newOrderLine, label := "Add order"
      tag := "newLine" },
    { id := "quickAmox", kind := .macro "amoxOrder", label := "Amoxicillin 500 mg"
      tag := "quickAmox" },
    { id := "toSign", kind := .button (.goto "sign"), label := "Review and sign"
      tag := "toSign" }
  ]

/-- Sign screen. The allergy list is on tab 1 of a tab container, so it is
hidden until the user opens that tab (unless a valid receipt covers it). -/
def signScreen : Screen where
  id := "sign"
  title := "Sign orders"
  workflow := "W1"
  components := [
    { id := "banner", kind := .banner, tag := "banner" },
    { id := "doseCheckPanel", kind := .panel "doseCheck", label := "Dose check"
      tag := "doseCheck" },
    { id := "signTabs", kind := .tabs, label := "Details", tag := "signTabs" },
    { id := "medsTable", kind := .table "currentMeds", label := "Current meds"
      parent? := some "signTabs", tab := 0, tag := "meds" },
    { id := "signAllergies", kind := .panel "allergyList", label := "Allergies"
      parent? := some "signTabs", tab := 1, tag := "signAllergies" },
    { id := "drugAllergyAlert", kind := .alert "drugAllergy" true
      label := "Drug–allergy", tag := "drugAllergy" },
    { id := "patientIdField", kind := .field "patientIdReentry" (.fixed 0) .none
      label := "Re-enter patient ID", tag := "patientId" },
    { id := "cosignField", kind := .field "cosigner" (.fixed 0) .none
      label := "Second signer", tag := "cosign" },
    { id := "signButton", kind := .button (.commit "signOrders"), label := "Sign"
      hotkey? := some "Ctrl+Enter", tag := "sign" },
    { id := "backButton", kind := .button .back, label := "Back", tag := "back" }
  ]

/-- A macro that fills an amoxicillin order and goes to the sign screen. Its
last step tries to type the patient ID, which a macro may not do, so the macro
stops there. -/
def amoxMacro : Macro where
  id := "amoxOrder"
  label := "Amoxicillin 500 mg"
  steps := [
    .setValue "drugField" "amoxicillin",
    .setValue "doseField" "500",
    .goto "sign",
    .setValue "patientIdField" "JD/F/34",
    .click "signButton"
  ]

/-- The tiny 3-screen program. -/
def program : Program where
  id := "tiny"
  version := 1
  owner := "u1"
  role := .physician
  specVersion := "tiny-1"
  start := "rooming"
  screens := [roomingScreen, orderScreen, signScreen]
  macros := [amoxMacro]

/-- Facts for the tiny patient: penicillin allergy, weight 20.0 kg recorded
today, a care gap due. -/
def facts : Facts where
  patientId := "pt-1"
  identity := { initials := "JD", sex := "F", ageYears := 34 }
  allergyVersion := 3
  allergyClasses := ["penicillin"]
  medsVersion := 1
  currentMedClasses := []
  weightToday? := some (200, .kg)
  careGaps := ["colorectalScreening"]
  abnormalResult := false
  now := 600

/-- The signed-in physician. -/
def user : User := { id := "u1", role := .physician }

/-! ## Release v2 (BRIEF 9b): prior-authorization status -/

/-- Release v2 of the tiny spec. It adds an optional prior-auth request
element (written to a ServiceRequest), the prior-auth status info, and the
catalog tag `"priorAuth"`. No requirement uses them. -/
def specV2 : Spec :=
  { spec with
    version := "tiny-2"
    elements := spec.elements ++
      [{ id := "priorAuthRequest", label := "Prior authorization request", kind := .flag
         enteredBy := prescribers, prefill := .never, friction := .compliance
         fhirTarget := "ServiceRequest" }]
    infos := spec.infos ++ [{ id := "priorAuthStatus", label := "Prior authorization", version := "" }]
    design := { spec.design with catalog := spec.design.catalog ++ ["priorAuth"] } }

/-- The order screen with the prior-auth status panel and request button. -/
def orderScreenV2 : Screen :=
  { orderScreen with components := orderScreen.components.flatMap fun c =>
      if c.id == "toSign" then
        [{ id := "paStatus", kind := .priorAuth "priorAuthStatus", label := "Prior auth"
           tag := "paStatus" },
         { id := "paField", kind := .field "priorAuthRequest" .current .none,
           label := "Enter prior authorization request", tag := "paField" },
         { id := "paRequest", kind := .button .requestPriorAuth, label := "Request prior auth"
           tag := "paRequest" },
         c]
      else [c] }

/-- The tiny program for release v2: the prior-auth feature in the order
composer. Under spec v1 the checker must reject it (catalog). -/
def programV2 : Program :=
  { program with
    version := 2
    specVersion := "tiny-2"
    screens := [roomingScreen, orderScreenV2, signScreen] }

/-! ## JSON round-trip tests -/

#guard roundTrips spec
#guard roundTrips program
#guard roundTrips specV2
#guard roundTrips programV2
#guard roundTrips facts
#guard roundTrips user
#guard roundTrips (Event.enter "weightField" (.qty 725 .kg))
#guard roundTrips (Event.selectTab "signTabs" 1)
#guard roundTrips (StepResult.blocked "guard: weight")
/-- A sample certificate with a violation verdict (JSON sample). -/
def sampleCertificate : Certificate where
  specVersion := "tiny-1"
  specHash := "abc"
  programHash := "def"
  verdict := .violation "reviewsBeforeCommit" "allergies not shown"
    [.click "toSign", .click "signButton"] ["rooming", "sign"]
  checkerVersion := "0.1"
  time := "2026-11-01T06:00:00Z"

#guard roundTrips sampleCertificate

-- Enum constructors are plain JSON strings.
#guard encodeJson Role.physician == "\"physician\""
#guard encodeJson UnitKind.kg == "\"kg\""
#guard encodeJson Actor.macro == "\"macro\""
-- Constructors with arguments are objects keyed by the constructor name.
#guard encodeJson (Value.qty 725 .kg) == "{\"qty\":{\"tenths\":725,\"unit\":\"kg\"}}"
#guard encodeJson (Event.click "signButton") == "{\"click\":{\"comp\":\"signButton\"}}"
-- Optional fields are left out when `none`. Compact output sorts keys.
#guard encodeJson ({ id := "b", kind := .banner } : Component) ==
  "{\"id\":\"b\",\"kind\":\"banner\",\"label\":\"\",\"size\":\"normal\",\"tab\":0,\"tag\":\"\",\"visibility\":\"always\"}"

end Ehr.Examples.Tiny
