import Ehr.Sim.Interaction

/-!
Deterministic persona policy. Clinical goals are fixed outside the UI. Each
(task seed, task ID) gets a SplitMix64 stream. Interruption positions are drawn
before navigation, hotkey, detour or override draws. The loop has structural
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

structure EpisodeResult where
  state : State
  trace : List TraceEvent
  complaints : List String
  rng : UInt64
  interruptions : List Nat
  actionIndex : Nat
  elapsedMs : Nat
  lastDevice : Option Bool

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

def eventComp : Event → Option CompId
  | .click c | .confirm c | .enter c _ | .selectTab c _ => some c
  | _ => none

def isGoalAction (ctx : Context) (s : State) : Event → Bool
  | .enter _ _ | .confirm _ => true
  | .click c => match shownComp? ctx.sp ctx.prog ctx.facts s c with
    | some { kind := .button (.commit cm), .. } => ctx.goals.commits.contains cm
    | _ => false
  | _ => false

def actionOps (ctx : Context) (params : PersonaParams) (s : State) (e : Event)
    (rng : UInt64) : List Op × UInt64 := Id.run do
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
      (if scan then [.scan] else activate ++ List.replicate (typedLen v) .key), seed)
  | .ack a =>
    let removable := (ctx.sp.alert? a).any (·.tier == .removable)
    let (n, next) := draw seed 1000
    return ((if removable && n < params.overrideRate then [] else [.think]) ++ [.point, .click], next)
  | .scroll _ => return ([.scroll], seed)
  | .search q => return ([.point, .click] ++ List.replicate q.length .key, seed)
  | _ => return ((if isGoalAction ctx s e then [.think] else []) ++ activate, seed)

/-- Execute an event with elapsed KLM time applied before the event. This lets
an interruption expire a receipt before a commit is attempted. -/
def emit (ctx : Context) (task : Task) (r : EpisodeResult) (e : Event) (ops : List Op) : EpisodeResult :=
  let (ms, dev) := klmFold r.lastDevice ops
  let elapsed := r.elapsedMs + ms
  let before := { r.state with clock := elapsed / 100 }
  let (after, result) := step ctx.sp ctx.prog ctx.facts ctx.user .human before e
  let complaints := match e, result with
    | .click c, .blocked _ => match shownComp? ctx.sp ctx.prog ctx.facts before c with
      | some { kind := .button (.commit cm), .. } => receiptComplaints ctx before cm
      | _ => []
    | _, _ => []
  { r with
    state := after
    trace := r.trace ++ [{
      task := task.id, t := task.startMin * 600 + elapsed / 100,
      screen := before.screen, event := e, ops, result }]
    complaints := r.complaints ++ complaints
    elapsedMs := elapsed
    lastDevice := dev }

/-- Scroll to fields below a twelve-component fold, ten rows per page. -/
def scrollTo (ctx : Context) (task : Task) (r : EpisodeResult) (e : Event) : EpisodeResult :=
  match eventComp e with
  | none => r
  | some id =>
    let idx := (shown ctx r.state).findIdx (·.id == id)
    let pages := if idx < 12 then 0 else (idx - 12) / 10 + 1
    (List.range pages).foldl (fun r _ => emit ctx task r (.scroll r.state.screen) [.scroll]) r

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
    if ctx.done r.state then return r
    if failures ≥ 4 then return { r with complaints := r.complaints ++ [s!"{task.id}: repeated blocked commits; incomplete"] }
    let mut out := r
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
          receiptComplaints ctx out.state cm ++ [guardReason ctx.sp ctx.prog ctx.facts ctx.user out.state cm]
      return { out with complaints := out.complaints ++ details ++ [s!"{task.id}: no reachable unmet goal; incomplete"] }
    | some e =>
      if params.searchWhenBuried && pathLen ≥ 3 then
        if searchShown ctx.sp ctx.prog ctx.facts out.state then
          out := emit ctx task out (.search "task") [.point, .click, .key, .key, .key, .key]
        else out := emit ctx task out (.scroll out.state.screen) [.scroll]
        out := emit ctx task out (.scroll out.state.screen) [.scroll]
      out := scrollTo ctx task out e
      let (ops, next) := actionOps ctx params out.state e out.rng
      out := { out with rng := next }
      let goalAction := isGoalAction ctx out.state e
      let flush := lastEpisode && ctx.done (ctx.next out.state e)
      let due := if goalAction then out.interruptions.filter (fun n => n ≤ out.actionIndex || flush) else []
      let ops := List.replicate due.length [.wait, .think] |>.flatten |>.append
        ((if arrival && params.scansSidebar then [.think] else []) ++ ops)
      out := { out with
        interruptions := out.interruptions.filter (fun n => !due.contains n),
        actionIndex := out.actionIndex + if goalAction then 1 else 0 }
      let prev := out.state.screen
      out := emit ctx task out e ops
      let failed := match out.trace.getLast?.map (·.result) with
        | some (.blocked reason) => if goalAction && reason != "alert" then failures + 1 else failures
        | _ => failures
      return playLoop ctx params task lastEpisode fuel out (prev != out.state.screen) failed

def playEpisode (ctx : Context) (params : PersonaParams) (task : Task) (lastEpisode : Bool)
    (r : EpisodeResult) : EpisodeResult :=
  let fuel := 4 * (ctx.goals.values.length + ctx.goals.commits.length + 2) *
    (ctx.prog.screens.length + 4) + 50
  playLoop ctx params task lastEpisode fuel r true 0

/-- One day: patient-specific receipts survive between tasks, captured values
and commit/ack history do not. Each task has its own independent RNG stream. -/
def simulate (sp : Spec) (prog : Program) (params : PersonaParams) (schedule : DaySchedule)
    (factsFor : Task → Facts) (seed : Nat) : DayResult := Id.run do
  let user : User := { id := prog.owner, role := params.role }
  let mut receipts : List (String × List Receipt) := []
  let mut day : DayResult := {
    day := schedule.day, persona := params.id,
    programVersion := prog.version, trace := [], tasks := [], floor := [], complaints := [] }
  for task in schedule.tasks do
    let raw := factsFor task
    let facts := { raw with
      now := task.startMin,
      receipts := raw.receipts ++ (receipts.lookup task.patientId).getD [] }
    let eps := episodes facts task.workflow task.choices
    let goals := eps.map fun ep => deriveGoals sp ep.facts user task.workflow ep.choices ep.orders ep.med?
    let nActions := goals.foldl (fun n g => n + g.values.length + g.waivers.length + g.commits.length) 0
    let (positions, rng) := interruptionPositions (taskSeed seed task.id) task.interruptions nActions
    let mut r : EpisodeResult := {
      state := default, trace := [], complaints := [], rng,
      interruptions := positions, actionIndex := 0, elapsedMs := 0, lastDevice := none }
    let mut complete := !eps.isEmpty
    let mut floor := { emptyMetrics task.id with completed := true }
    for ((ep, g), idx) in (eps.zip goals).zipIdx do
      let f := ep.facts
      let f := { f with receipts := facts.receipts ++ r.state.receipts }
      let ctx : Context := { sp, prog, facts := f, user, goals := { g with values := g.values ++ g.waivers } }
      r := { r with
        state := { init sp prog f user with clock := r.elapsedMs / 100 },
        complaints := r.complaints ++ g.problems }
      r := playEpisode ctx params task (idx + 1 == eps.length) r
      complete := complete && ctx.done r.state
      floor := addMetrics floor (floorMetrics task.id sp f user g)
    receipts := (task.patientId, r.state.receipts) :: receipts.filter (·.1 != task.patientId)
    day := { day with
      trace := day.trace ++ r.trace
      tasks := day.tasks ++ [metrics task.id r.trace complete]
      floor := day.floor ++ [floor]
      complaints := (day.complaints ++ r.complaints).eraseDups }
  return day

#guard (random 0).1.toNat == 16294208416658607535
#guard (interruptionPositions 1 7 4).1.length == 7
end Ehr.Sim
