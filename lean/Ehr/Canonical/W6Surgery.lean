import Ehr.Canonical.Builders

/-!
# W6: surgical day (P5, general surgeon)

- ED consult: review imaging and labs, write the consult note, decide; sign
  the note.
- Pre-op: verify consent, review anticoagulants and meds to hold, update the
  H&P, order the prophylactic antibiotic; sign pre-op orders.
- Brief op note; sign it.
- Post-op order set (diet, activity, VTE prophylaxis, labs, nursing, and four
  medication rows); sign orders.
- Rounding: overnight events, vitals, labs; modify orders.
- Discharge: medication reconciliation, discharge prescriptions, follow-up,
  instructions; discharge.
Post-op clinic visits use the W1 screens (a W1 variant).

Deliberate friction: weight and dosing weight are both asked on the sign
screen; the consult diagnosis is typed again for billing; the post-op order set
fills every value, and each still needs a confirm; inpatient orders still ask
for dispense quantity, refills, and pharmacy.
Kept: consent verified by the surgeon; the anticoagulant list, allergies,
current meds, dose check, and CURES report on the sign screen; patient-ID
re-entry; the intra-op record on the op-note screen; current meds on the
discharge screen.
-/

namespace Ehr.Canonical.W6

open Ehr.Canonical

/-- The W6 navigator (the sign screen is reached from the composer or the
post-op order set). -/
def nav : List (ScreenId × String) :=
  [("w6Consult", "Consult"), ("w6ConsultClose", "Consult close"), ("w6PreOp", "Pre-op"),
   ("w6Orders", "Orders"), ("w6PostOp", "Post-op order set"), ("w6OpNote", "Op note"),
   ("w6Rounding", "Rounding"), ("w6Discharge", "Discharge")]

/-- The chart-review tabs on W6 screens. -/
def chart : List Block :=
  [(.table, "imaging", "Imaging"), (.table, "labResults", "Results"),
   (.panel, "priorNotes", "Notes"), (.panel, "surgicalHistory", "Surgical history"),
   (.table, "encounterHistory", "Encounters")]

/-- The shell for a W6 screen. -/
def frame (s : ScreenId) : List Component := shell s nav hospitalSidebar chart

/-- ED consult: the request, imaging, labs, vitals; the consult note; the
surgical decision; home medications. -/
def consult : Screen :=
  let s := "w6Consult"
  { id := s, title := "Surgical consult", workflow := "W6"
    components := frame s ++ [
      panel s "request" "consultRequest" "Consult request",
      table s "imagingTable" "imaging" "Imaging",
      table s "labs" "labResults" "Labs",
      panel s "vitals" "vitals" "Vital signs",
      field s "chiefComplaint" "chiefComplaint" "Reason for consult",
      field s "hpi" "hpi" "History of present illness",
      field s "ros" "ros" "Review of systems",
      field s "exam" "exam" "Physical exam",
      field s "assessmentPlan" "assessmentPlan" "Assessment and plan",
      field s "visitDiagnosis" "visitDiagnosis" "Diagnosis (ICD-10)",
      field s "surgeryDecision" "surgeryDecision" "Surgical decision",
      group s "homeMeds" "Home medications",
      table s "meds" "currentMeds" "Home medications" (parent := some "homeMeds"),
      field s "decision0" "medRecDecision" "Medication 1: continue / stop / modify"
        (parent := some "homeMeds") (slot := .fixed 0),
      field s "decision1" "medRecDecision" "Medication 2: continue / stop / modify"
        (parent := some "homeMeds") (slot := .fixed 1),
      goto s "next" "w6ConsultClose" "Next: close consult"
    ] }

/-- Consult close: billing diagnosis, level of service, follow-up, instructions;
Sign note. -/
def consultClose : Screen :=
  let s := "w6ConsultClose"
  { id := s, title := "Close consult", workflow := "W6"
    components := frame s ++ [
      field s "claimDiagnosis" "claimDiagnosis" "Billing diagnosis (ICD-10)",
      field s "levelOfService" "levelOfService" "Level of service",
      field s "followUp" "followUp" "Plan / follow-up",
      field s "patientInstructions" "patientInstructions" "Instructions (e.g. NPO)",
      commitBtn s "signNote" "Sign consult note",
      goto s "next" "w6PreOp" "Next: pre-op"
    ] }

/-- Pre-op: consent, anticoagulants and meds to hold, H&P update, NPO status,
allergies, current meds. -/
def preOp : Screen :=
  let s := "w6PreOp"
  { id := s, title := "Pre-op", workflow := "W6"
    components := frame s ++ [
      panel s "consent" "consentDocument" "Consent on file",
      field s "consentVerified" "consentVerified" "Surgical consent verified",
      table s "anticoagulants" "anticoagulantList" "Anticoagulants and antiplatelets",
      field s "medsToHold" "medsToHold" "Medications to hold",
      field s "hpUpdate" "hpUpdate" "H&P update (day of surgery)",
      field s "npoStatus" "npoStatus" "NPO since",
      panel s "allergies" "allergyList" "Allergies",
      table s "meds" "currentMeds" "Current medications",
      goto s "toOrders" "w6Orders" "Pre-op orders"
    ] }

/-- The W6 order composer (prophylaxis, single post-op orders, rounding
changes, discharge prescriptions). Weight, dosing weight, and the
controlled-substance section are on the sign screen. -/
def orders : Screen :=
  let s := "w6Orders"
  { id := s, title := "Orders", workflow := "W6"
    components := frame s ++ orderComposer s {
      prefs := [("prefCefazolin", "w6PrefCefazolin", "Cefazolin 2 g IV (surgical prophylaxis)"),
                ("prefAcetaminophen", "w6PrefAcetaminophen", "Acetaminophen 1 g q6h"),
                ("prefOxycodone", "w6PrefOxycodone", "Oxycodone 10 mg q6h PRN"),
                ("prefEnoxaparin", "w6PrefEnoxaparin", "Enoxaparin 40 mg SC daily"),
                ("prefOndansetron", "w6PrefOndansetron", "Ondansetron 8 mg IV q8h PRN")]
      askDosingWeight := false
      askControlled := false
      signScreen := "w6Sign"
      extraNav := [("w6PostOp", "Post-op order set")] } }

/-- The post-op order set: care orders plus four medication rows (order lines
10–13). -/
def postOp : Screen :=
  let s := "w6PostOp"
  { id := s, title := "Post-op order set", workflow := "W6"
    components := frame s ++ [
      macroBtn s "appendectomySet" "w6AppendectomySet" "Appendectomy post-op order set",
      group s "care" "Post-op care",
      field s "postOpDiet" "postOpDiet" "Diet" (parent := some "care"),
      field s "postOpActivity" "postOpActivity" "Activity" (parent := some "care"),
      field s "vteMechanical" "vteMechanical" "VTE prophylaxis: mechanical" (parent := some "care"),
      field s "postOpLabs" "postOpLabs" "Morning labs" (parent := some "care"),
      field s "postOpVitalsFreq" "postOpVitalsFreq" "Vital signs frequency" (parent := some "care"),
      field s "nursingOrders" "nursingOrders" "Nursing orders" (parent := some "care")] ++
      orderSetRows s [10, 11, 12, 13] ++ [
      table s "pending" "orderSummary" "Pending orders",
      goto s "toSign" "w6Sign" "Review and sign",
      goto s "toOrders" "w6Orders" "Add single orders"
    ] }

/-- Sign orders (surgery): pre-op or post-op. Everything required is shown,
including the anticoagulant list; weight, dosing weight, and the
controlled-substance section are asked here. -/
def sign : Screen :=
  let s := "w6Sign"
  { id := s, title := "Sign orders", workflow := "W6"
    components := frame s ++ [
      table s "orders" "orderSummary" "Orders to sign",
      panel s "allergies" "allergyList" "Allergies",
      table s "meds" "currentMeds" "Current medications",
      table s "anticoagulants" "anticoagulantList" "Anticoagulants and antiplatelets",
      panel s "doseCheck" "doseCheck" "Dose check",
      panel s "cures" "curesReport" "CURES report",
      alertC s "alert.drugAllergy" "drugAllergyOrder" "Drug–allergy match" (popup := false),
      alertC s "alert.interaction" "interactionOrder" "Severe interaction" (popup := false),
      alertC s "alert.doseRange" "doseRangeOrder" "Dose out of range" (popup := false),
      alertC s "alert.weightLb" "weightInLb" "Weight entered in pounds" (popup := false),
      alertC s "alert.drugAllergyPreOp" "drugAllergyPreOp" "Drug–allergy match (pre-op)"
        (popup := false),
      alertC s "alert.interactionPreOp" "interactionPreOp" "Severe interaction (pre-op)"
        (popup := false),
      alertC s "alert.doseRangePreOp" "doseRangePreOp" "Dose out of range (pre-op)"
        (popup := false),
      alertC s "alert.highAlert" "highAlertOrderNotice" "High-alert medication ordered"
        (popup := true),
      group s "weights" "Weights",
      field s "weight" "weight" "Weight today (kg)" (parent := some "weights"),
      field s "dosingWeight" "dosingWeight" "Dosing weight (kg)" (parent := some "weights")] ++
      controlledFields s ++ [
      field s "patientIdReentry" "patientIdReentry" "Re-enter patient ID (initials/sex/age)",
      commitBtn s "signPreOpOrders" "Sign pre-op orders",
      commitBtn s "signOrders" "Sign orders" (hotkey := none),
      goto s "edit" "w6Orders" "Edit orders",
      goto s "toOpNote" "w6OpNote" "Op note"
    ] }

/-- The brief op note: intra-op record on screen; the op-note fields. -/
def opNote : Screen :=
  let s := "w6OpNote"
  { id := s, title := "Brief op note", workflow := "W6"
    components := frame s ++ [
      panel s "intraop" "intraopRecord" "Intra-op record",
      macroBtn s "template" "w6OpNoteTemplate" "Template: laparoscopic appendectomy",
      group s "note" "Brief op note",
      field s "opPreopDiagnosis" "opPreopDiagnosis" "Pre-op diagnosis" (parent := some "note"),
      field s "opPostopDiagnosis" "opPostopDiagnosis" "Post-op diagnosis" (parent := some "note"),
      field s "opProcedure" "opProcedure" "Procedure" (parent := some "note"),
      field s "opSurgeons" "opSurgeons" "Surgeon / assistants" (parent := some "note"),
      field s "opAnesthesia" "opAnesthesia" "Anesthesia" (parent := some "note"),
      field s "opFindings" "opFindings" "Findings" (parent := some "note"),
      field s "opEbl" "opEbl" "Estimated blood loss (mL)" (parent := some "note"),
      field s "opSpecimens" "opSpecimens" "Specimens" (parent := some "note"),
      field s "opDrains" "opDrains" "Drains" (parent := some "note"),
      field s "opImplants" "opImplants" "Implants" (parent := some "note"),
      field s "opComplications" "opComplications" "Complications" (parent := some "note"),
      field s "opCondition" "opCondition" "Condition" (parent := some "note"),
      commitBtn s "signOpNote" "Sign op note",
      goto s "next" "w6PostOp" "Next: post-op orders"
    ] }

/-- Rounding: overnight events, vitals, labs, a progress note; modify orders. -/
def rounding : Screen :=
  let s := "w6Rounding"
  { id := s, title := "Rounding", workflow := "W6"
    components := frame s ++ [
      table s "events" "overnightEvents" "Overnight events",
      panel s "vitals" "vitals" "Vital signs (24 h)",
      table s "labs" "labResults" "Labs",
      field s "progressNote" "progressNote" "Progress note",
      goto s "modify" "w6Orders" "Modify orders",
      goto s "toDischarge" "w6Discharge" "Discharge"
    ] }

/-- Discharge: current meds on screen (reconciliation), allergies; decisions
per medication; diagnosis, follow-up, instructions, condition, destination. -/
def dischargeScreen : Screen :=
  let s := "w6Discharge"
  { id := s, title := "Discharge", workflow := "W6"
    components := frame s ++ [
      table s "meds" "currentMeds" "Current medications",
      panel s "allergies" "allergyList" "Allergies",
      group s "medRec" "Discharge medication reconciliation"] ++
      ((List.range 4).map fun i =>
        field s ("decision" ++ toString i) "dischargeMedRec"
          s!"Medication {i + 1}: continue / stop / change / new" (parent := some "medRec")
          (slot := .fixed i)) ++ [
      field s "dischargeDiagnosis" "dischargeDiagnosis" "Discharge diagnosis (ICD-10)",
      field s "dischargeFollowUp" "dischargeFollowUp" "Follow-up appointment",
      macroBtn s "instructionsTemplate" "w6DischargeTemplate" "Instructions: appendectomy",
      field s "dischargeInstructions" "dischargeInstructions" "Discharge instructions",
      field s "dischargeCondition" "dischargeCondition" "Condition at discharge",
      field s "dischargeDestination" "dischargeDestination" "Discharge to",
      goto s "prescriptions" "w6Orders" "Discharge prescriptions",
      commitBtn s "discharge" "Discharge patient"
    ] }

/-- An inpatient order line (inpatient pharmacy, no refills). -/
def inpatientLine (drug dose route freq quantity indication : String) (prn : Bool := false) :
    OrderLine :=
  { drug, dose, route, freq, duration := "3 days", quantity, indication
    pharmacy := "Inpatient pharmacy", prn, diagnosis := "K35.80" }

/-- The W6 macros: the post-op order set, the preference list, and templates. -/
def macros : List Macro := [
  orderSet "w6AppendectomySet" "Appendectomy post-op order set" "w6PostOp"
    [inpatientLine "acetaminophen" "1000" "PO" "q6h" "12" "post-op pain",
     inpatientLine "oxycodone" "10" "PO" "q6h" "12" "severe post-op pain" (prn := true),
     inpatientLine "enoxaparin" "40" "SC" "daily" "3" "VTE prophylaxis",
     inpatientLine "ondansetron" "8" "IV" "q8h" "9" "nausea" (prn := true)]
    (extra := [.setValue (cid "w6PostOp" "postOpDiet") "clear-liquids",
               .setValue (cid "w6PostOp" "postOpActivity") "ambulate-tid",
               .setValue (cid "w6PostOp" "vteMechanical") "scd",
               .setValue (cid "w6PostOp" "postOpLabs") "cbc-bmp-am",
               .setValue (cid "w6PostOp" "postOpVitalsFreq") "q4h",
               .setValue (cid "w6PostOp" "nursingOrders") "Incentive spirometry q1h while awake; dressing check daily; strict intake and output."]),
  preference "w6PrefCefazolin" "Cefazolin 2 g IV (surgical prophylaxis)" "w6Orders"
    { drug := "cefazolin", dose := "2000", route := "IV", freq := "once", duration := "1 dose"
      quantity := "1", indication := "surgical prophylaxis", pharmacy := "", diagnosis := "K35.80" },
  preference "w6PrefAcetaminophen" "Acetaminophen 1 g q6h" "w6Orders"
    (inpatientLine "acetaminophen" "1000" "PO" "q6h" "12" "pain"),
  preference "w6PrefOxycodone" "Oxycodone 10 mg q6h PRN" "w6Orders"
    (inpatientLine "oxycodone" "10" "PO" "q6h" "12" "severe pain" (prn := true)),
  preference "w6PrefEnoxaparin" "Enoxaparin 40 mg SC daily" "w6Orders"
    (inpatientLine "enoxaparin" "40" "SC" "daily" "3" "VTE prophylaxis"),
  preference "w6PrefOndansetron" "Ondansetron 8 mg IV q8h PRN" "w6Orders"
    (inpatientLine "ondansetron" "8" "IV" "q8h" "9" "nausea" (prn := true)),
  textMacro "w6OpNoteTemplate" "Template: laparoscopic appendectomy"
    [(cid "w6OpNote" "opPreopDiagnosis", "K35.80"),
     (cid "w6OpNote" "opPostopDiagnosis", "K35.80"),
     (cid "w6OpNote" "opProcedure", "44970"),
     (cid "w6OpNote" "opAnesthesia", "general"),
     (cid "w6OpNote" "opFindings", "Inflamed, non-perforated appendix. No abscess."),
     (cid "w6OpNote" "opSpecimens", "Appendix to pathology"),
     (cid "w6OpNote" "opComplications", "none"),
     (cid "w6OpNote" "opCondition", "stable")],
  textMacro "w6DischargeTemplate" "Instructions: appendectomy"
    [(cid "w6Discharge" "dischargeInstructions",
      "No lifting over 10 pounds for 2 weeks. You may shower; keep incisions dry. Call for fever over 38.5 °C, worsening pain, redness, or drainage.")]
]

/-- The W6 screens. -/
def screens : List Screen :=
  [consult, consultClose, preOp, orders, postOp, sign, opNote, rounding, dischargeScreen]

end Ehr.Canonical.W6
