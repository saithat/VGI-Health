import Ehr
import Ehr.Api
import Ehr.Cli.Check
import Ehr.Cli.Sim
import Ehr.Cli.Commit
import Ehr.Cli.Serve
import Ehr.Render.Cli

/-!
Native command-line entry point for interpreter, checker and simulator calls.
init, step and view exchange JSON; run-batch processes JSON-lines events.
Spec and CURES exports expose the same data used by the app's WASM API.
-/

open Ehr

/-- Read all of standard input. -/
def readStdin : IO String := do
  let stdin ← IO.getStdin
  let mut acc := ""
  repeat
    let line ← stdin.getLine
    if line.isEmpty then break
    acc := acc ++ line
  return acc

/-- Specs available to `spec-export`, by name. -/
def specRegistry : List (String × Spec) :=
  [("tiny", Examples.Tiny.spec), ("tiny-2", Examples.Tiny.specV2),
   ("v1", Specs.V1.specV1), ("v2", Specs.V2.specV2), ("v3", Specs.V3.specV3)]


/-- Usage text. -/
def usage : String :=
  "usage: ehr <command>\n" ++
  "  serve                    JSONL {id,op,input} -> {id,result|error}\n" ++
  "  init                     stdin InitInput  -> State\n" ++
  "  step                     stdin StepInput  -> StepOutput\n" ++
  "  commit-check             stdin Commit.Request -> accept/reject (no writes)\n" ++
  "  view                     stdin ViewInput  -> ScreenView\n" ++
  "  run-batch <file.jsonl>   BatchCase per line -> BatchStep per event (JSONL)\n" ++
  "  check --spec S --program P [--prev P0] --canonical C   -> Verdict (exit 0 ok, 1 not)\n" ++
  "  deploy --spec S --program P [--prev P0] --canonical C --out DIR [--time ISO]\n" ++
  "  spec-export <name>       spec JSON (names: " ++
    ", ".intercalate (specRegistry.map (·.1)) ++ ")\n" ++
  "  cures-exemptions-export  shared CURES exemption codes (JSON)"

/-- Decode stdin as `α`, apply `f`, and print the JSON result. -/
def stdinCommand (α β : Type) [Lean.FromJson α] [Lean.ToJson β] (f : α → β) : IO UInt32 := do
  match decodeJson α (← readStdin) with
  | .ok x => IO.println (encodeJson (f x)); return 0
  | .error e => IO.eprintln s!"error: {e}"; IO.println (errorJson e); return 1

/-- `ehr run-batch <file>`: run every case of a JSON-lines file. -/
def runBatch (path : System.FilePath) : IO UInt32 := do
  let lines ← IO.FS.lines path
  let mut failed := false
  let mut caseIdx := 0
  for line in lines do
    if line.trimAscii.isEmpty then continue
    match decodeJson BatchCase line with
    | .ok c =>
      for st in runBatchCase caseIdx c do
        IO.println (encodeJson st)
    | .error e =>
      failed := true
      IO.println (Lean.Json.mkObj [("case", Lean.toJson caseIdx), ("error", Lean.Json.str e)]).compress
    caseIdx := caseIdx + 1
  return if failed then 1 else 0

/-- Entry point. -/
def main (args : List String) : IO UInt32 := do
  match args with
  | "simulate" :: flags => Ehr.Cli.Sim.command "simulate" flags
  | "min-clicks" :: flags => Ehr.Cli.Sim.command "min-clicks" flags
  | "render-screens" :: rest => Render.Cli.run rest
  | ["render-ui"] => stdinCommand Render.RenderInput Render.UiScreen Render.runRenderUi
  | ["render"] => stdinCommand Render.RenderInput Render.PageNode Render.runRender
  | ["facts"] =>
    match decodeJson Render.Fhir.FactsInput (← readStdin) with
    | .error e => IO.eprintln e; IO.println (errorJson e); return 1
    | .ok i => match Render.Fhir.runFacts i with
      | .error e => IO.eprintln e; IO.println (errorJson e); return 1
      | .ok out => IO.println (encodeJson out); return 0
  | ["serve"] => Cli.Serve.run
  | ["init"] => stdinCommand InitInput State runInit
  | ["step"] => stdinCommand StepInput StepOutput runStep
  | ["commit-check"] => stdinCommand Commit.Request Commit.Decision Cli.Commit.run
  | ["view"] => stdinCommand ViewInput ScreenView runView
  | ["run-batch", file] => runBatch file
  | "check" :: rest => Ehr.Cli.checkMain rest
  | "deploy" :: rest => Ehr.Cli.deployMain rest
  | ["cures-exemptions-export"] =>
    IO.println (Lean.toJson Specs.V1.curesExemptionCodes).pretty; return 0
  | ["spec-export", name] =>
    match specRegistry.lookup name with
    | some sp => IO.println (Lean.toJson sp).pretty; return 0
    | none => IO.eprintln s!"unknown spec '{name}'\n{usage}"; return 1
  | _ => IO.eprintln usage; return (if args.isEmpty then 0 else 1)
