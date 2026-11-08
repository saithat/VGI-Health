import Ehr.Core.Json
import Std.Tactic

namespace Ehr.Sim.Scheduling
open Ehr

/-- No policy, UI, navigation RNG, or measured cost enters arrival extraction. -/
def arrival (t : Task) : Arrival :=
  t.timing?.getD { arrivalMs := t.startMin * 60000, readyMs := t.startMin * 60000 }

def exogenous (tasks : List Task) : List (String × Arrival) :=
  tasks.map fun t => (t.id, arrival t)

/-- Arm selection is deliberately outside the exogenous interface. -/
def arrivalsForArm (_arm : String) (tasks : List Task) := exogenous tasks

theorem exogenous_arm_independent (a b : String) (tasks : List Task) :
    arrivalsForArm a tasks = arrivalsForArm b tasks := rfl

def eligibleAt (t : Task) : Nat := max (arrival t).arrivalMs (arrival t).readyMs

def startAt (previousFinish : Nat) (t : Task) : Nat := max previousFinish (eligibleAt t)

theorem start_bounds (previousFinish : Nat) (t : Task) :
    previousFinish ≤ startAt previousFinish t ∧
    (arrival t).arrivalMs ≤ startAt previousFinish t ∧
    (arrival t).readyMs ≤ startAt previousFinish t := by
  simp only [startAt, eligibleAt]
  omega

def finishAt (previousFinish : Nat) (t : Task) (duration : Nat) : Nat :=
  startAt previousFinish t + duration

theorem clock_monotone (previousFinish : Nat) (t : Task) (duration : Nat) :
    previousFinish ≤ finishAt previousFinish t duration := by
  have := (start_bounds previousFinish t).1
  simp only [finishAt]
  omega

/-- Stable total ordering: priority, finite deadline before absent, arrival,
then source position (List.mergeSort is stable). -/
def before (a b : Task) : Bool :=
  let x := arrival a
  let y := arrival b
  if x.priority != y.priority then x.priority < y.priority
  else if x.deadlineMs? != y.deadlineMs? then
    match x.deadlineMs?, y.deadlineMs? with
    | some u, some v => u ≤ v
    | some _, none => true
    | _, _ => false
  else x.arrivalMs ≤ y.arrivalMs

/-- Choose among ready work; idle only until the earliest eligibility. The
remaining list removes one source position, so duplicate IDs do not lose work. -/
def dispatch (clock : Nat) (pending : List Task) : Option (Task × List Task) := Id.run do
  if pending.isEmpty then return none
  let next := pending.foldl (fun n t => min n (eligibleAt t)) (eligibleAt (pending.head!))
  let moment := max clock next
  let candidates := pending.zipIdx.filter (fun (t, _) => eligibleAt t ≤ moment)
  match (candidates.mergeSort (fun a b => before a.1 b.1)).head? with
  | none => return none
  | some (t, i) => return some (t, pending.eraseIdx i)

/-- Removing a dispatched source position accounts for exactly one task.
The full executable loop and its output partition are also bounded-checked. -/
theorem erase_conservation (pending : List Task) (i : Nat) (h : i < pending.length) :
    (pending.eraseIdx i).length + 1 = pending.length := by
  simp [List.length_eraseIdx, h]
  omega

def shiftLength (persona : String) : Nat :=
  if persona == "P2" then 600 else if persona == "P3" then 720
  else if persona == "P4" then 570 else 660

/-- Finite successor coverage. ED/ward successors overlap 15 minutes;
clinic successors open next workday (Friday to Monday). No new clinical arrivals
are fabricated outside the source world's coverage. -/
def defaultShifts (schedule : DaySchedule) : List Shift :=
  let length := shiftLength schedule.persona
  if schedule.persona == "P2" || schedule.persona == "P3" then
    (List.range 16).map fun i =>
      { id := s!"coverage-{i}", startMs := i * (length - 15) * 60000,
        endMs := (i * (length - 15) + length) * 60000 }
  else
    (List.range 6).map fun i =>
      let weekday := (schedule.day - 1) % 5
      let days := i + 2 * ((weekday + i) / 5)
      { id := s!"clinic-{i}", startMs := days * 1440 * 60000,
        endMs := (days * 1440 + length) * 60000 }

def shifts (s : DaySchedule) : List Shift :=
  (s.shifts?.getD (defaultShifts s)).filter (fun w => w.startMs < w.endMs)
    |>.mergeSort (fun a b => a.startMs ≤ b.startMs)

/-- The outgoing clinician finishes an active task (overtime). Queued work
moves to the earliest successor whose end has not passed. Overlap never creates
a second server. -/
def slot (windows : List Shift) (clock : Nat) (t : Task) : Option (Shift × Nat) :=
  let moment := startAt clock t
  (windows.find? (fun w => max moment w.startMs < w.endMs)).map fun w => (w, max moment w.startMs)

/-- Re-evaluate the queue when coverage opens, including urgent work that
arrived during the off-duty gap. -/
def dispatchIn (windows : List Shift) (clock : Nat) (pending : List Task) : Option (Task × List Task) :=
  let starts := pending.filterMap (fun t => (slot windows clock t).map (·.2))
  match starts with
  | [] => none
  | x :: xs => dispatch (xs.foldl min x) pending

def handovers (windows : List Shift) (t : Task) (moment : Nat) : Nat :=
  (windows.filter (fun w => (arrival t).arrivalMs < w.endMs && w.endMs ≤ moment)).length

def timing (windows : List Shift) (t : Task) (w : Shift) (start duration : Nat)
    (completed : Bool) : Timing :=
  let finish := start + duration
  let a := arrival t
  { task := t.id, arrival := a, startMs? := some start, finishMs? := some finish,
    shift? := some w.id, queueDelayMs := start - eligibleAt t,
    overtimeMs := finish - max start w.endMs,
    handovers := handovers windows t start,
    overdueDoses := (a.doseWindows.filter (fun (_, deadline) => deadline < finish)).map (·.1),
    resultResponseMs? := if completed then a.resultAvailableMs?.map (fun available => finish + a.resultAgeMs - available) else none,
    disposition := if completed then "finished" else "abandoned",
    reason? := if completed then none else some "clinical goals incomplete after bounded policy fuel" }

def carry (windows : List Shift) (clock : Nat) (t : Task) : Timing :=
  let horizon := windows.foldl (fun moment w => max moment w.endMs) clock
  { task := t.id, arrival := arrival t, handovers := max 1 (handovers windows t horizon),
    overdueDoses := ((arrival t).doseWindows.filter (fun (_, deadline) => deadline < horizon)).map (·.1),
    reason? := some "coverage horizon exhausted; hand over source task unchanged" }

def report (windows : List Shift) (rows : List Timing) : WorkloadReport :=
  { shifts := windows, timings := rows,
    pending := (rows.filter (·.disposition == "carried")).map (·.task),
    queueDelayMs := (rows.map (·.queueDelayMs)).foldl (· + ·) 0,
    overdueScheduledDoses := (rows.flatMap (·.overdueDoses)).eraseDups.length,
    resultResponseMs := (rows.filterMap (·.resultResponseMs?)).foldl (· + ·) 0,
    resultsResponded := (rows.filterMap (·.resultResponseMs?)).length,
    overtimeMs := (rows.map (·.overtimeMs)).foldl (· + ·) 0,
    tasksCarriedOver := (rows.filter (fun r => r.handovers > 0 || r.disposition == "carried")).length }

/-- Every finalized policy attempt has an explicit terminal classification. -/
theorem timing_accounted (ws t w start duration completed) :
    (timing ws t w start duration completed).disposition = "finished" ∨
    ((timing ws t w start duration completed).disposition = "abandoned" ∧
     (timing ws t w start duration completed).reason?.isSome = true) := by
  cases completed <;> simp [timing]

#print axioms exogenous_arm_independent
#print axioms start_bounds
#print axioms clock_monotone
#print axioms erase_conservation
#print axioms timing_accounted
end Ehr.Sim.Scheduling
