import Ehr.Check.Deploy

/-!
# `ehr check` and `ehr deploy`

- `ehr check --spec <spec.json> --program <p.json> [--prev <p.json>] --canonical <c.json>`
  prints the verdict as JSON on stdout; exit code 0 if ok, 1 if not (2 on
  bad input).
- `ehr deploy --spec … --program … [--prev …] --canonical … --out <dir> [--time <iso>]`
  runs the same check and carries out `deployPlan`: writes
  `<dir>/<owner>/v<N>.json` and `v<N>.cert.json`, and, only if the verdict is
  ok, `current.json` and `current.cert.json`. Prints the certificate; exit
  code 0 if published, 1 if not.
-/

namespace Ehr.Cli

open Ehr Ehr.Check

/-- The value after `--name` in the arguments. -/
def flag (args : List String) (name : String) : Option String :=
  match args with
  | a :: v :: rest => if a == "--" ++ name then some v else flag (v :: rest) name
  | _ => none

/-- Read and decode a JSON file. -/
def readJson (α : Type) [Lean.FromJson α] (path : String) : IO α := do
  let text ← IO.FS.readFile path
  match decodeJson α text with
  | .ok x => return x
  | .error e => throw (IO.userError s!"{path}: {e}")

/-- The inputs shared by `check` and `deploy`. -/
structure Inputs where
  spec : Spec
  prog : Program
  prev : Option Program
  canonical : Program

/-- Read `--spec`, `--program`, `--prev` (optional), and `--canonical`. -/
def readInputs (args : List String) : IO Inputs := do
  let some sp := flag args "spec" | throw (IO.userError "missing --spec")
  let some pp := flag args "program" | throw (IO.userError "missing --program")
  let some cp := flag args "canonical" | throw (IO.userError "missing --canonical")
  let spec ← readJson Spec sp
  let prog ← readJson Program pp
  let canonical ← readJson Program cp
  let prev ← match flag args "prev" with
    | some p => some <$> readJson Program p
    | none => pure none
  return { spec, prog, prev, canonical }

/-- The current UTC time in ISO 8601 (from `date`), or `"unknown"`. -/
def nowIso : IO String := do
  try
    let out ← IO.Process.output { cmd := "date", args := #["-u", "+%Y-%m-%dT%H:%M:%SZ"] }
    if out.exitCode == 0 then return out.stdout.trimAscii.toString else return "unknown"
  catch _ => return "unknown"

/-- `ehr check …`. -/
def checkMain (args : List String) : IO UInt32 := do
  try
    let i ← readInputs args
    let v := check i.spec i.prev i.canonical i.prog
    IO.println (Lean.toJson v).pretty
    return if v == .ok then 0 else 1
  catch e =>
    IO.eprintln s!"error: {e}"
    return 2

/-- `ehr deploy …`. -/
def deployMain (args : List String) : IO UInt32 := do
  try
    let i ← readInputs args
    let some out := flag args "out" | throw (IO.userError "missing --out")
    let time ← match flag args "time" with
      | some t => pure t
      | none => nowIso
    let (v, writes) := deployPlan i.spec i.prev i.canonical i.prog time
    let dir : System.FilePath := System.FilePath.mk out / i.prog.owner
    IO.FS.createDirAll dir
    for w in writes do
      IO.FS.writeFile (dir / w.target.fileName) (w.content ++ "\n")
    IO.println (Lean.toJson (certificate i.spec i.prog v time)).pretty
    if v == .ok then
      IO.eprintln s!"published {dir / "current.json"} (version {i.prog.version})"
      return 0
    else
      IO.eprintln s!"not published: verdict is not ok (record written to {dir / Target.fileName (.versionCert i.prog.version)})"
      return 1
  catch e =>
    IO.eprintln s!"error: {e}"
    return 2

end Ehr.Cli
