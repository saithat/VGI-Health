import Ehr.Cli.Sim

/- Replay environment reconstruction only. All clinical projection, episode
   goals, initialisation and transitions call the production interpreter. -/
open Ehr Ehr.Sim Lean

def main (args : List String) : IO UInt32 := do
  let [root, world, schedulePath, specPath, programPath, dayPath, output] := args
    | throw (IO.userError "root world schedule spec program recorded-day output")
  let schedule ← Ehr.Cli.Sim.readAs DaySchedule schedulePath
  let sp ← Ehr.Cli.Sim.readAs Spec specPath
  let prog ← Ehr.Cli.Sim.readAs Program programPath
  let day ← Ehr.Cli.Sim.readAs DayResult dayPath
  let rawFacts ← Ehr.Cli.Sim.loadFacts root world schedule
  let user : User := { id := prog.owner, role := prog.role }
  let mut receipts : List (String × List Receipt) := []
  let mut tasks : List Json := []
  for task in schedule.tasks do
    let raw := (rawFacts.lookup task.id).getD default
    let facts := { raw with
      now := task.startMin
      receipts := raw.receipts ++ (receipts.lookup task.patientId).getD [] }
    let eps := taskEpisodes facts task
    let trace := day.trace.filter (·.task == task.id)
    let mut remaining := trace
    let mut state : State := default
    let mut segments : List Json := []
    let mut offset := 0
    let mut divergence : Option Json := none
    for ep in eps do
      let f := { ep.facts with receipts := facts.receipts ++ state.receipts }
      let g := deriveGoals sp f user task.workflow ep.choices ep.orders ep.med?
      let ctx : Context := { sp, prog, facts := f, user, goals := { g with values := g.values ++ g.waivers } }
      state := { init sp prog f user with clock := state.clock }
      let initial := state
      let start := offset
      while !remaining.isEmpty && !ctx.done state do
        let some event := remaining.head? | break
        remaining := remaining.drop 1
        let before := { state with clock := event.t - task.startMin * 600 }
        let (after, result) := step sp prog f user .human before event.event
        if divergence.isNone && (before.screen != event.screen || result != event.result) then
          divergence := some (Json.mkObj [("eventIndex", toJson offset),
            ("expectedScreen", toJson event.screen), ("actualScreen", toJson before.screen),
            ("expectedResult", toJson event.result), ("actualResult", toJson result)])
        state := after
        offset := offset + 1
      segments := segments ++ [Json.mkObj [("start", toJson start), ("end", toJson offset),
        ("facts", toJson f), ("initialState", toJson initial), ("goalsMet", toJson (ctx.done state))]]
    if !remaining.isEmpty && divergence.isNone then
      divergence := some (Json.mkObj [("eventIndex", toJson offset), ("reason", toJson "unconsumed events after all clinical episodes")])
    receipts := (task.patientId, state.receipts) :: receipts.filter (·.1 != task.patientId)
    tasks := tasks ++ [Json.mkObj [("id", toJson task.id), ("segments", toJson segments),
      ("nativeMismatch", toJson divergence), ("eventsVerified", toJson offset)]]
  IO.FS.writeFile output (toJson tasks).compress
  return 0
