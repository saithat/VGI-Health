import Ehr.Canonical.Program
import Ehr.Core.Interp
import Ehr.Canonical.FeatureExamples

/-! Concrete synthetic documentation for human-event regressions. Values are
explicit clinical examples, never defaults in a released program. Dates are
ISO strings, not assertions that the core validates dates or elapsed time. -/
namespace Ehr.Canonical.LegalExamples

/-- Synthetic artifact values used only by walkthrough tests. Missing samples
remain missing, so adding an untested requirement cannot silently pass. -/
def values : List (ElementId × String) :=
  [("restraintCarePlanChange", "One-to-one observation and least restrictive soft restraint; reassess circulation and remove promptly."),
   ("restraintOrderMode", "oneTime"), ("restraintPrn", "notPrn"),
   ("restraintBehavior", "Repeatedly pulling central line despite redirection."),
   ("restraintIntervention", "Bilateral soft wrist restraint for immediate line safety."),
   ("restraintAlternatives", "Reorientation, family presence and sitter attempted without sustained effect."),
   ("restraintCondition", "Awake, agitated; distal perfusion intact."),
   ("restraintResponse", "Stopped pulling line; circulation and breathing remain intact."),
   ("restraintContinuationReason", "Continues reaching for central line when released."),
   ("selfAdministrationOrder", "true"),
   ("selfAdministrationCapacity", "Alert, understands dose and demonstrates correct inhaler use."),
   ("selfAdministrationTeaching", "Teach-back completed for scheduled dose and reporting use to nurse."),
   ("selfAdministrationSecurity", "Labeled supply in secured bedside lockbox."),
   ("patientOwnedMedicationIdentity", "Pharmacy verified labeled lisinopril 10 mg tablets against home prescription."),
   ("patientOwnedMedicationIntegrity", "Original container intact; expiry and tablet identity verified by pharmacy."),
   ("admittingDiagnosis", "K35.80 acute appendicitis"),
   ("hospitalizationOutcome", "Recovered after uncomplicated appendectomy; tolerating diet and ambulatory."),
   ("postHospitalNeeds", "Wound check and assistance with dressings for two days."),
   ("postHospitalServiceAvailability", "Surgery clinic appointment available in two weeks; home nurse available tomorrow."),
   ("postHospitalServiceAccess", "Patient has transport and coverage; family can assist with dressings."),
   ("dischargePlanningEvaluation", "Evaluated mobility, wound care, medication access, transport and caregiver support."),
   ("dischargeEvaluationDiscussion", "Reviewed home plan and service choices with patient and spouse; questions answered."),
   ("opTechnique", "Laparoscopic appendectomy: mesoappendix divided and appendiceal base stapled; hemostasis confirmed."),
   ("opTissuesRemovedAltered", "Appendix and mesoappendix removed and sent to pathology."),
   ("treatmentOrder", "Change abdominal dressing daily; notify surgery for spreading erythema or drainage."),
   ("postOpDiet", "Regular diet as tolerated"),
   ("progressWorkingDiagnosis", "K35.80 appendicitis, postoperative day one"),
   ("nursingCareProvided", "Assisted ambulation, wound care and scheduled medications."),
   ("nursingObservations", "Alert, afebrile; wound clean and dry; pain improved."),
   ("nursingIncidents", "No incidents during this assessment interval."),
   ("nursingInterpretation", "Stable postoperative recovery; continue mobilization and pain monitoring."),
   ("administeredDrug", "insulin lispro"), ("administeredDose", "2 units"),
   ("actualAdministrationTime", "2026-10-31T10:00:00-07:00"),
   ("actualAdministrationRoute", "subcutaneous"), ("adminSite", "left abdomen"),
   ("restraintType", "Soft wrist restraint, bilateral"),
   ("restraintApplicationTime", "2026-10-31T09:00:00-07:00"),
   ("restraintRemovalTime", "2026-10-31T09:30:00-07:00"),
   ("anesthesiaPreopDiagnosis", "K35.80 acute appendicitis"),
   ("hospitalCourse", "Admitted with appendicitis; laparoscopic appendectomy; diet advanced and pain controlled."),
   ("futureCareRecommendations", "Wound care daily; avoid heavy lifting; return for fever or worsening pain."),
   ("futureCareArrangements", "Surgery clinic visit booked in two weeks; family transport confirmed."),
   ("nursingDiagnosis", "Acute postoperative pain and impaired mobility"),
   ("nursingPlan", "Pain goal 3/10, ambulate three times and assess wound each shift."),
   ("nursingIntervention", "Positioned comfortably, assisted walking and administered prescribed analgesia."),
   ("nursingEvaluation", "Pain 3/10 after treatment; walked safely with assistance."),
   ("verbalOrderGiver", "Dr Morgan, physician; verbal order read back and confirmed."),
   ("standingOrderCircumstances", "Postoperative nausea in an alert adult with a current antiemetic order set."),
   ("standingOrderConditions", "Assess allergies, blood pressure and QT risk; notify prescriber if symptoms persist."),
   ("bedsideMedicationOrder", "true"), ("patientOwnedMedicationOrder", "true"),
   ("anesthesiaChoiceRationale", "General anesthesia selected for laparoscopic abdominal surgery after airway and aspiration assessment."),
   ("anesthesiaBloodAmount", "250"), ("anesthesiaBloodDuration", "60"),
   ("postAnesthesiaComplications", "none"),
   ("edArrivalTime", "2026-10-31T08:30:00-07:00"), ("arrivalMode", "ambulance"),
   ("edArrivalComplaint", "Right lower quadrant pain and nausea for one day."),
   ("edDepartureTime", "2026-10-31T11:30:00-07:00"),
   ("newbornOxygenTarget", "Target SpO2 90-95 percent; titrate per neonatology order."),
   ("consentRiskDisclosure", "Discussed bleeding, infection, adjacent organ injury and anesthesia risks."),
   ("consentAlternativesDisclosure", "Discussed antibiotics, observation, surgery and risks of no treatment."),
   ("continuingCareInformationGiven", "true"),
   ("prescriptionPatientName", "Robert Kendall"),
   ("prescriptionPatientAddress", "100 Synthetic Avenue, Sacramento CA 95814"),
   ("prescriptionDirections", "Take the prescribed dose by the stated route at the stated interval for the stated duration."),
   ("prescriberLicenseClassification", "Physician and surgeon"),
   ("prescriberFederalRegistration", "DEMO-REGISTRATION-NOT-VALID"),
   ("controlledTransmissionAgentName", "Jamie Example, authorized office staff"),
   ("noFurtherControlledNeedExpected", "true"), ("telehealthConsentRecord", "verbal"),
   ("naloxoneEducationOutcome", "provided"),
   ("mentalHealthAccessRequestDate", "2026-10-31"),
   ("mentalHealthAccessDenialConsequences", "Documented individualized risk of substantial harm and discussed access through a designated professional."),
   ("minorMentalHealthParentContactDecision", "Parental involvement discussed; contact would jeopardize safety; reasons documented."),
   ("minorAssaultParentContactTime", "2026-10-31T10:00:00-07:00"),
   ("minorSubstanceParentInvolvementDecision", "Parental involvement discussed; adolescent agreed to supported contact."),
   ("holdApplicationCircumstances", "Patient described current intent to self-harm and access to means; voluntary care declined."),
   ("holdApplicationProbableCause", "Interview and observed behavior support danger to self due to mental disorder."),
   ("holdHistoryConsidered", "yes"), ("holdAdvisementPerformer", "Dr Morgan"),
   ("holdAdvisementDate", "2026-10-31T09:15:00-07:00"), ("holdAdvisementCompletion", "completed"),
   ("holdAdvisementLanguage", "English"), ("primaryLanguage", "English"), ("patientDialect", "US English"),
   ("controlledMedicalPurpose", "Short course for acute postoperative pain after assessment and medication review."),
   ("controlledProductStrength", "10 mg per tablet"), ("controlledDosageForm", "tablet"),
   ("controlledPrescriberName", "Morgan Example MD"),
   ("controlledPrescriberAddress", "200 Synthetic Avenue, Sacramento CA 95814"),
   ("ghbMedicalNeed", "Specialist-documented narcolepsy treatment indication."),
   ("emergencyAuthorizationNotation", "Authorization for Emergency Dispensing"),
   ("refillScheduleEligibility", "notScheduleII"), ("earliestFillDate", "2026-11-30"),
   ("seriesDiversionRiskAssessed", "true"), ("controlledReadyToSign", "true"),
   ("vaccineAdministrationDate", "2026-10-31"),
   ("vaccineProviderAddress", "300 Synthetic Avenue, Sacramento CA 95814"),
   ("vaccineProviderTitle", "Nurse practitioner"),
   ("suicideRiskLevel", "High acute risk based on intent, plan and access to means."),
   ("suicideMitigationPlan", "Continuous observation, remove access to means and urgent psychiatric evaluation."),
   ("methotrexateTeachBack", "true"),
   ("abxIndication", "surgical-prophylaxis"),
   ("patientIdReentry", "RK/M/58"), ("weight", "70"), ("dosingWeight", "70"),
   ("refillDecision", "approve"), ("refillDenyReason", "Request is for a Schedule II drug; new prescription evaluation required."),
   ("refillQuantity", "30"), ("refillRefills", "0"), ("refillPharmacy", "Community pharmacy"), ("refillProtocolMet", "true"),
   ("drug", "lisinopril"), ("dose", "10"), ("doseUnit", "mg"), ("route", "PO"),
   ("freq", "daily"), ("duration", "30 days"), ("quantity", "30"), ("refills", "0"),
   ("indication", "hypertension"), ("pharmacy", "Community pharmacy"), ("orderDiagnosis", "I10"),
   ("prn", "false"), ("substitution", "true"), ("consentVerified", "true"),
   ("hpUpdate", "Reviewed today; no interval change."), ("medsToHold", "Hold anticoagulants per plan."),
   ("progressNote", "Postoperative day one, afebrile; mobilize and advance diet."),
   ("naloxoneOffer", "offered-declined"), ("naloxoneEducation", "true")] ++ Features.samples

/-- Explicit samples enter through actual fields and the actual element parser. -/
def input (screen name element : String) : List Event :=
  match values.find? (·.1 == element), Ehr.Specs.V1.specV1.element? element with
  | some (_, text), some el => (parseValue el.kind text).toList.map fun v =>
      .enter (cid screen name) v
  | _, _ => []

/-- New per-line prescription values for the ordinary human ordering paths. -/
def prescription (s : ScreenId) (pre : String := "") : List Event :=
  ["prescriptionPatientName", "prescriptionPatientAddress", "prescriptionDirections",
   "prescriberLicenseClassification", "prescriberFederalRegistration", "controlledMedicalPurpose",
   "controlledProductStrength", "controlledDosageForm", "controlledPrescriberName",
   "controlledPrescriberAddress", "ghbMedicalNeed", "controlledReadyToSign", "earliestFillDate"].flatMap
    fun e => input s (pre ++ "legal." ++ e) e

/-- New captures for the existing disposition, nursing, vaccine and op-note paths. -/
def artifact (s : ScreenId) : List Event :=
  let es := ((Rules.fields.filter (·.1 == s)).map (·.2.2.1) ++
    ((canonicalV1.screen? s).toList.flatMap (·.components)).filterMap (fun c =>
      match c.kind with | .field e .. => if c.id.startsWith (s ++ ".feature.") then some e else none | _ => none)) |>.eraseDups
  es.flatMap fun e =>
    let component := (canonicalV1.screen? s).toList.flatMap (·.components) |>.find? fun c =>
      match c.kind with | .field id .. => id == e | _ => false
    match component with
    | some c =>
      match values.find? (·.1 == e), Ehr.Specs.V1.specV1.element? e with
      | some (_, text), some el => (parseValue el.kind text).toList.map (.enter c.id)
      | _, _ => []
    | none => []

end Ehr.Canonical.LegalExamples
