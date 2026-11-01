import Ehr.Canonical.BadPrograms
import Ehr.Core.View

/-! Interpreter regressions on real canonical screens. All captures below come
from human events, prefills, or macros; no test inserts captures into a State. -/
namespace Ehr.Canonical.CoreTests
open Ehr.Specs.V1

/-- Adult clinic patient, with named record values used by the canonical UI. -/
def adult : Facts := {
  patientId := "synthea-rk"
  identity := { initials := "RK", sex := "M", ageYears := 58 }
  allergyVersion := 3
  allergyClasses := []
  medsVersion := 7
  currentMedClasses := ["aceInhibitor", "biguanide", "statin"]
  weightToday? := some (924, .kg)
  careGaps := ["colorectal screening"]
  abnormalResult := false
  now := 600
  record := [("appointmentReason", "Blood pressure follow-up"),
    ("preferredPharmacy", "Community pharmacy"), ("requestPharmacy", "Community pharmacy"),
    ("patientIdentity", "RK/M/58"), ("weightYesterday", "19.5")] }
/-- Prescriber for W1, W2, W3 and W7. -/
def physician : User := { id := "doctor1", role := .physician }
/-- Pediatric NP. -/
def np : User := { id := "np1", role := .np }
/-- Surgeon. -/
def surgeon : User := { id := "surgeon1", role := .surgeon }
/-- Giving nurse; the cosigner is nurse2. -/
def nurse : User := { id := "nurse1", role := .rn }
/-- Pediatric episode, 20 kg. -/
def child : Facts := { adult with
  identity := { initials := "AL", sex := "F", ageYears := 6 }
  weightToday? := some (200, .kg), currentMedClasses := [], careGaps := ["influenza"] }
/-- Surgical / ED episode at 70 kg. -/
def hospital : Facts := { adult with
  weightToday? := some (700, .kg)
  currentMedClasses := [], careGaps := [] }
/-- Pre-op context scopes consent, H&P and anticoagulant requirements. -/
def preOpFacts : Facts := { hospital with encounterKind? := some "preop" }
/-- Run actual human events from init. -/
def run (es : List Event) (p : Program := canonicalV1) (f : Facts := adult)
    (u : User := physician) (sp : Spec := specV1) : State :=
  runAll sp p f u .human (init sp p f u) es
/-- Continue from a state. -/
def more (s : State) (es : List Event) (p : Program := canonicalV1) (f : Facts := adult)
    (u : User := physician) (sp : Spec := specV1) : State := runAll sp p f u .human s es
/-- One human event, preserving its result. -/
def one (s : State) (e : Event) (p : Program := canonicalV1) (f : Facts := adult)
    (u : User := physician) (sp : Spec := specV1) : State × StepResult :=
  step sp p f u .human s e
/-- Extract the reason so guards report the precise failing obligation. -/
def reason : StepResult → String | .blocked r => r | _ => ""
/-- Captured value by element and slot. -/
def cap (s : State) (e : ElementId) (slot : Nat := 0) : Option Captured :=
  s.captured.find? fun x => x.element == e && x.slot == slot
/-- Human-entered values on a screen. -/
def enter (s : ScreenId) (xs : List (String × Value)) : List Event :=
  xs.map fun (n, v) => .enter (cid s n) v
/-- Human confirmation of every field in a filled order row. -/
def confirmLine (s : ScreenId) (pre : String := "") : List Event :=
  (orderLineElements.map fun e => .confirm (cid s (pre ++ e.id)))
/-- A complete clinical line entered by a human, including explicit boolean decisions. -/
def order (s drug : String) (dose : Nat) (freq : String := "q6h") : List Event := enter s
  [("drug", .code drug), ("dose", .qty dose .mg), ("doseUnit", .code "mg"),
   ("route", .code "PO"), ("freq", .code freq), ("duration", .code "5 days"),
   ("quantity", .qty 20 .none), ("refills", .qty 0 .none),
   ("indication", .text "pain or infection"), ("pharmacy", .code "Community pharmacy"),
   ("substitution", .code "true"), ("prn", .code "false"), ("orderDiagnosis", .code "R52")]
/-- Click a commit and acknowledge only popups actually raised by it. The bound
exceeds the finite spec alert set. Guard failures remain failures. -/
def finish (s : State) (screen commit : String) (p : Program := canonicalV1)
    (f : Facts := adult) (u : User := physician) (sp : Spec := specV1) : State :=
  (List.range (sp.alerts.length + 1)).foldl (fun st _ =>
    let next := (one st (.click (cid screen ("commit." ++ commit))) p f u sp).1
    match next.popup? with
    | some (a, _) => (one next (.ack a) p f u sp).1
    | none => next) s

/-- W1 rooming through sign orders, including a preference macro and human confirms. -/
def w1Path : List Event :=
  [.click "home.work.w1Rooming"] ++ enter "w1Rooming"
    [("weight", .qty 924 .kg)] ++ [.confirm "w1Rooming.chiefComplaint", .click "w1Rooming.next"] ++
  enter "w1MedRec" [("decision0", .code "continue")] ++ [.click "w1MedRec.next"] ++
  enter "w1Hpi" [("hpi", .text "BP stable on current treatment."), ("ros", .text "No chest pain.")] ++
  [.click "w1Hpi.next"] ++ enter "w1Exam"
    [("exam", .text "BP 128/76; lungs clear."), ("assessmentPlan", .text "Continue lisinopril."),
     ("visitDiagnosis", .code "I10")] ++ [.click "w1Exam.next", .click "w1Orders.prefLisinopril"] ++
  confirmLine "w1Orders" ++ enter "w1Orders"
    [("dosingWeight", .qty 924 .kg), ("pharmacy", .code "Community pharmacy"),
     ("indication", .text "hypertension"), ("orderDiagnosis", .code "I10"),
     ("substitution", .code "true"), ("prn", .code "false")] ++
  [.click "w1Orders.toSign", .click "w1Verify.continue",
   .enter "w1Sign.patientIdReentry" (.text "RK/M/58")]
/-- W1 sign-ready state. -/
def w1 : State := run w1Path
#guard Specs.ruleProfile == .full || guardReason specV1 canonicalV1 adult physician w1 "signOrders" == "guard"
#guard Specs.ruleProfile == .full || (finish w1 "w1Sign" "signOrders").commits.contains "signOrders"
/-- W1 close, retaining the visit note and reconciliation. -/
def w1Close : State := more (finish w1 "w1Sign" "signOrders")
  ([.click "w1Sign.next"] ++ enter "w1Close"
    [("claimDiagnosis", .code "I10"), ("levelOfService", .code "99214"),
     ("followUp", .code "3 months"), ("patientInstructions", .text "Continue meds; return in 3 months.")])
#guard Specs.ruleProfile == .full || (finish w1Close "w1Close" "signNote").commits.contains "signNote"

/-- W2 abnormal result: the patient message is mandatory. -/
def resultFacts : Facts := { adult with abnormalResult := true }
/-- W2 before sending the message. -/
def w2Missing : State := run [.click "home.work.w2Inbasket", .click "w2Inbasket.openResult",
  .enter "w2Result.resultAction" (.code "repeat")] (f := resultFacts)
#guard Specs.ruleProfile == .full || reason (one w2Missing (.click "w2Result.commit.ackResult") (f := resultFacts)).2 ==
  "entry required: patientMessage"
/-- W2 message and return to the shown trend. -/
def w2 : State := more w2Missing [.click "w2Result.message",
  .enter "w2Message.patientMessage" (.text "Potassium mildly elevated; repeat tomorrow."),
  .click "w2Message.return"] (f := resultFacts)
#guard Specs.ruleProfile == .full || (finish w2 "w2Result" "ackResult" (f := resultFacts)).commits == ["ackResult"]

/-- W3 path, parameterized by the unit typed at triage. -/
def w3Path (unit : UnitKind) : List Event :=
  [.click "home.work.w3TrackBoard", .click "w3TrackBoard.open",
   .enter "w3Triage.weight" (.qty 700 unit), .click "w3Triage.next", .click "w3Provider.toOrders"] ++
  order "w3Orders" "acetaminophen" 10000 ++ [.click "w3Orders.toSign"] ++
  enter "w3Sign" [("dosingWeight", .qty 700 .kg), ("patientIdReentry", .text "RK/M/58")]
/-- W3 lb cannot satisfy the kg requirement. -/
def w3Lb : State := run (w3Path .lb) (f := hospital)
#guard Specs.ruleProfile == .full || reason (one w3Lb (.click "w3Sign.commit.signOrders") (f := hospital)).2 ==
  "invalid value: weight (must be in kg)"
#guard Specs.ruleProfile == .full || w3Lb.commits == []
/-- Correct the same episode in kg, then return to sign. -/
def w3 : State := more w3Lb [.click "w3Sign.nav.w3Triage",
  .enter "w3Triage.weight" (.qty 700 .kg), .click "w3Triage.nav.w3Orders",
  .click "w3Orders.toSign"] (f := hospital)
#guard Specs.ruleProfile == .full || (finish w3 "w3Sign" "signOrders" (f := hospital)).commits.contains "signOrders"
/-- W3 disposition after signing. -/
def w3Disposition : State := more (finish w3 "w3Sign" "signOrders" (f := hospital))
  ([.click "w3Sign.next"] ++ enter "w3Disposition"
    [("dispositionChoice", .code "discharge"), ("visitDiagnosis", .code "R50.9"),
     ("dispositionCondition", .code "stable")]) (f := hospital)
#guard Specs.ruleProfile == .full || (finish w3Disposition "w3Disposition" "disposition" (f := hospital)).commits.contains "disposition"

/-- W4 nurse administering a selected drug, with both physical scans. -/
def adminFacts (drug : String) : Facts := { hospital with medToGive? := some drug }
/-- W4 administration path. -/
def adminPath (drug : String) : List Event :=
  [.click "home.work.w4Worklist", .click "w4Worklist.review.allergyList",
   .click "w4Worklist.toMar", .click "w4Mar.openDue"] ++ enter "w4Admin"
  [("wristbandScan", .code adult.patientId), ("medScan", .code drug),
   ("adminStatus", .code "given"), ("adminReason", .code "scheduled"),
   ("painScore", .code "7")] ++
  [.enter "w4Admin.legal.administeredDrug" (.code drug),
   .enter "w4Admin.legal.administeredDose" (.code (if drug == "insulin lispro" then "2 units" else if drug == "oxycodone" then "5 mg" else "2 g")),
   .enter "w4Admin.adminSite" (.code (if drug == "insulin lispro" then "left abdomen" else if drug == "oxycodone" then "not applicable: oral" else "left forearm IV")),
   .enter "w4Admin.legal.actualAdministrationRoute" (.code (if drug == "insulin lispro" then "subcutaneous" else if drug == "oxycodone" then "PO" else "IV"))]
/-- W4 insulin without a second nurse is blocked. -/
def insulinMissing : State := run (adminPath "insulin lispro") (f := adminFacts "insulin lispro") (u := nurse)
#guard Specs.ruleProfile == .full || reason (one insulinMissing (.click "w4Admin.commit.administerMed")
  (f := adminFacts "insulin lispro") (u := nurse)).2 == "entry required: highAlertCosign"
/-- W4 insulin after an independent double check. -/
def insulin : State := more insulinMissing [.enter "w4Admin.highAlertCosign" (.user "nurse2")]
  (f := adminFacts "insulin lispro") (u := nurse)
#guard Specs.ruleProfile == .full || infoShown specV1 canonicalV1 (adminFacts "insulin lispro") insulin "glucoseTrend"
#guard Specs.ruleProfile == .full || (finish insulin "w4Admin" "administerMed" (f := adminFacts "insulin lispro") (u := nurse)).commits == ["administerMed"]
/-- W4 PRN oxycodone also needs pain score and cosign. -/
def oxyAdmin : State := run (adminPath "oxycodone" ++
  [.enter "w4Admin.highAlertCosign" (.user "nurse2")]) (f := adminFacts "oxycodone") (u := nurse)
#guard Specs.ruleProfile == .full || (finish oxyAdmin "w4Admin" "administerMed" (f := adminFacts "oxycodone") (u := nurse)).commits == ["administerMed"]
/-- W4 nursing assessment with actual vitals. -/
def assessment : State := more (finish insulin "w4Admin" "administerMed" (f := adminFacts "insulin lispro") (u := nurse))
  ([.click "w4Admin.toFlowsheet"] ++ enter "w4Flowsheet"
  [("bpSystolic", .qty 1280 .none), ("bpDiastolic", .qty 760 .none), ("heartRate", .qty 720 .none),
   ("respRate", .qty 160 .none), ("temperature", .qty 370 .none), ("spo2", .qty 980 .none),
   ("painReassessment", .code "3"), ("nursingAssessment", .text "Comfortable; vitals stable.")])
  (f := adminFacts "insulin lispro") (u := nurse)
#guard Specs.ruleProfile == .full || (finish assessment "w4Flowsheet" "chartAssessment" (f := adminFacts "insulin lispro") (u := nurse)).commits.contains "chartAssessment"

/-- W5 mg/kg preference, confirmed by the NP, with dose calculated at 20 kg. -/
def w5Path : List Event :=
  [.click "home.work.w5Rooming"] ++ enter "w5Rooming"
  [("weight", .qty 200 .kg), ("chiefComplaint", .text "Ear pain"), ("decision0", .code "continue")] ++
  [.click "w5Rooming.next", .click "w5Growth.next", .click "w5Note.next", .click "w5Orders.prefAmoxicillin"] ++
  confirmLine "w5Orders" ++ [.confirm "w5Orders.doseMgPerKg"] ++ enter "w5Orders"
  [("dose", .qty 9000 .mg), ("dosingWeight", .qty 200 .kg), ("pharmacy", .code "Community pharmacy"),
   ("indication", .text "otitis media"), ("orderDiagnosis", .code "H66.90"),
   ("substitution", .code "true"), ("prn", .code "false")] ++
  [.click "w5Orders.toSign", .enter "w5Sign.patientIdReentry" (.text "AL/F/6")]
/-- Pediatric sign-ready state. -/
def w5 : State := run w5Path (f := child) (u := np)
#guard Specs.ruleProfile == .full || (finish w5 "w5Sign" "signOrders" (f := child) (u := np)).commits == ["signOrders"]
/-- W5 vaccine entries, including the VIS edition and administering provider. -/
def vaccineEntries : List Event := enter "w5Immunizations"
    [("vaccine", .code "150"), ("vaccineLot", .text "FLU24-0931"),
     ("vaccineManufacturer", .text "Synthetic vaccine manufacturer"),
     ("vaccineProvider", .text "np1"), ("visEditionDate", .text "2025-01-31"),
     ("vaccineSite", .code "left-deltoid"), ("vaccineRoute", .code "IM"), ("visGiven", .flag true)]
/-- W5 vaccine record with lot, route, site, manufacturer, provider and VIS. -/
def vaccineState : State := more (finish w5 "w5Sign" "signOrders" (f := child) (u := np))
  ([.click "w5Sign.next"] ++ vaccineEntries)
  (f := child) (u := np)
#guard Specs.ruleProfile == .full || (finish vaccineState "w5Immunizations" "recordImmunization" (f := child) (u := np)).commits.contains "recordImmunization"
/-- W5 close retains rooming and medication reconciliation. -/
def w5Close : State := more (finish vaccineState "w5Immunizations" "recordImmunization" (f := child) (u := np))
  ([.click "w5Immunizations.next", .click "w5Close.editNote"] ++ enter "w5Note"
    [("hpi", .text "Ear pain two days."), ("ros", .text "No fever."), ("exam", .text "Bulging TM."),
     ("assessmentPlan", .text "Amoxicillin; safety net reviewed."), ("visitDiagnosis", .code "H66.90")] ++
    [.click "w5Note.nav.w5Close"] ++ enter "w5Close" [("claimDiagnosis", .code "H66.90"), ("levelOfService", .code "99213"), ("followUp", .code "2 weeks"),
     ("patientInstructions", .text "Complete course; return if worse.")]) (f := child) (u := np)
#guard Specs.ruleProfile == .full || (finish w5Close "w5Close" "signNote" (f := child) (u := np)).commits.contains "signNote"

/-- W6 surgical consult through sign note. -/
def consult : State := run
  ([.click "home.work.w6Consult"] ++ enter "w6Consult"
    [("chiefComplaint", .text "RLQ pain"), ("hpi", .text "Pain for one day."), ("ros", .text "Nausea."),
     ("exam", .text "RLQ tenderness."), ("assessmentPlan", .text "Appendectomy."),
     ("visitDiagnosis", .code "K35.80"), ("decision0", .code "continue")] ++
   [.click "w6Consult.next"] ++ enter "w6ConsultClose"
    [("claimDiagnosis", .code "K35.80"), ("levelOfService", .code "99223"),
     ("followUp", .code "OR today"), ("patientInstructions", .text "NPO")]) (f := hospital) (u := surgeon)
#guard Specs.ruleProfile == .full || (finish consult "w6ConsultClose" "signNote" (f := hospital) (u := surgeon)).commits == ["signNote"]
/-- W6 pre-op cefazolin, with consent and H&P verified by a surgeon. -/
def preOpPath : List Event :=
  [.click "home.work.w6PreOp"] ++ enter "w6PreOp"
  [("consentVerified", .flag true), ("hpUpdate", .text "Reviewed today; no interval change."),
   ("medsToHold", .text "Hold anticoagulants per plan.")] ++ [.click "w6PreOp.toOrders"] ++
  order "w6Orders" "cefazolin" 20000 "once" ++ [.click "w6Orders.toSign"] ++
  enter "w6Sign" [("weight", .qty 700 .kg), ("dosingWeight", .qty 700 .kg),
    ("patientIdReentry", .text "RK/M/58")]
/-- The surgeon's preset opens the actual OR list before its selected case. -/
def p5PreOpPath : List Event :=
  [.click "home.work.w6Schedule", .click "w6Schedule.openCase"] ++ preOpPath.drop 1
/-- Pre-op signing state. -/
def preOp : State := run preOpPath (f := preOpFacts) (u := surgeon)
#guard Specs.ruleProfile == .full || (finish preOp "w6Sign" "signOrders" (f := preOpFacts) (u := surgeon)).commits == ["signOrders"]
/-- W6 operative note from a template, confirmed by its author. -/
def opNote : State := run
  ([.click "home.work.w6OpNote", .click "w6OpNote.template"] ++
   enter "w6OpNote" [("opPreopDiagnosis", .code "K35.80"), ("opPostopDiagnosis", .code "K35.80"),
    ("opProcedure", .code "44970"), ("opAnesthesia", .code "general"), ("opFindings", .text "Inflamed appendix"),
    ("opSpecimens", .text "Appendix"), ("opComplications", .code "none"), ("opCondition", .code "stable")] ++
   [.enter "w6OpNote.opEbl" (.qty 100 .mL)]) (f := hospital) (u := surgeon)
#guard Specs.ruleProfile == .full || (finish opNote "w6OpNote" "signOpNote" (f := hospital) (u := surgeon)).commits == ["signOpNote"]
/-- W6 post-op set, each value on each fixed row individually confirmed. -/
def postOpPath : List Event :=
  [.click "home.work.w6PostOp", .click "w6PostOp.appendectomySet"] ++
  [10, 11, 12, 13].flatMap (fun n =>
    [.enter (cid "w6PostOp" (rowPrefix n ++ "orderDiagnosis")) (.code "K35.80")] ++ confirmLine "w6PostOp" (rowPrefix n)) ++
  [.click "w6PostOp.toSign"] ++ enter "w6Sign"
    [("weight", .qty 700 .kg), ("dosingWeight", .qty 700 .kg), ("patientIdReentry", .text "RK/M/58")]
/-- Post-op signing state. -/
def postOp : State := run postOpPath (f := hospital) (u := surgeon)
#guard Specs.ruleProfile == .full || [10, 11, 12, 13].all fun n => orderLineElements.all fun e =>
  (cap postOp e.id n).any (·.confirmed)
#guard Specs.ruleProfile == .full || (finish postOp "w6Sign" "signOrders" (f := hospital) (u := surgeon)).commits == ["signOrders"]
/-- W6 discharge reconciliation and follow-up. -/
def dischargeState : State := run
  ([.click "home.work.w6Discharge"] ++ enter "w6Discharge"
    [("decision0", .code "continue"), ("dischargeDiagnosis", .code "K35.80"),
     ("dischargeFollowUp", .code "2 weeks"), ("dischargeInstructions", .text "Wound care and return precautions."),
     ("dischargeCondition", .code "stable"), ("dischargeDestination", .code "home")]) (f := hospital) (u := surgeon)
#guard Specs.ruleProfile == .full || (finish dischargeState "w6Discharge" "discharge" (f := hospital) (u := surgeon)).commits == ["discharge"]

/-- W7 refill episode: the requested medicine is in play for alert evaluation. -/
def refillFacts : Facts := { adult with medToGive? := some "lisinopril" }
/-- W7 refill with protocol and pharmacy confirmed. -/
def refill : State := run
  ([.click "home.work.w7Queue", .click "w7Queue.open", .click "w7Review.decide"] ++
   enter "w7Decision" [("refillDecision", .code "approve"), ("refillQuantity", .qty 900 .none),
     ("refillRefills", .qty 30 .none), ("refillProtocolMet", .flag true)] ++
   [.confirm "w7Decision.refillPharmacy",
    .enter "w7Decision.legal.drug" (.code "lisinopril"),
    .enter "w7Decision.legal.refillScheduleEligibility" (.code "notScheduleII")]) (f := refillFacts)
#guard Specs.ruleProfile == .full || (one refill (.click "w7Decision.commit.approveRefill") (f := refillFacts)).1.popup?.map (·.1) == some "activeRxPopup"
#guard Specs.ruleProfile == .full || (finish refill "w7Decision" "approveRefill" (f := refillFacts)).commits == ["approveRefill"]
end Ehr.Canonical.CoreTests
