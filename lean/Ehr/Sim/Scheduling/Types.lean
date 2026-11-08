import Lean.Data.Json

/-! Workload time is milliseconds from the schedule's origin (the first shift
start). These simulator assumptions do not alter clinical rules. -/
namespace Ehr.Sim.Scheduling

structure Arrival where
  arrivalMs : Nat
  readyMs : Nat
  /-- Smaller values have higher priority; zero is urgent. -/
  priority : Nat := 1
  deadlineMs? : Option Nat := none
  /-- Result availability; response is measured to task completion. -/
  resultAvailableMs? : Option Nat := none
  /-- Age before the nonnegative schedule origin (e.g. inbox backlog). -/
  resultAgeMs : Nat := 0
  /-- Distinct occurrence keys and their MAR window ends. -/
  doseWindows : List (String × Nat) := []
  deriving DecidableEq, BEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson

structure Shift where
  id : String
  startMs : Nat
  endMs : Nat
  deriving DecidableEq, BEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson

/-- A serial work item, released at readyMs and served on the shared clock. -/
structure WorkInterval where
  readyMs : Nat
  startMs : Nat
  finishMs : Nat
  deriving DecidableEq, BEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson

/-- Optional suspend/resume boundary for a cooperating policy. The scheduler
never synthesizes suspended work or grants clinical completion. -/
structure Suspension where
  suspendedMs : Nat
  resumedMs : Nat
  reason : String
  deriving DecidableEq, BEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson

structure Timing where
  task : String
  arrival : Arrival
  startMs? : Option Nat := none
  finishMs? : Option Nat := none
  shift? : Option String := none
  suspensions : List Suspension := []
  queueDelayMs : Nat := 0
  overtimeMs : Nat := 0
  /-- Number of shift ends crossed while waiting, including the final horizon. -/
  handovers : Nat := 0
  overdueDoses : List String := []
  resultResponseMs? : Option Nat := none
  /-- finished | carried | abandoned; abandonment requires a reason. -/
  disposition : String := "carried"
  reason? : Option String := none
  deriving DecidableEq, BEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson

structure WorkloadReport where
  protocol : String := "continuous-workload-v1"
  shifts : List Shift
  timings : List Timing := []
  /-- Full source tasks remain in the input schedule, indexed by these IDs. -/
  pending : List String := []
  queueDelayMs : Nat := 0
  overdueScheduledDoses : Nat := 0
  resultResponseMs : Nat := 0
  resultsResponded : Nat := 0
  overtimeMs : Nat := 0
  tasksCarriedOver : Nat := 0
  deriving DecidableEq, BEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson

end Ehr.Sim.Scheduling
