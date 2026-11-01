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

Deliberate friction: weight and its linked dosing copy are both displayed on the sign
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

/-- Surgical activities open a case; these sections document its phases. -/
def nav : List (ScreenId × String) :=
  [("w6Schedule", "Case list"), ("w6Consults", "Consult list"),
   ("w6Consult", "Consult note"), ("w6ConsultClose", "Sign Consult"),
   ("w6PreOp", "Preprocedure"), ("w6Orders", "Orders"),
   ("w6Sign", "Sign Orders"), ("w6OpNote", "Brief Op Note"),
   ("w6PostOp", "Postprocedure Orders"), ("w6Rounding", "Rounding"),
   ("w6Discharge", "Discharge")]

/-- The chart-review tabs on W6 screens. -/
def chart : List Block :=
  [(.table, "encounterHistory", "Encounters"), (.panel, "priorNotes", "Notes"),
   (.table, "labResults", "Results"), (.table, "currentMeds", "Medications"),
   (.table, "problemList", "Problems"), (.panel, "allergyList", "Allergies"),
   (.table, "imaging", "Imaging"), (.panel, "surgicalHistory", "Surgical history")]

/-- A real navigator group survives blueprint cleanup, so case links are not
repeated as an unlabeled bank of footer buttons. -/
def frame (s : ScreenId) : List Component :=
  shell s [] [] chart ++
    [{ group s "caseSummary" "Surgical case" (collapsible := false) with
        tag := cid s "perioperative.sidebar" },
     panel s "caseSummary.procedure" "scheduleTasks" "Case" (parent := some "caseSummary")] ++
    [{ group s "caseNavigation" "Surgical navigator" (collapsible := false) with
        tag := cid s "navigator" }] ++
    nav.map (fun (target, label) =>
      goto s ("nav." ++ target) target label (parent := some "caseNavigation"))

/-- The OR list is distinct from the selected patient's preprocedure record.
The adjacent action is an ordinary interpreter goto, not a decorative table cell. -/
def schedule : Screen :=
  let s := "w6Schedule"
  { id := s, title := "OR Schedule", workflow := "W6"
    components := frame s ++ [
      presented "orSchedule" (table s "cases" "scheduleTasks" "Scheduled cases"),
      goto s "openCase" "w6PreOp" "Open selected case",
      goto s "consults" "w6Consults" "Consults",
      goto s "clinic" "w1Rooming" "Surgical clinic",
      goto s "results" "w2Inbasket" "In Basket: Results"] }

/-- Surgical consultation requests are a work queue, separate from the note. -/
def consultList : Screen :=
  let s := "w6Consults"
  { id := s, title := "Consults", workflow := "W6"
    components := frame s ++ [
      presented "worklist" (table s "requests" "consultRequest" "Consult requests"),
      goto s "openConsult" "w6Consult" "Open selected consult",
      goto s "clinic" "w1Rooming" "Surgical clinic",
      goto s "cases" "w6Schedule" "OR Schedule"] }

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
      group s "history" "History of present illness" (collapsible := false),
      field s "chiefComplaint" "chiefComplaint" "Reason for consult" (parent := some "history"),
      narrative s "hpi" "hpi" "HPI" (parent := some "history"),
      narrative s "ros" "ros" "Review of systems" (parent := some "history"),
      group s "assessment" "Examination and surgical plan" (collapsible := false),
      narrative s "exam" "exam" "Physical examination" (parent := some "assessment"),
      narrative s "assessmentPlan" "assessmentPlan" "Assessment and plan" (parent := some "assessment"),
      field s "visitDiagnosis" "visitDiagnosis" "Diagnosis (ICD-10-CM)" (parent := some "assessment"),
      field s "surgeryDecision" "surgeryDecision" "Surgical decision" (parent := some "assessment"),
      group s "homeMeds" "Home medications",
      table s "meds" "currentMeds" "Home medications" (parent := some "homeMeds"),
      field s "decision0" "medRecDecision" "Medication 1: continue / stop / modify"
        (parent := some "homeMeds") (slot := .fixed 0),
      field s "decision1" "medRecDecision" "Medication 2: continue / stop / modify"
        (parent := some "homeMeds") (slot := .fixed 1),
      goto s "next" "w6ConsultClose" "Review consult"
    ] }

/-- Consult close: billing diagnosis, level of service, follow-up, instructions;
Sign note. -/
def consultClose : Screen :=
  let s := "w6ConsultClose"
  { id := s, title := "Sign Consult", workflow := "W6"
    components := frame s ++ [
      group s "billing" "Diagnosis and charges" (collapsible := false),
      field s "claimDiagnosis" "claimDiagnosis" "Billing diagnosis (ICD-10-CM)" (parent := some "billing"),
      field s "levelOfService" "levelOfService" "Level of service" (parent := some "billing"),
      group s "plan" "Follow-up and patient instructions" (collapsible := false),
      field s "followUp" "followUp" "Follow-up" (parent := some "plan"),
      narrative s "patientInstructions" "patientInstructions" "Instructions / NPO plan" (parent := some "plan"),
      commitBtn s "signNote" "Sign consult note",
      goto s "next" "w6PreOp" "Preprocedure"
    ] }

/-- Pre-op: consent, anticoagulants and meds to hold, H&P update, NPO status,
allergies, current meds. -/
def preOp : Screen :=
  let s := "w6PreOp"
  { id := s, title := "Preprocedure", workflow := "W6"
    components := frame s ++ [
      table s "phases" "surgicalChecklist" "Before induction",
      group s "interval" "H&P update" (collapsible := false),
      narrative s "hpUpdate" "hpUpdate" "Interval history and physical" (parent := some "interval"),
      panel s "consent" "consentDocument" "Consent on file",
      group s "verification" "Consent verification" (collapsible := false),
      field s "consentVerified" "consentVerified" "Signed consent matches procedure and site" (parent := some "verification"),
      table s "anticoagulants" "anticoagulantList" "Anticoagulants and antiplatelets",
      group s "preparation" "Medication holds and fasting" (collapsible := false),
      narrative s "medsToHold" "medsToHold" "Medication hold / restart plan" (parent := some "preparation"),
      field s "npoStatus" "npoStatus" "Last oral intake / NPO since" (parent := some "preparation"),
      panel s "allergies" "allergyList" "Allergies",
      table s "meds" "currentMeds" "Current medications",
      goto s "toOrders" "w6Orders" "Preprocedure orders"
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
  { id := s, title := "Postprocedure Orders", workflow := "W6"
    components := frame s ++ [
      group s "sets" "Order sets" (collapsible := false),
      macroBtn s "appendectomySet" "w6AppendectomySet" "Laparoscopic appendectomy — postoperative" (parent := some "sets"),
      group s "care" "Diet and activity" (collapsible := false),
      field s "postOpDiet" "postOpDiet" "Diet" (parent := some "care"),
      field s "postOpActivity" "postOpActivity" "Activity" (parent := some "care"),
      group s "prevention" "VTE prevention" (collapsible := false),
      field s "vteMechanical" "vteMechanical" "Mechanical prophylaxis" (parent := some "prevention"),
      group s "monitoring" "Labs and monitoring" (collapsible := false),
      field s "postOpLabs" "postOpLabs" "Morning labs" (parent := some "monitoring"),
      field s "postOpVitalsFreq" "postOpVitalsFreq" "Vital signs" (parent := some "monitoring"),
      group s "nursing" "Nursing care" (collapsible := false),
      narrative s "nursingOrders" "nursingOrders" "Wound care, pulmonary hygiene and I&O" (parent := some "nursing")] ++
      (orderSetRows s [10, 11, 12, 13]).map (fun c =>
        if c.id == cid s "row10" then { c with label := "Pain — scheduled analgesia", kind := .group false false }
        else if c.id == cid s "row11" then { c with label := "Pain — as needed", kind := .group false false }
        else if c.id == cid s "row12" then { c with label := "VTE — pharmacologic prophylaxis", kind := .group false false }
        else if c.id == cid s "row13" then { c with label := "Nausea and vomiting", kind := .group false false }
        else c) ++ [
      table s "pending" "orderSummary" "Pending orders",
      goto s "toSign" "w6Sign" "Review and sign",
      goto s "toOrders" "w6Orders" "Add orders"
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
      alertC s "alert.highAlert" "highAlertOrderNotice" "High-alert medication ordered"
        (popup := true),
      group s "weights" "Dosing weight" (collapsible := false),
      field s "weight" "weight" "Weight today (kg)" (parent := some "weights"),
      field s "dosingWeight" "dosingWeight" "Dosing weight (kg)" (parent := some "weights")] ++
      controlledFields s ++ [
      field s "patientIdReentry" "patientIdReentry" "Re-enter patient ID (initials/sex/age)",
      commitBtn s "signOrders" "Sign orders" (hotkey := none),
      goto s "edit" "w6Orders" "Edit orders",
      goto s "toOpNote" "w6OpNote" "Brief Op Note"
    ] }

/-- The brief op note: intra-op record on screen; the op-note fields. -/
def opNote : Screen :=
  let s := "w6OpNote"
  { id := s, title := "Brief Op Note", workflow := "W6"
    components := frame s ++ [
      table s "phases" "surgicalChecklist" "Before leaving the OR",
      panel s "intraop" "intraopRecord" "Intra-op record",
      macroBtn s "template" "w6OpNoteTemplate" "Template: laparoscopic appendectomy",
      group s "note" "Diagnoses and procedure" (collapsible := false),
      field s "opPreopDiagnosis" "opPreopDiagnosis" "Pre-op diagnosis" (parent := some "note"),
      field s "opPostopDiagnosis" "opPostopDiagnosis" "Post-op diagnosis" (parent := some "note"),
      field s "opProcedure" "opProcedure" "Procedure" (parent := some "note"),
      field s "opSurgeons" "opSurgeons" "Surgeon / assistants" (parent := some "note"),
      group s "anesthesia" "Anesthesia and blood loss" (collapsible := false),
      field s "opAnesthesia" "opAnesthesia" "Anesthesia" (parent := some "anesthesia"),
      field s "opEbl" "opEbl" "Estimated blood loss (mL)" (parent := some "anesthesia"),
      group s "findings" "Operative findings" (collapsible := false),
      narrative s "opFindings" "opFindings" "Findings / operative details" (parent := some "findings"),
      group s "devices" "Specimens, drains and implants" (collapsible := false),
      narrative s "opSpecimens" "opSpecimens" "Specimens to pathology" (parent := some "devices"),
      field s "opDrains" "opDrains" "Drains" (parent := some "devices"),
      field s "opImplants" "opImplants" "Implants" (parent := some "devices"),
      group s "outcome" "Complications and disposition" (collapsible := false),
      field s "opComplications" "opComplications" "Complications" (parent := some "outcome"),
      field s "opCondition" "opCondition" "Condition on transfer" (parent := some "outcome"),
      commitBtn s "signOpNote" "Sign op note",
      goto s "next" "w6PostOp" "Postprocedure orders"
    ] }

/-- Rounding: overnight events, vitals, labs, a progress note; modify orders. -/
def rounding : Screen :=
  let s := "w6Rounding"
  { id := s, title := "Rounding", workflow := "W6"
    components := frame s ++ [
      table s "events" "overnightEvents" "Overnight events",
      panel s "vitals" "vitals" "Vital signs (24 h)",
      table s "labs" "labResults" "Labs",
      table s "activeOrders" "openOrders" "Active orders",
      group s "soap" "Surgery progress note" (collapsible := false),
      narrative s "progressNote" "progressNote" "Subjective, objective, assessment and plan" (parent := some "soap"),
      goto s "modify" "w6Orders" "Modify orders",
      goto s "toDischarge" "w6Discharge" "Discharge"
    ] }

/-- Discharge: current meds on screen (reconciliation), allergies; decisions
per medication; diagnosis, follow-up, instructions, condition, destination. -/
def dischargeScreen : Screen :=
  let s := "w6Discharge"
  { id := s, title := "Discharge", workflow := "W6"
    components := frame s ++ [
      table s "phases" "dischargeChecklist" "Discharge review",
      table s "meds" "currentMeds" "Current medications",
      panel s "allergies" "allergyList" "Allergies",
      group s "medRec" "Discharge medication reconciliation"] ++
      ((List.range 4).map fun i =>
        field s ("decision" ++ toString i) "dischargeMedRec"
          s!"Medication {i + 1}: continue / stop / change / new" (parent := some "medRec")
          (slot := .fixed i)) ++ [
      goto s "prescriptions" "w6Orders" "Discharge prescriptions",
      group s "outcome" "Discharge diagnosis and disposition" (collapsible := false),
      field s "dischargeDiagnosis" "dischargeDiagnosis" "Discharge diagnosis (ICD-10-CM)" (parent := some "outcome"),
      field s "dischargeCondition" "dischargeCondition" "Condition at discharge" (parent := some "outcome"),
      field s "dischargeDestination" "dischargeDestination" "Discharge to" (parent := some "outcome"),
      group s "followup" "Follow-up and after-visit summary" (collapsible := false),
      field s "dischargeFollowUp" "dischargeFollowUp" "Surgery follow-up" (parent := some "followup"),
      macroBtn s "instructionsTemplate" "w6DischargeTemplate" "Appendectomy discharge instructions" (parent := some "followup"),
      narrative s "dischargeInstructions" "dischargeInstructions" "Wound care, activity and return precautions" (parent := some "followup"),
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
  [schedule, consultList, consult, consultClose, preOp, orders, sign, opNote, postOp, rounding, dischargeScreen].map fun sc =>
    { sc with components := sc.components.map fun c => match c.kind with
        | .table "scheduleTasks" | .table "consultRequest" => c
        | .table "labResults" => presented "results" c
        | .panel "priorNotes" => presented "notes" c
        | .table _ => presented "table" c
        | _ => c }

/-- Surgical clinic uses the same ambulatory screens with a surgical-history
tab and note prompts appropriate to consultation and postoperative follow-up. -/
def clinicView (sc : Screen) : Screen :=
  if sc.workflow != "W1" then sc else
  { sc with components :=
      [{ group sc.id "visitNavigation" "Visit navigator" (collapsible := false) with
          tag := cid sc.id "navigator" }] ++
      sc.components.map (fun c =>
      if c.id.startsWith (cid sc.id "nav.") then
        { c with parent? := some (cid sc.id "visitNavigation") }
      else match c.kind with
      | .field e _ _ =>
        let label := if e == "chiefComplaint" then "Reason for visit / postoperative concern"
          else if e == "exam" then "Examination / surgical site"
          else if e == "assessmentPlan" then "Assessment and surgical plan" else c.label
        { c with label, tag := if ["hpi", "ros", "exam", "assessmentPlan", "patientInstructions"].contains e
            then c.tag ++ ".multiline" else c.tag }
      | _ => c) ++
      [goto sc.id ("nav." ++ sc.id) sc.id sc.title (parent := some "visitNavigation"),
       panel sc.id "chart.surgicalHistory" "surgicalHistory" "Surgical history"
        (parent := some "chart") (tab := 9)] }

/-- The surgeon's landing page is an OR list with a real selected-case action.
This is the role's preset view of the shared workspace, not another workflow. -/
def workspaceView (sc : Screen) : Screen :=
  if sc.id != "home" then sc else
  { sc with components := sc.components.flatMap fun c =>
      if c.id == cid sc.id "schedule" then
        [presented "orSchedule" { c with label := "Today's OR cases" },
         goto sc.id "openSelectedCase" "w6PreOp" "Open selected case"]
      else if c.id == cid sc.id "work" then [{ c with tag := cid sc.id "navigator" }]
      else [c] }

end Ehr.Canonical.W6
