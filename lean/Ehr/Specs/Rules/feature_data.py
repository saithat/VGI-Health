"""Reviewed mappings for the five feature families (catalog remains source text).

Expressions below are the closed Lean AST, not executable predicate callbacks.
Named risks/tests are trusted, current-version record facts; unknown applies.
Vague statutory 'promptly/immediately' duties use a stricter zero-minute local
policy, explicitly recorded in generated docstrings and the catalog.
"""
import json
q = lambda s: json.dumps(s, ensure_ascii=False)
def risk(name, code='yes'): return f'.riskEquals {q(name)} {q(code)}'
def fact(name, code): return f'.factEquals .{name} {q(code)}'
def age(lo, hi):
    # Adult/lower-bound rules have no invented upper age limit.
    return f'.not (.ageBetween 0 {lo-1})' if hi == 150 else f'.ageBetween {lo} {hi}'
def both(*xs):
    if len(xs)==1: return xs[0]
    return f'.and ({xs[0]}) ({both(*xs[1:])})'
def either(a,b): return f'.or ({a}) ({b})'
def no(x): return f'.not ({x})'
TEMP=[]; PAT=[]; VAL=[]; EXP=[]; DISPLAY=[]; SKIP={}
def temporal(id, commit, subject, anchor, lo, hi, *, key=None, when=None, metric='.minutes', direction=None, deadline=None, note=''):
    TEMP.append(dict(id=id,commit=commit,subject=subject,anchor=anchor,lo=lo,hi=hi,key=key or commit,when=when,metric=metric,direction=direction,deadline=hi if deadline is None else deadline,note=note+' Numeric bounds not stated by the source are stricter local hospital policy, not statutory periods.'))
def patient(id, commit, element, label, *, when=None, legal=None, allowed=None, kind='.text', sample='Discussed with patient; documented plan and follow-up.', target='Observation.valueString'):
    PAT.append(dict(id=id,commit=commit,element=element,label=label,when=when,legal=legal,allowed=allowed,kind=kind,sample=sample,target=target))
def validation(id, element, expr, *, commit=None, label=None, kind='.text', sample='2026-10-31', when=None, default=None, note=''):
    VAL.append(dict(id=id,element=element,expr=expr,commit=commit,label=label or element,kind=kind,sample=sample,when=when,default=default,note=note))
def expiry(id,commit,key,anchor,duration,when=None,renew=None,reassess=None,maximum=None):
    EXP.append(dict(id=id,commit=commit,key=key,anchor=anchor,duration=duration,when=when,renew=renew,reassess=reassess,maximum=maximum))
# Temporal obligations. Separate completion/filing witnesses share the artifact.
temporal('cms-482.13-a1-rights-notice','recordRightsNotice','rights.informed','care.start',-43200,0,when=no(risk('rightsNoticeNotPossible')))
temporal('cms-482.13-e7-attending-consult','signRestraintOrder','restraint.attendingConsult','restraint.start',0,0,when=risk('restraintNotOrderedByAttending'),note='Hospital policy: as soon as possible means the same minute; source does not prescribe a numeric deadline.')
temporal('cms-482.13-e8ii-assessment-24h','signRestraintOrder','restraint.responsibleAssessment','restraint.newOrder',-60,0,when=risk('restraintBeyond24Hours'),note='Hospital policy: assessment must be within the hour preceding the new order after 24 hours.')
for id,subject in [('cms-482.13-e12-face-to-face-hour','restraint.faceToFace'),('cms-482.13-e16i-document-evaluation','restraint.evaluationDocumented')]:
    temporal(id,'recordRestraintEvaluation',subject,'restraint.start',0,60,when=risk('violentRestraint'))
temporal('cms-482.13-e14-rn-consult','recordRestraintEvaluation','restraint.rnConsult','restraint.faceToFace',0,0,when=risk('rnRestraintEvaluator'),note='Hospital policy: as soon as possible means the same minute.')
temporal('cms-482.24-c4viii-complete-30days','completeMedicalRecord','record.completed','discharge',0,43200)
for id,subject,anchor,lo,hi in [
 ('cms-482.24-c4iA-history-physical-timing','hp.completed','admission',-43200,1440),
 ('cms-482.24-c4iB-hp-update-timing','hp.updateFiled','admission',0,1440)]:
    temporal(id,'verifyPreoperativeRecord',subject,anchor,lo,hi,when=no(risk('qualifyingOutpatientAssessmentAlternative')))
    temporal(id,'verifyPreoperativeRecord','hp.filed' if 'iA-' in id else subject,'surgery.start',-43200,0,when=no(risk('qualifyingOutpatientAssessmentAlternative')))
temporal('cms-482.24-c4iA-history-physical-timing','verifyPreoperativeRecord','hp.filed','admission',-43200,1440,when=no(risk('qualifyingOutpatientAssessmentAlternative')))
for id in ['cms-482.51-b2-consent-before-surgery','ca-title22-70223-written-surgical-consent']:
    temporal(id,'verifyPreoperativeRecord','surgicalConsent.filed','surgery.start',-2628000,0,when=no(risk('direSurgicalEmergency')),note='Hospital policy caps the consent lookback at five years; lawful emergency is a separate documented path.')
temporal('cms-482.51-b6-immediate-report','signOpNote','operativeReport.writtenOrDictated','surgery.end',0,0,note='Hospital policy: immediately is the same recorded minute; later transcription/filing is a separate event.')
temporal('cms-482.52-b1-pre-48hours','signAnesthesiaRecord','preanesthesia.completed','surgery.start',-2880,0)
temporal('cms-482.52-b3-post-48hours','signPostAnesthesiaNote','postanesthesia.documented','surgery.end',0,2880)
for id,subject in [('ca-title22-70751-complete-two-weeks','record.completed'),('ca-title22-70751-authenticate-two-weeks','record.authenticated')]:
    temporal(id,'completeMedicalRecord',subject,'discharge',0,20160)
for id,sub,anc,hi in [
 ('ca-title22-70215-shift-assessment','nursing.assessmentDocumented','shift.start',720),
 ('ca-title22-70215-transfer-assessment','nursing.transferAssessment','transfer.received',0),
 ('ca-title22-70215-admission-nursing-process','nursing.processInitiated','admission',0)]:
    temporal(id,'chartAssessment' if 'shift-' in id else 'recordNursingTransition',sub,anc,0,hi,note='Hospital policy: maximum 12-hour shift; admission/transfer work is immediate in the recorded minute.')
for suffix,event in [('verify-identity','identity.verified'),('verify-site','site.verified'),('verify-side','side.verified')]:
    temporal('ca-title22-70223-'+suffix,'verifyPreoperativeRecord',event,'surgery.start',-1440,0,note='Hospital policy additionally limits verification lookback to 24 hours.')
temporal('ca-title22-70223-hp-24-hours','signOrders','intervalHp.recorded','surgery.start',-1440,0,when=both(fact('service','preop'),no(risk('direSurgicalEmergency'))))
temporal('ca-title22-70223-hp-24-hours','signOrders','intervalHp.performed','surgery.start',-1440,0,when=both(fact('service','preop'),no(risk('direSurgicalEmergency'))))
temporal('ca-title22-70223-screening-72-hours','verifyPreoperativeRecord','screening.recorded','surgery.start',-4320,0,when=no(risk('direSurgicalEmergency')))
for id,c,sub,anc,hi in [
 ('ca-title22-70263-verbal-prompt-record','recordVerbalOrder','verbalOrder.recorded','verbalOrder.given',0),
 ('ca-title22-70263-verbal-countersign-48h','recordVerbalOrder','verbalOrder.countersigned','verbalOrder.given',2880),
 ('ca-title22-70263-standing-signed','signStandingOrder','standingOrder.signed','standingOrder.initiated',0),
 ('ca-title22-70233-preinduction-review','signAnesthesiaRecord','preinduction.review','anesthesia.induction',0)]:
    temporal(id,c,sub,anc,0,hi,note='Hospital policy: promptly/immediately uses the same recorded minute where no numeric statutory period is specified.')
# Sterilization pathways use distinct eligibility evidence and separate consent/procedure actions.
ordinary=both(no(risk('sterilizationEmergencyAbdominal')),no(risk('sterilizationElectiveShortWait')))
for id,lo,hi,cond in [
 ('ca-title22-70707-1-sterilization-minimum-wait',43200,259200,ordinary),
 ('ca-title22-70707-1-sterilization-maximum-wait',0,259200,None),
 ('ca-title22-70707-1-sterilization-emergency-72h',4320,259200,risk('sterilizationEmergencyAbdominal')),
 ('ca-title22-70707-6-medi-cal-no-elective-short-wait',43200,259200,fact('payer','Medi-Cal'))]:
    temporal(id,'authorizeSterilization','sterilization.procedure','sterilization.consent',lo,hi,when=cond)
for id,anchor in [('ca-title22-70707-3-no-postpartum-24h','delivery'),('ca-title22-70707-3-no-postabortion-24h','abortion')]:
    temporal(id,'recordSterilizationConsent','sterilization.consent',anchor,1440,2628000,when=risk('recent'+anchor.title()),note='Hospital policy caps lookback at five years; the minimum 24-hour exclusion is preserved.')
temporal('ca-statutes-bpc-688-failure-reason','recordTransmissionFailure','transmissionFailure.reasonRecorded','transmissionFailure.ended',-43200,1,metric='.businessDays "hospital-CA"',direction='.either',note='One working-day deadline; a reason recorded during the failure is permitted.')
temporal('ca-statutes-hsc-11165-4-delegate-review-record','recordDelegatedCuresReview','cures.practitionerReviewed','prescription.issued',-1440,0)
for id,sub in [('ca-statutes-bpc-2290-5-telehealth-inform','telehealth.informed'),('ca-statutes-bpc-2290-5-telehealth-consent','telehealth.consented')]:
    temporal(id,'recordTelehealthConsent',sub,'telehealth.start',-43200,0,note='Hospital policy: re-establish consent in the preceding 30 days.')
temporal('ca-statutes-hsc-123130-summary-deadline','provideRecordSummary','summary.available','summary.requested',0,10,metric='.businessDays "hospital-CA"',direction='.after',note='Hospital policy uses the ordinary ten-working-day deadline even when a statutory extension might be available.')
for id,sub,anc in [('ca-statutes-prob-4731-record-directive','advanceDirective.recorded','advanceDirective.learned'),('ca-statutes-prob-4732-capacity-determination','capacity.recorded','capacity.learned')]:
    temporal(id,'recordAdvanceCareDecision',sub,anc,0,0,note='Hospital policy: promptly means the same recorded minute.')
SKIP['ca-statutes-civ-56-11-authorization-expiration']='TemporalReq compares two event timestamps, but cannot authorize a future release up to a civil-year expiration/date-or-event, evaluate revocation, or enforce requested-later/research exceptions. A deadline on documenting authorization would not enforce release access. Needs release-access-policy and civil-year/event expiry.'
temporal('federal-rx-1306-11-emergency-followup','signEmergencyRxFollowup','emergencyPrescription.delivered','emergencyPrescription.oralAuthorization',0,10080)
temporal('federal-rx-300aa-26-vis-before-dose','recordImmunization','vis.provided','vaccine.administered',-43200,0,note='Hospital policy additionally requires VIS provision within 30 days before this dose.')
temporal('federal-rx-164-524-access-deadline','completeAccessResponse','access.providedOrDenied','access.requested',0,43200,note='Hospital policy retains the ordinary 30-day deadline; does not use the extension.')
for suffix,event in [('team-agreement','timeout.identityAgreement'),('site-agreement','timeout.siteAgreement'),('procedure-agreement','timeout.procedureAgreement'),('performer-change','timeout.repeatedForPerformer')]:
    temporal('entrenched-npg-timeout-'+suffix,'verifySurgicalTimeout',event,'procedure.start',-1,0,when=risk('differentPerformer') if suffix=='performer-change' else None,note='Hospital policy: time-out in the minute immediately preceding the procedure.')
for id,c,sub,anc,lo,hi in [
 ('entrenched-npg-two-identifiers','verifyCareIdentity','identity.twoPersonIdentifiers','care.start',-1,0),
 ('entrenched-npg-site-mark-before-procedure','verifySurgicalTimeout','site.marked','procedure.start',-1440,0),
 ('entrenched-ismp-weight-measured','verifyEncounterWeight','weight.measured','encounter.start',0,1440),
 ('entrenched-ismp-weight-not-historical','verifyEncounterWeight','weight.measured','encounter.start',0,1440),
 ('entrenched-npg-pain-intervention-response','recordPainResponse','pain.responseDocumented','pain.intervention',0,60),
 ('entrenched-leapfrog-bcma-wrong-time','administerMed','medication.administered','medication.scheduled',-30,30)]:
    temporal(id,c,sub,anc,lo,hi,note='Hospital policy supplies the numeric encounter/response/due-time window; source supports the safety objective, not this exact number.')
for suffix,sub,anchor,lo,hi in [
 ('oximeter','oximeter.functionConfirmed','anesthesia.induction',-1,0),
 ('allergy','allergies.confirmed','anesthesia.induction',-1,0),
 ('airway','airway.assessed','anesthesia.induction',-1,0),
 ('blood-loss','bloodLoss.assessed','anesthesia.induction',-1,0),
 ('antibiotic','prophylaxis.administered','incision',-60,0),
 ('team','team.introduced','incision',-1,0),
 ('sterility','sterility.confirmed','incision',-1,0),
 ('imaging','essentialImaging.displayed','incision',-1,0),
 ('counts','instruments.countConfirmed','patient.leavesOR',-60,0),
 ('specimen','specimen.labelsReadAloud','patient.leavesOR',-60,0),
 ('sponge-count','sponges.countConfirmed','patient.leavesOR',-60,0),
 ('needle-count','needles.countConfirmed','patient.leavesOR',-60,0)]:
    temporal('entrenched-who-'+suffix,'verifySurgicalChecklist',sub,anchor,lo,hi,when=risk('prophylaxisIndicated') if suffix=='antibiotic' else risk('essentialImagingRequired') if suffix=='imaging' else None,note='Hospital policy: checks in the preceding minute; counts/specimens within the preceding hour. Prophylaxis retains the source 60-minute window.')
# Predicate rules. Prohibited branches require an impossible allowed-value set;
# each has a separate non-treatment/refusal route, not a forced affirmative consent.
patient('cms-482.13-b2-treatment-refusal','recordTreatmentDecision','treatmentDecision','Treatment accepted or refused',allowed=['accepted','refused'],kind='.coded "treatment-decision"',sample='refused',target='Consent.provision.type')
patient('ca-title22-70707-treatment-refusal','recordTreatmentDecision','treatmentDecision','Treatment accepted or refused',allowed=['accepted','refused'],kind='.coded "treatment-decision"',sample='refused',target='Consent.provision.type')
patient('cms-482.13-b3-advance-directives','recordTreatmentDecision','advanceDirectivePlan','Plan consistent with applicable advance directive',when=risk('advanceDirectiveApplies'))
patient('cms-482.13-e1ii-seclusion-violent-only','authorizeSeclusion','seclusionIndication','Seclusion requires violent or self-destructive behavior',legal=either(risk('violentBehavior'),risk('selfDestructiveBehavior')),kind='.flag',sample='true')
patient('cms-482.13-e3-least-restrictive','signRestraintOrder','leastRestrictiveRationale','Individualized least restrictive effective intervention')
for suffix,element,label,cond in [
 ('d3-treatment-refusal-record','refusedEmergencyCare','What was refused; offered care, risks and benefits explained',risk('emergencyCareRefused')),
 ('e1iiB-transfer-certification','unstableTransferCertification','Signed benefit-over-risk certification and risks/benefits summary',risk('unstableCertifiedTransfer')),
 ('e2iiB-receiving-acceptance','receivingFacilityAcceptance','Receiving facility acceptance and treatment agreement',risk('emtalaTransfer'))]:
    patient('cms-489.24-'+suffix,'disposition',element,label,when=cond)
patient('ca-title22-70263-bedside-controlled-ban','authorizeBedsideMedication','bedsideStoragePermitted','No Schedule II, III or IV bedside storage',legal=no(risk('bedsideScheduleIItoIV')),kind='.flag',sample='true')
patient('ca-title22-70537-pediatric-over13','authorizePediatricBed','pediatricBedApproval','Pediatrician approval and unusual-circumstances reason',when=age(14,150))
patient('ca-title22-70547-newborn-oxygen-order','signNewbornOxygenOrder','newbornWrittenOxygenOrder','Written physician oxygen order',kind='.flag',sample='true',target='ServiceRequest.intent')
for id,legal in [
 ('ca-title22-70707-1-sterilization-understanding',fact('capacity','understands-sterilization')),
 ('ca-title22-70707-6-medi-cal-sterilization-age',either(no(fact('payer','Medi-Cal')),age(21,150))),
 ('ca-title22-70707-3-no-labor',no(risk('inLabor'))),
 ('ca-title22-70707-3-no-impaired-consent',no(risk('substanceImpairedAwareness')))]:
    patient(id,'recordSterilizationConsent','sterilizationConsentEligible','Sterilization consent eligibility',legal=legal,kind='.flag',sample='true')
patient('ca-title22-70707-3-sterilization-interpreter','recordSterilizationConsent','sterilizationInterpreter','Interpreter for form or spoken language not understood',when=risk('sterilizationInterpreterNeeded'))
patient('ca-statutes-hsc-11165-4-procedure-seven-day','authorizeProcedureCuresExemption','procedureCuresEligibility','Procedure treatment at listed facility; nonrefillable supply at most 7 days',legal=both(risk('procedureRelatedTreatment'),risk('curesListedFacility'),risk('supplyAtMostSevenDays'),risk('nonrefillable')),kind='.flag',sample='true')
patient('ca-statutes-hsc-11165-4-ed-buprenorphine','authorizeEdBuprenorphineCuresExemption','edBuprenorphineEligibility','Buprenorphine at general acute hospital ED',legal=both(fact('setting','general-acute-hospital-ED'),risk('buprenorphineContaining')),kind='.flag',sample='true')
patient('ca-statutes-bpc-741-overdose-risk','signOrders','naloxoneOffer','Offer reversal-agent prescription for increased overdose risk',when=risk('section741IncreasedOverdoseRisk'),kind='.coded "naloxone-offer"',sample='offered-declined')
patient('ca-statutes-bpc-741-caregiver-education','signOrders','caregiverOverdoseEducation','Patient-designated person or minor guardian education / lawful outcome',when=risk('section741CaregiverEducationApplies'),allowed=['provided','declined','educatedWithin24Months'],kind='.coded "education-outcome"',sample='provided')
patient('ca-statutes-hsc-120990-hiv-right-decline','authorizeHivTest','hivRightToDeclineExplained','Right to decline explained before provider-initiated HIV test',when=no(risk('independentlyRequestedHivTest')),kind='.flag',sample='true')
patient('ca-statutes-hsc-120990-hiv-declination','recordHivDecision','hivTestDecision','HIV test accepted or declined; record decline',allowed=['accepted','declined'],kind='.coded "hiv-decision"',sample='declined',target='Consent.provision.type')
for id,el,label,cond in [
 ('ca-statutes-hsc-120990-positive-hiv-followup','hivPositiveFollowup','Recommended tests/care and medical/psychological contacts', '.testEquals "HIV" "positive"'),
 ('ca-statutes-hsc-120990-negative-hiv-retest','hivNegativeRetest','Periodic retesting advice',both('.testEquals "HIV" "negative"',risk('hivHighRisk'))),
 ('ca-statutes-hsc-120990-negative-hiv-prevention','hivPreventionAdvice','Prevention/risk reduction including PrEP and PEP',both('.testEquals "HIV" "negative"',risk('hivHighRisk')))]:
    patient(id,'ackResult',el,label,when=cond)
for id,c,legal in [
 ('ca-statutes-fam-6922-independent-minor','authorizeIndependentMinorCare',both(age(15,17),risk('livesSeparately'),risk('managesOwnFinances'),either(fact('service','medical'),either(fact('service','vision'),fact('service','dental'))))),
 ('ca-statutes-fam-6924-mental-health-consent','authorizeMinorMentalHealthCare',both(age(12,17),fact('service','outpatient-mental-health'),risk('professionallyAssessedMaturity'))),
 ('ca-statutes-fam-6924-psychotropic-exclusion','authorizeMinorPsychotropic',either(fact('consent','parent-guardian'),risk('separatePsychotropicLegalAuthority'))),
 ('ca-statutes-fam-6928-assault-care-consent','authorizeMinorAssaultCare',both(age(0,17),fact('service','sexual-assault-related'))),
 ('ca-statutes-fam-6929-substance-care-consent','authorizeMinorSubstanceCare',both(age(12,17),fact('service','substance-care'),no(risk('replacementNarcoticTherapy')))),
 ('ca-statutes-fam-6929-minor-moud-sixteen','authorizeMinorMoud',both(age(16,17),risk('licensedNarcoticTreatmentProgram'),risk('federalMinorMoudPermission')))]:
    patient(id,c,'minorConsentDecision','Minor self-consent authority verified for this service',legal=legal,kind='.flag',sample='true',target='Consent.verification')
SKIP['ca-statutes-fam-6929-parent-initiated-disclosure']='Clinical predicates can scope UI requirements but cannot enforce requester identity, disclosure destinations or independently applicable federal confidentiality law. Requires release-access-policy; a disclosure checkbox would not enforce it.'
SKIP['ca-statutes-hsc-123115-protected-minor-proxy']='ClinicalPredicate can identify age/service/capacity but cannot filter record resources returned to a proxy or authorize that proxy. Requires release-access-policy over resource and requester identities.'
for suffix,el,label,extra in [
 ('stability','homelessClinicalStability','Treating physician stability and orientation to person/place/time',None),
 ('meal','homelessMealOffer','Meal offered or medically indicated withholding',None),
 ('clothing','homelessClothingOffer','Weather-appropriate clothing offered',risk('clothingInadequate')),
 ('followup','homelessFollowupReferral','Medically necessary follow-up referral',risk('followupMedicallyNecessary')),
 ('prescription','homelessPrescription','Needed prescription provided',risk('prescriptionNeeded')),
 ('medication-supply','homelessMedicationSupply','Available necessary supply from licensed staffed onsite pharmacy',both(risk('onsiteOutpatientPharmacy'),risk('necessaryMedicationAvailable'))),
 ('infection-screen','homelessInfectionScreen','Regional infection screening offered or referred',None),
 ('vaccination','homelessVaccinationOffer','Appropriate vaccinations offered',None),
 ('behavioral-followup','homelessBehavioralFollowup','Indicated behavioral treatment or referral',risk('behavioralFollowupNeeded')),
 ('insurance','homelessInsuranceAssistance','Eligibility screening and enrollment assistance',None),
 ('transport','homelessTransportOffer','Transportation offered to identified destination',either(risk('destinationWithin30Miles'),risk('destinationWithin30Minutes'))),
 ('log','homelessDischargeLog','Discharge destination and protocol-completion log',None)]:
    patient('ca-statutes-hsc-1262-5-homeless-'+suffix,'discharge',el,label,when=both(fact('homelessness','yes'),extra) if extra else fact('homelessness','yes'))
patient('ca-statutes-wic-5150-advisement-good-cause','recordHoldAdvisement','holdAdvisementGoodCause','Specific good cause for incomplete advisement',when=no(risk('holdAdvisementCompleted')))
patient('ca-statutes-hsc-125000-newborn-religious-objection','recordNewbornScreenDecision','newbornScreenDecision','Screen performed or parent/guardian religious objection',allowed=['performed','religiousObjection'],kind='.coded "newborn-screen-decision"',sample='religiousObjection',target='Observation.dataAbsentReason')
for suffix,legal in [
 ('noncontrolled',both(no(risk('unusedDrugControlled')),risk('drugAcquiredByHospitalPharmacy'))),
 ('administered',both(risk('unusedDrugOrderedForPatient'),risk('unusedDrugAdministeredToPatient'))),
 ('packaging',both(risk('singlePatientMultidosePackage'),risk('patientCanSelfAdminister'))),
 ('continuation',risk('unusedDrugRequiredForContinuation'))]:
    patient('ca-statutes-bpc-4068-unused-ed-'+suffix,'dispenseUnusedEdPortion','unusedEdPortionEligibility','Unused ED portion eligibility',legal=legal,kind='.flag',sample='true')
patient('federal-rx-1306-05-institution-code','signOrders','institutionDeaInternalCode','Hospital DEA registration and assigned practitioner internal code',when=risk('institutionalDeaExemption'))
patient('federal-rx-1306-12-state-permission','signScheduleIISeries','seriesStatePermission','Applicable state permits multiple Schedule II prescription series',legal=risk('statePermitsScheduleIISeries'),kind='.flag',sample='true')
patient('entrenched-npg-suicide-screen','signSuicideRiskAssessment','validatedSuicideScreen','Validated screening tool and result',when=risk('suicideScreenEligible'))
patient('entrenched-npg-suicide-intent','signSuicideRiskAssessment','suicidalIntentAssessment','Direct suicidal intent assessment',when=either('.testEquals "suicide-screen" "positive"',risk('suicidalIdeation')))
for suffix,r in [('weight-growth-outlier','pediatricGrowthCurveOutlier'),('weight-change-alert','significantWeightChange')]:
    PAT.append(dict(id='entrenched-ismp-'+suffix,commit='verifyEncounterWeight',alert=r,when=risk(r)))
patient('entrenched-tjc-pain-alternative-tools','recordPainResponse','alternativePainAssessment','Validated alternative assessment when self-report unsuitable',when=no(risk('painSelfReportSuitable')))
patient('entrenched-tjc-opioid-high-risk-monitoring','chartAssessment','highRiskOpioidMonitoring','Appropriate high-risk opioid monitoring and findings',when=risk('highRiskOpioidPatient'))
# Validation. Preserve existing kinds; new lexical inputs/outputs are distinct.
for id,c in [('ca-statutes-hsc-11158-direct-72-hour','authorizeDirectDispensing'),('ca-statutes-hsc-11158-oud-three-day','authorizeOudDirectDispensing')]:
    validation(id,'directSupplyDays','.and (.supplyDaysCeil "dispenseQuantity" "dispenseDose" "dispenseFrequency") (.quantityRange .none 0 30)',commit=c,kind='.quantity .none',sample='3',label='Calculated days supplied (maximum three days)')
validation('federal-rx-1306-11-emergency-quantity','emergencySupplyDays','.supplyDaysCeil "dispenseQuantity" "dispenseDose" "dispenseFrequency"',commit='authorizeEmergencyOralRx',kind='.quantity .none',sample='1',note='Arithmetic alone cannot determine the clinically adequate emergency period; separate trusted period and quantity relation still needed.')
SKIP['federal-rx-1306-11-emergency-quantity']='supplyDaysCeil computes days supplied, but Validation has no comparison to a patient-specific emergency-period duration. An arbitrary fixed ceiling would misstate the emergency rule. Needs bounded relational comparison to trusted emergency-period evidence.'
VAL[:]=[x for x in VAL if x['id'] not in SKIP]
validation('federal-rx-170-315-preferred-language','preferredLanguage','.codeMember "urn:ietf:bcp:47-or-declined" "2026-10"',commit='updateDemographics',kind='.coded "language-or-declined"',sample='en',label='Preferred language or declined',note='Trusted table contains the required language vocabulary plus an explicit declined code; persistence/change/access is adapter work.')
validation('federal-rx-170-315-birth-date','birthDate','.isoDate',commit='updateDemographics',sample='1968-02-29',label='Date of birth',note='Record/change/access persistence remains adapter work.')
for suffix in ['lot','serial','expiry']:
    SKIP['federal-rx-170-315-implant-'+suffix]='udiGs1 validates a supported UDI string but exposes no parser output/extraction into lot, serial or expiration fields. Other issuer formats need trusted product tables. Accepting a valid UDI is not the required production-identifier parsing capability; needs a typed parser/projection and persistence binding.'
validation('federal-rx-170-315-oral-liquids-ml','oralLiquidDose','.formulationUnit "liquidFormulation" [("oral-liquid", .mL)]',commit='signOralLiquidPrescription',kind='.quantity .mL',sample='5',label='Oral liquid dose (mL)')
for id in ['federal-rx-170-315-erx-leading-zero','federal-rx-170-315-erx-no-trailing-zero','entrenched-ismp-abbrev-leading-zero','entrenched-ismp-abbrev-trailing-zero']:
    validation(id,'prescribedAmountText','.decimal 3 false false',commit='signFormattedPrescription',sample='0.5',label='Prescription amount (exact decimal text)',note='This lexical amount is required on the dedicated prescription action and its output contract; the ordinary mg quantity retains its old unit and precision.')
SKIP['entrenched-ismp-dosing-weight-category']='The AST can restrict kg ranges but cannot select wet/dry/dosing weight by indication, fluid status and precedence or attest the selected source. A category enum would not define the required selection rules.'
SKIP['entrenched-leapfrog-bcma-wrong-dose']='Validation has no scanned-product-strength times administered-count comparison against the active administration order. drug-name scan matching is not dose matching. Requires product identity/strength relational validation.'
validation('entrenched-ismp-mtx-weekly','oralMethotrexateFrequency','.codeMember "oral-methotrexate-frequency" "2026-10"',commit='signOralMethotrexate',kind='.coded "oral-mtx-frequency"',sample='weekly',default='weekly',label='Oral methotrexate frequency (weekly default)')
patient('entrenched-ismp-mtx-daily-indication','signOralMethotrexate','dailyMethotrexateOncologyVerification','Appropriate oncology indication verified for daily oral methotrexate',when='.capturedCode "oralMethotrexateFrequency" 0 "daily"',kind='.flag',sample='true')
for suffix in ['prohibited-list','iu','qd','qod','cc','microgram','dc','units','ms','mso4','mgso4']:
    id='entrenched-tjc-'+suffix if suffix=='prohibited-list' else 'entrenched-ismp-abbrev-'+suffix
    SKIP[id]='Validation.token constrains a whole-string alphabet/length, not forbidden tokens, case/punctuation variants or context-sensitive abbreviation replacement across narratives and rendered medication communication. A vocabulary on an additional field would leave existing text unprotected; needs token-aware text/output validation.'
for suffix in ['allergy-synonyms','environmental-allergy']:
    SKIP['entrenched-safer-'+suffix]='codeMember validates exact membership but cannot normalize synonym aliases or route environmental allergens into Condition rather than AllergyIntolerance. Needs terminology normalization and category-specific record routing.'
validation('entrenched-safer-pediatric-calculator','calculatedPediatricDose','.doseByWeight "weight" 450 20000 .mg',commit='calculatePediatricDose',kind='.quantity .mg',sample='900',label='Amoxicillin per-dose calculation (45 mg/kg, maximum 2000 mg)',note='Explicit supported regimen: amoxicillin 45 mg/kg per dose capped at 2000 mg. Other drugs/regimens require separate reviewed coefficients, never inferred from this one.')
for suffix,reason in [
 ('pediatric-dose-rounding','Fixed tenths and decimal lexical validation cannot implement weight-dependent rounding precision below 0.1 units.'),
 ('pediatric-concentration','No validated concentration-to-volume relation or available-product selection exists; membership alone does not calculate a safe volume.'),
 ('maximum-daily-dose','doseByWeight caps one dose, not the sum of dose times frequency across all active/new administrations. Requires daily aggregate arithmetic with product/unit normalization.')]:
    SKIP['entrenched-safer-'+suffix]=reason
# Durable expiry: age bands fail closed independently; stop/release stays available.
for id,lo,hi,mins in [('cms-482.13-e8iA-adult-four-hours',18,150,240),('cms-482.13-e8iB-age9-17-two-hours',9,17,120),('cms-482.13-e8iC-under9-one-hour',0,8,60)]:
    expiry(id,'continueViolentRestraint','violentRestraint','started',f'.minutes {mins}',when=age(lo,hi),renew=('restraint.renewed',mins),maximum=1440)
SKIP['cms-482.25-b5-automatic-stop']='ExpiryReq blocks actions for a known durable order, but cannot choose policy-dependent defaults when duration/dose-count is absent or run an automatic-stop scheduler. A fixed expiry on a new manual action would not implement this source rule. Needs default-policy selection plus backend auto-stop scheduling.'
expiry('ca-title22-70547-newborn-oxygen-24h','continueNewbornOxygen','newbornOxygen','issued','.minutes 1440',renew=('oxygen.reassessed',1440))
expiry('ca-statutes-wic-5150-hold-start','continue5150Hold','detention','started','.minutes 4320',maximum=4320)
for id,c,key,anchor,duration in [
 ('federal-rx-1306-22-six-months','dispenseScheduleIIItoV','scheduleIIItoVRx','issued','.calendarMonths 6'),
 ('federal-rx-1306-23-partial-expiry','partialFillScheduleIIItoV','scheduleIIItoVRx','issued','.calendarMonths 6'),
 ('federal-rx-1306-13-shortage-72h','completeScheduleIIShortage','scheduleIIRx','firstFill','.minutes 4320'),
 ('federal-rx-1306-13-request-30d','completeScheduleIIPatientPartial','scheduleIIRx','issued','.minutes 43200'),
 ('federal-rx-1306-13-request-emergency-72h','completeEmergencyScheduleIIPartial','emergencyScheduleIIRx','issued','.minutes 4320')]:
    expiry(id,c,key,anchor,duration)
# Structured contracts. Field names have clinical meaning; adapter supplies data.
def display(id,info,label,fields,identifiers,scope,rows=(),group=None,selection=None,when=None):
    DISPLAY.append(dict(id=id,info=info,label=label,fields=fields,identifiers=identifiers,scope=scope,rows=list(rows),group=group,selection=selection,when=when))
DISPLAY.append(dict(id='federal-rx-1311-140-label-sign',actionLabel='Sign prescriptions'))
display('federal-rx-170-315-dsi-source-citation','dsiSources','Decision support sources',['title','authors','publication','year','sourceUrl'],[],'.phase "W1" "decision-support"')
display('entrenched-npg-id-no-room','careIdentity','Person-specific care identifiers',['name','dateOfBirth','mrn'],['patient'],'.commit "verifyCareIdentity"')
display('entrenched-safer-result-components-together','groupedResultComponents','Complete grouped result components',[],['patient'],'.commit "ackResult"',rows=['testId','component','value','unit','referenceRange','abnormalFlag'],group='testId')
display('entrenched-safer-patient-list-identifiers','patientListIdentity','Patient list: identity and selection',[],['patient'],'.phase "shell" "patient-selection"',rows=['name','dateOfBirth','mrn'])
display('entrenched-safer-patient-list-selection','patientListIdentity','Patient list: identity and selection',[],['patient'],'.phase "shell" "patient-selection"',rows=['name','dateOfBirth','mrn'],selection='patientSelected')
display('entrenched-safer-patient-name-collision','patientSearchWarning','Patient search identity warning',['similarNameWarning'],[],'.phase "shell" "patient-selection"')
for suffix in ['banner','mobile']:
    display('entrenched-safer-patient-photo-'+suffix,'patientPhoto','Patient photograph',[('photoUrl',True)],['patient'],'.phase "shell" "care"')
for w in ['W1','W3','W5','W6','W7']:
    display('entrenched-safer-visible-weight','orderingWeight','Current patient weight',['weightKg','measuredAt'],['patient'],f'.phase "{w}" "order-entry"')

# Non-treatment routes remain independently completable after a deadline or
# failed eligibility decision. No continuation/dispensing exception is added.
for id,c,e,label in [
 ('cms-482.13-e8iA-adult-four-hours','recordRestraintRelease','restraintReleasePlan','Release restraint; document safety and observation plan'),
 ('ca-statutes-wic-5150-hold-start','recordDetentionRelease','detentionReleasePlan','Release or route to separate lawful authority; record disposition'),
 ('ca-title22-70547-newborn-oxygen-24h','recordOxygenStop','oxygenStopPlan','Stop expired oxygen order; document assessment and escalation'),
 ('federal-rx-1306-22-six-months','recordPrescriptionExpiryDecision','expiredPrescriptionPlan','Do not dispense expired prescription; request a new prescription')]:
    patient(id,c,e,label)
