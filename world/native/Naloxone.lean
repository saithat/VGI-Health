import Ehr.Cli.Sim
import Ehr.Examples.Tiny
import Ehr.Specs.V1

/-! Read-only world-generation evidence, using the simulator's actual FHIR
adapter, episode expansion and goal derivation. No parallel clinical rule. -/
namespace Ehr.Cli.Naloxone
open Lean Ehr Ehr.Sim Ehr.Cli.Sim

def taskEvidence (sp : Spec) (facts : Facts) (task : Task) : Json :=
  let user : User := { id := "world-generator", role := .physician }
  let episodes := taskEpisodes facts task
  let goals := episodes.map fun ep =>
    deriveGoals sp ep.facts user (episodeWorkflow task ep) ep.choices ep.orders ep.med?
  let lines := episodes.flatMap fun ep =>
    let values := ((List.range ep.orders.length).zip ep.orders).flatMap fun (slot, order) =>
      orderElements.filterMap fun element => (orderValue element order).map fun value =>
        { element, slot? := some slot, value? := some value, commit := "" : ValueGoal }
    let s := hypothetical ep.orders values
    (orderLines s).filterMap fun (slot, drug) =>
      if !naloxoneLine ep.facts s slot drug then none else
      some (Json.mkObj [("slot", toJson slot), ("drug", toJson drug),
        ("highMme", toJson (highMme s slot drug)),
        ("unknownMme", toJson ((lineDoseMgTenths? s slot).isNone ||
          (lineFreqPerDay? s slot).isNone || mmeFactor drug == 0))])
  Json.mkObj [("task", toJson task.id),
    ("required", toJson (goals.any fun g => g.values.any (·.element == "naloxoneOffer"))),
    ("response", toJson (facts.record.lookup "naloxoneOffer")),
    ("currentMedClasses", toJson facts.currentMedClasses), ("lines", toJson lines),
    ("documentation", toJson ((goals.flatMap fun g => g.values.filter fun v =>
      ["naloxoneOffer", "naloxoneEducation", "naloxoneEducationOutcome"].contains v.element).map
        fun v => (v.element, v.value?)))]

structure Request where
  spec : String
  schedule : String
  world : String
  deriving FromJson

def evidenceFor (root : System.FilePath) (request : Request) : IO (List Json) := do
  let sp ← loadSpec root request.spec
  let schedule ← readAs DaySchedule request.schedule
  let facts ← loadFacts root request.world schedule
  schedule.tasks.mapM fun task => do
    let f ← ioExcept (optionExcept (facts.lookup task.id) s!"missing facts: {task.id}")
    pure (taskEvidence sp f task)

def command (args : List String) : IO UInt32 := do
  try
    let root ← findRoot 12 (← IO.currentDir)
    if args == ["--batch"] then
      let input ← (← IO.getStdin).getLine
      let requests ← ioExcept (Json.parse input >>= fromJson? (α := List Request))
      IO.println (toJson (← requests.mapM (evidenceFor root))).compress
    else
      let fs ← ioExcept (parseFlags args)
      let request : Request := {
        spec := ← required fs "--spec"
        schedule := ← required fs "--schedule", world := ← required fs "--world" }
      IO.println (toJson (← evidenceFor root request)).compress
    return 0
  catch e => IO.eprintln s!"naloxone-tasks: {e}"; return 1

end Ehr.Cli.Naloxone


namespace Ehr.Sim.NaloxoneTests
open Ehr Ehr.Sim Ehr.Examples.Tiny

-- Explicit patient responses use the existing prescription and education
-- outcomes. Missing responses in frozen/custom inputs retain their diagnostic.
def naloxone (response : Option String) : Goals :=
  let f : Facts := { facts with
    currentMedClasses := ["benzodiazepine"]
    record := response.toList.map ("naloxoneOffer", ·) }
  let o : OrderChoice := {
    drug := "oxycodone", doseTenths := 50, unit := .mg
    route := "PO", freq := "q6h" }
  deriveGoals Specs.V1.specV1 f user .W1 { orders := [o] } [o] none

def documentation (response : Option String) (element : String) : Option Value :=
  ((naloxone response).values.find? (·.element == element)).bind (·.value?)

#guard documentation (some "accepted") "naloxoneOffer" == some (.code "prescribed")
#guard documentation (some "declined") "naloxoneOffer" == some (.code "offered-declined")
#guard documentation (some "accepted") "naloxoneEducation" == some (.flag true)
#guard (naloxone (some "accepted")).problems.all (!·.startsWith "naloxone response unspecified")
#guard (naloxone none).problems.contains "naloxone response unspecified; modeling offered-declined"

end Ehr.Sim.NaloxoneTests

def main (args : List String) : IO UInt32 := Ehr.Cli.Naloxone.command args
