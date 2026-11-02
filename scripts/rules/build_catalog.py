#!/usr/bin/env python3
"""Reviewed rule decisions and deterministic catalog/plan generation.

Run from the repository root. Numeric keys below refer to the checked-in
research arrays; title snapshots in catalog.json make their meaning reviewable.
Every eligible source must receive an explicit decision; there is no fallback.
Use --profile-note-only to annotate the reviewed catalog without replacing
encoding metadata supplied by the later encoding passes.
"""
import collections
import copy
import hashlib
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[2]
RULES = ROOT / 'docs/rules'
PRESCRIBERS = ['physician', 'np', 'surgeon']
ALL = PRESCRIBERS + ['rn']
DECISIONS = {}
SOURCE_HASHES = {
    'cms': 'bd621fbb14c7aa83b6d6df105a2eff268bc8113bee456d1dbd95f0510e99b051',
    'ca-title22': 'fa7ff56c349b51183c78a524db0e8253464a188be1858538ec4b95801c737d68',
    'ca-statutes': 'a5fadcf8fbacb9b83c6d75d71ef53d6ce16c94ff6ec8761ae1462af90c77883d',
    'federal-rx': '2c8c9e8362737e72a149566f337b548a8f7cd021fefa96938f3f67f13e55327b',
    'entrenched': '6369ee63d926b74653496e4cf44683b6c9705d002539881daaee75841d52d8ec',
    'guidance': '6369ee63d926b74653496e4cf44683b6c9705d002539881daaee75841d52d8ec',
}


def put(area, indices, fit, reason, **kwargs):
    if isinstance(indices, int):
        indices = [indices]
    for i in indices:
        assert (area, i) not in DECISIONS, (area, i)
        DECISIONS[area, i] = dict(fit=fit, fitReason=reason, **copy.deepcopy(kwargs))


def core(area, indices, group, reason):
    put(area, indices, 'core-feature:' + group, reason)


def out(area, indices, reason):
    put(area, indices, 'out-of-scope', reason)


def existing(area, i, items, reason='V1 already requires this capture or human action at the named commit; this is an abstract UI guarantee, not independent verification of clinical truth or backend persistence.'):
    put(area, i, 'existing', reason, existingSpecItems=items)


def data(area, i, element, commit, screen, *, kind='coded', value_set='nonempty-narrative',
         unit=None, roles=None, prefill='never', friction='compliance', human=False,
         when='always', per_line=False, allowed=None, target=None, note=None):
    roles = roles or (['rn'] if commit == 'chartAssessment' or commit == 'administerMed' else
                      ['surgeon'] if commit == 'signOpNote' else
                      ['np', 'physician', 'rn'] if commit == 'recordImmunization' else PRESCRIBERS)
    put(area, i, 'spec-data', note or 'Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed.',
        proposedEncoding={
            'elements': [dict(id=element, kind=kind, unit=unit,
                              valueSet=value_set if kind == 'coded' else None,
                              enteredBy=roles, prefill=prefill, friction=friction,
                              humanOnly=human, linkedFrom=None, recordFact=None,
                              fhirTarget=target or 'Composition.section[' + element + '].text')],
            'infos': [], 'commits': [dict(id=commit, roles=roles)],
            'entries': [dict(commit=commit, element=element, when=when,
                             perOrderLine=per_line, allowed=allowed)],
            'reviews': [], 'alerts': [], 'windowMin': None, 'waivedBy': None,
            'placement': [{'screen': s, 'workflow': 'W' + s[1],
                           'location': 'Expanded section immediately above ' + commit + '; field uses the current order slot.' if per_line else
                                       'Expanded documentation section before ' + commit + '.'} for s in screen.split()],
        })


# CMS: binding rows only. Interpretive/manual-only rows 84–88 and 92–104
# have binding=false and no entrenched basis, so must not be promoted.
core('cms', 0, 'event-time-window', 'Notice must precede furnishing/discontinuing care whenever possible; a sign-note checkbox cannot establish that event order.')
core('cms', [1, 2, 3, 4], 'patient-predicate', 'Requires patient/refusal/directive or restraint clinical eligibility and branching; existing When has none of these predicates.')
data('cms', 5, 'restraintCarePlanChange', 'signRestraintOrder', 'w3Restraint w4Restraint', note='New scoped restraint-order commit requires the written care-plan change; .always applies to this artifact, not to every medication order.')
core('cms', 6, 'qualified-authorization', 'Responsible practitioner, state authority and restraint privileges are not represented by the four coarse Role constructors.')
data('cms', 7, 'restraintOrderMode', 'signRestraintOrder', 'w3Restraint w4Restraint', value_set='restraint-order-mode', allowed=['oneTime'], note='Require oneTime on the dedicated restraint-order artifact. The new commit must be the only canonical issuer of restraint orders; ordinary medication signOrders never emits them.')
data('cms', 8, 'restraintPrn', 'signRestraintOrder', 'w3Restraint w4Restraint', kind='flag', allowed=['false'], note='Use a coded value rather than flag false: flags must be checked to satisfy a normal entry. See postprocessing correction to coded no-prn.')
core('cms', [9, 13, 16, 17, 18], 'event-time-window', 'Needs restraint start/evaluation/consultation anchors and deadlines; a receipt age is not an event-relative deadline.')
core('cms', [10, 11, 12], 'order-expiry-clock', 'Needs age-banded violent-restraint order expiration, renewal and elapsed-time blocking; receipt windows do not expire orders.')
out('cms', [14, 15], 'Actual timely discontinuation and physical monitoring are care-delivery duties; the UI cannot verify they occurred.')
for i, e in {19:'restraintBehavior', 20:'restraintIntervention', 21:'restraintAlternatives', 22:'restraintCondition', 23:'restraintResponse', 24:'restraintContinuationReason'}.items():
    data('cms', i, e, 'chartRestraintEpisode', 'w3Restraint w4Restraint', roles=ALL, note='Dedicated restraint episode documentation captures this non-empty item; it does not certify the one-hour evaluation deadline or clinical appropriateness.')
core('cms', [25, 26, 30], 'qualified-authorization', 'Requires licensure/privileges or responsible authenticated authorship beyond the existing role-only commit check.')
out('cms', [27, 28], 'Compliance with local blood/IV policies and actual administration law is an organizational/clinical duty, not a field-presence check.')
core('cms', 29, 'record-level-completeness', 'A current longitudinal individualized care plan and updates cannot be established by the first nursingAssessment capture.')
data('cms', 31, 'selfAdministrationOrder', 'authorizeSelfAdministration', 'w4SelfAdministration', kind='flag', value_set=None, human=True, friction='safety', note='Prescriber-only dedicated self-administration authorization artifact; this gate records authorization, not the subsequent physical dosing.')
for i,e in {32:'selfAdministrationCapacity',33:'selfAdministrationTeaching',34:'selfAdministrationSecurity',36:'patientOwnedMedicationIdentity',37:'patientOwnedMedicationIntegrity'}.items():
    data('cms',i,e,'documentSelfAdministration','w4SelfAdministration',roles=ALL)
core('cms',35,'record-level-completeness','Requires every reported self-administered dose as a separate administration record, not one episode-wide capture.')
out('cms',38,'Record-wide legibility, including imported/scanned records, is not guaranteed by DesignRules.minTextSize for UI components.')
core('cms',[39,40],'record-level-completeness','Requires date/time metadata on every medical record entry; a user-entered date on one screen cannot guarantee universal stamping.')
core('cms',41,'qualified-authorization','Requires authentication by the person responsible for each service, not any user sharing the same role.')
data('cms',42,'admittingDiagnosis','recordAdmission','w3Disposition',value_set='icd10',target='Encounter.diagnosis.condition')
core('cms',[43,44,45,46,47],'record-level-completeness','Requires appropriate linked record entries across the hospitalization; optional notes or one generic op complication do not establish coverage of all events.')
existing('cms',48,['dischargeDiagnosis','dischargeEntries','discharge'])
core('cms',[49,50,51],'event-time-window','Requires completion/filing timestamps anchored to admission, registration, surgery or discharge, including statutory exceptions.')
core('cms',52,'qualified-authorization','Properly executed consents require valid parties, scope and execution evidence; consentVerified alone is an attestation.')
out('cms',list(range(53,60)),'Retention of all source orders/reports/notes/monitoring records is a persistent backend record duty, beyond a UI capture guard.')
data('cms',60,'hospitalizationOutcome','discharge','w6Discharge',note='Add distinct hospitalization outcome text; dischargeCondition is only the condition at departure, not the course/outcome of hospitalization.')
existing('cms',61,['dischargeDestination','dischargeEntries','discharge'])
existing('cms',62,['dischargeFollowUp','dischargeEntries','discharge'])
core('cms',63,'order-expiry-clock','Needs policy duration/count defaults and automatic stopping for orders lacking explicit duration or dose count.')
out('cms',[64,65,66],'Immediate reporting to practitioners and the hospital reporting system needs actual notification/delivery, not an attestation field.')
out('cms',[67,68],'Hospital-wide infection-control/stewardship program documentation is an organizational obligation; a per-order indication does not establish it.')
for i,e in {69:'postHospitalNeeds',70:'postHospitalServiceAvailability',71:'postHospitalServiceAccess',72:'dischargePlanningEvaluation',73:'dischargeEvaluationDiscussion'}.items():
    data('cms',i,e,'discharge','w6Discharge',note='Require a documented assessment or explicit no-needs/not-indicated finding on every discharge (a disclosed stricter hospital UI choice). This avoids inventing a discharge-planning When and does not prove service delivery.')
core('cms',74,'record-level-completeness','Requires invalidating/updating a longitudinal discharge plan when clinical condition changes, rather than merely capturing a follow-up field once.')
out('cms',[75,76,77],'Destination-bound transmission of discharge information is a backend delivery obligation; prepare-and-attest cannot verify delivery.')
core('cms',78,'event-time-window','A properly executed consent must be in the chart before actual surgery, with emergencies handled; signOrders in preop only supplies a partial stricter UI gate.')
data('cms',79,'opTechnique','signOpNote','w6OpNote')
existing('cms',80,['opFindings','signOpNoteEntries','signOpNote'])
data('cms',81,'opTissuesRemovedAltered','signOpNote','w6OpNote',note='opSpecimens covers sent specimens, not every removed or altered tissue; add a distinct required description, permitting an explicit none finding.')
core('cms',82,'event-time-window','Needs operation-complete and report-writing/dictation events and the immediate-after relation.')
existing('cms',83,['signOpNote.roles = surgeons','Core.Interp human-only commit handling'],reason='The abstract UI requires a human surgeon to execute signOpNote. Identity proofing and persisted signature validation remain trusted backend responsibilities, not a claim of cryptographic signing compliance.')
core('cms',[89,91],'event-time-window','Anesthesia evaluation timing needs actual procedure/recovery event anchors and qualified provider provenance.')
out('cms',90,'Maintaining a longitudinal intraoperative anesthesia record is a record-system/care-delivery duty; displaying intraopRecord does not establish it.')
out('cms',105,'Approved evidence-based emergency protocols and actual clinical adherence are organizational/clinical obligations.')
out('cms',[106,107,108],'Appropriate screening, actual stabilization and absence of payment-related care delays cannot be verified from a clinician UI alone.')
core('cms',[109,110,111],'patient-predicate','Needs refused-service/unstabilized-transfer/receiving-acceptance branches and linked artifacts; dispositionChoice is not a When predicate.')
out('cms',list(range(112,120)),'Sending the full transfer packet, including later available records, requires destination-bound backend transmission and delivery evidence.')

# California Title 22.
out('ca-title22',0,'Retaining all consultation reports is a persistent record-system duty, not a required field on one note.')
data('ca-title22',1,'treatmentOrder','signTreatmentOrder','w6PostOp',note='Dedicated nonmedication treatment-order artifact; new commit is existing CommitSpec data, with a non-empty treatment description.')
data('ca-title22',2,'postOpDiet','signDietOrder','w6PostOp',value_set='diet',prefill='defaultConfirm',target='NutritionOrder.oralDiet.type',note='Reuse optional postOpDiet but require it on a dedicated signDietOrder commit; signing medication orders does not sign a diet order.')
data('ca-title22',3,'progressWorkingDiagnosis','signProgressNote','w6Rounding',value_set='icd10',target='Condition.code',note='New progress-note commit requires current working diagnosis; optional progressNote is insufficient.')
for i,e in {4:'nursingCareProvided',5:'nursingObservations',6:'nursingIncidents',7:'nursingInterpretation'}.items():
    data('ca-title22',i,e,'chartAssessment','w4Flowsheet',roles=['rn'],note='Required explicit narrative or none/not-applicable finding in each filed nursing note; stronger UI documentation policy, not an assertion that every patient has an incident.')
for i,e in {8:'administeredDrug',9:'administeredDose',10:'actualAdministrationTime',11:'actualAdministrationRoute',12:'adminSite'}.items():
    kw = dict(kind='quantity',unit='mg',value_set=None) if i==9 else dict(value_set='route') if i==11 else dict(value_set='body-site') if i==12 else {}
    data('ca-title22',i,e,'administerMed','w4Admin',target={'8':'MedicationAdministration.medicationCodeableConcept','9':'MedicationAdministration.dosage.dose','10':'MedicationAdministration.effectiveDateTime','11':'MedicationAdministration.dosage.route','12':'MedicationAdministration.dosage.site'}[str(i)],
         note='Capture the actual administered value, not merely the scheduled order. Route/site required for all records with explicit not-applicable where appropriate (stricter policy).' if i in [11,12] else 'Capture the actual administered value, not merely the scheduled order. Time is an entered ISO-8601 string; this capture does not validate a clock relation.', **kw)
data('ca-title22',13,'restraintType','chartRestraintEpisode','w3Restraint w4Restraint',roles=ALL,value_set='restraint-type')
for i,e,c in [(14,'restraintApplicationTime','recordRestraintStart'),(15,'restraintRemovalTime','recordRestraintEnd')]:
    data('ca-title22',i,e,c,'w3Restraint w4Restraint',roles=ALL,note='Capture actual timestamp as a non-empty ISO-8601 string on the dedicated start/end record. Collect even for soft support ties as a stricter policy; no timing comparison or order-expiry guarantee is claimed.')
out('ca-title22',[16,17,18,19],'Retention of complete vital-sign, laboratory, radiology or anesthesia records is a backend duty.')
data('ca-title22',20,'anesthesiaPreopDiagnosis','signAnesthesiaRecord','w6Anesthesia',roles=['physician'],value_set='icd10',note='Required diagnosis content on a new physician-authored anesthesia record. Qualified-anesthetist authorization is a separate core-feature rule, not implied by this content gate.')
data('ca-title22',21,'opTechnique','signOpNote','w6OpNote')
data('ca-title22',22,'opTissuesRemovedAltered','signOpNote','w6OpNote')
data('ca-title22',23,'hospitalCourse','discharge','w6Discharge')
existing('ca-title22',24,['dischargeCondition','dischargeEntries','discharge'])
data('ca-title22',25,'futureCareRecommendations','discharge','w6Discharge',note='Require a distinct recommendation narrative; a coded follow-up interval and generic instruction text alone do not identify all recommendations.')
data('ca-title22',26,'futureCareArrangements','discharge','w6Discharge')
out('ca-title22',list(range(27,31)),'Record security, access control and multi-year retention are backend/organizational duties outside the UI checker.')
core('ca-title22',[31,32],'event-time-window','Needs discharge-anchored completion/authentication deadlines across the record.')
core('ca-title22',33,'qualified-authorization','Exclusive-key authentication requires identity/key binding, not a second-user string or checkbox.')
out('ca-title22',34,'Unifying inpatient, outpatient and ED records requires backend identity and record integration.')
core('ca-title22',[35,36,38],'event-time-window','Needs shift/admission/transfer events and a new assessment obligation per event; one episode capture is not sufficient.')
existing('ca-title22',37,['chartAssessment.roles = nurses','nursingAssessment.enteredBy = nurses','chartAssessmentEntries'],reason='Within the abstract role model only an RN can file chartAssessment/nursingAssessment. Actual RN licensure and bedside performance remain trusted facts, not verified clinical care.')
out('ca-title22',39,'RN management of ongoing discharge teaching is an organizational/care-delivery responsibility, not a single completion flag.')
for i,e in {40:'nursingDiagnosis',41:'nursingPlan',42:'nursingIntervention',43:'nursingEvaluation'}.items():
    data('ca-title22',i,e,'chartAssessment','w4Flowsheet',note='Required nursing-documentation content routed to the permanent record; durability itself remains a backend assumption.')
core('ca-title22',list(range(44,50)),'event-time-window','Requires verification, H&P/test freshness or consent before actual surgery, emergency handling and (for verification) the designated operator; preop signOrders is not procedure start.')
for i,e in {50:'drug',51:'dose',52:'freq',53:'route'}.items():
    existing('ca-title22',i,[e,'orderLineElements','orderSigningEntries signOrders'],reason='V1 requires this field on each medication order line; requiring route on oral lines as well is a disclosed stricter policy. Backend emission of the order is trusted.')
core('ca-title22',[54,55],'record-level-completeness','Every issued drug order needs actual issue date/time metadata; arbitrary entered text cannot guarantee correct order issuance metadata.')
core('ca-title22',[56,57],'qualified-authorization','Requires actual authenticated prescriber signature or licensed scope; coarse roles alone cannot verify those attributes.')
core('ca-title22',58,'event-time-window','Prompt recording requires a verbal-order received event and a recording-time obligation.')
data('ca-title22',59,'verbalOrderGiver','recordVerbalOrder','w4VerbalOrder',roles=['rn','physician','np'],note='Capture giver identity on a dedicated verbal-order record; this does not verify state scope of the receiver or prescriber countersignature.')
core('ca-title22',60,'qualified-authorization','Requires receiver-specific authenticated signature; cosign merely checks a different user string.')
core('ca-title22',61,'event-time-window','Needs verbal-order receipt and countersignature events with a 48-hour deadline.')
core('ca-title22',62,'qualified-authorization','Requires licensed-scope-specific authority to receive verbal orders, absent from Role.')
data('ca-title22',63,'standingOrderCircumstances','signStandingOrder','w6StandingOrders')
data('ca-title22',64,'standingOrderConditions','signStandingOrder','w6StandingOrders')
core('ca-title22',65,'record-level-completeness','Must date each patient-specific standing-order instance; episode-wide text capture does not stamp every instance.')
core('ca-title22',66,'event-time-window','Prompt signature requires an activation/instance event and authenticated-signature deadline.')
out('ca-title22',67,'Ensuring all standing-order instances are stored in the record is a backend persistence duty.')
out('ca-title22',[68,69],'Annual standing-order review and hospital therapy-duration policies are governance duties; they are not per-encounter UI checks.')
data('ca-title22',70,'bedsideMedicationOrder','authorizeBedsideMedication','w4SelfAdministration',roles=PRESCRIBERS,kind='flag',human=True,friction='safety',note='Dedicated prescriber authorization record before bedside storage. Actual bedside handling remains outside the UI claim.')
core('ca-title22',71,'patient-predicate','Bedside-storage authorization needs a medication-specific controlled-class predicate for this non-medication-order artifact; When.orderClass only ranges over orderLines.')
data('ca-title22',72,'patientOwnedMedicationOrder','authorizePatientOwnedMedication','w4SelfAdministration',roles=PRESCRIBERS,kind='flag',human=True,friction='safety',note='New prescriber-only order artifact for patient-owned medication; downstream delivery of medication remains trusted.')
out('ca-title22',73,'Physical container labeling cannot be verified by an EHR field.')
core('ca-title22',[74,75],'qualified-authorization','Requires positive identification by a designated physician/pharmacist or qualified anesthesia provider; the role model lacks those qualifications and relationships.')
data('ca-title22',76,'anesthesiaChoiceRationale','signAnesthesiaRecord','w6Anesthesia',roles=['physician'],note='Add required non-empty rationale for anesthesia choice and anticipated procedure; qualification and timing are separate unresolved rules.')
core('ca-title22',77,'event-time-window','Needs an immediately-before-induction condition review, with induction as the anchor event.')
core('ca-title22',78,'record-level-completeness','Must capture events throughout anesthesia, not a single episode field or an op-note panel.')
for i,e in [(79,'anesthesiaBloodAmount'),(80,'anesthesiaBloodDuration')]:
    data('ca-title22',i,e,'recordAnesthesiaBloodAdministration','w6Anesthesia',roles=['physician'],kind='quantity',unit='mL' if i==79 else 'none',value_set=None,note='New per-administration record commit; amount is mL and duration is labeled minutes (UnitKind.none; no min constructor). This captures one blood-administration artifact; event-stream completeness is separately unresolved.')
data('ca-title22',81,'postAnesthesiaComplications','signPostAnesthesiaNote','w6Recovery',roles=['physician'],value_set='anesthesia-complication-status',allowed=['none','present'],note='Dedicated postanesthetic note requires presence/absence as a finite allowed set; clinical details may be added but are not claimed by this atomic rule.')
data('ca-title22',82,'edArrivalTime','recordEdArrival','w3Triage',roles=ALL,target='Encounter.period.start',note='Record actual arrival timestamp as a non-empty ISO-8601 string; no automatic clock comparison is claimed.')
data('ca-title22',83,'arrivalMode','recordEdArrival','w3Triage',roles=ALL,value_set='arrival-mode',prefill='defaultConfirm',target='Encounter.extension.arrivalMode',note='Reuse optional arrivalMode and require it on the new ED arrival-log commit, not on medication signing.')
data('ca-title22',84,'chiefComplaint','recordEdArrival','w3Triage',roles=ALL,kind='coded',value_set='nonempty-narrative',target='Encounter.reasonCode',note='Existing chiefComplaint is only gated at signNote; require non-empty ED arrival-log complaint using a new edArrivalComplaint element to avoid altering the existing text element.')
existing('ca-title22',85,['dispositionChoice','dispositionEntries','disposition'],reason='The abstract ED disposition commit captures dispositionChoice. Production ED-log persistence remains a backend assumption.')
data('ca-title22',86,'edDepartureTime','disposition','w3Disposition',target='Encounter.period.end',note='Record actual departure timestamp as a non-empty ISO-8601 string; scheduled or intended departure time is not the requested value.')
core('ca-title22',87,'record-level-completeness','Requires ED-log inclusion for all dead-on-arrival episodes, including those with no ordinary clinical commit.')
out('ca-title22',88,'Availability of all past hospital records in the ED requires backend retrieval and integration.')
core('ca-title22',89,'record-level-completeness','Integrated nutrition care across the care plan requires linked plan content and updates, not just a diet order.')
core('ca-title22',90,'qualified-authorization','Requires dietitian-authored observations; no dietitian Role exists.')
out('ca-title22',[91,92,93],'Dietary record transfer or pediatric departmental policies require backend/organizational implementation.')
core('ca-title22',94,'patient-predicate','Requires age >13, pediatric-bed placement and unusual-circumstances approval, absent from When.')
out('ca-title22',95,'Prompt parent/guardian accident notification requires actual communication and delivery.')
core('ca-title22',96,'patient-predicate','Requires newborn/oxygen-specific order-before-administration eligibility, absent from existing When and medication-line semantics.')
data('ca-title22',97,'newbornOxygenTarget','signNewbornOxygenOrder','w5OxygenOrder',roles=['physician'],note='New physician oxygen-order artifact requires a non-empty concentration or desired arterial oxygen partial-pressure description; this is content capture, not numeric clinical validation or newborn eligibility.')
core('ca-title22',98,'order-expiry-clock','Requires oxygen-order reassessment after 24 hours, tied to the active order instance.')
out('ca-title22',99,'Blood typing/cross-match service capability is a staffing/laboratory obligation.')
core('ca-title22',[100,101,103,105,107,108],'event-time-window','Requires consent/procedure/delivery/abortion event dates, interval bounds and statutory exception handling.')
core('ca-title22',[102,104,106,109,110],'patient-predicate','Requires ability to understand, age/payer, labor/impairment or language-understanding facts; cannot infer these from a generic consent flag.')
core('ca-title22',list(range(111,116)),'qualified-authorization','Requires correctly dated patient/interpreter/obtainer/physician signatures or patient acknowledgment artifacts; a human flag is not a legal signature validation.')
data('ca-title22',116,'consentRiskDisclosure','documentTreatmentConsent','w1Consent w3Consent w5Consent w6Consent',roles=PRESCRIBERS,note='Scoped treatment-consent documentation records medically significant risks discussed. It does not validate emergency exceptions, capacity, signatures or that disclosure was understood.')
data('ca-title22',117,'consentAlternativesDisclosure','documentTreatmentConsent','w1Consent w3Consent w5Consent w6Consent',roles=PRESCRIBERS)
core('ca-title22',118,'patient-predicate','Requires a refusal branch preserving treatment choice; entry flags cannot enforce care consistent with refusal.')
data('ca-title22',119,'continuingCareInformationGiven','discharge','w6Discharge',kind='flag',human=True,note='Human records continuing-care information was given before completing discharge. This is a documentation gate, not proof of patient comprehension or delivery by external systems.')

# California statutes. Keep transmission and pharmacy obligations distinct
# from UI content. A documented exception is not proof it legally applies.
data('ca-statutes',0,'prescriptionPatientName','signOrders','w1Orders w3Orders w5Orders w6Orders',per_line=True,target='MedicationRequest.subject.display',note='Capture patient name on each prescription artifact; the chart banner does not write prescription content. Outbound serialization/delivery remains backend work.')
data('ca-statutes',1,'prescriptionPatientAddress','signOrders','w1Orders w3Orders w5Orders w6Orders',per_line=True,target='MedicationRequest.extension.patientAddress')
existing('ca-statutes',2,['drug','orderLineElements','orderSigningEntries signOrders'])
existing('ca-statutes',3,['quantity','orderLineElements','orderSigningEntries signOrders'])
data('ca-statutes',4,'prescriptionDirections','signOrders','w1Orders w3Orders w5Orders w6Orders',per_line=True,target='MedicationRequest.dosageInstruction.text',note='Require a distinct non-empty complete sig on each prescription; dose/route/freq alone do not establish usable written directions. This gate prepares content; transmission is outside the checker.')
core('ca-statutes',5,'record-level-completeness','Actual issue date must be stamped on each prescription instance, not arbitrary date text captured earlier.')
data('ca-statutes',6,'prescriberLicenseClassification','signOrders','w1Orders w3Orders w5Orders w6Orders',per_line=True,target='MedicationRequest.extension.prescriberLicenseClassification',note='Capture the license classification as prescription content; this does not verify license validity or scope.')
data('ca-statutes',7,'prescriberFederalRegistration','signOrders','w1Orders w3Orders w5Orders w6Orders',when='orderClass controlled-II-IV',per_line=True,target='MedicationRequest.extension.deaRegistration',note='Capture registration content for controlled prescriptions. Schedule V needs its own existing drug-class data tag and duplicate EntryReq (added below); actual authority is a separate rule.')
existing('ca-statutes',8,['indication','orderLineElements','orderSigningEntries signOrders'],reason='V1 requires indication on every medication line, stricter than the patient-request trigger. It captures purpose; legibility/actual outgoing prescription serialization are trusted downstream responsibilities.')
out('ca-statutes',[9,10,12],'Electronic issuance/transmission and honoring the selected destination require a prescription backend and delivery adapter.')
core('ca-statutes',11,'event-time-window','Requires failure-end anchor and deadline for documenting a nontransmission reason; this is not a CURES waiver.')
out('ca-statutes',[13,14,15,16],'Controlled electronic prescription security/integrity/authority/confidentiality requires authenticated backend transaction controls, not UI layout rules.')
data('ca-statutes',17,'controlledTransmissionAgentName','recordDelegatedControlledTransmission','w1Delegation w3Delegation w6Delegation',note='Dedicated prescriber-side delegated Schedule III–V transmission record captures agent name. It does not perform or prove transmission or the agent authorization.')
core('ca-statutes',[18,20],'value-validation','A maximum hours/days supply must be derived from quantity and directions in a specific direct-dispensing pathway; finite allowed values on refills cannot express this calculation.')
data('ca-statutes',19,'noFurtherControlledNeedExpected','authorizeDirectDispensing','w3DirectDispense w6DirectDispense',kind='flag',human=True,friction='safety',note='Prescriber human attestation of the specific no-further-need judgment on the direct-dispensing artifact; the separate 72-hour supply limit still requires value validation.')
core('ca-statutes',21,'record-level-completeness','Requires detecting and blocking renewal/extension of an earlier emergency OUD supply across linked records.')
core('ca-statutes',[22,23],'patient-predicate','CURES exemptions require procedure/setting/supply/ED-buprenorphine eligibility beyond an unvalidated reason string.')
core('ca-statutes',24,'event-time-window','Requires delegated-report review time within 24 hours of prescription, not just a generic receipt or direct report display.')
core('ca-statutes',[25,26],'event-time-window','Requires information and actual consent before telehealth care starts, including statutory exclusions; signing a later note does not establish the temporal relation.')
data('ca-statutes',27,'telehealthConsentRecord','recordTelehealthConsent','w1Telehealth w3Telehealth w5Telehealth w6Telehealth',value_set='telehealth-consent-mode',allowed=['verbal','written'],note='Dedicated service-linked telehealth consent documentation with truthful verbal/written modes. Actual pre-care sequence remains the separate event-time rules.')
core('ca-statutes',28,'patient-predicate','V1 naloxoneRisk omits other increased-overdose-risk facts; add risk and statutory exemption predicates rather than claiming the existing two triggers cover the law.')
core('ca-statutes',29,'patient-predicate','Requires patient-designated recipient/minor-guardian/exception branches, not just the existing naloxoneEducation flag.')
data('ca-statutes',30,'naloxoneEducationOutcome','signOrders','w1Sign w3Sign w5Sign w6Sign',when='naloxoneRisk',value_set='naloxone-education-outcome',allowed=['provided','declined','educatedWithin24Months'],human=True,note='Replace the old naloxoneEducation EntryReq with this coded truthful outcome under existing naloxoneRisk. The 24-month exception is a human-reported outcome, not an automatically validated historical clock; other risk eligibility remains a separate core rule.')
core('ca-statutes',[31,32,33,34,35],'patient-predicate','Requires HIV test type, independent request, specific positive/negative result and clinician high-risk assessment; abnormalResult alone cannot distinguish them.')
core('ca-statutes',[36,37,38],'release-access-policy','Sensitive-result release, single-result anonymous access tokens and revocation require data/recipient-scoped access and consent rules, not acknowledgment gates.')
core('ca-statutes',39,'record-level-completeness','Must link and preserve the patient addendum with the exact disputed record portions across later access/disclosure.')
out('ca-statutes',40,'Including linked addenda in actual third-party disclosures is a backend export/delivery duty.')
data('ca-statutes',41,'mentalHealthAccessRequestDate','documentMentalHealthAccessDenial','w2AccessReview',note='Dedicated denial artifact captures the request date as a non-empty date string; neither deadline calculation nor denial eligibility is implied.')
data('ca-statutes',42,'mentalHealthAccessDenialConsequences','documentMentalHealthAccessDenial','w2AccessReview',note='Require patient-specific anticipated consequences on the denial artifact; this documents professional judgment without machine validation of the judgment.')
core('ca-statutes',43,'event-time-window','Needs access-request date, working-day calendar, extension grounds/notice and summary availability deadline.')
out('ca-statutes',[44,45,46,47],'Automatic immutable change/access history is a persistent backend audit obligation; human-entered metadata is not an audit trail.')
core('ca-statutes',[48,49],'release-access-policy','Requires data segregation and state/recipient-specific read access controls, absent from per-element write roles.')
core('ca-statutes',list(range(50,61)),'patient-predicate','Needs age, independent living, service type, maturity, parent-contact decisions or proxy eligibility; generic encounter tags cannot stand in for statutory minor-consent facts.')
core('ca-statutes',[61,63],'event-time-window','Requires prompt recording when a directive/capacity determination is made or learned, not a routine every-visit discussion checkbox.')
out('ca-statutes',62,'Requesting and retaining furnished directive copies is a document management/backend duty.')
core('ca-statutes',[64,65,66,67],'qualified-authorization','Requires legally sufficient directive/POLST execution evidence, dates, witness/notary qualification and authorized parties; a generic field or cosign does not validate this.')
core('ca-statutes',68,'release-access-policy','Must revoke and propagate active POLST authority on valid communicated intent, including non-written revocation.')
out('ca-statutes',list(range(69,75)),'CAIR outbound payload selection, suppression and delivery are registry-backend responsibilities, not immunization capture gates.')
core('ca-statutes',list(range(75,87)),'patient-predicate','Homeless-discharge duties require homelessness, clinical need, resource and statutory range predicates. dischargeDestination or blanket checkboxes cannot determine eligibility.')
core('ca-statutes',87,'order-expiry-clock','5150 duration starts at first detention and survives transfer; the current episode clock lacks a durable detention anchor.')
for i,e in {88:'holdApplicationCircumstances',89:'holdApplicationProbableCause',90:'holdHistoryConsidered',91:'holdAdvisementPerformer',92:'holdAdvisementDate',93:'holdAdvisementCompletion',94:'holdAdvisementLanguage'}.items():
    kw = dict(value_set='yes-no',allowed=['yes','no']) if i==90 else dict(value_set='completed-not-completed',allowed=['completed','notCompleted']) if i==93 else {}
    data('ca-statutes',i,e,'documentHoldApplication' if i<=90 else 'recordHoldAdvisement','w3Hold',note='New dedicated 5150 application/advisement artifact captures this atomic record item; this does not authorize detention, establish actor qualification, or enforce the detention clock.',**kw)
core('ca-statutes',95,'patient-predicate','Requires an EntryReq conditional on advisement not completed; When has no captured-value predicate. An always-required fabricated good-cause reason would be dishonest.')
out('ca-statutes',96,'Actual county advocate notification after continued detention requires a timed notification backend.')
out('ca-statutes',97,'A hospital stewardship policy and evaluation process are organizational obligations.')
out('ca-statutes',98,'Actually providing newborn screening program services is a clinical/service-delivery obligation.')
core('ca-statutes',99,'patient-predicate','Religious-objection exception requires valid parent/guardian refusal and newborn-screening context.')
data('ca-statutes',100,'primaryLanguage','recordCommunicationNeeds','w1Rooming w3Triage w4Flowsheet w5Rooming w6Consult',roles=ALL,value_set='primary-language',target='Patient.communication.language',note='Capture once in a dedicated chart-update artifact, not a redundant each-visit interpreter checkbox. Reuse the recorded value in patientBanner; unknown/declined are explicit allowed local codes.')
data('ca-statutes',101,'patientDialect','recordCommunicationNeeds','w1Rooming w3Triage w4Flowsheet w5Rooming w6Consult',roles=ALL,target='Patient.communication.extension.dialect')
core('ca-statutes',[102,103],'qualified-authorization','Requires pharmacy-prepared high-risk medication profile, age/medication-count/therapy criteria and licensed pharmacy staffing absent from the role/fact model.')
core('ca-statutes',104,'qualified-authorization','Pharmacist approval is not expressible with the existing four roles and a distinct-user cosign string.')
core('ca-statutes',105,'qualified-authorization','Pharmacy recipient must reasonably verify transmitting-agent authorization and record identity; pharmacist role/relationship is absent.')
out('ca-statutes',106,'Pharmacy honoring of substitution instructions is downstream dispensing behavior, not an order-entry checkbox guarantee.')
core('ca-statutes',107,'qualified-authorization','Requires known/unknown pickup-recipient identity proofing, not patient initials/sex/age re-entry by the prescriber.')
out('ca-statutes',108,'Actual notice to the prescriber within 24 hours needs a pharmacy notification backend.')
core('ca-statutes',109,'event-time-window','Release authorization expiration requires a bounded date/event tied to actual use, not a review-receipt window.')
for i,e in {110:'dischargeDrugUseInformation',111:'dischargeDrugStorageInformation',112:'dischargeDrugWarningsInformation',113:'dischargeDrugAdherenceInformation'}.items():
    core('ca-statutes',i,'record-level-completeness','Requires the appropriate professional to give this information for each discharge-dispensed drug; current perOrderLine ranges over new orders, not the discharge-dispensed medication set. A generic dischargeInstructions string is insufficient.')
core('ca-statutes',list(range(114,118)),'patient-predicate','ED unused-drug take-home exception needs controlled status, prior actual administration, packaging/self-use and continued-treatment facts.')
out('ca-statutes',118,'Physical prescription labeling of an ED take-home portion cannot be verified by the UI checker.')
out('ca-statutes',119,'Excluding selected drugs from CURES reports is outbound registry payload filtering in the backend.')

# Federal prescribing/certified technology.
data('federal-rx',0,'controlledMedicalPurpose','signOrders','w1Orders w3Orders w5Orders w6Orders',when='orderClass controlled-II-IV',per_line=True,note='Capture a non-empty legitimate-purpose statement on each controlled order, including Schedule V via the extra class-specific requirement below. This documents purpose; the checker does not decide medical legitimacy.')
out('federal-rx',1,'Actual usual professional practice is a substantive clinical/legal duty, not something a UI checkbox can establish.')
core('federal-rx',2,'record-level-completeness','Requires actual issue-day stamping on every prescription and prevention of future dating; a plain text date element is not this guarantee.')
for i,e in {3:'controlledPatientFullName',4:'controlledPatientAddress',6:'controlledProductStrength',7:'controlledDosageForm',9:'controlledDirections',10:'controlledPrescriberName',11:'controlledPrescriberAddress',12:'controlledPrescriberDea'}.items():
    data('federal-rx',i,e,'signOrders','w1Orders w3Orders w5Orders w6Orders',when='orderClass controlled-II-IV',per_line=True,target='MedicationRequest.extension.'+e,note='Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.')
existing('federal-rx',5,['drug','orderLineElements','orderSigningEntries signOrders'],reason='V1 requires drug on each new medication order. W7 approveRefill authorizes repeats against an existing prescription; creating a replacement prescription must use signOrders and its content gates.')
existing('federal-rx',8,['quantity','orderLineElements','orderSigningEntries signOrders'],reason='V1 captures quantity on each new prescription; approveRefill also requires refillQuantity for a refill decision. Backend prescription rendering remains trusted.')
data('federal-rx',13,'ghbMedicalNeed','signOrders','w1Orders w3Orders w5Orders w6Orders',when='drugClass ghb',per_line=True,note='Add the ghb formulary class to relevant product entries (ordinary drug-class data), then require non-empty medical need on those lines. No new When is needed.')
core('federal-rx',14,'patient-predicate','Institutional/government DEA exemptions need prescriber identity/authority and the selected exemption pathway; generic controlled class does not determine them.')
core('federal-rx',15,'value-validation','Emergency-only quantity requires a computed supply and an emergency oral channel predicate, not a fixed quantity literal.')
core('federal-rx',16,'event-time-window','Requires emergency oral prescription event, seven-day follow-up and delivery/postmark evidence; the delivery component stays backend work.')
data('federal-rx',17,'emergencyAuthorizationNotation','signEmergencyRxFollowup','w1EmergencyRxFollowup w3EmergencyRxFollowup w5EmergencyRxFollowup w6EmergencyRxFollowup w7EmergencyRxFollowup',value_set='emergency-authorization-notation',allowed=['Authorization for Emergency Dispensing'],note='Dedicated emergency-follow-up prescription artifact requires the exact notation via allowed values. It does not verify the seven-day deadline or send the artifact.')
data('federal-rx',18,'refills','signOrders','w1Orders w3Orders w5Orders w6Orders w7Decision',kind='quantity',unit='none',value_set=None,prefill='defaultConfirm',when='orderClass schedule-II',per_line=True,target='MedicationRequest.dispenseRequest.numberOfRepeatsAllowed',note='Add allowed=[0] for refills on Schedule II lines and refillRefills on approveRefill; see expanded requirements below. V1 currently lacks this constraint. A true new Schedule II prescription can be issued with zero repeats; a Schedule II refill approval must be forbidden entirely, not permitted merely by entering zero.')
core('federal-rx',19,'record-level-completeness','Requires a linked multi-prescription series and aggregate days-supply <=90, not a per-line numeric allowed set.')
data('federal-rx',20,'earliestFillDate','signScheduleIISeries','w1ScheduleIISeries w3ScheduleIISeries w5ScheduleIISeries w6ScheduleIISeries w7ScheduleIISeries',note='A dedicated multiple-Schedule-II prescription artifact requires an earliest-fill date on every series line (including the first, a disclosed stricter policy). Date is a non-empty ISO-8601 string; interpreting or enforcing pharmacy fill eligibility is separate.',per_line=True,when='orderClass schedule-II')
data('federal-rx',21,'seriesDiversionRiskAssessed','signScheduleIISeries','w1ScheduleIISeries w3ScheduleIISeries w5ScheduleIISeries w6ScheduleIISeries w7ScheduleIISeries',kind='flag',human=True,friction='safety',note='Dedicated series-issuance commit requires a human prescriber conclusion that the series does not create undue diversion/abuse risk. It documents the judgment, not automated assessment of risk.')
core('federal-rx',22,'patient-predicate','Series issuance eligibility requires applicable jurisdiction and state-law pathway facts.')
core('federal-rx',[23,28,29,30,31],'order-expiry-clock','Requires durable original-issue/first-partial-fill/emergency-issue clocks, calendar months and blocking of expired dispensing actions.')
core('federal-rx',[24,25,26,27,32],'record-level-completeness','Requires original prescription/partial-fill linkage, cumulative refills/quantities or multiple partial-fill quantities; a finite allowed set on one episode capture does not enforce the historical totals.')
out('federal-rx',list(range(33,43)),'Identity proofing, credential/access administration and immediate revocation are organizational/security backend duties outside clinician UI customization.')
out('federal-rx',43,'Two-factor EPCS signing requires an authenticated security service; two entered strings are not two authentication factors.')
core('federal-rx',44,'qualified-authorization','Requires verified prescription-issuing practitioner identity and EPCS signing authorization, beyond role and human-only commit.')
data('federal-rx',45,'controlledReadyToSign','signOrders','w1Sign w3Sign w5Sign w6Sign',kind='flag',human=True,friction='safety',when='orderClass controlled-II-IV',per_line=True,note='Require an explicit human ready-for-signature selection per controlled prescription; Schedule V is added below. Edit-triggered invalidation is the separate next rule; this classification covers selection only.')
core('federal-rx',46,'record-level-completeness','Requires readiness/review receipts bound to the exact prescription version and invalidation after any edit; human-only flag alone can go stale.')
core('federal-rx',list(range(47,61)),'structured-display','Requires specific prescription/signing-notice content continuously visible during EPCS signing or a semantic signing-control label; InfoSpec only names panels and has no mandatory subfields/text contract.')
out('federal-rx',list(range(61,68)),'Persistent immutable EPCS auditing, daily analysis and multi-year electronic retention are backend security/operations duties.')
data('federal-rx',68,'vaccineAdministrationDate','recordImmunization','w5Immunization',target='Immunization.occurrenceDateTime',note='Capture actual vaccination date as a non-empty ISO-8601 date string; this does not infer the date from note creation or prove permanent retention.')
existing('federal-rx',69,['vaccineManufacturer','recordImmunizationEntries','recordImmunization'])
existing('federal-rx',70,['vaccineLot','recordImmunizationEntries','recordImmunization'])
existing('federal-rx',71,['vaccineProvider','recordImmunizationEntries','recordImmunization'])
data('federal-rx',72,'vaccineProviderAddress','recordImmunization','w5Immunization',target='Immunization.extension.administeringProviderAddress')
data('federal-rx',73,'vaccineProviderTitle','recordImmunization','w5Immunization',target='Immunization.extension.administeringProviderTitle',note='Require title or explicit not-applicable on every vaccination record as a disclosed stricter data policy, avoiding a fictional title-appropriate When.')
core('federal-rx',74,'event-time-window','VIS must actually be provided before each covered vaccination; visGiven before recording alone does not order delivery against the actual administration event.')
out('federal-rx',[77,78,79],'Certified create/change/access CPOE capabilities require durable order lifecycle/backend operations, not only a UI field/commit declaration.')
existing('federal-rx',80,['drugAllergyOrderAlert (drugAllergyOrder)','AlertCond.drugAllergy','Core.Alerts','signOrders'],reason='The abstract interpreter automatically fires the drug-allergy alert before order completion. Formulary/record completeness and real certification coverage remain trusted, not certified by this catalog.')
existing('federal-rx',81,['interactionOrderAlert (interactionOrder)','AlertCond.interaction','Core.Alerts','signOrders'],reason='The abstract interpreter automatically fires the drug-drug interaction alert before order completion. The finite formulary is demo data; comprehensive clinical interaction coverage is not claimed.')
core('federal-rx',[82,83],'qualified-authorization','Severity configuration requires authorized per-user administration of alert policy; static AlertSpec.tier is data, not a protected settings workflow.')
core('federal-rx',84,'value-validation','ISO language coding, explicit declination and certified record/change/access capability need validated code sets and record lifecycle; coded valueSet names currently do not validate membership.')
core('federal-rx',85,'value-validation','Date-of-birth record/change/access requires real date validation and typed demographic writes; banner display plus arbitrary text is not that capability.')
core('federal-rx',86,'record-level-completeness','Must record every associated implant UDI as a list; one optional opImplants text or one captured UDI does not represent all devices.')
core('federal-rx',[87,88,89],'value-validation','Requires parsing standardized UDI production identifiers into lot/serial/expiry, not manually entering similarly named fields.')
core('federal-rx',[90,91,92],'record-level-completeness','Requires reconciling multiple source lists into one confirmed incorporated medication/allergy/problem list; first medRecDecision capture is insufficient.')
out('federal-rx',[93,94,95],'Standards-conformant C-CDA transition-summary generation is a backend document capability; a discharge field alone does not satisfy certification.')
out('federal-rx',[96,97,98],'NCPDP SCRIPT new/cancel/renew transactions and response handling require backend protocol adapters.')
core('federal-rx',99,'value-validation','Needs formulation-aware dose/unit representation and consistent mL-only prescription output, not just a general doseUnit label (existing dose is mg).')
core('federal-rx',[100,101],'value-validation','The parser normalizes numeric input and does not constrain lexical leading/trailing zeroes on entry/output; requires a lexical numeric-format contract.')
core('federal-rx',102,'structured-display','Requires bibliographic source attributes linked to each DSI, not a panel name or an unrelated free-text citation field.')
out('federal-rx',[103,104,105,106,107,108],'DSI export, authenticated patient portal/view/download/transmission and USCDI conformance are backend/product certification capabilities outside this clinician UI checker.')
out('federal-rx',[110,111],'Workforce access-role/data-category policy definition is organizational governance.')
core('federal-rx',112,'release-access-policy','Role-scoped PHI reads/displays require data access policy; ElementSpec.enteredBy governs writes only.')
core('federal-rx',113,'event-time-window','Requires access-request receipt time and 30-day fulfillment/denial deadline, not a review receipt window.')
out('federal-rx',114,'Requested electronic format negotiation/export/delivery is a backend access-fulfillment duty.')
core('federal-rx',[115,117,118],'release-access-policy','Requires lawful data/recipient-scoped hold/release and review-right pathways, independent of ackResult; the current language has no release policy.')
core('federal-rx',116,'qualified-authorization','Requires an individualized determination by an actually licensed professional with the relevant clinician-patient relationship, not any prescriber-role checkbox.')

# Entrenched inputs. guidance.json is an identical compatibility mirror;
# load both but merge by citation + atomic requirement, retaining locations.
core('entrenched',0,'structured-display','Banner/identifier fields need typed identifier categories to exclude room number; landmark presence alone does not constrain contents.')
out('entrenched',1,'Labeling a physical specimen at the bedside while the patient is present cannot be verified by a UI capture.')
core('entrenched',2,'qualified-authorization','Critical-result routing requires recipient authorization/coverage relationships, beyond CommitSpec.roles.')
core('entrenched',[3,4,5,6],'patient-predicate','Requires suicide-screening eligibility, validated-tool results and positive-screen/ideation branches; generic abnormalResult cannot represent these.')
out('entrenched',list(range(7,15)),'Physical procedural medication labels, approved reversal protocols and actual written-medication-information delivery are operational/backend obligations.')
core('entrenched',[15,16,17,18,19,20],'event-time-window','Requires clinical care/procedure boundaries, team agreement or site-marking evidence at the right boundary, and reset after performer changes; order-signing re-entry is only a partial gate.')
core('entrenched',21,'record-level-completeness','Requires resolving every home-medication/hospital-order discrepancy, not only the first medRecDecision.')
existing('entrenched',22,['weight.kind = quantity kg','dosingWeight.kind = quantity kg','orderSigningEntries signOrders'],reason='V1 requires kg weights before medication signing, stricter than the entrenched metric requirement (which also permits grams). This narrow mapping does not certify every hospital document.')
core('entrenched',[23,24],'event-time-window','Needs measured-weight provenance and encounter/measurement-time linkage; copied weightToday and a manual number do not prove a current measurement occurred.')
core('entrenched',list(range(25,37)),'event-time-window','Adopted WHO checklist item belongs before induction/incision/OR exit, not retrospective signOpNote; needs phase events and current human evidence. Physical execution remains trusted.')
data('entrenched',37,'methotrexateTeachBack','documentMethotrexateDischarge','w6Discharge',kind='flag',human=True,friction='safety',note='Dedicated methotrexate-discharge teaching artifact records that the clinician elicited repeat-back. This is accountable human evidence, not proof of patient comprehension or an automated drug predicate.')
out('entrenched',38,'Selecting and combining stronger hospital-wide high-alert safeguards is a medication-safety program duty.')
out('entrenched',[39,40],'Including weight in actual transmitted prescriptions or generated discharge/after-visit summaries requires backend serialization/export; capturing weight alone is insufficient.')
core('entrenched',[41,42],'patient-predicate','New alert conditions need growth-curve/previous-encounter weight comparisons and configured clinical thresholds; AlertCond has neither predicate.')
core('entrenched',43,'value-validation','Needs typed wet/dry/dosing-weight categories and selection rules, beyond quantity kg and a free-standing dosingWeight.')
core('entrenched',44,'event-time-window','Pain response must link to the intervention and an appropriate reassessment time; a generic painReassessment on chartAssessment does not establish the relation.')
out('entrenched',45,'Defining institution-specific age/condition-sensitive pain reassessment criteria is clinical governance.')
core('entrenched',[46,47],'patient-predicate','Requires self-report suitability or high-opioid-risk facts and the appropriate assessment/monitoring pathway.')
out('entrenched',[48,49,51],'Actual timely notification/escalation or amendment delivery requires an operational messaging backend.')
core('entrenched',50,'record-level-completeness','Ordering-clinician provenance must exist on every ordered test and resulting report, not a single note author field.')
core('entrenched',52,'structured-display','Requires abnormal markers in each result row; abnormalResult only gates trend visibility and does not constrain resultDetail contents.')
core('entrenched',53,'qualified-authorization','Requires time-bounded surrogate recipient assignment and authority to receive result data, not a same-role review receipt.')
core('entrenched',[54,55,56,57,58,59],'structured-display','Requires component-level grouping, per-row identifiers, selection emphasis, name-collision warning or available photo content; panel visibility and global minTextSize cannot express these contracts.')
out('entrenched',60,'Identifiers on actually printed patient materials require a backend/print document renderer outside Program screen checking.')
existing('entrenched',61,['patientIdReentry','orderSigningEntries signOrders','Core.Interp needsHuman'],reason='Human patientIdReentry is required unconditionally before signOrders, stricter than the photo-unavailable fallback; this is the chosen local safeguard, not a universal re-entry mandate.')
out('entrenched',[62,63,64,65],'Hospital-wide CPOE/BCMA deployment, compliance denominators and external evaluation scores require operational evidence, not one UI path.')
existing('entrenched',66,['wristbandScan','administerMedEntries','Core.Basics.scanMatches wristband'])
existing('entrenched',67,['medScan','administerMedEntries','Core.Basics.scanMatches medication'])
existing('entrenched',68,['wristbandScan.kind = scan wristband','Core.Basics.scanMatches: code == facts.patientId','administerMedEntries'],reason='In the abstract model a wrong-patient wristband code cannot satisfy administration. Real scanner/barcode-to-patient integration remains trusted; this does not claim real-device certification.')
existing('entrenched',69,['medScan.kind = scan medication','Core.Basics.scanMatches: facts.medToGive? == some code','administerMedEntries'],reason='In the abstract model a wrong-medication scan cannot satisfy administration. Real product barcode normalization and scanner integration remain trusted.')
core('entrenched',70,'value-validation','Needs actual scanned product strength/dose compared with the selected administration order, not just drug-name scan equality.')
core('entrenched',71,'event-time-window','Needs actual administration time versus scheduled order window and patient/order-specific due state.')
existing('entrenched',72,['highAlertAdminAlert (highAlertAdmin)','highAlertCosign','administerMedEntries','When.highAlertMed'],reason='The abstract high-alert BCMA path signals second-nurse need and requires a different user. Actual blinded independence, real BCMA product matching and hospital risk-list completeness remain outside this narrow guarantee.')
core('entrenched',[73,74],'value-validation','Requires a mandated weekly default for oral methotrexate while preserving verified daily-oncology exceptions; PrefillPolicy.defaultConfirm permits a default but cannot prescribe its value or relate frequency and indication.')
out('entrenched',75,'Selecting highest-risk drugs and independent physical checking procedures is institutional medication-safety governance; distinct-user cosign is only a partial model.')
core('entrenched',list(range(76,89)),'value-validation','Requires context-sensitive medication text/decimal validation across entered and rendered communication; a valueSet label and fixed-tenths number do not enforce forbidden tokens or lexical format.')
core('entrenched',[89,90],'value-validation','Requires normalized allergen/reaction vocabularies and category-specific storage rules; the existing coded constructor does not validate vocabulary membership or route records.')
core('entrenched',91,'qualified-authorization','Assigning clinically governed/configurable severity tiers requires policy-administration authority and provenance; fixed AlertSpec tiers already exist but do not express that governance.')
core('entrenched',92,'record-level-completeness','Requires allergy-update-triggered evaluation of all active medications, rather than only alert evaluation on a pending order commit.')
core('entrenched',93,'structured-display','Requires weight visible throughout order-entry phase, not only a commit-screen review; DesignRules.landmarks is global and cannot express phase-specific content.')
core('entrenched',[94,95,96,97],'value-validation','Needs validated dosing arithmetic, concentration/precision constraints or maximum-daily-dose aggregation; existing fixed-tenths doseOutOfRange is only a narrow per-dose check.')


GROUPS = {
    'event-time-window': ('M', 'Add EventId and timestamped EventEvidence (patient, episode, actor, artifact/version) plus TemporalReq with subject event, anchor event, before/after bounds and an explicit obligation deadline. Use integer timestamps rather than receipt age; retain separate completion and filing events and a business-day calendar where law requires it. The checker verifies each affected commit reaches its evidence collection/exception path; the guard compares trusted event times, rejects stale evidence and opens overdue obligations. Evidence identity and clinical execution remain trusted inputs. Qualified actors and applicability compose with the separate groups below.'),
    'patient-predicate': ('M', 'Extend When with a closed typed ClinicalPredicate AST: patient age bands, service/payer/setting, homelessness, clinical risk/test-result categories, capacity/consent status and captured coded-value equality, with and/or/not. Add only named Facts fields with FHIR provenance and an explicit unknown policy (no silent false). Reuse the same evaluator for EntryReq, ReviewReq and a new AlertCond predicate case. The checker covers true/false/unknown branches and preserves refusal/exception routes; the guard evaluates actual patient/episode facts. Encounter strings must retain encounter meaning, never encode age or homelessness as invented encounter kinds.'),
    'order-expiry-clock': ('M', 'Add durable OrderInstanceId, original issue/start/first-fill anchors and ExpiryReq keyed to an order or detention instance, with duration/calendar-month policy and renewal/reassessment evidence. Keep anchors through transfers and episodes. The checker requires renewal/stop/exception routes; the guard rejects expired actions, prevents resetting the original clock, and generates an expiry/overdue state. A scheduler/backend must perform real auto-stop or release; a proof of guard blocking is not proof the scheduler ran. Compose age-specific policies with ClinicalPredicate.'),
    'record-level-completeness': ('L', 'Add typed ArtifactId/version and RecordSetReq over a named finite set (orders, administrations, reports, implants, medication lists), with per-member required fields/provenance, linkage, freshness/invalidation, and bounded aggregates such as refill count or total supply. Include automatic date/time metadata contracts on artifact-producing commits. The checker verifies every writer binds values to the right artifact/member and preserves source/version relationships; the guard quantifies over trusted record members and rejects missing, stale or over-limit items. This extends the present perOrderLine iterator, not backend storage durability or retention.'),
    'qualified-authorization': ('L', 'Retain the four demo roles, adding CapabilityReq and AuthEvidence keyed to user, patient relationship, artifact/version and action. Capabilities cover current license/scope, privileges, designated responsible operator, protected policy administrator and signer/party roles; signature evidence must come from an identity provider, not a typed cosign string. The checker prevents bypass of capability/evidence checks and the guard validates their trusted status and bindings at commit. Hospitals/security services still supply proofing, credentials and revocation; the language cannot independently prove those external facts.'),
    'structured-display': ('M', 'Extend InfoSpec with a typed payload contract (required fields, identifier categories, per-row fields/grouping and conditional available content) and add a scoped DisplayReq for commit or named workflow phase, plus a semantic label contract on critical actions. Avoid a free-form HTML contract. The checker verifies visibility, grouping and label requirements for each applicable phase; the renderer produces the contracted payload and the guard rejects missing signing fields. Keep EPCS details/notice continuously pinned during the modeled signing phase; the authenticated signing service remains separate.'),
    'value-validation': ('M', 'Add a small closed Validation AST to element/artifact constraints: validated code-system membership, dates, lexical numeric/token formatting, typed formulation/unit and weight-category compatibility, product/UDI parsing, default-value requirements and explicitly named bounded arithmetic functions for supply/dose calculations. Apply validation at input and generated output; preserve lexical input where formatting matters. The checker validates supported constraints/defaults and the guard rejects invalid values/relations before commit. Clinically validated calculator tables and standards codecs remain trusted, versioned data; do not add arbitrary executable predicates.'),
    'release-access-policy': ('L', 'Add ReadReleaseReq for data category, patient/service context, recipient/relationship/jurisdiction, purpose, consent/hold status and review-right route. Introduce release/access intents distinct from ackResult and versioned revocation evidence. The checker ensures all modeled read/export/release paths consult policy and offer required review/revocation actions; the guard authorizes the exact requested scope and prevents stale consent reuse. Token issuance, physical export, encryption and delivery remain backend duties; this group expresses eligibility and UI policy, not successful transmission.'),
}


def replace_with_review(area, i, info, payload, *, workflow_screens='w1Sign w3Sign w5Sign w6Sign', commit='signOrders', when='orderClass controlled-II-IV'):
    """New infos are data; implementing their payload binding is content work.

    Do not demand a new generic panel schema just to show one additional item.
    A real scoped layout/label relation still needs a language extension.
    """
    DECISIONS[area,i] = dict(fit='spec-data',
        fitReason='Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.',
        proposedEncoding=dict(elements=[], infos=[dict(id=info,label=payload,version='')],
            commits=[dict(id=commit,roles=PRESCRIBERS)], entries=[],
            reviews=[dict(commit=commit,info=info,mode='shownOnCommit',when=when,waivedBy=None)],
            alerts=[],windowMin=None,waivedBy=None,
            displayContent={info:payload},
            placement=[dict(screen=s,workflow='W'+s[1],location='Pinned, expanded readable panel beside the signing button; remain shown until the modeled commit completes.') for s in workflow_screens.split()]))
    if when=='orderClass controlled-II-IV':
        q=copy.deepcopy(DECISIONS[area,i]['proposedEncoding']['reviews'][0])
        q['when']='orderClass controlled-V'
        DECISIONS[area,i]['proposedEncoding']['reviews'].append(q)


def adjust_decisions():
    # These are missing content, not new language. Separate rule rows already
    # cover screening eligibility and full signing authentication.
    for i,e in [(5,'suicideRiskLevel'),(6,'suicideMitigationPlan')]:
        del DECISIONS['entrenched',i]
        data('entrenched',i,e,'signSuicideRiskAssessment','w3SuicideAssessment w4SuicideAssessment',roles=ALL,
             note='Required content on the dedicated suicide-risk assessment artifact. Screening eligibility, positive-screen branching and actual protective measures are separate rules; adding a risk/plan element needs no language extension.')
    for i,e,c,s in [(52,'minorMentalHealthParentContactDecision','documentMinorMentalHealthConsent','w5MinorConsent'),
                    (55,'minorAssaultParentContactTime','documentMinorAssaultCareConsent','w3MinorConsent w5MinorConsent'),
                    (57,'minorSubstanceParentInvolvementDecision','documentMinorSubstanceCareConsent','w5MinorConsent')]:
        del DECISIONS['ca-statutes',i]
        data('ca-statutes',i,e,c,s,note='Capture the statutory parental-contact/involvement record on this dedicated service-consent artifact, including actual contact date/time or the documented decision/reason as appropriate. Minor/service eligibility and actual consent authority remain separate core-feature rules.')
    display_items={47:('controlledSigningIssueDate','Actual issue date of every selected controlled prescription; sourced from the order artifact, never the future earliest-fill date.'),
        48:('controlledSigningPatientName','Patient full name on every selected controlled prescription; do not substitute initials/sex/age.'),
        49:('controlledSigningDrugName','Drug name for every selected controlled prescription line.'),
        50:('controlledSigningStrength','Product strength for every selected controlled prescription line, distinct from dose.'),
        51:('controlledSigningDosageForm','Dosage form for every selected controlled prescription line.'),
        52:('controlledSigningQuantity','Prescribed quantity for every selected controlled prescription line.'),
        53:('controlledSigningDirections','Complete directions for use for every selected controlled prescription line.'),
        54:('controlledSigningRefills','Authorized repeat count for every selected Schedule III–V prescription; showing zero for Schedule II as well is a stricter display policy.'),
        55:('controlledSigningEarliestFill','Earliest fill date for every later Schedule II series member; show not applicable on other selected orders.'),
        56:('controlledSigningPrescriberName','Prescriber full name for every selected controlled prescription.'),
        57:('controlledSigningPrescriberAddress','Prescriber address for every selected controlled prescription.'),
        58:('controlledSigningDea','Prescriber DEA registration or lawful institutional/government identification for every selected controlled prescription.'),
        59:('controlledSigningLegalNotice','Display the exact legal attestation in 21 CFR 1311.140(a)(3) immediately above the Sign button; use the source text verbatim in the renderer, not this label as placeholder content.')}
    for i,(info,payload) in display_items.items():
        replace_with_review('federal-rx',i,info,payload)
    # Different legal citations can share one actual capture. Do not ask for
    # the same patient name/address/sig/registration twice on controlled Rx.
    for fed,ca in [(3,0),(4,1),(9,4),(12,7)]:
        enc=DECISIONS['federal-rx',fed]['proposedEncoding']
        shared=copy.deepcopy(DECISIONS['ca-statutes',ca]['proposedEncoding']['elements'][0])
        enc['elements']=[shared]
        for q in enc['entries']:
            q['element']=shared['id']
    # Visibility of result flags is also ordinary new info content.
    replace_with_review('entrenched',52,'resultAbnormalFlags','Every component of the selected result with reference range and explicit abnormal flag (or normal status); retain existing resultDetail/trend reviews.',workflow_screens='w2Result',commit='ackResult',when='always')
    DECISIONS['entrenched',52]['fitReason']='Add a resultAbnormalFlags InfoSpec with explicit per-result content binding and a no-receipt ackResult review. The existing abstract abnormalResult flag alone does not show that content, but a new named info is supported without a new language feature.'
    # False flags never meet valueSatisfies. A finite code is the right model.
    r = DECISIONS['cms', 8]
    e = r['proposedEncoding']['elements'][0]
    e.update(kind='coded', valueSet='no-prn')
    r['proposedEncoding']['entries'][0]['allowed'] = ['notPrn']
    r['fitReason'] = 'Require notPrn on the dedicated restraint-order artifact, using an explicit allowed code. A false flag is invalid for a required entry, so this is not a flag default.'
    # The formulary already uses scheduleII, not schedule-II.
    for r in DECISIONS.values():
        if r['fit'] == 'spec-data':
            for q in r['proposedEncoding']['entries']:
                q['when'] = q['when'].replace('schedule-II', 'scheduleII')
    # Avoid redefining an existing text element with a different kind.
    r = DECISIONS['ca-title22',84]['proposedEncoding']
    r['elements'][0]['id'] = r['entries'][0]['element'] = 'edArrivalComplaint'
    # A general administration can use mg, units or volume. Store the actual
    # dose-with-unit description, without claiming structured unit validation.
    r = DECISIONS['ca-title22',9]['proposedEncoding']
    r['elements'][0].update(kind='coded', unit=None, valueSet='dose-with-unit')
    # Existing spec element definitions are reused exactly.
    r = DECISIONS['ca-title22',12]['proposedEncoding']
    r['elements'][0]['prefill'] = 'defaultConfirm'
    # The existing class covers II-IV only; Schedule V is legally controlled.
    for key in [('ca-statutes',7)] + [('federal-rx',i) for i in [0,3,4,6,7,9,10,11,12,45]]:
        enc = DECISIONS[key]['proposedEncoding']
        q = copy.deepcopy(enc['entries'][0])
        q['when'] = 'orderClass controlled-V'
        enc['entries'].append(q)
        enc['formularyData'] = {'controlled-V': 'Tag Schedule V products in Ehr.Formulary; no new language constructor. Do not use controlled-II-IV for Schedule V.'}
    # Prohibition on actual Schedule II refill, not zero additional repeats.
    r = DECISIONS['federal-rx',18]
    enc = r['proposedEncoding']
    enc['entries'][0]['allowed'] = ['0']
    enc['elements'].append(dict(id='refillScheduleEligibility',kind='coded',unit=None,valueSet='refill-schedule-eligibility',enteredBy=['physician','np'],prefill='never',friction='compliance',humanOnly=True,linkedFrom=None,recordFact=None,fhirTarget='Task.extension.refillScheduleEligibility'))
    enc['elements'].append(dict(id='refillRefills',kind='quantity',unit='none',valueSet=None,enteredBy=['physician','np'],prefill='defaultConfirm',friction='compliance',humanOnly=False,linkedFrom=None,recordFact=None,fhirTarget='MedicationRequest.dispenseRequest.numberOfRepeatsAllowed'))
    enc['elements'].append(dict(id='drug',kind='coded',unit=None,valueSet='formulary',enteredBy=PRESCRIBERS,prefill='defaultConfirm',friction='safety',humanOnly=False,linkedFrom=None,recordFact=None,fhirTarget='MedicationRequest.medicationCodeableConcept'))
    enc['elements'].append(dict(id='refillDecision',kind='coded',unit=None,valueSet='approve-deny-modify',enteredBy=['physician','np'],prefill='defaultConfirm',friction='safety',humanOnly=False,linkedFrom=None,recordFact=None,fhirTarget='Task.businessStatus'))
    enc['elements'].append(dict(id='refillDenyReason',kind='coded',unit=None,valueSet='refill-deny-reason',enteredBy=['physician','np'],prefill='defaultConfirm',friction='compliance',humanOnly=False,linkedFrom=None,recordFact=None,fhirTarget='Task.statusReason'))
    enc['commits'].append(dict(id='approveRefill',roles=['physician','np']))
    enc['commits'].append(dict(id='denyRefill',roles=['physician','np']))
    enc['entries'].append(dict(commit='approveRefill',element='refillRefills',when='orderClass scheduleII',perOrderLine=False,allowed=['0']))
    enc['entries'].append(dict(commit='approveRefill',element='refillScheduleEligibility',when='always',perOrderLine=False,allowed=['notScheduleII']))
    enc['entries'].append(dict(commit='approveRefill',element='drug',when='always',perOrderLine=False,allowed=None))
    enc['entries'].append(dict(commit='approveRefill',element='refillDecision',when='always',perOrderLine=False,allowed=['approve','modify']))
    enc['entries'].append(dict(commit='denyRefill',element='refillDecision',when='always',perOrderLine=False,allowed=['deny']))
    enc['entries'].append(dict(commit='denyRefill',element='refillDenyReason',when='always',perOrderLine=False,allowed=None))
    enc['placement'].append(dict(screen='w7Decision',workflow='W7',location='Explicit human schedule-eligibility selection before approveRefill; Schedule II routes to the new-prescription composer.'))
    r['fitReason'] = 'For new Schedule II prescriptions, require refills=0 per line under existing orderClass scheduleII. W7 has no current drug orderLines, so a conditional constraint alone is vacuous: require a human notScheduleII eligibility code on every refill decision, route Schedule II to signOrders as a new prescription, and bind a drug capture to its selected order slot when using the extra refillRefills constraint. This is an explicitly human-verified schedule gate, not automatic classification of the incoming Task.'
    enc['prerequisites'] = ['W7: capture existing drug element on the selected request order slot (human confirmation); never assume an incoming Task creates orderLines. For Schedule II disable approve and route to a fresh signOrders composer; the human eligibility gate is still required because the current language cannot derive a request classification. Denials should be handled by a separate denyRefill commit with no refill issuance effect.']
    # Avoid duplicate placements after explicit W7 augmentation.
    enc['placement'] = list({p['screen']: p for p in enc['placement']}.values())
    # Actual screens use singular names shown in the Lean source.
    r = DECISIONS['ca-title22',83]['proposedEncoding']['elements'][0]
    r['prefill'] = 'recordConfirm'
    r['recordFact'] = None
    r['fhirTarget'] = 'Encounter.hospitalization.admitSource'
    screen_fix = {'w5Immunization':'w5Immunizations'}
    for r in DECISIONS.values():
        if r['fit'] != 'spec-data':
            continue
        for p in r['proposedEncoding']['placement']:
            p['screen'] = screen_fix.get(p['screen'],p['screen'])


def normalize(s):
    return ' '.join(re.sub(r'[^\w\s]', ' ', s.casefold()).split())


def load_catalog():
    inputs = ['cms', 'ca-title22', 'ca-statutes', 'federal-rx']
    if (RULES/'entrenched.json').exists():
        inputs.append('entrenched')
    if (RULES/'guidance.json').exists():
        inputs.append('guidance')
    seen, excluded, files = {}, [], []
    spec=(ROOT/'lean/Ehr/Specs/V1.lean').read_text()
    existing_labels={name:label for name,label in re.findall(r'def (\w+) : ElementSpec where\n.*?label := "([^"]+)"',spec,re.S)}
    for area in inputs:
        path = RULES/(area+'.json')
        assert hashlib.sha256(path.read_bytes()).hexdigest()==SOURCE_HASHES[area], ('Research input changed; review the indexed decisions before updating its pinned digest',area)
        rows = json.loads(path.read_text())
        files.append(dict(path=str(path.relative_to(ROOT)), rows=len(rows), sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
        for i, src in enumerate(rows):
            if not (src.get('binding') is True or (src.get('basis') == 'entrenched' and (src.get('entrenchedBecause') or '').strip())):
                excluded.append(dict(file=files[-1]['path'], id=src['id'], reason='Not binding and no entrenched basis with a concrete reason.'))
                continue
            key = normalize(src['citation']), normalize(src['proposedRule'])
            decision_key = ('entrenched' if area == 'guidance' else area, i)
            assert decision_key in DECISIONS, ('Missing reviewed decision', area, i, src['id'])
            decision = copy.deepcopy(DECISIONS[decision_key])
            loc = dict(file=files[-1]['path'], id=src['id'], index=i)
            if key in seen:
                r = seen[key]
                assert r['fit'] == decision['fit'], ('Dedup classification conflict', key)
                if src['id'] not in r['sourceIds']:
                    r['sourceIds'].append(src['id'])
                r['sourceLocations'].append(loc)
                r['workflows'] = sorted(set(r['workflows'] + src['workflows']))
                r['personas'] = sorted(set(r['personas'] + src['personas']))
                continue
            r = copy.deepcopy(src)
            # Keep research guesses under sourceAssessment to distinguish
            # audited decisions from the prior lane's proposed mappings.
            old = {k:r.pop(k,None) for k in ['commit','encoding','specMapping','existingInSpec','needsCoreFeature']}
            r['sourceAssessment'] = old
            r['basis'] = 'law' if r['binding'] else 'entrenched'
            r.update(sourceIds=[src['id']], sourceLocations=[loc], **decision)
            r['existingInSpec'] = r['fit']=='existing'
            r['needsCoreFeature'] = r['fit'].split(':',1)[1] if r['fit'].startswith('core-feature:') else None
            if r['fit'] == 'spec-data':
                enc=r['proposedEncoding']
                # Discharge-planning content also gates the actual ED
                # disposition path, not merely a navigable surgery screen.
                if 'W3' in r['workflows'] and any(c['id']=='discharge' for c in enc['commits']):
                    enc['commits'].append(dict(id='disposition',roles=['physician','np']))
                    enc['entries'] += [dict(q,commit='disposition') for q in list(enc['entries']) if q['commit']=='discharge']
                    if not any(p['workflow']=='W3' for p in enc['placement']):
                        enc['placement'].append(dict(screen='w3Disposition',workflow='W3',location='Discharge-planning section above disposition; require explicit not-applicable findings for non-discharge dispositions as a stricter UI policy.'))
                    r['fitReason']+=' On the ED disposition path, duplicate this gate at disposition with truthful not-applicable findings for other dispositions (a stricter hospital UI policy).'
                if 'W7' in r['workflows'] and any(c['id']=='signOrders' for c in enc['commits']) and not any(p['workflow']=='W7' for p in enc['placement']):
                    screen='w7Sign' if enc['reviews'] or any(p['screen'].endswith('Sign') for p in enc['placement']) else 'w7Orders'
                    enc['placement'].append(dict(screen=screen,workflow='W7',location='New-prescription branch of the refill workflow; ordinary repeats still use w7Decision. Inherit all signOrders safety/content gates.'))
                for e in enc['elements']:
                    e['label']=existing_labels.get(e['id'],' '.join(re.sub(r'([A-Z])',r' \1',e['id']).split()).capitalize())
                for c in enc['commits']:
                    c['label']=' '.join(re.sub(r'([A-Z])',r' \1',c['id']).split()).capitalize()
                # Encoding placements are authoritative for implementation;
                # retain broad research applicability separately.
                r['encodingWorkflows'] = sorted({p['workflow'] for p in enc['placement']})
                enc['workflowRoutes']=[dict(fromWorkflow=w,screen=next((p['screen'] for p in enc['placement'] if p['workflow']==w),enc['placement'][0]['screen']),shared=w not in r['encodingWorkflows']) for w in r['workflows']]
            seen[key] = r
    catalog = list(seen.values())
    return catalog, files, excluded


def table(headers, rows):
    def cell(s):
        return str(s).replace('|','\\|').replace('\n',' ')
    return '\n'.join(['| '+' | '.join(headers)+' |', '| '+' | '.join(['---']*len(headers))+' |'] + ['| '+' | '.join(map(cell,row))+' |' for row in rows])+'\n'


def fit_base(r):
    return 'core-feature' if r['fit'].startswith('core-feature:') else r['fit']


def count_table(catalog, field, values):
    return table([field, 'existing', 'spec-data', 'core-feature', 'out-of-scope', 'Total'],
        [[v]+[sum(v in r[field] and fit_base(r)==f for r in catalog) for f in ['existing','spec-data','core-feature','out-of-scope']]+[sum(v in r[field] for r in catalog)] for v in values])


DEMO_IDS = [
    ('federal-rx',18),('cms',79),('cms',81),('ca-title22',21),('ca-title22',22),
    ('federal-rx',68),('federal-rx',72),('federal-rx',73),('ca-title22',8),('ca-title22',9),
    ('ca-title22',10),('ca-title22',11),('ca-title22',12),('ca-title22',83),('ca-title22',84),
    ('ca-title22',82),('ca-title22',86),('ca-title22',3),('ca-title22',23),('cms',60),
    ('cms',69),('cms',70),('cms',71),('cms',72),('cms',73),('ca-statutes',30),
    ('federal-rx',45),('ca-statutes',100),('ca-statutes',101),('entrenched',37),
    ('federal-rx',59),('federal-rx',50),('federal-rx',48),
]


# Consolidated source context and lasting implementation limits.
CATALOG_CONTEXT = r"""## Most demo-worthy rules

The top-30 table above focuses on spec-data. These additional source-research candidates include existing, core-feature and out-of-scope obligations; a suggested demonstration is not a claim that the current checker implements it. Descriptions reflect the 2026-10-31 research baseline; current implementation is recorded by each rule's `encodedIn`. CMS implanted-device guidance remains an excluded nonbinding row in `cms.json`, retained here as research context.

- **Adult violent-restraint orders have a four-hour renewal limit, subject to stricter state law.** [42 CFR §482.13(e)(8)(i)(A)](https://www.ecfr.gov/current/title-42/section-482.13) — `cms-482.13-e8iA-adult-four-hours` (binding regulation).
- **Violent restraint/seclusion triggers a qualified face-to-face evaluation within one hour.** [42 CFR §482.13(e)(12)](https://www.ecfr.gov/current/title-42/section-482.13) — `cms-482.13-e12-face-to-face-hour` (binding regulation).
- **Orders without a stated time/dose count stop automatically under the medical-staff policy.** [42 CFR §482.25(b)(5)](https://www.ecfr.gov/current/title-42/section-482.25) — `cms-482.25-b5-automatic-stop` (binding regulation).
- **A preadmission H&P needs the documented update within 24 hours after admission/registration and before surgery/anesthesia.** [42 CFR §482.24(c)(4)(i)(B)](https://www.ecfr.gov/current/title-42/section-482.24) — `cms-482.24-c4iB-hp-update-timing` (binding regulation).
- **A qualified anesthesia provider completes/documents the preanesthesia evaluation within the 48-hour preprocedure window.** [42 CFR §482.52(b)(1)](https://www.ecfr.gov/current/title-42/section-482.52) — `cms-482.52-b1-pre-48hours` (binding regulation).
- **Post-discharge goals of care travel to the follow-up provider at discharge; a displayed summary does not prove transmission.** [42 CFR §482.43(b)](https://www.ecfr.gov/current/title-42/section-482.43) — `cms-482.43-b-send-goals` (binding regulation).
- **Payment or insurance inquiries cannot delay emergency screening or required stabilizing care.** [42 CFR §489.24(d)(4)(i)](https://www.ecfr.gov/current/title-42/section-489.24) — `cms-489.24-d4i-no-payment-delay` (binding regulation).
- **Pending transfer records are sent as soon as practicable afterward, without requiring every pending test before transfer.** [42 CFR §489.24(e)(2)(iii)](https://www.ecfr.gov/current/title-42/section-489.24) — `cms-489.24-e2iii-packet-late-records` (binding regulation).
- **22 CCR §70223(d)(2), (e)** — Pre-op screening tests must be appropriate to the patient and accomplished and recorded within 72 hours; preserve the dire-emergency exception. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70223) (`ca-title22-70223-screening-72-hours`).
- **22 CCR §70215(a)(1)** — Receiving-unit RN assessment is required on transfer arrival; an assessment in the sending unit does not discharge the new obligation. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70215) (`ca-title22-70215-transfer-assessment`).
- **22 CCR §70263(g)** — A verbal medication order needs prescriber/furnisher countersignature within 48 hours; demonstrate a deadline queue tied to the actual order. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70263) (`ca-title22-70263-verbal-countersign-48h`).
- **22 CCR §70749(a)(6)(D)** — Capture restraint removal time, alongside application time and type; preserve the narrow soft-tie support/protection timestamp exception. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70749) (`ca-title22-70749-restraint-end`).
- **22 CCR §70263(m)(3)** — Patient-brought medicines need physician/pharmacist examination and positive identification after arrival; an RN barcode scan cannot substitute. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70263) (`ca-title22-70263-home-drug-identify`).
- **22 CCR §70233(a)(4)** — Record the amount of blood or blood fractions administered during anesthesia; estimated blood loss is a different datum. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70233) (`ca-title22-70233-blood-amount`).
- **22 CCR §70547(i)** — Newborn oxygen orders need review, modification or discontinuation after 24 hours; the source does not prescribe automatic cessation at exactly 24 hours. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70547) (`ca-title22-70547-newborn-oxygen-24h`).
- **22 CCR §70537(d)** — Pediatric-bed placement above age 13 needs pediatrician approval in unusual circumstances and a documented reason; this is not an outpatient age limit. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70537) (`ca-title22-70537-pediatric-over13`).
- **22 CCR §70707.1(a)(4)** — Ordinary sterilization consent has a 30–180-day interval; demonstrate exception-specific facts rather than a generic emergency bypass. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70707.1) (`ca-title22-70707-1-sterilization-minimum-wait`).
- **22 CCR §70707.6(a)(3)** — Medi-Cal sterilization cannot use the elective voluntary shorter-wait request available to non-Medi-Cal patients; preserve separately qualified medical exceptions. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70707.6) (`ca-title22-70707-6-medi-cal-no-elective-short-wait`).
- **Correct the CURES surgical exemption:** qualifying procedure prescriptions can be nonrefillable **seven-day** supplies; V1 still names `surgery-5-day`. [HSC §11165.4(c)(4)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=11165.4), `ca-statutes-hsc-11165-4-procedure-seven-day`.
- **Suppress excluded CURES reporting:** testosterone and mifepristone must not enter the reporting feed, operative January 2026. This is distinct from consultation. [HSC §11165(k)(1)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=11165), `ca-statutes-hsc-11165-excluded-drugs-reporting`.
- **Validate unused ED take-home medication:** the new 2026 pathway excludes controlled drugs and has five conjunctive conditions, each separately cataloged. [BPC §4068(b)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=4068), `ca-statutes-bpc-4068-unused-ed-noncontrolled` and four companion rows.
- **Keep minor demographics out of CAIR:** never export paragraph-13 SOGISC/sex-assigned-at-birth data for an under-18 patient; adult answers are voluntary. [HSC §120440(c)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=120440), `ca-statutes-hsc-120440-no-minor-sogisc`.
- **Preserve every EHR edit/deletion:** automatic audit evidence includes the actor, access time and actual change. [Civil Code §56.101(b)(1)(B)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=56.101), `ca-statutes-civ-56-101-preserve-edits` and three companion rows.
- **Keep the 5150 clock across transfers:** calculate from first detention, not receiving-facility arrival. [WIC §5150(a)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=5150), `ca-statutes-wic-5150-hold-start`.
- **Respect the psychotropic consent boundary:** §6924 outpatient mental-health self-consent alone does not authorize psychotropic medication without parent/guardian consent. [Family Code §6924(f)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=FAM&sectionNum=6924), `ca-statutes-fam-6924-psychotropic-exclusion`.
- **Document homeless-discharge transportation offers:** the destination qualifies within 30 minutes **or** 30 miles; acceptance is not mandatory. [HSC §1262.5(o)(10)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=1262.5), `ca-statutes-hsc-1262-5-homeless-transport`.
- **Obtain telehealth consent before care:** verbal or written consent is allowed and must be documented. [BPC §2290.5(b)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=2290.5), `ca-statutes-bpc-2290-5-telehealth-consent` and companion documentation row.
- **Keep patient corrections with exports:** disclosure of a disputed record portion includes its qualifying patient addendum. [HSC §123111(b)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=123111), `ca-statutes-hsc-123111-disclose-addendum`.
- **Reject a refill on an original Schedule III–IV prescription older than six months.** [21 CFR §1306.22(a)](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-21.xml?part=1306) — `federal-rx-1306-22-six-months`.
- **Reject a controlled-Rx signing screen that hides the prescribed quantity during two-factor signing.** [21 CFR §1311.120(b)(9)(iv)](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-21.xml?part=1311) — `federal-rx-1311-120-display-quantity`.
- **Require two distinct authentication-factor categories for controlled e-prescribing.** [21 CFR §1311.115(a)](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-21.xml?part=1311) — `federal-rx-1311-115-two-factors`.
- **Editing a ready controlled prescription invalidates its prior readiness and requires another review.** [21 CFR §1311.120(b)(10)](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-21.xml?part=1311) — `federal-rx-1311-120-edit-review`.
- **Immediately revoke hospital EPCS signing access after notice of a compromised authentication factor.** [21 CFR §1311.130(d)(1)](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-21.xml?part=1311) — `federal-rx-1311-130-compromised-factor`.
- **Require VIS delivery before administration of a covered vaccine.** [42 U.S.C. §300aa-26(d)](https://www.govinfo.gov/content/pkg/USCODE-2024-title42/pdf/USCODE-2024-title42-chap6A-subchapXIX-part2-subpartc-sec300aa-26.pdf) — `federal-rx-300aa-26-vis-before-dose`.
- **Keep the vaccine lot number required when recording the covered dose; V1 already does this.** [42 U.S.C. §300aa-25(a)(2)](https://www.govinfo.gov/content/pkg/USCODE-2024-title42/pdf/USCODE-2024-title42-chap6A-subchapXIX-part2-subpartc-sec300aa-25.pdf) — `federal-rx-300aa-25-lot`.
- **Reject oral-liquid prescribing units other than mL in the certified eRx module.** [45 CFR §170.315(b)(3)(ii)(E)](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-45.xml?part=170) — `federal-rx-170-315-oral-liquids-ml`.
- **`entrenched-ismp-weight-metric`** — Reject pounds as the clinical dosing-weight unit; v1 already enforces kg.
- **`entrenched-npg-two-identifiers`** — Preserve two-person-specific-identifier verification; a pinned banner alone is insufficient.
- **`entrenched-ismp-mtx-daily-indication`** — Require oncologic-indication verification for daily oral methotrexate orders.
- **`entrenched-safer-maximum-daily-dose`** — Check cumulative daily medication dose before dispensing submission.
- **`entrenched-safer-result-escalation`** — Escalate unacknowledged life-threatening results automatically, even with no open inbox.
- **`entrenched-npg-suicide-screen`** — Use a validated suicide screen for eligible behavioral-health ED patients aged 12 or older.
- **`entrenched-leapfrog-bcma-wrong-patient`** — Validate bedside barcode-to-patient matching; a scan field alone does not establish a match.
- **`entrenched-ismp-select-doublechecks`** — Preserve independent checks for selected highest-risk medications; distinct cosigners alone do not prove independence.
- **`entrenched-npg-timeout-performer-change`** — Repeat the time-out when another procedure on the same patient has a different performer.
- **`entrenched-npg-pain-intervention-response`** — Link pain reassessment to the intervention and document the response.

The first-pass spec-data plan has been executed; `catalog.json` records `encodedIn` per rule. `lean/Ehr/Specs/Rules/feature_data.py` is the executable second-pass mapping. The following contracts remain relevant when extending or auditing the implementation; the recorded encodings do not establish full backend or clinical compliance.

## Encoding scope and backend limits

1. Add/reuse ElementSpec definitions in `lean/Ehr/Specs/V1.lean`, then append the entries/commits in each catalog `proposedEncoding`. Add no new When, ValueKind or AlertCond constructor in this lane. New commits are listed in each rule’s `proposedEncoding`; retain the existing role universe.
2. Reuse existing fields exactly where named (`postOpDiet`, `adminSite`, `arrivalMode`, `refills`, `refillRefills`). Add gates to formerly optional fields. Reuse `opTechnique`/`opTissuesRemovedAltered` across CMS/Title 22 citations, and one field/requirement per equivalent encoding. Keep distinct citation ids in the documentation map. Do not change existing chiefComplaint into coded: use `edArrivalComplaint` for the ED-specific non-empty capture.
3. New open narrative values use `.coded "nonempty-narrative"` (or the indicated named open string domain). In the current implementation every coded value must be non-empty, but domain membership is checked only with EntryReq.allowed. Render these open domains as labeled editable inputs; terminology widgets are optional UI presentation, not a guarantee. Dates/times are labeled ISO-8601 strings, without a claim of date validation. For dose-with-unit use one non-empty actual dose description; no mg-only assumption for insulin/volume doses.
4. All new fields are `.never` unless explicitly listed otherwise. No unsupported fromRecord source, clinical default, fabricated not-applicable finding or non-human safety check. A permitted default requires human confirmation. Coded allowed alternatives implement negative/exception outcomes; false required flags do not pass. Friction and humanOnly are explicit in JSON.
5. Screen names are listed in each rule’s `proposedEncoding.placement`; proposed screens must be added to that workflow module’s `screens` and navigator. Keep required captures reachable within design.maxDepth, one capture per element/order slot per path, and no required content in closed groups/unopened tabs. Where infos/reviews are specified, render exact displayContent via the existing named-panel binding (including all order/result rows), then pin a panel with that InfoSpec id beside the commit. No placeholders. All new reviews use shownOnCommit, version="", no receipt and no waiver; windowMin and waivedBy are null. No new alerts are proposed.
6. Dedicated artifact commits do not prove universal clinical coverage. Configure the canonical artifact action and backend mapping so the named commit exclusively creates that artifact. All prescription-issuance variants must inherit `orderSigningEntries`, `orderSigningReviews`, relevant preop requirements, interruptive alerts and human signing. `signScheduleIISeries` and `signEmergencyRxFollowup` are issuance variants; they must include all base prescription fields and shared new prescription-content constraints. New nursing/specialty-note commits inherit relevant patient/role/safety requirements. The catalog’s commits entries give allowed roles; they do not verify real licensure.
7. `fhirTarget` entries describe resource/section mapping intent, not a new untyped backend escape hatch. Use actual resource references for identity/DEA/address payloads in the backend; extension names are local mapping proposals. Add all new element ids to the content/export mapping and `docs/regulations.md`, preserving law versus entrenched labels. Implementing a section text field alone does not certify exported C-CDA, NCPDP SCRIPT, registry delivery or permanent retention.
8. Regenerate content exports with the repository’s existing content/export commands. Check canonical completeness plus the relevant guard rejection/acceptance paths; preserve existing seeded-bad behavior and all theorem/check contracts. No Types/properties weakening to make content pass.

## Special cases that prevent false compliance

- **Schedule II / W7:** `refills` has `allowed=["0"]`, `perOrderLine=true`, `.orderClass "scheduleII"` on signOrders and all issuance variants. On w7Decision, explicitly capture `drug` on the request slot and require human `refillScheduleEligibility` with `allowed=["notScheduleII"]` before approveRefill; add the conditional refillRefills zero constraint only after that slot exists. A Schedule II request routes to a fresh new-prescription composer, never to refill approval with zero repeats. Add a separate denyRefill record action so refusals remain possible. The human schedule judgment is not an automatic predicate. The core-language lane would need an explicit refill-request drug predicate for automatic checking.
- **Controlled Schedule V:** controlled-II-IV excludes V. Add `controlled-V` tags to the relevant formulary products and duplicate the indicated per-line content/readiness requirements with `.orderClass "controlled-V"`. Add `ghb` tagging for ghbMedicalNeed. Do not add fake classes to unknown drugs; document actual products supported by the finite demo formulary.
- **Naloxone education alternatives:** remove only the old naloxoneEducation entry gate from `orderSigningEntries`, replacing it with naloxoneEducationOutcome under `.naloxoneRisk`. Keep naloxoneOffer human-only. Provided/declined/educatedWithin24Months are human-reported truthful outcomes, not verified historical facts. Other overdose-risk and recipient branches remain core-feature rows.
- **Controlled signing panels:** implement the 13 named controlledSigning* payloads as live views of the selected prescription artifacts. One expanded signing-details group can contain all panels; keep it open and legible. Copy the shownOnCommit constraints to controlled Schedule V and every new issuance variant. Keep details and the legal notice visible throughout the modeled human signing action. Authentication duration and protocol correctness remain separate security/backend obligations. Missing source values must be visibly missing and resolved through the corresponding content gate; declaring an InfoSpec with a label is not payload implementation.
- **New series/emergency/specialty commits:** extra required fields are not a replacement for the base order/clinical guards. Compose requirements from existing functions and the new shared prescription content/reviews; do not maintain a less-protected parallel sign path. Dedicated series entries iterate actual orderLines; call newOrderLine and capture drug before per-line requirements can apply.
- **Record artifacts:** apply each new event/document commit to its own episode/artifact state. Do not repeatedly reuse one still-captured episode flag as proof of all administrations, all shifts or every later event. Cross-event evidence reset and historical completeness are explicitly core features. The event-specific spec-data rows capture one artifact’s content; they do not discharge those broader rules.


### Artifact routing and verification

`proposedEncoding.workflowRoutes` records shared-screen routes: preserve patient/encounter and return to the originating workflow. Only the named roles may commit; other roles may view or hand off. A navigation link does not prove artifact creation. ED discharge-planning fields gate disposition directly; W7 new-prescription screens inherit every `signOrders` gate. Per-line captures bind to `.current` or the selected order slot, never an unbound episode slot.

New commits need a resource-producing backend action, a human-only button and a canonical navigator route; `CommitSpec` alone is not an adapter. No new commit may broaden access to a protected action. Validate the JSON with `python -m json.tool docs/rules/catalog.json`; run the content checks in `docs/STATUS.md`, including missing-field and wrong-role rejections, confirmations, negative coded outcomes and mixed Schedule II/non-II lines. The research builder's `--check` also checks generated-file drift, but rebuilding the research baseline overwrites content encoding metadata: rerun `lean/Ehr/Specs/Rules/encode.py` and the second-pass content mapping afterward. Timing, vocabulary validation, recurrent-event coverage and actual delivery require their own implemented features and evidence.

## Research provenance and scope

These are dated research notes, inherited from the source lanes rather than a new verification. The JSON source rows retain quotes, URLs, confidence, notes and partial mappings. Counts and coverage classifications above supersede the source-lane baseline summaries. Hospital-only duties apply to hospital services, including their outpatient activities, and do not automatically extend to independent offices. Proposed alerts, gates and friction are UI choices; no source mandates their exact interaction.

### CMS

Researched 2026-10-31. Regulatory wording was checked against the official [eCFR API, Part 482](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-42.xml?part=482) and [Part 489](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-42.xml?part=489), as of 2026-10-29. Several human-readable eCFR pages returned access blocks; the official XML supplied complete text. CMS guidance was checked in [State Operations Manual Appendix A, revision 248, issued September 18, 2026](https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/downloads/som107ap_a_hospitals.pdf), including rendered PDF pages 474, 486 and 490. Guidance rows identify their survey tags and PDF pages and remain `binding: false`.

Each JSON row contains an exact source excerpt of no more than 25 words. General hospital duties also apply to hospital outpatient services; W1/W2/W5/W7 assignments do not extend these CoPs automatically to independent offices. Workflow counts overlap.

CMS source mappings used existing v1 names; null commits identify missing clinical boundaries. Anesthesia rows relate to W6/P5, but the baseline lacked a qualified anesthesia-provider persona. Admission/procedure/restraint/recovery deadlines are not review-receipt windows. The source notes preserve emergency exceptions, outpatient H&P alternatives, violent/nonviolent restraint scope and EMTALA transfer alternatives. Source quote checks normalized PDF whitespace only.

### California Title 22

**Sources and currency.** Text opened on **2026-10-31** from Cornell LII reproductions of CCR Title 22, Division 5, Chapter 1. Every quote is verbatim after whitespace normalization and at most 25 words. All 120 rows are `verified: true` for opened, matched text; all have **medium confidence** because LII advertises quarterly updates without a displayed through-date and official Westlaw currentness could not be confirmed. Verification does not assert that the mirror is current. Each row repeats that currency note.

**Scope.** W1/W5/W7 mappings apply when those activities belong to the regulated hospital/service; these citations do not impose general requirements on independent physician offices. W3 includes admission/transfer paths. Pediatric-bed and neonatal/perinatal rows are service-specific workflow extensions. Surgical/anesthesia staff, equipment and space sections (§§70225–70235), nursing policies (§70213), and pediatric neighbors were reviewed without inventing patient-entry requirements from physical staffing or equipment duties. Cornell’s §70217 repeal heading conflicts with [Westlaw’s indexed staffing text](https://govt.westlaw.com/calregs/Document/IB0822FCB5B6111EC9451000D3A7C4BC3?viewType=FullText); full Westlaw access failed, so no staffing-ratio rule or repeal conclusion is included.

### California statutes

Previously cataloged subjects are identified in row notes as references or atomic expansions, not new discoveries: notably R2-08, R2-09, R2-17, R2-18 and R2-23. The full six-month CURES review rule, ordinary records-request deadlines, pregnancy/STI minor-consent rules and general POLST-treatment rule remain in `docs/regulations.md`; they are not re-proposed here.

Leginfo reader URLs returned HTTP 403. The actual text opened was the Legislature’s [official bulk database](https://downloads.leginfo.legislature.ca.gov/pubinfo_2025.zip), listed as updated **2026-10-25** on the [official download index](https://downloads.leginfo.legislature.ca.gov/). Each row records the exact `LAW_SECTION_TBL.dat` entry’s referenced LOB filename, update metadata and amendment/effective/operative history. The canonical reader URL is retained for convenient human access. Quotes are literal substrings after whitespace normalization; their maximum length is **19 words**. These are public statutory texts, not quotes invented from summaries.

Recent operative changes include AB 665/AB 816 (2024 minor consent), AB 2115 (2024 direct dispensing), AB 3281 (2025 CMIA text), SB 957 (2026 CAIR), AB 447 (2026 ED dispensing), AB 1503 (2026 pharmacy/prescription text), SB 402 (2026 telehealth section) and the current SB 497 chaptering of §11165 (operative 2026). Metadata timestamps are not enactment dates. This is a dated source snapshot, not an exhaustive survey of every 2026 enactment or future effective provision.

### Federal prescriptions and health IT

CFR quotes were checked against official eCFR point-in-time XML for **2026-10-29**, read on October 31: [DEA prescriptions](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-21.xml?part=1306), [EPCS](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-21.xml?part=1311), [ONC](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-45.xml?part=170), [information blocking](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-45.xml?part=171), and [HIPAA](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-45.xml?part=164). Catalog CFR URLs link to the exact dated part XML opened for verification; the citation identifies the section and paragraph. HTML reader pages served automated-access challenges and additional section-API requests were rate-limited; neither was treated as verification. Quotes were verified against the successfully retrieved official part XML. Vaccine statute quotations come from the official 2024 U.S. Code PDFs linked in the rows, corroborated against current LII text; their listed amendment histories end in 1987 and 1993. CDC VIS-documentation rows remain classified as guidance.

**HTI-1:** use DSI §170.315(b)(11), not expired CDS (a)(9). Standalone problem/medication/allergy criteria (a)(6)–(8) are reserved; current reconciliation duties are in (b)(2). **HTI-4:** revised eRx transactions permit the adopted SCRIPT alternatives through 2027, then require the newer standard from 2028; this does not make CMS-0057-F drug prior authorization mandatory for hospitals. [Official HTI-4 dates](https://healthit.gov/resources/hti-4-overview-and-key-dates-for-certification-program/).

**HTI-5:** the [final rule and amendatory instructions](https://www.federalregister.gov/documents/full_text/xml/2026/10/28/2026-21943.xml) were opened. Most changes take effect **2026-12-28**; instructions 7, 10 and 12 take effect **2027-01-01**. CPOE, drug-interaction checks, demographics and implantable-device criteria remain. DSI source-attribute/risk-management paragraphs (b)(11)(iv)–(vi) are removed in December; the citation-attribute row is explicitly time-limited. Feedback survives under a new paragraph number. Transition-summary creation remains through 2029, expiring January 2030. Patient VDT remains. Do not apply proposed removals as final law.

**USCDI:** [§170.213](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-45.xml?part=170) adopts v3, with v1 expired January 2026. The official [2022-2 bulletin](https://healthit.gov/standards-onc-technology/onc-standards-bulletin/onc-standards-bulletin-2022-2/) verifies medication-dose membership; the patient-view application is labeled medium-confidence inference. V4 is a voluntary SVAP option, verified in the [official 2024 SVAP announcement](https://healthit.gov/blog/health-it/advancements-in-health-it-oncs-approved-svap-standards-for-2024/) and [current VDT instructions](https://healthit.gov/test-method/view-download-and-transmit-to-3rd-party/), not a universal hospital capture mandate. Raw archived v3/v4 PDFs returned 403, so no v4-only element obligation is asserted. [Current enforcement discretion](https://healthit.gov/certification-health-it/enforcement-discretion-notices/) qualifies specified demographic requirements; the catalog does not assert those as unconditional duties.

**Access:** HIPAA minimum necessary has exceptions, including treatment disclosures/requests and access by the individual. Its 30-day request-response limit is not permission to delay portal results. Information blocking requires case-specific assessment, legally required restrictions, and applicable exceptions; a blanket clinician-review embargo is only described as likely interference in ONC guidance.

**FDA:** [§201.25, official XML](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-21.xml?part=201) was opened. Its barcode-label duty addresses manufacturers, repackers, relabelers and distributors; it does not impose hospital wristband/medication scanning. No such hospital mandate is manufactured here. Drug-specific REMS duties are not generalized without a verified applicable program. DEA central-fill/retail-transfer provisions (§§1306.14–.15, .24–.27) were not promoted into general prescriber or bedside requirements.

### Entrenched practice

Previously documented rules are retained only as baseline context or atomic decompositions, with round-1/round-2 relationships identified in notes. In particular, R2-10 abbreviation controls and R2-15 time-out subjects are not claimed as newly discovered requirements. `existingInSpec` refers to executable v1 content, not whether an earlier research note mentioned a proposal.

**SAFER:** the CMS hook is mandatory annual self-assessment, not mandatory implementation of every recommendation. The [CMS FY2026 final-rule fact sheet](https://www.cms.gov/newsroom/fact-sheets/fy-2026-hospital-inpatient-prospective-payment-system-ipps-long-term-care-hospital-prospective-0) confirms all eight 2025 guides from CY2026. The current ONC landing page still links older measure language; the final CMS statement controls this date claim. The 2025 guide PDFs retain August 2024 worksheet footers.

**Leapfrog:** thresholds measure institutional performance: CPOE 85%, serious-error test detection 60% for adult/general hospitals, bedside BCMA in all applicable units, and scanning compliance at least 95%. These are purchaser standards, not a claim that every hospital has the same payer contract. Four aggregate rules are explicitly not statically encodable.

**Clinical scope:** suicide screening is not a blanket screen of every ED patient; WHO details apply only within an adopted checklist. Leapfrog verifies the adapted WHO checklist hook for designated complex procedures, not every detail of the original WHO form. No universal pain reassessment minute limit or critical-result deadline is invented. ISMP recommends selecting high-risk double checks, not applying them indiscriminately to every high-alert drug.

Removed from the earlier partial catalog: generic ACIP/growth-chart recommendations, general ASA preparation recommendations, broad high-alert catalog membership presented as an alert requirement, and CDC stewardship/vaccine suggestions without a lane-specific entrenched basis. CDC opioid recommendations were excluded because a particular payer/state adoption of those thresholds was not independently verified here; the earlier R2-16 proposal remains in `docs/regulations.md`. No CURES/naloxone statutes or other law were reclassified as entrenched.

#### Source audit

Quotes are brief verbatim excerpts with exact EP/RP locators; the proposed rule paraphrases the atomic practice. No inaccessible source was retained as verified. Page numbers are from the cited edition, including the October Leapfrog revision.

| Opened official source | Catalog use |
|---|---|
| [Joint Commission 2026 Hospital NPG chapter](https://digitalassets.jointcommission.org/api/public/content/9ca80055182b4274842a5780a94f2c82?v=149a13a9) | NPG.01.01.01, .01.02.01, .01.06.02–.03; NPG.06.02.01; NPG.08.01.01; NPG.14.03.01–.14.05.01 |
| [Joint Commission terminology FAQ 000001229](https://www.jointcommission.org/en-us/knowledge-library/support-center/standards-interpretation/standards-faqs/000001229) | Public prohibited-list policy; updated April 21, 2026 |
| [Joint Commission hospital pain FAQ 000001329](https://www.jointcommission.org/en-us/knowledge-library/support-center/standards-interpretation/standards-faqs/000001329) | Patient-appropriate reassessment criteria/tools and high-risk opioid monitoring; current NPG framing |
| [ISMP 2026–2027 hospital best practices](https://online.ecri.org/hubfs/ISMP/Resources/ISMP_TargetedMedicationSafetyBestPractices_Hospitals.pdf) | BP 2, p. 4; BP 3, p. 5; BP 19, p. 18 |
| [ISMP error-prone abbreviations, 2024](https://online.ecri.org/hubfs/ISMP/Resources/ISMP_ErrorProneAbbreviation_List.pdf) | Dose units, frequency/directions, drug names and decimals |
| [2025 SAFER CPOE](https://healthit.gov/wp-content/uploads/2025/06/SAFER-Guide-3.-CPOE-Final.pdf) | RP 1.2, 2.1, 2.2, 2.3 |
| [2025 SAFER Test Results](https://healthit.gov/wp-content/uploads/2025/06/SAFER-Guide-8.-Test-Results-Reporting-Final.pdf) | RP 2.2, 2.3, 2.5–2.8, 3.4 |
| [2025 SAFER Patient Identification](https://healthit.gov/wp-content/uploads/2025/01/Safer-Guide-6.-Patient-Identification-Final.pdf) | RP 1.2, 1.4, 1.6, 2.5 |
| [Leapfrog 2026 Hospital Survey, version 2, October 20](https://www.leapfroggroup.org/sites/default/files/Files/2026%20HospitalSurvey_20261020_v9.2%20(version%202).pdf) | Section 2, p. 58; Section 3B adopted checklist and measurement specifications |
| [WHO Surgical Safety Checklist, 2009](https://healthcluster.who.int/docs/librariesprovider16/meeting-reports/quality-toolkit/h.-surgical-safety-checklist.pdf?download=true&sfvrsn=6a8b581d_5) | Adopted sign-in, time-out and sign-out items; conditional scope |

Validation passed: JSON parsing of both deliverables; exact schema keys/enums; 98 unique IDs and distinct proposed rules per file; all mapped elements/info/commits exist in v1; all quotes at most 25 words; 94 PDF excerpts matched downloaded official text and page locators, with four FAQ excerpts checked against the opened official pages. The JSON copies are byte-identical.
"""

def write_outputs(catalog, files, excluded):
    (RULES/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
    counts = collections.Counter(fit_base(r) for r in catalog)
    group_counts = collections.Counter(r['needsCoreFeature'] for r in catalog if r['needsCoreFeature'])
    basis = collections.Counter(r['basis'] for r in catalog)
    lines = ['Catalog-module rules are encoded; core keeps only denyRefill for W7 denial tasks.\n',
        '# Rules catalog and classification\n',
        'Generated from reviewed decisions in `scripts/rules/build_catalog.py`. Baseline: the checked-in `lean/Ehr/Specs/V1.lean` and `lean/Ehr/Core/Types.lean`, not pending content-lane work. Research input digests are pinned so a reorder/update cannot silently reuse the wrong indexed decision. The deliverable is a classification and implementation plan; it does not change the Lean spec.\n',
        f"Read {sum(f['rows'] for f in files)} source rows; excluded {len(excluded)} nonqualifying rows; retained {len(catalog)} unique rules after citation + atomic-requirement de-duplication. Basis: {basis['law']} law, {basis['entrenched']} entrenched. Distinct citations remain distinct legal rules even when their encodings can share a field. The two guidance-lane files are compatibility mirrors, not twice as many rules. `sourceIds` keeps every distinct source id, and `sourceLocations` keeps every file occurrence, including identical ids in mirrors.\n",
        'The source `verified`, quotes, URLs, confidence and notes are preserved, not newly certified here. Research guesses are retained under `sourceAssessment`; only `fit`, `fitReason`, `existingSpecItems` and `proposedEncoding` are the audited classification. Source JSON basis omissions on binding rules are normalized to `law`. Nonbinding rows are accepted only with `basis: entrenched` and a concrete `entrenchedBecause`; accreditation, self-assessment and local checklist adoption are not relabeled law.\n',
        '## Totals\n',table(['Fit','Rules'],[(f,counts[f]) for f in ['existing','spec-data','core-feature','out-of-scope']]),
        table(['Basis','existing','spec-data','core-feature','out-of-scope','Total'],[[b]+[sum(r['basis']==b and fit_base(r)==f for r in catalog) for f in ['existing','spec-data','core-feature','out-of-scope']]+[basis[b]] for b in ['law','entrenched']]),
        'Workflow/persona tables count research applicability, with overlap: one rule may count in several rows. The implementation table counts exact proposed placements. Workflow or persona membership does not by itself make a legal obligation universal.\n',
        count_table(catalog,'workflows',['W'+str(i) for i in range(1,8)]),
        count_table(catalog,'personas',['P'+str(i) for i in range(1,6)]),
        '### Spec-data implementation placements\n',
        table(['Workflow','Unique spec-data rules placed'],[(w,sum(r['fit']=='spec-data' and w in r['encodingWorkflows'] for r in catalog)) for w in ['W'+str(i) for i in range(1,8)]]),
        '## Classification limits and encoding conventions\n',
        '- `existing` means the abstract UI already enforces the named capture/action, not full legal, clinical, certification or backend compliance. Optional elements alone never qualify. All patient truth, authentic role membership and physical care still depend on trusted inputs.\n'
        '- Open narrative captures use `.coded "nonempty-narrative"`: the existing coded parser accepts any non-empty string. This is deliberately an open string domain, not a claim of terminology validation. Existing `.text` accepts an empty string; even the existing finding/diagnosis mappings do not prove meaningful clinical content. A production non-empty text contract would belong in `value-validation`.\n'
        '- A valueSet name alone never enforces a finite set. Every finite enum in this plan supplies `EntryReq.allowed`; quantities use unscaled human strings such as `"0"` (the parser converts to tenths). Required flags must be true; negative outcomes use allowed coded alternatives.\n'
        '- New dedicated commits are ordinary `CommitSpec` data for a particular artifact, not invented `When` cases. Their guards only apply when that artifact is created. They do not prove every clinically required artifact was created or that any physical event occurred. Event deadlines, eligibility, recurring coverage and all-record completeness stay core features. The canonical program must route artifact creation exclusively through its named commit; backend effects must honor the same mapping. `workflowRoutes` explicitly maps broad source applicability to shared canonical screens; it is navigation data, not a new When.\n'
        '- Required routes marked broader than law (for example all-discharge needs assessments or explicit none/not-applicable values) are proposed hospital UI policies. They must not fabricate findings or claim a new statutory requirement.\n'
        '- New InfoSpec identifiers with concrete payload bindings are spec-data: implement their content through the existing named-panel renderer, then require shownOnCommit. A missing panel or display field alone is not a new language feature. Structured-display features are reserved for new semantic relations such as a signing-button label, per-list selection emphasis or workflow-phase scoping. Visibility of a placeholder panel never satisfies the intended content binding.\n'
        '- All ordinary new captures use `.never` to avoid unsupported record sources. Existing `recordValue` can read arbitrary named record pairs, but versioned review receipts currently recognize only unversioned/allergy/medication versions. New reviews use unversioned InfoSpec plus shownOnCommit and no receipt; freshness comes from the live artifact binding, not an invented version fact. The plan does not invent a new receipt version, waiver, patient predicate or alert trigger. Null `windowMin`/`waivedBy` means no receipt/waiver is proposed.\n'
        '- Schedule II zero-refill constraints use the existing `scheduleII` formulary tag. Incoming W7 requests do not automatically create order lines. The plan explicitly adds drug capture and a human schedule-eligibility gate; denying a request and authorizing a refill must have distinct backend effects.\n'
        '- All new prescription issuance commits inherit the complete relevant `signOrders` entries/reviews/alerts and safety steps; new note/order specialty commits inherit analogous applicable base requirements. Adding a specialist commit must not create a route around the base contract. No proposed field alone certifies EPCS, external transmission, imported records or irreversible signatures.\n',
        '## Core-feature proposals\n',
        'Primary groups partition the rules for counting. Some rules require more than one extension (for example age-specific restraint expiration); the prose names dependencies. Costs include Types/JSON/semantics/guard/checker/render and focused proof/check updates: S = isolated data-sized change (<1 engineer-day), M = roughly 2–4 engineer-days, L = roughly 1–2+ engineer-weeks. Estimates are planning judgments, not hackathon delivery promises, and exclude production clinical/security/backend integrations.\n',
        table(['Group','Rules','Cost'],[(g,group_counts[g],GROUPS[g][0]) for g in sorted(group_counts)]),
    ]
    for g in sorted(group_counts):
        lines.extend([f'### `{g}` — {group_counts[g]} rules, {GROUPS[g][0]}\n',GROUPS[g][1]+'\n'])
    lines.extend(['No `external-transmission` or `audit-log` feature group is proposed: actual delivery and durable/immutable audit obligations are classified out-of-scope under the requested UI-checker boundary.\n',
        '## Top 30 demo-worthy spec-data rules\n',
        'Ranked for visible hard stops, reusable fields and persona coverage. Same encoding under different citations is still a separate legal rule; technique/tissue duplicates can be demonstrated once. These rankings do not convert proposed policy into law.\n'])
    # Prefer unique demo encodings before secondary citations.
    index = {(loc['file'].split('/')[-1][:-5],loc['index']):r for r in catalog for loc in r['sourceLocations']}
    selected, enc_seen = [], set()
    candidates = [index[k] for k in DEMO_IDS if k in index] + [r for r in catalog if r['fit']=='spec-data']
    for r in candidates:
        if r['fit']!='spec-data' or r in selected:
            continue
        key = tuple(e['id'] for e in r['proposedEncoding']['elements'])+tuple(e['id'] for e in r['proposedEncoding']['infos'])
        if key in enc_seen:
            continue
        enc_seen.add(key)
        selected.append(r)
        if len(selected)==30:
            break
    lines.append(table(['Rank','Rule / source','Field(s) / info(s)','Gate / placement'],[(i+1,f"{r['title']} (`{r['id']}`)",', '.join(e['id'] for e in r['proposedEncoding']['elements']+r['proposedEncoding']['infos']),', '.join(c['id'] for c in r['proposedEncoding']['commits'])+' / '+', '.join(p['screen'] for p in r['proposedEncoding']['placement'])) for i,r in enumerate(selected)]))
    lines.append(CATALOG_CONTEXT)
    lines.extend(['## Input audit\n',table(['File','Rows','SHA-256'],[(f['path'],f['rows'],f['sha256']) for f in files]),
        table(['Encoding baseline','SHA-256'],[(p,hashlib.sha256((ROOT/p).read_bytes()).hexdigest()) for p in ['lean/Ehr/Core/Types.lean','lean/Ehr/Specs/V1.lean','docs/design/core-model.md','docs/hackathon/BRIEF.md']]),
        '### Excluded source rows\n',table(['File','ID','Reason'],[(r['file'],r['id'],r['reason']) for r in excluded]),
        '### Spot-checked primary sources\n',
        'The source-law research is inherited. Two decisive classification points were spot-checked against current official text: the [Schedule II no-refill rule](https://www.ecfr.gov/current/title-21/chapter-II/part-1306/section-1306.12) and the distinction between operative content and actual surgical timing in [CMS surgical services](https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-482/subpart-D/section-482.51). No blanket legal completeness or currency verification is claimed.\n'])
    (RULES/'catalog.md').write_text('\n'.join(lines))


def validate(catalog, files, excluded):
    assert len({r['id'] for r in catalog})==len(catalog)
    valid_roles = set(ALL)
    valid_when = {'always','naloxoneRisk','abnormalResult','highAlertMed','weightBased'}
    valid_fits = {'existing','spec-data','out-of-scope'} | {'core-feature:'+g for g in GROUPS}
    spec = (ROOT/'lean/Ehr/Specs/V1.lean').read_text()
    # Compare every proposed reused element against its actual Lean shape.
    shapes = {}
    for name,block in re.findall(r'def (\w+) : ElementSpec where\n(.*?)(?=\n(?:/|def |end |namespace )|\Z)',spec,re.S):
        m = re.search(r'kind := \.(\w+)(?: \.?(?:"([^"]+)"|(\w+)))?',block)
        if not m:
            continue
        pre = re.search(r'prefill := \.(\w+)',block)
        shapes[name] = (m[1],m[2] or m[3],pre[1])
    existing_commits = set(re.findall(r'def (\w+) : CommitSpec', spec))
    new_commits = {}
    for r in catalog:
        if r['fit'] != 'spec-data':
            continue
        for c in r['proposedEncoding']['commits']:
            if c['id'] not in existing_commits:
                assert c['id'] not in new_commits or new_commits[c['id']] == c['roles'], ('Conflicting commit roles', c)
                new_commits[c['id']] = c['roles']
    global_elements = {}
    for r in catalog:
        assert r['binding'] is True or (r['basis']=='entrenched' and r['entrenchedBecause'].strip())
        assert r['fit'] in valid_fits and r['fitReason']
        assert r['sourceIds'] and r['sourceLocations']
        if r['fit']=='existing':
            assert r.get('existingSpecItems')
        if r['fit']!='spec-data':
            continue
        enc = r['proposedEncoding']
        assert enc['windowMin'] is None and enc['waivedBy'] is None
        assert not enc['alerts']
        for inf in enc['infos']:
            assert re.fullmatch('[a-z][A-Za-z0-9]*',inf['id'])
            assert inf['version']==''
            assert enc.get('displayContent',{}).get(inf['id'])
        for q in enc['reviews']:
            assert q['info'] in {inf['id'] for inf in enc['infos']}
            assert q['commit'] in {c['id'] for c in enc['commits']}
            assert q['mode']=='shownOnCommit' and q['waivedBy'] is None
            assert q['when'] in valid_when or re.fullmatch(r'(orderClass|drugClass|medClass|encounter) [\w-]+',q['when'])
        elements = {e['id']:e for e in enc['elements']}
        for e in elements.values():
            assert re.fullmatch('[a-z][A-Za-z0-9]*',e['id'])
            assert e['kind'] in ['coded','flag','quantity','text','identity','scan','cosign']
            assert set(e['enteredBy'])<=valid_roles
            assert e['prefill'] in ['never','recordConfirm','defaultConfirm','autoLinked']
            assert e['friction'] in ['safety','compliance']
            assert not e['humanOnly'] or e['prefill']=='never'
            if e['kind']=='quantity':
                assert e['unit'] in ['kg','lb','g','mg','mcg','mL','mgPerKg','units','none']
            if e['kind']=='coded':
                assert e['valueSet']
            signature = (e['kind'],e['unit'],e['valueSet'],tuple(sorted(e['enteredBy'])),e['prefill'],e['friction'],e['humanOnly'],e['fhirTarget'])
            assert e['id'] not in global_elements or global_elements[e['id']]==signature, ('Conflicting element',e['id'],global_elements.get(e['id']),signature)
            global_elements[e['id']]=signature
            if e['id'] in shapes:
                kind,param,prefill=shapes[e['id']]
                assert (e['kind'], e['unit'] if kind=='quantity' else e['valueSet'] if kind=='coded' else None,e['prefill'])==(kind,param,prefill), ('Reused element mismatch',e['id'],shapes[e['id']],e)
        for q in enc['entries']:
            assert q['element'] in elements
            assert q['commit'] in {c['id'] for c in enc['commits']}
            assert q['when'] in valid_when or re.fullmatch(r'(orderClass|drugClass|medClass|encounter) [\w-]+',q['when'])
            assert isinstance(q['perOrderLine'],bool)
            if elements[q['element']]['kind']=='flag':
                assert q['allowed'] in [None,['true']]
        for p in enc['placement']:
            assert p['workflow'] in ['W'+str(i) for i in range(1,8)]
            assert p['screen'].startswith(p['workflow'].lower())
    all_occurrences = sum(len(r['sourceLocations']) for r in catalog)+len(excluded)
    assert all_occurrences == sum(f['rows'] for f in files)
    print(json.dumps(dict(rules=len(catalog),sourceRows=all_occurrences,excluded=len(excluded),fit=collections.Counter(fit_base(r) for r in catalog),groups=collections.Counter(r['needsCoreFeature'] for r in catalog if r['needsCoreFeature']),specDataPlacements={w:sum(r['fit']=='spec-data' and w in r['encodingWorkflows'] for r in catalog) for w in ['W'+str(i) for i in range(1,8)]}),indent=2))


if __name__=='__main__':
    import sys
    if '--profile-note-only' in sys.argv:
        # Preserve encoding metadata added by encode.py and feature_encode.py.
        path = RULES / 'catalog.md'
        note = 'Catalog-module rules are encoded; core keeps only denyRefill for W7 denial tasks.\n\n'
        text = path.read_text()
        previous = 'Catalog-module rules are encoded but switched off under the core profile.\n\n'
        if text.startswith(previous):
            text = text[len(previous):]
        if not text.startswith(note):
            path.write_text(note + text)
        sys.exit(0)
    adjust_decisions()
    catalog, files, excluded = load_catalog()
    validate(catalog,files,excluded)
    paths = [RULES/f for f in ['catalog.json','catalog.md']]
    before = {p:p.read_bytes() if p.exists() else None for p in paths}
    write_outputs(catalog,files,excluded)
    if '--check' in sys.argv:
        changed = [str(p.relative_to(ROOT)) for p in paths if before[p]!=p.read_bytes()]
        assert not changed, ('Generated catalog drift',changed)
