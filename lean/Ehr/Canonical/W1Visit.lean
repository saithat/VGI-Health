import Ehr.Canonical.Builders

/-!
# W1: adult outpatient visit (P1, primary care)

Rooming → medication reconciliation → HPI/ROS → exam and A&P → orders (and
labs) → order verification → sign orders → visit close (sign note).

Deliberate friction (BRIEF 5):
- allergies are asked about three times: "mark reviewed" in rooming, a
  checkbox in the composer, and a checkbox on the verification step;
- weight is typed in rooming and displayed again as a linked dosing weight;
- the diagnosis is typed for the visit, for each order line, and again for
  the claim (the declared auto-linked copies now carry their source);
- an extra "order verification" screen sits between the composer and the sign
  screen;
- copy-forward and templates fill long text (note bloat);
- recent labs and fill history are one tab away; the CURES report is on the
  composer's second tab;
- a removable "health maintenance" popup at visit close.

Kept: patient-ID re-entry, interaction and allergy acknowledgments, signing.
The allergy list, current meds, dose check, and CURES report are on the sign
screen itself.
-/

namespace Ehr.Canonical.W1

open Ehr.Canonical

/-- The W1 visit navigator (the sign and verification steps are reached only
through the composer). -/
def nav : List (ScreenId × String) :=
  [("w1Rooming", "Rooming"), ("w1MedRec", "Med rec"), ("w1Hpi", "HPI / ROS"),
   ("w1Exam", "Exam / A&P"), ("w1Orders", "Orders"), ("w1Labs", "Labs"),
   ("w1Close", "Visit close")]

/-- The chart-review tabs on W1 screens. -/
def chart : List Block :=
  [(.table, "labResults", "Results"), (.table, "imaging", "Imaging"),
   (.panel, "priorNotes", "Notes"), (.table, "encounterHistory", "Encounters"),
   (.panel, "socialHistory", "Social history"), (.panel, "familyHistory", "Family history"),
   (.table, "careGapList", "Care gaps"), (.table, "immunizationHistory", "Immunizations"),
   (.panel, "coverage", "Coverage")]

/-- The shell for a W1 screen. -/
def frame (s : ScreenId) : List Component := shell s nav clinicSidebar chart

/-- Rooming: vital signs, chief complaint, intake questions, depression screen,
care gaps (inline), and the allergy review. -/
def rooming : Screen :=
  let s := "w1Rooming"
  { id := s, title := "Rooming", workflow := "W1"
    components := frame s ++ [
      group s "vitalsGroup" "Vital signs",
      field s "weight" "weight" "Weight (kg)" (parent := some "vitalsGroup"),
      field s "height" "height" "Height (cm)" (parent := some "vitalsGroup"),
      field s "bpSystolic" "bpSystolic" "BP systolic" (parent := some "vitalsGroup"),
      field s "bpDiastolic" "bpDiastolic" "BP diastolic" (parent := some "vitalsGroup"),
      field s "heartRate" "heartRate" "Heart rate" (parent := some "vitalsGroup"),
      field s "respRate" "respRate" "Respiratory rate" (parent := some "vitalsGroup"),
      field s "temperature" "temperature" "Temperature" (parent := some "vitalsGroup"),
      field s "spo2" "spo2" "SpO₂" (parent := some "vitalsGroup"),
      field s "painScore" "painScore" "Pain (0–10)" (parent := some "vitalsGroup"),
      field s "chiefComplaint" "chiefComplaint" "Chief complaint"
        (prefill := .fromRecord "appointmentReason"),
      group s "intake" "Intake questions",
      field s "tobaccoUse" "tobaccoUse" "Tobacco use" (parent := some "intake"),
      field s "fallRiskScreen" "fallRiskScreen" "Fall in the past year?" (parent := some "intake"),
      field s "travelScreen" "travelScreen" "Travel in the past 30 days?" (parent := some "intake"),
      field s "advanceDirectiveAsked" "advanceDirectiveAsked" "Advance directive discussed"
        (parent := some "intake"),
      field s "interpreterNeeded" "interpreterNeeded" "Interpreter needed?" (parent := some "intake"),
      field s "pharmacyConfirmedRooming" "pharmacyConfirmedRooming" "Preferred pharmacy confirmed"
        (parent := some "intake"),
      group s "phq" "Depression screen (PHQ-2)",
      field s "depressionScreen" "depressionScreen" "PHQ-2 score" (parent := some "phq"),
      alertC s "careGaps" "careGapsInline" "Care gaps due" (popup := false),
      group s "allergyGroup" "Allergies",
      panel s "allergies" "allergyList" "Allergies" (parent := some "allergyGroup"),
      reviewBtn s "allergyList" "Mark allergies reviewed" (parent := some "allergyGroup"),
      goto s "next" "w1MedRec" "Next: medication reconciliation"
    ] }

/-- Medication reconciliation: the medication list, a decision per medication,
and the fill history (one tab away). -/
def medRec : Screen :=
  let s := "w1MedRec"
  { id := s, title := "Med rec", workflow := "W1"
    components := frame s ++ [
      table s "meds" "currentMeds" "Medication list",
      reviewBtn s "currentMeds" "Mark medications reviewed",
      group s "rows" "Reconciliation"] ++
      ((List.range 4).map fun i =>
        field s ("decision" ++ toString i) "medRecDecision"
          s!"Medication {i + 1}: continue / stop / modify" (parent := some "rows") (slot := .fixed i)) ++
      tabStrip s "medTabs" "Medication history"
        [(.panel, "priorNotes", "Last plan"), (.table, "adherence", "Fill history")] ++ [
      goto s "next" "w1Hpi" "Next: HPI / ROS"
    ] }

/-- HPI and review of systems, with copy-forward and a template. -/
def hpi : Screen :=
  let s := "w1Hpi"
  { id := s, title := "HPI / ROS", workflow := "W1"
    components := frame s ++ [
      macroBtn s "copyForward" "w1CopyForward" "Copy forward last note",
      macroBtn s "rosTemplate" "w1RosTemplate" "ROS template (12 systems negative)",
      group s "lastNote" "Last note" (startCollapsed := true),
      panel s "lastNoteText" "priorNotes" "Last note" (parent := some "lastNote"),
      field s "hpi" "hpi" "History of present illness",
      field s "ros" "ros" "Review of systems",
      goto s "next" "w1Exam" "Next: exam and A&P"
    ] }

/-- Exam, assessment and plan, and the visit diagnosis. -/
def exam : Screen :=
  let s := "w1Exam"
  { id := s, title := "Exam / A&P", workflow := "W1"
    components := frame s ++ [
      macroBtn s "examTemplate" "w1ExamTemplate" "Normal exam template",
      field s "exam" "exam" "Physical exam",
      field s "assessmentPlan" "assessmentPlan" "Assessment and plan",
      table s "problems" "problemList" "Problem list",
      field s "visitDiagnosis" "visitDiagnosis" "Visit diagnosis (ICD-10)",
      goto s "next" "w1Orders" "Next: orders"
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
  { id := s, title := "Lab orders", workflow := "W1"
    components := frame s ++ [
      searchC s "labSearch" "loinc" "Search lab tests",
      group s "labOrder" "Lab order",
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
  { id := s, title := "Verify orders", workflow := "W1"
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
  { id := s, title := "Sign orders", workflow := "W1"
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
      goto s "next" "w1Close" "Next: visit close",
      goto s "edit" "w1Orders" "Edit orders"
    ] }

/-- Visit close: billing diagnosis, level of service, follow-up, instructions,
and Sign note. A removable health-maintenance popup fires at signing. -/
def close : Screen :=
  let s := "w1Close"
  { id := s, title := "Close visit", workflow := "W1"
    components := frame s ++ [
      panel s "noteReview" "noteSummary" "Note review",
      field s "claimDiagnosis" "claimDiagnosis" "Billing diagnosis (ICD-10)",
      field s "levelOfService" "levelOfService" "Level of service",
      field s "followUp" "followUp" "Follow-up",
      macroBtn s "avsTemplate" "w1AvsTemplate" "Instructions template",
      field s "patientInstructions" "patientInstructions" "Patient instructions",
      table s "gaps" "careGapList" "Care gaps",
      alertC s "alert.healthMaintenance" "healthMaintenancePopup" "Health maintenance reminder"
        (popup := true),
      commitBtn s "signNote" "Sign note"
    ] }

/-- Long copy-forward text: the realistic note bloat. -/
def copiedHpi : String :=
  "Patient returns for follow-up of chronic conditions. Since the last visit the patient " ++
  "reports doing well overall. Denies chest pain, shortness of breath, palpitations. " ++
  "Taking medications as prescribed. No ED visits or hospitalizations. Diet and exercise " ++
  "discussed at the last visit. (Copied forward from the note of the last visit.)"

/-- The W1 macros: copy-forward, templates, and the preference list. -/
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
