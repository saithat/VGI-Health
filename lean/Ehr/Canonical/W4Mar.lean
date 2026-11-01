import Ehr.Canonical.Builders

/-!
# W4: inpatient medication administration (P3, ward nurse)

Shift worklist (allergy review at the start of the shift) → MAR → open the due
medication → administration (scans, double check, pain score, status) →
flowsheet (vitals, pain reassessment, assessment) → handoff.

Deliberate friction: the MAR is a separate screen from the worklist; glucose,
coagulation labs, and PRN history are also on MAR tabs; a removable
"interaction information" popup at administration; status and reason are
asked even for a routine dose; copy-forward assessment text.
Kept: wristband and medication scans, the second-nurse double check for
high-alert drugs, the pain score before a pain medication, the dose details
and allergies on the administration screen, glucose before insulin, and
coagulation labs before an anticoagulant.
-/

namespace Ehr.Canonical.W4

open Ehr.Canonical

/-- The W4 navigator (administration is reached from the MAR). -/
def nav : List (ScreenId × String) :=
  [("w4Worklist", "Unit Census & MAR"), ("w4Mar", "MAR"), ("w4Flowsheet", "Flowsheets"),
   ("w4Handoff", "Handoff / SBAR")]

/-- The chart-review tabs on W4 screens. -/
def chart : List Block :=
  [(.table, "encounterHistory", "Encounters"), (.panel, "priorNotes", "Notes"),
   (.table, "labResults", "Results"), (.table, "currentMeds", "Meds"),
   (.table, "problemList", "Problems"), (.panel, "allergyList", "Allergies"),
   (.table, "imaging", "Imaging")]

/-- The shell for a W4 screen. -/
def frame (s : ScreenId) : List Component :=
  (shell s nav hospitalSidebar chart).map fun c =>
    if c.id == cid s "nav" then { c with label := "Nursing Navigator" } else c

/-- The shift worklist: due and overdue meds, tasks, new orders, and the
start-of-shift allergy review. -/
def worklist : Screen :=
  let s := "w4Worklist"
  { id := s, title := "Unit Census & MAR", workflow := "W4"
    components := frame s ++ [
      presentation "worklist" (wideWorkspace (table s "work" "shiftWorklist" "My patients — shift tasks")),
      presentation "table" (table s "newOrders" "newOrders" "Orders requiring review"),
      panel s "handoff" "handoffSummary" "Selected patient — handoff report",
      group s "allergyGroup" "Shift allergy review" (collapsible := false),
      panel s "allergies" "allergyList" "Allergies" (parent := some "allergyGroup"),
      reviewBtn s "allergyList" "Mark allergies reviewed — shift start" (parent := some "allergyGroup"),
      primaryNavigation (goto s "toMar" "w4Mar" "Open selected patient's MAR")
    ] }

/-- The MAR grid, with PRN history, glucose, and coagulation labs on tabs. -/
def mar : Screen :=
  let s := "w4Mar"
  { id := s, title := "MAR", workflow := "W4"
    components := frame s ++ [
      panel s "selectedDose" "marDoseDetails" "Selected medication task",
      primaryNavigation (goto s "openDue" "w4Admin" "Document selected dose"),
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
      presentation "trend" (trend s "glucose" "glucoseTrend" "Blood glucose — review before insulin"),
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
      field s "adminStatus" "adminStatus" "Action: given / held / refused" (parent := some "documentation"),
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
      macroBtn s "copyAssessment" "w4CopyAssessment" "Copy forward last assessment",
      narrative (field s "nursingAssessment" "nursingAssessment" "Systems assessment and response to care" (parent := some "assessment")),
      commitBtn s "chartAssessment" "File assessment",
      goto s "toHandoff" "w4Handoff" "Handoff / SBAR"
    ] }

/-- Draft handoff in SBAR order. Navigation does not attest or file the report. -/
def handoff : Screen :=
  let s := "w4Handoff"
  { id := s, title := "Handoff / SBAR", workflow := "W4"
    components := frame s ++ [
      panel s "last" "handoffSummary" "Last handoff",
      macroBtn s "template" "w4HandoffTemplate" "SBAR template",
      group s "sbar" "Shift report — SBAR" (collapsible := false),
      narrative (field s "handoffSituation" "handoffSituation" "Situation" (parent := some "sbar")),
      narrative (field s "handoffBackground" "handoffBackground" "Background" (parent := some "sbar")),
      narrative (field s "handoffAssessment" "handoffAssessment" "Assessment" (parent := some "sbar")),
      narrative (field s "handoffRecommendation" "handoffRecommendation" "Recommendation" (parent := some "sbar")),
      presentation "worklist" (table s "remainingTasks" "shiftWorklist" "Shift tasks and status"),
      goto s "toWorklist" "w4Worklist" "Unit Census & MAR"
    ] }

/-- The W4 macros. -/
def macros : List Macro := [
  textMacro "w4HeldNpo" "Document held: NPO"
    [(cid "w4Admin" "adminStatus", "held"), (cid "w4Admin" "adminReason", "npo")],
  textMacro "w4CopyAssessment" "Copy forward last assessment"
    [(cid "w4Flowsheet" "nursingAssessment",
      "Neuro: alert and oriented x3. Cardiac: regular. Respiratory: clear, room air. GI: soft, tolerating diet. GU: voiding. Skin: intact. Safety: fall precautions in place. (Copied forward.)")],
  textMacro "w4HandoffTemplate" "SBAR template"
    [(cid "w4Handoff" "handoffSituation", "Stable overnight."),
     (cid "w4Handoff" "handoffBackground", "Admitted from the ED; see H&P."),
     (cid "w4Handoff" "handoffAssessment", "Vital signs stable; pain controlled."),
     (cid "w4Handoff" "handoffRecommendation", "Continue current plan; reassess pain after PRN doses.")]
]

/-- The W4 screens. -/
def screens : List Screen := [worklist, mar, admin, flowsheet, handoff]

end Ehr.Canonical.W4
