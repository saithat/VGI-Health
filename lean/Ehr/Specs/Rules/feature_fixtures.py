"""Emit explicit synthetic record witnesses for content walkthroughs.
These are test-only adapter inputs, never released prefills or production data.
The fixed timeline is reviewed here; it does not inspect the resulting spec.
"""
from datetime import datetime,timezone,timedelta
from pathlib import Path
import re
from feature_data import TEMP,PAT,VAL,EXP,DISPLAY,q
ROOT=Path(__file__).resolve().parents[4]
ls=lambda xs:'['+', '.join(xs)+']'
now=int(datetime(2026,10,31,17,tzinfo=timezone.utc).timestamp()/60)
risks=sorted({x for xs in [TEMP,PAT,VAL,EXP] for t in xs for x in re.findall(r'\.riskEquals "([^"]+)"',str(t))})
keys=sorted({t['key'] for t in TEMP}|{e['key'] for e in EXP}|{'clinical'}|{d['info'] for d in DISPLAY if 'info' in d})
events={}
# Explicit scenario timeline relative to 2026-10-31 17:00 UTC. Physical care and
# documentation are external witnesses. Old/stale duplicates are tested separately.
times={'sterilization.consent':now-50000,'sterilization.procedure':now-10,
       'delivery':now-2000,'abortion':now-2000,'discharge':now-1000,
       'summary.requested':now-1440,'access.requested':now-1440,
       'surgery.start':now-10,'hp.completed':now-30,'hp.filed':now-20,
       'hp.updateFiled':now-20,'admission':now-60,'nursing.processInitiated':now-60,'screening.recorded':now-30,
       'identity.verified':now-20,'site.verified':now-20,'side.verified':now-20,
       'surgicalConsent.filed':now-20,'intervalHp.recorded':now-20,'intervalHp.performed':now-30}
for t in TEMP:
 for event in [t['subject'],t['anchor']]:events[(t['key'],event)]=times.get(event,now-10)
chunks=['import Ehr.Canonical.Program\nimport Ehr.Core.Basics\n\n/-! Generated test-only record witnesses. These never ship as clinical facts.\nFixed timestamps, exact current identities and explicit synthetic outcomes. -/\nnamespace Ehr.Canonical.FeatureExamples\n',f'\n/-- Fixed UTC time: 2026-10-31 17:00. -/\ndef now : Int := {now}\n',
'\n/-- Named clinical risks absent in the ordinary outpatient scenario. -/\ndef baselineRisks : List String := '+ls([q(x) for x in risks])+'\n',
'\n/-- One trusted current clinical snapshot for this episode. -/\ndef observation (code : String) : ClinicalObservation :=\n  { code, artifactKey := "clinical", artifact := "fixture.clinical", version := 1 }\n',
'\n/-- Baseline ordinary service; eligibility walkthroughs override explicit facts. -/\ndef clinical (f : Facts) (overrides : List (String × String) := []) : ClinicalFacts :=\n  { age? := some { years := f.identity.ageYears, source := observation "age" }\n    service? := some (observation (if f.encounterKind? == some "preop" then "preop" else "routine"))\n    payer? := some (observation "commercial")\n    setting? := some (observation "outpatient")\n    homelessness? := some (observation "no")\n    pregnancy? := some (observation "no")\n    capacity? := some (observation "has-capacity")\n    consent? := some (observation "adult-self")\n    risks := baselineRisks.map fun key =>\n      (key, observation (((overrides.find? (·.1 == key)).map (·.2)).getD "no"))\n    testResults := [("HIV", observation "not-tested"), ("suicide-screen", observation "negative")] }\n',
'\n/-- Current artifact bindings, with one binding for each independent artifact. -/\ndef bindings : List ArtifactBinding := '+ls(['{ key := '+q(k)+', artifact := '+q('fixture.'+k)+', version := 1 }' for k in keys])+'\n',
'\n/-- Explicit trusted event evidence, distinct from typed UI attestations. -/\ndef events (f : Facts) : List EventEvidence :=\n  '+ls(['{ event := '+q(event)+', patient := f.patientId, episode := "fixture-episode", actor := "fixture-clinician", artifact := '+q('fixture.'+key)+', version := 1, time := '+str(time)+' }' for (key,event),time in sorted(events.items())])+'\n']
start=now//1440-100;end=now//1440+100
working=[d for d in range(start,end+1) if datetime.fromtimestamp(d*86400,timezone.utc).weekday()<5]
chunks.append('\n/-- Weekday calendar with explicit coverage (UTC hospital test zone). -/\ndef calendar : BusinessCalendar :=\n  { id := "hospital-CA", firstDay := '+str(start)+', lastDay := '+str(end)+', workingDays := '+ls(map(str,working))+' }\n')
issued=datetime(2026,10,31,16,50,tzinfo=timezone.utc)
cutoff=datetime(2027,4,30,16,50,tzinfo=timezone.utc)
def stamp(d):return '{ time := '+str(int(d.timestamp()/60))+f', year := {d.year}, month := {d.month}, day := {d.day}, minuteOfDay := {d.hour*60+d.minute}, utcOffsetMinutes := 0, zone := "UTC"'+' }'
chunks.append('\n/-- Original durable issue/start/first-fill stamp, ten minutes before now. -/\ndef issued : ClockStamp := '+stamp(issued)+'\n')
chunks.append('\n/-- Actual six-calendar-month anniversary, October 31 to April 30. -/\ndef sixMonthCutoff : ClockStamp := '+stamp(cutoff)+'\n')
chunks.append('\n/-- Independent durable orders, not UI-slot clocks. -/\ndef clocks (f : Facts) : List OrderClock :=\n  '+ls(['{ id := '+q('fixture.'+k)+', patient := f.patientId, issued, started? := some issued, firstFill? := some issued, monthCutoffs := [{ anchor := .issued, months := 6, stamp := sixMonthCutoff }] }' for k in sorted({e['key'] for e in EXP})])+'\n')
# Literal payload examples by clinical purpose, not placeholders generated from
# field names. Photos are explicitly unavailable for synthetic test patients.
payloads={
 'dsiSources':([('title','2026 clinical decision support reference'),('authors','Hospital clinical governance'),('publication','Local reference bibliography'),('year','2026'),('sourceUrl','https://example.org/synthetic-guideline')],[],[]),
 'careIdentity':([('name','Synthetic Patient'),('dateOfBirth','1968-02-29'),('mrn','SYN-001')],['patient'],[]),
 'groupedResultComponents':([],['patient'],[
   [('testId','metabolic-panel-1'),('component','Sodium'),('value','140'),('unit','mmol/L'),('referenceRange','135-145'),('abnormalFlag','normal')],
   [('testId','metabolic-panel-1'),('component','Potassium'),('value','5.6'),('unit','mmol/L'),('referenceRange','3.5-5.1'),('abnormalFlag','high')]]),
 'patientListIdentity':([],['patient'],[[('name','Synthetic Patient'),('dateOfBirth','1968-02-29'),('mrn','SYN-001')]]),
 'patientSearchWarning':([('similarNameWarning','No same or similar names in this synthetic search')],[],[]),
 'patientPhoto':([],['patient'],[]),
 'orderingWeight':([('weightKg','70.0'),('measuredAt','2026-10-31T16:45:00Z')],['patient'],[]),
}
fields=lambda fs:ls(['('+q(k)+', '+q(v)+')' for k,v in fs])
chunks.append('\n/-- Actual structured rows and fields; explicitly unavailable photo. -/\ndef payloads (f : Facts) : List InfoPayload :=\n '+ls(['{ info := '+q(info)+', patient := f.patientId, artifactKey := '+q(info)+', artifact := '+q('fixture.'+info)+', version := 1, fields := '+fields(fs)+', identifiers := '+ls(['{ category := .'+c+', system := "urn:synthea:patient", value := f.patientId }' for c in ids])+', availability := '+('[ ("photoUrl", false) ]' if info=='patientPhoto' else '[]')+', rows := '+ls(['{ id := '+q(info+'.'+str(n))+', slot := '+str(n)+', fields := '+fields(row)+' }' for n,row in enumerate(rows)])+' }' for info,(fs,ids,rows) in payloads.items()])+'\n')
chunks.append('''
/-- Versioned vocabularies supplied by the test terminology adapter. -/
def tables : List CodeTable :=
  [{ system := "urn:ietf:bcp:47-or-declined", version := "2026-10", codes := ["en", "es", "declined"] },
   { system := "formulation", version := "2026-10", codes := ["oral-liquid"] },
   { system := "dispense-frequency", version := "2026-10", codes := ["daily", "bid", "tid", "qid", "q4h", "q6h", "q8h", "q12h"] },
   { system := "oral-methotrexate-frequency", version := "2026-10", codes := ["weekly", "daily"] }]

/-- Enrich synthetic test facts with explicit external record inputs. -/
def withEvidence (f : Facts) : Facts :=
  { f with
    episodeId? := some "fixture-episode"
    epochMinute? := some now
    artifactBindings? := some bindings
    eventEvidence? := some (events f)
    calendars? := some [calendar]
    clinical? := some (clinical f)
    codeTables? := some tables
    orderClocks? := some (clocks f)
    infoPayloads? := some (payloads f)
    phase? := some { workflow := "shell", phase := "care" } }

/-- Separate, concrete eligible scenarios for the named legal pathways. -/
def forCommit (f : Facts) (commit : CommitId) : Facts :=
  let minor := ["authorizeIndependentMinorCare", "authorizeMinorMentalHealthCare", "authorizeMinorPsychotropic",
    "authorizeMinorAssaultCare", "authorizeMinorSubstanceCare", "authorizeMinorMoud"].contains commit
  let f := if minor then { f with identity := { f.identity with ageYears := 16 } }
    else if commit == "calculatePediatricDose" then
      { f with identity := { initials := "AL", sex := "F", ageYears := 6 }, weightToday? := some (200, .kg) }
    else f
  let overrides :=
    if commit == "authorizeSeclusion" then [("violentBehavior", "yes")]
    else if commit == "authorizeProcedureCuresExemption" then
      [("procedureRelatedTreatment", "yes"), ("curesListedFacility", "yes"), ("supplyAtMostSevenDays", "yes"), ("nonrefillable", "yes")]
    else if commit == "authorizeEdBuprenorphineCuresExemption" then [("buprenorphineContaining", "yes")]
    else if commit == "authorizeIndependentMinorCare" then [("livesSeparately", "yes"), ("managesOwnFinances", "yes")]
    else if commit == "authorizeMinorMentalHealthCare" then [("professionallyAssessedMaturity", "yes")]
    else if commit == "authorizeMinorMoud" then [("licensedNarcoticTreatmentProgram", "yes"), ("federalMinorMoudPermission", "yes")]
    else if commit == "dispenseUnusedEdPortion" then
      [("drugAcquiredByHospitalPharmacy", "yes"), ("unusedDrugOrderedForPatient", "yes"), ("unusedDrugAdministeredToPatient", "yes"),
       ("singlePatientMultidosePackage", "yes"), ("patientCanSelfAdminister", "yes"), ("unusedDrugRequiredForContinuation", "yes")]
    else if commit == "signScheduleIISeries" then [("statePermitsScheduleIISeries", "yes")]
    else []
  let cf := clinical f overrides
  let service := if commit == "authorizeIndependentMinorCare" then "medical"
    else if commit == "authorizeMinorMentalHealthCare" then "outpatient-mental-health"
    else if commit == "authorizeMinorAssaultCare" then "sexual-assault-related"
    else if commit == "authorizeMinorSubstanceCare" then "substance-care" else "routine"
  let cf := { cf with service? := some (observation service) }
  let cf := if commit == "recordSterilizationConsent" then
    { cf with capacity? := some (observation "understands-sterilization") } else cf
  let cf := if commit == "authorizeEdBuprenorphineCuresExemption" then
    { cf with setting? := some (observation "general-acute-hospital-ED") } else cf
  let cf := if commit == "authorizeMinorPsychotropic" then
    { cf with consent? := some (observation "parent-guardian") } else cf
  { f with clinical? := some cf }
end Ehr.Canonical.FeatureExamples
''')
(ROOT/'lean/Ehr/Canonical/FeatureExamples.lean').write_text(''.join(chunks))
