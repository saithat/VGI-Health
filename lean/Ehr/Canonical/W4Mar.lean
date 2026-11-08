import Ehr.Canonical.Builders

/-!
W4: nursing worklist, MAR, administration, flowsheet and SBAR report.
Administration retains patient and medication scans, any second-nurse check,
pain assessment, dose and allergy review, and applicable glucose/coagulation review.
The baseline separates the worklist and MAR and keeps optional popup noise.
Report templates supply unconfirmed outlines for the nurse to complete.
-/

namespace Ehr.Canonical.W4

open Ehr.Canonical

/-- The W4 workflow (administration is reached from the MAR). -/
def nav : List (ScreenId × String) :=
  [("w4Worklist", "Unit Census & MAR"), ("w4Mar", "MAR"), ("w4Flowsheet", "Flowsheets"),
   ("w4Handoff", "Handoff / SBAR")]

/-- The chart-history tabs on W4 screens. -/
def chart : List Block :=
  [(.table, "encounterHistory", "Encounters"), (.panel, "priorNotes", "Notes"),
   (.table, "labResults", "Results"), (.table, "currentMeds", "Meds"),
   (.table, "problemList", "Problems"), (.panel, "allergyList", "Allergies"),
   (.table, "imaging", "Imaging")]

/-- The shell for a W4 screen. -/
def frame (s : ScreenId) : List Component :=
  (shell s nav hospitalSidebar chart).map fun c =>
    if c.id == cid s "nav" then activityWorkflow { c with label := "Nursing workflow" }
    else if c.id == cid s "chart.labResults" then
      presentation "results" { c with kind := .table "resultTrend" }
    else if c.id == cid s "chart.imaging" then presentation "notes" c
    else c

/-- The shift worklist: due and overdue meds, tasks, new orders, and the
start-of-shift allergy review. -/
def worklist : Screen :=
  let s := "w4Worklist"
  { id := s, title := "Unit Census & MAR", workflow := "W4"
    components := frame s ++ [
      { group s "census" "My Patients" (collapsible := false) with tag := "layout.overview.present.table" },
      { table s "work" "shiftWorklist" "Assigned patients" (parent := some "census") with tag := "present.table" },
      group s "unitContext" "Unit Census" (startCollapsed := true),
      { table s "unitCensus" "unitCensus" "Unit census — all patients" (parent := some "unitContext") with tag := "present.table" },
      presentation "worklist" (table s "tasks" "shiftTasks" "Selected patient — shift worklist"),
      table s "newOrders" "newOrders" "New orders since last shift",
      panel s "handoff" "handoffSummary" "Last handoff",
      group s "allergyGroup" "Allergies",
      panel s "allergies" "allergyList" "Allergies" (parent := some "allergyGroup"),
      reviewBtn s "allergyList" "Mark allergies reviewed (start of shift)" (parent := some "allergyGroup"),
      { goto s "toMar" "w4Mar" "Open MAR" (parent := some "census") with tag := "present.row|" ++ cid s "work" ++ "|0" }
    ] }

/-- The MAR grid, with PRN history, glucose, and coagulation labs on tabs. -/
def mar : Screen :=
  let s := "w4Mar"
  { id := s, title := "MAR", workflow := "W4"
    components := frame s ++ [
      group s "doseActivity" "Selected medication task" (collapsible := false),
      panel s "selectedDose" "marDoseDetails" "Ordered dose and prior administration"
        (parent := some "doseActivity"),
      primaryNavigation (goto s "openDue" "w4Admin" "Document selected dose"
        (parent := some "doseActivity")),
      presentation "timeGrid" (wideWorkspace (table s "grid" "marSchedule" "Medication administration record"))] ++
      tabStrip s "marTabs" "Details"
        [(.table, "prnHistory", "PRN history"), (.trend, "glucoseTrend", "Glucose"),
         (.table, "coagLabs", "Coagulation labs")] }

/-- Administration: dose details, allergies, glucose, coagulation labs, and
PRN history on screen; alerts; scans; the double check; pain score; status. -/
def admin : Screen :=
  let s := "w4Admin"
  { id := s, title := "Medication administration", workflow := "W4"
    components := frame s ++ [
      panel s "dose" "marDoseDetails" "Ordered dose and prior administration",
      panel s "allergies" "allergyList" "Allergies",
      group s "fiveRights" "Barcode medication verification" (collapsible := false),
      field s "wristbandScan" "wristbandScan" "1. Scan patient wristband" (parent := some "fiveRights"),
      field s "medScan" "medScan" "2. Scan medication barcode" (parent := some "fiveRights"),
      presentation "results" (table s "glucose" "glucoseTrend" "Blood glucose — review before insulin"),
      presentation "results" (table s "coag" "coagLabs" "Coagulation results — review before anticoagulants"),
      presentation "table" (table s "prn" "prnHistory" "PRN administrations and response"),
      alertC s "alert.drugAllergy" "drugAllergyAdmin" "Drug–allergy match" (popup := false),
      alertC s "alert.highAlert" "highAlertAdmin" "High-alert medication: double check" (popup := false),
      alertC s "alert.minorInteraction" "minorInteractionPopup" "Interaction information"
        (popup := true),
      group s "independentCheck" "Independent check and pre-dose assessment" (collapsible := false),
      field s "highAlertCosign" "highAlertCosign" "Second nurse — independent check" (parent := some "independentCheck"),
      field s "painScore" "painScore" "Pain score before dose (0–10)" (parent := some "independentCheck"),
      group s "documentation" "Administration documentation" (collapsible := false),
      field s "adminStatus" "adminStatus" "Action: given / held / refused / delayed / not-given" (parent := some "documentation"),
      field s "adminSite" "adminSite" "Administration site (or not applicable)" (parent := some "documentation"),
      field s "adminReason" "adminReason" "Reason / administration comment" (parent := some "documentation"),
      macroBtn s "heldNpo" "w4HeldNpo" "Document held: NPO",
      commitBtn s "administerMed" "Record administration",
      goto s "toFlowsheet" "w4Flowsheet" "Flowsheets / pain reassessment",
      goto s "toMar" "w4Mar" "Back to MAR"
    ] }

/-- Flowsheet: vitals, pain reassessment, and the nursing assessment. -/
def flowsheet : Screen :=
  let s := "w4Flowsheet"
  { id := s, title := "Flowsheets", workflow := "W4"
    components := frame s ++ [
      presentation "flowsheet" (wideWorkspace (table s "history" "flowsheetHistory" "Recent observations by time")),
      group s "vitalsGroup" "Vital signs — new documentation" (collapsible := false),
      field s "bpSystolic" "bpSystolic" "BP systolic (mmHg)" (parent := some "vitalsGroup"),
      field s "bpDiastolic" "bpDiastolic" "BP diastolic (mmHg)" (parent := some "vitalsGroup"),
      field s "heartRate" "heartRate" "Heart rate (/min)" (parent := some "vitalsGroup"),
      field s "respRate" "respRate" "Respiratory rate (/min)" (parent := some "vitalsGroup"),
      field s "temperature" "temperature" "Temperature (°C)" (parent := some "vitalsGroup"),
      field s "spo2" "spo2" "SpO₂ (%)" (parent := some "vitalsGroup"),
      presentation "table" (table s "prn" "prnHistory" "PRN administrations"),
      group s "pain" "Pain reassessment" (collapsible := false),
      field s "painReassessment" "painReassessment" "Response after intervention (0–10)" (parent := some "pain"),
      group s "assessment" "Shift nursing assessment" (collapsible := false),
      macroBtn s "copyAssessment" "w4CopyAssessment" "Insert assessment outline",
      narrative s "nursingAssessment" "nursingAssessment" "Systems assessment and response to care" (parent := some "assessment"),
      commitBtn s "chartAssessment" "File assessment",
      goto s "toHandoff" "w4Handoff" "Handoff / SBAR"
    ] }

/-- Draft handoff in SBAR order. Navigation does not attest or file the report. -/
def handoff : Screen :=
  let s := "w4Handoff"
  { id := s, title := "Handoff / SBAR", workflow := "W4"
    components := frame s ++ [
      panel s "last" "handoffSummary" "Last handoff",
      macroBtn s "template" "w4HandoffTemplate" "Insert SBAR outline",
      group s "sbar" "Shift report — SBAR" (collapsible := false),
      narrative s "handoffSituation" "handoffSituation" "Situation" (parent := some "sbar"),
      narrative s "handoffBackground" "handoffBackground" "Background" (parent := some "sbar"),
      narrative s "handoffAssessment" "handoffAssessment" "Assessment" (parent := some "sbar"),
      narrative s "handoffRecommendation" "handoffRecommendation" "Recommendation" (parent := some "sbar"),
      presentation "worklist" (table s "remainingTasks" "shiftTasks" "Shift tasks and status"),
      goto s "toWorklist" "w4Worklist" "Unit Census & MAR"
    ] }

/-- Nursing outlines insert pending drafts, without claiming prior findings. -/
def macros : List Macro := [
  textMacro "w4HeldNpo" "Document held: NPO"
    [(cid "w4Admin" "adminStatus", "held"), (cid "w4Admin" "adminReason", "npo")],
  textMacro "w4CopyAssessment" "Insert assessment outline"
    [(cid "w4Flowsheet" "nursingAssessment",
      "Neurologic: [findings]\nCardiovascular: [findings]\nRespiratory: [findings and oxygen support]\nGastrointestinal: [findings and intake]\nGenitourinary: [findings and output]\nSkin: [findings]\nSafety and mobility: [findings and precautions]\nResponse to care: [response]")],
  textMacro "w4HandoffTemplate" "Insert SBAR outline"
    [(cid "w4Handoff" "handoffSituation", "Current concern and reason for handoff: [enter findings]"),
     (cid "w4Handoff" "handoffBackground", "Reason for admission and relevant history: [enter details]"),
     (cid "w4Handoff" "handoffAssessment", "Current assessment, trends and response to care: [enter findings]"),
     (cid "w4Handoff" "handoffRecommendation", "Next actions, pending tasks and contingency plan: [enter plan]")]
]

/-- The W4 screens. -/
def screens : List Screen := [worklist, mar, admin, flowsheet, handoff]

end Ehr.Canonical.W4
