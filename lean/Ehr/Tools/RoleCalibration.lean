import Ehr.Cli.Sim

/-! Offline attempts use the actual wave-3 simulator, with fresh actor state
and independent behavioral/offered-work streams. Input/output data stay local. -/
namespace Ehr.Tools.RoleCalibration
open Ehr Ehr.Sim Lean

structure Attempt where
  seed : Nat
  arrivalSeed : Nat
  backtrackRate : Nat := 0
  keyboardShare : Nat := 80
  choiceLatencyMs : Nat := 0
  policy : String := "expert"
  deriving FromJson

structure Input where
  spec : String
  program : String
  persona : String
  schedule : String
  world : String
  attempts : List Attempt
  deriving FromJson

def run (i : Input) : IO Unit := do
  let root ← Cli.Sim.findRoot 12 (← IO.currentDir)
  let sp ← Cli.Sim.loadSpec root i.spec
  let prog ← Cli.Sim.readAs Program i.program
  let params ← Cli.Sim.readAs PersonaParams i.persona
  let schedule ← Cli.Sim.readAs DaySchedule i.schedule
  unless params.id == schedule.persona do throw (IO.userError "persona mismatch")
  unless schedule.tasks.length == 1 do throw (IO.userError "matched attempts require exactly one task")
  let clinical ← Cli.Sim.loadClinical root i.world schedule
  -- Source scripts begin with the patient chart open. Directory selection is
  -- outside this measured boundary; all patient clinical facts remain intact.
  let factsFor := fun (t : Task) =>
    { ((clinical.lookup t.id).map (·.1)).getD default with patientDirectory? := none, receipts := [] }
  for a in i.attempts do
    unless a.backtrackRate ≤ 1000 && a.keyboardShare ≤ 100 do
      throw (IO.userError "invalid behavior probability")
    unless ["expert", "bounded"].contains a.policy do throw (IO.userError "invalid policy")
    let params := { params with backtrackRate := a.backtrackRate, keyboardShare := a.keyboardShare }
    let config : Resumption.InterruptionConfig := {
      choiceLatencyMs := a.choiceLatencyMs, arrivalSeed? := some a.arrivalSeed,
      chartDisplay := fun t => ((clinical.lookup t.id).map (·.2)).getD Render.Display.empty }
    let day := if a.policy == "bounded" then
      (Bounded.simulate sp prog params schedule factsFor a.seed {} Bounded.lexicalScent Discovery.helpDesk none config).toDayResult
      else simulate sp prog params schedule factsFor a.seed config
    let task := day.tasks.head!
    let row := day.workload?.bind (fun w => w.timings.head?)
    IO.println (Json.mkObj [
      ("completed", toJson task.completed), ("clicks", toJson task.clicks),
      ("keys", toJson task.keystrokes), ("scrolls", toJson task.scrolls),
      ("mentalOps", toJson ((day.trace.flatMap (·.ops)).filter (· == .think)).length),
      ("activeMs", toJson (task.klmDeciSec * 100)),
      ("clocks", toJson (row.bind (·.clocks?))),
      ("taskMs", toJson ((day.trace.getLast?.map (·.t)).getD 0 * 100 - schedule.tasks.head!.startMin * 60000)),
      ("interruptions", toJson task.interruptions?),
      ("complaints", toJson day.complaints)]).compress

end Ehr.Tools.RoleCalibration

def main (args : List String) : IO UInt32 := do
  try
    let [file] := args | throw (IO.userError "usage: role-calibration INPUT.json")
    Ehr.Tools.RoleCalibration.run (← Ehr.Cli.Sim.readAs Ehr.Tools.RoleCalibration.Input file)
    return 0
  catch e => IO.eprintln s!"role-calibration: {e}"; return 1
