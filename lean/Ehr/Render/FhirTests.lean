import Ehr.Render.Fhir
import Ehr.Core.Basics
import Ehr.Specs.ClinicalTables

namespace Ehr.Render.Tests
#guard Ehr.Render.Fhir.mrnOf (Lean.Json.mkObj [("identifier", .arr #[Lean.Json.mkObj [
  ("system", .str "http://hospital.smarthealthit.org"), ("value", .str "SH00001675")]])]) == "SH00001675"
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

/-- Standard names may be shortened without changing a locally qualified label. -/
def creatinineConcept : Json := json r#"{"coding":[{"system":"http://loinc.org","code":"2160-0","display":"Creatinine [Mass/volume] in Serum or Plasma"}]}"#
def a1cConcept : Json := json r#"{"coding":[{"system":"http://loinc.org","code":"4548-4","display":"Hemoglobin A1c/Hemoglobin.total in Blood"}]}"#
def hemoglobinConcept : Json := json r#"{"coding":[{"system":"http://loinc.org","code":"718-7","display":"Hemoglobin [Mass/volume] in Blood"}]}"#
#guard labDisplayName creatinineConcept == "Creatinine"
#guard labDisplayName a1cConcept == "Hemoglobin A1c"
#guard labDisplayName hemoglobinConcept == "Hemoglobin"
#guard labDisplayName (creatinineConcept.setObjVal! "text" (.str "Point-of-care creatinine")) == "Point-of-care creatinine"
#guard labDisplayName (json r#"{"coding":[{"system":"http://loinc.org","code":"2160-0"}]}"#) == "Creatinine"
#guard labDisplayName (json r#"{"coding":[{"system":"local","code":"2160-0","display":"Creatinine [Mass/volume] in Serum or Plasma"}]}"#) == "Creatinine [Mass/volume] in Serum or Plasma"
#guard labDisplayName (json r#"{"coding":[{"system":"http://loinc.org","code":"unknown","display":"Creatinine [Mass/volume] in Serum or Plasma"}]}"#) == "Creatinine [Mass/volume] in Serum or Plasma"

/-- A short MDRD caption retains the reported value, indexed unit, time and flag. -/
def mdrdDisplayObservation : Json := json r#"{"resourceType":"Observation","status":"final","code":{"coding":[{"system":"http://loinc.org","code":"33914-3","display":"Glomerular filtration rate [Volume Rate/Area] in Serum or Plasma by Creatinine-based formula (MDRD)/1.73 sq M"}]},"effectiveDateTime":"2026-11-03T08:00:00Z","valueQuantity":{"value":58.2,"unit":"mL/min/{1.73_m2}"},"referenceRange":[{"low":{"value":60},"high":{"value":100}}],"interpretation":[{"coding":[{"code":"L"}]}]}"#
#guard (labPoint mdrdDisplayObservation).name == "eGFR (MDRD)"
#guard (labPoint mdrdDisplayObservation).code == "33914-3"
#guard (labPoint mdrdDisplayObservation).value == "58.2"
#guard (labPoint mdrdDisplayObservation).unit == "mL/min/{1.73_m2}"
#guard (labPoint mdrdDisplayObservation).date == "2026-11-03T08:00:00Z"
#guard (labPoint mdrdDisplayObservation).hundredths? == some 5820
#guard (labPoint mdrdDisplayObservation).range? == some (6000, 10000)
#guard (labPoint mdrdDisplayObservation).flagged

/-- A profile may supply HumanName.text without separate given/family parts. -/
def displayClinician : Json := json r#"{"resourceType":"Practitioner","id":"display-clinician","name":[{"use":"official","text":"Dr. Morgan Rivera"}]}"#
/-- Resource identity alone never becomes a displayed clinician name. -/
def unnamedClinician : Json := json r#"{"resourceType":"Practitioner","id":"opaque-clinician-id"}"#
#guard (clinicianRows [displayClinician]).map (·.name) == ["Dr. Morgan Rivera"]
#guard (clinicianRows [unnamedClinician]).isEmpty
#guard (clinicianRows [displayClinician.setObjVal! "resourceType" (.str "Patient")]).isEmpty
#guard (clinicianRows [displayClinician.setObjVal! "id" (.str "")]).isEmpty
#guard practitionerName (json r#"{"name":[{"family":"Rivera","given":["Morgan"]}]}"#) == "Rivera, Morgan"
#guard humanRef [displayClinician] (json r#"{"reference":"Practitioner/display-clinician"}"#) == "Dr. Morgan Rivera"
/-- Administrative gender does not stand in for the reference-population code. -/
def administrativeGenderOnlyExample : Json := json "{\"gender\":\"male\"}"
#guard growthReferenceSex administrativeGenderOnlyExample == none

/-- A recorded birth-sex extension selects the published boys' reference. -/
def recordedBirthSexExample : Json := json "{\"gender\":\"other\",\"extension\":[{\"url\":\"http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex\",\"valueCode\":\"M\"}]}"
#guard growthReferenceSex recordedBirthSexExample == some "M"

/-- Conflicting source codes never silently choose the first population. -/
def conflictingBirthSexExample : Json := json "{\"extension\":[{\"url\":\"http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex\",\"valueCode\":\"F\"},{\"url\":\"http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex\",\"valueCode\":\"M\"}]}"
#guard growthReferenceSex conflictingBirthSexExample == none

/-- Meter and inch readings convert before rounding to the growth axis unit. -/
def meterHeightExample : Json := json "{\"value\":1.75,\"code\":\"m\"}"
def inchHeightExample : Json := json "{\"value\":70,\"code\":\"[in_i]\"}"
def unlabelledHeightExample : Json := json "{\"value\":175}"
#guard heightCmTenths meterHeightExample == some 1750
#guard heightCmTenths inchHeightExample == some 1778
#guard heightCmTenths unlabelledHeightExample == none
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
#guard (periopRows.head!).indication == "Unknown"
/-- The case request carries its own indication, independent of chart problems. -/
def periopCholecystectomy : Json := (periopOrder.setObjVal! "code"
  (json r#"{"text":"Laparoscopic cholecystectomy"}"#)).setObjVal! "reasonCode"
  (json r#"[{"coding":[{"system":"http://hl7.org/fhir/sid/icd-10-cm","code":"K80.20","display":"Calculus of gallbladder without cholecystitis"}]}]"#)
#guard ((surgicalCaseRows context.today [periopCholecystectomy] periopPatient).head!).cells.lookup
  "Indication" == some "Calculus of gallbladder without cholecystitis"
#guard periopIndicationText (json r#"{"text":"symptomatic-cholelithiasis"}"#) == "Symptomatic cholelithiasis"
#guard periopIndicationText (json r#"{"text":"Unspecified abdominal pain"}"#) == "Unspecified abdominal pain"
#guard (surgicalCaseRows "2026-11-01" [periopOrder] periopPatient).isEmpty
#guard (surgicalConsultRows [periopConsult, periopOtherPatient] periopPatient).length == 1
/-- A request's authored time is not a due deadline. -/
def periopReceivedConsult := periopConsult.setObjVal! "authoredOn" (.str "2026-10-31T10:15:00Z")
#guard (surgicalConsultRows [periopReceivedConsult] periopPatient).head!.lookup "Received" ==
  some "2026-10-31T10:15:00Z"
#guard (surgicalConsultRows [periopReceivedConsult] periopPatient).head!.lookup "Due" == none
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
/-- Logical resource identity is not a medical record number. -/
def patientWithoutMrn : Json := json r#"{"resourceType":"Patient","id":"opaque-resource-id"}"#
#guard mrnOf patientWithoutMrn == ""
#guard patientIdOf patientWithoutMrn == "opaque-resource-id"

/-- The selected clinic is older than the ward stay, and remains the active context. -/
def selectedClinic : Json := json r#"{"resourceType":"Encounter","id":"selected-clinic","subject":{"reference":"Patient/periop-a"},"period":{"start":"2026-10-01"},"class":{"system":"http://terminology.hl7.org/CodeSystem/v3-ActCode","code":"AMB"},"reasonCode":[{"coding":[{"code":"K40.90"}]}]}"#
/-- A more recent encounter must remain in history without replacing selection. -/
def newerWard : Json := json r#"{"resourceType":"Encounter","id":"newer-ward","subject":{"reference":"Patient/periop-a"},"period":{"start":"2026-10-31"},"class":{"system":"http://terminology.hl7.org/CodeSystem/v3-ActCode","code":"IMP"},"reasonCode":[{"coding":[{"code":"R10.9"}]}]}"#
/-- Explicit source selection, without a role-derived episode kind. -/
def clinicContext : FactsContext := { context with encounterId? := some "selected-clinic" }
#guard (factsOf clinicContext [selectedClinic, newerWard] periopPatient).encounterKind? == some "ambulatory"
#guard (factsOf clinicContext [selectedClinic, newerWard] periopPatient).record.lookup "visitDiagnosis" == some "K40.90"
#guard (displayOf clinicContext [selectedClinic, newerWard] periopPatient).banner.encounterClass == "AMB"
#guard (displayOf clinicContext [selectedClinic, newerWard] periopPatient).encounters.length == 2
#guard (factsOf { clinicContext with encounterKind? := some "preop" }
  [selectedClinic, newerWard] periopPatient).encounterKind? == some "preop"
#guard encounterRecords context [selectedClinic, newerWard] periopPatient == [selectedClinic, newerWard]
#guard (factsOf { clinicContext with encounterId? := some "missing" }
  [selectedClinic, newerWard] periopPatient).encounterKind?.isNone
#guard (displayOf { clinicContext with encounterId? := some "missing" }
  [selectedClinic, newerWard] periopPatient).banner.encounterClass == ""
#guard (factsOf clinicContext [selectedClinic.setObjVal! "subject"
  (json r#"{"reference":"Patient/another-patient"}"#), newerWard] periopPatient).encounterKind?.isNone
#guard (factsOf clinicContext [selectedClinic.setObjVal! "class"
  (json r#"{"system":"unknown","code":"AMB"}"#)] periopPatient).encounterKind?.isNone
#guard parsed.display.banner.weight?.map (fun (weight, unit, _) => (weight, unit)) == parsed.facts.weightToday?
#guard (output emptyBundle).display.banner.weight? == none
#guard (bannerWeightOf "1900-01-01" (bundleResources clinical)) == none

/-- A visit clinician is not evidence of an assigned primary care provider. -/
def encounterProviderExample : Json := json r#"{"resourceType":"Encounter","participant":[{"individual":{"display":"Dr Visit"}}]}"#
def primaryCareProviderExample : Json := json r#"{"resourceType":"Practitioner","id":"assigned-pcp","name":[{"given":["Taylor"],"family":"Morgan"}]}"#
def assignedPatientExample : Json := patientWithoutMrn.setObjVal! "generalPractitioner"
  (json r#"[{"reference":"Practitioner/assigned-pcp"}]"#)
#guard (bannerOf context.today [encounterProviderExample] patientWithoutMrn).pcp == ""
#guard (bannerOf context.today [primaryCareProviderExample] assignedPatientExample).pcp == "Morgan, Taylor"

/-- Transaction-bundle URNs still resolve an explicitly assigned clinician. -/
def urnPrimaryCareExample : Json := primaryCareProviderExample.setObjVal! "id" (.str "urn:uuid:assigned-pcp")
#guard (bannerOf context.today [urnPrimaryCareExample] assignedPatientExample).pcp == "Morgan, Taylor"


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
/-- Same-time duplicate observations are distinct records, with their own units. -/
def clinicDuplicateLab : Json := (clinicLab.setObjVal! "id" (.str "duplicate-result")).setObjVal!
  "valueQuantity" (json r#"{"value":72,"unit":"mmol/mol"}"#)
#guard (Ambulatory.resultRows [clinicLab, clinicDuplicateLab]).length == 2
#guard (Ambulatory.resultRows [clinicDuplicateLab]).any (fun row =>
  row.lookup "value" == some "72" && row.lookup "unit" == some "mmol/mol")

/-- Censored and component results keep their source value rather than a scalar approximation. -/
def clinicPanelExample : Json := clinicLab.setObjVal! "component"
  (json r#"[{"code":{"text":"Urine protein"},"valueQuantity":{"value":5,"comparator":"<","unit":"mg/dL"}}]"#)
#guard (Ambulatory.resultRows [clinicPanelExample]).length == 2
#guard (Ambulatory.resultRows [clinicPanelExample]).any (fun row => row.lookup "value" == some "<5")

/-- The refill evidence view preserves ties and undated results; full history stays intact. -/
def clinicUndatedLab : Json := clinicLab.setObjVal! "effectiveDateTime" (.str "")
def clinicLatestLabs : List Json :=
  Ambulatory.latestResultSources [clinicPriorLab, clinicLab, clinicDuplicateLab, clinicUndatedLab]
#guard clinicLatestLabs.length == 3
#guard !clinicLatestLabs.contains clinicPriorLab
#guard clinicLatestLabs.contains clinicDuplicateLab && clinicLatestLabs.contains clinicUndatedLab
#guard (labResultRows [clinicPriorLab, clinicLab, clinicDuplicateLab, clinicUndatedLab]).length == 4

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
/-- A complete focused request supplies quantities, explicit zero refills and a resolved pharmacy. -/
def refillSourceExample : Json := json r#"{"resourceType":"MedicationRequest","id":"requested-rx","subject":{"reference":"Patient/clinic-patient"},"status":"active","medicationCodeableConcept":{"text":"lisinopril"},"dosageInstruction":[{"doseAndRate":[{"doseQuantity":{"value":10,"unit":"mg"}}]}],"dispenseRequest":{"quantity":{"value":30},"numberOfRepeatsAllowed":0,"performer":{"reference":"Organization/pharmacy"}}}"#
def refillPharmacyExample : Json := json r#"{"resourceType":"Organization","id":"pharmacy","name":"Main Street Pharmacy"}"#
def completeRefillTaskExample : Json := clinicRefill.setObjVal! "contained" (.arr #[refillSourceExample])
def refillComparisonExample := Ambulatory.refillComparisonRows [refillPharmacyExample] completeRefillTaskExample
#guard refillComparisonExample.length == 4
#guard refillComparisonExample.any (fun row => row.lookup "detail" == some "Dose" && row.lookup "requested" == some "10 mg" && row.lookup "current" == some "10 mg")
#guard refillComparisonExample.any (fun row => row.lookup "detail" == some "Refills" && row.lookup "requested" == some "0")
#guard refillComparisonExample.any (fun row => row.lookup "requested" == some "Main Street Pharmacy")
#guard refillComparisonExample.all (fun row => row.lookup "proposed" == some "Awaiting clinician entry")

/-- A missing unit and an explicitly different patient never supply assumed dose evidence. -/
def unitlessRefillDoseExample : Json := json r#"{"dosageInstruction":[{"doseAndRate":[{"doseQuantity":{"value":1}}]}]}"#
#guard Ambulatory.refillPrescriptionDetail [] unitlessRefillDoseExample "Dose" == "1 (unit not recorded)"
def otherPatientRefillExample : Json := refillSourceExample.setObjVal! "subject" (json r#"{"reference":"Patient/another-patient"}"#)
#guard (Ambulatory.refillMedication [] (clinicRefill.setObjVal! "contained" (.arr #[otherPatientRefillExample]))).isNone
#guard (Ambulatory.refillComparisonRows [] (clinicRefill.setObjVal! "focus" (json r#"{"reference":"MedicationRequest/missing"}"#))).isEmpty

/-- A draft only compares against its explicit prior prescription for this patient. -/
def draftRefillExample : Json := (refillSourceExample.setObjVal! "status" (.str "draft")).setObjVal!
  "priorPrescription" (json r#"{"reference":"MedicationRequest/prior-rx"}"#)
def priorRefillExample : Json := refillSourceExample.setObjVal! "id" (.str "prior-rx")
#guard Ambulatory.currentRefillPrescription [priorRefillExample] clinicRefill draftRefillExample == some priorRefillExample
#guard (Ambulatory.currentRefillPrescription [otherPatientRefillExample.setObjVal! "id" (.str "prior-rx")]
  clinicRefill (draftRefillExample.setObjVal! "subject" .null)).isNone

/-- A newer fill for another medication cannot supply this request's last-fill date. -/
def codedRefillExample : Json := refillSourceExample.setObjVal! "medicationCodeableConcept"
  (json r#"{"coding":[{"system":"http://www.nlm.nih.gov/research/umls/rxnorm","code":"29046"}]}"#)
def matchingFillExample : Json := json r#"{"resourceType":"MedicationDispense","subject":{"reference":"Patient/clinic-patient"},"status":"completed","whenHandedOver":"2026-09-01","medicationCodeableConcept":{"coding":[{"system":"http://www.nlm.nih.gov/research/umls/rxnorm","code":"29046"}]}}"#
def otherDrugFillExample : Json := (matchingFillExample.setObjVal! "whenHandedOver" (.str "2026-10-01")).setObjVal! "medicationCodeableConcept" (json r#"{"coding":[{"system":"http://www.nlm.nih.gov/research/umls/rxnorm","code":"different-drug"}]}"#)
#guard Ambulatory.refillLastFill [matchingFillExample, otherDrugFillExample] completeRefillTaskExample codedRefillExample == "2026-09-01"
#guard Ambulatory.refillLastFill [otherDrugFillExample] completeRefillTaskExample codedRefillExample == "Not recorded"
#guard Ambulatory.refillLastFill [matchingFillExample.setObjVal! "status" (.str "in-progress")] completeRefillTaskExample codedRefillExample == "Not recorded"

/-- The comparison satisfies its existing schema and ordinary patient/version binding. -/
def completeRefillFactsExample : Facts := factsOf context
  [clinicPatient, completeRefillTaskExample, refillPharmacyExample] clinicPatient
def refillComparisonContractExample :=
  (Ehr.Specs.ClinicalTables.infos.find? (·.id == "refillComparison")).bind (·.payload?)
#guard refillComparisonContractExample.any (fun contract =>
  (infoPayload completeRefillFactsExample "refillComparison").any (fun p => payloadComplete p contract))

/-- Every generated supporting view passes the ordinary patient/version binding. -/
def clinicFacts : Facts := factsOf context [clinicPatient, clinicAppointment, clinicRefill] clinicPatient
#guard (clinicFacts.infoPayloads?.getD []).all fun payload => (infoPayload clinicFacts payload.info).isSome
/-- Shared queue IDs select one source view; all views retain their ordinary binding. -/
def integratedPreopFactsExample : Facts := factsOf { context with encounterKind? := some "preop" }
  [periopPatient, periopOrder, periopConsent] periopPatient
#guard (integratedPreopFactsExample.infoPayloads?.getD []).all fun payload =>
  (infoPayload integratedPreopFactsExample payload.info).isSome
#guard (infoPayload integratedPreopFactsExample "scheduleTasks").any fun payload =>
  payload.rows.any fun row => row.fields.lookup "Procedure" == some "Laparoscopic appendectomy"
#guard (infoPayload clinicFacts "scheduleTasks").any fun payload =>
  payload.rows.any fun row => (row.fields.lookup "Visit type").isSome
#guard (labResultRow mdrdDisplayObservation).name == "eGFR (MDRD)"

/-- A complete department graph cannot contribute another patient's clinical facts. -/
def worldScopeGraphExample : Json := json r#"{"resourceType":"Bundle","entry":[{"resource":{"resourceType":"Patient","id":"other","name":[{"family":"Other"}]}},{"resource":{"resourceType":"AllergyIntolerance","id":"foreign-allergy","patient":{"reference":"Patient/other"},"code":{"text":"Penicillin"}}},{"resource":{"resourceType":"List","status":"current","date":"2026-10-31","code":{"coding":[{"code":"clinic-schedule"}]},"meta":{"tag":[{"system":"urn:vgi:world:realism","code":"P1"}]},"entry":[{"item":{"reference":"Appointment/appt-example"}}]}},{"resource":{"resourceType":"Appointment","id":"appt-example","start":"2026-10-31T08:00:00","participant":[{"actor":{"reference":"Patient/other"}}]}}]}"#
def worldScopeOutputExample : FactsOutput :=
  (runFacts { bundle := emptyBundle, context := { context with record := [("viewerPersona", "P1")] }, worldContext? := some worldScopeGraphExample }).toOption.getD { facts := default, display := .empty }
#guard worldScopeOutputExample.display.allergies.all (·.id != "foreign-allergy")
#guard (worldList { context with record := [("viewerPersona", "P1")] } (bundleResources worldScopeGraphExample) "clinic-schedule").any (·.length == 1)
#guard (worldList { context with record := [("viewerPersona", "P4")] } (bundleResources worldScopeGraphExample) "clinic-schedule").isNone
#guard (worldList { context with today := "2026-11-01", record := [("viewerPersona", "P1")] } (bundleResources worldScopeGraphExample) "clinic-schedule").isNone
/-- Exact SNOMED codes move while a similarly named non-SNOMED diagnosis stays. -/
def socialConditionExample : Json := json r#"{"resourceType":"Condition","code":{"coding":[{"system":"http://snomed.info/sct","code":"160903007","display":"Full-time employment"}]}}"#
#guard isSocialCondition socialConditionExample
#guard (historyRows [socialConditionExample]).any (·.kind == "Social history")
#guard !isSocialCondition (json r#"{"resourceType":"Condition","code":{"coding":[{"system":"http://hl7.org/fhir/sid/icd-10-cm","code":"F43.9","display":"Stress reaction"}]}}"#)

end Ehr.Render.Tests
