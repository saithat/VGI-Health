import Ehr.Sim.Policy
import Ehr.Sim.TaskMinimum
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

/-- Schedule fixture UUIDs and renderer wristband identifier tokens name the
same Patient. Validate either declared identity without rewriting parsed Facts. -/
def bundlePatientMatches (bundle : Json) (id : String) : Bool :=
  (bundleResourcesWithIds bundle).any fun r =>
    Render.Fhir.resourceType r == "Patient" &&
      (Render.Fhir.str r "id" == id || Render.Fhir.patientIdOf r == id)

/-- World clinical observations are structured FHIR, not note-section tags.
Pass their explicit coded values to goal derivation as named record facts. -/
def clinicalRecord (rs : List Json) : List (String × String) :=
  rs.filterMap fun r =>
    if Render.Fhir.resourceType r != "Observation" then none else
    let coding := Render.Fhir.codings (Render.Fhir.field r "code")
    match coding.find? (fun c => Render.Fhir.str c "system" == "urn:vgi:world:clinical") with
    | none => none
    | some c =>
      let value := Render.Fhir.firstCode (Render.Fhir.field r "valueCodeableConcept")
      if value.isEmpty then none else some (Render.Fhir.str c "code", value)

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
  if world.extension == some "json" && (← world.pathExists) then
    let j ← readJson world
    let inputs := if Render.Fhir.resourceType j == "Bundle" then [j] else
      (j.getArr?.toOption.getD #[]).toList
    for b in inputs do
      if Render.Fhir.resourceType b != "Bundle" then throw (IO.userError "expected a FHIR Bundle")
      match (bundleResourcesWithIds b).find? (Render.Fhir.resourceType · == "Patient") with
      | none => throw (IO.userError "FHIR Bundle has no Patient")
      | some patient =>
        let id := Render.Fhir.str patient "id"
        if (bundles.lookup id).isSome then throw (IO.userError s!"duplicate patient Bundle {id}; merge its resources first")
        bundles := (id, b) :: bundles
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
        let ctx : Render.FactsContext := { today := dateOf task.day, now := task.startMin, record := (clinicalRecord rs).reverse }
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
    if f.patientId != task.patientId && !(bundle.any (bundlePatientMatches · task.patientId)) then
      throw (IO.userError s!"{task.id}: patient ID mismatch")
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
  /-- Joint certificate for all task episodes in the declared space. -/
  exact : Bool
  episodeSpaces : List SearchSpace := []
  keystrokeEpisodeSpaces : List SearchSpace := []
  /-- Exactness is scoped; navigation/move restrictions are explicit. -/
  searchModel : String := "full: goal-relevant moves across reachable screens, no Back/scroll/search; goalDirected: first shown goal field then all non-entry moves; navigationDirected: ready goal actions or shortest BFS navigation; clock fixed; exact only within each reported space; joint episode search with receipt carry; reset edges only after episode completion"
  /-- Each W4 medication is a separate reset episode. -/
  episodePaths : List (List Event)
  keystrokeEpisodePaths : List (List Event)
  deriving ToJson

structure ScheduleMinimum where
  tasks : List TaskMinimum
  deriving ToJson

def minSchedule (sp : Spec) (prog : Program) (schedule : DaySchedule)
    (factsFor : Task → Facts) (bound : Nat) (space? : Option SearchSpace := none) : Except String ScheduleMinimum := do
  let user : User := { id := prog.owner, role := prog.role }
  let tasks ← schedule.tasks.mapM fun task => do
    let facts := { factsFor task with now := task.startMin }
    let eps := episodes facts task.workflow task.choices
    if eps.isEmpty then throw s!"{task.id}: no clinical episode is defined by the scenario"
    let contexts := eps.map fun ep =>
      let g := deriveGoals sp ep.facts user task.workflow ep.choices ep.orders ep.med?
      { sp, prog, facts := ep.facts, user, goals := g : Context }
    let click ← optionExcept (jointMinimum contexts .clicks bound space?)
      s!"{task.id}: joint click search exceeded bound or found no completion"
    let keys ← optionExcept (jointMinimum contexts .keystrokes bound space?)
      s!"{task.id}: joint keystroke search exceeded bound or found no completion"
    return {
      task := task.id, workflow := task.workflow, clicks := click.cost, keystrokes := keys.cost,
      path := click.path.filterMap id, keystrokePath := keys.path.filterMap id,
      space := click.space, keystrokeSpace := keys.space, exact := true,
      episodeSpaces := List.replicate eps.length click.space,
      keystrokeEpisodeSpaces := List.replicate eps.length keys.space,
      episodePaths := Ehr.Sim.episodePaths click.path, keystrokeEpisodePaths := Ehr.Sim.episodePaths keys.path }
  return { tasks }

/-- Shared command boundary, with errors on stderr and nonzero exit. -/
def command (mode : String) (args : List String) : IO UInt32 := do
  try
    let fs ← match parseFlags args with
      | .ok fs => pure fs | .error e => throw (IO.userError e)
    for (flag, _) in fs do
      if !["--spec", "--program", "--persona", "--schedule", "--task", "--world", "--fhir", "--seed", "--bound", "--space"].contains flag then
        throw (IO.userError s!"unknown flag {flag}")
    let root ← findRoot 12 (← IO.currentDir)
    let sp ← loadSpec root (← required fs "--spec")
    let prog ← readAs Program (← required fs "--program")
    let schedule ← match fs.lookup "--task" with
      | some path => do
        let task ← readAs Task path
        pure { day := task.day, persona := task.persona, load := "normal", tasks := [task] : DaySchedule }
      | none => readAs DaySchedule (← required fs "--schedule")
    if (fs.lookup "--task").isSome then
      if (fs.lookup "--schedule").isSome then throw (IO.userError "use --task or --schedule")
    if (schedule.tasks.map (·.id)).eraseDups.length != schedule.tasks.length then
      throw (IO.userError "schedule contains duplicate task IDs")
    if !schedule.tasks.all (fun t => t.day == schedule.day && t.persona == schedule.persona) then
      throw (IO.userError "task day/persona must match the schedule")
    if schedule.day < 1 || schedule.day > 10 then throw (IO.userError "schedule day must be 1..10")
    let world ← match (fs.lookup "--world").or (fs.lookup "--fhir") with
      | some p => pure (System.FilePath.mk p)
      | none => throw (IO.userError "missing --world")
    let facts ← loadFacts root world schedule
    let factsFor := fun task => (facts.lookup task.id).getD default
    if mode == "simulate" then
      let params ← readAs PersonaParams (← required fs "--persona")
      if params.id != schedule.persona then throw (IO.userError "persona does not match the schedule")
      let seedStr := (fs.lookup "--seed").getD "0"
      let seed ← ioExcept (optionExcept seedStr.toNat? "--seed must be a nonnegative integer")
      IO.println (encodeJson (simulate sp prog params schedule factsFor seed))
    else
      let bound ← ioExcept (optionExcept ((fs.lookup "--bound").getD "20000").toNat? "--bound must be a natural number")
      let space ← match (fs.lookup "--space").getD "auto" with
        | "auto" => pure none
        | "full" => pure (some SearchSpace.full)
        | "goalDirected" => pure (some SearchSpace.goalDirected)
        | "navigationDirected" => pure (some SearchSpace.navigationDirected)
        | other => throw (IO.userError s!"unknown --space {other}; use auto, full, goalDirected, navigationDirected")
      match minSchedule sp prog schedule factsFor bound space with
      | .error e => throw (IO.userError e)
      | .ok result =>
        if (fs.lookup "--task").isSome then
          if let some task := result.tasks.head? then IO.println (encodeJson task)
          else throw (IO.userError "no task result")
        else IO.println (encodeJson result)
    return 0
  catch e => IO.eprintln s!"{mode}: {e}"; return 1

end Ehr.Cli.Sim
