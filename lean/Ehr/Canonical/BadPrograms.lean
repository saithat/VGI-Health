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
/-- 7: Remove every route to the refill decision, including relocated artifact
links. The unsafe mutation still strands the clinician before the decision. -/
def unreachableRefill : Program := seed 7 <|
  { base 7 with screens := (base 7).screens.map fun s =>
      { s with components := s.components.filter fun c =>
          c.kind != .button (.goto "w7Decision") } }
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
/-- 13: Remove every CURES report, review and exemption field. Removing only
W1 left a valid receipt path through another workflow and was not a bad program. -/
def noCures : Program := seed 13 <|
  { base 13 with screens := (base 13).screens.map fun s =>
      { s with components := s.components.filter fun c => match c.kind with
          | .panel "curesReport" | .table "curesReport" | .trend "curesReport"
          | .button (.markReviewed "curesReport")
          | .field "curesExemptionReason" _ _ => false
          | _ => true } }
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

/-- 16: Default refills to three, then strand that value on a signing screen
with no route back to a correction field. Even human confirmation cannot make
three permissible; the spec's allowed-value hard stop must block signing. -/
def scheduleIIRefills : Program := seed 16 <|
  ((base 16).updateScreen "w1Orders" fun s =>
    s.updateComp "w1Orders.refills" fun c =>
      { c with kind := .field "refills" .current (.default "3") })
  |>.updateScreen "w1Sign" fun s =>
    { s with components := s.components.filter fun c => match c.kind with
        | .button (.goto _) | .button .back | .«macro» _ => false
        | _ => true }

/-- Remove every human route to a legally required element, preserving the guard. -/
def withoutElement (p : Program) (element : ElementId) : Program :=
  { p with screens := p.screens.map fun s =>
      { s with components := s.components.filter fun c => match c.kind with
          | .field e .. => e != element | _ => true } }

/-- 17: A restraint order has no written care-plan modification. -/
def noRestraintCarePlan : Program := seed 17 <| withoutElement (base 17) "restraintCarePlanChange"
/-- 18: An operative report cannot capture the surgical technique. -/
def noOpTechnique : Program := seed 18 <| withoutElement
  (forPersona Specs.V1.specV1 canonicalV1 "seed18" .surgeon) "opTechnique"
/-- 19: Vaccine documentation omits the administering provider's address. -/
def noVaccineProviderAddress : Program := seed 19 <| withoutElement
  (forPersona Specs.V1.specV1 canonicalV1 "seed19" .np) "vaccineProviderAddress"
/-- 20: MAR documentation omits the actual administration time. -/
def noAdministrationTime : Program := seed 20 <| withoutElement
  (forPersona Specs.V1.specV1 canonicalV1 "seed20" .rn) "actualAdministrationTime"
/-- 21: Controlled prescriptions cannot capture product strength. Dose remains,
but dose is not a substitute for product strength. -/
def noControlledStrength : Program := seed 21 <| withoutElement (base 21) "controlledProductStrength"
/-- 22: Put the legal signing notice in a closed group; no receipt can replace it. -/
def hiddenSigningNotice : Program := seed 22 <| (base 22).updateScreen "w1Sign" fun s =>
  { s with components := group s.id "closedNotice" "Signing notice" (startCollapsed := true) ::
      s.components.map fun c => if c.kind == .panel "controlledSigningLegalNotice" then
        { c with parent? := some "w1Sign.closedNotice" } else c }
/-- 23: Telehealth consent outcome has no capture route. -/
def noTelehealthConsent : Program := seed 23 <| withoutElement (base 23) "telehealthConsentRecord"
/-- 24: A default claims human schedule eligibility for refill authorization.
The never/human-only policy refuses it, even when the code is allowed. -/
def defaultRefillEligibility : Program := seed 24 <| (base 24).updateScreen "w7Decision" fun s =>
  s.updateComp "w7Decision.legal.refillScheduleEligibility" fun c =>
    { c with kind := .field "refillScheduleEligibility" (.fixed 0) (.default "notScheduleII") }

/-- 25: Continue restraint with a misleading reset label and no release link.
The durable original anchor still expires; a new UI episode cannot reset it. -/
def restartRestraintClock : Program := seed 25 <| (base 25).updateScreen "feature.continueViolentRestraint" fun s =>
  { s with components := s.components.filterMap fun c =>
      if (match c.kind with | .button (.goto _) | .button .back | .«macro» _ => true | _ => false) then none
      else some (if c.kind == .button (.commit "continueViolentRestraint") then
        { c with label := "Restart four-hour clock and continue" } else c) }

/-- 26: A current-looking H&P attestation cannot replace stale event evidence. -/
def stalePreoperativeHp : Program := seed 26 <|
  (forPersona Specs.V1.specV1 canonicalV1 "seed26" .surgeon).updateScreen "w6PreOp" fun s =>
    s.updateComp "w6PreOp.hpUpdate" fun c => { c with label := "H&P current (copied forward)" }

/-- 27: Offer filling an expired Schedule III-V prescription without a new-Rx route. -/
def expiredControlledFill : Program := seed 27 <| (base 27).updateScreen "feature.dispenseScheduleIIItoV" fun s =>
  { s with components := s.components.filter fun c =>
      match c.kind with | .button (.goto _) | .button .back | .«macro» _ => false | _ => true }

/-- 28: The age-specific minor-consent authority is mislabeled as available at any age. -/
def underageMinorConsent : Program := seed 28 <| (base 28).updateScreen "feature.authorizeMinorMentalHealthCare" fun s =>
  { s with components := s.components.filterMap fun c =>
      match c.kind with
      | .button (.goto _) | .button .back | .«macro» _ => none
      | _ => some (if c.id == "feature.authorizeMinorMentalHealthCare.feature.minorConsentDecision" then
          { c with label := "Minor self consent (any age)" } else c) }

/-- 29: A malformed Gregorian birth date is proposed as a default. -/
def invalidBirthDate : Program := seed 29 <| (base 29).updateScreen "feature.updateDemographics" fun s =>
  s.updateComp "feature.updateDemographics.feature.birthDate" fun c =>
    { c with kind := .field "birthDate" (.fixed 0) (.default "2026-02-30") }

/-- 30: Replace the mandated weekly oral-methotrexate default with daily. -/
def dailyMethotrexateDefault : Program := seed 30 <| (base 30).updateScreen "feature.signOralMethotrexate" fun s =>
  s.updateComp "feature.signOralMethotrexate.feature.oralMethotrexateFrequency" fun c =>
    { c with kind := .field "oralMethotrexateFrequency" (.fixed 0) (.default "daily") }

/-- 31: Keep the old result summary while hiding complete component rows. -/
def hiddenResultComponents : Program := seed 31 <| (base 31).updateScreen "w2Result" fun s =>
  s.updateComp "w2Result.feature.groupedResultComponents" fun c => { c with size := .tiny }

/-- 32: Obscure the semantic prescription signing label. -/
def misleadingSigningLabel : Program := seed 32 <| (base 32).updateScreen "w1Sign" fun s =>
  s.updateComp "w1Sign.commit.signOrders" fun c => { c with label := "Continue" }

/-- 33: An NP macro tries to sign at the pre-op signing screen. The interpreter
still checks the actual encounter and only humans may perform a commit. -/
def npPreopMacro : Program := seed 33 <|
  ((forPersona Specs.V1.specV1 canonicalV1 "seed33" .np).addMacro {
    id := "badNpPreopSign", label := "Sign pre-op orders automatically",
    steps := [.goto "w6Sign", .click "w6Sign.commit.signOrders"] })
  |>.updateScreen "w6Sign" fun s => s.insertAfter "w6Sign.banner"
    [macroBtn s.id "npAutoSign" "badNpPreopSign" "Sign pre-op orders automatically"]

/-- 34: A default tries to supply the human attending's signature. -/
def prefilledAttending : Program := seed 34 <|
  (forPersona Specs.V1.specV1 canonicalV1 "seed34" .np).updateScreen "w5Sign" fun s =>
    s.updateComp "w5Sign.attendingCosign" fun c =>
      { c with kind := .field "attendingCosign" (.fixed 0) (.default "attending") }

/-- Stable filenames for the original sixteen seeds and eight legal regressions. -/

def programs : List (String × Program) :=
  [("01-hidden-allergies", hiddenAllergies), ("02-prefilled-identity", prefilledIdentity),
   ("03-pounds-as-weight", poundsAsWeight), ("04-macro-override", macroOverride),
   ("05-self-cosign", selfCosign), ("06-stale-weight", staleWeight),
   ("07-unreachable-refill", unreachableRefill), ("08-forged-consent", forgedConsent),
   ("09-hidden-allergy-alert", hiddenAllergyAlert), ("10-invented-alert", inventedAlert),
   ("11-repeated-interaction", repeatedInteraction), ("12-passive-popup", passivePopup),
   ("13-no-cures", noCures), ("14-macro-naloxone", macroNaloxone),
   ("15-hidden-controlled-details", hiddenControlledDetails), ("16-schedule-ii-refills", scheduleIIRefills),
   ("17-no-restraint-care-plan", noRestraintCarePlan), ("18-no-op-technique", noOpTechnique),
   ("19-no-vaccine-provider-address", noVaccineProviderAddress), ("20-no-administration-time", noAdministrationTime),
   ("21-no-controlled-strength", noControlledStrength), ("22-hidden-signing-notice", hiddenSigningNotice),
   ("23-no-telehealth-consent", noTelehealthConsent), ("24-default-refill-eligibility", defaultRefillEligibility),
   ("25-restart-restraint-clock", restartRestraintClock), ("26-stale-preoperative-hp", stalePreoperativeHp),
   ("27-expired-controlled-fill", expiredControlledFill), ("28-underage-minor-consent", underageMinorConsent),
   ("29-invalid-birth-date", invalidBirthDate), ("30-daily-methotrexate-default", dailyMethotrexateDefault),
   ("31-hidden-result-components", hiddenResultComponents), ("32-misleading-signing-label", misleadingSigningLabel),
   ("33-np-preop-macro", npPreopMacro), ("34-prefilled-attending", prefilledAttending)]
/-- Catalog-only defects. Keep these seeds for full-profile runs. -/
def fullProfileOnly : List String := ((programs.drop 16).take 16).map (·.1)

/-- Defects in the hand-written workflows remain active in core. -/
def corePrograms : List (String × Program) :=
  programs.filter fun (name, _) => !fullProfileOnly.contains name

/-- The property each core mutation must fail, even if another rule fails first. -/
def coreExpectedProperties : List String :=
  ["reviewsBeforeCommit", "humanOnlyKept", "writesOnly", "humanOnlyKept",
   "humanOnlyKept", "units", "completable", "humanOnlyKept", "humanOnlyKept",
   "wellFormed", "noRepeatInterruptions", "severityTiers", "completable",
   "humanOnlyKept", "reviewsBeforeCommit", "completable", "humanOnlyKept", "humanOnlyKept"]

#guard programs.length == 34
#guard !referencesValid Specs.V1.specV1 poundsAsWeight
#guard !referencesValid Specs.V1.specV1 inventedAlert
#guard !(reachable unreachableRefill "home").contains "w7Decision"
end Ehr.Canonical.Bad
