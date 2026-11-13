import Ehr.Render.Fhir
import Ehr.Core.Deficiencies
import Ehr.Specs.Rules.Features

/-! New specification for owner review: live record projection regressions.
These use the production factsOf path, never supplied eventEvidence or UI clicks. -/
namespace Ehr.Render.Fhir.Temporal.Tests
open Lean

def json (s : String) : Json := (Json.parse s).toOption.getD .null
def patient := json r#"{"resourceType":"Patient","id":"p"}"#
def encounter := json r#"{"resourceType":"Encounter","id":"e","meta":{"versionId":"2"},"status":"finished","class":{"code":"IMP"},"subject":{"reference":"Patient/p"},"period":{"start":"2026-10-01T10:00:00Z","end":"2026-10-02T10:00:00Z"}}"#
def completion := json r#"{"resourceType":"Composition","id":"completion","meta":{"versionId":"3"},"status":"final","subject":{"reference":"Patient/p"},"encounter":{"reference":"Encounter/e"},"type":{"coding":[{"system":"urn:vgi:document-type","code":"medical-record-completion"}]},"attester":[{"mode":["legal"],"time":"2026-10-03T10:00:00Z","party":{"reference":"Practitioner/doctor"}}]}"#
def context : FactsContext := { today := "2026-11-03", now := 600, encounterId? := some "e" }
def state : State := { screen := "", history := [], captured := [], receipts := [], acked := [], commits := [], expanded := [], tabSel := [], currentSlot := 0, clock := 0 }
def facts (docs : List Json := []) : Facts := factsOf context ([patient, encounter] ++ docs) patient
def time (f : Facts) (event key : String) := eventTime f state { event, artifactKey := key } false
def discharge := minute? "2026-10-02T10:00:00Z"
def signed := minute? "2026-10-03T10:00:00Z"

#guard (facts []).episodeId? == some "e"
#guard time (facts []) "discharge" "completeMedicalRecord" == discharge
#guard time (facts []) "admission" "verifyPreoperativeRecord" == minute? "2026-10-01T10:00:00Z"
#guard time (facts []) "admission" "recordNursingTransition" == minute? "2026-10-01T10:00:00Z"
#guard time (facts []) "encounter.start" "verifyEncounterWeight" == minute? "2026-10-01T10:00:00Z"
#guard time (facts [completion]) "record.completed" "completeMedicalRecord" == signed
#guard time (facts [completion]) "record.authenticated" "completeMedicalRecord" == signed
#guard time (facts []) "record.completed" "completeMedicalRecord" == none
#guard temporalStatus (facts []) state Specs.Rules.Features.temporal007 == .overdue
#guard temporalStatus (facts [completion]) state Specs.Rules.Features.temporal007 == .met
#guard (Deficiencies.requirementRows { id := "doctor", role := .physician }
  { patient := "p", encounter := "e", facts := facts [] }
  { id := "completeMedicalRecord", label := "Complete record", roles := [.physician],
    temporal? := some [Specs.Rules.Features.temporal007] }).map (·.status) == [.delinquent]

-- Date-only, local, invalid, planned and future events cannot supply actual evidence.
#guard minute? "2026-10-02" == none
#guard minute? "2026-10-02T10:00:00" == none
#guard minute? "2026-02-30T10:00:00Z" == none
#guard minute? "2026-10-02T12:00:00+02:00" == discharge
#guard time (factsOf context [patient, encounter.setObjVal! "status" (.str "planned")] patient) "admission" "verifyPreoperativeRecord" == none
#guard time (factsOf { context with today := "2026-10-01" } [patient, encounter] patient) "discharge" "completeMedicalRecord" == none
-- Wrong patient/encounter, stale, duplicate, unsigned and superseded documents stay absent.
#guard time (facts [completion.setObjVal! "subject" (json r#"{"reference":"Patient/other"}"#)]) "record.completed" "completeMedicalRecord" == none
#guard time (facts [completion.setObjVal! "encounter" (json r#"{"reference":"Encounter/other"}"#)]) "record.completed" "completeMedicalRecord" == none
#guard time (facts [completion.setObjVal! "meta" .null]) "record.completed" "completeMedicalRecord" == none
#guard time (facts [completion, completion]) "record.completed" "completeMedicalRecord" == none
#guard time (facts [completion.setObjVal! "status" (.str "preliminary")]) "record.completed" "completeMedicalRecord" == none
#guard time (facts [completion.setObjVal! "attester" (.arr #[])]) "record.authenticated" "completeMedicalRecord" == none
#guard time (facts [completion.setObjVal! "type" (json r#"{"coding":[{"system":"urn:vgi:document-type","code":"discharge-summary"}]}"#)]) "record.completed" "completeMedicalRecord" == none
#guard time (facts [completion, json r#"{"relatesTo":[{"code":"replaces","targetReference":{"reference":"Composition/completion"}}]}"#]) "record.completed" "completeMedicalRecord" == none
#guard time (factsOf context [patient, encounter, encounter.setObjVal! "meta" (json r#"{"versionId":"1"}"#)] patient) "discharge" "completeMedicalRecord" == none
-- A saved event from an older record snapshot cannot be paired with new bindings.
#guard time { facts [completion] with eventEvidence? := (facts []).eventEvidence? } "discharge" "completeMedicalRecord" == none
#guard time { facts [completion] with episodeId? := some "other" } "record.completed" "completeMedicalRecord" == none
#guard (facts [completion]).eventEvidence? == (factsOf context [completion, encounter, patient] patient).eventEvidence?
def weight := json r#"{"resourceType":"Observation","id":"weight","meta":{"versionId":"1"},"status":"final","subject":{"reference":"Patient/p"},"encounter":{"reference":"Encounter/e"},"code":{"coding":[{"system":"http://loinc.org","code":"29463-7"}]},"performer":[{"reference":"Practitioner/nurse"}],"effectiveDateTime":"2026-10-01T11:00:00Z"}"#
#guard time (facts [weight]) "weight.measured" "verifyEncounterWeight" == minute? "2026-10-01T11:00:00Z"
#guard time (facts [weight.setObjVal! "status" (.str "preliminary")]) "weight.measured" "verifyEncounterWeight" == none
#guard time (facts [weight.setObjVal! "performer" (.arr #[])]) "weight.measured" "verifyEncounterWeight" == none
#guard time (facts [weight, weight.setObjVal! "id" (.str "other-weight")]) "weight.measured" "verifyEncounterWeight" == none
#guard time (facts [weight.setObjVal! "effectiveDateTime" (.str "2026-10-01")]) "weight.measured" "verifyEncounterWeight" == none

end Ehr.Render.Fhir.Temporal.Tests
