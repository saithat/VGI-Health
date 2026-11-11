import Ehr.Sim.Workflow.Protocol
import Ehr.Sim.FeatureTests
import Ehr.Check.Workload
import Ehr.Canonical.Personas

namespace Ehr.Sim.Workflow.Tests
open Ehr Ehr.Sim

def plan (kind : WorkflowKind) : WorkflowPlan :=
  { kind, owner := "P1", delegateAccepted := true, phaseMs := 5000, responseWaitMs := 60000 }
#guard [WorkflowKind.refill, .alert, .advice, .result, .call, .consult, .chart, .pharmacy,
  .dispensing, .reconciliation, .prescription, .coordination].all fun kind =>
    let p := plan kind
    (finish p true).closed && !(finish p false).closed &&
    (finish p true).phases.getLast? == some "close" &&
    (finish p false).waitingMs == 0
#guard !(finish { plan .refill with delegateTo? := some "triage", delegateAccepted := false } true).closed
#guard (finish { plan .refill with delegateTo? := some "triage" } true).phases.contains "accept-delegation"
#guard (finish { plan .refill with delegateTo? := some "triage" } true).owner == "P1"
#guard !(finish { plan .advice with owner := "" } true).closed

def task : Task := { FeatureTests.task with workflowPlan? := some (plan .refill) }
#guard taskEpisodes Ehr.Examples.Tiny.facts { task with
  workflowPlan? := some { plan .refill with owner := "another-clinician" } } |>.isEmpty

def day := simulate FeatureTests.fixtureSpec (FeatureTests.fixtureProgram []) FeatureTests.params
  { day := 1, persona := "P1", load := "quiet", tasks := [task] } (fun _ => Ehr.Examples.Tiny.facts) 7
def plain := simulate FeatureTests.fixtureSpec (FeatureTests.fixtureProgram []) FeatureTests.params
  { day := 1, persona := "P1", load := "quiet", tasks := [{ task with workflowPlan? := none }] }
  (fun _ => Ehr.Examples.Tiny.facts) 7 {mode := .fixedCost}
def withPhases := simulate FeatureTests.fixtureSpec (FeatureTests.fixtureProgram []) FeatureTests.params
  { day := 1, persona := "P1", load := "quiet", tasks := [task] }
  (fun _ => Ehr.Examples.Tiny.facts) 7 {mode := .fixedCost}
#guard (plain.tasks.head?.map (·.klmDeciSec)) == (withPhases.tasks.head?.map (·.klmDeciSec))
#guard day.tasks.all fun t => t.workflow?.any (fun w => w.closed == t.completed)
#guard (day.tasks.head?.bind (·.workflow?)).any (fun w => w.activeMs > 0 && w.waitingMs == 60000)

def unrelatedIssue : Lean.Json := Lean.Json.mkObj [
  ("resourceType", .str "DetectedIssue"), ("id", .str "unrelated"),
  ("patient", Lean.Json.mkObj [("reference", .str ("Patient/" ++ task.patientId))]),
  ("detail", .str "Unrelated chart issue")]
#guard alertResolution { task with todayResources := [unrelatedIssue] } == none
#guard workflowDecision { task with todayResources := [unrelatedIssue] } == "review"

def messageTask : Task := { task with choices := { ackResult := true, noteSections := ["hpi"] } }
#guard (taskEpisodes Ehr.Examples.Tiny.facts messageTask).length == 2
#guard (taskEpisodes Ehr.Examples.Tiny.facts { messageTask with workflowPlan? := none }).length == 1
#guard (Check.Workload.fields Specs.V3.specV3 [messageTask]).contains "hpi"

-- Inbox documentation must type the supplied section, including its authoring
-- metadata, rather than charging for it while entering the placeholder.
def hpi : NoteText := {
  id := "hpi", text := String.ofList (List.replicate 2000 'x'),
  authoring? := some { origin := "copied", typedCharacters := 100, selections := 1 } }
def typedMessage : Task := { messageTask with choices := { messageTask.choices with
  noteTexts? := some [hpi] } }
def documentation := (taskEpisodes Ehr.Examples.Tiny.facts typedMessage).getLast?.getD
  { facts := Ehr.Examples.Tiny.facts, choices := {}, orders := [] }
#guard documentation.choices.noteTexts? == some [hpi]
#guard sectionText documentation.choices "hpi" == hpi.text
#guard episodeWorkflow typedMessage documentation == .W1
#guard !documentation.choices.ackResult && documentation.orders.isEmpty

def imaging : OrderChoice :=
  { drug := ""
    kind? := some .imaging
    code? := some "mri-lumbar-spine-without-contrast"
    doseTenths := 0
    unit := .none
    route := ""
    freq := "" }
def procedure : OrderChoice :=
  { imaging with kind? := some .procedure, code? := some "physical-therapy-evaluation" }
def serviceTask (id : String) : Task :=
  { FeatureTests.task with
    id := id
    workflow := .W1
    choices := { orders := [imaging, procedure] } }
def seven := ["d07-P1-W1-002", "d07-P1-W1-004", "d07-P1-W1-012", "d08-P1-W1-008",
  "d08-P1-W1-009", "d09-P1-W1-005", "d10-P1-W1-015"].map serviceTask
def required := Check.Workload.fields Specs.V3.specV3 seven
def canonical : Program := Canonical.forPersona Specs.V3.specV3 Canonical.canonicalV3 "P1" .physician
def declined : Program := { canonical with screens := canonical.screens.map fun s =>
  { s with components := s.components.filter fun c => match c.kind with
    | .field "orderKind" _ _ | .field "orderCode" _ _ => false | _ => true } }
#guard required.contains "orderKind" && required.contains "orderCode"
#guard Check.Workload.check required canonical
#guard !Check.Workload.check required declined
#guard (Check.Workload.missing required declined).contains "orderKind"
#guard (Check.Workload.missing required declined).contains "orderCode"
def dose : AdministrationDecision :=
  { outcome := .given, reason := "scheduled", occurrence := "dose", scheduledMin := 600
    windowStartMin? := some 570, windowEndMin := 630, attemptMin := 590
    administeredMin? := some 590, chartedMin? := some 650, reoffer := false, notifyPrescriber := false }
def doseOrder : OrderChoice :=
  { drug := "atorvastatin", doseTenths := 200, unit := .mg, route := "PO", freq := "daily", administration? := some dose }
def modifiedRefill : Task := { task with workflow := .W7, choices := {
  refill? := some "modify", refillReason? := some "monitoring-adjusted", orders := [doseOrder] } }
#guard (Check.Workload.fields Specs.V3.specV3 [modifiedRefill]).contains "refillNote"
def seriesSpec : Spec := { Specs.V3.specV3 with
  elements := Specs.V3.specV3.elements ++ [Specs.Rules.Federal.earliestFillDate]
  entries := Specs.V3.specV3.entries ++ [Specs.Rules.Federal.entrie123]
  commits := Specs.V3.specV3.commits ++ [Specs.Rules.Federal.signScheduleIISeries] }
def seriesOrder : OrderChoice := { doseOrder with drug := "oxycodone", administration? := none }
def multiOrder : Task := { task with workflow := .W1, choices := { orders := [seriesOrder, doseOrder] } }
#guard (Check.Workload.fields seriesSpec [multiOrder]).contains "earliestFillDate"

def doseTask : Task := { task with choices := { administer := [doseOrder] } }
def lateChart : Scheduling.Timing :=
  { task := "dose", arrival := {arrivalMs := 0, readyMs := 0, doseWindows := [("dose", 630)]}
    overdueDoses := ["dose"], disposition := "finished" }
#guard (withAdministration doseTask lateChart).overdueDoses == []
def missed : AdministrationDecision := { dose with outcome := .notGiven, attemptMin := 631, administeredMin? := none }
def missedTask : Task := { doseTask with choices := { administer := [{ doseOrder with administration? := some missed }] } }
#guard (withAdministration missedTask lateChart).overdueDoses == ["dose"]
#guard (withAdministration { doseTask with choices := {} } lateChart).overdueDoses == ["dose"]
end Ehr.Sim.Workflow.Tests
