import Lean.Data.Json
import Ehr.Sim.Scheduling.Types

/-! Simulation-only communication work and measurement vocabulary. No clinical authority. -/
namespace Ehr.Sim.Resumption
inductive ResumptionMode
  | realWork | fixedCost
  deriving DecidableEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson
inductive InterruptKind
  | page | urgentResult | colleagueQuestion | familyRequest | pharmacyClarification
  deriving DecidableEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson
inductive InterruptUrgency
  | urgent | timeSensitive | routine
  deriving DecidableEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson
inductive WorkStep
  | identifyPatient | readMessage | assess | reply | escalate | document
  deriving DecidableEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson
structure InterruptWork where
  id : String
  patient : String
  kind : InterruptKind
  urgency : InterruptUrgency
  /-- Absolute milliseconds on the schedule's minute scale, independent of UI. -/
  arrivedAtMs : Nat
  essential : Bool
  /-- Synthetic communication content, not an imported clinical finding. -/
  message : String := "Care-team request"
  /-- Clock-driven channel service; absent retains the five-step legacy costs. -/
  serviceMs? : Option Nat := none
  deriving DecidableEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson
structure WorkRecord where
  work : InterruptWork
  startedAtMs : Nat
  completedAtMs : Nat
  deferred : Bool
  steps : List WorkStep
  completed : Bool
  /-- Communication completion is never clinical result resolution or prescribing. -/
  outcome : String
  deriving DecidableEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson
inductive FrameDisposition
  | resumed | handedOver | discarded
  deriving DecidableEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson
structure FrameRecord where
  task : String
  owner : String
  patient : String
  suspendedAtMs : Nat
  closedAtMs : Nat
  disposition : FrameDisposition
  reason : String
  deriving DecidableEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson
structure InterruptionMetrics where
  model : String := "interrupting-work-v1"
  profile : String := ""
  ratePerHourMilli : Nat := 0
  exposureMinutes : Nat := 0
  offered : List InterruptWork := []
  closureWaitMs : Nat := 0
  /-- Passive closure waits; excluded from active effort and overtime. -/
  idle : List Scheduling.WorkInterval := []
  /-- Explicit queued return work, after communication and before clinical events. -/
  reorientations : List Scheduling.WorkInterval := []
  handled : Nat := 0
  deferred : Nat := 0
  resumptionDelayMs : Nat := 0
  reorientationMs : Nat := 0
  /-- Invalidated evidence/confirmations, a prevention proxy, not observed clinical errors. -/
  revalidationPrevented : Nat := 0
  abandoned : Nat := 0
  workMs : Nat := 0
  work : List WorkRecord := []
  frames : List FrameRecord := []
  /-- Absent on historical recordings; present for wave-3 responsibility transfers. -/
  handoffs? : Option (List Scheduling.Handover) := none
  deriving DecidableEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson
end Ehr.Sim.Resumption
