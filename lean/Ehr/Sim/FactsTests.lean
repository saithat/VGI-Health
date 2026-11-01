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
-- Identity validation selects the same first Patient as the renderer.
def multiplePatients : Json := patientBundle.setObjVal! "entry" (toJson (
  Json.mkObj [("resource", Json.mkObj [("resourceType", .str "Patient"), ("id", .str "first")])] ::
  Ehr.Render.Fhir.arr patientBundle "entry"))
#guard bundlePatientMatches multiplePatients "first"
#guard !bundlePatientMatches multiplePatients "fixture-id"
end Ehr.Sim.FactsTests
