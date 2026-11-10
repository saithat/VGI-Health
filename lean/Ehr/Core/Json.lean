import Lean.Data.Json
import Ehr.Core.Types

/-!
JSON readers and writers for core types, plus raw-FHIR task records.
The encoding uses Lean's derived instances: records become objects,
lists become arrays, and optional fields ending in `?` omit absent values.
-/

namespace Ehr

deriving instance Lean.ToJson, Lean.FromJson for
  Role, UnitKind, PrefillPolicy, Friction, ValueKind, Validation, CodeTable, ElementSpec,
  ClinicalField, ClinicalObservation, ClinicalAge, ClinicalFacts, ClinicalPredicate,
  IdentifierCategory, PayloadFieldReq, PayloadContract, PayloadIdentifier, PayloadRow,
  InfoPayload, WorkflowPhase, DisplayScope, DisplayReq, SelectedPayloadRow, PayloadGroup, PayloadView, InfoSpec,
  EventRef, TimeMetric, TemporalDirection, TemporalReq, ArtifactBinding, EventEvidence, BusinessCalendar,
  ObligationStatus, ObligationView, ClockAnchor, ClockStamp, MonthCutoff, ClockRenewal,
  Multi.Critical.Result, Multi.Critical.Resolution, Multi.Critical.Ticket,
  InteractionSeverity, InteractionEvidence,
  OrderClock, ExpiryDuration, RenewalPolicy, ExpiryReq, EncounterRoleRule, CommitSpec, When, EntryReq, ReviewMode, ReviewReq, AlertCond, Tier, AlertSpec,
  DesignRules, Spec

deriving instance Lean.ToJson, Lean.FromJson for
  Slot, Prefill, Action, Visibility, Size, Kind, Component, ComponentDef, Screen, MacroStep,
  Ehr.Macro

/-- Preserve the legacy source JSON/hash when definitions are empty. -/
instance : Lean.ToJson Program where
  toJson p := Lean.Json.mkObj <| [
    ("id", Lean.toJson p.id), ("version", Lean.toJson p.version),
    ("owner", Lean.toJson p.owner), ("role", Lean.toJson p.role),
    ("specVersion", Lean.toJson p.specVersion), ("start", Lean.toJson p.start),
    ("screens", Lean.toJson p.screens), ("macros", Lean.toJson p.macros)] ++
    (if p.componentDefs.isEmpty then [] else [("componentDefs", Lean.toJson p.componentDefs)]) ++
    (match p.patientSelection? with | none => [] | some enabled => [("patientSelection", Lean.toJson enabled)])

/-- The only new optional program field defaults to empty; malformed definitions
remain errors. Parsing never expands or discards the source used in certificates. -/
instance : Lean.FromJson Program where
  fromJson? j := do
    let componentDefs ← match j.getObjVal? "componentDefs" with
      | .error _ => pure []
      | .ok v => Lean.fromJson? v
    let patientSelection ← match j.getObjVal? "patientSelection" with
      | .error _ => pure none
      | .ok v => some <$> Lean.fromJson? v
    return {
      id := ← j.getObjValAs? String "id"
      version := ← j.getObjValAs? Nat "version"
      owner := ← j.getObjValAs? UserId "owner"
      role := ← j.getObjValAs? Role "role"
      specVersion := ← j.getObjValAs? String "specVersion"
      start := ← j.getObjValAs? ScreenId "start"
      screens := ← j.getObjValAs? (List Screen) "screens"
      macros := ← j.getObjValAs? (List Ehr.Macro) "macros"
      componentDefs := componentDefs, patientSelection? := patientSelection }

deriving instance Lean.ToJson, Lean.FromJson for
  PatientChoice, PatientListRow, PatientActivity, PatientDirectory, PatientContext,
  DoseUnitRule, DrugInfo, PatientIdentity, Receipt, Facts

deriving instance Lean.ToJson, Lean.FromJson for
  Value, Actor, Captured, User, State, Event, StepResult, ItemView, ScreenView

deriving instance Lean.ToJson, Lean.FromJson for
  InitInput, StepOutput, StepInput, ViewInput, BatchCase, BatchStep

deriving instance Lean.ToJson, Lean.FromJson for
  Workflow, OrderKind, W6Step, AdministrationOutcome, AdministrationDecision, OrderChoice, NoteAuthoring, NoteText, TaskChoices, PersonaParams, Op, TraceEvent, TaskMetrics,
  DayResult, Verdict, Certificate

/-- One simulated task for a persona on a day. -/
structure Task where
  id : String
  day : Nat
  /-- `"P1"` … `"P5"`. -/
  persona : String
  workflow : Workflow
  /-- Imported FHIR Patient id. -/
  patientId : String
  /-- Minutes since shift start. -/
  startMin : Nat
  choices : TaskChoices
  /-- Synthetic FHIR resources for today (e.g. a triage weight in lb). -/
  todayResources : List Lean.Json := []
  interruptions : Nat := 0
  timing? : Option Sim.Scheduling.Arrival := none
  workflowPlan? : Option Sim.Workflow.WorkflowPlan := none
  deriving BEq, Inhabited, Lean.ToJson, Lean.FromJson

/-- One persona's schedule for one day. -/
structure DaySchedule where
  day : Nat
  persona : String
  /-- `"quiet"` | `"normal"` | `"busy"`. -/
  load : String
  tasks : List Task
  /-- Omitted selects continuous; legacy retains archived task-local clocks. -/
  clockMode? : Option String := none
  shifts? : Option (List Sim.Scheduling.Shift) := none
  /-- Explicit source calendar dates for a merged multi-day queue. -/
  sourceDates? : Option (List (Nat × String)) := none
  deriving BEq, Inhabited, Lean.ToJson, Lean.FromJson

/-- `true` when `x` survives a JSON round trip (to a string and back). -/
def roundTrips {α : Type} [Lean.ToJson α] [Lean.FromJson α] [BEq α] (x : α) : Bool :=
  match Lean.Json.parse (Lean.toJson x).compress with
  | .error _ => false
  | .ok j =>
    match (Lean.fromJson? j : Except String α) with
    | .ok y => y == x
    | .error _ => false

/-- Parse a JSON string into a value of type `α`. -/
def decodeJson (α : Type) [Lean.FromJson α] (s : String) : Except String α := do
  let j ← Lean.Json.parse s
  Lean.fromJson? j

/-- Encode a value as a compact JSON string. -/
def encodeJson {α : Type} [Lean.ToJson α] (x : α) : String :=
  (Lean.toJson x).compress

end Ehr
