import Ehr.Cli.Sim

-- Export the simulator's actual first episode inputs; no clinical logic in JS.
def main (args : List String) : IO UInt32 := do
  match args with
  | [world, schedule] =>
    let root ← Ehr.Cli.Sim.findRoot 12 (← IO.currentDir)
    let sched ← Ehr.Cli.Sim.readAs Ehr.DaySchedule schedule
    let facts ← Ehr.Cli.Sim.loadFacts root world sched
    let some task := sched.tasks.head? | throw (IO.userError "empty schedule")
    let raw := (facts.lookup task.id).getD default
    let some episode := (Ehr.Sim.episodes raw task.workflow task.choices).head? |
      throw (IO.userError "no episode")
    IO.println (Lean.Json.mkObj [("facts", Lean.toJson episode.facts),
      ("choices", Lean.toJson episode.choices)]).compress
    return 0
  | _ => IO.eprintln "world-dir schedule.json"; return 1
