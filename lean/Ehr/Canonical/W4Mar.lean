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
  [("w4Worklist", "Worklist"), ("w4Mar", "MAR"), ("w4Flowsheet", "Flowsheet"),
   ("w4Handoff", "Handoff")]

/-- The chart-review tabs on W4 screens. -/
def chart : List Block :=
  [(.table, "newOrders", "New orders"), (.table, "labResults", "Results"),
   (.panel, "priorNotes", "Notes"), (.table, "encounterHistory", "Encounters")]

/-- The shell for a W4 screen. -/
def frame (s : ScreenId) : List Component := shell s nav hospitalSidebar chart

/-- The shift worklist: due and overdue meds, tasks, new orders, and the
start-of-shift allergy review. -/
def worklist : Screen :=
  let s := "w4Worklist"
  { id := s, title := "Shift worklist", workflow := "W4"
    components := frame s ++ [
      table s "work" "shiftWorklist" "Due and overdue",
      table s "newOrders" "newOrders" "New orders since last shift",
      panel s "handoff" "handoffSummary" "Last handoff",
      group s "allergyGroup" "Allergies",
      panel s "allergies" "allergyList" "Allergies" (parent := some "allergyGroup"),
      reviewBtn s "allergyList" "Mark allergies reviewed (start of shift)" (parent := some "allergyGroup"),
      goto s "toMar" "w4Mar" "Open MAR"
    ] }

/-- The MAR grid, with PRN history, glucose, and coagulation labs on tabs. -/
def mar : Screen :=
  let s := "w4Mar"
  { id := s, title := "MAR", workflow := "W4"
    components := frame s ++ [
      table s "grid" "marSchedule" "MAR time grid"] ++
      tabStrip s "marTabs" "Details"
        [(.table, "prnHistory", "PRN history"), (.trend, "glucoseTrend", "Glucose"),
         (.table, "coagLabs", "Coagulation labs")] ++ [
      goto s "openDue" "w4Admin" "Open due medication"
    ] }

/-- Administration: dose details, allergies, glucose, coagulation labs, and
PRN history on screen; alerts; scans; the double check; pain score; status. -/
def admin : Screen :=
  let s := "w4Admin"
  { id := s, title := "Administer medication", workflow := "W4"
    components := frame s ++ [
      panel s "dose" "marDoseDetails" "Dose details",
      panel s "allergies" "allergyList" "Allergies",
      trend s "glucose" "glucoseTrend" "Blood glucose",
      table s "coag" "coagLabs" "Coagulation labs",
      table s "prn" "prnHistory" "PRN history",
      alertC s "alert.drugAllergy" "drugAllergyAdmin" "Drug–allergy match" (popup := false),
      alertC s "alert.highAlert" "highAlertAdmin" "High-alert medication: double check" (popup := false),
      alertC s "alert.minorInteraction" "minorInteractionPopup" "Interaction information"
        (popup := true),
      group s "fiveRights" "Five rights",
      field s "wristbandScan" "wristbandScan" "Scan wristband" (parent := some "fiveRights"),
      field s "medScan" "medScan" "Scan medication" (parent := some "fiveRights"),
      field s "highAlertCosign" "highAlertCosign" "Double check: second nurse",
      field s "painScore" "painScore" "Pain score before dose (0–10)",
      group s "documentation" "Documentation",
      field s "adminStatus" "adminStatus" "Given / held / refused" (parent := some "documentation"),
      field s "adminReason" "adminReason" "Reason / comment" (parent := some "documentation"),
      field s "adminSite" "adminSite" "Site" (parent := some "documentation"),
      macroBtn s "heldNpo" "w4HeldNpo" "Document held: NPO",
      commitBtn s "administerMed" "Record administration",
      goto s "toFlowsheet" "w4Flowsheet" "Next: flowsheet",
      goto s "toMar" "w4Mar" "Back to MAR"
    ] }

/-- Flowsheet: vitals, pain reassessment, and the nursing assessment. -/
def flowsheet : Screen :=
  let s := "w4Flowsheet"
  { id := s, title := "Flowsheet", workflow := "W4"
    components := frame s ++ [
      table s "history" "flowsheetHistory" "Prior observations",
      group s "vitalsGroup" "Vital signs",
      field s "bpSystolic" "bpSystolic" "BP systolic" (parent := some "vitalsGroup"),
      field s "bpDiastolic" "bpDiastolic" "BP diastolic" (parent := some "vitalsGroup"),
      field s "heartRate" "heartRate" "Heart rate" (parent := some "vitalsGroup"),
      field s "respRate" "respRate" "Respiratory rate" (parent := some "vitalsGroup"),
      field s "temperature" "temperature" "Temperature" (parent := some "vitalsGroup"),
      field s "spo2" "spo2" "SpO₂" (parent := some "vitalsGroup"),
      table s "prn" "prnHistory" "PRN doses this shift",
      field s "painReassessment" "painReassessment" "Pain reassessment (0–10)",
      macroBtn s "copyAssessment" "w4CopyAssessment" "Copy forward last assessment",
      field s "nursingAssessment" "nursingAssessment" "Nursing assessment",
      commitBtn s "chartAssessment" "File assessment",
      goto s "toHandoff" "w4Handoff" "Next: handoff"
    ] }

/-- Handoff (SBAR). No commit: the summary is saved with the chart. -/
def handoff : Screen :=
  let s := "w4Handoff"
  { id := s, title := "Handoff", workflow := "W4"
    components := frame s ++ [
      panel s "last" "handoffSummary" "Last handoff",
      macroBtn s "template" "w4HandoffTemplate" "SBAR template",
      field s "handoffSituation" "handoffSituation" "Situation",
      field s "handoffBackground" "handoffBackground" "Background",
      field s "handoffAssessment" "handoffAssessment" "Assessment",
      field s "handoffRecommendation" "handoffRecommendation" "Recommendation",
      goto s "toWorklist" "w4Worklist" "Back to worklist"
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
