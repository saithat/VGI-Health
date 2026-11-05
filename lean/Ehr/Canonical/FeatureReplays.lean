import Ehr.Canonical.FeatureTests
import Ehr.Core.Json

/-! Export compact replay manifests for the eight permanent feature mutations.
Run after export-content:
  lake env lean --run Ehr/Canonical/FeatureReplays.lean ../programs/replays
These contain typed trusted test facts and real human events, with paths to the
actual exported spec/program. They are counterexamples, not certificates. -/
namespace Ehr.Canonical.FeatureReplays
open Ehr.Canonical.Tests Ehr.Canonical

/-- A complete human path on the selected artifact screen. -/
def path (p : Program) (screen commit : String) (f : Facts) : List Event :=
  navigate p "home" screen ++ fillArtifact p screen (f := f) ++ [.click (cid screen ("commit." ++ commit))]

/-- The exact external inputs needed to reproduce each new failure. -/
def cases : List (Nat × Facts × User × List Event × String) :=
  [(25, expiredRestraint, physician,
      path Bad.restartRestraintClock "feature.continueViolentRestraint" "continueViolentRestraint" expiredRestraint,
      "cms-482.13-e8iA-adult-four-hours"),
   (26, staleHp, surgeon, preOpPath ++ [.click "w6Sign.commit.signOrders"], "ca-title22-70223-hp-24-hours"),
   (27, expiredRx, physician,
      path Bad.expiredControlledFill "feature.dispenseScheduleIIItoV" "dispenseScheduleIIItoV" expiredRx,
      "federal-rx-1306-22-six-months"),
   (28, underage, physician,
      path Bad.underageMinorConsent "feature.authorizeMinorMentalHealthCare" "authorizeMinorMentalHealthCare" underage,
      "minorConsentDecision"),
   (29, hospital, physician,
      navigate Bad.invalidBirthDate "home" "feature.updateDemographics" ++
      [.enter "feature.updateDemographics.feature.patientIdReentry" (.text "RK/M/58"),
       .enter "feature.updateDemographics.feature.preferredLanguage" (.code "en"),
       .enter "feature.updateDemographics.feature.birthDate" (.text "2026-02-30"),
       .click "feature.updateDemographics.commit.updateDemographics"], "birthDate"),
   (30, hospital, physician,
      path Bad.dailyMethotrexateDefault "feature.signOralMethotrexate" "signOralMethotrexate" hospital,
      "required default"),
   (31, resultFacts, physician,
      [.click "home.work.w2Inbox", .click "w2Inbox.openResult",
       .enter "w2Result.resultAction" (.code "repeat"), .click "w2Result.message",
       .enter "w2Message.patientMessage" (.text "Repeat potassium tomorrow"), .click "w2Message.return",
       .click "w2Result.commit.ackResult"], "structured display or action label required"),
   (32, adult, physician, w1Path ++ [.click "w1Sign.commit.signOrders"], "structured display or action label required")]

/-- Emit actual Lean JSON for facts/users/events; use the existing exported programs. -/
def writeReplays (destination : System.FilePath) : IO Unit := do
  IO.FS.createDirAll destination
  for (n, facts, user, events, reason) in cases do
    let program := Bad.programs.find? (fun (_, p) => p.id == "bad-" ++ toString n)
    let some (file, _) := program | throw (IO.userError s!"Missing seed {n}")
    let manifest := Lean.Json.mkObj [
      ("specFile", Lean.toJson "releases/v1/spec.json"),
      ("programFile", Lean.toJson ("programs/bad/" ++ file ++ ".json")),
      ("facts", Lean.toJson facts), ("user", Lean.toJson user),
      ("events", Lean.toJson events), ("expectedReason", Lean.toJson reason)]
    IO.FS.writeFile (destination / (file ++ ".json")) (manifest.pretty ++ "\n")
end Ehr.Canonical.FeatureReplays

def main (args : List String) : IO Unit :=
  Ehr.Canonical.FeatureReplays.writeReplays (args.headD "../programs/replays")
