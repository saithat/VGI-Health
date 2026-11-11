import Ehr.Sim.Goals
import Ehr.Specs.MarTiming
import Ehr.Sim.Workflow.Protocol
import Ehr.Render.Fhir

namespace Ehr.Sim
open Ehr Lean
open Ehr.Render.Fhir

/-- Resolve only the current task's focused contained prescription. Other
patient medications and earlier refill requests cannot choose the refill drug.
The world attaches this FHIR Task to todayResources even for unchanged renewals. -/
def refillPrescription (task : Task) : Option OrderChoice := do
  let requests := task.todayResources.filter fun r =>
    resourceType r == "Task" && str (field r "for") "reference" == "Patient/" ++ task.patientId
  let request ← match requests with | [r] => some r | _ => none
  let focus := str (field request "focus") "reference"
  if !focus.startsWith "#" then none else do
    let rx ← (arr request "contained").find? fun r =>
      resourceType r == "MedicationRequest" && "#" ++ str r "id" == focus &&
      str (field r "subject") "reference" == "Patient/" ++ task.patientId
    let drug := medDrug rx
    if drug.isEmpty then none else do
      let instruction := first rx "dosageInstruction"
      let quantity := field (first instruction "doseAndRate") "doseQuantity"
      let dose ← qtyScaled quantity 1
      let unit ← (fromJson? (.str (str quantity "unit")) : Except String UnitKind).toOption
      let route := ccText (field instruction "route")
      let freq := ccText (field (field instruction "timing") "code")
      if route.isEmpty || freq.isEmpty then none else
      some { drug := drug
             doseTenths := dose
             unit := unit
             route := route
             freq := freq
             supplyDays? := qtyScaled (field (field rx "dispenseRequest") "expectedSupplyDuration") 0
             prn := (field instruction "asNeededBoolean").getBool?.toOption.getD false }

/-- Bind an unchanged renewal to its actual prescription. Modifications retain
the scenario's replacement dose; denials never become prescription signing.
No administration context or captured drug is fabricated. -/
def taskChoices (task : Task) : TaskChoices :=
  if task.workflow != .W7 || task.choices.refill? != some "approve" ||
      !task.choices.orders.isEmpty then task.choices
  else match refillPrescription task with
    | some order => { task.choices with orders := [order] }
    | none => task.choices

/-- Scenario-declared resolution is retained in the signed assessment/plan,
not used to suppress or acknowledge an alert. -/
def alertResolution (task : Task) : Option String :=
  (task.todayResources.find? fun r => resourceType r == "DetectedIssue" && str r "id" == task.id ++ "-alert-decision" &&
    str (field r "patient") "reference" == "Patient/" ++ task.patientId).map (fun r => str r "detail")

def workflowDecision (task : Task) : String :=
  task.choices.refill?.getD <| ((task.todayResources.find? fun r =>
    resourceType r == "DetectedIssue" && str r "id" == task.id ++ "-alert-decision" &&
      str (field r "patient") "reference" == "Patient/" ++ task.patientId).map (fun r => str (field r "code") "text")).getD "review"

/-- Shared episode input for persona replay and exact minimum search. -/
def taskEpisodes (facts : Facts) (task : Task) : List Episode :=
  let choices := taskChoices task
  let facts := match alertResolution task with
    | none => facts
    | some detail => { facts with record := ("scenarioAlertResolution", detail) :: facts.record }
  if task.workflowPlan?.any (fun p => p.owner != task.persona) then []
  else if task.workflowPlan?.any (fun p => !Workflow.accepted p) then []
  else if choices.administer.any (fun o => o.administration?.any (fun a => !Specs.MarTiming.valid a)) then []
  else if task.workflow == .W7 && choices.refill? == some "approve" && choices.orders.isEmpty then []
  else if task.workflow == .W2 && task.workflowPlan?.isSome && !choices.noteSections.isEmpty then
    let clinical := if choices.ackResult || !choices.orders.isEmpty then
      episodes facts .W2 { choices with noteSections := [] } else []
    clinical ++ [{ facts, choices := { choices with ackResult := false, orders := [] }, orders := [] }]
  else episodes facts task.workflow choices

/-- New inbox note phases use the guarded note workflow. Historical W2 schedules
without a workflow plan retain their original acknowledgment/order episodes. -/
def episodeWorkflow (task : Task) (ep : Episode) : Workflow :=
  if task.workflow == .W2 && task.workflowPlan?.isSome && !ep.choices.ackResult &&
      ep.orders.isEmpty && !ep.choices.noteSections.isEmpty then .W1 else task.workflow

end Ehr.Sim
