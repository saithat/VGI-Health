import Ehr.Canonical.LegalTests

/-! Feature-family acceptance and permanent failure regressions on real canonical
programs. Test-only external witnesses are separate from human input events. -/
namespace Ehr.Canonical.Tests
open Ehr.Specs.V1

/-- Walk with supplied external facts; every capture is a real human event. -/
def featureReady (commit : String) (p : Program := canonicalV1)
    (f : Facts := hospital) (sp : Spec := specV1) : State :=
  let screen := "feature." ++ commit
  run (navigate p "home" screen ++ fillArtifact p screen (sp := sp) (f := f)) p f physician sp

/-- Every newly introduced feature artifact has a completing, explicit scenario. -/
def featureArtifactsComplete (p : Program) (sp : Spec) : Bool :=
  Features.artifacts.all fun (screen, _, commit) =>
    (artifactWalk screen commit p (sp := sp)).commits.contains commit
#guard featureArtifactsComplete canonicalV1 specV1

/-- Reject continuation at the exact adult four-hour cutoff, even in a fresh UI state. -/
def expiredRestraint : Facts := { hospital with
  epochMinute? := some (FeatureExamples.issued.time + 240) }
def restraintAttempt : State × StepResult :=
  one (featureReady "continueViolentRestraint" Bad.restartRestraintClock expiredRestraint)
    (.click "feature.continueViolentRestraint.commit.continueViolentRestraint") Bad.restartRestraintClock expiredRestraint
#guard restraintAttempt.1.commits == []
#guard (view specV1 Bad.restartRestraintClock expiredRestraint physician restraintAttempt.1).obligations?.any
  (fun xs => xs.any fun x => x.requirement == "cms-482.13-e8iA-adult-four-hours" && x.status == .overdue)
#guard !(artifactWalk "feature.continueViolentRestraint" "continueViolentRestraint").commits.isEmpty
#guard (finish (featureReady "recordRestraintRelease" (f := expiredRestraint))
  "feature.recordRestraintRelease" "recordRestraintRelease" (f := expiredRestraint)).commits == ["recordRestraintRelease"]

/-- A recorded interval H&P 24 hours plus one minute old cannot be refreshed by text. -/
def staleHp : Facts := { preOpFacts with
  eventEvidence? := preOpFacts.eventEvidence?.map (fun es => es.map fun e =>
    if e.event == "intervalHp.recorded" || e.event == "intervalHp.performed" then
      { e with time := FeatureExamples.now - 10 - 1441 } else e) }
#guard (finish (run preOpPath Bad.stalePreoperativeHp staleHp surgeon)
  "w6Sign" "signOrders" Bad.stalePreoperativeHp staleHp surgeon).commits == []
#guard (finish (run preOpPath (f := preOpFacts) (u := surgeon))
  "w6Sign" "signOrders" (f := preOpFacts) (u := surgeon)).commits == ["signOrders"]

/-- Six calendar months, including October-31 to April-30 clamping, not 180 days. -/
def expiredRx : Facts := { hospital with epochMinute? := some FeatureExamples.sixMonthCutoff.time }
#guard (finish (featureReady "dispenseScheduleIIItoV" Bad.expiredControlledFill expiredRx)
  "feature.dispenseScheduleIIItoV" "dispenseScheduleIIItoV" Bad.expiredControlledFill expiredRx).commits == []
#guard (finish (featureReady "dispenseScheduleIIItoV") "feature.dispenseScheduleIIItoV" "dispenseScheduleIIItoV").commits == ["dispenseScheduleIIItoV"]
#guard (finish (featureReady "recordPrescriptionExpiryDecision" (f := expiredRx))
  "feature.recordPrescriptionExpiryDecision" "recordPrescriptionExpiryDecision" (f := expiredRx)).commits == ["recordPrescriptionExpiryDecision"]

/-- Human affirmation cannot authorize the Family Code 6924 pathway below age twelve. -/
def eligibleMinor : Facts := FeatureExamples.forCommit hospital "authorizeMinorMentalHealthCare"
def underage : Facts := { eligibleMinor with
  identity := { eligibleMinor.identity with ageYears := 11 }
  clinical? := eligibleMinor.clinical?.map fun c =>
    { c with age? := some { years := 11, source := FeatureExamples.observation "age" } } }
#guard (finish (featureReady "authorizeMinorMentalHealthCare" Bad.underageMinorConsent underage)
  "feature.authorizeMinorMentalHealthCare" "authorizeMinorMentalHealthCare" Bad.underageMinorConsent underage).commits == []
#guard (finish (featureReady "authorizeMinorMentalHealthCare" (f := eligibleMinor))
  "feature.authorizeMinorMentalHealthCare" "authorizeMinorMentalHealthCare" (f := eligibleMinor)).commits == ["authorizeMinorMentalHealthCare"]
#guard (finish (featureReady "recordTreatmentDecision" (f := underage))
  "feature.recordTreatmentDecision" "recordTreatmentDecision" (f := underage)).commits == ["recordTreatmentDecision"]
/-- Missing age is unknown, and cannot bypass the minor threshold. -/
def unknownMinorAge : Facts := { eligibleMinor with
  clinical? := eligibleMinor.clinical?.map fun c => { c with age? := none } }
#guard (finish (featureReady "authorizeMinorMentalHealthCare" (f := unknownMinorAge))
  "feature.authorizeMinorMentalHealthCare" "authorizeMinorMentalHealthCare" (f := unknownMinorAge)).commits == []

/-- Invalid dates are refused on entry and cannot enable the demographic update. -/
def demographics : State := run (navigate Bad.invalidBirthDate "home" "feature.updateDemographics" ++
  [.enter "feature.updateDemographics.feature.patientIdReentry" (.text "RK/M/58"),
   .enter "feature.updateDemographics.feature.preferredLanguage" (.code "en")]) Bad.invalidBirthDate hospital
#guard (one demographics (.enter "feature.updateDemographics.feature.birthDate" (.text "2026-02-30"))
  Bad.invalidBirthDate hospital).2 != .ok
#guard (finish demographics "feature.updateDemographics" "updateDemographics" Bad.invalidBirthDate hospital).commits == []
#guard (finish (featureReady "updateDemographics") "feature.updateDemographics" "updateDemographics").commits == ["updateDemographics"]

/- Changing a mandatory default is an independent program hard stop. -/
#guard !defaultsOk specV1 Bad.dailyMethotrexateDefault
#guard (finish (featureReady "signOralMethotrexate" Bad.dailyMethotrexateDefault)
  "feature.signOralMethotrexate" "signOralMethotrexate" Bad.dailyMethotrexateDefault).commits == []
#guard (finish (featureReady "signOralMethotrexate")
  "feature.signOralMethotrexate" "signOralMethotrexate").commits == ["signOralMethotrexate"]

/- Old summaries do not replace grouped component rows, or an exact signing label. -/
#guard (finish (run [.click "home.work.w2Inbasket", .click "w2Inbasket.openResult",
  .enter "w2Result.resultAction" (.code "repeat"), .click "w2Result.message",
  .enter "w2Message.patientMessage" (.text "Repeat potassium tomorrow"), .click "w2Message.return"]
  Bad.hiddenResultComponents resultFacts) "w2Result" "ackResult" Bad.hiddenResultComponents resultFacts).commits == []
#guard (finish w2 "w2Result" "ackResult" (f := resultFacts)).commits == ["ackResult"]
#guard (finish (run w1Path Bad.misleadingSigningLabel) "w1Sign" "signOrders" Bad.misleadingSigningLabel).commits == []
#guard (finish w1 "w1Sign" "signOrders").commits == ["signOrders"]

/- Actual grouped rows and selection state flow into the interpreter's view. -/
#guard (payloadView specV1 resultFacts w2 "groupedResultComponents").any fun p =>
  p.groups.length == 1 && (p.groups.head?.map (·.rows.length)) == some 2
#guard (infoPayload { hospital with infoPayloads? := none } "groupedResultComponents").isNone
/-- Selection emphasis comes from an actual confirmed per-row human flag. -/
def patientSelectionFacts : Facts := { hospital with phase? := some { workflow := "shell", phase := "patient-selection" } }
def selectedPatient : State := run [.enter "home.feature.patientSelected" (.flag true)] (f := patientSelectionFacts)
#guard (payloadView specV1 patientSelectionFacts selectedPatient "patientListIdentity").any fun p =>
  (p.groups.flatMap (·.rows)).any (·.selected)
/- Unknown photo availability requires the photo; explicit false permits absence. -/
#guard match infoPayload hospital "patientPhoto", (specV1.info? "patientPhoto").bind (·.payload?) with
  | some p, some contract => payloadComplete p contract hospital w1 &&
      !payloadComplete { p with availability := [] } contract hospital w1
  | _, _ => false
/-- The adult restraint rule has no invented upper age limit. -/
def olderAdult : Facts := { expiredRestraint with
  identity := { expiredRestraint.identity with ageYears := 151 }
  clinical? := expiredRestraint.clinical?.map fun c =>
    { c with age? := some { years := 151, source := FeatureExamples.observation "age" } } }
#guard expiryStatus olderAdult (init specV1 canonicalV1 olderAdult physician)
  Specs.Rules.Features.expiry001 == .overdue

/-- Editing a dependency invalidates an already captured supply-days calculation. -/
def directSupply : State := featureReady "authorizeOudDirectDispensing"
def changedSupply : State := more directSupply
  [.enter "feature.authorizeOudDirectDispensing.feature.dispenseQuantity" (.qty 40 .none)]
#guard (finish directSupply "feature.authorizeOudDirectDispensing" "authorizeOudDirectDispensing").commits == ["authorizeOudDirectDispensing"]
#guard (finish changedSupply "feature.authorizeOudDirectDispensing" "authorizeOudDirectDispensing").commits == []
end Ehr.Canonical.Tests
