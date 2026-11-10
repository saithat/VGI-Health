import Ehr.Core.Workspace
import Ehr.Sim.Interaction
import Ehr.Sim.TaskContext
import Ehr.Sim.Scheduling.Clock
import Ehr.Sim.Workflow.Timing
import Ehr.Sim.Resumption.Work

/-!
Deterministic persona policy. Clinical goals are fixed outside the UI. Each
(task seed, task ID) gets a SplitMix64 stream. Historical interruption positions are drawn
before navigation, hotkey, detour or override draws. Real-work arrivals have a
separate clock-based stream independent of layout and action count. The loop has structural
fuel, records stuck tasks, and never bypasses the interpreter's commit guard.
-/
namespace Ehr.Sim
open Ehr

/-- SplitMix64: one output and the next stream state (wrapping UInt64 math). -/
def random (seed : UInt64) : UInt64 × UInt64 :=
  let next := seed + 0x9e3779b97f4a7c15
  let z := (next ^^^ (next >>> 30)) * 0xbf58476d1ce4e5b9
  let z := (z ^^^ (z >>> 27)) * 0x94d049bb133111eb
  (z ^^^ (z >>> 31), next)

/-- FNV-1a over UTF-8 bytes, used only to derive independent task streams. -/
def taskSeed (seed : Nat) (id : String) : UInt64 :=
  id.toUTF8.foldl (fun h b => (h ^^^ b.toUInt64) * 1099511628211)
    (14695981039346656037 ^^^ UInt64.ofNat seed)

def draw (seed : UInt64) (bound : Nat) : Nat × UInt64 :=
  let (n, next) := random seed
  (n.toNat % max 1 bound, next)

def interruptionPositions (seed : UInt64) (count actions : Nat) : List Nat × UInt64 :=
  (List.range count).foldl (fun (xs, rng) _ =>
    let (n, rng') := draw rng actions
    (xs ++ [n], rng')) ([], seed)

/-- Modeled cognitive-load proxy: each remembered source item incurs one unit
per screen transition until its gated action. No calibrated working-memory claim. -/
structure LookupRecord where
  task : String
  episodeIndex : Nat := 0
  need : String
  screen : String
  component : String
  traceIndex : Nat
  items : Nat
  samples : List Information.Sample := []
  memoryCarry : Nat := 0
  consumed : Bool := false
  actionScreen : Option String := none
  deriving Repr

structure EpisodeResult where
  lookups : List LookupRecord := []
  episodeIndex : Nat := 0
  state : State
  trace : List TraceEvent
  complaints : List String
  rng : UInt64
  interruptions : List Nat
  actionIndex : Nat
  elapsedMs : Nat
  lastDevice : Option Bool
  resumption : Resumption.InterruptionRuntime := {}
  readingMs : Nat := 0
  readSections : List String := []

/-- Resumed events and planning share the current patient snapshot; the saved
context cannot restore stale facts after an external scenario update. -/
def currentContext (ctx : Context) (r : EpisodeResult) : Context :=
  { ctx with facts := r.resumption.latestFacts?.getD ctx.facts }

def lookupJson (r : LookupRecord) : Lean.Json := Lean.Json.mkObj [
  ("task", Lean.toJson r.task), ("episode", Lean.toJson r.episodeIndex), ("need", Lean.toJson r.need),
  ("screen", Lean.toJson r.screen), ("component", Lean.toJson r.component),
  ("traceIndex", Lean.toJson r.traceIndex), ("items", Lean.toJson r.items),
  ("memoryCarry", Lean.toJson r.memoryCarry), ("consumed", Lean.toJson r.consumed),
  ("actionScreen", Lean.toJson r.actionScreen)]

def gateEvent (ctx : Context) (s : State) (gate : Information.Gate) (e : Event) : Bool :=
  match gate, e with
  | .entry element slot, .enter c _ =>
    ((shownComp? ctx.sp ctx.prog ctx.facts s c).map fun c => match c.kind with
      | .field el sl _ => el == element && resolveSlot s sl == slot
      | _ => false).getD false
  | .commit id, .click c =>
    ((shownComp? ctx.sp ctx.prog ctx.facts s c).map fun c => match c.kind with
      | .button (.commit cm) => id == cm | _ => false).getD false
  | _, _ => false

/-- A source-bound answer must still be fresh at the actual gated event. -/
def needsAllow (ctx : Context) (r : EpisodeResult) (s : State) (e : Event) : Bool :=
  ctx.goals.informationNeeds.all fun n => !gateEvent ctx s n.gate e ||
    r.lookups.any (fun a => a.need == n.id && a.episodeIndex == r.episodeIndex && !a.consumed &&
      a.samples == Information.selected n (Information.asOfMinute ctx.goals.informationDisplay (nowMin ctx.facts s + ctx.goals.informationOffset)))

/-- Why a prior receipt cannot replace the review that just blocked a commit. -/
def receiptComplaints (ctx : Context) (s : State) (cm : CommitId) : List String :=
  ctx.sp.reviews.flatMap fun rq =>
    if rq.commit != cm || !whenHolds ctx.facts s rq.when ||
      reviewMet ctx.sp ctx.prog ctx.facts s rq then [] else
    (s.receipts.filter (·.info == rq.info)).map fun r =>
      let reason := match rq.mode with
        | .shownOnCommit => "shownOnCommit: no receipt is allowed"
        | .shownOrReceipt w roles =>
          if infoVersion ctx.sp ctx.facts rq.info != some r.dataVersion then "data version changed"
          else if r.time > nowMin ctx.facts s then "receipt is from the future"
          else if nowMin ctx.facts s - r.time > w then s!"age {nowMin ctx.facts s - r.time} min exceeds window {w}"
          else if !roles.contains r.role then s!"role {r.role.name} is not allowed"
          else "receipt does not satisfy this review"
      s!"{rq.info}: {reason}"

/-- Temporal and durable-clock failures retain their named Core statuses.
No UI entry or simulated acknowledgment manufactures external event evidence. -/
def obligationComplaints (ctx : Context) (s : State) (cm : CommitId) : List String :=
  (obligationViews ctx.sp ctx.facts s).filterMap fun o =>
    if o.commit == cm && o.status != .met then
      some s!"{cm}: obligation {o.requirement} is {reprStr o.status}"
    else none

def commitComplaints (ctx : Context) (s : State) (cm : CommitId) : List String :=
  receiptComplaints ctx s cm ++ obligationComplaints ctx s cm

def eventComp : Event → Option CompId
  | .click c | .confirm c | .enter c _ | .selectTab c _ => some c
  | _ => none

def isGoalAction (ctx : Context) (s : State) : Event → Bool
  | .enter _ _ | .confirm _ => true
  | .click c => match shownComp? ctx.sp ctx.prog ctx.facts s c with
    | some { kind := .button (.commit cm), .. } => ctx.goals.commits.contains cm
    | _ => false
  | _ => false

/-- Authoring changes effort only: the entered value remains the full section.
Absent metadata preserves full typing. Reading uses the original NoteText. -/
def noteEntryOps (notes : List NoteText) (element : String) (v : Value)
    (activate : List Op) : List Op :=
  match notes.find? (·.id == element) |>.bind (·.authoring?) with
  | none => activate ++ List.replicate (typedLen v) .key
  | some a => activate ++ (List.replicate a.selections [.point, .click]).flatten ++
      List.replicate (min (typedLen v) a.typedCharacters) .key

def actionOps (ctx : Context) (params : PersonaParams) (s : State) (e : Event)
    (rng : UInt64) (notes : List NoteText := []) : List Op × UInt64 := Id.run do
  let mut seed := rng
  let mut mouse := true
  if let some c := (eventComp e).bind (shownComp? ctx.sp ctx.prog ctx.facts s) then
    if c.hotkey?.isSome then
      let (n, next) := draw seed 100
      seed := next
      mouse := n ≥ params.keyboardShare
  let activate : List Op := if mouse then [.point, .click] else [.key]
  match e with
  | .enter c v =>
    let el := (shownComp? ctx.sp ctx.prog ctx.facts s c).bind fun c => match c.kind with
      | .field id _ _ => ctx.sp.element? id | _ => none
    let scan := el.any (fun e => match e.kind with | .scan _ => true | _ => false)
    let cosign := el.any (fun e => e.kind == .cosign)
    return ([.think] ++ (if cosign then [.wait] else []) ++
      (if scan then [.scan] else noteEntryOps notes (el.map (·.id) |>.getD "") v activate), seed)
  | .ack a =>
    let removable := (ctx.sp.alert? a).any (·.tier == .removable)
    let (n, next) := draw seed 1000
    return ((if removable && n < params.overrideRate then [] else [.think]) ++ [.point, .click], next)
  | .scroll _ => return ([.scroll], seed)
  | .search q => return ([.point, .click] ++ List.replicate q.length .key, seed)
  | _ => return ((if isGoalAction ctx s e then [.think] else []) ++ activate, seed)

/-- Experimental additional choice service is paid before the guarded event.
It neither replaces motor KLM time nor changes the clinical goal or guard. -/
def choiceLatency (r : EpisodeResult) (ops : List Op) : EpisodeResult :=
  { r with elapsedMs := r.elapsedMs +
      r.resumption.config.choiceLatencyMs * (ops.filter (· == .think)).length }

/-- Execute an event with elapsed KLM time applied before the event. This lets
an interruption expire a receipt before a commit is attempted. -/
def emit (ctx : Context) (task : Task) (r : EpisodeResult) (e : Event) (ops : List Op) : EpisodeResult :=
  let ctx := currentContext ctx r
  let (ms, dev) := klmFold r.lastDevice ops
  let elapsed := r.elapsedMs + ms
  let before := { r.state with clock := elapsed / 100 }
  let (after, result) := if !needsAllow ctx r before e then
    (before, StepResult.blocked "information need missing or stale")
    else if Workspace.enabled ctx.prog then Workspace.step ctx.sp ctx.prog ctx.facts ctx.user before e
    else step ctx.sp ctx.prog ctx.facts ctx.user .human before e
  let complaints := match e, result with
    | .click c, .blocked _ => match shownComp? ctx.sp ctx.prog ctx.facts before c with
      | some { kind := .button (.commit cm), .. } => commitComplaints ctx before cm
      | _ => []
    | _, _ => []
  { r with
    state := after
    lookups := r.lookups.map fun a =>
      let used := a.episodeIndex == r.episodeIndex && ctx.goals.informationNeeds.any (fun n => n.id == a.need && gateEvent ctx before n.gate e) &&
        (match result with | .ok => true | _ => false)
      { a with
        memoryCarry := a.memoryCarry + if a.episodeIndex == r.episodeIndex && !a.consumed && before.screen != after.screen then a.items else 0,
        consumed := a.consumed || used,
        actionScreen := if used then some before.screen else a.actionScreen }
    trace := r.trace ++ [{
      task := task.id, t := task.startMin * 600 + elapsed / 100,
      screen := before.screen, event := e, ops, result }]
    complaints := r.complaints ++ complaints
    elapsedMs := elapsed
    lastDevice := dev }

/-- Service work separately from clinical events. Invalidate remembered answers
when source samples have aged; returning never manufactures a new answer. -/
def interruptionCheckpoint (ctx : Context) (task : Task) (r : EpisodeResult)
    (closing := false) : EpisodeResult :=
  if r.resumption.config.mode == .fixedCost then r else
  let ctx := currentContext ctx r
  let (state, elapsed, runtime) := Resumption.checkpoint ctx.sp ctx.prog ctx.facts ctx.user
    task r.state r.elapsedMs r.resumption closing
  let ctx := { ctx with facts := runtime.latestFacts?.getD ctx.facts }
  { r with
    state, elapsedMs := elapsed, resumption := runtime,
    lookups := r.lookups.filter fun a => a.consumed ||
      ctx.goals.informationNeeds.all (fun n => n.id != a.need ||
        a.samples == Information.selected n (Information.asOfMinute ctx.goals.informationDisplay
          (nowMin ctx.facts state + ctx.goals.informationOffset))) }

/-- Incomplete clinical tasks cannot silently lose owned drafts at a day-loop
boundary. Complete tasks have no abandonment; queued work is always settled. -/
def finishInterruptionTask (ctx : Context) (task : Task) (r : EpisodeResult) (complete : Bool) : EpisodeResult :=
  let out := interruptionCheckpoint ctx task r true
  if out.resumption.config.mode == .fixedCost || complete || out.state.captured.isEmpty then out else
  let record : Resumption.FrameRecord := {
    task := task.id, owner := ctx.user.id, patient := task.patientId,
    suspendedAtMs := task.startMin * 60000 + r.elapsedMs,
    closedAtMs := task.startMin * 60000 + out.elapsedMs,
    disposition := .discarded, reason := "clinical task ended incomplete; unsent draft explicitly discarded" }
  { out with
    state := { out.state with captured := [] },
    resumption := { out.resumption with metrics := { out.resumption.metrics with
      abandoned := out.resumption.metrics.abandoned + 1,
      frames := out.resumption.metrics.frames ++ [record] } } }

/-- Missing or stale information cannot publish a gated interpreter action. -/
theorem emit_blocks_unanswered (ctx task r e ops)
    (h : needsAllow (currentContext ctx r) r { r.state with clock := (r.elapsedMs + (klmFold r.lastDevice ops).1) / 100 } e = false) :
    (emit ctx task r e ops).state =
      { r.state with clock := (r.elapsedMs + (klmFold r.lastDevice ops).1) / 100 } := by
  simp [emit, h]

#print axioms emit_blocks_unanswered

/-- Fixed patient-selection policy: identical directory, workflow and patient imply
identical activations, typing, scrolls and pointer operations for every UI version. -/
def selectionActivity (task : Task) : String :=
  match task.workflow with
  | .W1 | .W5 => "scheduleTasks" | .W2 => "inboxResults"
  | .W3 => "edTrackBoard" | .W4 => "shiftWorklist" | .W7 => "inboxRxRequests"
  | .W6 => if task.choices.w6Step? == some .consult then "consultList" else "orSchedule"

/-- Execute the same semantic row/lookup controls that the app receives. -/
def selectTaskPatient (ctx : Context) (task : Task) (r : EpisodeResult) : EpisodeResult := Id.run do
  if !Workspace.enabled ctx.prog || Workspace.bound ctx.facts r.state then return r
  let mut out := r
  let desired := selectionActivity task
  if desired != (out.state.patientContext?.map (·.activity)).getD "" &&
      (Workspace.activities ctx.prog ctx.facts).any (·.info == desired) then
    out := emit ctx task out (.click ("workspace.activity|" ++ desired)) [.point, .click]
  let patient := ctx.facts.sourcePatientId?.getD task.patientId
  let control := (Workspace.openControls ctx.prog ctx.facts out.state).find? fun c =>
    match c.action with | .openPatient id _ => id == patient | _ => false
  let control := match control with
    | some control => some control
    | none => none
  if control.isNone then
    let query := ((Workspace.patient? ctx.facts patient).map (·.mrn)).getD ctx.facts.patientId
    out := emit ctx task out (.enter "workspace.search" (.text query)) ([.point, .click] ++ List.replicate query.length .key)
  let control := (Workspace.openControls ctx.prog ctx.facts out.state).find? fun c =>
    match c.action with | .openPatient id _ => id == patient | _ => false
  match control with
  | none => return { out with complaints := out.complaints ++ [task.id ++ ": patient could not be found in the directory"] }
  | some control =>
    for _ in List.range ((control.row?.getD 0) / 10) do
      out := emit ctx task out (.scroll out.state.screen) [.scroll]
    out := emit ctx task out (.click control.id) [.point, .click]
    -- Data arrival is not a second clinician activation.
    return { out with state := Workspace.bind ctx.sp ctx.prog ctx.facts ctx.user out.state }

/-- Scenario text model: 50 ms/character (200 words/min at six characters
per word) and 1800 characters/viewport. No observed-care fit is claimed.
Synthetic Hospital (2026) supplies text, not either coefficient. -/
def textReadMs (characters : Nat) : Nat := characters * 50
def textPages (characters : Nat) : Nat := (characters - 1) / 1800

def readSection (ctx : Context) (task : Task) (r : EpisodeResult) (e : Event) : EpisodeResult := Id.run do
  if r.resumption.config.legacyModel || !r.resumption.config.lengthCosts then return r
  let mut out := r
  -- Read only notes actually exposed in this patient's visible chart panel.
  -- Relevance selection (decision 16) stays deferred; no hidden chart is read.
  let visibleNotes := (shown ctx r.state).any fun c =>
    showsInfo "priorNotes" c.kind || showsInfo "encounterNotes" c.kind
  if visibleNotes then
    for note in (r.resumption.config.chartDisplay task).notes do
      let key := "chart:" ++ note.id
      if !out.readSections.contains key then
        for _ in List.range (textPages note.text.length) do
          out := emit ctx task out (.scroll out.state.screen) [.scroll]
        let ms := textReadMs note.text.length
        out := { out with
          elapsedMs := out.elapsedMs + ms, readingMs := out.readingMs + ms,
          readSections := out.readSections ++ [key] }
  let some id := eventComp e | return out
  let some c := shownComp? ctx.sp ctx.prog ctx.facts out.state id | return out
  let .field sec _ _ := c.kind | return out
  let some text := (task.choices.noteTexts?.getD []).find? (·.id == sec) | return out
  if out.readSections.contains sec then return out
  for _ in List.range (textPages text.text.length) do
    out := emit ctx task out (.scroll out.state.screen) [.scroll]
  let ms := textReadMs text.text.length
  return { out with
    elapsedMs := out.elapsedMs + ms, readingMs := out.readingMs + ms,
    readSections := out.readSections ++ [sec],
    state := { out.state with clock := (out.elapsedMs + ms) / 100 } }

/-- Scroll to fields below a twelve-component fold, ten rows per page. -/
def scrollTo (ctx : Context) (task : Task) (r : EpisodeResult) (e : Event) : EpisodeResult :=
  let r := readSection ctx task r e
  match eventComp e with
  | none => r
  | some id =>
    let idx := (shown ctx r.state).findIdx (·.id == id)
    let pages := if idx < 12 then 0 else (idx - 12) / 10 + 1
    (List.range pages).foldl (fun r _ => emit ctx task r (.scroll r.state.screen) [.scroll]) r

/-- Scroll costs use the existing twelve-component fold plus ten source rows
per page. This ordinal viewport is a simulation assumption, not browser geometry. -/
def readNeed (ctx : Context) (task : Task) (r : EpisodeResult) (n : Information.Need) : EpisodeResult := Id.run do
  let some comp := (needWitnesses ctx r.state n).head? | return r
  let mut out := scrollTo ctx task r (.click comp)
  let now := Information.asOfMinute ctx.goals.informationDisplay (nowMin ctx.facts out.state + ctx.goals.informationOffset)
  let readable := (n :: ctx.goals.informationNeeds).eraseDups.filter fun m =>
    (needWitnesses ctx out.state m).contains comp &&
      !out.lookups.any (fun a => a.need == m.id && a.episodeIndex == r.episodeIndex)
  let ui := Render.renderUi ctx.sp ctx.prog ctx.facts ctx.goals.informationDisplay ctx.user out.state
  let depth := readable.foldl (fun d m => max d
    (((ui.workspace ++ ui.side).map (Information.depth m now comp)).foldl max 0)) 0
  let samples := (readable.flatMap (fun m => Information.selected m now)).eraseDups
  let inventories := readable.foldl (fun total m => total + m.inventory.length) 0
  let items := max 1 (samples.length + inventories)
  for _ in List.range ((depth - 1) / 10) do
    out := emit ctx task out (.scroll out.state.screen) [.scroll]
  -- Reading is paid mental time without a fabricated UI activation/receipt.
  out := { out with elapsedMs := out.elapsedMs + mentalMs * items, readingMs := out.readingMs + mentalMs * items }
  let seen := { out.state with clock := out.elapsedMs / 100 }
  for m in readable do
    if (needWitnesses ctx seen m).contains comp then
      let samples := Information.selected m (Information.asOfMinute ctx.goals.informationDisplay (nowMin ctx.facts seen + ctx.goals.informationOffset))
      let prior := out.lookups.filter fun a => a.episodeIndex == r.episodeIndex &&
        ctx.goals.informationNeeds.any (fun other => other.id == a.need && other.gate == m.gate)
      let shared := prior.flatMap (·.samples)
      let items := match m.question with
        | .active _ => max 1 m.inventory.length
        | _ => (samples.filter (!shared.contains ·)).length
      out := { out with lookups := out.lookups ++ [{ task := task.id, need := m.id, screen := out.state.screen, component := comp, traceIndex := out.trace.length, items, samples, episodeIndex := r.episodeIndex }] }
  return out

def lookupExpert (ctx : Context) (params : PersonaParams) (task : Task)
    (r : EpisodeResult) (n : Information.Need) : EpisodeResult := Id.run do
  if r.lookups.any (fun a => a.need == n.id && a.episodeIndex == r.episodeIndex) then return r
  let some path := needPath ctx r.state n | return { r with complaints := r.complaints ++
    [s!"{task.id}: information need {n.id}: no reachable faithful answer; incomplete"] }
  let mut out := r
  for e in path do
    let (ops, rng) := actionOps ctx params out.state e out.rng (task.choices.noteTexts?.getD [])
    out := emit ctx task (choiceLatency { out with rng } ops) e ops
  return readNeed ctx task out n

/-- Early review creates a receipt once per information version, only while
that information is actually shown. -/
def earlyReview (ctx : Context) (s : State) : Option Event :=
  (shown ctx s).findSome? fun c => match c.kind with
    | .button (.markReviewed i) =>
      if infoShown ctx.sp ctx.prog ctx.facts s i &&
        ctx.sp.reviews.any (fun rq => ctx.goals.commits.contains rq.commit && rq.info == i) &&
        !s.receipts.any (fun r => r.info == i && r.user == ctx.user.id &&
          infoVersion ctx.sp ctx.facts i == some r.dataVersion &&
          nowMin ctx.facts s ≥ r.time && nowMin ctx.facts s - r.time ≤ 240)
      then some (.click c.id) else none
    | _ => none

/-- Fuel is structural. Failed, non-alert commits have a separate retry cap.
All unconsumed interruptions attach to the last goal action of the last episode. -/
def playLoop (ctx : Context) (params : PersonaParams) (task : Task) (lastEpisode : Bool) :
    Nat → EpisodeResult → Bool → Nat → EpisodeResult
  | 0, r, _, _ => { r with complaints := r.complaints ++ [s!"{task.id}: fuel exhausted; incomplete"] }
  | fuel + 1, r, arrival, failures => Id.run do
    let ctx := currentContext ctx r
    if ctx.done r.state then return r
    if failures ≥ 4 then return { r with complaints := r.complaints ++ [s!"{task.id}: repeated blocked commits; incomplete"] }
    let mut out := interruptionCheckpoint ctx task (selectTaskPatient ctx task r)
    let ctx := currentContext ctx out
    if arrival then
      let (n, next) := draw out.rng 1000
      out := { out with rng := next }
      if n < params.backtrackRate && out.state.popup?.isNone then
        let turns := (shown ctx out.state).filter fun c => match c.kind with
          | .button (.goto t) => t != out.state.screen && (ctx.prog.screen? t).isSome
          | _ => false
        if !turns.isEmpty then
          let (idx, next) := draw out.rng turns.length
          out := { out with rng := next }
          if let some c := turns[idx]? then
            out := emit ctx task out (.click c.id) [.point, .click]
    for n in ctx.goals.informationNeeds do
      out := lookupExpert ctx params task out n
    let e? := match out.state.popup? with
      | some p => some (.ack p.1)
      | none =>
        (if params.reviewsAllergiesEarly then earlyReview ctx out.state else none).or
          (actions ctx out.state).head?
    let mut pathLen := 0
    let mut event := e?
    if event.isNone then
      if let some path := planNavigation ctx out.state then
        pathLen := path.length
        event := path.head?
    match event with
    | none =>
      let details := ctx.goals.commits.flatMap fun cm =>
        if out.state.commits.contains cm then [] else
          commitComplaints ctx out.state cm ++ [guardReason ctx.sp ctx.prog ctx.facts ctx.user out.state cm]
      return { out with complaints := out.complaints ++ details ++ [s!"{task.id}: no reachable unmet goal; incomplete"] }
    | some e =>
      if params.searchWhenBuried && pathLen ≥ 3 then
        if searchShown ctx.sp ctx.prog ctx.facts out.state then
          out := emit ctx task out (.search "task") [.point, .click, .key, .key, .key, .key]
        else out := emit ctx task out (.scroll out.state.screen) [.scroll]
        out := emit ctx task out (.scroll out.state.screen) [.scroll]
      out := scrollTo ctx task out e
      let (ops, next) := actionOps ctx params out.state e out.rng (task.choices.noteTexts?.getD [])
      out := { out with rng := next }
      let goalAction := isGoalAction ctx out.state e
      let flush := lastEpisode && ctx.done (ctx.next out.state e)
      let due := if out.resumption.config.mode == .fixedCost && goalAction then out.interruptions.filter (fun n => n ≤ out.actionIndex || flush) else []
      let ops := List.replicate due.length [.wait, .think] |>.flatten |>.append
        ((if arrival && params.scansSidebar then [.think] else []) ++ ops)
      out := { out with
        interruptions := out.interruptions.filter (fun n => !due.contains n),
        actionIndex := out.actionIndex + if goalAction then 1 else 0 }
      let prev := out.state.screen
      out := emit ctx task (choiceLatency out ops) e ops
      let failed := match out.trace.getLast?.map (·.result) with
        | some (.blocked reason) => if goalAction && reason != "alert" then failures + 1 else failures
        | _ => failures
      return playLoop ctx params task lastEpisode fuel out (prev != out.state.screen) failed

def playEpisode (ctx : Context) (params : PersonaParams) (task : Task) (lastEpisode : Bool)
    (r : EpisodeResult) : EpisodeResult :=
  -- Core rejects these values on every screen. Preserve the goals and report
  -- the obstruction before navigation; searching other screens cannot fix it.
  if ctx.goals.values.any (fun g => match g.value?, ctx.sp.element? g.element with
      | some v, some el => !valueSatisfies ctx.facts ctx.user el.kind v
      | _, none => true
      | none, some _ => false) then
    { r with complaints := r.complaints ++ [s!"{task.id}: unrepresentable clinical choice; incomplete"] }
  else
  let fuel := 4 * (ctx.goals.values.length + ctx.goals.commits.length + 2) *
    (ctx.prog.screens.length + 4) + 50
  let r := if ctx.goals.informationNeeds.isEmpty then r else selectTaskPatient ctx task r
  let r := ctx.goals.informationNeeds.foldl (lookupExpert ctx params task) r
  if !ctx.goals.informationNeeds.all (fun n => r.lookups.any (fun a => a.need == n.id && a.episodeIndex == r.episodeIndex && !a.consumed)) then r
  else playLoop ctx params task lastEpisode fuel r true 0

/-- Source snapshots cannot inject another actor's private review knowledge.
Legacy controls retain the historical ambient-receipt behavior. -/
def actorReceipts (legacy : Bool) (u : User) (source : List Receipt) : List Receipt :=
  if legacy then source else source.filter (·.user == u.id)

/-- The scenario receiver explicitly accepts before service. Unaccepted offers
remain sender-owned. No predecessor workspace or receipts cross this boundary. -/
def taskHandover (task : Task) (sender recipient : String) (atMs : Nat) : Option Scheduling.Handover :=
  (Resumption.offerHandover task.id task.patientId sender recipient "queued clinical work at coverage transition" atMs).bind
    (fun h => Resumption.acceptHandover h recipient atMs)

/-- One day: patient-specific receipts survive between tasks, captured values
and commit/ack history do not. Each task has its own independent RNG stream. -/
def simulateWithInformation (sp : Spec) (prog : Program) (params : PersonaParams) (schedule : DaySchedule)
    (factsFor : Task → Facts) (seed : Nat)
    (displayFor? : Option (Task → Render.Display) := none)
    (interruptionConfig : Resumption.InterruptionConfig := {}) : DayResult × List LookupRecord := Id.run do
  -- Fresh day simulations include the shared workspace even for an older UI
  -- layout. Recorded trajectory replay keeps its original program flag.
  let prog := if schedule.tasks.any (fun task => (factsFor task).patientDirectory?.isSome)
    then { prog with patientSelection? := some true } else prog
  let mut user : User := { id := prog.owner, role := params.role }
  let mut lookups := []
  let mut receipts : List (String × List Receipt) := []
  let mut day : DayResult := {
    day := schedule.day, persona := params.id,
    programVersion := prog.version, trace := [], tasks := [], floor := [], complaints := [] }
  let legacy := schedule.clockMode? == some "legacy"
  let windows := Scheduling.shifts schedule
  let mut clock := 0
  let mut pending := schedule.tasks
  let mut timings := []
  for _ in schedule.tasks do
    let next := if legacy then pending.head?.map (fun t => (t, pending.tail))
      else Scheduling.dispatchIn windows clock pending
    let some (source, rest) := next | do
      for t in pending do
        timings := timings ++ [Scheduling.carry windows clock t]
        day := { day with tasks := day.tasks ++ [emptyMetrics t.id], floor := day.floor ++ [emptyMetrics t.id] }
      pending := []
      break
    pending := rest
    let placement := Scheduling.slot windows clock source
    let start := if legacy then source.startMin * 60000 else (placement.map (·.2)).getD clock
    let actor := if legacy || interruptionConfig.legacyModel then prog.owner else
      (placement.map (fun (w, _) => Scheduling.actorFor prog.owner windows w)).getD prog.owner
    let priorActor := user.id
    let sourceOwner := if legacy || interruptionConfig.legacyModel then prog.owner else
      ((Scheduling.slot windows 0 source).map (fun (w, _) => Scheduling.actorFor prog.owner windows w)).getD priorActor
    let handover := if actor != sourceOwner then taskHandover source sourceOwner actor start else none
    if actor != priorActor then receipts := []
    user := { user with id := actor }
    let clinical := if legacy || interruptionConfig.legacyModel then 0 else (Scheduling.arrival source).clinicalServiceMs?.getD 0
    let offset := if legacy then 0 else start % 60000
    let task := if legacy then source else { source with startMin := start / 60000 }
    let raw := factsFor source
    let raw := if Workspace.enabled prog && raw.patientDirectory?.isNone then
      { raw with
        sourcePatientId? := some task.patientId
        patientDirectory? := some { patients := [{ id := task.patientId, name := raw.patientId, mrn := raw.patientId }], activities := [] } }
      else raw
    let facts := { raw with
      now := task.startMin,
      receipts := actorReceipts (legacy || interruptionConfig.legacyModel) user raw.receipts ++ (receipts.lookup task.patientId).getD [] }
    let eps := taskEpisodes facts task
    if eps.isEmpty then
      day := { day with complaints := day.complaints ++
        [s!"{task.id}: no clinical episode; check workflow ownership/delegation, dose timing and focused refill prescription"] }
    let goals := eps.map fun ep => deriveGoals sp ep.facts user (episodeWorkflow task ep) ep.choices ep.orders ep.med? (displayFor?.map (fun f => f task))
    let nActions := goals.foldl (fun n g => n + g.values.length + g.waivers.length + g.commits.length) 0
    let (positions, rng) := interruptionPositions (taskSeed seed task.id) task.interruptions nActions
    let mut r : EpisodeResult := {
      state := default, trace := [], complaints := [], rng,
      interruptions := positions, actionIndex := 0, elapsedMs := offset + clinical, lastDevice := none,
      resumption := Resumption.initRuntime seed source params.role (schedule.tasks.map (·.patientId)) interruptionConfig }
    let protocolBefore := source.workflowPlan?.map (fun p => (Workflow.finish p false (workflowDecision source)).activeMs) |>.getD 0
    r := { r with elapsedMs := r.elapsedMs + protocolBefore }
    let mut documentedMs := start
    let mut complete := !eps.isEmpty
    let mut floor := { emptyMetrics task.id with completed := true }
    for ((ep, g), idx) in (eps.zip goals).zipIdx do
      let f := ep.facts
      let f := { f with receipts := facts.receipts ++ r.state.receipts }
      let f := Resumption.refreshAt interruptionConfig f (task.startMin * 60000 + r.elapsedMs)
      r := { r with resumption := { r.resumption with latestFacts? := none } }
      let ctx : Context := { sp, prog, facts := f, user, goals := { g with informationOffset := Information.shiftOffset params.id, values := g.values ++ g.waivers } }
      r := { r with
        episodeIndex := idx,
        state := { (if Workspace.enabled prog && idx == 0 then Workspace.init prog else
          { init sp prog f user with patientContext? := r.state.patientContext? }) with clock := r.elapsedMs / 100 },
        complaints := r.complaints ++ g.problems.map (fun problem => s!"{task.id}: {problem}") }
      r := playEpisode ctx params task (idx + 1 == eps.length) r
      complete := complete && (currentContext ctx r).done r.state
      documentedMs := task.startMin * 60000 + r.elapsedMs
      if idx + 1 == eps.length then r := finishInterruptionTask ctx task r complete
      floor := addMetrics floor (floorMetrics task.id sp f user g)
    if eps.isEmpty then
      let ctx : Context := { sp, prog, facts, user, goals := default }
      r := finishInterruptionTask ctx task r false
    let workflow := source.workflowPlan?.map (fun p => Workflow.finish p complete (workflowDecision source))
    let protocolAfter := workflow.map (fun w => w.activeMs - protocolBefore + w.waitingMs) |>.getD 0
    r := { r with elapsedMs := r.elapsedMs + protocolAfter }
    lookups := lookups ++ r.lookups.map (fun a => { a with traceIndex := day.trace.length + a.traceIndex })
    receipts := (task.patientId, r.state.receipts) :: receipts.filter (·.1 != task.patientId)
    day := { day with
      trace := day.trace ++ r.trace
      tasks := day.tasks ++ [{ metrics task.id r.trace complete with
        workflow? := workflow,
        klmDeciSec := if interruptionConfig.legacyModel && interruptionConfig.mode == .fixedCost then (metrics task.id r.trace complete).klmDeciSec
          else (r.elapsedMs - offset - clinical - r.resumption.metrics.closureWaitMs - (workflow.map (fun w => w.activeMs + w.waitingMs)).getD 0) / 100,
        wallTimeMinutes? := some ((r.elapsedMs - offset + 59999) / 60000),
        interruptions? := if interruptionConfig.mode == .realWork then some r.resumption.metrics else none }]
      floor := day.floor ++ [floor]
      complaints := (day.complaints ++ r.complaints).eraseDups }
    if !legacy then
      let duration := r.elapsedMs - offset
      clock := start + duration
      if let some (w, _) := placement then
        -- Workflow protocol phases are clinician service; the response wait is passive.
        let m := r.resumption.metrics
        let protocolWait := (workflow.map (·.waitingMs)).getD 0
        timings := timings ++ [Scheduling.withClocks (Scheduling.withInterruptions
          (Workflow.withAdministration source (Scheduling.withDocumentation (Scheduling.timing windows source w start duration complete) documentedMs)) w.endMs m)
          (clinical + (workflow.map (·.activeMs)).getD 0) r.readingMs documentedMs
          { m with closureWaitMs := m.closureWaitMs + protocolWait } actor handover]
  if !legacy then day := { day with workload? := some (Scheduling.report windows timings) }
  return (day, lookups)

/-- Expert entry point; real work and continuous time default, with explicit legacy modes. -/
def simulate (sp : Spec) (prog : Program) (params : PersonaParams) (schedule : DaySchedule)
    (factsFor : Task → Facts) (seed : Nat)
    (interruptionConfig : Resumption.InterruptionConfig := {}) : DayResult :=
  (simulateWithInformation sp prog params schedule factsFor seed none interruptionConfig).1

#guard (random 0).1.toNat == 16294208416658607535
#guard (interruptionPositions 1 7 4).1.length == 7
end Ehr.Sim
