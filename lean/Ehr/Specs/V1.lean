import Ehr.Core.Types

/-!
# Hospital spec, version "v1"

This file is the hospital's rulebook for the EHR. It says:
- which **data elements** exist, who may enter them, and how they may be
  filled in before a human touches them;
- which **information** the screens can show;
- which **commits** (sign, give, acknowledge, discharge, …) exist, and who may
  do them;
- what each commit **requires**: elements that must be captured first
  (entry requirements) and information that must be seen first (review
  requirements);
- the **alerts**, with their trigger and tier;
- the **design rules** every screen layout must follow.

Every UI program, the canonical one and every personalized one, is checked
against this file. Anything this file does not require may change.

How to read the words used below:
- *Pre-fill policy.* `never`: a human types it. `recordConfirm`: copied from
  the record, with its source shown, and a human confirms it. `defaultConfirm`:
  a default is allowed, and a human confirms it. `autoLinked`: copied from
  another element, so it is entered only once.
- *Friction class.* `safety`: a clinical decision or a safety check; a human
  does it. `compliance`: needed for law, policy, billing, or the record; where
  the pre-fill policy allows, a pre-fill, a link, or a valid receipt may
  satisfy it. `accidental`: no rule needs it; it may be removed.
- *Human-only.* Done by a human, every time. Never pre-filled, never done by a
  macro.
- *Per order line.* Needed once for every medication order being signed.
- *Shown on the commit screen.* On the same screen as the commit button, not
  in a closed group or an unopened tab, and at a readable size.
- *Receipt.* A record that an allowed clinician reviewed the same version of
  the information within the time window.

Elements that no commit requires are optional. The canonical UI still asks for
some of them, as real EHRs do.

Owner-approved California rules:
- **CURES** (CA Health and Safety Code §11165.4): before prescribing a
  Schedule II–IV controlled substance, the prescriber checks the patient's
  CURES report (the state's controlled-substance history), or records which
  legal exemption applies.
- **Naloxone** (CA Business and Professions Code §741): when an opioid
  prescription puts the patient at higher overdose risk (90 or more morphine
  milligram equivalents a day, or an opioid with a benzodiazepine), the
  prescriber offers naloxone and gives overdose-prevention education.

Owner-approved federal rules require controlled-prescription details shown
while signing (21 CFR 1311.140), zero Schedule II refills (21 CFR 1306.12),
and vaccine record/VIS entries (42 USC 300aa-25/26). Each rule docstring starts
with Law, Entrenched (with a reason/source), Hospital policy (not law), or
Product design property. Labels classify the existing rules, not new duties.

Source audit: `docs/regulations.md` (2026-10-31). Unless a docstring says
otherwise, roles, optional fields, workflow gates, receipt windows and UI
placement are hospital design choices, not claims of legal necessity. CURES
and naloxone have statutory exceptions and schedules that this demo simplifies.
Rules intentionally stricter than law are retained and labeled below.

This is demo content for a hackathon, not clinical advice.
-/

namespace Ehr.Specs.V1

/-! ## Roles -/

/-- Product design property.
Roles that write medication orders: physicians, nurse practitioners, and
surgeons. -/
def prescribers : List Role := [.physician, .np, .surgeon]

/-- Product design property.
Every clinical role, including nurses. -/
def allClinicians : List Role := [.physician, .np, .surgeon, .rn]

/-- Product design property.
Registered nurses only. -/
def nurses : List Role := [.rn]

/-- Product design property.
Roles that may give and record vaccines. -/
def vaccinators : List Role := [.np, .physician, .rn]

/-- Product design property.
Surgeons only. -/
def surgeons : List Role := [.surgeon]

/-! ## Data elements: safety checks

Each of these is done by a human, every time. -/

/-- Hospital policy (not law): local wrong-patient-order prevention based on SAFER fallback re-entry evidence.
Patient-ID re-entry before signing orders. The clinician types the
patient's initials, sex, and age, and the system checks them against the chart.
Never pre-filled, never done by a macro.

Evidence and our policy, not law: SAFER Patient Identification (2025), fallback re-entry; docs/regulations.md §3.1 E6 and §3.3 H2. -/
def patientIdReentry : ElementSpec where
  id := "patientIdReentry"
  label := "Re-enter patient ID (initials / sex / age)"
  kind := .identity
  enteredBy := allClinicians
  prefill := .never
  friction := .safety
  humanOnly := true
  fhirTarget := "Provenance.extension.identityCheck"

/-- Entrenched: bedside patient-and-medication matching is a hospital safety benchmark (Leapfrog BCMA standard; docs/regulations.md H3).
Scan of the patient's wristband before giving a medication (one of the
"five rights").

Best practice and our policy, not a scanning mandate: 21 CFR 201.25 binds drug labelers; docs/regulations.md §3.3 H3. -/
def wristbandScan : ElementSpec where
  id := "wristbandScan"
  label := "Scan patient wristband"
  kind := .scan "wristband"
  enteredBy := nurses
  prefill := .never
  friction := .safety
  humanOnly := true
  fhirTarget := "MedicationAdministration.extension.wristbandScan"

/-- Entrenched: bedside patient-and-medication matching is a hospital safety benchmark (Leapfrog BCMA standard; docs/regulations.md H3).
Scan of the medication barcode before giving it.

Best practice and our policy, not law; 21 CFR 201.25 requires manufacturer barcodes, not hospital scanning (docs/regulations.md §3.3 H3). -/
def medScan : ElementSpec where
  id := "medScan"
  label := "Scan medication barcode"
  kind := .scan "medication"
  enteredBy := nurses
  prefill := .never
  friction := .safety
  humanOnly := true
  fhirTarget := "MedicationAdministration.extension.barcodeScan"

/-- Hospital policy (not law): local high-alert medication double-check procedure informed by ISMP, not a universal legal requirement.
Independent double check of a high-alert medication (insulin, heparin, …)
by a second nurse. The value is the second nurse's user ID, and it must differ
from the nurse giving the drug.

ISMP independent double checks (2019) and High-Alert list (2024), not law. This model checks distinct users, not blinded independent work (docs/regulations.md §3.3 H5). -/
def highAlertCosign : ElementSpec where
  id := "highAlertCosign"
  label := "Independent double check: second nurse"
  kind := .cosign
  enteredBy := nurses
  prefill := .never
  friction := .safety
  humanOnly := true
  fhirTarget := "MedicationAdministration.performer.actor"

/-- Hospital policy (not law): local pre-op signing deadline; consent laws require verification before surgery.
The surgeon confirms that a signed consent for the procedure is on file,
before pre-op orders are signed.

42 CFR 482.51(b)(2), 482.24(c)(4)(v); 22 CCR 70223(d). These require consent before surgery. Gating pre-op signing is our stricter policy (docs/regulations.md §3.2 R6). -/
def consentVerified : ElementSpec where
  id := "consentVerified"
  label := "Surgical consent verified"
  kind := .flag
  enteredBy := [.surgeon, .physician]
  prefill := .never
  friction := .safety
  humanOnly := true
  fhirTarget := "Consent.verification"

/-! ## Data elements: vital signs and rooming -/

/-- Hospital policy (not law): local kg-only dosing policy informed by ISMP Best Practice 3.
Body weight recorded today, in kilograms. It may be copied from today's
vitals with its source shown, and a human confirms it. Pounds never count.

ISMP Targeted Medication Safety Best Practices 2026–2027, BP 3 (kg only); best practice, not law (docs/regulations.md §3.1 E5). -/
def weight : ElementSpec where
  id := "weight"
  label := "Weight (kg)"
  kind := .quantity .kg
  enteredBy := allClinicians
  prefill := .recordConfirm
  recordFact? := some "weightToday"
  friction := .compliance
  fhirTarget := "Observation.valueQuantity"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Height in centimetres. -/
def height : ElementSpec where
  id := "height"
  label := "Height (cm)"
  kind := .quantity .none
  enteredBy := allClinicians
  prefill := .recordConfirm
  friction := .compliance
  fhirTarget := "Observation.valueQuantity"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Head circumference in centimetres (children under 3). -/
def headCircumference : ElementSpec where
  id := "headCircumference"
  label := "Head circumference (cm)"
  kind := .quantity .none
  enteredBy := allClinicians
  prefill := .never
  friction := .compliance
  fhirTarget := "Observation.valueQuantity"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Systolic blood pressure (mmHg). -/
def bpSystolic : ElementSpec where
  id := "bpSystolic"
  label := "BP systolic (mmHg)"
  kind := .quantity .none
  enteredBy := allClinicians
  prefill := .never
  friction := .compliance
  fhirTarget := "Observation.component.valueQuantity"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Diastolic blood pressure (mmHg). -/
def bpDiastolic : ElementSpec where
  id := "bpDiastolic"
  label := "BP diastolic (mmHg)"
  kind := .quantity .none
  enteredBy := allClinicians
  prefill := .never
  friction := .compliance
  fhirTarget := "Observation.component.valueQuantity"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Heart rate (beats per minute). -/
def heartRate : ElementSpec where
  id := "heartRate"
  label := "Heart rate (/min)"
  kind := .quantity .none
  enteredBy := allClinicians
  prefill := .never
  friction := .compliance
  fhirTarget := "Observation.valueQuantity"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Respiratory rate (breaths per minute). -/
def respRate : ElementSpec where
  id := "respRate"
  label := "Respiratory rate (/min)"
  kind := .quantity .none
  enteredBy := allClinicians
  prefill := .never
  friction := .compliance
  fhirTarget := "Observation.valueQuantity"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Body temperature (degrees Celsius). -/
def temperature : ElementSpec where
  id := "temperature"
  label := "Temperature (°C)"
  kind := .quantity .none
  enteredBy := allClinicians
  prefill := .never
  friction := .compliance
  fhirTarget := "Observation.valueQuantity"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Oxygen saturation (percent). -/
def spo2 : ElementSpec where
  id := "spo2"
  label := "SpO₂ (%)"
  kind := .quantity .none
  enteredBy := allClinicians
  prefill := .never
  friction := .compliance
  fhirTarget := "Observation.valueQuantity"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Pain score (0–10) taken before a pain medication is given. The patient is
asked each time, so it is human-only.

Per-dose pain scoring is our hospital policy; 22 CCR 70215(a)(1) requires a general RN assessment per shift, not per dose (docs/regulations.md §3.1 E13). -/
def painScore : ElementSpec where
  id := "painScore"
  label := "Pain score (0–10)"
  kind := .coded "pain-0-10"
  enteredBy := allClinicians
  prefill := .never
  friction := .safety
  humanOnly := true
  fhirTarget := "Observation.valueInteger"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Pain score (0–10) taken again after a pain medication has had time to work.

Hospital policy modeled on pain reassessment practice; the 2026 accreditation ID was not verified (docs/regulations.md §3.1 E13). -/
def painReassessment : ElementSpec where
  id := "painReassessment"
  label := "Pain reassessment (0–10)"
  kind := .coded "pain-0-10"
  enteredBy := nurses
  prefill := .never
  friction := .safety
  humanOnly := true
  fhirTarget := "Observation.valueInteger"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
The reason for the visit, in the patient's words. It may be copied from the
appointment, and a human confirms it. -/
def chiefComplaint : ElementSpec where
  id := "chiefComplaint"
  label := "Chief complaint"
  kind := .text
  enteredBy := allClinicians
  prefill := .recordConfirm
  recordFact? := some "appointmentReason"
  friction := .compliance
  fhirTarget := "Encounter.reasonCode"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Tobacco use status (never / former / current). -/
def tobaccoUse : ElementSpec where
  id := "tobaccoUse"
  label := "Tobacco use"
  kind := .coded "tobacco-status"
  enteredBy := allClinicians
  prefill := .recordConfirm
  friction := .compliance
  fhirTarget := "Observation.valueCodeableConcept"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Fall-risk screening question for adults. -/
def fallRiskScreen : ElementSpec where
  id := "fallRiskScreen"
  label := "Fall in the past year?"
  kind := .coded "yes-no"
  enteredBy := allClinicians
  prefill := .recordConfirm
  friction := .compliance
  fhirTarget := "QuestionnaireResponse.item.answer"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Two-question depression screen (PHQ-2). Overdue screening also shows up as
a care gap.

Our realism choice; no legal mandate verified in docs/regulations.md §6. -/
def depressionScreen : ElementSpec where
  id := "depressionScreen"
  label := "Depression screen (PHQ-2 score)"
  kind := .coded "phq2-score"
  enteredBy := allClinicians
  prefill := .recordConfirm
  friction := .compliance
  fhirTarget := "QuestionnaireResponse.item.answer"

/-- Product design property.
Recent-travel screening question. No rule needs it. -/
def travelScreen : ElementSpec where
  id := "travelScreen"
  label := "Travel outside the country in the past 30 days?"
  kind := .coded "yes-no"
  enteredBy := allClinicians
  prefill := .defaultConfirm
  friction := .accidental
  fhirTarget := "QuestionnaireResponse.item.answer"

/-- Product design property.
"Has the patient been asked about an advance directive?" No rule needs it
at every visit. -/
def advanceDirectiveAsked : ElementSpec where
  id := "advanceDirectiveAsked"
  label := "Advance directive discussed"
  kind := .flag
  enteredBy := allClinicians
  prefill := .defaultConfirm
  friction := .accidental
  fhirTarget := "QuestionnaireResponse.item.answer"

/-- Product design property.
"Does the patient need an interpreter?" The preferred language is already in
the patient banner, so asking again is accidental. -/
def interpreterNeeded : ElementSpec where
  id := "interpreterNeeded"
  label := "Interpreter needed?"
  kind := .coded "yes-no"
  enteredBy := allClinicians
  prefill := .defaultConfirm
  friction := .accidental
  fhirTarget := "QuestionnaireResponse.item.answer"

/-- Product design property.
"Is the pharmacy on file correct?" asked during rooming. The pharmacy is
asked again on each prescription, so this is accidental. -/
def pharmacyConfirmedRooming : ElementSpec where
  id := "pharmacyConfirmedRooming"
  label := "Preferred pharmacy confirmed"
  kind := .flag
  enteredBy := allClinicians
  prefill := .defaultConfirm
  friction := .accidental
  fhirTarget := "Patient.extension.preferredPharmacy"

/-- Product design property.
A second "I reviewed the allergies" checkbox in the order composer. The
allergy list is already a review requirement, so this is accidental. -/
def allergyReconfirmOrdering : ElementSpec where
  id := "allergyReconfirmOrdering"
  label := "I have reviewed the patient's allergies (ordering)"
  kind := .flag
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .accidental
  fhirTarget := "AuditEvent.entity"

/-- Product design property.
A third "I reviewed the allergies" checkbox before signing. Accidental, for
the same reason. -/
def allergyReconfirmSigning : ElementSpec where
  id := "allergyReconfirmSigning"
  label := "Allergies re-verified before signing"
  kind := .flag
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .accidental
  fhirTarget := "AuditEvent.entity"

/-! ## Data elements: medication reconciliation -/

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
The decision for one current medication: continue, stop, or modify. The
canonical UI shows one row per medication (rows are numbered like order lines). -/
def medRecDecision : ElementSpec where
  id := "medRecDecision"
  label := "Medication reconciliation decision"
  kind := .coded "continue-stop-modify"
  enteredBy := allClinicians
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "MedicationStatement.status"

/-! ## Data elements: the visit note -/

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
History of present illness. A template or the last note may be copied in,
and a human confirms it. -/
def hpi : ElementSpec where
  id := "hpi"
  label := "History of present illness"
  kind := .text
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "Composition.section[hpi].text"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Review of systems. -/
def ros : ElementSpec where
  id := "ros"
  label := "Review of systems"
  kind := .text
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "Composition.section[ros].text"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Physical exam. -/
def exam : ElementSpec where
  id := "exam"
  label := "Physical exam"
  kind := .text
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "Composition.section[exam].text"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Assessment and plan. -/
def assessmentPlan : ElementSpec where
  id := "assessmentPlan"
  label := "Assessment and plan"
  kind := .text
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "Composition.section[assessment-plan].text"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
The diagnosis for this visit (ICD-10). It is the source that order and
claim diagnoses are linked from. -/
def visitDiagnosis : ElementSpec where
  id := "visitDiagnosis"
  label := "Visit diagnosis (ICD-10)"
  kind := .coded "icd10"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .safety
  fhirTarget := "Encounter.diagnosis.condition"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
The diagnosis on the insurance claim. It is linked from the visit
diagnosis, so it should be entered once. The canonical UI displays its linked copy with source provenance. -/
def claimDiagnosis : ElementSpec where
  id := "claimDiagnosis"
  label := "Billing diagnosis (ICD-10)"
  kind := .coded "icd10"
  enteredBy := prescribers
  prefill := .autoLinked
  friction := .compliance
  linkedFrom? := some "visitDiagnosis"
  fhirTarget := "Claim.diagnosis.diagnosisCodeableConcept"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Level of service (E/M code) for billing. -/
def levelOfService : ElementSpec where
  id := "levelOfService"
  label := "Level of service"
  kind := .coded "em-level"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "ChargeItem.code"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
When the patient should come back. -/
def followUp : ElementSpec where
  id := "followUp"
  label := "Follow-up"
  kind := .coded "follow-up-interval"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "ServiceRequest.occurrenceTiming"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Instructions printed on the after-visit summary. -/
def patientInstructions : ElementSpec where
  id := "patientInstructions"
  label := "Patient instructions"
  kind := .text
  enteredBy := allClinicians
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "DocumentReference.content"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Age-appropriate anticipatory guidance given at a pediatric visit. -/
def anticipatoryGuidance : ElementSpec where
  id := "anticipatoryGuidance"
  label := "Anticipatory guidance"
  kind := .text
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "CarePlan.activity.detail.description"

/-! ## Data elements: one medication order line

A prescription has one order line per drug. Most of these are required on
every line (see `orderSigningEntries`). -/

/-- Law: 22 CCR 70263(g), (h)(4).
The drug (formulary name). Order sets and preference lists may fill it in,
and a human confirms it. -/
def drug : ElementSpec where
  id := "drug"
  label := "Medication"
  kind := .coded "formulary"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .safety
  fhirTarget := "MedicationRequest.medicationCodeableConcept"

/-- Law: 22 CCR 70263(g), (h)(4).
The dose, in milligrams. -/
def dose : ElementSpec where
  id := "dose"
  label := "Dose (mg)"
  kind := .quantity .mg
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .safety
  fhirTarget := "MedicationRequest.dosageInstruction.doseAndRate.doseQuantity"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
The dose unit as printed on the label (mg, tablet, mL, …). -/
def doseUnit : ElementSpec where
  id := "doseUnit"
  label := "Dose unit"
  kind := .coded "dose-unit"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "MedicationRequest.dosageInstruction.doseAndRate.doseQuantity.unit"

/-- Law: 22 CCR 70263(g); requiring the oral route too is stricter hospital policy.
The route (by mouth, IV, …). A default is allowed; a human confirms it. -/
def route : ElementSpec where
  id := "route"
  label := "Route"
  kind := .coded "route"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "MedicationRequest.dosageInstruction.route"

/-- Law: 22 CCR 70263(g), (h)(4).
How often (daily, twice a day, …). A default is allowed; a human confirms it. -/
def freq : ElementSpec where
  id := "freq"
  label := "Frequency"
  kind := .coded "frequency"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "MedicationRequest.dosageInstruction.timing"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
For how long (for example 10 days, or ongoing). -/
def duration : ElementSpec where
  id := "duration"
  label := "Duration"
  kind := .coded "duration"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "MedicationRequest.dispenseRequest.expectedSupplyDuration"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
How much the pharmacy dispenses (number of tablets, mL, …). -/
def quantity : ElementSpec where
  id := "quantity"
  label := "Dispense quantity"
  kind := .quantity .none
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "MedicationRequest.dispenseRequest.quantity"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Number of refills allowed. -/
def refills : ElementSpec where
  id := "refills"
  label := "Refills"
  kind := .quantity .none
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "MedicationRequest.dispenseRequest.numberOfRepeatsAllowed"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
What the drug is for, in plain words for the label ("for blood pressure"). -/
def indication : ElementSpec where
  id := "indication"
  label := "Indication"
  kind := .text
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "MedicationRequest.reasonCode.text"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Where the prescription goes. It may be copied from the pharmacy on file,
and a human confirms it. -/
def pharmacy : ElementSpec where
  id := "pharmacy"
  label := "Pharmacy"
  kind := .coded "pharmacy"
  enteredBy := prescribers
  prefill := .recordConfirm
  recordFact? := some "preferredPharmacy"
  friction := .compliance
  fhirTarget := "MedicationRequest.dispenseRequest.performer"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Whether the pharmacy may substitute a generic.

A required yes/no decision. Coded rather than a checked acknowledgment, so a confirmed no is valid; this representation is our design. -/
def substitution : ElementSpec where
  id := "substitution"
  label := "Generic substitution allowed"
  kind := .coded "boolean"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "MedicationRequest.substitution.allowedBoolean"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Whether the drug is taken only as needed (PRN).

A required yes/no decision. Scheduled (false) and PRN (true) are both valid; this is not an acknowledgment checkbox. -/
def prn : ElementSpec where
  id := "prn"
  label := "As needed (PRN)"
  kind := .coded "boolean"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "MedicationRequest.dosageInstruction.asNeededBoolean"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
The diagnosis this order is for (ICD-10). It is linked from the visit
diagnosis, so it should be entered once. The canonical UI shows a linked copy on each
order line, so it need not be transcribed again. -/
def orderDiagnosis : ElementSpec where
  id := "orderDiagnosis"
  label := "Associated diagnosis (ICD-10)"
  kind := .coded "icd10"
  enteredBy := prescribers
  prefill := .autoLinked
  friction := .compliance
  linkedFrom? := some "visitDiagnosis"
  fhirTarget := "MedicationRequest.reasonReference"

/-- Hospital policy (not law): local kg-only dosing policy and enter-once linkage from current weight.
The weight used for dosing, in kilograms. It is linked from today's weight,
so it should be entered once. The canonical UI asks for it again in the order
composer; a personalized UI may link it. -/
def dosingWeight : ElementSpec where
  id := "dosingWeight"
  label := "Dosing weight (kg)"
  kind := .quantity .kg
  enteredBy := prescribers
  prefill := .autoLinked
  friction := .compliance
  linkedFrom? := some "weight"
  fhirTarget := "MedicationRequest.extension.dosingWeight"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Weight-based dose in mg per kg, used for pediatric dosing. Optional: the
dose in mg is what is required. -/
def doseMgPerKg : ElementSpec where
  id := "doseMgPerKg"
  label := "Dose (mg/kg)"
  kind := .quantity .mgPerKg
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .safety
  fhirTarget := "MedicationRequest.dosageInstruction.extension.weightBasedDose"

/-- Product design property.
A free-text note to the pharmacy. No rule needs it. -/
def orderComment : ElementSpec where
  id := "orderComment"
  label := "Note to pharmacy"
  kind := .text
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .accidental
  fhirTarget := "MedicationRequest.note"

/-! ## Data elements: controlled substances (California) -/

/-- Product design property.
The supported exemption categories a prescriber may record instead of checking CURES
(CA Health and Safety Code §11165.4(c)). Codes of the `"cures-exemption"`
value set:
- `"admin-in-facility"`: the drug is given to the patient while admitted to a
  licensed hospital, clinic, or other health facility;
- `"ed-7-day"`: prescribed in an emergency department, nonrefillable, at most
  a 7-day supply;
- `"surgery-5-day"`: prescribed for a surgical procedure done in a licensed
  facility, nonrefillable, at most a 5-day supply;
- `"hospice"`: the patient is receiving hospice care;
- `"cures-unavailable"`: CURES could not be accessed in a reasonable time
  (for example a system outage), and the reason is documented.
Verified against docs/regulations.md §2.2. This is a subset, not a complete
statutory exemption list. The surgical code deliberately accepts only five
days; §11165.4(c)(4) permits seven. That stricter hospital policy is retained.
ED buprenorphine and other statutory cases are not separately modeled. -/
def curesExemptionCodes : List String :=
  ["admin-in-facility", "ed-7-day", "surgery-5-day", "hospice", "cures-unavailable"]

/-- Law: CA H&S 11165.4(c); the modeled exemption list is a subset.
Why CURES was not checked: one of the statutory exemptions in
`curesExemptionCodes` (CA Health and Safety Code §11165.4(c)). A human
records it; it is never pre-filled. When recorded, it meets the CURES review
requirement instead of the report (see `orderSigningReviews`). -/
def curesExemptionReason : ElementSpec where
  id := "curesExemptionReason"
  label := "CURES not checked: exemption"
  kind := .coded "cures-exemption"
  enteredBy := prescribers
  prefill := .never
  friction := .compliance
  fhirTarget := "MedicationRequest.extension.curesExemption"

/-- Law: CA B&P 741(a)(1); the demo applies a stricter risk gate.
The naloxone offer for a higher-risk opioid prescription: `"prescribed"` or
`"offered-declined"` (CA Business and Professions Code §741(a)). A human
records it; it is never pre-filled. -/
def naloxoneOffer : ElementSpec where
  id := "naloxoneOffer"
  label := "Naloxone offered"
  kind := .coded "naloxone-offer"
  enteredBy := prescribers
  prefill := .never
  friction := .compliance
  fhirTarget := "MedicationRequest.extension.naloxoneOffer"

/-- Law: CA B&P 741(a)(2); the demo applies a stricter risk gate.
The patient (or caregiver) was educated about overdose prevention and how
to use naloxone (CA Business and Professions Code §741(b)). A human records
it; it is never pre-filled. -/
def naloxoneEducation : ElementSpec where
  id := "naloxoneEducation"
  label := "Overdose and naloxone education given"
  kind := .flag
  enteredBy := prescribers
  prefill := .never
  friction := .compliance
  fhirTarget := "Communication.payload.contentString"

/-! ## Data elements: lab orders -/

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
The lab test to order (LOINC). -/
def labTest : ElementSpec where
  id := "labTest"
  label := "Lab test"
  kind := .coded "loinc"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .safety
  fhirTarget := "ServiceRequest.code"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
The diagnosis the lab is for. Linked from the visit diagnosis. -/
def labDiagnosis : ElementSpec where
  id := "labDiagnosis"
  label := "Lab diagnosis (ICD-10)"
  kind := .coded "icd10"
  enteredBy := prescribers
  prefill := .autoLinked
  friction := .compliance
  linkedFrom? := some "visitDiagnosis"
  fhirTarget := "ServiceRequest.reasonCode"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Routine or stat. -/
def labPriority : ElementSpec where
  id := "labPriority"
  label := "Lab priority"
  kind := .coded "request-priority"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "ServiceRequest.priority"

/-- Product design property.
"Patient should be fasting." No rule needs it. -/
def labFasting : ElementSpec where
  id := "labFasting"
  label := "Fasting required"
  kind := .flag
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .accidental
  fhirTarget := "ServiceRequest.patientInstruction"

/-! ## Data elements: results in-basket (W2) -/

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
What the clinician decides to do about a result (no action, repeat, refer,
call the patient, …). -/
def resultAction : ElementSpec where
  id := "resultAction"
  label := "Result action"
  kind := .coded "result-action"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .safety
  fhirTarget := "Task.output.valueCodeableConcept"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
The message sent to the patient about the result. -/
def patientMessage : ElementSpec where
  id := "patientMessage"
  label := "Message to patient"
  kind := .text
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "Communication.payload.contentString"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
A follow-up test ordered from the result (LOINC). Optional. -/
def resultFollowUpOrder : ElementSpec where
  id := "resultFollowUpOrder"
  label := "Follow-up test"
  kind := .coded "loinc"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .safety
  fhirTarget := "ServiceRequest.code"

/-! ## Data elements: emergency department (W3) -/

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Triage acuity (Emergency Severity Index 1–5), set by the clinician. -/
def triageAcuity : ElementSpec where
  id := "triageAcuity"
  label := "Acuity (ESI 1–5)"
  kind := .coded "esi"
  enteredBy := [.rn, .physician, .np]
  prefill := .never
  friction := .safety
  fhirTarget := "Encounter.priority"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
How the patient arrived (walk-in, ambulance, …). -/
def arrivalMode : ElementSpec where
  id := "arrivalMode"
  label := "Arrival mode"
  kind := .coded "arrival-mode"
  enteredBy := allClinicians
  prefill := .recordConfirm
  friction := .compliance
  fhirTarget := "Encounter.hospitalization.admitSource"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Infection-isolation screening (fever, cough, rash, travel). -/
def isolationScreen : ElementSpec where
  id := "isolationScreen"
  label := "Isolation screen"
  kind := .coded "isolation-screen"
  enteredBy := allClinicians
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "QuestionnaireResponse.item.answer"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
The ED disposition: admit, discharge, transfer, observe, or consult. -/
def dispositionChoice : ElementSpec where
  id := "dispositionChoice"
  label := "Disposition"
  kind := .coded "ed-disposition"
  enteredBy := [.physician, .np]
  prefill := .defaultConfirm
  friction := .safety
  fhirTarget := "Encounter.hospitalization.dischargeDisposition"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
The patient's condition at disposition (stable, guarded, critical). -/
def dispositionCondition : ElementSpec where
  id := "dispositionCondition"
  label := "Condition at disposition"
  kind := .coded "condition-at-disposition"
  enteredBy := [.physician, .np]
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "Encounter.extension.conditionAtDisposition"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
The inpatient service the patient is admitted to. Optional. -/
def admitService : ElementSpec where
  id := "admitService"
  label := "Admitting service"
  kind := .coded "service"
  enteredBy := [.physician, .np]
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "ServiceRequest.performerType"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Floor, step-down, or ICU. Optional. -/
def admitLevelOfCare : ElementSpec where
  id := "admitLevelOfCare"
  label := "Level of care"
  kind := .coded "level-of-care"
  enteredBy := [.physician, .np]
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "ServiceRequest.orderDetail"

/-! ## Data elements: medication administration and nursing (W4) -/

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Whether the dose was given, held, or refused. -/
def adminStatus : ElementSpec where
  id := "adminStatus"
  label := "Given / held / refused"
  kind := .coded "admin-status"
  enteredBy := nurses
  prefill := .defaultConfirm
  friction := .safety
  fhirTarget := "MedicationAdministration.status"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
The reason or comment for this administration ("as ordered", "NPO",
"patient refused", …). -/
def adminReason : ElementSpec where
  id := "adminReason"
  label := "Reason / comment"
  kind := .coded "admin-reason"
  enteredBy := nurses
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "MedicationAdministration.statusReason"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Injection site, for injected medications. Optional. -/
def adminSite : ElementSpec where
  id := "adminSite"
  label := "Site"
  kind := .coded "body-site"
  enteredBy := nurses
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "MedicationAdministration.dosage.site"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
The nurse's shift assessment (systems review). -/
def nursingAssessment : ElementSpec where
  id := "nursingAssessment"
  label := "Nursing assessment"
  kind := .text
  enteredBy := nurses
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "Observation.valueString"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Handoff: the situation (SBAR "S"). -/
def handoffSituation : ElementSpec where
  id := "handoffSituation"
  label := "Situation"
  kind := .text
  enteredBy := nurses
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "DocumentReference.content"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Handoff: the background (SBAR "B"). -/
def handoffBackground : ElementSpec where
  id := "handoffBackground"
  label := "Background"
  kind := .text
  enteredBy := nurses
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "DocumentReference.content"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Handoff: the assessment (SBAR "A"). -/
def handoffAssessment : ElementSpec where
  id := "handoffAssessment"
  label := "Assessment"
  kind := .text
  enteredBy := nurses
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "DocumentReference.content"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Handoff: the recommendation (SBAR "R"). -/
def handoffRecommendation : ElementSpec where
  id := "handoffRecommendation"
  label := "Recommendation"
  kind := .text
  enteredBy := nurses
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "DocumentReference.content"

/-! ## Data elements: immunizations (W5) -/

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
The vaccine given (CVX code). -/
def vaccine : ElementSpec where
  id := "vaccine"
  label := "Vaccine"
  kind := .coded "cvx"
  enteredBy := vaccinators
  prefill := .defaultConfirm
  friction := .safety
  fhirTarget := "Immunization.vaccineCode"

/-- Law: 42 USC 300aa-25(a)(2).
The vaccine lot number. It may be copied from the clinic's vaccine
inventory, and a human confirms it. -/
def vaccineLot : ElementSpec where
  id := "vaccineLot"
  label := "Lot number"
  kind := .text
  enteredBy := vaccinators
  prefill := .recordConfirm
  friction := .compliance
  fhirTarget := "Immunization.lotNumber"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Where the vaccine was given (left thigh, right deltoid, …). -/
def vaccineSite : ElementSpec where
  id := "vaccineSite"
  label := "Site"
  kind := .coded "body-site"
  enteredBy := vaccinators
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "Immunization.site"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
How the vaccine was given (intramuscular, oral, …). -/
def vaccineRoute : ElementSpec where
  id := "vaccineRoute"
  label := "Route"
  kind := .coded "route"
  enteredBy := vaccinators
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "Immunization.route"

/-- Law: 42 USC 300aa-26(d) (VIS before administration).
The Vaccine Information Statement was given to the family (required by US
law). -/
def visGiven : ElementSpec where
  id := "visGiven"
  label := "VIS given to patient / guardian before vaccination"
  kind := .flag
  enteredBy := vaccinators
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "Immunization.education.presentationDate"

/-- Law: 42 USC 300aa-26; CDC VIS Instructions require recording the edition date.
The edition date of the VIS given before administration. Required before
recording; it may be copied from inventory and confirmed by a human. -/
def visEditionDate : ElementSpec where
  id := "visEditionDate"
  label := "VIS edition date"
  kind := .text
  enteredBy := vaccinators
  prefill := .recordConfirm
  friction := .compliance
  fhirTarget := "Immunization.education.publicationDate"

/-! ## Data elements: surgery (W6) -/

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
The surgeon's decision after an ED consult: operate, observe, or treat
without surgery. Optional. -/
def surgeryDecision : ElementSpec where
  id := "surgeryDecision"
  label := "Surgical decision"
  kind := .coded "surgical-decision"
  enteredBy := surgeons
  prefill := .defaultConfirm
  friction := .safety
  fhirTarget := "ServiceRequest.code"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Update to the history and physical on the day of surgery. -/
def hpUpdate : ElementSpec where
  id := "hpUpdate"
  label := "H&P update (day of surgery)"
  kind := .text
  enteredBy := [.surgeon, .physician]
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "DocumentReference.content"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Which home medications to hold before surgery, and when to restart them. -/
def medsToHold : ElementSpec where
  id := "medsToHold"
  label := "Medications to hold"
  kind := .text
  enteredBy := [.surgeon, .physician]
  prefill := .defaultConfirm
  friction := .safety
  fhirTarget := "MedicationRequest.dosageInstruction.text"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Time of last oral intake (NPO status). Optional. -/
def npoStatus : ElementSpec where
  id := "npoStatus"
  label := "NPO since"
  kind := .text
  enteredBy := allClinicians
  prefill := .recordConfirm
  friction := .compliance
  fhirTarget := "Observation.valueDateTime"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Operative note: pre-operative diagnosis. -/
def opPreopDiagnosis : ElementSpec where
  id := "opPreopDiagnosis"
  label := "Pre-op diagnosis"
  kind := .coded "icd10"
  enteredBy := surgeons
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "Procedure.reasonCode"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Operative note: post-operative diagnosis. -/
def opPostopDiagnosis : ElementSpec where
  id := "opPostopDiagnosis"
  label := "Post-op diagnosis"
  kind := .coded "icd10"
  enteredBy := surgeons
  prefill := .defaultConfirm
  friction := .safety
  fhirTarget := "Procedure.outcome"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Operative note: the procedure performed (CPT). -/
def opProcedure : ElementSpec where
  id := "opProcedure"
  label := "Procedure"
  kind := .coded "cpt"
  enteredBy := surgeons
  prefill := .defaultConfirm
  friction := .safety
  fhirTarget := "Procedure.code"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Operative note: surgeons and assistants. Optional. -/
def opSurgeons : ElementSpec where
  id := "opSurgeons"
  label := "Surgeon / assistants"
  kind := .text
  enteredBy := surgeons
  prefill := .recordConfirm
  friction := .compliance
  fhirTarget := "Procedure.performer"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Operative note: type of anesthesia. -/
def opAnesthesia : ElementSpec where
  id := "opAnesthesia"
  label := "Anesthesia"
  kind := .coded "anesthesia-type"
  enteredBy := surgeons
  prefill := .recordConfirm
  friction := .compliance
  fhirTarget := "Procedure.extension.anesthesia"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Operative note: findings. -/
def opFindings : ElementSpec where
  id := "opFindings"
  label := "Findings"
  kind := .text
  enteredBy := surgeons
  prefill := .defaultConfirm
  friction := .safety
  fhirTarget := "Procedure.note"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Operative note: estimated blood loss, in mL. -/
def opEbl : ElementSpec where
  id := "opEbl"
  label := "Estimated blood loss (mL)"
  kind := .quantity .mL
  enteredBy := surgeons
  prefill := .never
  friction := .safety
  fhirTarget := "Procedure.extension.estimatedBloodLoss"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Operative note: specimens sent to pathology. -/
def opSpecimens : ElementSpec where
  id := "opSpecimens"
  label := "Specimens"
  kind := .text
  enteredBy := surgeons
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "Specimen.type"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Operative note: drains left in place. Optional. -/
def opDrains : ElementSpec where
  id := "opDrains"
  label := "Drains"
  kind := .text
  enteredBy := surgeons
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "Procedure.focalDevice"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Operative note: implants. Optional. -/
def opImplants : ElementSpec where
  id := "opImplants"
  label := "Implants"
  kind := .text
  enteredBy := surgeons
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "Procedure.focalDevice.manipulated"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Operative note: complications (or "none"). -/
def opComplications : ElementSpec where
  id := "opComplications"
  label := "Complications"
  kind := .coded "complication"
  enteredBy := surgeons
  prefill := .defaultConfirm
  friction := .safety
  fhirTarget := "Procedure.complication"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Operative note: the patient's condition leaving the OR. -/
def opCondition : ElementSpec where
  id := "opCondition"
  label := "Condition"
  kind := .coded "condition-at-disposition"
  enteredBy := surgeons
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "Procedure.outcome.text"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Post-op order set: diet. Optional. -/
def postOpDiet : ElementSpec where
  id := "postOpDiet"
  label := "Diet"
  kind := .coded "diet"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .safety
  fhirTarget := "NutritionOrder.oralDiet.type"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Post-op order set: activity. Optional. -/
def postOpActivity : ElementSpec where
  id := "postOpActivity"
  label := "Activity"
  kind := .coded "activity"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .safety
  fhirTarget := "ServiceRequest.code"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Post-op order set: mechanical VTE prophylaxis (compression devices).
Optional. -/
def vteMechanical : ElementSpec where
  id := "vteMechanical"
  label := "VTE prophylaxis: mechanical"
  kind := .coded "vte-mechanical"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .safety
  fhirTarget := "DeviceRequest.code"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Post-op order set: labs for the morning. Optional. -/
def postOpLabs : ElementSpec where
  id := "postOpLabs"
  label := "Post-op labs"
  kind := .coded "loinc"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .safety
  fhirTarget := "ServiceRequest.code"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Post-op order set: how often to take vital signs. Optional. -/
def postOpVitalsFreq : ElementSpec where
  id := "postOpVitalsFreq"
  label := "Vital signs frequency"
  kind := .coded "frequency"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "ServiceRequest.occurrenceTiming"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Post-op order set: nursing orders (wound care, drains, intake/output).
Optional. -/
def nursingOrders : ElementSpec where
  id := "nursingOrders"
  label := "Nursing orders"
  kind := .text
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "ServiceRequest.note"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Rounding: a short progress note. Optional. -/
def progressNote : ElementSpec where
  id := "progressNote"
  label := "Progress note"
  kind := .text
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "DocumentReference.content"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Discharge medication reconciliation: continue, stop, change, or new, for
one medication (rows are numbered like order lines). -/
def dischargeMedRec : ElementSpec where
  id := "dischargeMedRec"
  label := "Discharge medication decision"
  kind := .coded "discharge-med-decision"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .safety
  fhirTarget := "MedicationStatement.status"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
The main diagnosis at discharge (ICD-10). -/
def dischargeDiagnosis : ElementSpec where
  id := "dischargeDiagnosis"
  label := "Discharge diagnosis (ICD-10)"
  kind := .coded "icd10"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "Encounter.diagnosis.condition"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
The follow-up appointment after discharge. -/
def dischargeFollowUp : ElementSpec where
  id := "dischargeFollowUp"
  label := "Follow-up appointment"
  kind := .coded "follow-up-interval"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "Appointment.start"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Discharge instructions for the patient. -/
def dischargeInstructions : ElementSpec where
  id := "dischargeInstructions"
  label := "Discharge instructions"
  kind := .text
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "DocumentReference.content"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
The patient's condition at discharge. -/
def dischargeCondition : ElementSpec where
  id := "dischargeCondition"
  label := "Condition at discharge"
  kind := .coded "condition-at-disposition"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "Encounter.extension.conditionAtDischarge"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Where the patient goes (home, rehab, skilled nursing). -/
def dischargeDestination : ElementSpec where
  id := "dischargeDestination"
  label := "Discharge to"
  kind := .coded "discharge-destination"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "Encounter.hospitalization.dischargeDisposition"

/-! ## Data elements: refill requests (W7) -/

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Approve, deny, or modify the refill request. -/
def refillDecision : ElementSpec where
  id := "refillDecision"
  label := "Refill decision"
  kind := .coded "approve-deny-modify"
  enteredBy := [.physician, .np]
  prefill := .defaultConfirm
  friction := .safety
  fhirTarget := "Task.businessStatus"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
The dose on the refilled prescription, in mg (changed only when modifying). -/
def refillDose : ElementSpec where
  id := "refillDose"
  label := "Dose (mg)"
  kind := .quantity .mg
  enteredBy := [.physician, .np]
  prefill := .defaultConfirm
  friction := .safety
  fhirTarget := "MedicationRequest.dosageInstruction.doseAndRate.doseQuantity"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
The dispense quantity on the refill. -/
def refillQuantity : ElementSpec where
  id := "refillQuantity"
  label := "Dispense quantity"
  kind := .quantity .none
  enteredBy := [.physician, .np]
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "MedicationRequest.dispenseRequest.quantity"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
The number of refills granted. -/
def refillRefills : ElementSpec where
  id := "refillRefills"
  label := "Refills"
  kind := .quantity .none
  enteredBy := [.physician, .np]
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "MedicationRequest.dispenseRequest.numberOfRepeatsAllowed"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
The pharmacy for the refill. It may be copied from the request, and a human
confirms it. -/
def refillPharmacy : ElementSpec where
  id := "refillPharmacy"
  label := "Pharmacy"
  kind := .coded "pharmacy"
  enteredBy := [.physician, .np]
  prefill := .recordConfirm
  recordFact? := some "requestPharmacy"
  friction := .compliance
  fhirTarget := "MedicationRequest.dispenseRequest.performer"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
"The refill protocol is met": a visit and the monitoring labs within the
last 12 months. -/
def refillProtocolMet : ElementSpec where
  id := "refillProtocolMet"
  label := "Refill protocol criteria met"
  kind := .flag
  enteredBy := [.physician, .np]
  prefill := .recordConfirm
  friction := .compliance
  fhirTarget := "Task.extension.protocolMet"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
The reason for denying a refill. Optional. -/
def refillDenyReason : ElementSpec where
  id := "refillDenyReason"
  label := "Reason for denial"
  kind := .coded "refill-deny-reason"
  enteredBy := [.physician, .np]
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "Task.statusReason"

/-- Product design property.
A free-text note to the pharmacy on a refill. No rule needs it. -/
def refillNote : ElementSpec where
  id := "refillNote"
  label := "Note to pharmacy"
  kind := .text
  enteredBy := [.physician, .np]
  prefill := .defaultConfirm
  friction := .accidental
  fhirTarget := "MedicationRequest.note"

/-- Law: 42 USC 300aa-25(a)(2).
Vaccine manufacturer. 42 USC 300aa-25(a)(2) requires it in the record;
this field's inventory default and human confirmation are our implementation.
Source audit: docs/regulations.md E11. -/
def vaccineManufacturer : ElementSpec where
  id := "vaccineManufacturer"
  label := "Vaccine manufacturer"
  kind := .text
  enteredBy := vaccinators
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "Immunization.manufacturer"

/-- Law: 42 USC 300aa-25(a)(3).
Identity of the administering provider, recorded under 42 USC
300aa-25(a)(3). This demo captures the provider display/identifier; address and
full legal record completeness remain outside the model (regulations.md E11). -/
def vaccineProvider : ElementSpec where
  id := "vaccineProvider"
  label := "Administering provider"
  kind := .text
  enteredBy := vaccinators
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "Immunization.performer.actor"

/-- Product design property.
Every data element in spec v1. -/
def elements : List ElementSpec := [
  -- safety checks
  patientIdReentry, wristbandScan, medScan, highAlertCosign, consentVerified,
  -- vital signs and rooming
  weight, height, headCircumference, bpSystolic, bpDiastolic, heartRate, respRate,
  temperature, spo2, painScore, painReassessment, chiefComplaint, tobaccoUse,
  fallRiskScreen, depressionScreen, travelScreen, advanceDirectiveAsked,
  interpreterNeeded, pharmacyConfirmedRooming, allergyReconfirmOrdering,
  allergyReconfirmSigning,
  -- medication reconciliation
  medRecDecision,
  -- the visit note
  hpi, ros, exam, assessmentPlan, visitDiagnosis, claimDiagnosis, levelOfService,
  followUp, patientInstructions, anticipatoryGuidance,
  -- one medication order line
  drug, dose, doseUnit, route, freq, duration, quantity, refills, indication,
  pharmacy, substitution, prn, orderDiagnosis, dosingWeight, doseMgPerKg, orderComment,
  -- controlled substances (California)
  curesExemptionReason, naloxoneOffer, naloxoneEducation,
  -- lab orders
  labTest, labDiagnosis, labPriority, labFasting,
  -- results in-basket
  resultAction, patientMessage, resultFollowUpOrder,
  -- emergency department
  triageAcuity, arrivalMode, isolationScreen, dispositionChoice, dispositionCondition,
  admitService, admitLevelOfCare,
  -- medication administration and nursing
  adminStatus, adminReason, adminSite, nursingAssessment, handoffSituation,
  handoffBackground, handoffAssessment, handoffRecommendation,
  -- immunizations
  vaccine, vaccineLot, vaccineSite, vaccineRoute, visGiven, visEditionDate,
  vaccineManufacturer, vaccineProvider,
  -- surgery
  surgeryDecision, hpUpdate, medsToHold, npoStatus, opPreopDiagnosis, opPostopDiagnosis,
  opProcedure, opSurgeons, opAnesthesia, opFindings, opEbl, opSpecimens, opDrains,
  opImplants, opComplications, opCondition, postOpDiet, postOpActivity, vteMechanical,
  postOpLabs, postOpVitalsFreq, nursingOrders, progressNote, dischargeMedRec,
  dischargeDiagnosis, dischargeFollowUp, dischargeInstructions, dischargeCondition,
  dischargeDestination,
  -- refill requests
  refillDecision, refillDose, refillQuantity, refillRefills, refillPharmacy,
  refillProtocolMet, refillDenyReason, refillNote
]

/-! ## Information the screens can show

`version` names the fact that versions the information. A review receipt is
valid only for the same version. `""` means not versioned. -/

/-- Entrenched: two identifiers prevent wrong-patient care and support hospital accreditation (Joint Commission NPG.01.01.01; docs/regulations.md R1). Pinned placement is product design.
The patient banner: name, date of birth, MRN (two identifiers), age and
sex, allergy badge, code status. A landmark: it is on every screen. -/
def patientBanner : InfoSpec := { id := "patientBanner", label := "Patient banner", version := "" }
/-- Product design property.
The allergy list. Versioned: a new or changed allergy makes old receipts invalid. -/
def allergyList : InfoSpec := { id := "allergyList", label := "Allergies", version := "allergyVersion" }
/-- Product design property.
The current medication list. Versioned like the allergy list. -/
def currentMeds : InfoSpec := { id := "currentMeds", label := "Current medications", version := "medsVersion" }
/-- Product design property.
Anticoagulants and antiplatelet drugs the patient takes (a view of the
medication list, so it has the same version). -/
def anticoagulantList : InfoSpec := { id := "anticoagulantList", label := "Anticoagulants and antiplatelets", version := "medsVersion" }
/-- Product design property.
The dose check for each order line: the dose per kg against the usual
range, using today's weight in kg. -/
def doseCheck : InfoSpec := { id := "doseCheck", label := "Weight-based dose check", version := "" }
/-- Product design property.
The orders about to be signed: patient, drug, dose, quantity, directions and
refills for each line. The controlled-prescription display obligation is
classified separately in `controlledRxReview`. -/
def orderSummary : InfoSpec := { id := "orderSummary", label := "Orders to sign", version := "" }
/-- Product design property.
The result being acknowledged: value, reference range, flag. -/
def resultDetail : InfoSpec := { id := "resultDetail", label := "Result detail", version := "" }
/-- Product design property.
The trend of the same test over time. -/
def resultTrend : InfoSpec := { id := "resultTrend", label := "Result trend", version := "" }
/-- Product design property.
The latest vital signs. -/
def vitals : InfoSpec := { id := "vitals", label := "Vital signs", version := "" }
/-- Product design property.
The pediatric growth chart (weight, height, head circumference percentiles). -/
def growthChart : InfoSpec := { id := "growthChart", label := "Growth chart", version := "" }
/-- Product design property.
The last visit with this clinic: date, clinician, plan. -/
def lastVisit : InfoSpec := { id := "lastVisit", label := "Last visit", version := "" }
/-- Product design property.
The labs that matter for this drug (for example potassium and creatinine for lisinopril). -/
def relevantLabs : InfoSpec := { id := "relevantLabs", label := "Relevant labs", version := "" }
/-- Product design property.
Pharmacy fill history, used to judge adherence. -/
def adherence : InfoSpec := { id := "adherence", label := "Fill history / adherence", version := "" }
/-- Product design property.
Imaging studies and reports. -/
def imaging : InfoSpec := { id := "imaging", label := "Imaging", version := "" }
/-- Product design property.
The lab results table. -/
def labResults : InfoSpec := { id := "labResults", label := "Lab results", version := "" }
/-- Product design property.
Events since the last round (nursing notes, pages, new results). -/
def overnightEvents : InfoSpec := { id := "overnightEvents", label := "Overnight events", version := "" }
/-- Product design property.
The active problem list. -/
def problemList : InfoSpec := { id := "problemList", label := "Problem list", version := "" }
/-- Product design property.
Immunization history and the vaccines due today. -/
def immunizationHistory : InfoSpec := { id := "immunizationHistory", label := "Immunizations and forecast", version := "" }
/-- Product design property.
The medication administration record grid. -/
def marSchedule : InfoSpec := { id := "marSchedule", label := "MAR", version := "" }
/-- Product design property.
The order details of the dose being given: drug, dose, route, time due. -/
def marDoseDetails : InfoSpec := { id := "marDoseDetails", label := "Dose details", version := "" }
/-- Product design property.
Recent blood glucose values (shown before insulin). -/
def glucoseTrend : InfoSpec := { id := "glucoseTrend", label := "Blood glucose", version := "" }
/-- Product design property.
Recent coagulation labs (shown before anticoagulants). -/
def coagLabs : InfoSpec := { id := "coagLabs", label := "Coagulation labs", version := "" }
/-- Product design property.
The nurse's shift worklist: due and overdue meds and tasks. -/
def shiftWorklist : InfoSpec := { id := "shiftWorklist", label := "Shift worklist", version := "" }
/-- Product design property.
Orders placed since the last shift. -/
def newOrders : InfoSpec := { id := "newOrders", label := "New orders since last shift", version := "" }
/-- Product design property.
The last handoff summary. -/
def handoffSummary : InfoSpec := { id := "handoffSummary", label := "Handoff summary", version := "" }
/-- Product design property.
The intra-operative record: times, counts, anesthesia events. -/
def intraopRecord : InfoSpec := { id := "intraopRecord", label := "Intra-op record", version := "" }
/-- Product design property.
Earlier notes (the source for copy-forward). -/
def priorNotes : InfoSpec := { id := "priorNotes", label := "Prior notes", version := "" }
/-- Product design property.
Past encounters. -/
def encounterHistory : InfoSpec := { id := "encounterHistory", label := "Encounters", version := "" }
/-- Product design property.
Upcoming appointments. -/
def upcomingAppointments : InfoSpec := { id := "upcomingAppointments", label := "Upcoming appointments", version := "" }
/-- Product design property.
Open (active, unsigned, or pending) orders. -/
def openOrders : InfoSpec := { id := "openOrders", label := "Open orders", version := "" }
/-- Product design property.
The refill request: drug, dose, last fill, pharmacy, who asked. -/
def refillRequest : InfoSpec := { id := "refillRequest", label := "Refill request", version := "" }
/-- Product design property.
The in-basket list (results, messages, refill requests). -/
def inbasketItems : InfoSpec := { id := "inbasketItems", label := "In-basket", version := "" }
/-- Product design property.
The triage summary (acuity, vitals, complaint). -/
def triageSummary : InfoSpec := { id := "triageSummary", label := "Triage summary", version := "" }
/-- Product design property.
The consult request from the ED. -/
def consultRequest : InfoSpec := { id := "consultRequest", label := "Consult request", version := "" }
/-- Product design property.
The signed consent form on file. -/
def consentDocument : InfoSpec := { id := "consentDocument", label := "Consent on file", version := "" }
/-- Product design property.
Social history. -/
def socialHistory : InfoSpec := { id := "socialHistory", label := "Social history", version := "" }
/-- Product design property.
Family history. -/
def familyHistory : InfoSpec := { id := "familyHistory", label := "Family history", version := "" }
/-- Product design property.
Past surgical history. -/
def surgicalHistory : InfoSpec := { id := "surgicalHistory", label := "Surgical history", version := "" }
/-- Product design property.
Insurance coverage. -/
def coverage : InfoSpec := { id := "coverage", label := "Coverage", version := "" }
/-- Product design property.
Recent as-needed (PRN) doses and pain scores. -/
def prnHistory : InfoSpec := { id := "prnHistory", label := "PRN history", version := "" }
/-- Product design property.
Results ordered but not back yet. -/
def pendingResults : InfoSpec := { id := "pendingResults", label := "Pending results", version := "" }
/-- Product design property.
The ED track board (all patients in the department). -/
def edTrackBoard : InfoSpec := { id := "edTrackBoard", label := "ED track board", version := "" }
/-- Product design property.
Open care gaps (screenings and vaccines due). -/
def careGapList : InfoSpec := { id := "careGapList", label := "Care gaps", version := "" }
/-- Product design property.
The patient's CURES report: Schedule II–V prescriptions filled in
California, from the state's prescription drug monitoring program (CA Health
and Safety Code §11165.4). -/
def curesReport : InfoSpec := { id := "curesReport", label := "CURES report", version := "" }

/-- Product design property.
Every piece of information in spec v1. -/
def infos : List InfoSpec := [
  patientBanner, allergyList, currentMeds, anticoagulantList, doseCheck, orderSummary,
  resultDetail, resultTrend, vitals, growthChart, lastVisit, relevantLabs, adherence,
  imaging, labResults, overnightEvents, problemList, immunizationHistory, marSchedule,
  marDoseDetails, glucoseTrend, coagLabs, shiftWorklist, newOrders, handoffSummary,
  intraopRecord, priorNotes, encounterHistory, upcomingAppointments, openOrders,
  refillRequest, inbasketItems, triageSummary, consultRequest, consentDocument,
  socialHistory, familyHistory, surgicalHistory, coverage, prnHistory, pendingResults,
  edTrackBoard, careGapList, curesReport
]

/-! ## Commits

A commit changes the record. Each has the roles that may do it. -/

/-- Product design property.
Sign medication orders (clinic, ED, pre-op, post-op, rounding, discharge
prescriptions). -/
def signOrders : CommitSpec := { id := "signOrders", label := "Sign orders", roles := prescribers }
/-- Product design property.
Sign a visit or consult note. -/
def signNote : CommitSpec := { id := "signNote", label := "Sign note", roles := prescribers }
/-- Product design property.
Acknowledge a result in the in-basket. -/
def ackResult : CommitSpec := { id := "ackResult", label := "Acknowledge result", roles := prescribers }
/-- Product design property.
Approve (or deny, or modify) a refill request. -/
def approveRefill : CommitSpec := { id := "approveRefill", label := "Approve refill", roles := [.physician, .np] }
/-- Product design property.
Give a medication and record it on the MAR. -/
def administerMed : CommitSpec := { id := "administerMed", label := "Administer medication", roles := nurses }
/-- Product design property.
File the nurse's flowsheet vitals and assessment. -/
def chartAssessment : CommitSpec := { id := "chartAssessment", label := "File assessment", roles := nurses }
/-- Product design property.
Record a vaccine given today. -/
def recordImmunization : CommitSpec := { id := "recordImmunization", label := "Record immunization", roles := vaccinators }
/-- Product design property.
Sign the brief operative note. -/
def signOpNote : CommitSpec := { id := "signOpNote", label := "Sign op note", roles := surgeons }
/-- Product design property.
Discharge the patient from the hospital. -/
def discharge : CommitSpec := { id := "discharge", label := "Discharge", roles := [.surgeon, .physician, .np] }
/-- Product design property.
Set the ED disposition (admit, discharge, transfer, …). -/
def disposition : CommitSpec := { id := "disposition", label := "Set disposition", roles := [.physician, .np] }

/-- Product design property.
Every commit in spec v1. -/
def commits : List CommitSpec := [
  signOrders, signNote, ackResult, approveRefill, administerMed,
  chartAssessment, recordImmunization, signOpNote, discharge, disposition
]

/-! ## Entry requirements: what must be captured before each commit -/

/-- Product design property.
`requires c e`: commit `c` needs element `e` captured (and confirmed, if it
was pre-filled) first. -/
def requires (c : CommitSpec) (e : ElementSpec) (when : When := .always) : EntryReq :=
  { commit := c.id, element := e.id, when }

/-- Product design property.
`requiresPerLine c e`: commit `c` needs element `e` on every order line. -/
def requiresPerLine (c : CommitSpec) (e : ElementSpec) (when : When := .always) : EntryReq :=
  { commit := c.id, element := e.id, when, perOrderLine := true }

/-- Product design property.
The elements every medication order line carries. -/
def orderLineElements : List ElementSpec :=
  [drug, dose, doseUnit, route, freq, duration, quantity, refills, indication, pharmacy,
   substitution, prn, orderDiagnosis]

/-- Law: 21 CFR 1306.12(a). Schedule II prescriptions cannot have refills.
Every matching medication line needs its own confirmed zero; another line's
zero, an unconfirmed default, and a confirmed nonzero value do not count.
Source: https://www.ecfr.gov/current/title-21/section-1306.12 -/
def scheduleIIRefillsEntry (c : CommitSpec) : EntryReq :=
  { requiresPerLine c refills (.drugClass "scheduleII") with allowed? := some ["0"] }

/-- Hospital policy (not law): local signing workflow; the Schedule II and naloxone rules retain their separate legal bases.
What signing medication orders needs: patient-ID re-entry, today's weight in kg, the dosing
weight, and every order-line element on every line. When an opioid order
carries a higher overdose risk, a naloxone offer and overdose education are
also needed (CA Business and Professions Code §741).

Order content: 22 CCR 70263(g), (h)(4); 42 CFR 482.24(c)(2), 482.23(c)(3). Re-entry and kg-only checks are our safety policy, not statutory fields. Our naloxone gate is stricter than B&P 741: facility-administered orders are exempt in law; our model also treats unknown dose/frequency as risk (docs/regulations.md §3.1, C2). -/
def orderSigningEntries (c : CommitSpec) : List EntryReq :=
  [requires c patientIdReentry, requires c weight, requires c dosingWeight] ++
  orderLineElements.map (requiresPerLine c ·) ++
  [scheduleIIRefillsEntry c,
   requires c naloxoneOffer (when := .naloxoneRisk),
   requires c naloxoneEducation (when := .naloxoneRisk)]

/-- Hospital policy (not law): local pre-op signing gate supporting consent and H&P duties.
Pre-op orders also need consent verified by a human and an updated H&P,
and a decision about which home medications to hold.

Consent and H&P: 42 CFR 482.51(b)(1)–(2); 22 CCR 70223(d). The pre-op signing deadline and meds-to-hold field are our stricter policy (docs/regulations.md §3.2 R6). -/
def preOpExtraEntries : List EntryReq :=
  [requires signOrders consentVerified (.encounter "preop"),
   requires signOrders hpUpdate (.encounter "preop"),
   requires signOrders medsToHold (.encounter "preop")]

/-- Hospital policy (not law): local note section and billing checklist supporting record authentication duties.
A signed visit or consult note needs the core note sections, the diagnosis
(once for the visit and once for the claim), the level of service, follow-up,
instructions, and at least the first medication-reconciliation decision.

Record authentication: 42 CFR 482.24(b), (c)(1); 22 CCR 70751(g). This precise section list, duplicate claim diagnosis and billing prompts are our design (docs/regulations.md E20, H1). -/
def signNoteEntries : List EntryReq :=
  [requires signNote chiefComplaint, requires signNote hpi, requires signNote ros,
   requires signNote exam, requires signNote assessmentPlan,
   requires signNote visitDiagnosis, requires signNote claimDiagnosis,
   requires signNote levelOfService, requires signNote followUp,
   requires signNote patientInstructions, requires signNote medRecDecision]

/-- Hospital policy (not law): local result acknowledgment and patient-message workflow.
Acknowledging a result needs a decision. For an abnormal result, the
patient must also be sent a message.

CA H&S 123148(e) requires timely reporting; our abnormal-result message and acknowledgment gate are design choices. Special electronic-release restrictions in 123148(f) are not modeled (docs/regulations.md E19, R4). -/
def ackResultEntries : List EntryReq :=
  [requires ackResult resultAction,
   requires ackResult patientMessage (when := .abnormalResult)]

/-- Hospital policy (not law): local refill protocol for visit/lab monitoring and prescription completeness.
A refill decision needs the decision, the quantity, the number of refills,
the pharmacy, and the protocol check.

Our clinical protocol, not a legal lab/visit requirement (docs/regulations.md §3.1 E17). -/
def approveRefillEntries : List EntryReq :=
  [requires approveRefill refillDecision, requires approveRefill refillQuantity,
   requires approveRefill refillRefills, requires approveRefill refillPharmacy,
   requires approveRefill refillProtocolMet]

/-- Hospital policy (not law): local administration documentation, pain scoring and high-alert double-check procedure; barcode scans have an entrenched basis.
Giving a medication needs both scans, the status and reason, a pain score
before a pain medication, and a second nurse for a high-alert medication.

22 CCR 70749(a)(6)(C), 70263(g)(2) govern administration charting. Scans, per-dose pain scores, routine reason and double checks are our hospital policy (docs/regulations.md E12–13, H3, H5). -/
def administerMedEntries : List EntryReq :=
  [requires administerMed wristbandScan, requires administerMed medScan,
   requires administerMed adminStatus, requires administerMed adminReason,
   requires administerMed painScore (when := .medClass "analgesic"),
   requires administerMed highAlertCosign (when := .highAlertMed)]

/-- Hospital policy (not law): local nursing assessment checklist supporting shift-assessment duties.
Filing a nursing assessment needs a full set of vitals, the pain
reassessment, and the written assessment.

22 CCR 70215(a)(1) requires shift RN assessment; this precise vital-sign list and pain reassessment gate are our policy (docs/regulations.md E13). -/
def chartAssessmentEntries : List EntryReq :=
  [requires chartAssessment bpSystolic, requires chartAssessment bpDiastolic,
   requires chartAssessment heartRate, requires chartAssessment respRate,
   requires chartAssessment temperature, requires chartAssessment spo2,
   requires chartAssessment painReassessment, requires chartAssessment nursingAssessment]

/-- Law: 42 USC 300aa-25(a), 300aa-26(d); site/route gating is hospital policy.
Recording a vaccine needs the vaccine, lot, site, route, and the VIS.

42 USC 300aa-25(a) covers record content and 300aa-26(d) VIS before administration. Site/route gating is our policy. The VIS edition date, manufacturer and provider are now required; this demo still does not model every statutory field or establish actual VIS delivery timing (docs/regulations.md E11). -/
def recordImmunizationEntries : List EntryReq :=
  [requires recordImmunization vaccine, requires recordImmunization vaccineLot,
   requires recordImmunization vaccineSite, requires recordImmunization vaccineRoute,
   requires recordImmunization visGiven, requires recordImmunization visEditionDate,
   requires recordImmunization vaccineManufacturer, requires recordImmunization vaccineProvider]

/-- Hospital policy (not law): local operative report checklist supporting the legal report duty.
The brief op note needs the diagnoses, procedure, anesthesia, findings,
blood loss, specimens, complications, and condition.

42 CFR 482.51(b)(6) requires the operative report and surgeon signature; 22 CCR 70749(a)(12) includes it in the record. This detailed field list is our implementation (docs/regulations.md E15). -/
def signOpNoteEntries : List EntryReq :=
  [requires signOpNote opPreopDiagnosis, requires signOpNote opPostopDiagnosis,
   requires signOpNote opProcedure, requires signOpNote opAnesthesia,
   requires signOpNote opFindings, requires signOpNote opEbl,
   requires signOpNote opSpecimens, requires signOpNote opComplications,
   requires signOpNote opCondition]

/-- Hospital policy (not law): local discharge checklist implementing a subset of discharge duties.
Discharge needs the medication reconciliation, diagnosis, follow-up,
instructions, condition, and destination.

42 CFR 482.43, 482.24(c)(4)(vii); CA H&S 1262.5; 22 CCR 70707(b)(13). This demo models a subset of discharge duties (docs/regulations.md E16). -/
def dischargeEntries : List EntryReq :=
  [requires discharge dischargeMedRec, requires discharge dischargeDiagnosis,
   requires discharge dischargeFollowUp, requires discharge dischargeInstructions,
   requires discharge dischargeCondition, requires discharge dischargeDestination]

/-- Hospital policy (not law): local ED disposition documentation checklist.
The ED disposition needs the choice, the diagnosis, and the condition.

Our ED workflow gate, modeled on discharge record requirements; no law mandates this exact screen or field list (docs/regulations.md E20). -/
def dispositionEntries : List EntryReq :=
  [requires disposition dispositionChoice, requires disposition visitDiagnosis,
   requires disposition dispositionCondition]

/-- Product design property.
Every entry requirement in spec v1. -/
def entries : List EntryReq :=
  orderSigningEntries signOrders ++
  preOpExtraEntries ++ signNoteEntries ++ ackResultEntries ++ approveRefillEntries ++
  administerMedEntries ++ chartAssessmentEntries ++ recordImmunizationEntries ++
  signOpNoteEntries ++ dischargeEntries ++ dispositionEntries

/-! ## Review requirements: what must be seen before each commit -/

/-- Product design property.
`mustShow c i`: info `i` must be shown on the screen where commit `c` is
done. No receipt counts. -/
def mustShow (c : CommitSpec) (i : InfoSpec) (when : When := .always) : ReviewReq :=
  { commit := c.id, info := i.id, mode := .shownOnCommit, when }

/-- Product design property.
`showOrReceipt c i minutes roles`: info `i` must be shown on the commit
screen, unless one of `roles` reviewed the same version within `minutes`. -/
def showOrReceipt (c : CommitSpec) (i : InfoSpec) (minutes : Nat) (roles : List Role)
    (when : When := .always) : ReviewReq :=
  { commit := c.id, info := i.id, mode := .shownOrReceipt minutes roles, when }

/-- Law: CA H&S 11165.4(a), (c); the modeled review gate is stricter.
Before signing a Schedule II–IV controlled substance: the CURES report,
shown or reviewed by a prescriber in the last 24 hours, unless the prescriber
records a statutory exemption (CA Health and Safety Code §11165.4).

CA H&S 11165.4(a)(1)–(2), (c). Law requires first prescribing and six-month rechecks, with data obtained within 24 h or the previous business day. Our every-signing, 24 h-only, prescriber-only display/receipt gate is stricter and does not model delegation or all exemptions (docs/regulations.md §2.2, C1). -/
def curesReview (c : CommitSpec) : ReviewReq :=
  { showOrReceipt c curesReport 1440 prescribers (when := .orderClass "controlled-II-IV") with
    waivedBy? := some curesExemptionReason.id }

/-- Law: 21 CFR 1311.140(a)(1), (3)–(5), referencing 1311.120(b)(9).
The patient and prescription details (drug, dose, quantity, directions, refills)
stay shown while signing a controlled prescription. No receipt or waiver
substitutes for display. The interpreter also refuses macro commits
(`Core/Interp.lean`, `clickCore`: `human only: commit`; T3/T6).
Applying this to facility orders too is our stricter demo policy. This is not
a model of DEA two-factor authentication or full EPCS compliance.
Source: https://www.ecfr.gov/current/title-21/chapter-II/part-1311/subpart-C/section-1311.140 -/
def controlledRxReview (c : CommitSpec) : ReviewReq :=
  mustShow c orderSummary (.orderClass "controlled-II-IV")

/-- Hospital policy (not law): local allergy, medication and dose review protocol; CURES and EPCS retain separate legal bases.
Before signing medication orders: the allergy list and current medications
(shown, or reviewed by a prescriber in the last 4 hours), the dose check
(shown for weight-based orders), and, for controlled substances, the CURES report.

45 CFR 170.315(a)(4) requires automatic drug checks in certified technology, not these list displays. List display, roles and receipt windows are our design. Dose display follows ISMP kg guidance; no-receipt is our choice (docs/regulations.md R2–3). Controlled-prescription details remain displayed during signing under 21 CFR 1311.140(a)(3)–(4); applying this no-receipt gate to every controlled order, including facility orders, is our stricter demo policy. -/
def orderSigningReviews (c : CommitSpec) : List ReviewReq :=
  [showOrReceipt c allergyList 240 prescribers,
   showOrReceipt c currentMeds 240 prescribers,
   mustShow c doseCheck (.weightBased),
   curesReview c,
   controlledRxReview c]

/-- Hospital policy (not law): local pre-op anticoagulant review and sign-screen placement.
Before signing pre-op orders: also the anticoagulant list, always shown.

TJC NPG anticoagulant protocols support review; sign-screen display is our policy, not law (docs/regulations.md R5). -/
def preOpExtraReviews : List ReviewReq :=
  [mustShow signOrders anticoagulantList (.encounter "preop")]

/-- Hospital policy (not law): local abnormal-result trend display and acknowledgment workflow.
Before acknowledging a result: the result itself, and its trend when it is
abnormal. Both shown on the screen; no receipt counts.

SAFER Test Results supports acknowledgment; trend display and no-receipt are our choices. CLIA 42 CFR 493.1291(g) binds the lab, not this screen (docs/regulations.md R4). -/
def ackResultReviews : List ReviewReq :=
  [mustShow ackResult resultDetail,
   mustShow ackResult resultTrend (when := .abnormalResult)]

/-- Hospital policy (not law): local refill monitoring protocol; receipt windows are product design.
Before a refill decision: the relevant labs (always shown), and the last
visit and fill history (shown, or reviewed by a prescriber in the last 7 days).

Our clinical protocol and receipt windows, not law (docs/regulations.md E17). -/
def approveRefillReviews : List ReviewReq :=
  [mustShow approveRefill relevantLabs,
   showOrReceipt approveRefill lastVisit 10080 [.physician, .np],
   showOrReceipt approveRefill adherence 10080 [.physician, .np]]

/-- Hospital policy (not law): local dose, glucose and coagulation review protocol; receipt windows are product design.
Before giving a medication: the allergy list (shown, or reviewed by a nurse
this 12-hour shift), the dose details (always shown), recent glucose before
insulin, and coagulation labs before an anticoagulant.

Our hospital review policy; list display, glucose/coagulation display and the 12 h receipt window are not statutory mandates (docs/regulations.md R2, H3, H5). -/
def administerMedReviews : List ReviewReq :=
  [showOrReceipt administerMed allergyList 720 nurses,
   mustShow administerMed marDoseDetails,
   mustShow administerMed glucoseTrend (when := .medClass "insulin"),
   mustShow administerMed coagLabs (when := .medClass "anticoagulant")]

/-- Hospital policy (not law): local allergy and immunization-history review protocol; receipt windows are product design.
Before recording a vaccine: the allergy list and the immunization history
(shown, or reviewed by a vaccinator in the last 12 hours).

Our safety review and receipt policy, beyond the federal vaccine record and VIS duties (docs/regulations.md E11). -/
def recordImmunizationReviews : List ReviewReq :=
  [showOrReceipt recordImmunization allergyList 720 vaccinators,
   showOrReceipt recordImmunization immunizationHistory 720 vaccinators]

/-- Hospital policy (not law): local intra-operative record review; receipt window is product design.
Before signing the op note: the intra-op record (shown, or reviewed by a
surgeon in the last 4 hours).

Our review window, supporting the operative report duty in 42 CFR 482.51(b)(6); no law specifies this receipt (docs/regulations.md E15). -/
def signOpNoteReviews : List ReviewReq :=
  [showOrReceipt signOpNote intraopRecord 240 surgeons]

/-- Hospital policy (not law): local discharge medication review; receipt window is product design.
Before discharge: the current medications (always shown, for discharge
reconciliation) and the allergy list (shown, or reviewed in the last 4 hours).

Our display/receipt implementation of reconciliation and discharge duties; see CA H&S 1262.5 and TJC medication reconciliation (docs/regulations.md E10, E16). -/
def dischargeReviews : List ReviewReq :=
  [mustShow discharge currentMeds,
   showOrReceipt discharge allergyList 240 [.surgeon, .physician, .np]]

/-- Hospital policy (not law): local ED disposition vital-sign display.
Before the ED disposition: the latest vital signs, always shown.

Our commit-screen display policy, not a statutory UI requirement (docs/regulations.md E20). -/
def dispositionReviews : List ReviewReq :=
  [mustShow disposition vitals]

/-- Product design property.
Every review requirement in spec v1. -/
def reviews : List ReviewReq :=
  orderSigningReviews signOrders ++
  preOpExtraReviews ++ ackResultReviews ++ approveRefillReviews ++
  administerMedReviews ++ recordImmunizationReviews ++ signOpNoteReviews ++
  dischargeReviews ++ dispositionReviews

/-! ## Alerts

Interruptive alerts pop up and must be acknowledged by a human before the
commit they concern. Passive alerts are shown inline and never pop up.
Sources: 45 CFR 170.315(a)(4) binds certified technology for drug–allergy
and drug–drug checks. Human acknowledgments, exact tiers, repetition control
and removable/passive choices are our design, informed by SAFER CPOE. Dose,
kg and high-alert warnings follow ISMP best practice, not law. See
`docs/regulations.md` §3.4 A-1–A-8 and A1–A4.

Removable alerts are accidental friction: a program may pop them up, show them
inline, or drop them. Every alert appears only when its trigger holds. -/

/-- Product design property.
Interruptive: an ordered drug matches one of the patient's allergies. -/
def drugAllergyOrderAlert : AlertSpec :=
  { id := "drugAllergyOrder", label := "Drug–allergy match", cond := .drugAllergy,
    tier := .interruptive, commit := signOrders.id }

/-- Product design property.
Interruptive: the drug about to be given matches one of the patient's allergies. -/
def drugAllergyAdminAlert : AlertSpec :=
  { id := "drugAllergyAdmin", label := "Drug–allergy match (administration)",
    cond := .drugAllergy, tier := .interruptive, commit := administerMed.id }

/-- Product design property.
Interruptive: an ordered drug has a severe interaction with a current medication. -/
def interactionOrderAlert : AlertSpec :=
  { id := "interactionOrder", label := "Severe drug–drug interaction", cond := .interaction,
    tier := .interruptive, commit := signOrders.id }

/-- Product design property.
Interruptive: the refilled drug has a severe interaction with a current medication. -/
def interactionRefillAlert : AlertSpec :=
  { id := "interactionRefill", label := "Severe drug–drug interaction (refill)",
    cond := .interaction, tier := .interruptive, commit := approveRefill.id }

/-- Product design property.
Interruptive: an ordered dose is outside the usual range for today's weight. -/
def doseRangeOrderAlert : AlertSpec :=
  { id := "doseRangeOrder", label := "Dose out of range for weight", cond := .doseOutOfRange,
    tier := .interruptive, commit := signOrders.id }

/-- Product design property.
Interruptive: the weight was entered in pounds. It must be re-entered in kg. -/
def weightInLbAlert : AlertSpec :=
  { id := "weightInLb", label := "Weight entered in pounds", cond := .weightInLb,
    tier := .interruptive, commit := signOrders.id }

/-- Product design property.
Interruptive: a high-alert medication (insulin, heparin, …) is about to be
given; an independent double check is required. -/
def highAlertAdminAlert : AlertSpec :=
  { id := "highAlertAdmin", label := "High-alert medication: double check required",
    cond := .highAlertMed, tier := .interruptive, commit := administerMed.id }

/-- Product design property.
Passive: the patient has care gaps (screenings due). Shown inline throughout the adult workflow. -/
def careGapsInlineAlert : AlertSpec :=
  { id := "careGapsInline", label := "Care gaps due", cond := .careGap, tier := .passive,
    commit := signNote.id, screens := ["W1"] }

/-- Product design property.
Passive: an ordered drug duplicates a current therapy (low severity).
Shown inline throughout the adult workflow. -/
def duplicateTherapyInlineAlert : AlertSpec :=
  { id := "duplicateTherapyInline", label := "Possible duplicate therapy",
    cond := .duplicateTherapy, tier := .passive, commit := signOrders.id,
    screens := ["W1"] }

/-- Product design property.
Passive: vaccines are due. Shown inline throughout the pediatric workflow. -/
def immunizationsDueInlineAlert : AlertSpec :=
  { id := "immunizationsDueInline", label := "Immunizations due", cond := .careGap,
    tier := .passive, commit := recordImmunization.id, screens := ["W5"] }

/-- Product design property.
Removable: a "health maintenance reminder" popup when closing a visit with
care gaps. The same gaps are already shown inline. -/
def healthMaintenancePopupAlert : AlertSpec :=
  { id := "healthMaintenancePopup", label := "Health maintenance reminder",
    cond := .careGap, tier := .removable, commit := signNote.id }

/-- Product design property.
Removable: a "high-alert medication ordered, review policy" notice when
signing orders. The nurse's double check is the real safeguard. -/
def highAlertOrderNoticeAlert : AlertSpec :=
  { id := "highAlertOrderNotice", label := "High-alert medication ordered: review policy",
    cond := .highAlertMed, tier := .removable, commit := signOrders.id }

/-- Product design property.
Removable: "patient already has an active prescription for this drug" when
refilling. A refill always matches an active prescription. -/
def activeRxPopupAlert : AlertSpec :=
  { id := "activeRxPopup", label := "Active prescription exists for this drug",
    cond := .duplicateTherapy, tier := .removable, commit := approveRefill.id }

/-- Product design property.
Removable: a care-gap reminder popup during a refill. -/
def refillCareGapPopupAlert : AlertSpec :=
  { id := "refillCareGapPopup", label := "Patient has care gaps", cond := .careGap,
    tier := .removable, commit := approveRefill.id }

/-- Product design property.
Removable: a minor-interaction information popup at administration. The
prescriber already handled interactions when ordering. -/
def minorInteractionPopupAlert : AlertSpec :=
  { id := "minorInteractionPopup", label := "Interaction information",
    cond := .interaction, tier := .removable, commit := administerMed.id }

/-- Product design property.
Every alert in spec v1. -/
def alerts : List AlertSpec := [
  -- interruptive
  drugAllergyOrderAlert, drugAllergyAdminAlert,
  interactionOrderAlert, interactionRefillAlert,
  doseRangeOrderAlert, weightInLbAlert, highAlertAdminAlert,
  -- passive
  careGapsInlineAlert, duplicateTherapyInlineAlert, immunizationsDueInlineAlert,
  -- removable
  healthMaintenancePopupAlert, highAlertOrderNoticeAlert, activeRxPopupAlert,
  refillCareGapPopupAlert, minorInteractionPopupAlert
]

/-! ## Design rules -/

/-- Product design property.
The component kinds a program may use (the catalog). -/
def catalog : List String :=
  ["banner", "field", "panel", "table", "trend", "alert", "button", "group", "tabs",
   "macro", "search"]

/-- Product design property.
Design rules for v1:
- every required element is at most 8 navigation steps from the start screen;
- text smaller than 12 pt does not count as shown;
- at most 8 components move per accepted version (copies are free);
- the patient banner is on every screen;
- only catalog components are used.

All numeric limits, pinned placement, catalog enforcement and stability rules are our design. TJC NPG.01.01.01 supports two identifiers; SAFER supports visible photos/identifiers, not our exact layout (docs/regulations.md §3.2 R1, §3.5). -/
def design : DesignRules where
  maxDepth := 8
  minTextSize := 12
  stabilityBudget := 8
  landmarks := [patientBanner.id]
  catalog := catalog

/-! ## The spec -/

/-- Product design property.
The hospital spec, version "v1". -/
def specV1 : Spec where
  version := "v1"
  elements := elements
  infos := infos
  commits := commits
  entries := entries
  reviews := reviews
  alerts := alerts
  design := design

/-! ## Self-checks

These run at build time. They check that the spec is consistent: no duplicate
names, and every requirement and alert points at something the spec declares. -/

/-- Product design property.
`true` when the list has no repeated entries. -/
def allDistinct (xs : List String) : Bool :=
  xs.length == xs.eraseDups.length

#guard allDistinct (specV1.elements.map (·.id))
#guard allDistinct (specV1.infos.map (·.id))
#guard allDistinct (specV1.commits.map (·.id))
#guard allDistinct (specV1.alerts.map (·.id))
-- Requirements and alerts point at declared commits, elements, and infos.
#guard specV1.entries.all fun r =>
  specV1.commits.any (·.id == r.commit) && specV1.elements.any (·.id == r.element)
#guard specV1.reviews.all fun r =>
  specV1.commits.any (·.id == r.commit) && specV1.infos.any (·.id == r.info)
#guard specV1.alerts.all fun a => specV1.commits.any (·.id == a.commit)
-- Linked elements name a declared element, and only `autoLinked` ones have a link.
#guard specV1.elements.all fun e =>
  match e.linkedFrom? with
  | some src => e.prefill == .autoLinked && specV1.elements.any (·.id == src)
  | none => e.prefill != .autoLinked
-- Human-only elements are never pre-filled.
#guard specV1.elements.all fun e => !e.humanOnly || e.prefill == .never
-- A waiver names a declared element.
#guard specV1.reviews.all fun r =>
  match r.waivedBy? with
  | some e => specV1.elements.any (·.id == e)
  | none => true
-- Every commit has at least one requirement.
#guard specV1.commits.all fun c =>
  specV1.entries.any (·.commit == c.id) || specV1.reviews.any (·.commit == c.id)
-- Spec size: at least 12 alerts, in all three tiers.
#guard specV1.alerts.length ≥ 12
#guard [Tier.interruptive, .passive, .removable].all fun t => specV1.alerts.any (·.tier == t)

end Ehr.Specs.V1
