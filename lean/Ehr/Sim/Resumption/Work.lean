import Ehr.Sim.Resumption.Arrivals
import Ehr.Sim.Resumption.Workspace

namespace Ehr.Sim.Resumption
open Ehr
/-- Work is completed by an ordered semantic protocol, separately from EHR UI
traces. No reply, escalation or documentation creates a clinical receipt. -/
def requiredSteps (kind : InterruptKind) : List WorkStep :=
  [.identifyPatient, .readMessage, .assess] ++
    (if kind == .urgentResult then [.escalate] else [.reply]) ++ [.document]

/-- Per-step milliseconds are uncalibrated scenario assumptions; the kind
changes assessment/communication duration, rather than adding a fixed wait. -/
def workStepMs (kind : InterruptKind) : WorkStep → Nat
  | .identifyPatient => 3000 | .readMessage => 5000
  | .assess => match kind with | .urgentResult => 20000 | .pharmacyClarification => 25000 | _ => 8000
  | .reply => match kind with | .familyRequest => 20000 | .page => 15000 | _ => 10000
  | .escalate => 30000 | .document => 7000

structure WorkProgress where
  work : InterruptWork
  done : List WorkStep := []
  elapsedMs : Nat := 0
  response? : Option String := none
  documented : Bool := false
  deriving Inhabited

/-- Out-of-order steps are refused, including documentation before a response. -/
def perform (p : WorkProgress) (step : WorkStep) : WorkProgress :=
  if p.work.patient.trimAscii.toString != "" && p.work.message.trimAscii.toString != "" &&
      (requiredSteps p.work.kind)[p.done.length]? == some step then
    { p with
      done := p.done ++ [step], elapsedMs := p.elapsedMs + workStepMs p.work.kind step,
      response? := if step == .escalate then some "notified responsible clinical team; follow-through remains required"
        else if step == .reply then some (match p.work.kind with
          | .page => "returned call and communicated plan clarification"
          | .colleagueQuestion => "answered colleague's plan question"
          | .familyRequest => "communicated requested care-team update"
          | .pharmacyClarification => "communicated clarification request to prescribing team"
          | .urgentResult => "clinical escalation required") else p.response?,
      documented := p.documented || step == .document }
  else p

def executeWork (w : InterruptWork) (start : Nat) (deferred : Bool) : WorkRecord :=
  let p := (requiredSteps w.kind).foldl perform { work := w }
  {
    work := w, startedAtMs := start, completedAtMs := start + p.elapsedMs, deferred,
    steps := p.done, completed := p.documented && p.response?.isSome && p.done == requiredSteps w.kind,
    outcome := if p.documented then p.response?.getD "communication incomplete" else "communication incomplete: missing patient or message" }

structure InterruptionRuntime where
  config : InterruptionConfig := {}
  arrivals : List InterruptWork := []
  queued : List InterruptWork := []
  metrics : InterruptionMetrics := {}
  latestFacts? : Option Facts := none
  deriving Inhabited

def initRuntime (seed : Nat) (task : Task) (role : Role) (patients : List String)
    (config : InterruptionConfig) : InterruptionRuntime :=
  let offered := arrivals seed task role patients config
  let setting := config.profile?.getD (profile role task.workflow)
  { config, arrivals := offered, metrics := {
    profile := match setting with
      | .wardNurse => "wardNurse" | .surgicalPhysician => "surgicalPhysician"
      | .clinicPrescriber => "clinicPrescriber" | .emergencyPhysician => "emergencyPhysician"
      | .inpatientPharmacy => "inpatientPharmacy",
    ratePerHourMilli := ratePerHourMilli setting,
    exposureMinutes := exposureMinutes task.workflow, offered } }

/-- A scenario refresh cannot change patient identity or double-advance time. -/
def refreshAt (config : InterruptionConfig) (facts : Facts) (atMs : Nat) : Facts :=
  if config.mode == .fixedCost then facts else
  let supplied := config.refreshFacts facts atMs
  if sourcePatient supplied == sourcePatient facts then { supplied with now := facts.now } else facts

def handleNow (role : Role) (w : InterruptWork) (setting? : Option InterruptionProfile := none) : Bool :=
  w.urgency == .urgent || (w.urgency == .timeSensitive &&
    (role == .rn || setting? == some .inpatientPharmacy))

/-- Reorientation rereads the task position and each pending draft/confirmation.
No claim that these coefficients describe measured clinicians. -/
def reorientationCost (s : State) : Nat := 3000 + 700 * s.captured.length + 1000 * (s.captured.filter (! ·.confirmed)).length

/-- One service checkpoint. Routine work queues until task close; clinical
popups defer all work until acknowledged. Arrivals keep original timestamps.
A close checkpoint waits for remaining offered arrivals rather than dropping
work because one arm completed its clinical UI sooner. -/
def serviceCheckpoint (sp : Spec) (prog : Program) (f : Facts) (u : User) (task : Task)
    (s : State) (elapsedMs : Nat) (runtime : InterruptionRuntime) (closing := false) :
    State × Nat × InterruptionRuntime := Id.run do
  if runtime.config.mode == .fixedCost then return (s, elapsedMs, runtime)
  let now := task.startMin * 60000 + elapsedMs
  let due := runtime.arrivals.filter fun w => closing || w.arrivedAtMs ≤ now
  let mut rt := { runtime with arrivals := runtime.arrivals.filter (fun w => !due.contains w) }
  let mut state := s
  let mut currentFacts := f
  let mut elapsed := elapsedMs
  let mut ready := []
  for w in due do
    if !state.popup?.isSome && (closing || handleNow u.role w runtime.config.profile?) then
      ready := ready ++ [(w, false)]
    else
      rt := { rt with queued := rt.queued ++ [w], metrics := { rt.metrics with deferred := rt.metrics.deferred + 1 } }
  if closing && !state.popup?.isSome then
    ready := ready ++ rt.queued.map (fun w => (w, true))
    rt := { rt with queued := [] }
  -- Reconsider urgency at each service boundary. Future arrivals cannot make
  -- the actor idle while already-arrived routine work is waiting.
  for _ in List.range ready.length do
    let serviceNow := task.startMin * 60000 + elapsed
    ready := ready.mergeSort (fun a b =>
      let rank := fun (w : InterruptWork) => match w.urgency with | .urgent => 0 | .timeSensitive => 1 | .routine => 2
      let atA := max serviceNow a.1.arrivedAtMs
      let atB := max serviceNow b.1.arrivedAtMs
      if atA == atB then rank a.1 ≤ rank b.1 else atA ≤ atB)
    let some (w, deferred) := ready.head? | continue
    ready := ready.drop 1
    let before := task.startMin * 60000 + elapsed
    let start := max before w.arrivedAtMs
    rt := { rt with metrics := { rt.metrics with closureWaitMs := rt.metrics.closureWaitMs + start - before } }
    let frame := suspend u task.patientId task.id currentFacts state start
    -- External communication receives only its own patient/message identity;
    -- it never receives the suspended interpreter state.
    let record := executeWork w start deferred
    if record.completed && w.kind == .urgentResult then
      rt := { rt with metrics := { rt.metrics with frames := rt.metrics.frames ++ [{
        task := w.id ++ ":clinical-follow-through", owner := u.id, patient := w.patient,
        suspendedAtMs := start, closedAtMs := record.completedAtMs, disposition := .handedOver,
        reason := "responsible clinical team: urgent notification communicated; clinical follow-through remains required" }] } }
    if !record.completed then
      rt := { rt with metrics := { rt.metrics with frames := rt.metrics.frames ++ [{
        task := w.id, owner := u.id, patient := w.patient, suspendedAtMs := start,
        closedAtMs := record.completedAtMs, disposition := .handedOver,
        reason := "on-call service: communication could not verify patient or message" }] } }
    let orientation := if closing then 0 else reorientationCost state
    let endMs := record.completedAtMs + orientation
    elapsed := endMs - task.startMin * 60000
    if !closing then
      currentFacts := refreshAt runtime.config currentFacts endMs
      rt := { rt with latestFacts? := some currentFacts }
    let (restored, closed) := if closing then (some state, {
        task := task.id, owner := u.id, patient := task.patientId, suspendedAtMs := start,
        closedAtMs := endMs, disposition := FrameDisposition.resumed, reason := "task already complete" })
      else closeFrame sp currentFacts u task.patientId task.id (elapsed / 100) endMs frame
    let next := restored.getD (Workspace.init prog)
    let invalidated := (state.receipts.length - next.receipts.length) +
      ((state.captured.filter (·.confirmed)).length - (next.captured.filter (·.confirmed)).length)
    state := next
    rt := { rt with metrics := { rt.metrics with
      handled := rt.metrics.handled + if record.completed then 1 else 0,
      workMs := rt.metrics.workMs + record.completedAtMs - record.startedAtMs,
      reorientationMs := rt.metrics.reorientationMs + orientation,
      resumptionDelayMs := rt.metrics.resumptionDelayMs + if closing || restored.isNone then 0 else endMs - start,
      revalidationPrevented := rt.metrics.revalidationPrevented + invalidated,
      abandoned := rt.metrics.abandoned + if restored.isNone then 1 else 0,
      work := rt.metrics.work ++ [record], frames := rt.metrics.frames ++ if closing then [] else [closed] } }
  return (state, elapsed, rt)

/-- Explicit terminal accounting for communication that cannot safely preempt
an unresolved clinical alert. No deferred item disappears at task close. -/
def handOverPending (u : User) (atMs : Nat) (runtime : InterruptionRuntime) : InterruptionRuntime :=
  { runtime with queued := [], metrics := { runtime.metrics with
    frames := runtime.metrics.frames ++ runtime.queued.map (fun w => {
      task := w.id, owner := u.id, patient := w.patient, suspendedAtMs := w.arrivedAtMs,
      closedAtMs := atMs, disposition := .handedOver,
      reason := "on-call service: original clinical alert remains unresolved" }) } }

def checkpoint (sp : Spec) (prog : Program) (f : Facts) (u : User) (task : Task)
    (s : State) (elapsedMs : Nat) (runtime : InterruptionRuntime) (closing := false) :
    State × Nat × InterruptionRuntime :=
  let (state, elapsed, rt) := serviceCheckpoint sp prog f u task s elapsedMs runtime closing
  (state, elapsed, if closing then handOverPending u (task.startMin * 60000 + elapsed) rt else rt)
end Ehr.Sim.Resumption
