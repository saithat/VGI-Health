import Ehr.Cli.Sim

/- Benchmark adapter only: all search, goals, transitions and KLM operators come
from Ehr. No clinical semantics or checker logic is implemented here. -/
open Ehr Ehr.Sim Ehr.Cli.Sim Lean

structure Request where
  root : String
  world : String
  spec : String
  program : String
  task : Task
  fixedValues : List (String × Value) := []
  bound : Nat := 20000
  deriving FromJson

structure Effort where
  clicks : Nat := 0
  keystrokes : Nat := 0
  klmSeconds : Float := 0
  screens : Nat := 0
  requiredFields : Nat := 0
  popups : Nat := 0
  deriving ToJson

structure Answer where
  supported : Bool
  reason : String := ""
  metrics : Effort := {}
  floor : Effort := {}
  space : SearchSpace := .full
  keystrokeSpace : SearchSpace := .full
  exact : Bool := true
  path : List (List Event) := []
  keystrokePath : List (List Event) := []
  fixedElements : List String := []
  deriving ToJson

def measureRequest (r : Request) : IO Answer := do
  let sp ← loadSpec r.root r.spec
  let prog ← readAs Program r.program
  let schedule : DaySchedule := { day := r.task.day, persona := r.task.persona, load := "normal", tasks := [r.task] }
  let facts ← loadFacts r.root r.world schedule
  let f := { (facts.lookup r.task.id).getD default with now := r.task.startMin }
  let user : User := { id := prog.owner, role := prog.role }
  let eps := episodes f r.task.workflow r.task.choices
  let contexts := eps.map fun ep =>
    let g := deriveGoals sp ep.facts user r.task.workflow ep.choices ep.orders ep.med?
    let values := g.values.map fun v => match r.fixedValues.lookup v.element with
      | none => v
      | some value => { v with value? := some value }
    { sp, prog, facts := ep.facts, user, goals := { g with values } : Context }
  if contexts.isEmpty then throw (IO.userError s!"{r.task.id}: no episodes")
  let commits := (contexts.flatMap (·.goals.commits)).eraseDups
  if !commits.all (fun cm => (sp.commit? cm).any (·.roles.contains prog.role)) then
    return { supported := false, reason := "role cannot perform every commit of this representative task" }
  for ctx in contexts do
    for g in ctx.goals.values do
      if !(sp.element? g.element).any (fun el => valueSatisfies ctx.facts user el.kind (goalValue sp ctx.facts user g)) then
        throw (IO.userError s!"{r.task.id}: fixed value invalid for {g.element}")
  IO.eprintln s!"{r.task.id}: {contexts.length} episodes, search"
  let click ← ioExcept (optionExcept (jointMinimum contexts .clicks r.bound) s!"{r.task.id}: click search failed")
  IO.eprintln s!"{r.task.id}: clicks {click.cost}, key search"
  let keys ← ioExcept (optionExcept (jointMinimum contexts .keystrokes r.bound) s!"{r.task.id}: key search failed")
  IO.eprintln s!"{r.task.id}: keys {keys.cost}, replay"
  let mut state := taskInitial contexts
  let mut ops : List Op := []
  let mut screens := 1
  let mut entered : List (Nat × String × Nat) := []
  let mut popups := 0
  let params : PersonaParams := {
    id := r.task.persona
    role := prog.role
    keyboardShare := 100
    reviewsAllergiesEarly := false
    scansSidebar := false
    backtrackRate := 0
    searchWhenBuried := false
    overrideRate := 0 }
  for event in click.path do
    let ctx ← ioExcept (optionExcept (taskContext? contexts state) "missing episode")
    if !(taskMoves contexts click.space state).contains event then
      throw (IO.userError "minimum path is not an allowed interpreter transition")
    if let some e := event then
      ops := ops ++ (actionOps ctx params state.state e 0).1
      if let .ack _ := e then popups := popups + 1
      let comp := match e with | .enter c _ | .confirm c => some c | _ => none
      if let some id := comp then
        if let some c := shownComp? sp prog ctx.facts state.state id then
          if let .field el sl _ := c.kind then
            let slot := resolveSlot state.state sl
            if ctx.goals.values.any (fun g => g.element == el && (g.slot?.isNone || g.slot? == some slot)) then
              entered := (state.index, el, slot) :: entered
    let next := taskStep contexts state event
    if next.index != state.index || next.state.screen != state.state.screen then screens := screens + 1
    state := next
  if !taskDone contexts state then throw (IO.userError "minimum path did not complete")
  let mut fm := { emptyMetrics r.task.id with completed := true }
  let mut floorFields := 0
  for ctx in contexts do
    fm := addMetrics fm (floorMetrics r.task.id sp ctx.facts user ctx.goals)
    floorFields := floorFields + (ctx.goals.values.filter fun g => (sp.element? g.element).any fun el =>
      !(el.prefill == .autoLinked && !needsHuman el)).length
  return {
    supported := true,
    metrics := {
      clicks := click.cost, keystrokes := keys.cost, klmSeconds := (klmMs ops).toFloat / 1000,
      screens, requiredFields := entered.eraseDups.length, popups },
    floor := {
      clicks := fm.clicks, keystrokes := fm.keystrokes, klmSeconds := fm.klmDeciSec.toFloat / 10,
      screens := contexts.length, requiredFields := floorFields, popups := fm.popups },
    space := click.space, keystrokeSpace := keys.space,
    path := episodePaths click.path, keystrokePath := episodePaths keys.path,
    fixedElements := r.fixedValues.map (·.1) }

def main (args : List String) : IO UInt32 := do
  try
    let [file] := args | throw (IO.userError "usage: Measure request.json")
    let r ← readAs Request file
    IO.println (encodeJson (← measureRequest r))
    return 0
  catch e => IO.eprintln s!"complexity: {e}"; return 1
