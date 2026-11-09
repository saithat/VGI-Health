import Lean.Data.Json

/-! Workload time is milliseconds from the schedule's origin (the first shift
start). These simulator assumptions do not alter clinical rules. -/
namespace Ehr.Sim.Scheduling

/-- Disjoint time on one server. Queue time is an endpoint, not paid service.
Clinical and text coefficients are declared scenarios; N1 (2023) motivates
separating EHR/inbox/clinical time, not adding its totals as extra waits. -/
structure Clocks where
  uiMs : Nat := 0
  readingMs : Nat := 0
  clinicalMs : Nat := 0
  communicationMs : Nat := 0
  passiveWaitMs : Nat := 0
  reorientationMs : Nat := 0
  queueMs : Nat := 0
  deriving DecidableEq, BEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson

/-- Responsibility only: accepting never transfers a draft, receipt or sign authority.
FHIR S8–S10 and SAFER S13 (2025) supply structure, no acceptance rate. -/
structure Handover where
  task : String
  patient : String
  sender : String
  recipient : String
  offeredAtMs : Nat
  acceptedAtMs? : Option Nat := none
  reason : String
  deriving DecidableEq, BEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson

structure EdStages where
  providerQueueMs : Nat
  providerStartMs : Nat
  decisionMs : Nat
  departureMs : Nat
  boardingMs : Nat
  deriving DecidableEq, BEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson

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
  /-- Scenario bedside service, atomic and additional to measured EHR effort. -/
  clinicalServiceMs? : Option Nat := none
  /-- ED admitted cases: passive bed wait after the decision, never clinician service. -/
  boardingMs? : Option Nat := none
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
  clocks? : Option Clocks := none
  actor? : Option String := none
  handover? : Option Handover := none
  ed? : Option EdStages := none
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
