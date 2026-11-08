import Ehr.Sim.Scheduling.Clock
import Ehr.Sim.PolicyTests
import Ehr.Sim.Bounded

namespace Ehr.Sim.Scheduling.Tests
open Ehr

def task (id : String) (arrival ready priority : Nat) (deadline : Option Nat := none) : Task :=
  { id, day := 1, persona := "P1", workflow := .W1, patientId := "p", startMin := 0,
    choices := {}, timing? := some { arrivalMs := arrival, readyMs := ready, priority, deadlineMs? := deadline } }
def routine := task "routine" 0 0 2
def urgent := task "urgent" 5 5 0
def soon := task "soon" 0 0 2 (some 20)
def late := task "late" 0 0 2 (some 30)
def windows : List Shift := [{id := "day", startMs := 0, endMs := 10},
  {id := "night", startMs := 8, endMs := 30}]
#guard (dispatch 0 [routine, urgent]).map (·.1.id) == some "routine"
#guard (dispatch 5 [routine, urgent]).map (·.1.id) == some "urgent"
#guard (dispatch 0 [routine, late, soon]).map (·.1.id) == some "soon"
#guard (slot windows 10 routine).map (·.1.id) == some "night"
#guard (timing windows routine windows.head! 0 12 true).overtimeMs == 2
#guard (timing windows routine windows[1]! 12 2 true).handovers == 1
#guard (slot windows 31 routine).isNone
#guard (dispatchIn [{id := "next", startMs := 20, endMs := 30}] 0 [routine, urgent]).map (·.1.id) == some "urgent"

/-- Small executable model uses the same dispatch/slot/timing functions as both
policies; each task costs a fixed arm-specific duration. -/
def run (ws : List Shift) (duration : Task → Nat) (fuel : Nat) (clock : Nat)
    (pending : List Task) : List Timing :=
  match fuel with
  | 0 => pending.map (carry ws clock)
  | n + 1 =>
    match dispatchIn ws clock pending with
    | none => pending.map (carry ws clock)
    | some (t, rest) =>
      match slot ws clock t with
      | none => pending.map (carry ws clock)
      | some (w, moment) => timing ws t w moment (duration t) true ::
        run ws duration n (moment + duration t) rest

def monotone : Nat → List Timing → Bool
  | _, [] => true
  | clock, t :: ts => match t.startMs?, t.finishMs? with
    | some a, some b => clock ≤ a && t.arrival.arrivalMs ≤ a && t.arrival.readyMs ≤ a && a ≤ b && monotone b ts
    | none, none => t.disposition == "carried" && monotone clock ts
    | _, _ => false

def cases : List Task := (List.range 8).map fun n =>
  task s!"t{n}" (n % 2 * 4) (n / 2 % 2 * 6) (n / 4)

def checked : Bool := cases.all fun a => cases.all fun b => cases.all fun c =>
  let ts := [{ a with id := "a" }, { b with id := "b" }, { c with id := "c" }]
  [windows, [{id := "short", startMs := 0, endMs := 3}],
    [{id := "gap", startMs := 10, endMs := 20}], []].all fun ws =>
    [1, 7].all fun cost =>
      let rs := run ws (fun _ => cost) ts.length 0 ts
      rs.length == ts.length && (rs.map (·.task)).mergeSort (· ≤ ·) == ["a", "b", "c"] &&
      monotone 0 rs && rs.all (fun r => r.disposition == "finished" || r.disposition == "carried")
set_option maxRecDepth 10000 in
set_option maxHeartbeats 4000000 in
#guard checked

-- Actual policy integration: fractional-minute starts, urgency, carry horizon,
-- explicit failure reasons, and identical source arrivals across UI policies.
def source : List Task := [
  { PolicyTests.task with id := "a", interruptions := 0, timing? := some {arrivalMs := 0, readyMs := 0, priority := 2} },
  { PolicyTests.task with id := "b", interruptions := 0, timing? := some {arrivalMs := 0, readyMs := 0, priority := 0} }]
def schedule : DaySchedule := { PolicyTests.schedule with tasks := source }
def expert := simulate Ehr.Examples.Tiny.spec Ehr.Examples.Tiny.program PolicyTests.p1 schedule (fun _ => Ehr.Examples.Tiny.facts) 123
def bounded := Bounded.simulate Ehr.Examples.Tiny.spec Ehr.Examples.Tiny.program PolicyTests.p1 schedule (fun _ => Ehr.Examples.Tiny.facts) 123
#guard expert.tasks.map (·.task) == ["b", "a"]
#guard bounded.tasks.map (·.task) == ["b", "a"]
#guard monotone 0 expert.workload?.get!.timings
#guard monotone 0 bounded.workload?.get!.timings
#guard (expert.workload?.get!.timings.map fun t => (t.task, t.arrival)) ==
  (bounded.workload?.get!.timings.map fun t => (t.task, t.arrival))
#guard expert.trace.zip expert.trace.tail |>.all (fun (a,b) => a.t ≤ b.t)
#guard bounded.trace.zip bounded.trace.tail |>.all (fun (a,b) => a.t ≤ b.t)
def finite := simulate Ehr.Examples.Tiny.spec Ehr.Examples.Tiny.program PolicyTests.p1
  { schedule with shifts? := some [{id := "tiny", startMs := 0, endMs := 1}] } (fun _ => Ehr.Examples.Tiny.facts) 123
#guard finite.tasks.length == 2
#guard finite.workload?.get!.pending == ["a"]
#guard finite.workload?.get!.overtimeMs > 0
#guard finite.workload?.get!.tasksCarriedOver == 1
#guard !finite.tasks[1]!.completed
#guard (simulate Ehr.Examples.Tiny.spec Ehr.Examples.Tiny.program PolicyTests.p1
  { schedule with clockMode? := some "legacy" } (fun _ => Ehr.Examples.Tiny.facts) 123).workload?.isNone
end Ehr.Sim.Scheduling.Tests
