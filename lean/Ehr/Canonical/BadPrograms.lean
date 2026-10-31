import Ehr.Canonical.Personas
/-! Permanent mutations of the actual canonical program. Runtime and structural
regressions are checked in Tests, including errors safely ignored at runtime. -/
namespace Ehr.Canonical.Bad
/-- Start each mutation from a role-authorized projection, so unrelated
permission failures do not obscure the intended counterexample. -/
def base (n : Nat) : Program :=
  let role := if n == 5 then Role.rn else if n == 6 then Role.np
    else if n == 8 then Role.surgeon else Role.physician
  forPersona Specs.V1.specV1 canonicalV1 ("seed" ++ toString n) role
/-- Assign a stable seed id. -/
def seed (n : Nat) (p : Program) : Program := { p with id := "bad-" ++ toString n }
/-- 1: Hide allergies on an unopened sign-screen tab. -/
def hiddenAllergies : Program := seed 1 <| (base 1).updateScreen "w1Sign" fun s =>
  (s.insertAfter "w1Sign.banner" [tabsC s.id "hiddenTabs" "Details"]).updateComp
    "w1Sign.allergies" fun c => { c with parent? := some "w1Sign.hiddenTabs", tab := 1 }
/-- 2: Prefill the human-only patient-ID re-entry from the chart. -/
def prefilledIdentity : Program := seed 2 <| (base 2).updateScreen "w1Sign" fun s =>
  s.updateComp "w1Sign.patientIdReentry" fun c =>
    { c with kind := .field "patientIdReentry" (.fixed 0) (.fromRecord "patientIdentity") }
/-- 3: Replace kg weight with an unknown pounds element and link dosing weight to it. -/
def poundsAsWeight : Program := seed 3 <|
  ((base 3).updateScreen "w3Triage" fun s => s.updateComp "w3Triage.weight" fun c =>
    { c with kind := .field "weightLb" (.fixed 0) .none, label := "Weight (lb)" })
  |>.updateScreen "w3Sign" fun s => s.updateComp "w3Sign.dosingWeight" fun c =>
    { c with kind := .field "dosingWeight" (.fixed 0) (.linked "weightLb") }
/-- 4: A macro tries to acknowledge an interaction and sign. -/
def macroOverride : Program := seed 4 <|
  ((base 4).addMacro {
    id := "badOverride", label := "Override interaction and sign",
    steps := [.click "w3Sign.alert.interaction", .click "w3Sign.commit.signOrders"] })
  |>.updateScreen "w3Sign" fun s => s.insertAfter "w3Sign.banner"
    [macroBtn s.id "override" "badOverride" "Override interaction and sign"]
/-- 5: A default and a macro forge the giving nurse's own cosign. -/
def selfCosign : Program := seed 5 <|
  ((base 5).addMacro {
    id := "badCosign", label := "Automatic double check",
    steps := [.setValue "w4Admin.highAlertCosign" "nurse1"] })
  |>.updateScreen "w4Admin" fun s =>
    (s.updateComp "w4Admin.highAlertCosign" fun c =>
      { c with kind := .field "highAlertCosign" (.fixed 0) (.default "nurse1") })
    |>.insertAfter "w4Admin.banner" [macroBtn s.id "selfCosign" "badCosign" "Automatic double check"]
/-- 6: Copy yesterday's weight into today's kg field. -/
def staleWeight : Program := seed 6 <| (base 6).updateScreen "w5Rooming" fun s =>
  s.updateComp "w5Rooming.weight" fun c =>
    { c with kind := .field "weight" (.fixed 0) (.fromRecord "weightYesterday") }
/-- 7: Remove the only route to the refill decision. -/
def unreachableRefill : Program := seed 7 <| (base 7).updateScreen "w7Review" fun s =>
  s.dropComp "w7Review.decide"
/-- 8: Forge consent with a macro and remove the sign-screen anticoagulants. -/
def forgedConsent : Program := seed 8 <|
  ((base 8).addMacro {
    id := "badConsent", label := "Pre-op ready",
    steps := [.goto "w6PreOp", .setValue "w6PreOp.consentVerified" "true"] })
  |>.updateScreen "w6PreOp" (fun s => s.insertAfter "w6PreOp.banner"
      [macroBtn s.id "autoConsent" "badConsent" "Pre-op ready"])
  |>.updateScreen "w6Sign" (fun s => s.dropComp "w6Sign.anticoagulants")
/-- 9: Remove the allergy warning and try a quick-sign amoxicillin macro. -/
def hiddenAllergyAlert : Program := seed 9 <|
  ((base 9).addMacro {
    id := "badQuickAmox", label := "Quick sign amoxicillin",
    steps := [.setValue "w1Orders.drug" "amoxicillin", .setValue "w1Orders.dose" "1000",
      .goto "w1Sign", .click "w1Sign.commit.signOrders"] })
  |>.updateScreen "w1Sign" (fun s => s.dropComp "w1Sign.alert.drugAllergy")
  |>.updateScreen "w1Orders" (fun s => s.insertAfter "w1Orders.banner"
      [macroBtn s.id "quickAmox" "badQuickAmox" "Quick sign amoxicillin"])
/-- 10: Invent an undeclared dose warning that purports to fire on every order. -/
def inventedAlert : Program := seed 10 <|
  ["w1Orders", "w1Sign"].foldl (fun p id => p.updateScreen id fun s =>
    s.insertAfter (cid id "banner")
      [alertC id "everyDose" "doseRangeEveryOrder" "Dose warning on every order" true]) (base 10)
/-- 11: Request the same interruptive popup on composer and sign screens. -/
def repeatedInteraction : Program := seed 11 <|
  ((base 11).updateScreen "w1Orders" fun s => s.insertAfter "w1Orders.banner"
    [alertC s.id "repeatInteraction" "interactionOrder" "Interaction" true])
  |>.updateScreen "w1Sign" fun s => s.updateComp "w1Sign.alert.interaction" fun c =>
    { c with kind := .alert "interactionOrder" true }
/-- 12: Request a popup for a passive care-gap reminder. -/
def passivePopup : Program := seed 12 <| (base 12).updateScreen "w1Rooming" fun s =>
  s.updateComp "w1Rooming.careGaps" fun c => { c with kind := .alert "careGapsInline" true }
/-- 13: Remove all W1 CURES review and exemption paths. -/
def noCures : Program := seed 13 <|
  ((base 13).updateScreen "w1Sign" fun s => s.dropComp "w1Sign.cures")
  |>.updateScreen "w1Orders" fun s =>
    { s with components := s.components.filter fun c =>
        !["w1Orders.orderInfo.curesReport", "w1Orders.review.curesReport"].contains c.id &&
        c.id != "w1Orders.controlled" && c.parent? != some "w1Orders.controlled" }
/-- 14: A high-MME opioid macro claims a naloxone offer. -/
def macroNaloxone : Program := seed 14 <|
  ((base 14).addMacro {
    id := "badNaloxone", label := "Oxycodone 30 mg q4h + naloxone offered",
    steps := [.setValue "w1Orders.drug" "oxycodone", .setValue "w1Orders.dose" "30",
      .setValue "w1Orders.freq" "q4h", .setValue "w1Orders.naloxoneOffer" "offered"] })
  |>.updateScreen "w1Orders" fun s => s.insertAfter "w1Orders.banner"
    [macroBtn s.id "autoNaloxone" "badNaloxone" "Oxycodone 30 mg q4h + naloxone offered"]
/-- 15: Hide controlled-prescription details in a collapsed sign-screen group.
The EPCS no-receipt review must still block signing. -/
def hiddenControlledDetails : Program := seed 15 <| (base 15).updateScreen "w1Sign" fun s =>
  (s.insertAfter "w1Sign.banner" [group s.id "epcsDetails" "Prescription details" (startCollapsed := true)])
    |>.updateComp "w1Sign.orders" fun c => { c with parent? := some "w1Sign.epcsDetails" }

/-- 16: Default refills to three for a Schedule II prescription. The generic
value-constraint hard stop is requested from core; this seed is permanent and
must gain its negative runtime test when that constraint lands. -/
def scheduleIIRefills : Program := seed 16 <| (base 16).updateScreen "w1Orders" fun s =>
  s.updateComp "w1Orders.refills" fun c =>
    { c with kind := .field "refills" .current (.default "3") }

/-- Stable filenames and all fourteen seeds. -/
def programs : List (String × Program) :=
  [("01-hidden-allergies", hiddenAllergies), ("02-prefilled-identity", prefilledIdentity),
   ("03-pounds-as-weight", poundsAsWeight), ("04-macro-override", macroOverride),
   ("05-self-cosign", selfCosign), ("06-stale-weight", staleWeight),
   ("07-unreachable-refill", unreachableRefill), ("08-forged-consent", forgedConsent),
   ("09-hidden-allergy-alert", hiddenAllergyAlert), ("10-invented-alert", inventedAlert),
   ("11-repeated-interaction", repeatedInteraction), ("12-passive-popup", passivePopup),
   ("13-no-cures", noCures), ("14-macro-naloxone", macroNaloxone),
   ("15-hidden-controlled-details", hiddenControlledDetails), ("16-schedule-ii-refills", scheduleIIRefills)]
#guard programs.length == 16
#guard !referencesValid Specs.V1.specV1 poundsAsWeight
#guard !referencesValid Specs.V1.specV1 inventedAlert
#guard !(reachable unreachableRefill "home").contains "w7Decision"
end Ehr.Canonical.Bad
