import Ehr.Sim.Policy
import Ehr.Sim.MinClicks
import Ehr.Render.Fhir

/-!
Adapter contract: `simulate --spec VERSION --program FILE --persona FILE
--schedule FILE --world DIR --seed N` prints DayResult; `min-clicks --spec
VERSION --program FILE --schedule FILE --world DIR` prints `{tasks:[...]}`.
VERSION resolves to releases/VERSION/spec.json; explicit JSON paths also work.
World manifests may point at fixture indices. Patient bundles are merged with
resources up to the task, by (resourceType,id), before render's FHIR parser.
Precomputed patient Facts JSON is a fallback only, never preferred over FHIR.
-/
namespace Ehr.Cli.Sim
open Ehr Ehr.Sim Lean

def optionExcept (o : Option α) (err : String) : Except String α :=
  match o with | some x => .ok x | none => .error err

def ioExcept (e : Except String α) : IO α :=
  match e with | .ok x => pure x | .error e => throw (IO.userError e)

abbrev Flags := List (String × String)

def parseFlags : List String → Except String Flags
  | [] => .ok []
  | k :: v :: rest => do
    if !k.startsWith "--" then throw s!"expected --flag, got {k}"
    let tail ← parseFlags rest
    if tail.any (·.1 == k) then throw s!"duplicate {k}"
    return (k, v) :: tail
  | [k] => .error s!"missing value for {k}"

def required (fs : Flags) (k : String) : IO String :=
  match fs.lookup k with | some v => pure v | none => throw (IO.userError s!"missing {k}")

def readJson (p : System.FilePath) : IO Json := do
  match Json.parse (← IO.FS.readFile p) with
  | .ok j => return j
  | .error e => throw (IO.userError s!"{p}: {e}")

def readAs (α : Type) [FromJson α] (p : System.FilePath) : IO α := do
  match fromJson? (← readJson p) with
  | .ok a => return a
  | .error e => throw (IO.userError s!"{p}: {e}")

def findRoot : Nat → System.FilePath → IO System.FilePath
  | 0, p => throw (IO.userError s!"cannot locate repository root from {p}")
  | n + 1, p => do
    if ← (p / "lean" / "lakefile.toml").pathExists then return p
    findRoot n (p.parent.getD p)

def loadSpec (root : System.FilePath) (ver : String) : IO Spec := do
  let direct : System.FilePath := ver
  let p := if ver.endsWith ".json" then direct else root / "releases" / ver / "spec.json"
  readAs Spec p

/-- Simulation workdays start Monday 2026-11-02, skipping weekends. -/
def dateOf (day : Nat) : String :=
  let n := day - 1
  let offset := n / 5 * 7 + n % 5
  -- The hackathon's ten workdays fit in November; reject longer schedules in CLI.
  let d := 2 + offset
  s!"2026-11-{if d < 10 then "0" else ""}{d}"

def mergeResources (base extra : List Json) : List Json :=
  extra.foldl (fun rs r =>
    let rt := Render.Fhir.resourceType r
    let id := Render.Fhir.str r "id"
    (if id.isEmpty then rs else rs.filter fun x =>
      Render.Fhir.resourceType x != rt || Render.Fhir.str x "id" != id) ++ [r]) base

/-- Synthea transaction bundles identify resources by fullUrl, before server
assignment of resource.id. Materialize that declared UUID before parsing. -/
def bundleResourcesWithIds (bundle : Json) : List Json :=
  (Render.Fhir.arr bundle "entry").map fun entry =>
    let r := Render.Fhir.field entry "resource"
    let url := Render.Fhir.str entry "fullUrl"
    if (Render.Fhir.str r "id").isEmpty && url.startsWith "urn:uuid:" then
      r.setObjVal! "id" (.str (String.ofList (url.toList.drop 9)))
    else r

/-- Fixture index path from the world manifest, or an index supplied directly. -/
def fixtureIndex (root world : System.FilePath) : IO (Option System.FilePath) := do
  if world.extension == some "json" then return some world
  let manifest := world / "manifest.json"
  if ← manifest.pathExists then
    let j ← readJson manifest
    let path := Render.Fhir.str (Render.Fhir.field j "fixtures") "index"
    if !path.isEmpty then
      let p : System.FilePath := path
      return some (if p.isAbsolute then p else root / p)
  if ← (world / "index.json").pathExists then return some (world / "index.json")
  return none

/-- Per-task Facts, with patient bundles read once. Additional resources never
leak backward from later tasks in the schedule. Missing patients are errors. -/
def loadFacts (root world : System.FilePath) (schedule : DaySchedule) : IO (List (String × Facts)) := do
  let index ← fixtureIndex root world
  let mut paths : List (String × System.FilePath) := []
  if let some p := index then
    let j ← readJson p
    paths := (Render.Fhir.arr j "patients").map fun patient =>
      (Render.Fhir.str patient "id", p.parent.getD root / Render.Fhir.str patient "file")
  let mut bundles : List (String × Json) := []
  let mut extras : List (String × List Json) := []
  let mut out := []
  for task in schedule.tasks do
    let prior := (extras.lookup task.patientId).getD []
    let today := mergeResources prior task.todayResources
    extras := (task.patientId, today) :: extras.filter (·.1 != task.patientId)
    let direct := world / s!"{task.patientId}.json"
    let bundlePath := (paths.lookup task.patientId).getD direct
    let mut bundle := bundles.lookup task.patientId
    if bundle.isNone && (← bundlePath.pathExists) then
      let j ← readJson bundlePath
      if Render.Fhir.resourceType j == "Bundle" then
        bundle := some j
        bundles := (task.patientId, j) :: bundles
    let f ← match bundle with
      | some b => do
        let rs := mergeResources (bundleResourcesWithIds b) today
        let merged := Json.mkObj [("resourceType", .str "Bundle"),
          ("entry", toJson (rs.map fun r => Json.mkObj [("resource", r)]))]
        let ctx : Render.FactsContext := { today := dateOf task.day, now := task.startMin }
        match Render.Fhir.parseBundle ctx merged with
        | .error e => throw (IO.userError s!"{task.id}: FHIR facts: {e}")
        | .ok (f, _) => pure f
      | none => do
        let fallback := world / "facts" / s!"{task.patientId}.json"
        let p := if ← fallback.pathExists then fallback else direct
        if !(← p.pathExists) then throw (IO.userError s!"{task.id}: no FHIR bundle or precomputed Facts for {task.patientId}")
        let f ← readAs Facts p
        if !task.todayResources.isEmpty then
          throw (IO.userError s!"{task.id}: precomputed Facts cannot merge todayResources; supply a FHIR bundle")
        pure f
    if f.patientId != task.patientId then throw (IO.userError s!"{task.id}: patient ID mismatch")
    out := out ++ [(task.id, f)]
  return out

structure TaskMinimum where
  task : String
  workflow : Workflow
  clicks : Nat
  keystrokes : Nat
  path : List Event
  keystrokePath : List Event
  space : SearchSpace
  keystrokeSpace : SearchSpace
  exact : Bool
  /-- Each W4 medication is a separate reset episode. -/
  episodePaths : List (List Event)
  keystrokeEpisodePaths : List (List Event)
  deriving ToJson

structure ScheduleMinimum where
  tasks : List TaskMinimum
  deriving ToJson

def minSchedule (sp : Spec) (prog : Program) (schedule : DaySchedule)
    (factsFor : Task → Facts) (bound : Nat) : Except String ScheduleMinimum := do
  let user : User := { id := prog.owner, role := prog.role }
  let tasks ← schedule.tasks.mapM fun task => do
    let facts := { factsFor task with now := task.startMin }
    let mut result : TaskMinimum := {
      task := task.id, workflow := task.workflow,
      clicks := 0, keystrokes := 0, path := [], keystrokePath := [], space := .full,
      keystrokeSpace := .full, exact := true, episodePaths := [], keystrokeEpisodePaths := [] }
    for (f, orders, med) in episodes facts task.workflow task.choices do
      let g := deriveGoals sp f user task.workflow task.choices orders med
      let ctx : Context := { sp, prog, facts := f, user, goals := g }
      let start := init sp prog f user
      let click ← optionExcept (minimum ctx .clicks start bound) s!"{task.id}: click search exceeded bound or found no completion"
      let keys ← optionExcept (minimum ctx .keystrokes start bound) s!"{task.id}: keystroke search exceeded bound or found no completion"
      result := { result with
        clicks := result.clicks + click.cost
        keystrokes := result.keystrokes + keys.cost
        path := result.path ++ click.path
        keystrokePath := result.keystrokePath ++ keys.path
        space := if click.space == .goalDirected then .goalDirected else result.space
        keystrokeSpace := if keys.space == .goalDirected then .goalDirected else result.keystrokeSpace
        episodePaths := result.episodePaths ++ [click.path]
        keystrokeEpisodePaths := result.keystrokeEpisodePaths ++ [keys.path] }
    return result
  return { tasks }

/-- Shared command boundary, with errors on stderr and nonzero exit. -/
def command (mode : String) (args : List String) : IO UInt32 := do
  try
    let fs ← match parseFlags args with
      | .ok fs => pure fs | .error e => throw (IO.userError e)
    for (flag, _) in fs do
      if !["--spec", "--program", "--persona", "--schedule", "--world", "--fhir", "--seed", "--bound"].contains flag then
        throw (IO.userError s!"unknown flag {flag}")
    let root ← findRoot 12 (← IO.currentDir)
    let sp ← loadSpec root (← required fs "--spec")
    let prog ← readAs Program (← required fs "--program")
    let schedule ← readAs DaySchedule (← required fs "--schedule")
    if schedule.day < 1 || schedule.day > 10 then throw (IO.userError "schedule day must be 1..10")
    let world ← match (fs.lookup "--world").or (fs.lookup "--fhir") with
      | some p => pure (System.FilePath.mk p)
      | none => throw (IO.userError "missing --world")
    let facts ← loadFacts root world schedule
    let factsFor := fun task => (facts.lookup task.id).getD default
    if mode == "simulate" then
      let params ← readAs PersonaParams (← required fs "--persona")
      let seedStr := (fs.lookup "--seed").getD "0"
      let seed ← ioExcept (optionExcept seedStr.toNat? "--seed must be a nonnegative integer")
      IO.println (encodeJson (simulate sp prog params schedule factsFor seed))
    else
      let bound ← ioExcept (optionExcept ((fs.lookup "--bound").getD "20000").toNat? "--bound must be a natural number")
      match minSchedule sp prog schedule factsFor bound with
      | .error e => throw (IO.userError e)
      | .ok result => IO.println (encodeJson result)
    return 0
  catch e => IO.eprintln s!"{mode}: {e}"; return 1

end Ehr.Cli.Sim
