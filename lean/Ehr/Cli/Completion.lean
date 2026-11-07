import Ehr.Cli.Check
import Ehr.Check.CompletionScenario
import Ehr.Check.InteractionRules

/-! Scenario-scoped completion gate. This command deliberately does not issue
the ordinary deployment certificate: its supplied scenario class is narrower
than Props.Completable. -/
namespace Ehr.Cli.Completion
open Ehr Ehr.Sim Ehr.Check.CompletionModel Lean

deriving instance FromJson, ToJson for ValueGoal
deriving instance FromJson, ToJson for Information.Gate, Information.Authority,
  Information.Source, Information.Question, Information.Sample, Information.Need
deriving instance ToJson for Goals

/-- Missing fields use defaults; malformed present fields remain input errors. -/
def fieldOrDefault [FromJson α] (j : Json) (key : String) (fallback : α) : Except String α :=
  match j.getObjVal? key with
  | .error _ => .ok fallback
  | .ok value => fromJson? value

instance : FromJson Goals where
  fromJson? j := do
    return {
      informationNeeds := ← fieldOrDefault j "informationNeeds" []
      informationOffset := ← fieldOrDefault j "informationOffset" 0
      informationDisplay := ← fieldOrDefault j "informationDisplay" Render.Display.empty
      commits := ← j.getObjValAs? (List CommitId) "commits"
      values := ← j.getObjValAs? (List ValueGoal) "values"
      waivers := ← fieldOrDefault j "waivers" []
      expectedAcks := ← fieldOrDefault j "expectedAcks" []
      problems := ← fieldOrDefault j "problems" [] }

structure Scenario where
  id : String
  facts : Facts
  user : User
  goals : Goals
  space : String := "full"
  /-- When present, all safe interleavings of this exact alphabet are checked. -/
  events : Option (List Event) := none
  bound : Nat := 20000
  deriving ToJson

instance : FromJson Scenario where
  fromJson? j := do
    return {
      id := ← j.getObjValAs? String "id"
      facts := ← j.getObjValAs? Facts "facts"
      user := ← j.getObjValAs? User "user"
      goals := ← j.getObjValAs? Goals "goals"
      space := ← fieldOrDefault j "space" "full"
      events := ← fieldOrDefault j "events" none
      bound := ← fieldOrDefault j "bound" 20000 }

def movesFor (ctx : Context) (s : Scenario) : Except String (Moves ctx) :=
  match s.events with
  | some alphabet => .ok (alphabetMoves ctx alphabet)
  | none => match s.space with
    | "full" => .ok (planningMoves ctx .full)
    | "goalDirected" => .ok (planningMoves ctx .goalDirected)
    | "navigationDirected" => .ok (planningMoves ctx .navigationDirected)
    | _ => .error s!"{s.id}: unknown move space {s.space}"

def run (sp : Spec) (p : Program) (scenario : Scenario) : IO (Bool × Json) := do
  if !scenario.goals.informationNeeds.isEmpty then
    throw (IO.userError s!"{scenario.id}: information-needs lookup stages are outside this scenario graph")
  if scenario.user.role != p.role then throw (IO.userError s!"{scenario.id}: user/program roles differ")
  if scenario.goals.commits.isEmpty then throw (IO.userError s!"{scenario.id}: completion needs a nonempty commit goal")
  if !scenario.goals.problems.isEmpty then throw (IO.userError s!"{scenario.id}: unresolved goal problems")
  let ctx : Context := { sp, prog := p, facts := scenario.facts, user := scenario.user, goals := scenario.goals }
  let moves ← match movesFor ctx scenario with
    | .ok m => pure m
    | .error e => throw (IO.userError e)
  let start := init sp p ctx.facts ctx.user
  let before ← IO.monoMsNow
  let result := Ehr.Check.CompletionModel.check (scenarioGraph ctx moves) (forgetHistory start) scenario.bound
  let (ok, fields) := match result with
    | .accepted certificate states edges =>
      let alerts := edgesHold (scenarioGraph ctx moves) certificate (Ehr.Check.InteractionRules.interruptiveRule sp ctx.facts)
      let navigation := edgesHold (scenarioGraph ctx moves) certificate (Ehr.Check.InteractionRules.navigationRule sp p ctx.facts)
      let ok := alerts && navigation
      (ok, [("status", toJson (if ok then "accepted" else "interactionRejected")),
        ("states", toJson states), ("edges", toJson edges),
        ("interruptiveBeforeCommit", toJson alerts), ("navigationKeepsEntries", toJson navigation)])
    | .rejected stem _ states edges =>
      let trap := runAll sp p ctx.facts ctx.user .human start stem
      (false, [("status", toJson "rejected"), ("states", toJson states),
        ("edges", toJson edges), ("counterexample", toJson stem), ("trap", toJson trap)])
    | .unknown => (false, [("status", toJson "unknown")])
  let elapsed := (← IO.monoMsNow) - before
  let base := [("id", toJson scenario.id), ("elapsedMs", toJson elapsed),
    ("space", toJson (if scenario.events.isSome then "explicitAlphabet" else scenario.space)),
    ("bound", toJson scenario.bound)]
  return (ok, Json.mkObj (base ++ fields))

def command (args : List String) : IO UInt32 := do
  try
    let i ← Ehr.Cli.readInputs args
    let some path := Ehr.Cli.flag args "scenarios" | throw (IO.userError "missing --scenarios")
    let scenarios ← Ehr.Cli.readJson (List Scenario) path
    if scenarios.isEmpty then throw (IO.userError "at least one completion scenario is required")
    if !(scenarios.map (·.id)).Nodup then throw (IO.userError "completion scenario IDs must be unique")
    let staticVerdict := Ehr.Check.check i.spec i.prev i.canonical i.prog
    let mut passed := staticVerdict == .ok
    let mut results := []
    -- Preserve static-rule refusals; no expensive search on a rejected layout.
    if passed then
      for scenario in scenarios do
        let (ok, report) ← run i.spec i.prog scenario
        passed := passed && ok
        results := results ++ [report]
    IO.println (Json.mkObj [("accepted", toJson passed), ("staticVerdict", toJson staticVerdict),
      ("scope", toJson "fixed supplied records, users, goals and clocks; declared move spaces; history erasure only"),
      ("property6Closed", toJson false), ("scenarios", toJson results)]).pretty
    return if passed then 0 else 1
  catch e =>
    IO.eprintln s!"error: {e}"
    return 2

end Ehr.Cli.Completion
