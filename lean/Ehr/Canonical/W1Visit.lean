import Ehr.Canonical.Builders

/-!
W1: adult outpatient visit, from rooming to orders and visit close.
The baseline repeats reviews and billing diagnoses and includes note templates.
Linked diagnosis and weight copies retain their source.
Signing keeps patient-ID re-entry, alert acknowledgments and the required
allergy, medication, dose and CURES reviews.
-/

namespace Ehr.Canonical.W1

open Ehr.Canonical

/-- The encounter section list. Order review and signing are composer actions. -/
def nav : List (ScreenId × String) :=
  [("w1Rooming", "Rooming"), ("w1MedRec", "Medications"), ("w1Hpi", "History / ROS"),
   ("w1Exam", "Exam / Assessment & Plan"), ("w1Orders", "Orders"), ("w1Labs", "Lab Orders"),
   ("w1Close", "Sign Visit")]

/-- The chart-history tabs on W1 screens. -/
def chart : List Block :=
  [(.table, "encounterHistory", "Encounters"), (.panel, "priorNotes", "Notes"),
   (.table, "labResults", "Results"), (.table, "currentMeds", "Medications"),
   (.table, "problemList", "Problems"), (.table, "allergyList", "Allergies"),
   (.table, "imaging", "Imaging")]

/-- The shell for a W1 screen. -/
def frame (s : ScreenId) : List Component := ambulatoryShell s nav chart

/-- Rooming: vital signs, chief complaint, intake questions, depression screen,
care gaps (inline), and the allergy review. -/
def rooming : Screen :=
  let s := "w1Rooming"
  { id := s, title := "Rooming", workflow := "W1"
    components := frame s ++ [
      clinicalSection s "reason" "Reason for visit",
      field s "chiefComplaint" "chiefComplaint" "Chief complaint"
        (parent := some "reason") (prefill := .fromRecord "appointmentReason"),
      clinicalSection s "vitalsGroup" "Vitals",
      field s "weight" "weight" "Weight (kg)" (parent := some "vitalsGroup"),
      field s "height" "height" "Height (cm)" (parent := some "vitalsGroup"),
      field s "bpSystolic" "bpSystolic" "Systolic BP (mmHg)" (parent := some "vitalsGroup"),
      field s "bpDiastolic" "bpDiastolic" "Diastolic BP (mmHg)" (parent := some "vitalsGroup"),
      field s "heartRate" "heartRate" "Pulse (beats/min)" (parent := some "vitalsGroup"),
      field s "respRate" "respRate" "Respirations (/min)" (parent := some "vitalsGroup"),
      field s "temperature" "temperature" "Temperature (°C)" (parent := some "vitalsGroup"),
      field s "spo2" "spo2" "SpO₂ (%)" (parent := some "vitalsGroup"),
      field s "painScore" "painScore" "Pain (0–10)" (parent := some "vitalsGroup"),
      clinicalSection s "allergyGroup" "Allergies",
      table s "allergies" "allergyList" "Allergy review" (parent := some "allergyGroup"),
      reviewBtn s "allergyList" "Mark allergies reviewed" (parent := some "allergyGroup") (feedback := true),
      clinicalSection s "intake" "Screenings and pharmacy",
      field s "tobaccoUse" "tobaccoUse" "Tobacco use" (parent := some "intake"),
      field s "fallRiskScreen" "fallRiskScreen" "Fall in the past year?" (parent := some "intake"),
      field s "travelScreen" "travelScreen" "Travel in the past 30 days?" (parent := some "intake"),
      field s "advanceDirectiveAsked" "advanceDirectiveAsked" "Advance directive discussed"
        (parent := some "intake"),
      field s "interpreterNeeded" "interpreterNeeded" "Interpreter needed?" (parent := some "intake"),
      field s "pharmacyConfirmedRooming" "pharmacyConfirmedRooming" "Preferred pharmacy confirmed"
        (parent := some "intake"),
      clinicalSection s "phq" "Depression screening",
      field s "depressionScreen" "depressionScreen" "PHQ-2 score" (parent := some "phq"),
      alertC s "careGaps" "careGapsInline" "Care gaps due" (popup := false),
      table s "healthMaintenance" "careGapList" "Health maintenance",
      goto s "next" "w1MedRec" "Review medications"
    ] }

/-- Medication reconciliation: the medication list, a decision per medication,
and the fill history (one tab away). -/
def medRec : Screen :=
  let s := "w1MedRec"
  { id := s, title := "Medication Review", workflow := "W1"
    components := frame s ++ [
      table s "meds" "currentMeds" "Medication list",
      reviewBtn s "currentMeds" "Mark medications reviewed" (feedback := true),
      clinicalSection s "rows" "Reconcile medications"] ++
      ((List.range 4).map fun i =>
        let c := field s ("decision" ++ toString i) "medRecDecision"
          s!"Medication {i + 1}: continue / stop / modify" (parent := some "rows") (slot := .fixed i)
        { c with tag := c.tag ++ ".context.currentMedication" }) ++
      tabStrip s "medTabs" "Medication history"
        [(.panel, "priorNotes", "Last plan"), (.table, "adherence", "Fill history")] ++ [
      goto s "next" "w1Hpi" "History / ROS"
    ] }

/-- HPI and review of systems, with copy-forward and a template. -/
def hpi : Screen :=
  let s := "w1Hpi"
  { id := s, title := "History / ROS", workflow := "W1"
    components := frame s ++ [
      clinicalSection s "noteTools" "Note tools",
      macroBtn s "copyForward" "w1CopyForward" "Copy previous note" (parent := some "noteTools"),
      macroBtn s "rosTemplate" "w1RosTemplate" "Normal ROS template" (parent := some "noteTools"),
      group s "lastNote" "Last note" (startCollapsed := true),
      panel s "lastNoteText" "priorNotes" "Last note" (parent := some "lastNote"),
      clinicalSection s "historyNote" "History of present illness",
      field s "hpi" "hpi" "HPI" (parent := some "historyNote"),
      clinicalSection s "systems" "Review of systems",
      field s "ros" "ros" "ROS" (parent := some "systems")] ++
      tabStrip s "historyTabs" "Patient history"
        [(.table, "problemList", "Medical history"), (.table, "surgicalHistory", "Surgical history"),
         (.panel, "familyHistory", "Family history"), (.panel, "socialHistory", "Social history")] ++ [
      goto s "next" "w1Exam" "Exam / Assessment & Plan"
    ] }

/-- Exam, assessment and plan, and the visit diagnosis. -/
def exam : Screen :=
  let s := "w1Exam"
  { id := s, title := "Exam / Assessment & Plan", workflow := "W1"
    components := frame s ++ [
      clinicalSection s "physical" "Physical exam",
      macroBtn s "examTemplate" "w1ExamTemplate" "Normal exam template" (parent := some "physical"),
      field s "exam" "exam" "Exam findings" (parent := some "physical"),
      clinicalSection s "assessment" "Assessment & Plan",
      field s "visitDiagnosis" "visitDiagnosis" "Encounter diagnosis (ICD-10-CM)" (parent := some "assessment"),
      field s "assessmentPlan" "assessmentPlan" "Problem-based assessment and plan" (parent := some "assessment"),
      group s "problemReview" "Problem list" (startCollapsed := true),
      table s "problems" "problemList" "Chart problems" (parent := some "problemReview"),
      goto s "next" "w1Orders" "Place orders"
    ] }

/-- The W1 order composer. -/
def orders : Screen :=
  let s := "w1Orders"
  { id := s, title := "Orders", workflow := "W1"
    components := frame s ++ orderComposer s {
      prefs := [("prefLisinopril", "w1PrefLisinopril", "Lisinopril 10 mg daily"),
                ("prefAtorvastatin", "w1PrefAtorvastatin", "Atorvastatin 40 mg daily"),
                ("prefMetformin", "w1PrefMetformin", "Metformin 500 mg BID"),
                ("prefAmoxicillin", "w1PrefAmoxicillin", "Amoxicillin 1 g TID × 10 days"),
                ("prefAzithromycin", "w1PrefAzithromycin", "Azithromycin 500 mg daily × 5 days"),
                ("prefIbuprofen", "w1PrefIbuprofen", "Ibuprofen 600 mg TID"),
                ("prefOxycodone", "w1PrefOxycodone", "Oxycodone 10 mg q6h PRN × 5 days")]
      inlineAlerts := [("dupTherapy", "duplicateTherapyInline", "Possible duplicate therapy")]
      pharmacyPrefill := .fromRecord "preferredPharmacy"
      signScreen := "w1Verify"
      extraNav := [("w1Labs", "Lab orders")] } }

/-- Lab orders with a diagnosis association. -/
def labs : Screen :=
  let s := "w1Labs"
  { id := s, title := "Lab Orders", workflow := "W1"
    components := frame s ++ [
      searchC s "labSearch" "loinc" "Search lab tests",
      clinicalSection s "labOrder" "Order details",
      field s "labTest" "labTest" "Test" (parent := some "labOrder"),
      field s "labDiagnosis" "labDiagnosis" "Diagnosis (ICD-10)" (parent := some "labOrder"),
      field s "labPriority" "labPriority" "Priority" (parent := some "labOrder"),
      field s "labFasting" "labFasting" "Fasting required" (parent := some "labOrder"),
      table s "recent" "labResults" "Recent results",
      table s "pending" "orderSummary" "Pending orders",
      goto s "toMeds" "w1Orders" "Medication orders",
      goto s "toSign" "w1Verify" "Review and sign"
    ] }

/-- Order verification: an extra step that shows the orders and the allergies
again and asks for one more allergy checkbox (accidental friction). -/
def verify : Screen :=
  let s := "w1Verify"
  { id := s, title := "Order Review", workflow := "W1"
    components := frame s ++ [
      table s "orders" "orderSummary" "Orders to sign",
      panel s "allergies" "allergyList" "Allergies",
      field s "allergyReconfirmSigning" "allergyReconfirmSigning" "Allergies re-verified before signing",
      goto s "continue" "w1Sign" "Continue to sign",
      goto s "edit" "w1Orders" "Edit orders"
    ] }

/-- Sign orders: the orders, allergies, current meds, dose check, and CURES
report are shown; alerts; patient-ID re-entry; the Sign button. -/
def sign : Screen :=
  let s := "w1Sign"
  { id := s, title := "Sign Orders", workflow := "W1"
    components := frame s ++ [
      table s "orders" "orderSummary" "Orders to sign",
      panel s "allergies" "allergyList" "Allergies",
      table s "meds" "currentMeds" "Current medications",
      panel s "doseCheck" "doseCheck" "Dose check",
      panel s "cures" "curesReport" "CURES report",
      alertC s "alert.drugAllergy" "drugAllergyOrder" "Drug–allergy match" (popup := false),
      alertC s "alert.interaction" "interactionOrder" "Severe interaction" (popup := false),
      alertC s "alert.doseRange" "doseRangeOrder" "Dose out of range" (popup := false),
      alertC s "alert.weightLb" "weightInLb" "Weight entered in pounds" (popup := false),
      alertC s "alert.highAlert" "highAlertOrderNotice" "High-alert medication ordered"
        (popup := true),
      field s "patientIdReentry" "patientIdReentry" "Re-enter patient ID (initials/sex/age)",
      commitBtn s "signOrders" "Sign orders",
      goto s "next" "w1Close" "Sign Visit",
      goto s "edit" "w1Orders" "Edit orders"
    ] }

/-- Visit close: billing diagnosis, level of service, follow-up, instructions,
and Sign note. A removable health-maintenance popup fires at signing. -/
def close : Screen :=
  let s := "w1Close"
  { id := s, title := "Sign Visit", workflow := "W1"
    components := frame s ++ [
      { panel s "noteReview" "noteSummary" "Note review" with tag := "layout.document" },
      clinicalSection s "billing" "Level of Service",
      field s "claimDiagnosis" "claimDiagnosis" "Billing diagnosis (ICD-10-CM)" (parent := some "billing"),
      field s "levelOfService" "levelOfService" "E/M service level" (parent := some "billing"),
      clinicalSection s "followup" "Follow-up",
      field s "followUp" "followUp" "Return in" (parent := some "followup"),
      clinicalSection s "avs" "Patient Instructions / AVS",
      macroBtn s "avsTemplate" "w1AvsTemplate" "Insert instructions" (parent := some "avs"),
      field s "patientInstructions" "patientInstructions" "After-visit instructions" (parent := some "avs"),
      table s "gaps" "careGapList" "Care gaps",
      alertC s "alert.healthMaintenance" "healthMaintenancePopup" "Health maintenance reminder"
        (popup := true),
      commitBtn s "signNote" "Sign Visit"
    ] }

/-- Long copy-forward text: the realistic note bloat. -/
def copiedHpi : String :=
  "Patient returns for follow-up of chronic conditions. Since the last visit the patient " ++
  "reports doing well overall. Denies chest pain, shortness of breath, palpitations. " ++
  "Taking medications as prescribed. No ED visits or hospitalizations. Diet and exercise " ++
  "discussed at the last visit. (Copied forward from the note of the last visit.)"

/-- The W1 macros: copy-forward, templates, and the order favorites. -/
def macros : List Macro := [
  { id := "w1CopyForward", label := "Copy forward last note"
    steps := [.setValue (cid "w1Hpi" "hpi") copiedHpi,
              .setValue (cid "w1Hpi" "ros")
                "Constitutional, eyes, ENT, cardiovascular, respiratory, GI, GU, MSK, skin, neuro, psych, endocrine: negative except as in HPI. (Copied forward.)",
              .goto "w1Exam",
              .setValue (cid "w1Exam" "exam")
                "General: well appearing. HEENT: normal. Neck: supple. Heart: regular. Lungs: clear. Abdomen: soft. Extremities: no edema. (Copied forward.)",
              .setValue (cid "w1Exam" "assessmentPlan")
                "1. Hypertension: continue current regimen. 2. Type 2 diabetes: continue metformin, A1c today. 3. Hyperlipidemia: continue statin. (Copied forward.)"] },
  textMacro "w1RosTemplate" "ROS template (12 systems negative)"
    [(cid "w1Hpi" "ros",
      "Constitutional: negative. Eyes: negative. ENT: negative. Cardiovascular: negative. Respiratory: negative. GI: negative. GU: negative. MSK: negative. Skin: negative. Neuro: negative. Psych: negative. Endocrine: negative.")],
  textMacro "w1ExamTemplate" "Normal exam template"
    [(cid "w1Exam" "exam",
      "General: no acute distress. HEENT: normocephalic, atraumatic. Neck: supple. Cardiovascular: regular rate and rhythm, no murmur. Lungs: clear bilaterally. Abdomen: soft, non-tender. Extremities: no edema. Neuro: alert and oriented.")],
  textMacro "w1AvsTemplate" "Instructions template"
    [(cid "w1Close" "patientInstructions",
      "Take your medications as prescribed. Call the clinic or use the patient portal with any questions. Go to the emergency department for chest pain, trouble breathing, or fainting.")],
  preference "w1PrefLisinopril" "Lisinopril 10 mg daily" "w1Orders"
    { drug := "lisinopril", dose := "10", route := "PO", freq := "daily", duration := "90 days"
      quantity := "90", refills := "3", indication := "for blood pressure", pharmacy := ""
      diagnosis := "I10" },
  preference "w1PrefAtorvastatin" "Atorvastatin 40 mg daily" "w1Orders"
    { drug := "atorvastatin", dose := "40", route := "PO", freq := "daily", duration := "90 days"
      quantity := "90", refills := "3", indication := "for cholesterol", pharmacy := ""
      diagnosis := "E78.5" },
  preference "w1PrefMetformin" "Metformin 500 mg BID" "w1Orders"
    { drug := "metformin", dose := "500", route := "PO", freq := "bid", duration := "90 days"
      quantity := "180", refills := "3", indication := "for diabetes", pharmacy := ""
      diagnosis := "E11.9" },
  preference "w1PrefAmoxicillin" "Amoxicillin 1 g TID × 10 days" "w1Orders"
    { drug := "amoxicillin", dose := "1000", route := "PO", freq := "tid", duration := "10 days"
      quantity := "30", indication := "for infection", pharmacy := "", diagnosis := "J01.90" },
  preference "w1PrefAzithromycin" "Azithromycin 500 mg daily × 5 days" "w1Orders"
    { drug := "azithromycin", dose := "500", route := "PO", freq := "daily", duration := "5 days"
      quantity := "5", indication := "for infection", pharmacy := "", diagnosis := "J20.9" },
  preference "w1PrefIbuprofen" "Ibuprofen 600 mg TID" "w1Orders"
    { drug := "ibuprofen", dose := "600", route := "PO", freq := "tid", duration := "10 days"
      quantity := "30", indication := "for pain", pharmacy := "", diagnosis := "M54.50" },
  preference "w1PrefOxycodone" "Oxycodone 10 mg q6h PRN × 5 days" "w1Orders"
    { drug := "oxycodone", dose := "10", route := "PO", freq := "q6h", duration := "5 days"
      quantity := "20", indication := "for severe pain", pharmacy := "", diagnosis := "M54.50" }
]

/-- The W1 screens, in workflow order. -/
def screens : List Screen := [rooming, medRec, hpi, exam, orders, labs, verify, sign, close]

end Ehr.Canonical.W1
