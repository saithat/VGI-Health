import Ehr.Canonical.Tests
namespace Ehr.Canonical.Tests
open Ehr.Specs.V1

/-! CURES and naloxone use the same real ordering path as W1. -/
/-- W1 controlled-substance path with configurable dose and frequency. -/
def opioidPath (dose : Nat := 100) (freq : String := "q6h") : List Event :=
  [.click "home.work.w1Rooming", .enter "w1Rooming.weight" (.qty 924 .kg),
   .click "w1Rooming.nav.w1Orders"] ++ order "w1Orders" "oxycodone" dose freq ++
  [.enter "w1Orders.dosingWeight" (.qty 924 .kg), .click "w1Orders.toSign",
   .click "w1Verify.continue", .enter "w1Sign.patientIdReentry" (.text "RK/M/58")]
/-- Controlled order with the report shown on the sign screen. -/
def opioid : State := run (opioidPath)
#guard (finish opioid "w1Sign" "signOrders").commits == ["signOrders"]
/-- A program variant without the sign-screen report, for waiver/receipt tests. -/
def exemptionProgram : Program := canonicalV1.updateScreen "w1Sign" fun s => s.dropComp "w1Sign.cures"
/-- Enter an exemption while still in the composer, then return to sign. -/
def withExemption : State := more (run (opioidPath) (p := exemptionProgram))
  [.click "w1Sign.edit", .enter "w1Orders.curesExemptionReason" (.code "admin-in-facility"),
   .click "w1Orders.toSign", .click "w1Verify.continue"] (p := exemptionProgram)
#guard (cap withExemption "curesExemptionReason").any (·.byHuman)
#guard (finish withExemption "w1Sign" "signOrders" (p := exemptionProgram)).commits == ["signOrders"]
/-- A human views the composer's CURES tab and creates a fresh receipt. -/
def withCuresReceipt : State := more (run (opioidPath) (p := exemptionProgram))
  [.click "w1Sign.edit", .selectTab "w1Orders.orderInfo" 1,
   .click "w1Orders.review.curesReport", .click "w1Orders.toSign", .click "w1Verify.continue"]
  (p := exemptionProgram)
#guard withCuresReceipt.receipts.any (·.info == "curesReport")
#guard (finish withCuresReceipt "w1Sign" "signOrders" (p := exemptionProgram)).commits == ["signOrders"]
/-- High MME: neither naloxone documentation element can be omitted. -/
def highMme : State := run (opioidPath 300 "q4h")
#guard reason (one highMme (.click "w1Sign.commit.signOrders")).2 == "entry required: naloxoneOffer"
/-- Naloxone offer alone still leaves the education obligation. -/
def offerOnly : State := more highMme [.click "w1Sign.edit",
  .enter "w1Orders.naloxoneOffer" (.code "offered-declined"),
  .click "w1Orders.toSign", .click "w1Verify.continue"]
#guard reason (one offerOnly (.click "w1Sign.commit.signOrders")).2 == "entry required: naloxoneEducation"
/-- Human education plus offer permits the high-MME order after alert acknowledgment. -/
def educated : State := more offerOnly [.click "w1Sign.edit",
  .enter "w1Orders.naloxoneEducation" (.flag true), .click "w1Orders.toSign", .click "w1Verify.continue"]
#guard (finish educated "w1Sign" "signOrders").commits == ["signOrders"]
/-- A lower-dose opioid with an existing benzodiazepine also needs naloxone. -/
def benzoFacts : Facts := { adult with currentMedClasses := ["benzodiazepine"] }
#guard reason (one (run (opioidPath) (f := benzoFacts)) (.click "w1Sign.commit.signOrders")
  (f := benzoFacts)).2 == "entry required: naloxoneOffer"
#guard (finish (more (run (opioidPath) (f := benzoFacts))
    [.click "w1Sign.edit", .enter "w1Orders.naloxoneOffer" (.code "prescribed"),
     .enter "w1Orders.naloxoneEducation" (.flag true), .click "w1Orders.toSign",
     .click "w1Verify.continue"] (f := benzoFacts)) "w1Sign" "signOrders" (f := benzoFacts)).commits == ["signOrders"]

/-! Each permanent seed has an explicit regression. Structural predicates here
are test oracles, not substitutes for the check lane's certification theorem. -/
/-- A prefill on a never/human-only element is structurally forbidden. -/
def illegalHumanPrefill (sp : Spec) (p : Program) : Bool := (components p).any fun c =>
  match c.kind with
  | .field e _ pf => (sp.element? e).any fun el =>
      (el.prefill == .never || el.humanOnly) && pf != .none
  | _ => false
/-- Count popup declarations for an alert across a reachable path. -/
def popupCount (p : Program) (a : AlertId) : Nat :=
  ((components p).filter fun c => match c.kind with | .alert b true => a == b | _ => false).length
/-- Requesting popup behavior for a passive rule is malformed. -/
def passivePopupDeclared (sp : Spec) (p : Program) : Bool := (components p).any fun c =>
  match c.kind with
  | .alert a true => (sp.alert? a).any (·.tier == .passive)
  | _ => false

-- 1: no review receipt was created in w1Path, so the closed allergy tab blocks.
#guard reason (one (run w1Path (p := Bad.hiddenAllergies)) (.click "w1Sign.commit.signOrders")
  (p := Bad.hiddenAllergies)).2 == "review required: allergyList must be shown or covered by a valid receipt"
-- 2: prefill is ignored; dropping the final manual identity entry leaves no ID.
#guard illegalHumanPrefill specV1 Bad.prefilledIdentity
#guard cap (run (w1Path.dropLast) (p := Bad.prefilledIdentity)) "patientIdReentry" == none
#guard reason (one (run (w1Path.dropLast) (p := Bad.prefilledIdentity)) (.click "w1Sign.commit.signOrders")
  (p := Bad.prefilledIdentity)).2 == "entry required: patientIdReentry"
-- 3: the pounds element is unknown; no valid kg capture can reach signing.
#guard !referencesValid specV1 Bad.poundsAsWeight
#guard reason (one (run [.click "home.work.w3TrackBoard", .click "w3TrackBoard.open"]
  (p := Bad.poundsAsWeight)) (.enter "w3Triage.weight" (.qty 1540 .lb)) (p := Bad.poundsAsWeight)).2 == "unknown element weightLb"
#guard !(finish (run (w3Path .kg) (p := Bad.poundsAsWeight) (f := hospital))
  "w3Sign" "signOrders" (p := Bad.poundsAsWeight) (f := hospital)).commits.contains "signOrders"
-- 4: an interaction is actually firing; the macro cannot acknowledge it or sign.
/-- Lisinopril interacts with the current NSAID. -/
def interactionFacts : Facts := { hospital with currentMedClasses := ["nsaid"] }
/-- W3 interaction-ready order. -/
def interactionPath : List Event := (w3Path .kg).map fun e => match e with
  | .enter "w3Orders.drug" _ => .enter "w3Orders.drug" (.code "lisinopril")
  | .enter "w3Orders.dose" _ => .enter "w3Orders.dose" (.qty 100 .mg)
  | _ => e
/-- Macro override attempt. -/
def overrideAttempt : State × StepResult := one (run interactionPath (p := Bad.macroOverride) (f := interactionFacts))
  (.click "w3Sign.override") (p := Bad.macroOverride) (f := interactionFacts)
#guard reason overrideAttempt.2 == "macro stopped at step 0: human only: acknowledge"
#guard overrideAttempt.1.commits == []
#guard !(overrideAttempt.1.acked.any (·.1 == "interactionOrder"))
#guard (one overrideAttempt.1 (.click "w3Sign.commit.signOrders")
  (p := Bad.macroOverride) (f := interactionFacts)).1.popup?.map (·.1) == some "interactionOrder"
-- 5: defaults and macros cannot supply a double check; own-user input fails too.
/-- Forged cosign screen state. -/
def badCosign : State := run (adminPath "insulin lispro") (p := Bad.selfCosign)
  (f := adminFacts "insulin lispro") (u := nurse)
#guard illegalHumanPrefill specV1 Bad.selfCosign
#guard cap badCosign "highAlertCosign" == none
#guard (one badCosign (.click "w4Admin.selfCosign") (p := Bad.selfCosign)
  (f := adminFacts "insulin lispro") (u := nurse)).1.commits == []
#guard reason (one badCosign (.enter "w4Admin.highAlertCosign" (.user "nurse1"))
  (p := Bad.selfCosign) (f := adminFacts "insulin lispro") (u := nurse)).2 ==
  "cosign must be a different user: highAlertCosign"
-- 6: yesterday's kg value is rejected generically by the declared record source.
#guard !recordSourcesValid specV1 Bad.staleWeight
#guard cap (run [.click "home.work.w5Rooming", .confirm "w5Rooming.weight"]
  (p := Bad.staleWeight) (f := child) (u := np)) "weight" == none
#guard recordSourcesValid specV1 canonicalV1
-- 7: the only refill commit screen is unreachable from the entrypoint.
#guard !(reachable Bad.unreachableRefill "home").contains "w7Decision"
-- 8: the macro cannot enter consent; removing anticoagulants independently blocks.
#guard (more (run [.click "home.work.w6PreOp"] (p := Bad.forgedConsent) (f := hospital) (u := surgeon))
  [.click "w6PreOp.autoConsent"] (p := Bad.forgedConsent) (f := hospital) (u := surgeon)).captured == []
#guard reason (one (run preOpPath (p := Bad.forgedConsent) (f := preOpFacts) (u := surgeon))
  (.click "w6Sign.commit.signOrders") (p := Bad.forgedConsent) (f := preOpFacts) (u := surgeon)).2 ==
  "review required: anticoagulantList must be shown"
-- 9: spec-generated allergy popup survives removal of its UI component.
/-- Penicillin allergy, with otherwise complete W1 inputs. -/
def allergyFacts : Facts := { adult with allergyClasses := ["penicillin"] }
/-- W1 amoxicillin instead of lisinopril. -/
def amoxPath : List Event := w1Path.map fun e => match e with
  | .click "w1Orders.prefLisinopril" => .click "w1Orders.prefAmoxicillin"
  | _ => e
#guard (one (run amoxPath (p := Bad.hiddenAllergyAlert) (f := allergyFacts))
  (.click "w1Sign.commit.signOrders") (p := Bad.hiddenAllergyAlert) (f := allergyFacts)).1.popup?.map (·.1) == some "drugAllergyOrder"
#guard (more (run [.click "home.work.w1Rooming", .click "w1Rooming.nav.w1Orders"]
    (p := Bad.hiddenAllergyAlert) (f := allergyFacts)) [.click "w1Orders.quickAmox"]
    (p := Bad.hiddenAllergyAlert) (f := allergyFacts)).commits == []
-- 10: undeclared alert is malformed and cannot fire when its condition is absent.
#guard !referencesValid specV1 Bad.inventedAlert
#guard !alertHolds specV1 adult w1 "doseRangeEveryOrder"
-- 11: duplicated interruptive popup requests are a structural regression.
#guard popupCount Bad.repeatedInteraction "interactionOrder" == 2
#guard (edges Bad.repeatedInteraction "w1Orders").contains "w1Verify"
#guard (edges Bad.repeatedInteraction "w1Verify").contains "w1Sign"
-- 12: passive popup requests are malformed; runtime never presents that popup.
#guard passivePopupDeclared specV1 Bad.passivePopup
#guard (popupCandidates specV1 Bad.passivePopup adult w1Close "signNote").all (·.1 != "careGapsInline")
-- 13: a controlled order cannot sign when every CURES path is removed.
#guard reason (one (run (opioidPath) (p := Bad.noCures)) (.click "w1Sign.commit.signOrders") (p := Bad.noCures)).2 ==
  "review required: curesReport must be shown or covered by a valid receipt (or a reason entered in curesExemptionReason)"
#guard (finish (run (opioidPath) (p := Bad.noCures)) "w1Sign" "signOrders" (p := Bad.noCures)).commits == []
-- 14: the macro cannot claim the human-only (never-prefilled) naloxone offer.
/-- Attempt to run the dangerous opioid/naloxone macro. -/
def naloxoneAttempt : State × StepResult := one
  (run [.click "home.work.w1Rooming", .click "w1Rooming.nav.w1Orders"] (p := Bad.macroNaloxone))
  (.click "w1Orders.autoNaloxone") (p := Bad.macroNaloxone)
#guard reason naloxoneAttempt.2 == "macro stopped at step 3: human only: naloxoneOffer"
#guard cap naloxoneAttempt.1 "naloxoneOffer" == none
#guard naloxoneAttempt.1.commits == []

/-! Regression for replacing the old unconditional/pre-op-commit workarounds. -/
/-- Consent cannot be bypassed by ordinary signing in a pre-op episode. -/
def noConsent : State := run (preOpPath.filter fun e => match e with
  | .enter "w6PreOp.consentVerified" _ => false | _ => true) (f := preOpFacts) (u := surgeon)
#guard reason (one noConsent (.click "w6Sign.commit.signOrders") (f := preOpFacts) (u := surgeon)).2 ==
  "entry required: consentVerified"
#guard noConsent.commits == []
-- Post-op signing does not require the pre-op consent prompt again.
#guard (finish postOp "w6Sign" "signOrders" (f := hospital) (u := surgeon)).commits == ["signOrders"]
/-- Hide dose check to test the requirement's precise weight-based scope. -/
def noDoseCheck : Program := canonicalV1.updateScreen "w1Sign" fun s => s.dropComp "w1Sign.doseCheck"
/-- Metformin has no mg/kg range in the reference formulary. -/
def metforminPath : List Event := w1Path.map fun e => match e with
  | .click "w1Orders.prefLisinopril" => .click "w1Orders.prefMetformin" | _ => e
#guard (finish (run metforminPath noDoseCheck) "w1Sign" "signOrders" noDoseCheck).commits == ["signOrders"]
#guard reason (one (run w1Path noDoseCheck) (.click "w1Sign.commit.signOrders") noDoseCheck).2 ==
  "review required: doseCheck must be shown"

/-- Removing glucose from the administration screen blocks insulin. -/
def hiddenGlucose : Program := canonicalV1.updateScreen "w4Admin" fun s => s.dropComp "w4Admin.glucose"
#guard reason (one (run (adminPath "insulin lispro" ++
  [.enter "w4Admin.highAlertCosign" (.user "nurse2")]) hiddenGlucose (adminFacts "insulin lispro") nurse)
  (.click "w4Admin.commit.administerMed") hiddenGlucose (adminFacts "insulin lispro") nurse).2 ==
  "review required: glucoseTrend must be shown"
/-- PRN pain medication without a pain score cannot be administered. -/
def missingPain : State := run ((adminPath "oxycodone").filter fun e => match e with
  | .enter "w4Admin.painScore" _ => false | _ => true) (f := adminFacts "oxycodone") (u := nurse)
#guard reason (one missingPain (.click "w4Admin.commit.administerMed")
  (f := adminFacts "oxycodone") (u := nurse)).2 == "entry required: painScore"

-- 15: EPCS signing details are no-receipt information, even with a CURES report.
#guard reason (one (run (opioidPath) Bad.hiddenControlledDetails)
  (.click "w1Sign.commit.signOrders") Bad.hiddenControlledDetails).2 ==
  "review required: orderSummary must be shown"
#guard (finish (run (opioidPath) Bad.hiddenControlledDetails) "w1Sign" "signOrders"
  Bad.hiddenControlledDetails).commits == []
-- 16: A generic constrained-refills runtime regression remains blocked on the
-- core value-constraint request in changes-requests.md; no false passing test.

end Ehr.Canonical.Tests
