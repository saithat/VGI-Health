import Ehr.Sim.Resumption.Proofs
import Ehr.Sim.Bounded
import Ehr.Sim.FeatureTests

namespace Ehr.Sim.Resumption.Tests
open Ehr Ehr.Sim Ehr.Examples.Tiny
set_option maxRecDepth 100000
set_option maxHeartbeats 2000000

def f : Facts := { facts with now := 0, sourcePatientId? := some "A" }
def actor : User := { user with id := "clinician-A" }
def receipt : Receipt := {
  info := "allergyList", dataVersion := f.allergyVersion,
  time := 0, role := actor.role, user := actor.id }
def draft : State := { (Ehr.init spec program f actor) with
  screen := "sign", receipts := [receipt], currentSlot := 2,
  captured := [{ element := "draftNote", slot := 2, value := .text "patient A", byHuman := true, confirmed := false }],
  tabSel := [("tabs", 1)], history := ["rooming"] }
def frame := suspend actor "A" "task-A" f draft 100
#guard (resume spec f actor "B" "task-A" 0 frame).isNone
#guard (resume spec f actor "A" "task-A" 0 { frame with facts := { f with sourcePatientId? := some "B" } }).isNone
#guard (resume spec f actor "A" "task-A" 0 { frame with state := { draft with
  patientContext? := some { patient? := some "B", bound? := some "B" } } }).isNone
#guard (resume spec f { actor with id := "clinician-B" } "A" "task-A" 0 frame).isNone
#guard (resume spec f actor "A" "task-B" 0 frame).isNone
#guard (resume spec { f with sourcePatientId? := some "B" } actor "A" "task-A" 0 frame).isNone
#guard ((resume spec f actor "A" "task-A" 12 frame).map (·.captured)) == some draft.captured
#guard ((resume spec f actor "A" "task-A" 12 frame).map (·.currentSlot)) == some 2
#guard (revalidate spec { f with allergyVersion := f.allergyVersion + 1 } actor 0 frame).receipts.isEmpty
#guard (revalidate spec { f with allergyVersion := f.allergyVersion + 1 } actor 0
  { frame with state := { draft with captured := draft.captured.map (fun x => { x with confirmed := true }) } }).captured.all (! ·.confirmed)
#guard (discardFrame frame " " 100).isNone
#guard (discardFrame frame "duplicate draft after care-team handover" 100).isSome
#guard (handOver frame "clinician-B" "shift ended; assessment pending" 100).isSome
#guard (handOver frame actor.id "shift ended" 100).isNone
#guard (closeFrame spec f actor "B" "task-A" 0 200 frame).2.disposition == .discarded
#guard (settleFrames spec f actor "A" "task-A" 0 200 [frame, { frame with owner := "other" }]).map (·.disposition) == [.resumed, .discarded]

-- An expired review cannot authorize a resumed sign; current shown content can.
def reviewSpec := { FeatureTests.fixtureSpec with reviews := [{
  commit := "ackResult", info := "allergyList", mode := .shownOrReceipt 1 [.physician] }] }
def reviewProgram := { program with start := "s", macros := [], screens := [{
  id := "s", title := "Sign", workflow := "W1", components := [{ id := "sign", kind := .button (.commit "ackResult") }] }] }
def signFrame := { frame with state := { draft with screen := "s", captured := [], commits := [] } }
#guard (resumeStep reviewSpec reviewProgram f actor 1200 signFrame (.click "sign")).1.commits.isEmpty
#guard (revalidate reviewSpec f actor 1200 signFrame).receipts.isEmpty
#guard (resumeStep reviewSpec reviewProgram f actor 0 signFrame (.click "sign")).1.commits.contains "ackResult"
def shownProgram := { reviewProgram with screens := [{
  id := "s", title := "Sign", workflow := "W1", components := [
    { id := "allergies", kind := .panel "allergyList" }, { id := "sign", kind := .button (.commit "ackResult") }] }] }
#guard (resumeStep reviewSpec shownProgram f actor 1200 signFrame (.click "sign")).1.commits.contains "ackResult"

def work (kind : InterruptKind) : InterruptWork := {
  id := "request", patient := "B", kind, urgency := .urgent, arrivedAtMs := 0, essential := true }
#guard ([InterruptKind.page, .urgentResult, .colleagueQuestion, .familyRequest, .pharmacyClarification]).all fun kind =>
  (executeWork (work kind) 100 false).steps == requiredSteps kind
#guard (perform { work := work .urgentResult } .document).done.isEmpty
#guard !(executeWork { work .page with patient := "" } 0 false).completed
#guard (executeWork { work .page with patient := "" } 0 false).steps.isEmpty
#guard (executeWork (work .urgentResult) 0 false).outcome == "notified responsible clinical team; follow-through remains required"
#guard (executeWork (work .page) 0 false).completedAtMs != (executeWork (work .pharmacyClarification) 0 false).completedAtMs

def task : Task := {
  id := "task-A", day := 1, persona := "P1", workflow := .W1,
  patientId := "A", startMin := 0, choices := {} }
def runtime : InterruptionRuntime := { arrivals := [work .urgentResult,
  { work .familyRequest with id := "family", urgency := .routine, essential := false }] }
#guard handleNow .physician { work .pharmacyClarification with urgency := .timeSensitive } (some .inpatientPharmacy)
#guard !handleNow .physician { work .pharmacyClarification with urgency := .timeSensitive }
def serviced := checkpoint reviewSpec reviewProgram f actor task draft 0 runtime
def shortReview := { reviewSpec with reviews := [{
  commit := "ackResult", info := "allergyList", mode := .shownOrReceipt 0 [.physician] }] }
def expiredByWork := checkpoint shortReview reviewProgram f actor task draft 0 runtime
#guard expiredByWork.1.receipts.isEmpty
#guard expiredByWork.2.2.metrics.revalidationPrevented == 1
#guard serviced.2.2.metrics.handled == 1
#guard serviced.2.2.metrics.deferred == 1
#guard serviced.2.2.queued.length == 1
#guard serviced.1.captured == draft.captured
#guard (serviced.2.2.metrics.frames.filter (·.task == task.id)).map (·.patient) == ["A"]
#guard serviced.2.2.metrics.frames.any (fun r => r.patient == "B" && r.disposition == .handedOver)
#guard serviced.2.2.metrics.work.map (·.work.patient) == ["B"]
def futureFirst : InterruptionRuntime := { arrivals := [
  { work .urgentResult with id := "future-urgent", arrivedAtMs := 120000 },
  { work .familyRequest with id := "available-routine", urgency := .routine }] }
#guard ((checkpoint reviewSpec reviewProgram f actor task draft 0 futureFirst true).2.2.metrics.work.map (·.work.id)) ==
  ["available-routine", "future-urgent"]
def drained := checkpoint reviewSpec reviewProgram f actor task serviced.1 serviced.2.1 serviced.2.2 true
#guard drained.2.2.metrics.handled == 2 && drained.2.2.queued.isEmpty && drained.2.2.arrivals.isEmpty
#guard drained.2.2.metrics.work.all (fun r => r.steps == requiredSteps r.work.kind)
#guard (drained.2.2.metrics.frames.filter (·.task == task.id)).length == 1
#guard (checkpoint spec program f actor task { draft with popup? := some ("alert", "key") } 0 runtime true).2.2.queued.isEmpty
#guard (checkpoint spec program f actor task { draft with popup? := some ("alert", "key") } 0 runtime true).2.2.metrics.frames.all (·.disposition == .handedOver)

def ctx : Context := { sp := spec, prog := program, facts := f, user := actor, goals := default }
def incomplete : EpisodeResult := {
  state := draft, trace := [], complaints := [], rng := 0,
  interruptions := [], actionIndex := 0, elapsedMs := 0, lastDevice := none }
#guard (finishInterruptionTask ctx task incomplete false).state.captured.isEmpty
#guard (finishInterruptionTask ctx task incomplete false).resumption.metrics.abandoned == 1
#guard (finishInterruptionTask ctx task incomplete false).resumption.metrics.frames.all
  (fun r => r.disposition == .discarded && r.reason != "")

-- Current chart changes reach the actual resumed emit, not just the standalone
-- frame helper. A foreign refresh cannot substitute another patient's chart.
def changing : InterruptionRuntime := { arrivals := [work .urgentResult], config := {
  refreshFacts := fun facts _ => { facts with allergyVersion := facts.allergyVersion + 1 } } }
def resumedContext : Context := { sp := reviewSpec, prog := reviewProgram, facts := f, user := actor, goals := default }
def resumedEpisode := interruptionCheckpoint resumedContext task { incomplete with
  state := signFrame.state, resumption := changing }
#guard resumedEpisode.state.receipts.isEmpty
#guard (currentContext resumedContext resumedEpisode).facts.allergyVersion == f.allergyVersion + 1
#guard (emit resumedContext task resumedEpisode (.click "sign") []).state.commits.isEmpty
#guard sourcePatient (refreshAt { refreshFacts := fun facts _ => { facts with sourcePatientId? := some "B" } } f 0) == "A"

-- UI layout/action-count inputs are absent from arrivals, not merely equal in
-- one sampled trace. Both policies serialize the same offered identities/times.
def offered := arrivals 123 task .physician ["A", "B"] { profile? := some .surgicalPhysician }
#guard offered == arrivals 123 task .physician ["A", "B"] { profile? := some .surgicalPhysician }
#guard !offered.isEmpty
#guard offered.all (fun w => w.patient == "B")
def scenarioTask := { FeatureTests.task with patientId := "A" }
def schedule : DaySchedule := { day := 1, persona := "P1", load := "normal", tasks := [scenarioTask] }
def expert := simulate FeatureTests.fixtureSpec (FeatureTests.fixtureProgram []) FeatureTests.params schedule
  (fun _ => f) 123 { profile? := some .surgicalPhysician }
def bounded := Bounded.simulate FeatureTests.fixtureSpec (FeatureTests.fixtureProgram []) FeatureTests.params schedule
  (fun _ => f) 123 {} Bounded.lexicalScent Discovery.helpDesk none { profile? := some .surgicalPhysician }
#guard expert.tasks.all (·.completed)
#guard bounded.tasks.all (·.completed)
#guard (expert.tasks.flatMap (fun t => (t.interruptions?.getD {}).offered)) ==
  (bounded.tasks.flatMap (fun t => (t.interruptions?.getD {}).offered))
#guard expert.tasks.all (fun t => (t.interruptions?.getD {}).handled ==
  (t.interruptions?.getD {}).work.length)
end Ehr.Sim.Resumption.Tests
