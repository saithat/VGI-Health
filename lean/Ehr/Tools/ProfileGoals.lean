import Ehr.Check.ProfileGoalsTests

namespace Ehr.Tools.ProfileGoals
open Ehr Ehr.Sim

/-- Compare workflow task commits only; catalog entry/review obligations are separate. -/
def checkWorld (root : System.FilePath) : IO UInt32 := do
  let core := Specs.V1.specForProfile .core
  let full := Specs.V1.specForProfile .full
  let world := root / "runs/world/1"
  let files := (← world.readDir).qsort (fun a b => a.fileName < b.fileName)
  let mut tasks := 0
  let mut w7 := 0
  let mut denials := 0
  let mut differences : List Lean.Json := []
  for file in files do
    if !file.fileName.startsWith "day-" || !file.fileName.endsWith ".json" then continue
    let raw ← IO.FS.readFile (world / file.fileName)
    let schedule : DaySchedule ← match Lean.Json.parse raw >>= Lean.fromJson? with
      | .ok value => pure value
      | .error reason => throw (IO.userError s!"{file.fileName}: {reason}")
    for task in schedule.tasks do
      tasks := tasks + 1
      if task.workflow == .W7 then
        w7 := w7 + 1
        if task.choices.refill? == some "deny" then denials := denials + 1
      let coreCommits := taskCommits core task.workflow task.choices
      let fullCommits := taskCommits full task.workflow task.choices
      if coreCommits != fullCommits then
        differences := differences ++ [Lean.Json.mkObj [
          ("task", Lean.toJson task.id), ("workflow", Lean.toJson task.workflow),
          ("core", Lean.toJson coreCommits), ("full", Lean.toJson fullCommits)]]
  if tasks == 0 then throw (IO.userError "world 1 has no tasks")
  let report := Lean.Json.mkObj [
    ("world", Lean.toJson "runs/world/1"), ("tasks", Lean.toJson tasks),
    ("w7Tasks", Lean.toJson w7), ("w7Denials", Lean.toJson denials),
    ("differences", Lean.toJson differences)]
  let text := report.pretty ++ "\n"
  IO.FS.writeFile (root / "lean/Ehr/Check/profile-goals-report.json") text
  IO.print text
  return if differences.isEmpty then 0 else 1
end Ehr.Tools.ProfileGoals

/-- Check every saved world-1 task with the actual simulator goal function. -/
def main (args : List String) : IO UInt32 := do
  if args.length > 1 then throw (IO.userError "usage: profile-goals [repo-root]")
  Ehr.Tools.ProfileGoals.checkWorld (args.headD "..")
