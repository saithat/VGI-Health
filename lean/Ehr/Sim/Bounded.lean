import Ehr.Sim.Discovery

/-!
Bounded knowledge, separate from Policy.simulate. Only visible controls are
inspected by the unassisted policy; no hidden-child relevance. Clinical goals
supply intentions, not control locations. Explicit paid help is supplied through
Discovery.Guide; the default help desk knows the deployed layout.
Cockburn, Gutwin & Greenberg, CHI 2007, doi:10.1145/1240624.1240723 motivates
serial novice search, logarithmic expert decisions and practice transitions.
All numerical coefficients, square-root practice/age law, confidence threshold,
ordinal geometry, scent, fuel and preference weights are simulation assumptions.
-/
namespace Ehr.Sim.Bounded
open Ehr Lean
structure Placement where
  screen : String
  parent : String := ""
  tab : Nat := 0
  position : Nat := 0
  deriving BEq, Repr, ToJson, FromJson
structure MemoryEntry where
  key : String
  intent : String
  control : String
  place : Placement
  route : List Event := []
  exposures : Nat := 1
  lastDay : Nat
  deriving BEq, Repr, ToJson, FromJson
structure Memory where
  actor : String := ""
  entries : List MemoryEntry := []
  deriving BEq, Repr, ToJson, FromJson
structure Preference where
  tag : String
  nearTag : String
  weight : Nat := 1
  deriving BEq, Repr, ToJson, FromJson
structure HiddenPreferences where
  placements : List Preference := []
  /-- Per-mille change aversion; zero is neutral (simulation assumption). -/
  changeSensitivity : Nat := 0
  deriving BEq, Repr, ToJson, FromJson
structure Options where
  policy : String := "expert"
  hiddenPreferences : HiddenPreferences := {}
  deriving BEq, Repr, ToJson
instance : FromJson Options where
  fromJson? j := do
    let policy ← match j.getObjVal? "policy" with
      | .error _ => pure "expert"
      | .ok v => fromJson? v
    let prefs ← match j.getObjVal? "hiddenPreferences" with
      | .error _ => pure ({} : HiddenPreferences)
      | .ok v => fromJson? v
    return { policy, hiddenPreferences := prefs }
/-- Optional seeded preferences; simulation assumption, never a default. -/
def seededPreferences (seed : Nat) (actor : String) : HiddenPreferences :=
  let n := (random (taskSeed seed actor)).1.toNat
  {
    placements := [{ tag := "w1Orders.patientSidebar.allergyList", nearTag := "w1Orders.dose", weight := 1 + n % 3 }],
    changeSensitivity := 100 + n % 801
  }
def semanticKey (c : Component) : String := if c.tag.isEmpty then c.id else c.tag
def placement (ctx : Context) (s : State) (c : Component) : Placement :=
  {
    screen := s.screen,
    parent := c.parent?.getD "",
    tab := c.tab,
    position := (ctx.prog.compsOf s.screen).findIdx (·.id == c.id)
  }
def intentOf (c : Component) : String := match c.kind with
  | .field e _ _ => "field:" ++ e
  | .button (.commit cm) => "commit:" ++ cm
  | .button (.markReviewed i) => "review:" ++ i
  | _ => "nav:" ++ semanticKey c
/-- Strength ∝ sqrt(practice)/sqrt(1+age), fixed-point per mille.
Version changes do not refresh or erase memory. Decay is evaluated lazily. -/
def strength (day : Nat) (m : MemoryEntry) : Nat :=
  Nat.sqrt (m.exposures * 1000000 / (1 + (day - m.lastDay)))
def confident (day : Nat) (m : MemoryEntry) : Bool := strength day m ≥ 1400
def remember (memory : Memory) (day : Nat) (ctx : Context) (s : State)
    (c : Component) (route : List Event) : Memory :=
  let key := semanticKey c
  let place := placement ctx s c
  let exposures := match memory.entries.find? (·.key == key) with
    | some m => if m.place == place then m.exposures + 1 else 1
    | none => 1
  { memory with
    entries := { key, intent := intentOf c, control := c.id, place,       route, exposures, lastDay := day } :: memory.entries.filter (·.key != key)
  }
def intentions (ctx : Context) (s : State) : List String :=
  (ctx.goals.values.filter (fun g => !valueGoalMet ctx.sp ctx.facts ctx.user s g)).map
    (fun g => "field:" ++ g.element) ++
  (ctx.sp.reviews.filter (fun rq => ctx.goals.commits.contains rq.commit &&
    !s.commits.contains rq.commit && whenHolds ctx.facts s rq.when &&
    !reviewMet ctx.sp ctx.prog ctx.facts s rq)).map (fun rq => "review:" ++ rq.info) ++
  (ctx.goals.commits.filter (!s.commits.contains ·)).map ("commit:" ++ ·)
def tokens (s : String) : List String :=
  let chars := s.toList.flatMap fun c =>
    if c.isUpper then [' ', c.toLower] else [if c.isAlphanum then c else ' ']
  ((String.ofList chars).splitOn " ").filter (! ·.isEmpty)
/-- Pluggable boundary: goal text and one visible control, no Program access. -/
abbrev Scent := String → Component → Nat
def lexicalScent : Scent := fun goal c =>
  let words := tokens goal
  (tokens (c.label ++ " " ++ c.tag)).foldl (fun n w => n + if words.contains w then 1 else 0) 0
/-- No hidden-descendant relevance filtering. Tabs disclose their indices. -/
def visibleNavigation (ctx : Context) (s : State) : List Event :=
  (shown ctx s).flatMap fun c => match c.kind with
  | .button (.goto _) => [.click c.id]
  | .button .back => [.click c.id]
  | .button .newOrderLine => if canAdvance ctx s then [.click c.id] else []
  | .group true _ => if s.expanded.contains c.id then [] else [.click c.id]
  | .tabs => tabEvents (ctx.prog.compsOf s.screen) c
  | _ => []
structure Effort where
  task : String
  misses : Nat := 0
  searches : Nat := 0
  scannedItems : Nat := 0
  backtracks : Nat := 0
  helpRequests : Nat := 0
  /-- Synthetic ordinal units, not browser pixels (simulation assumption). -/
  mouseTravelUnits : Nat := 0
  cognitiveMs : Nat := 0
  deriving BEq, Repr, ToJson, FromJson
structure Observation where
  task : String
  traceIndex : Nat
  kind : String
  place : Placement
  scannedItems : Nat := 0
  ms : Nat := 0
  deriving BEq, Repr, ToJson, FromJson
structure HelpRequest where
  task : String
  traceIndex : Nat
  reason : String
  query : String
  targetScreen : String
  targetControl : String
  targetLabel : String
  labelMatch : Nat
  route : List Event
  deriving BEq, Repr, ToJson, FromJson
structure Runner where
  episode : EpisodeResult
  memory : Memory
  effort : Effort
  observations : List Observation := []
  route : List Event := []
  tried : List String := []
  visited : List String := []
  stack : List (State × List Event) := []
  recalled : List String := []
  pointer : Placement := { screen := "" }
  lastEpisode : Bool := true
  guide : Discovery.Guide := Discovery.helpDesk
  guided : List Event := []
  help : List HelpRequest := []
  helpFailed : Bool := false
  unsuccessful : Nat := 0
  seenScreens : List String := []
  scanned : List String := []
/-- 180 ms/item search; 150+150 ceil(log2(n+1)) ms recall plus a
practice^-1/2 term. Coefficients are simulation assumptions. -/
def decisionMs (items practice : Nat) : Nat :=
  150 + 150 * (Nat.log2 (items + 1) + 1) + 600 / max 1 (Nat.sqrt (practice * 100))
def observe (task : Task) (r : Runner) (kind : String) (p : Placement)
    (items ms : Nat) : Runner :=
  { r with
    episode := { r.episode with elapsedMs := r.episode.elapsedMs + ms },
    effort := { r.effort with
      cognitiveMs := r.effort.cognitiveMs + ms,
      scannedItems := r.effort.scannedItems + items,
      searches := r.effort.searches + if kind == "search" then 1 else 0
    },
    observations := r.observations ++ [{ task := task.id,       traceIndex := r.episode.trace.length, kind, place := p, scannedItems := items, ms }]
  }
/-- Visual working memory for an episode. Returning to a view or switching
one tab does not require rereading every unchanged label. Persistent location
practice still strengthens only on use. Cache behavior is a simulation assumption. -/
def scanKey (screen : String) (c : Component) : String := screen ++ ":" ++ semanticKey c

def visualScan (ctx : Context) (task : Task) (r : Runner) (target : Option Component := none) : Runner :=
  let cs := shown ctx r.episode.state
  let scanPrefix := match target with
    | none => cs
    | some c => cs.take (cs.findIdx (fun (x : Component) => x.id == c.id) + 1)
  let keys := scanPrefix.map (scanKey r.episode.state.screen)
  let unseen := keys.filter (!r.scanned.contains ·)
  let cached := target.any (fun c => r.scanned.contains (scanKey r.episode.state.screen c))
  let p := (target.map (placement ctx r.episode.state)).getD { screen := r.episode.state.screen }
  let out := observe task r (if cached then "recognition" else "search") p unseen.length
    (if cached then decisionMs cs.length 1 else 180 * unseen.length)
  { out with scanned := (keys ++ out.scanned).eraseDups }

def travel (a b : Placement) : Nat :=
  (if a.screen == b.screen then 0 else 400) +
  40 * (max a.position b.position - min a.position b.position)
/-- Ordinal travel for an ordinary trace, including shared directory controls.
Unknown workspace controls use position zero; this is a simulation assumption. -/
def traceTravel (prog : Program) (trace : List TraceEvent) : Nat :=
  (trace.foldl (fun (previous, total) t =>
    if !t.ops.contains .point then (previous, total) else
    let id := (eventComp t.event).getD ""
    let cs := prog.compsOf t.screen
    let p : Placement := { screen := t.screen, position := if cs.any (·.id == id) then cs.findIdx (·.id == id) else 0 }
    (p, total + travel previous p)) ({ screen := "" }, 0)).2


def act (ctx : Context) (params : PersonaParams) (task : Task) (r : Runner)
    (e : Event) (learn := true) : Runner := Id.run do
  let mut out := r
  let c? := (eventComp e).bind (shownComp? ctx.sp ctx.prog ctx.facts out.episode.state)
  let (ops, rng) := actionOps ctx params out.episode.state e out.episode.rng
  if let some c := c? then
    let p := placement ctx out.episode.state c
    if ops.contains .point then
      out := { out with
        pointer := p,
        effort := { out.effort with         mouseTravelUnits := out.effort.mouseTravelUnits + travel out.pointer p }
      }
    if learn then out := { out with memory := remember out.memory task.day ctx out.episode.state c out.route }
  out := { out with episode := { out.episode with rng } }
  out := { out with episode := scrollTo ctx task out.episode e }
  let goal := isGoalAction ctx out.episode.state e
  let flush := out.lastEpisode && ctx.done (ctx.next out.episode.state e)
  let due := if goal then out.episode.interruptions.filter (fun n => n ≤ out.episode.actionIndex || flush) else []
  out := { out with
    episode := { out.episode with
      interruptions := out.episode.interruptions.filter (!due.contains ·),
      actionIndex := out.episode.actionIndex + if goal then 1 else 0
    }
  }
  out := { out with
    episode := emit ctx task out.episode e     (List.replicate due.length [.wait, .think] |>.flatten |>.append ops)
  }
  return out
/-- Search remembers explored local views, not the Cartesian product of
unrelated tabs on every screen (simulation assumption). -/
def localKey (ctx : Context) (s : State) : String :=
  let ids := (ctx.prog.compsOf s.screen).map (·.id)
  encodeJson (s.screen, sortStrings (s.expanded.filter ids.contains),
    sortStrings ((s.tabSel.filter (fun x => ids.contains x.1)).map encodeJson), s.currentSlot)
def edgeKey (s : State) (e : Event) : String := navKey s ++ encodeJson e
/-- Text a clinician can type into search; internal intent keys are retained
only for scent/memory diagnostics, never charged as human query keystrokes. -/
def goalLabel (ctx : Context) (s : State) : String :=
  let intent := (intentions ctx s).head?.getD ""
  let label := if intent.startsWith "field:" then
      ((ctx.sp.element? (String.ofList (intent.toList.drop 6))).map (·.label)).getD ""
    else if intent.startsWith "review:" then
      ((ctx.sp.info? (String.ofList (intent.toList.drop 7))).map (·.label)).getD ""
    else if intent.startsWith "commit:" then
      ((ctx.sp.commit? (String.ofList (intent.toList.drop 7))).map (·.label)).getD ""
    else ""
  if label.isEmpty then "Find the next required control" else label

/-- Clinical vocabulary, not a layout map; simulation assumption. A layout can
use misleading labels and defeat it. Only the first unmet intention is scented. -/
def goalText (ctx : Context) (s : State) : String :=
  let intent := (intentions ctx s).head?.getD ""
  let extra := if intent.startsWith "field:refill" then "refill request review decision" else
    if intent == "field:chiefComplaint" || intent == "field:weight" then "rooming intake vitals" else
    if ["field:hpi", "field:ros"].contains intent then "history" else
    if ["field:exam", "field:assessmentPlan", "field:visitDiagnosis"].contains intent then "exam assessment" else
    if ["field:drug", "field:dose", "field:doseUnit", "field:route", "field:freq", "field:prn", "field:duration", "field:pharmacy"].contains intent then "orders medication composer" else ""
  let label := if intent.startsWith "field:" then
    ((ctx.sp.element? (String.ofList (intent.toList.drop 6))).map (·.label)).getD "" else ""
  intent ++ " " ++ label ++ " " ++ extra

def chooseNavigation (scent : Scent) (ctx : Context) (r : Runner) (workflow : String) : Option Event :=
  let s := r.episode.state
  let candidates := (visibleNavigation ctx s).filter fun e =>
    !r.tried.contains (edgeKey s e) && localKey ctx (ctx.next s e) != localKey ctx s &&
    !r.visited.contains (localKey ctx (ctx.next s e))
  let goal := goalText ctx s ++ " " ++ workflow
  let score := fun e => if r.unsuccessful ≥ Discovery.patience ctx.prog then
      if r.seenScreens.contains (ctx.next s e).screen then 0 else 1
    else ((eventComp e).bind (shownComp? ctx.sp ctx.prog ctx.facts s)).map
    (scent goal) |>.getD 0
  candidates.foldl (fun best e => match best with
    | none => some e
    | some b => if score e > score b then some e else best) none
/-- Caption-only diagnostic for the actual helped target, not the earlier
query's first unmet goal. A zero overlap is a lexical-model finding, not proof
that a human could not infer the caption's meaning. -/
def targetLabelMatch (ctx : Context) (c : Component) : Nat :=
  let clinicalLabel := match c.kind with
    | .field e _ _ => ((ctx.sp.element? e).map (·.label)).getD ""
    | .button (.commit cm) => ((ctx.sp.commit? cm).map (·.label)).getD ""
    | .button (.markReviewed i) => ((ctx.sp.info? i).map (·.label)).getD ""
    | _ => ""
  lexicalScent (intentOf c ++ " " ++ clinicalLabel) { c with tag := "" }

/-- Ask/search is observable and paid. Only this explicit provider boundary
can know hidden layout; no interpreter state is copied from its answer. One
waitMs (60 s) plus mentalMs is an uncalibrated simulation assumption for help,
in addition to actual search-box activation/typing and each guided UI event. -/
def askForHelp (ctx : Context) (params : PersonaParams) (task : Task)
    (r : Runner) (reason : String) : Runner := Id.run do
  let query := goalLabel ctx r.episode.state
  let mut out := r
  if searchShown ctx.sp ctx.prog ctx.facts out.episode.state then
    out := act ctx params task out (.search query) false
  out := observe task out "help" { screen := out.episode.state.screen } 0 (waitMs + mentalMs)
  out := { out with
    episode := { out.episode with state := { out.episode.state with clock := out.episode.elapsedMs / 100 } }
  }
  let path := out.guide ctx out.episode.state
  let endpoint := (path.getD []).foldl ctx.next out.episode.state
  let target := ((actions ctx endpoint).head?.bind eventComp).bind
    (shownComp? ctx.sp ctx.prog ctx.facts endpoint)
  let request : HelpRequest := {
    task := task.id,
    traceIndex := out.episode.trace.length,
    reason,
    query,
    targetScreen := endpoint.screen,
    targetControl := (target.map (·.id)).getD "",
    targetLabel := (target.map (·.label)).getD "",
    labelMatch := (target.map (targetLabelMatch ctx)).getD 0,
    route := path.getD []
  }
  out := { out with
    help := out.help ++ [request],
    guided := path.getD [],
    helpFailed := path.isNone,
    unsuccessful := 0,
    effort := { out.effort with helpRequests := out.effort.helpRequests + 1 }
  }
  return out

/-- Recall only previously experienced events; no current-layout replanning. -/
def recalledEvent (ctx : Context) (s : State) (m : MemoryEntry) : Option Event :=
  -- A visible navigation control to a remembered screen needs no exploration.
  -- This examines its declared destination, never that screen's contents.
  let direct := if s.screen == m.place.screen then none else
    (shown ctx s).findSome? fun c => match c.kind with
      | .button (.goto target) => if target == m.place.screen then some (.click c.id) else none
      | _ => none
  direct.orElse fun _ =>
    -- The end of an experienced route contains the final container/tab choices.
    -- Replaying its beginning would retrace earlier goals and punish practice.
    m.route.reverse.find? fun e =>
      ((eventComp e).bind (shownComp? ctx.sp ctx.prog ctx.facts s)).isSome &&
      navKey (ctx.next s e) != navKey s &&
      (match e with
      | .click id => match (shownComp? ctx.sp ctx.prog ctx.facts s id).map (fun (c : Component) => c.kind) with
        | some (.group true _) => !s.expanded.contains id
        | some (.button (.goto _)) => s.screen != m.place.screen
        | _ => true
      | _ => true)
/-- Backtracking uses interpreter events, never restoration of a saved state. -/
def reverseEvent (ctx : Context) (current prior : State) : Option Event :=
  if current.screen != prior.screen then
    (shown ctx current).findSome? fun c => match c.kind with
      | .button .back => some (.click c.id)
      | .button (.goto t) => if t == prior.screen then some (.click c.id) else none
      | _ => none
  else
    (shown ctx current).findSome? fun c => match c.kind with
      | .tabs =>
        let old := (prior.tabSel.lookup c.id).getD 0
        let now := (current.tabSel.lookup c.id).getD 0
        if old != now then some (.selectTab c.id old) else none
      | .group true _ => if current.expanded.contains c.id != prior.expanded.contains c.id then some (.click c.id) else none
      | _ => none
def loop (scent : Scent) (ctx : Context) (params : PersonaParams) (task : Task) : Nat → Runner → Runner
  | 0, r => { r with
    episode := { r.episode with
      complaints := r.episode.complaints ++ [task.id ++ ": bounded search fuel exhausted; incomplete"]
    }
  }
  | fuel + 1, r => Id.run do
    let r := { r with episode := { r.episode with state := { r.episode.state with clock := r.episode.elapsedMs / 100 } } }
    if ctx.done r.episode.state then return r
    let mut out := { r with episode := selectTaskPatient ctx task r.episode }
    let selectionTrace := out.episode.trace.drop r.episode.trace.length
    if !selectionTrace.isEmpty then
      out := { out with
        effort := { out.effort with mouseTravelUnits := out.effort.mouseTravelUnits + traceTravel ctx.prog selectionTrace }
      }
    let s := out.episode.state
    if s.screen != r.episode.state.screen then
      out := { out with stack := [], route := [] }
    out := { out with visited := (localKey ctx s) :: out.visited, seenScreens := s.screen :: out.seenScreens }
    if let some popup := s.popup? then
      return loop scent ctx params task fuel (act ctx params task out (.ack popup.1))
    if out.helpFailed then
      return { out with
        episode := { out.episode with
          complaints := out.episode.complaints ++
            [task.id ++ ": assistance found no reachable unmet goal; incomplete"]
        }
      }
    if let e :: rest := out.guided then
      -- Read and execute the instruction, including scrolling, ordinary pointer
      -- costs, and interpreter guards. The help service cannot mutate state.
      out := observe task out "guidance" { screen := s.screen } 0 mentalMs
      out := act ctx params task { out with guided := rest } e
      return loop scent ctx params task fuel { out with route := out.route ++ [e] }
    let available := (if params.reviewsAllergiesEarly then earlyReview ctx s else none).or (actions ctx s).head?
    let targetMemory := out.memory.entries.find? fun m =>
      (match available with
        | some e => ((eventComp e).bind (shownComp? ctx.sp ctx.prog ctx.facts s)).any (fun c => semanticKey c == m.key)
        | none => (intentions ctx s).head? == some m.intent) && confident task.day m && !out.recalled.contains m.key
    if let some m := targetMemory then
      let atPlace := (shown ctx s).find? fun c => placement ctx s c == m.place && semanticKey c == m.key
      if atPlace.isNone then
        if let some e := recalledEvent ctx s m then
          if !out.tried.contains (edgeKey s e) then
            out := { out with
              tried := edgeKey s e :: out.tried,
              stack := (s, out.route) :: out.stack,
              route := out.route ++ [e]
            }
            out := observe task out "recall-navigation" m.place 0 (decisionMs (shown ctx s).length m.exposures)
            return loop scent ctx params task fuel (act ctx params task out e false)
        -- Point at the old ordinal, then send a guaranteed-absent control ID
        -- through step. The annotation preserves the intended old location.
        let ghost := String.ofList (List.replicate (1 + (ctx.prog.screens.flatMap (·.components)).foldl (fun n c => max n c.id.length) 0) '#')
        out := observe task out "miss" m.place 0 450
        out := { out with
          effort := { out.effort with
            misses := out.effort.misses + 1,
            mouseTravelUnits := out.effort.mouseTravelUnits + travel out.pointer m.place
          },
          pointer := m.place,
          recalled := m.key :: out.recalled
        }
        out := { out with episode := emit ctx task out.episode (.click ghost) [.point, .click] }
        return loop scent ctx params task fuel out
    if let some e := available then
      if let some c := (eventComp e).bind (shownComp? ctx.sp ctx.prog ctx.facts s) then
        let p := placement ctx s c
        let memory := out.memory.entries.find? (fun m => m.key == semanticKey c && m.place == p && confident task.day m)
        match memory with
        | some m => out := observe task out "recall" p 0 (decisionMs (shown ctx s).length m.exposures)
        | none => out := visualScan ctx task out (some c)
      out := act ctx params task out e
      return loop scent ctx params task fuel { out with tried := [], visited := [], stack := [], recalled := [], unsuccessful := 0, seenScreens := [] }
    out := visualScan ctx task out
    if out.unsuccessful ≥ 2 * Discovery.patience ctx.prog then
      return loop scent ctx params task fuel (askForHelp ctx params task out "scent-and-systematic-stalled")
    if let some e := chooseNavigation scent ctx out (match task.workflow with | .W1 => "w1" | .W2 => "w2" | .W3 => "w3" | .W4 => "w4" | .W5 => "w5" | .W6 => "w6" | .W7 => "w7") then
      out := { out with
        tried := edgeKey s e :: out.tried,
        stack := (s, out.route) :: out.stack,
        unsuccessful := out.unsuccessful + 1
      }
      let next := act ctx params task out e
      return loop scent ctx params task fuel { next with route := out.route ++ [e] }
    match out.stack with
    | (prior, route) :: rest =>
      if let some e := reverseEvent ctx s prior then
        out := { out with
          stack := rest,
          unsuccessful := out.unsuccessful + 1,
          effort := { out.effort with backtracks := out.effort.backtracks + 1 }
        }
        out := observe task out "backtrack" { screen := prior.screen } 0 300
        let next := act ctx params task out e false
        return loop scent ctx params task fuel { next with route }
      -- A hidden toggle may differ after returning through another tab. Drop
      -- that obsolete frame and try the next experienced ancestor; never set
      -- interpreter state to the saved snapshot.
      return loop scent ctx params task fuel { out with stack := rest, route, unsuccessful := out.unsuccessful + 1 }
    | [] => return loop scent ctx params task fuel (askForHelp ctx params task out "visible-frontier-exhausted")
structure Gap where
  task : String
  clicks : Int
  scrolls : Int
  keystrokes : Int
  timeMs : Int
  mouseTravelUnits : Int
  deriving ToJson
structure Result extends DayResult where
  policy : String := "bounded"
  memory : Memory
  expert : DayResult
  effort : List Effort
  expertTravelUnits : List (String × Nat)
  learnability : List Gap
  observations : List Observation
  assistance : List HelpRequest
  deriving ToJson
/-- Explicit memory in/out prevents counterfactual evaluations training an actor. -/
def simulate (sp : Spec) (prog : Program) (params : PersonaParams) (schedule : DaySchedule)
    (factsFor : Task → Facts) (seed : Nat) (memory : Memory := {})
    (scent : Scent := lexicalScent) (guide : Discovery.Guide := Discovery.helpDesk) : Result := Id.run do
  let expert := Ehr.Sim.simulate sp prog params schedule factsFor seed
  let prog := if schedule.tasks.any (fun t => (factsFor t).patientDirectory?.isSome)
    then { prog with patientSelection? := some true } else prog
  let user : User := { id := prog.owner, role := params.role }
  let mut memory := { memory with actor := prog.owner }
  let mut day : DayResult := {
    day := schedule.day,
    persona := params.id,
    programVersion := prog.version,
    trace := [],
    tasks := [],
    floor := expert.floor,
    complaints := []
  }
  let mut efforts := []
  let mut observations := []
  let mut assistance := []
  let mut receipts : List (String × List Receipt) := []
  for task in schedule.tasks do
    let raw := factsFor task
    let raw := if Workspace.enabled prog && raw.patientDirectory?.isNone then
      { raw with
        sourcePatientId? := some task.patientId,
        patientDirectory? := some {
          patients := [{ id := task.patientId, name := raw.patientId, mrn := raw.patientId }],
          activities := []
        }
      } else raw
    let facts := { raw with now := task.startMin, receipts := raw.receipts ++ (receipts.lookup task.patientId).getD [] }
    let eps := taskEpisodes facts task
    let goals := eps.map fun ep => deriveGoals sp ep.facts user task.workflow ep.choices ep.orders ep.med?
    let n := goals.foldl (fun n g => n + g.values.length + g.waivers.length + g.commits.length) 0
    let (positions, rng) := interruptionPositions (taskSeed seed task.id) task.interruptions n
    let mut r : Runner := {
      episode := {
        state := default,
        trace := [],
        complaints := [],
        rng,
        interruptions := positions,
        actionIndex := 0,
        elapsedMs := 0,
        lastDevice := none
      },
      memory,
      guide,
      effort := { task := task.id }
    }
    let mut complete := !eps.isEmpty
    for ((ep, g), idx) in (eps.zip goals).zipIdx do
      let f := { ep.facts with receipts := facts.receipts ++ r.episode.state.receipts }
      let ctx : Context := { sp, prog, facts := f, user, goals := { g with values := g.values ++ g.waivers } }
      r := { r with
        lastEpisode := idx + 1 == eps.length,
        route := [],
        tried := [],
        visited := [],
        stack := [],
        recalled := [],
        guided := [],
        helpFailed := false,
        unsuccessful := 0,
        scanned := [],
        seenScreens := [],
        episode := { r.episode with
          state := {
            (if Workspace.enabled prog && idx == 0 then Workspace.init prog else           { init sp prog f user with patientContext? := r.episode.state.patientContext? }) with
            clock := r.episode.elapsedMs / 100
          },
          complaints := r.episode.complaints ++ g.problems.map (fun p => task.id ++ ": " ++ p)
        }
      }
      if ctx.goals.values.any (fun g => match g.value?, ctx.sp.element? g.element with
          | some v, some el => !valueSatisfies ctx.facts ctx.user el.kind v
          | _, none => true
          | none, some _ => false) then
        r := { r with
          episode := { r.episode with
            complaints := r.episode.complaints ++ [task.id ++ ": unrepresentable clinical choice; incomplete"]
          }
        }
      else
        r := loop scent ctx params task (Discovery.fuel ctx) r
      complete := complete && ctx.done r.episode.state
    receipts := (task.patientId, r.episode.state.receipts) :: receipts.filter (·.1 != task.patientId)
    memory := r.memory
    efforts := efforts ++ [r.effort]
    assistance := assistance ++ r.help.map (fun h => { h with traceIndex := day.trace.length + h.traceIndex })
    observations := observations ++ r.observations.map (fun o => { o with traceIndex := day.trace.length + o.traceIndex })
    day := { day with
      trace := day.trace ++ r.episode.trace,
      tasks := day.tasks ++ [{ metrics task.id r.episode.trace complete with
        klmDeciSec := r.episode.elapsedMs / 100,
        wallTimeMinutes? := some ((r.episode.elapsedMs + 59999) / 60000)
      }],
      complaints := (day.complaints ++ r.episode.complaints).eraseDups
    }
  let expertTravel := expert.tasks.map fun t =>
    (t.task, traceTravel prog (expert.trace.filter (·.task == t.task)))
  let gaps := day.tasks.map fun t =>
    let e := (expert.tasks.find? (·.task == t.task)).getD (emptyMetrics t.task)
    let travel := ((efforts.find? (·.task == t.task)).map (·.mouseTravelUnits)).getD 0
    {
      task := t.task,
      clicks := (t.clicks : Int) - e.clicks,
      scrolls := (t.scrolls : Int) - e.scrolls,
      keystrokes := (t.keystrokes : Int) - e.keystrokes,
      timeMs := ((t.klmDeciSec : Int) - e.klmDeciSec) * 100,
      mouseTravelUnits := (travel : Int) - (expertTravel.lookup t.task).getD 0 : Gap
    }
  return {
    toDayResult := day,
    memory,
    expert,
    effort := efforts,
    expertTravelUnits := expertTravel,
    learnability := gaps,
    observations,
    assistance
  }
structure RecentDay where
  usedTags : List String
  costMs : Nat
  deriving ToJson, FromJson
structure Rating where
  score : Int
  chooseAfter : Bool
  disruption : Nat
  deriving ToJson, FromJson
def programPlaces (p : Program) : List (String × Placement) :=
  p.screens.flatMap fun s => s.components.zipIdx |>.map fun (c, i) =>
    (semanticKey c, { screen := s.id, parent := c.parent?.getD "", tab := c.tab, position := i })
def preferenceCost (prefs : HiddenPreferences) (p : Program) : Nat :=
  prefs.placements.foldl (fun n pref => n + pref.weight *
    (match (programPlaces p).lookup pref.tag, (programPlaces p).lookup pref.nearTag with
    | some a, some b => travel a b
    | _, _ => 1000)) 0
/-- Pure tailoring boundary. Positive score chooses after; zero keeps before.
Recent use weights disruption. CostMs is reserved for a later fitted model. -/
def ratePrograms (prefs : HiddenPreferences) (before after : Program)
    (recent : List RecentDay) : Rating :=
  let moved := (programPlaces before).filter fun (key, place) => (programPlaces after).lookup key != some place
  let disruption := moved.foldl (fun n (key, _) => n + 1 + (recent.flatMap (·.usedTags)).count key) 0
  let score := (preferenceCost prefs before : Int) - preferenceCost prefs after - (prefs.changeSensitivity * disruption : Nat)
  { score, chooseAfter := score > 0, disruption }
/-- Signed first-k-day excess over a matched steady workload; retain negatives.
Callers must report completion and use matched task sets. -/
def relearningCost (firstDays steadyDays : List Nat) : Int :=
  if steadyDays.isEmpty then 0 else
  (firstDays.foldl (· + ·) 0 : Nat) -
    (firstDays.length * steadyDays.foldl (· + ·) 0 / steadyDays.length : Nat)
end Ehr.Sim.Bounded
