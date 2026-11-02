import Ehr.Commit.Tests
import Ehr.Canonical.CoreWorkflowTests

open Ehr Lean

def tinyEvents : List Event :=
  [.enter "weightField" (.qty 200 .kg), .click "toOrder",
   .enter "drugField" (.code "amoxicillin"), .enter "doseField" (.qty 5000 .mg),
   .click "toSign", .enter "patientIdField" (.text (identityText Commit.Tests.currentFacts.identity)),
   .selectTab "signTabs" 1]

def main : IO Unit := IO.println (Json.mkObj [
  ("tiny", toJson Commit.Tests.request), ("tinyEvents", toJson tinyEvents),
  ("hospitalSpec", toJson Specs.V1.specV1),
  ("nurseProgram", toJson { Canonical.canonicalV1 with
    screens := Canonical.canonicalV1.screens.filter (fun s => ["home", "w4Worklist", "w4Mar", "w4Admin"].contains s.id),
    macros := [], patientSelection? := none }),
  ("admissionProgram", toJson { Canonical.canonicalV1 with
    start := "w3Disposition",
    screens := Canonical.canonicalV1.screens.filter (fun s => s.id == "w3Disposition"),
    macros := [], patientSelection? := none }),
  ("adminEvents", toJson (Canonical.CoreTests.adminPath "amoxicillin"))]).compress
