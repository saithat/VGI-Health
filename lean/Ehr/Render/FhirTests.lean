import Ehr.Render.Fhir
import Ehr.Core.Basics

namespace Ehr.Render.Tests
open Lean Fhir

def context : FactsContext := { today := "2026-10-31" }
def clinical : Json := (Json.parse (include_str "TestData/clinical.json")).toOption.getD .null
def pounds : Json := (Json.parse (include_str "TestData/pounds.json")).toOption.getD .null
def emptyBundle : Json := (Json.parse (include_str "TestData/empty.json")).toOption.getD .null
def output (b : Json) : FactsOutput :=
  (runFacts { bundle := b, context }).toOption.getD { facts := default, display := Display.empty }
def parsed := output clinical
#guard parsed.facts.patientId == "https://github.com/synthetichealth/synthea|patient-1"
#guard scanMatches parsed.facts "wristband" parsed.facts.patientId
#guard !scanMatches parsed.facts "wristband" "medplum-server-id"
#guard parsed.display.allergies.length == 2
#guard parsed.display.allergies.all (·.id != "")
#guard parsed.facts.allergyClasses.contains "penicillin"
#guard parsed.display.meds.length == 2
#guard parsed.display.meds.all (·.status != "stopped")
#guard parsed.facts.weightToday? == some (725, .kg)
#guard (output pounds).facts.weightToday? == some (1600, .lb)
#guard (output emptyBundle).facts.weightToday? == none
#guard parsed.display.vitals.any (·.value == "128/82")
#guard parsed.display.labs.any (fun r => r.abnormal && r.refRange == "4–5.6")
#guard roundTrips parsed.display
#guard roundTrips parsed
#guard (parseBundle context .null).isOk == false
#guard (bundleResources clinical).all (fun r => str r "id" != "")
#guard listVersion (bundleResources clinical) == listVersion (bundleResources clinical).reverse
-- Same Synthea identity after Medplum assigns a different resource id.
#guard patientIdOf ((entryResource (first clinical "entry")).setObjVal! "id" (.str "server-id")) == parsed.facts.patientId
end Ehr.Render.Tests
