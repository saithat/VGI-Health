import Ehr.Commit.Check
import Ehr.Examples.TinyTests

namespace Ehr.Commit.Tests

open Lean Render Render.Fhir Examples.Tiny

/-- Small versioned chart; real guard/spec/program, with human input below. -/
def bundle : Json := Json.mkObj [
  ("resourceType", .str "Bundle"), ("type", .str "collection"),
  ("entry", .arr #[
    Json.mkObj [("resource", Json.mkObj [
      ("resourceType", .str "Patient"), ("id", .str "pt-1"),
      ("meta", Json.mkObj [("versionId", .str "3")]),
      ("name", .arr #[Json.mkObj [("given", .arr #[.str "Jane"]), ("family", .str "Doe")]]),
      ("gender", .str "female"), ("birthDate", .str "1992-01-01")])],
    Json.mkObj [("resource", Json.mkObj [
      ("resourceType", .str "Encounter"), ("id", .str "enc-1"),
      ("meta", Json.mkObj [("versionId", .str "7")]), ("status", .str "in-progress"),
      ("subject", Json.mkObj [("reference", .str "Patient/pt-1")])])]])]

def context : FactsContext :=
  { today := "2026-11-02", now := 600, encounterId? := some "enc-1" }

def currentFacts : Facts :=
  ((parseBundle context bundle).toOption.getD (default, Display.empty)).1

/-- Reconstruct a real human interaction trace; do not send a post-commit state. -/
def before : Ehr.State :=
  runAll spec program currentFacts user .human (init spec program currentFacts user)
    [.enter "weightField" (.qty 200 .kg), .click "toOrder",
     .enter "drugField" (.code "amoxicillin"), .enter "doseField" (.qty 5000 .mg),
     .click "toSign", .enter "patientIdField" (.text (identityText currentFacts.identity)),
     .selectTab "signTabs" 1]

def request : Request :=
  { spec, program, user, patient := "pt-1", state := before,
    event := .click "signButton", commit := "signOrders", currentBundle := bundle, context,
    factsVersions := [{ url := "Patient/pt-1", version := "3" },
      { url := "Encounter/enc-1", version := "7" }] }

def expectedPreconditions : List Precondition :=
  [{ url := "Encounter/enc-1", ifMatch := "W/\"7\"" },
   { url := "Patient/pt-1", ifMatch := "W/\"3\"" }]

def staged : Ehr.State := (step spec program currentFacts user .human before request.event).1

#guard currentFacts.sourcePatientId? == some "pt-1"
#guard check request == .accept expectedPreconditions staged
#guard staged.commits == ["signOrders"]
#guard check { request with factsVersions := request.factsVersions.reverse } == check request
#guard (decodeJson Request (encodeJson request)).toOption.map encodeJson == some (encodeJson request)
#guard roundTrips (check request)

/-- Instantiate acceptance soundness on a real Tiny signing state. FHIR parsing
is checked by the executable request tests above; this proof uses Tiny's facts. -/
example : commitGuard spec program facts user Examples.TinyTests.atSignTab "signOrders" = true ∧
    ([] : List Precondition) = preconditions { facts, versions := [] } ∧
    (step spec program facts user .human Examples.TinyTests.atSignTab (.click "signButton")).1 =
      (step spec program facts user .human Examples.TinyTests.atSignTab (.click "signButton")).1 := by
  apply checkCurrent_sound { request with state := Examples.TinyTests.atSignTab }
    { facts, versions := [] } [] _
  decide

#guard check { request with user := { id := "nurse", role := .rn } } ==
  .reject "role: rn may not perform signOrders"
#guard check { request with state := { before with captured := [] } } != check request
#guard check { request with state := staged } == .reject "commit already staged: supply before-state"
#guard check { request with event := .click "backButton" } ==
  .reject "event must add exactly the requested commit and no review receipt"
#guard check { request with commit := "unknown" } == .reject "role: physician may not perform unknown"
#guard check { request with factsVersions := [] } == .reject "stale facts versions: refresh required"
#guard check { request with patient := "other" } == .reject "patient mismatch"
#guard check { request with state := { before with patientContext? := some { patient? := some "other", bound? := some "other" } } } == .reject "state is not bound to this patient"
#guard check { request with context := { context with encounterId? := some "missing" } } ==
  .reject "selected encounter missing or ambiguous"

def resources : List Json := (arr bundle "entry").map (field · "resource")
def chart (rs : List Json) : Json := Json.mkObj
  [("resourceType", .str "Bundle"), ("type", .str "collection"),
   ("entry", .arr (rs.map (fun r => Json.mkObj [("resource", r)])).toArray)]

#guard (currentVersions (chart (resources ++ resources))).isOk == false
#guard (currentVersions (chart [Json.mkObj [("resourceType", .str "Patient"), ("id", .str "p")]])).isOk == false
#guard (currentVersions (bundle.setObjVal! "type" (.str "searchset"))).isOk == false
#guard (currentVersions (bundle.setObjVal! "entry" .null)).isOk == false
#guard !validId "3\"\r\nHeader: injected"
#guard !validId ""
#guard !validId (String.ofList (List.replicate 65 'x'))
#guard check { request with
    currentBundle := chart (resources ++ [resources.head!])
    factsVersions := request.factsVersions ++ [{ url := "Patient/pt-1", version := "3" }] } == .reject "duplicate resource identity"

def wrongEncounter : Json := (resources[1]!).setObjVal! "subject"
  (Json.mkObj [("reference", .str "Patient/other")])
#guard check { request with currentBundle := chart [resources[0]!, wrongEncounter] } ==
  .reject "encounter subject mismatch"
#guard check { request with
    currentBundle := chart [resources[0]!, resources[0]!]
    factsVersions := [{ url := "Patient/pt-1", version := "3" }, { url := "Patient/pt-1", version := "3" }] } ==
  .reject "duplicate resource identity"

/-- The same event is invalid on a chart with a newly recorded allergy.
Even supplying its updated expected vector cannot bypass the current guard. -/
def allergy : Json := (Json.parse r#"{"resourceType":"AllergyIntolerance","id":"a1",
  "meta":{"versionId":"1"},"patient":{"reference":"Patient/pt-1"},
  "clinicalStatus":{"coding":[{"code":"active"}]},
  "code":{"text":"Penicillin","coding":[{"system":"http://snomed.info/sct","code":"91936005"}]}}"#).toOption.getD .null

def allergicRequest : Request :=
  { request with
    currentBundle := chart (resources ++ [allergy])
    factsVersions := request.factsVersions ++ [{ url := "AllergyIntolerance/a1", version := "1" }] }

#guard check { request with currentBundle := allergicRequest.currentBundle } ==
  .reject "stale facts versions: refresh required"
#guard check allergicRequest == .reject "interruptive alert acknowledgment required"

end Ehr.Commit.Tests
