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

def json (s : String) : Json := (Json.parse s).toOption.getD .null
#guard decodeBase64Utf8 "SGVsbG8KCs6xIPCfmIA=" == some "Hello\n\nα 😀"
#guard decodeBase64Utf8 "" == some ""
#guard decodeBase64Utf8 "YQ==" == some "a"
#guard decodeBase64Utf8 "YWI=" == some "ab"
#guard decodeBase64Utf8 "YWJj" == some "abc"
#guard decodeBase64Utf8 "YR==" == none
#guard decodeBase64Utf8 "YWJ=" == none
#guard decodeBase64Utf8 "/w==" == none
#guard decodeBase64Utf8 "wK8=" == none
#guard decodeBase64Utf8 "7aCA" == none
#guard decodeBase64Utf8 "9JCAgA==" == none
#guard decodeBase64Utf8 "abc" == none
#guard decodeBase64Utf8 "YQ==AAAA" == none
#guard decodeBase64Utf8 "@@==" == none
#guard noteAttachmentText (json r#"{"contentType":"text/plain","data":"YQ=="}"#) == "a"
#guard (noteAttachmentText (json r#"{"contentType":"text/plain","url":"https://example.com"}"#)).startsWith "Note body unavailable"
#guard (noteAttachmentText (json r#"{"contentType":"text/html","data":"YQ=="}"#)).startsWith "Note body unavailable"
#guard (noteAttachmentText .null).startsWith "Note body unavailable"
def note : Json := json r#"{"resourceType":"DocumentReference","id":"n","status":"superseded","docStatus":"amended","date":"2026-01-02","author":[{"display":"A"},{"display":"B"}],"context":{"encounter":[{"reference":"Encounter/1"},{"display":"Clinic"}]},"extension":[{"url":"urn:vgi:synthetic-hospital:original-date","valueDate":"2020-01-01"},{"url":"urn:vgi:synthetic-hospital:shift-days","valueInteger":-12}],"content":[{"attachment":{"title":"First","contentType":"text/plain","data":"YQ=="}},{"attachment":{"title":"Second","contentType":"text/plain","data":"Yg=="}}]}"#
#guard (noteRow note).author == "A, B"
#guard (noteRow note).encounter == "Encounter/1, Clinic"
#guard (noteRow note).text == "Attachment 1: First\na\n\nAttachment 2: Second\nb"
#guard (noteRow note).status == "superseded / amended"
#guard (noteRow note).sourceDate == "2020-01-01"
#guard (noteRow note).shiftDays == "-12"
#guard (noteRows [note]).length == 1
#guard (noteRows [note.setObjVal! "status" (.str "entered-in-error")]).isEmpty
#guard ["current", "superseded", "amended", ""].all fun status =>
  (noteRows [note.setObjVal! "status" (.str status)]).length == 1
#guard (noteRows [note.setObjVal! "date" (.str ""), note, note.setObjVal! "id" (.str "n2")]).map (·.id) == ["n", "n2", "n"]
#guard (noteRow (json r#"{"context":{"period":{"start":"2020"}}}"#)).date == "2020"
#guard (noteRow (json r#"{"content":[{"attachment":{"creation":"2019"}}]}"#)).date == "2019"
def homeMed : Json := json r#"{"resourceType":"MedicationStatement","id":"home","medicationCodeableConcept":{"text":"Unknown text-only drug"},"dosage":[{"text":"Patient reports nightly"}],"status":"active"}"#
def family : Json := json r#"{"resourceType":"FamilyMemberHistory","relationship":{"text":"Mother"},"condition":[{"code":{"text":"Diabetes"}},{"code":{"text":"Asthma"}}]}"#
def social : Json := json r#"{"resourceType":"Observation","category":[{"coding":[{"code":"social-history"}]}],"code":{"text":"Occupation"},"valueString":"Teacher"}"#
def surgery : Json := json r#"{"resourceType":"Procedure","code":{"text":"Appendectomy"}}"#
#guard (historyRows [homeMed, family, social, surgery]).length == 5
#guard (historyRows [homeMed]).all (·.kind == "Home medications (reported)")
#guard (medRows [homeMed]).isEmpty
#guard (medicationStatementHistoryRow homeMed).item == "Unknown text-only drug"
#guard (familyHistoryRows .null).length == 1
#guard (socialHistoryRow social).detail == "Teacher; date: Unknown"
#guard (procedureHistoryRow surgery).detail == "Date: Unknown"
#guard notesVersionOf [note, homeMed] == notesVersionOf [homeMed, note]
#guard historyVersionOf [note, homeMed, family] == historyVersionOf [family, homeMed, note]
#guard roundTrips (noteRow note)
#guard roundTrips (medicationStatementHistoryRow homeMed)
#guard factVersion { parsed.facts with notesVersion := 42, historyVersion := 7 } "notesVersion" == some 42

#guard (Lean.fromJson? (json r#"{"patientId":"old","identity":{"initials":"AB","sex":"F","ageYears":40},"allergyVersion":0,"allergyClasses":[],"medsVersion":0,"currentMedClasses":[],"careGaps":[],"abnormalResult":false,"now":0,"receipts":[],"record":[]}"#) : Except String Facts).toOption.any (fun f => f.notesVersion == 0 && f.historyVersion == 0)
#guard (Lean.fromJson? ((Lean.toJson parsed.facts).setObjVal! "notesVersion" (.str "bad")) : Except String Facts).isOk == false

/-- A dated surgical order for one patient, with no fabricated OR-room name. -/
def periopPatient : Json := json r#"{"resourceType":"Patient","id":"periop-a","name":[{"given":["Alex"],"family":"Example"}]}"#
def periopOrder : Json := json r#"{"resourceType":"ServiceRequest","id":"case-a","status":"active","intent":"order","category":[{"coding":[{"code":"387713003"}]}],"code":{"text":"Laparoscopic appendectomy"},"subject":{"reference":"Patient/periop-a"},"occurrenceDateTime":"2026-10-31","performer":[{"reference":"Practitioner/internal-provider-id"}]}"#
def periopConsult : Json := json r#"{"resourceType":"ServiceRequest","id":"consult-a","status":"active","code":{"coding":[{"code":"11429006","display":"Surgical consultation"}]},"subject":{"reference":"Patient/periop-a"},"priority":"urgent","reasonCode":[{"text":"Right lower quadrant pain"}]}"#
def periopConsent : Json := json r#"{"resourceType":"Consent","status":"active","patient":{"reference":"Patient/periop-a"},"dateTime":"2026-10-31T07:00:00Z","scope":{"text":"Treatment"}}"#
def periopOtherPatient : Json := periopOrder.setObjVal! "subject" (json r#"{"reference":"Patient/another-patient"}"#)
def periopRows := surgicalCaseRows context.today [periopOrder, periopOtherPatient] periopPatient
#guard periopRows.length == 1
#guard (periopRows.head!).patient == "Example, Alex"
#guard (periopRows.head!).start == "2026-10-31"
#guard (periopRows.head!).room == "Not recorded"
#guard (periopRows.head!).surgeon == "Not recorded"
#guard (surgicalCaseRows "2026-11-01" [periopOrder] periopPatient).isEmpty
#guard (surgicalConsultRows [periopConsult, periopOtherPatient] periopPatient).length == 1
#guard (surgicalConsultRows [periopConsult.setObjVal! "status" (.str "completed")] periopPatient).isEmpty
#guard (surgicalConsentRows [periopConsent] periopPatient).head!.lookup "Document status" == some "active"
#guard !(surgicalConsentRows [periopConsent] periopPatient).any (fun row => row.any (fun cell => cell.2 == "Verified" || cell.2 == "Time-out complete"))
#guard (surgicalRecordRows context.today [surgery] periopPatient).isEmpty
/-- Derived display payloads pass the ordinary patient/version reader. -/
def periopFacts := factsOf context [periopPatient, periopOrder, periopConsent] periopPatient
#guard (infoPayload periopFacts "scheduleTasks").any (fun p => p.rows.length == 1)
#guard (infoPayload { periopFacts with patientId := "another-patient" } "scheduleTasks").isNone
#guard (periopFacts.record.lookup "consentVerified").isNone
#guard !periopReferenceMatches .null .null
#guard periopReferenceMatches (periopPatient.setObjVal! "id" (.str "urn:uuid:case-patient"))
  (json r#"{"reference":"urn:uuid:case-patient"}"#)
end Ehr.Render.Tests
