import Ehr.Canonical.Builders

/-!
# W3: emergency department encounter (P2)

Track board → triage (weight sometimes typed in lb) → provider evaluation →
order sets or single orders → sign orders → disposition (admit, discharge, …).

Deliberate friction: the dosing weight is displayed again on signing (linked from weight); order
sets fill every value, and each one still needs a confirm; ED orders still ask
for dispense quantity, refills, and pharmacy; triage and evaluation are
separate screens.
Kept: a weight in lb never counts (the guard needs kg, and the weight-in-lb
alert fires); allergy and interaction acknowledgments; patient-ID re-entry;
the dose check, allergies, current meds, and CURES report on the sign screen;
the latest vitals on the disposition screen.
-/

namespace Ehr.Canonical.W3

open Ehr.Canonical

/-- The W3 navigator (the sign screen is reached from the composer or the
order sets). -/
def nav : List (ScreenId × String) :=
  [("w3TrackBoard", "ED Track Board"), ("w3Triage", "Triage summary"), ("w3Provider", "ED Provider Note"),
   ("w3Orders", "Orders"), ("w3OrderSets", "Order sets"), ("w3Disposition", "Disposition")]

/-- The chart-review tabs on W3 screens. -/
def chart : List Block :=
  [(.table, "encounterHistory", "Encounters"), (.panel, "priorNotes", "Notes"),
   (.table, "labResults", "Results"), (.table, "currentMeds", "Meds"),
   (.table, "problemList", "Problems"), (.panel, "allergyList", "Allergies"),
   (.table, "imaging", "Imaging")]

/-- The shell for a W3 screen. -/
def frame (s : ScreenId) : List Component :=
  (shell s nav hospitalSidebar chart).map fun c =>
    if c.id == cid s "nav" then { c with label := "ED Navigator" } else c

/-- The ED track board. -/
def trackBoard : Screen :=
  let s := "w3TrackBoard"
  { id := s, title := "ED Track Board", workflow := "W3"
    components := frame s ++ [
      presentation "trackBoard" (table s "board" "edTrackBoard" "Emergency department patients"),
      primaryNavigation (goto s "open" "w3Triage" "Open selected encounter"),
      panel s "selected" "triageSummary" "Selected encounter — triage summary"
    ] }

/-- Triage: vital signs (weight in kg), acuity, arrival, complaint, isolation
screen, and allergies. -/
def triage : Screen :=
  let s := "w3Triage"
  { id := s, title := "Triage summary", workflow := "W3"
    components := frame s ++ [
      group s "arrival" "Arrival and presenting complaint" (collapsible := false),
      field s "chiefComplaint" "chiefComplaint" "Chief complaint" (parent := some "arrival"),
      field s "triageAcuity" "triageAcuity" "ESI acuity (1–5)" (parent := some "arrival"),
      field s "arrivalMode" "arrivalMode" "Arrival mode" (parent := some "arrival"),
      group s "vitalsGroup" "Triage vital signs" (collapsible := false),
      field s "weight" "weight" "Weight (kg)" (parent := some "vitalsGroup"),
      field s "bpSystolic" "bpSystolic" "BP systolic (mmHg)" (parent := some "vitalsGroup"),
      field s "bpDiastolic" "bpDiastolic" "BP diastolic (mmHg)" (parent := some "vitalsGroup"),
      field s "heartRate" "heartRate" "Heart rate (/min)" (parent := some "vitalsGroup"),
      field s "respRate" "respRate" "Respiratory rate (/min)" (parent := some "vitalsGroup"),
      field s "temperature" "temperature" "Temperature (°C)" (parent := some "vitalsGroup"),
      field s "spo2" "spo2" "SpO₂ (%)" (parent := some "vitalsGroup"),
      field s "painScore" "painScore" "Pain (0–10)" (parent := some "vitalsGroup"),
      group s "screening" "Infection prevention" (collapsible := false),
      field s "isolationScreen" "isolationScreen" "Isolation screening" (parent := some "screening"),
      group s "allergyGroup" "Allergy review" (collapsible := false),
      panel s "allergies" "allergyList" "Allergies" (parent := some "allergyGroup"),
      reviewBtn s "allergyList" "Mark allergies reviewed" (parent := some "allergyGroup"),
      goto s "next" "w3Provider" "ED Provider Note"
    ] }

/-- Provider evaluation: triage summary, history and exam, results, imaging. -/
def provider : Screen :=
  let s := "w3Provider"
  { id := s, title := "ED Provider Note", workflow := "W3"
    components := frame s ++ [
      panel s "triage" "triageSummary" "Triage summary",
      group s "history" "History" (collapsible := false),
      narrative (field s "hpi" "hpi" "History of present illness" (parent := some "history")),
      narrative (field s "ros" "ros" "Review of systems" (parent := some "history")),
      group s "examSection" "Physical examination" (collapsible := false),
      narrative (field s "exam" "exam" "Exam findings" (parent := some "examSection")),
      presentation "results" (table s "labs" "labResults" "Laboratory results"),
      presentation "table" (table s "imagingTable" "imaging" "Imaging reports"),
      group s "mdm" "Medical decision making" (collapsible := false),
      narrative (field s "assessmentPlan" "assessmentPlan" "Differential, ED course and plan" (parent := some "mdm")),
      group s "reconciliation" "Medication reconciliation" (collapsible := false),
      table s "homeMeds" "currentMeds" "Home medications" (parent := some "reconciliation"),
      field s "medRecDecision" "medRecDecision" "Medication reconciliation decision" (parent := some "reconciliation"),
      group s "billing" "Diagnoses and level of service" (collapsible := false),
      field s "claimDiagnosis" "claimDiagnosis" "Encounter diagnosis (linked ICD-10)" (parent := some "billing"),
      field s "levelOfService" "levelOfService" "Level of service" (parent := some "billing"),
      commitBtn s "signNote" "Sign ED note",
      goto s "toSets" "w3OrderSets" "Order sets",
      goto s "toOrders" "w3Orders" "Orders"
    ] }

/-- ED order sets: each set fills two rows (order lines 10 and 11), and every
value waits for a confirm. -/
def orderSets : Screen :=
  let s := "w3OrderSets"
  { id := s, title := "ED order sets", workflow := "W3"
    components := frame s ++ [
      group s "sets" "ED preference order sets" (collapsible := false),
      macroBtn s "sepsis" "w3SepsisSet" "Sepsis (adult)" (parent := some "sets"),
      macroBtn s "abdominal" "w3AbdominalPainSet" "Abdominal pain" (parent := some "sets"),
      macroBtn s "cellulitis" "w3CellulitisSet" "Cellulitis" (parent := some "sets")] ++
      orderSetRows s [10, 11] ++ [
      table s "pending" "orderSummary" "Pending orders",
      goto s "toSign" "w3Sign" "Review and sign",
      goto s "toOrders" "w3Orders" "Add single orders"
    ] }

/-- The W3 order composer (single orders). -/
def orders : Screen :=
  let s := "w3Orders"
  { id := s, title := "Orders", workflow := "W3"
    components := frame s ++ orderComposer s {
      prefs := [("prefAcetaminophen", "w3PrefAcetaminophen", "Acetaminophen 1 g PO"),
                ("prefIbuprofen", "w3PrefIbuprofen", "Ibuprofen 600 mg PO"),
                ("prefOndansetron", "w3PrefOndansetron", "Ondansetron 8 mg IV"),
                ("prefCeftriaxone", "w3PrefCeftriaxone", "Ceftriaxone 2 g IV"),
                ("prefMorphine", "w3PrefMorphine", "Morphine 10 mg IV q4h PRN")]
      askDosingWeight := false
      askControlled := false
      signScreen := "w3Sign"
      extraNav := [("w3OrderSets", "Order sets")] } }

/-- Sign orders (ED). The dosing weight and the controlled-substance section
are asked here, because orders arrive from both the order sets and the
composer. -/
def sign : Screen :=
  let s := "w3Sign"
  { id := s, title := "Sign orders", workflow := "W3"
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
      field s "dosingWeight" "dosingWeight" "Dosing weight (kg)"] ++
      controlledFields s ++ [
      field s "patientIdReentry" "patientIdReentry" "Re-enter patient ID (initials/sex/age)",
      commitBtn s "signOrders" "Sign orders",
      goto s "next" "w3Disposition" "Next: disposition",
      goto s "edit" "w3Orders" "Edit orders"
    ] }

/-- Disposition: latest vitals on screen; choice, diagnosis, condition, and
admission details. -/
def disposition : Screen :=
  let s := "w3Disposition"
  { id := s, title := "Disposition", workflow := "W3"
    components := frame s ++ [
      presentation "table" (table s "vitals" "vitals" "Vital signs — review before disposition"),
      table s "orders" "orderSummary" "Orders this visit",
      group s "decision" "Disposition decision" (collapsible := false),
      field s "dispositionChoice" "dispositionChoice" "Admit / discharge / transfer / observe / consult" (parent := some "decision"),
      field s "visitDiagnosis" "visitDiagnosis" "ED diagnosis (ICD-10)" (parent := some "decision"),
      field s "dispositionCondition" "dispositionCondition" "Condition at disposition" (parent := some "decision"),
      group s "admitGroup" "Admission / bed request" (collapsible := false),
      field s "admitService" "admitService" "Admitting service" (parent := some "admitGroup"),
      field s "admitLevelOfCare" "admitLevelOfCare" "Level of care" (parent := some "admitGroup"),
      group s "dischargeGroup" "Discharge instructions and follow-up" (startCollapsed := true),
      field s "patientInstructions" "patientInstructions" "Discharge instructions"
        (parent := some "dischargeGroup"),
      field s "followUp" "followUp" "Follow-up" (parent := some "dischargeGroup"),
      commitBtn s "disposition" "Set disposition"
    ] }

/-- An ED order line given in the department (no refills; ED pharmacy). -/
def edLine (drug dose route freq indication diagnosis : String) (prn : Bool := false) :
    OrderLine :=
  { drug, dose, route, freq, duration := "1 day", quantity := "1", indication
    pharmacy := "ED pharmacy", prn, diagnosis }

/-- The W3 macros: order sets and the preference list. -/
def macros : List Macro := [
  orderSet "w3SepsisSet" "Sepsis (adult)" "w3OrderSets"
    [edLine "ceftriaxone" "2000" "IV" "daily" "sepsis" "A41.9",
     edLine "vancomycin" "1250" "IV" "q12h" "sepsis" "A41.9"],
  orderSet "w3AbdominalPainSet" "Abdominal pain" "w3OrderSets"
    [edLine "ondansetron" "8" "IV" "q8h" "nausea" "R10.9" (prn := true),
     edLine "hydromorphone" "0.5" "IV" "q4h" "severe pain" "R10.9" (prn := true)],
  orderSet "w3CellulitisSet" "Cellulitis" "w3OrderSets"
    [edLine "cefazolin" "2000" "IV" "q8h" "cellulitis" "L03.90",
     edLine "acetaminophen" "1000" "PO" "q6h" "pain or fever" "L03.90" (prn := true)],
  preference "w3PrefAcetaminophen" "Acetaminophen 1 g PO" "w3Orders"
    (edLine "acetaminophen" "1000" "PO" "q6h" "pain or fever" "R50.9" (prn := true)),
  preference "w3PrefIbuprofen" "Ibuprofen 600 mg PO" "w3Orders"
    (edLine "ibuprofen" "600" "PO" "q6h" "pain" "R52" (prn := true)),
  preference "w3PrefOndansetron" "Ondansetron 8 mg IV" "w3Orders"
    (edLine "ondansetron" "8" "IV" "q8h" "nausea" "R11.0" (prn := true)),
  preference "w3PrefCeftriaxone" "Ceftriaxone 2 g IV" "w3Orders"
    (edLine "ceftriaxone" "2000" "IV" "daily" "infection" "A49.9"),
  preference "w3PrefMorphine" "Morphine 10 mg IV q4h PRN" "w3Orders"
    (edLine "morphine" "10" "IV" "q4h" "severe pain" "R52" (prn := true))
]

/-- The W3 screens. -/
def screens : List Screen :=
  [trackBoard, triage, provider, orders, orderSets, sign, disposition]

end Ehr.Canonical.W3
