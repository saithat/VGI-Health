import Ehr.Cli.Sim
import Ehr.Sim.FeatureTests

/-! Self-contained native adapter/CLI regressions; no archived worlds or node
dependencies. From lean/: lake env lean --run ../scripts/test-sim-cli.lean
Optional argument: horizon, minimum, note or legacy. Scratch files live under
TMPDIR. EHR_BIN selects the tested binary; EHR_CONTROL_BIN adds a legacy byte
comparison against a locally preserved pre-fix binary. -/
open Ehr Ehr.Sim Ehr.Sim.FeatureTests Lean

def check (ok : Bool) (message : String) : IO Unit :=
  unless ok do throw (IO.userError message)

def save [ToJson α] (dir : System.FilePath) (name : String) (value : α) : IO Unit :=
  IO.FS.writeFile (dir / name) (toJson value).compress

def native (args : Array String) (binary? : Option String := none) : IO String := do
  let cmd := (binary?.or (← IO.getEnv "EHR_BIN")).getD ".lake/build/bin/ehr"
  let output ← IO.Process.output {cmd, args}
  check (output.exitCode == 0) s!"native command failed: {output.stderr}"
  return output.stdout

def noteSpec : Spec := { fixtureSpec with
  elements := [field "hpi" .text],
  entries := [{commit := "signNote", element := "hpi"}],
  commits := fixtureSpec.commits ++ [{id := "signNote", label := "Sign", roles := [.physician]}] }
def noteProgram := fixtureProgram [input "hpi",
  {id := "sign", kind := .button (.commit "signNote")}]
def message : Task := { task with
  choices := { ackResult := true, noteSections := ["hpi"] },
  workflowPlan? := some {
    kind := .result, owner := "P1", delegateAccepted := true,
    phaseMs := 0, responseWaitMs := 0} }

def minimumTest (dir : System.FilePath) : IO Unit := do
  IO.FS.createDirAll (dir / "facts")
  save dir "spec.json" noteSpec
  save dir "program.json" noteProgram
  save (dir / "facts") (task.patientId ++ ".json") Ehr.Examples.Tiny.facts
  let run := fun (t : Task) => do
    save dir "task.json" t
    let output ← native #[
      "min-clicks", "--spec", (dir / "spec.json").toString,
      "--program", (dir / "program.json").toString, "--task", (dir / "task.json").toString,
      "--world", dir.toString, "--bound", "1000"]
    Ehr.Cli.Sim.ioExcept (Json.parse output)
  let planned ← run message
  check ((Ehr.Render.Fhir.arr planned "episodePaths").length == 2)
    "planned W2 exact minimum omitted the documentation episode"
  check ((Ehr.Render.Fhir.arr planned "keystrokeEpisodePaths").length == 2)
    "planned W2 keystroke minimum omitted the documentation episode"
  check ((planned.getObjValAs? Bool "exact").toOption == some true) "missing exact certificate"
  let path ← Ehr.Cli.Sim.ioExcept (planned.getObjValAs? (List Event) "path")
  check (path.contains (.click "sign")) "minimum did not sign the note"
  let historical ← run {message with workflowPlan? := none}
  check ((Ehr.Render.Fhir.arr historical "episodePaths").length == 1)
    "historical W2 episode count changed"
  let oldPath ← Ehr.Cli.Sim.ioExcept (historical.getObjValAs? (List Event) "path")
  check (!oldPath.contains (.click "sign")) "historical W2 acquired documentation"
  -- Notes without an acknowledgment still need a documentation minimum.
  let noteOnly ← run {message with choices := {noteSections := ["hpi"]}}
  let notePath ← Ehr.Cli.Sim.ioExcept (noteOnly.getObjValAs? (List Event) "path")
  check ((Ehr.Render.Fhir.arr noteOnly "episodePaths").length == 1 && notePath.contains (.click "sign"))
    "note-only planned inbox minimum omitted documentation"
  let refused ← try
    let _ ← run {message with workflowPlan? := some {message.workflowPlan?.get! with owner := "other"}}
    pure false
  catch _ => pure true
  check refused "minimum search certified a task with a different workflow owner"
  -- Sibling: taskChoices also resolves focused refills in older schedules.
  -- Previously these received an empty, zero-cost exact certificate.
  let refillSpec := {fixtureSpec with commits := [
    {id := "approveRefill", label := "Approve", roles := [.physician]}]}
  save dir "spec.json" refillSpec
  save dir "program.json" (fixtureProgram [{id := "approve", kind := .button (.commit "approveRefill")}])
  let patient ← Ehr.Cli.Sim.ioExcept (Json.parse
    r#"{"resourceType":"Bundle","entry":[{"resource":{"resourceType":"Patient","id":"p"}}]}"#)
  save dir "p.json" patient
  let request ← Ehr.Cli.Sim.ioExcept (Json.parse r##"{"resourceType":"Task","for":{"reference":"Patient/p"},
    "focus":{"reference":"#rx"},"contained":[{"resourceType":"MedicationRequest","id":"rx",
    "subject":{"reference":"Patient/p"},"medicationCodeableConcept":{"text":"warfarin"},
    "dosageInstruction":[{"route":{"text":"PO"},"timing":{"code":{"text":"daily"}},
    "doseAndRate":[{"doseQuantity":{"value":3,"unit":"mg"}}]}]}]}"##)
  let refill ← run {task with
    workflow := .W7, patientId := "p",
    choices := {refill? := some "approve"}, todayResources := [request]}
  check ((refill.getObjValAs? Nat "clicks").toOption == some 1)
    "focused historical refill still has a zero-click minimum"
  IO.println "PASS minimum: planned W2 documentation; historical W2 unchanged; focused refill corrected"

def noteTest (dir : System.FilePath) : IO Unit := do
  IO.FS.createDirAll (dir / "facts")
  save dir "spec.json" noteSpec
  save dir "program.json" noteProgram
  save dir "persona.json" params
  save (dir / "facts") (task.patientId ++ ".json") Ehr.Examples.Tiny.facts
  let text := String.ofList (List.replicate 2000 'x')
  let typed := {message with choices := {message.choices with noteTexts? := some [
    {id := "hpi", text, authoring? := some {origin := "copied", typedCharacters := 100, selections := 1}}]}}
  save dir "task.json" typed
  for policy in ["expert", "bounded"] do
    let output ← native #["simulate", "--spec", (dir / "spec.json").toString,
      "--program", (dir / "program.json").toString, "--task", (dir / "task.json").toString,
      "--persona", (dir / "persona.json").toString, "--world", dir.toString, "--seed", "7",
      "--policy", policy, "--interruptions", "fixedCost"]
    let day ← Ehr.Cli.Sim.ioExcept (decodeJson DayResult output)
    check (day.tasks.all (·.completed) && day.trace.any (fun e =>
      e.event == .enter "hpiField" (.text text))) s!"{policy} inbox typed a placeholder"
    check (day.trace.any (fun e => e.event == .enter "hpiField" (.text text) &&
      typedKeys e.event e.ops == 100)) s!"{policy} lost copied-note authoring effort"
    check (day.workload?.get!.timings.head!.clocks?.get!.readingMs == 100000)
      s!"{policy} did not charge the supplied section length once"
  IO.println "PASS note: expert/bounded enter 2000 characters, charge 100 copied edits and 100s reading"

def horizonTest (dir : System.FilePath) : IO Unit := do
  let bundle ← Ehr.Cli.Sim.ioExcept (Json.parse r#"{"resourceType":"Bundle","entry":[
    {"resource":{"resourceType":"Patient","id":"patient","name":[{"family":"Test"}]}},
    {"resource":{"resourceType":"Encounter","id":"stay","status":"in-progress","class":{"code":"IMP"},
      "subject":{"reference":"Patient/patient"},"period":{"start":"2026-11-07T07:00:00Z"}}},
    {"resource":{"resourceType":"MedicationRequest","id":"rx","status":"active",
      "subject":{"reference":"Patient/patient"},"encounter":{"reference":"Encounter/stay"},
      "medicationCodeableConcept":{"text":"atorvastatin"},"dosageInstruction":[{"timing":{
      "event":["2026-11-07T09:00:00Z","2026-11-08T09:00:00Z"]}}]}},
    {"resource":{"resourceType":"Observation","id":"weight1","status":"final","subject":{"reference":"Patient/patient"},
      "code":{"coding":[{"code":"29463-7"}]},"effectiveDateTime":"2026-11-07T08:00:00Z",
      "valueQuantity":{"value":72.5,"unit":"kg","code":"kg"}}},
    {"resource":{"resourceType":"Observation","id":"weight2","status":"final","subject":{"reference":"Patient/patient"},
      "code":{"coding":[{"code":"29463-7"}]},"effectiveDateTime":"2026-11-08T08:00:00Z",
      "valueQuantity":{"value":81,"unit":"kg","code":"kg"}}}] }"#)
  save dir "patient.json" bundle
  let first := {task with patientId := "patient"}
  let second := {first with id := "day2", day := 2, startMin := 1440}
  let schedule : DaySchedule := {
    day := 1, persona := "P1", load := "quiet", tasks := [first, second],
    sourceDates? := some [(1,"2026-11-07"),(2,"2026-11-08")]}
  let clinical ← Ehr.Cli.Sim.loadClinical (← IO.currentDir).parent.get! dir schedule
  check (clinical.map (fun row => row.2.1.weightToday?) == [some (725, .kg), some (810, .kg)])
    s!"horizon tasks did not receive their own source calendar date: {repr (clinical.map (fun row => row.2.1.weightToday?))}"
  check ((clinical.zip ["2026-11-07", "2026-11-08"]).all fun (row, date) =>
    let fields := ((row.2.1.infoPayloads?.getD []).filter (·.info == "marSchedule")).flatMap
      (fun payload => payload.rows.flatMap (·.fields))
    fields.any (fun (key, _) => key.startsWith date) &&
    !(fields.any (fun (key, _) => key.startsWith "2026-11-" && !key.startsWith date)))
    "selected-day MAR columns did not follow the task date"
  -- Exercise the command boundary as well as the adapter: the second task
  -- must enter its own day's measured weight through the ordinary interpreter.
  let weightSpec := { fixtureSpec with
    elements := [field "weight" (.quantity .kg)],
    entries := [{commit := "ackResult", element := "weight"}] }
  save dir "weight-spec.json" weightSpec
  save dir "weight-program.json" (fixtureProgram [input "weight"])
  save dir "schedule.json" schedule
  save dir "persona.json" params
  let output ← native #["simulate", "--spec", (dir / "weight-spec.json").toString,
    "--program", (dir / "weight-program.json").toString, "--schedule", (dir / "schedule.json").toString,
    "--persona", (dir / "persona.json").toString, "--world", dir.toString,
    "--seed", "7", "--interruptions", "fixedCost"]
  let day ← Ehr.Cli.Sim.ioExcept (decodeJson DayResult output)
  check (day.tasks.all (·.completed) && day.trace.any (fun e =>
    e.task == second.id && e.event == .enter "weightField" (.qty 810 .kg)))
    "native horizon simulation did not enter day 2's weight"
  -- Without explicit source dates the historical workday fallback is task-local.
  save dir "patient.json" (Json.parse (bundle.compress.replace "2026-11-07" "2026-11-02" |>.replace "2026-11-08" "2026-11-03")).toOption.get!
  let fallback ← Ehr.Cli.Sim.loadClinical (← IO.currentDir).parent.get! dir {schedule with sourceDates? := none}
  check (fallback.map (fun row => row.2.1.weightToday?) == [some (725, .kg), some (810, .kg)])
    "task-local fallback calendar changed"
  IO.println "PASS horizon: per-task source dates and historical task-date fallback"

def legacyTest (dir : System.FilePath) : IO Unit := do
  IO.FS.createDirAll (dir / "facts")
  save dir "spec.json" noteSpec
  save dir "program.json" noteProgram
  save dir "persona.json" params
  save (dir / "facts") (task.patientId ++ ".json") Ehr.Examples.Tiny.facts
  let mut outputs : List String := []
  for workflow in [Ehr.Workflow.W1, .W2] do
    let historical := {message with workflow, workflowPlan? := none}
    save dir "schedule.json" ({day := 1, persona := "P1", load := "quiet", tasks := [historical]} : DaySchedule)
    for policy in ["expert", "bounded"] do
      let args := #["simulate", "--spec", (dir / "spec.json").toString,
        "--program", (dir / "program.json").toString, "--schedule", (dir / "schedule.json").toString,
        "--persona", (dir / "persona.json").toString, "--world", dir.toString, "--seed", "7",
        "--policy", policy, "--sim-model", "legacy", "--text-cost", "legacy",
        "--clock-mode", "legacy", "--interruptions", "fixedCost"]
      let output ← native args
      outputs := outputs ++ [output]
      if let some control ← IO.getEnv "EHR_CONTROL_BIN" then
        check (output == (← native args (some control))) s!"legacy bytes changed: {repr workflow} / {policy}"
  save dir "legacy-current.json" outputs
  IO.println "PASS legacy: W1/W2 expert/bounded controls (byte comparison when EHR_CONTROL_BIN is set)"

def main (args : List String) : IO Unit := do
  let scratch ← IO.getEnv "TMPDIR"
  let scratch ← Ehr.Cli.Sim.ioExcept (Ehr.Cli.Sim.optionExcept scratch "set disk-backed TMPDIR")
  let dir := System.FilePath.mk scratch / "vgi-sim-cli-tests"
  for (name, test) in [("horizon", horizonTest), ("minimum", minimumTest),
      ("note", noteTest), ("legacy", legacyTest)] do
    if args.isEmpty || args == [name] then
      let target := dir / name
      IO.FS.createDirAll target
      test target
