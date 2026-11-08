import Ehr.Sim.Resumption.Tests
import Ehr.Sim.Scheduling.Tests

namespace Ehr.Sim.Scheduling.CombinedTests
open Ehr Ehr.Sim Ehr.Sim.Resumption
open Ehr.Sim.Resumption.Tests (reviewSpec reviewProgram f actor draft work task)

-- An arrival during service joins the same queue before return work. All times
-- remain absolute even when dispatch begins at a fractional-minute offset.
def shiftedTask := { task with startMin := 10 }
def incoming : InterruptionRuntime := { arrivals := [
  { work .urgentResult with id := "first", arrivedAtMs := 600500 },
  { work .page with id := "during-service", arrivedAtMs := 620000 }] }
def served := checkpoint reviewSpec reviewProgram f actor shiftedTask draft 500 incoming
#guard served.2.2.metrics.work.map (·.work.id) == ["first", "during-service"]
#guard served.2.2.metrics.work.map (·.startedAtMs) == [600500, 665500]
#guard served.2.2.metrics.reorientations.length == 1
#guard served.2.2.metrics.reorientations.head!.startMs == served.2.2.metrics.work.getLast!.completedAtMs
#guard ((served.2.2.metrics.frames.filter (·.task == task.id)).map (·.suspendedAtMs)) == [600500]
#guard ((served.2.2.metrics.frames.filter (·.task == task.id)).map (·.closedAtMs)) == [shiftedTask.startMin * 60000 + served.2.1]
#guard served.2.2.metrics.reorientationMs == reorientationCost draft

def row := withInterruptions
  (timing [] shiftedTask {id := "tour", startMs := 0, endMs := 650000} 600500 (served.2.1 - 500) true)
  650000 served.2.2.metrics
#guard row.suspensions.length == 1
#guard row.suspensions.head!.suspendedMs == 600500
#guard row.suspensions.head!.resumedMs == row.finishMs?.get!
-- Passive closure waiting is wall time, never active overtime.
def waiting : InterruptionRuntime := { arrivals := [{ work .page with arrivedAtMs := 800000 }] }
def closed := checkpoint reviewSpec reviewProgram f actor shiftedTask draft 500 waiting true
#guard closed.2.2.metrics.closureWaitMs == 199500
#guard closed.2.2.metrics.reorientations.isEmpty
#guard (withInterruptions (timing [] shiftedTask {id := "tour", startMs := 0, endMs := 650000}
  600500 (closed.2.1 - 500) true) 650000 closed.2.2.metrics).overtimeMs == 38000

-- Clinical documentation ends before the closure queue; its outcome endpoints
-- do not move to the later task-service finish.
def outcomeTask : Task :=
  { shiftedTask with timing? := some {arrivalMs := 600000, readyMs := 600000, resultAvailableMs? := some 600000, doseWindows := [("dose",610000)]} }
def documented := withDocumentation
  (timing [] outcomeTask {id := "tour", startMs := 0, endMs := 650000} 600500 (closed.2.1 - 500) true) 605000
#guard documented.finishMs?.get! > 800000
#guard documented.overdueDoses.isEmpty
#guard documented.resultResponseMs? == some 5000
-- Unserviceable future work cannot be handed over before it has arrived.
def blockedFuture := checkpoint reviewSpec reviewProgram f actor shiftedTask
  {draft with popup? := some ("alert","key")} 500 waiting true
#guard blockedFuture.2.1 == 200000
#guard blockedFuture.2.2.metrics.closureWaitMs == 199500
#guard blockedFuture.2.2.metrics.frames.all (fun frame => frame.suspendedAtMs ≤ frame.closedAtMs)
#guard blockedFuture.2.2.queued.isEmpty

-- Moving dispatch coverage cannot redraw the offered source stream.
def source := Ehr.Sim.Resumption.Tests.scenarioTask
def second : Task := { source with id := "next" }
def schedule : DaySchedule :=
  { day := 1, persona := "P1", load := "normal", tasks := [source, second],
    shifts? := some [{id := "late-tour", startMs := 600123, endMs := 4000000}] }
def expert := simulate Ehr.Sim.FeatureTests.fixtureSpec (Ehr.Sim.FeatureTests.fixtureProgram [])
  Ehr.Sim.FeatureTests.params schedule (fun _ => f) 123 { profile? := some .surgicalPhysician }
def bounded := Bounded.simulate Ehr.Sim.FeatureTests.fixtureSpec (Ehr.Sim.FeatureTests.fixtureProgram [])
  Ehr.Sim.FeatureTests.params schedule (fun _ => f) 123 {} Bounded.lexicalScent Discovery.helpDesk none
  { profile? := some .surgicalPhysician }
#guard expert.tasks.all (·.completed)
#guard bounded.tasks.all (·.completed)
#guard expert.tasks.head!.interruptions?.get!.offered ==
  (initRuntime 123 source .physician [source.patientId, source.patientId] {profile? := some .surgicalPhysician}).metrics.offered
#guard expert.tasks.map (fun t => t.interruptions?.get!.offered) == bounded.tasks.map (fun t => t.interruptions?.get!.offered)
#guard Ehr.Sim.Scheduling.Tests.monotone 0 expert.workload?.get!.timings
#guard Ehr.Sim.Scheduling.Tests.monotone 0 bounded.workload?.get!.timings
#guard expert.workload?.get!.timings.head!.startMs? == some 600123
end Ehr.Sim.Scheduling.CombinedTests
