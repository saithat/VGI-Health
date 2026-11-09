import Ehr.Sim.Resumption.Arrivals
import Ehr.Sim.Resumption.Workspace
import Ehr.Sim.Scheduling.Clock

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
    work := w, startedAtMs := start, completedAtMs := start + if p.documented then w.serviceMs?.getD p.elapsedMs else p.elapsedMs, deferred,
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
    model := if config.legacyModel then "interrupting-work-v1" else "interrupting-work-v3",
    ratePerHourMilli := if config.legacyModel then ratePerHourMilli setting else activityRate setting task,
    exposureMinutes := exposureMinutes task.workflow, offered,
    handoffs? := if config.legacyModel then none else some [] } }

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

def acceptedCommunication (u : User) (w : InterruptWork) (atMs : Nat) (reason : String) :
    List Scheduling.Handover :=
  let recipient := u.id ++ ":on-call"
  ((offerHandover w.id w.patient u.id recipient reason atMs).bind
    (fun h => acceptHandover h recipient atMs)).toList

/-- Communication and resumption share the clinician's serial clock. Reconsider
arrived work after every atomic communication; only then run queued reorientation.
Routine work queues until close; a clinical popup protects the current task. -/
def serviceCheckpoint (sp : Spec) (prog : Program) (f : Facts) (u : User) (task : Task)
    (s : State) (elapsedMs : Nat) (runtime : InterruptionRuntime) (closing := false) :
    State × Nat × InterruptionRuntime := Id.run do
  if runtime.config.mode == .fixedCost then return (s, elapsedMs, runtime)
  let origin := task.startMin * 60000
  let mut rt := runtime
  let mut state := s
  let mut elapsed := elapsedMs
  let mut ready : List (InterruptWork × Bool) := []
  let mut saved? : Option DraftFrame := none
  -- Every service consumes one offered/queued item. The extra boundary collects
  -- arrivals during the final communication before releasing return work.
  for _ in List.range (runtime.arrivals.length + runtime.queued.length + 1) do
    let now := origin + elapsed
    let due := rt.arrivals.filter fun w => closing || w.arrivedAtMs ≤ now
    rt := { rt with arrivals := rt.arrivals.filter (fun w => !due.contains w) }
    for w in due do
      if !state.popup?.isSome && (closing || handleNow u.role w runtime.config.profile?) then
        ready := ready ++ [(w, false)]
      else
        rt := { rt with queued := rt.queued ++ [w], metrics := { rt.metrics with deferred := rt.metrics.deferred + 1 } }
    if !state.popup?.isSome then
      let pending := rt.queued.filter fun w => closing || handleNow u.role w runtime.config.profile?
      ready := ready ++ pending.map (fun w => (w, true))
      rt := { rt with queued := rt.queued.filter (fun w => !pending.contains w) }
    ready := ready.mergeSort (fun a b =>
      let rank := fun (w : InterruptWork) => match w.urgency with | .urgent => 0 | .timeSensitive => 1 | .routine => 2
      let atA := max now a.1.arrivedAtMs
      let atB := max now b.1.arrivedAtMs
      if atA == atB then rank a.1 ≤ rank b.1 else atA ≤ atB)
    let some (w, deferred) := ready.head? | break
    ready := ready.drop 1
    let start := (Scheduling.queueWork now w.arrivedAtMs 0).startMs
    if now < start then
      rt := { rt with metrics := { rt.metrics with
        closureWaitMs := rt.metrics.closureWaitMs + start - now,
        idle := rt.metrics.idle ++ [{ readyMs := now, startMs := now, finishMs := start }] } }
    if !closing && saved?.isNone then saved? := some (suspend u task.patientId task.id f state start)
    -- The interrupting workspace receives no saved clinical state or receipts.
    let record := executeWork w start deferred
    if record.completed && w.kind == .urgentResult then
      rt := { rt with metrics := { rt.metrics with
        handoffs? := if rt.config.legacyModel then none else some
          ((rt.metrics.handoffs?.getD []) ++ acceptedCommunication u w record.completedAtMs "communication follow-through requires clinical team"),
        frames := rt.metrics.frames ++ [{
        task := w.id ++ ":clinical-follow-through", owner := u.id, patient := w.patient,
        suspendedAtMs := start, closedAtMs := record.completedAtMs, disposition := .handedOver,
        reason := "responsible clinical team: urgent notification communicated; clinical follow-through remains required" }] } }
    if !record.completed then
      rt := { rt with metrics := { rt.metrics with
        handoffs? := if rt.config.legacyModel then none else some
          ((rt.metrics.handoffs?.getD []) ++ acceptedCommunication u w record.completedAtMs "communication follow-through requires clinical team"),
        frames := rt.metrics.frames ++ [{
        task := w.id, owner := u.id, patient := w.patient, suspendedAtMs := start,
        closedAtMs := record.completedAtMs, disposition := .handedOver,
        reason := "on-call service: communication could not verify patient or message" }] } }
    elapsed := record.completedAtMs - origin
    rt := { rt with metrics := { rt.metrics with
      handled := rt.metrics.handled + if record.completed then 1 else 0,
      workMs := rt.metrics.workMs + record.completedAtMs - record.startedAtMs,
      work := rt.metrics.work ++ [record] } }
  if let some frame := saved? then
    let now := origin + elapsed
    let returning := Scheduling.queueWork now now (reorientationCost state)
    elapsed := returning.finishMs - origin
    let currentFacts := refreshAt runtime.config f returning.finishMs
    let (restored, closed) := closeFrame sp currentFacts u task.patientId task.id (elapsed / 100) returning.finishMs frame
    let next := restored.getD (Workspace.init prog)
    let invalidated := (state.receipts.length - next.receipts.length) +
      ((state.captured.filter (·.confirmed)).length - (next.captured.filter (·.confirmed)).length)
    state := next
    rt := { rt with latestFacts? := some currentFacts, metrics := { rt.metrics with
      reorientationMs := rt.metrics.reorientationMs + returning.finishMs - returning.startMs,
      reorientations := rt.metrics.reorientations ++ [returning],
      resumptionDelayMs := rt.metrics.resumptionDelayMs + if restored.isNone then 0 else returning.finishMs - frame.suspendedAtMs,
      revalidationPrevented := rt.metrics.revalidationPrevented + invalidated,
      abandoned := rt.metrics.abandoned + if restored.isNone then 1 else 0,
      frames := rt.metrics.frames ++ [closed] } }
  return (state, elapsed, rt)

/-- Explicit terminal accounting for communication that cannot safely preempt
an unresolved clinical alert. No deferred item disappears at task close. -/
def handOverPending (u : User) (atMs : Nat) (runtime : InterruptionRuntime) : InterruptionRuntime :=
  { runtime with queued := [], metrics := { runtime.metrics with
    handoffs? := if runtime.config.legacyModel then none else some
      ((runtime.metrics.handoffs?.getD []) ++ runtime.queued.flatMap (fun w => acceptedCommunication u w atMs "protected alert; follow-through pending")),
    frames := runtime.metrics.frames ++ runtime.queued.map (fun w => {
      task := w.id, owner := u.id, patient := w.patient, suspendedAtMs := w.arrivedAtMs,
      closedAtMs := atMs, disposition := .handedOver,
      reason := "on-call service: original clinical alert remains unresolved" }) } }

def checkpoint (sp : Spec) (prog : Program) (f : Facts) (u : User) (task : Task)
    (s : State) (elapsedMs : Nat) (runtime : InterruptionRuntime) (closing := false) :
    State × Nat × InterruptionRuntime :=
  let (state, elapsed, rt) := serviceCheckpoint sp prog f u task s elapsedMs runtime closing
  let now := task.startMin * 60000 + elapsed
  -- Protected popups can prevent service, but closure still waits for the
  -- offered arrivals before transferring their responsibility.
  let finish := if closing && runtime.config.mode == .realWork then
    rt.queued.foldl (fun clock w => max clock w.arrivedAtMs) now else now
  let wait := finish - now
  let rt := { rt with metrics := { rt.metrics with
    closureWaitMs := rt.metrics.closureWaitMs + wait,
    idle := rt.metrics.idle ++ if wait == 0 then [] else [{ readyMs := now, startMs := now, finishMs := finish }] } }
  (state, elapsed + wait, if closing then handOverPending u finish rt else rt)
end Ehr.Sim.Resumption
