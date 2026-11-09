import Lean.Data.Json

namespace Ehr.Sim.Workflow
/-- Workflow structure, never a clinical permission or calibrated rate. -/
inductive WorkflowKind where
  | refill | alert | advice | result | call | consult
  | chart | pharmacy | dispensing | reconciliation | prescription | coordination
  deriving DecidableEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson

structure WorkflowPlan where
  kind : WorkflowKind
  owner : String
  delegateTo? : Option String := none
  delegateAccepted : Bool
  /-- Declared scenario time per non-UI phase. -/
  phaseMs : Nat
  /-- Passive response wait; separate from active phase time. -/
  responseWaitMs : Nat
  deriving DecidableEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson

structure WorkflowReport where
  phases : List String
  owner : String
  clinicalComplete : Bool
  closed : Bool
  activeMs : Nat
  waitingMs : Nat
  deriving DecidableEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson
end Ehr.Sim.Workflow
