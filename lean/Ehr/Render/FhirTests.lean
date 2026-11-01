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
#guard (noteRow note).encounter == "Not recorded, Clinic"
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

/-- Logical resource identity is not a medical record number. -/
def patientWithoutMrn : Json := json r#"{"resourceType":"Patient","id":"opaque-resource-id"}"#
#guard mrnOf patientWithoutMrn == ""
#guard patientIdOf patientWithoutMrn == "opaque-resource-id"
#guard parsed.display.banner.weight?.map (fun (weight, unit, _) => (weight, unit)) == parsed.facts.weightToday?
#guard (output emptyBundle).display.banner.weight? == none
#guard (bannerWeightOf "1900-01-01" (bundleResources clinical)) == none

end Ehr.Render.Tests

namespace Ehr.Render.Tests
open Lean Fhir

/-- Named clinic examples use only explicit source status, dates and references. -/
def clinicPatient : Json := json r#"{"resourceType":"Patient","id":"clinic-patient","name":[{"given":["Alex"],"family":"Morgan"}],"birthDate":"2020-01-01","gender":"female"}"#
def clinicAppointment : Json := json r#"{"resourceType":"Appointment","id":"appointment","status":"booked","start":"2026-10-31T09:00:00-07:00","appointmentType":{"text":"Office visit"},"participant":[{"actor":{"reference":"Patient/clinic-patient"}},{"actor":{"reference":"Practitioner/doctor","display":"Dr Morgan"}}]}"#
def otherAppointment : Json := json r#"{"resourceType":"Appointment","status":"arrived","start":"2026-10-31T10:00:00-07:00","participant":[{"actor":{"reference":"Patient/other-patient"}}]}"#
def clinicRefill : Json := json r##"{"resourceType":"Task","id":"request","for":{"reference":"Patient/clinic-patient"},"status":"requested","authoredOn":"2026-10-31T08:00:00-07:00","code":{"text":"Refill request"},"focus":{"reference":"#requested-rx"},"contained":[{"resourceType":"MedicationRequest","id":"requested-rx","medicationCodeableConcept":{"text":"lisinopril"},"dosageInstruction":[{"text":"10 mg by mouth daily"}]}]}"##
def clinicForecast : Json := json r#"{"resourceType":"ImmunizationRecommendation","date":"2026-10-31","authority":{"display":"State immunization registry"},"recommendation":[{"vaccineCode":[{"text":"Influenza"}],"forecastStatus":{"text":"Due"},"dateCriterion":[{"code":{"text":"Recommended"},"value":"2026-10-31"}]}]}"#

/-- Result selection follows the Task's report, while its trend retains earlier
measurements of that analyte without pulling in unrelated tests. -/
def clinicResult : Json := json r#"{"resourceType":"Task","id":"result-message","for":{"reference":"Patient/clinic-patient"},"status":"requested","code":{"text":"Result review"},"focus":{"reference":"DiagnosticReport/result-report"}}"#
def clinicReport : Json := json r#"{"resourceType":"DiagnosticReport","id":"urn:uuid:result-report","result":[{"reference":"Observation/current-result"}]}"#
def clinicLab : Json := json r#"{"resourceType":"Observation","id":"urn:uuid:current-result","status":"final","category":[{"coding":[{"code":"laboratory"}]}],"code":{"coding":[{"code":"4548-4","display":"Hemoglobin A1c"}]},"effectiveDateTime":"2026-10-31","valueQuantity":{"value":7.2,"unit":"%"}}"#
def clinicPriorLab : Json := (clinicLab.setObjVal! "id" (.str "prior-result")).setObjVal! "effectiveDateTime" (.str "2026-07-31")
def clinicOtherLab : Json := (clinicLab.setObjVal! "id" (.str "other-result")).setObjVal! "code" (json r#"{"coding":[{"code":"6299-2","display":"Urea nitrogen"}]}"#)
def clinicResultRecords : List Json := [clinicResult, clinicReport, clinicLab, clinicPriorLab, clinicOtherLab]
#guard Ambulatory.selectedResultSources clinicResultRecords clinicPatient == [clinicLab]
#guard (Ambulatory.selectedTrendRows clinicResultRecords [clinicLab]).length == 2
#guard (Ambulatory.selectedTrendRows clinicResultRecords [clinicLab]).all fun row => row.lookup "Test" == some "Hemoglobin A1c"
#guard (Ambulatory.selectedResultSources [clinicResult] clinicPatient).isEmpty
/-- Missing selected-report records remain empty even when unrelated labs exist. -/
def missingClinicResult : Facts := factsOf context [clinicPatient, clinicResult, clinicOtherLab] clinicPatient
#guard ((infoPayload missingClinicResult "resultTrend").map (·.rows)) == some []

#guard (Ambulatory.scheduleRows context [clinicAppointment, otherAppointment] clinicPatient).length == 1
#guard (Ambulatory.scheduleRows context [clinicAppointment] (clinicPatient.setObjVal! "id" (.str "urn:uuid:clinic-patient"))).length == 1
#guard ((Ambulatory.scheduleRows context [clinicAppointment] clinicPatient).head?).any (fun row => row.status == "booked" && row.provider == "Dr Morgan")
#guard (Ambulatory.scheduleRows { context with today := "2026-11-01" } [clinicAppointment] clinicPatient).isEmpty
#guard (Ambulatory.patientTasks [clinicRefill] clinicPatient).length == 1
#guard (Ambulatory.patientTasks [clinicRefill.setObjVal! "status" (.str "completed")] clinicPatient).isEmpty
#guard (Ambulatory.patientTasks [clinicRefill] (clinicPatient.setObjVal! "id" (.str "other-patient"))).isEmpty
#guard ((Ambulatory.refillMedication [] clinicRefill).map medName) == some "lisinopril"
#guard ((Ambulatory.refillMedication [json r#"{"resourceType":"MedicationRequest","id":"urn:uuid:requested-rx","medicationCodeableConcept":{"text":"lisinopril"}}"#]
  (clinicRefill.setObjVal! "focus" (json r#"{"reference":"MedicationRequest/requested-rx"}"#))).map medName) == some "lisinopril"
#guard (Ambulatory.refillMedication [homeMed] (clinicRefill.setObjVal! "focus" (json r#"{"reference":"MedicationRequest/missing"}"#))).isNone
#guard (Ambulatory.forecastRows [clinicForecast]).any fun row => row.lookup "Status" == some "Due" && row.lookup "Source" == some "State immunization registry"
#guard (Ambulatory.forecastRows [json r#"{"resourceType":"Immunization","status":"completed"}"#]).isEmpty
#guard (Ambulatory.payloads context [clinicRefill] clinicPatient).all (fun p => p.info != "adherence")
#guard (Ambulatory.payloads context [] clinicPatient).isEmpty
/-- Every generated supporting view passes the ordinary patient/version binding. -/
def clinicFacts : Facts := factsOf context [clinicPatient, clinicAppointment, clinicRefill] clinicPatient
#guard (clinicFacts.infoPayloads?.getD []).all fun payload => (infoPayload clinicFacts payload.info).isSome
end Ehr.Render.Tests
