import Ehr.Canonical.Tests

/-! Human-event walks for catalog artifacts. No captures are fabricated.
These regressions do not certify the checker or actual physical care. -/
namespace Ehr.Canonical.Tests
open Ehr.Specs.V1

/-- Find a short navigate through actual goto buttons, with visited-node pruning. -/
def navigate (p : Program) (origin target : ScreenId) : List Event :=
  let paths : List (ScreenId × List Event) := [(origin, [])]
  let paths := (List.range (specV1.design.maxDepth + 1)).foldl (fun paths _ =>
    let next := paths.flatMap fun (id, es) => (p.screen? id).toList.flatMap fun s =>
      s.components.filterMap fun c => match c.kind with
        | .button (.goto dest) =>
          if paths.any (·.1 == dest) then none else some (dest, es ++ [.click c.id])
        | _ => none
    (paths ++ next).foldl (fun seen x =>
      if seen.any (fun y => y.1 == x.1) then seen else seen ++ [x]) []) paths
  ((paths.find? (·.1 == target)).map (·.2)).getD []

/-- Explicit samples enter real fields. Missing samples stay absent. -/
def fillArtifact (p : Program) (screen : ScreenId) (drug : String := "lisinopril") (refillChoice : String := "approve") (sp : Spec := specV1) (f : Facts := hospital) : List Event :=
  (p.screen? screen).toList.flatMap fun sc => sc.components.flatMap fun c =>
    match c.kind with
    | .field e _ _ =>
      let sample := if e == "patientIdReentry" then some (f.identity.initials ++ "/" ++ f.identity.sex ++ "/" ++ toString f.identity.ageYears) else if e == "weight" then f.weightToday?.map (fun (w, _) => toString (w / 10) ++ "." ++ toString (w % 10)) else if e == "drug" then some drug else if e == "refillDecision" then some refillChoice else
        (LegalExamples.values.find? (·.1 == e)).map (·.2)
      match sample, sp.element? e with
      | some text, some el => (parseValue el.kind text).toList.map (.enter c.id)
      | _, _ => []
    | _ => []

/-- Walk from Home, enter the synthetic documentation and commit as a human. -/
def artifactWalk (screen commit : String) (p : Program := canonicalV1)
    (drug : String := "lisinopril") (sp : Spec := specV1) : State :=
  let role := ((sp.commit? commit).map (fun (cs : CommitSpec) => cs.roles.headD Role.physician)).getD .physician
  let u : User := { id := "doctor1", role }
  let f := FeatureExamples.forCommit hospital commit
  let es := navigate p "home" screen ++ fillArtifact p screen drug (if commit == "denyRefill" then "deny" else "approve") sp f
  finish (run es p f u sp) screen commit p f u sp

/-- Every new artifact action; original commits have detailed W1–W7 walks. -/
def newArtifacts : List (ScreenId × CommitId) :=
  (Rules.actions.filter fun (_, _, k) => !commits.any (·.id == k)).map fun (s, _, k) => (s, k)
#guard newArtifacts.length > 40
#guard newArtifacts.all fun (screen, commit) =>
  (artifactWalk screen commit).commits.contains commit
#guard (artifactWalk "w1ScheduleIISeries" "signScheduleIISeries" (drug := "oxycodone")).commits == ["signScheduleIISeries"]
#guard (artifactWalk "w1EmergencyRxFollowup" "signEmergencyRxFollowup" (drug := "oxycodone")).commits == ["signEmergencyRxFollowup"]

/-- W7 new prescriptions use the ordinary signOrders contract. -/
def newW7 : State := run
  (navigate canonicalV1 "home" "w7Orders" ++ fillArtifact canonicalV1 "w7Orders" ++
   [.click "w7Orders.toSign"] ++ fillArtifact canonicalV1 "w7Sign") (f := hospital)
#guard (finish newW7 "w7Sign" "signOrders" (f := hospital)).commits == ["signOrders"]

-- Eight permanent mutations remove legal capture/display paths. Their guards
-- stay intact, and paired canonical walks show the obligations are satisfiable.
#guard !(artifactWalk "w3Restraint" "signRestraintOrder" Bad.noRestraintCarePlan).commits.contains "signRestraintOrder"
#guard (artifactWalk "w3Restraint" "signRestraintOrder").commits == ["signRestraintOrder"]
#guard !(finish (run
  ([.click "home.work.w6OpNote", .click "w6OpNote.template"] ++
   ["opPreopDiagnosis", "opPostopDiagnosis", "opProcedure", "opAnesthesia", "opFindings",
    "opSpecimens", "opComplications", "opCondition"].map (fun n => .confirm (cid "w6OpNote" n)) ++
   [.enter "w6OpNote.opEbl" (.qty 100 .mL)] ++ LegalExamples.artifact "w6OpNote")
  Bad.noOpTechnique hospital surgeon) "w6OpNote" "signOpNote" Bad.noOpTechnique hospital surgeon).commits.contains "signOpNote"
#guard !(finish (run ([.click "home.work.w5Rooming", .click "w5Rooming.nav.w5Immunizations"] ++ vaccineEntries)
  Bad.noVaccineProviderAddress child np) "w5Immunizations" "recordImmunization" Bad.noVaccineProviderAddress child np).commits.contains "recordImmunization"
#guard !(finish (run (adminPath "insulin lispro" ++ [.enter "w4Admin.highAlertCosign" (.user "nurse2")])
  Bad.noAdministrationTime (adminFacts "insulin lispro") nurse) "w4Admin" "administerMed"
  Bad.noAdministrationTime (adminFacts "insulin lispro") nurse).commits.contains "administerMed"

/-- Complete human controlled-signing path, including prescription content. -/
def legalControlledPath : List Event :=
  [.click "home.work.w1Rooming", .enter "w1Rooming.weight" (.qty 924 .kg),
   .click "w1Rooming.nav.w1Orders"] ++ order "w1Orders" "oxycodone" 100 ++
  [.enter "w1Orders.dosingWeight" (.qty 924 .kg), .click "w1Orders.toSign",
   .click "w1Verify.continue", .enter "w1Sign.patientIdReentry" (.text "RK/M/58")]
#guard (finish (run legalControlledPath) "w1Sign" "signOrders").commits == ["signOrders"]
#guard !(finish (run legalControlledPath Bad.noControlledStrength) "w1Sign" "signOrders"
  Bad.noControlledStrength).commits.contains "signOrders"
#guard reason (one (run legalControlledPath Bad.hiddenSigningNotice) (.click "w1Sign.commit.signOrders")
  Bad.hiddenSigningNotice).2 == "review required: controlledSigningLegalNotice must be shown"
#guard !(artifactWalk "w1Telehealth" "recordTelehealthConsent" Bad.noTelehealthConsent).commits.contains "recordTelehealthConsent"
#guard (artifactWalk "w1Telehealth" "recordTelehealthConsent").commits == ["recordTelehealthConsent"]
#guard !(finish (run
  ([.click "home.work.w7Queue", .click "w7Queue.open", .click "w7Review.decide"] ++
   enter "w7Decision" [("refillDecision", .code "approve"), ("refillQuantity", .qty 900 .none),
     ("refillRefills", .qty 0 .none), ("refillProtocolMet", .flag true)] ++
   [.confirm "w7Decision.refillPharmacy", .enter "w7Decision.legal.drug" (.code "lisinopril")])
  Bad.defaultRefillEligibility refillFacts) "w7Decision" "approveRefill"
  Bad.defaultRefillEligibility refillFacts).commits.contains "approveRefill"

/-- Otherwise complete restraint orders with prohibited PRN/standing values. -/
def badRestraint (mode prn : String) : State := run
  (navigate canonicalV1 "home" "w3Restraint" ++ fillArtifact canonicalV1 "w3Restraint" ++
   [.enter "w3Restraint.legal.restraintOrderMode" (.code mode),
    .enter "w3Restraint.legal.restraintPrn" (.code prn)]) (f := hospital)
#guard reason (one (badRestraint "standing" "notPrn") (.click "w3Restraint.commit.signRestraintOrder")
  (f := hospital)).2 == "value not allowed: restraintOrderMode (allowed: oneTime)"
#guard reason (one (badRestraint "oneTime" "prn") (.click "w3Restraint.commit.signRestraintOrder")
  (f := hospital)).2 == "value not allowed: restraintPrn (allowed: notPrn)"

-- New issuance variants retain every ordinary and catalog signing entry/review.
#guard issuanceCommits.all fun k =>
  ((orderSigningEntries { id := k, roles := prescribers, label := k }) ++
   preOpExtraEntries.map (fun (r : EntryReq) => { r with commit := k }) ++
   (ruleEntries.filter (fun (r : EntryReq) => r.commit == "signOrders")).map (fun (r : EntryReq) => { r with commit := k })).all specV1.entries.contains
#guard issuanceCommits.all fun k =>
  (orderSigningReviews { id := k, roles := prescribers, label := k }).all specV1.reviews.contains
end Ehr.Canonical.Tests
