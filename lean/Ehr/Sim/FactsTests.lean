import Ehr.Cli.Sim
namespace Ehr.Sim.FactsTests
open Lean Ehr.Cli.Sim

def patientBundle : Json := Json.mkObj [
  ("resourceType", .str "Bundle"), ("entry", toJson [Json.mkObj [
    ("fullUrl", .str "urn:uuid:fixture-id"), ("resource", Json.mkObj [
      ("resourceType", .str "Patient"), ("identifier", toJson [Json.mkObj [
        ("system", .str "https://github.com/synthetichealth/synthea"), ("value", .str "fixture-id")]])])]])]
#guard bundlePatientMatches patientBundle "fixture-id"
#guard bundlePatientMatches patientBundle "https://github.com/synthetichealth/synthea|fixture-id"
#guard !bundlePatientMatches patientBundle "someone-else"
end Ehr.Sim.FactsTests
