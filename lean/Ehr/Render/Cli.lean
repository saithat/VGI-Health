import Ehr.Render.Api
import Ehr.Specs.V1
import Ehr.Canonical.Program
import Ehr.Examples.Tiny

namespace Ehr.Render.Cli
open Lean

def usage : String :=
  "ehr render-screens --spec <spec.json|v1|tiny> --program <program.json|canonical|tiny> " ++
  "--fhir <bundle.json> [--user <user.json>] [--today YYYY-MM-DD] [--context <context.json>] --out <dir>"

def options : List String → Except String (List (String × String))
  | [] => .ok []
  | key :: value :: rest => do
    if !["--spec", "--program", "--fhir", "--user", "--today", "--context", "--out"].contains key then
      throw s!"unknown option {key}"
    return (key, value) :: (← options rest)
  | _ => .error usage

def readJson (α : Type) [FromJson α] (path : String) : IO α := do
  match decodeJson α (← IO.FS.readFile path) with
  | .ok x => return x
  | .error e => throw (IO.userError s!"{path}: {e}")

/-- Safe single filename segment, independent of program-supplied screen ids. -/
def fileName (s : String) : String :=
  String.ofList (s.toList.map fun c => if c.isAlphanum || c == '-' || c == '_' then c else '_')

/-- Representative screens use real init/goTo prefills, every group open, each
individual group opened from initial, each tab, and each firing interruptive
alert. Alert probes include possible formulary order lines and an out-of-range
dose, but are emitted only when the actual interpreter computes an alert key. -/
def variants (sp : Spec) (prog : Program) (facts : Facts) (user : User) (sc : Screen) : List (String × State) := Id.run do
  let initial := (goTo sp prog facts (init sp prog facts user) sc.id).1
  let groups := sc.components.filterMap fun c => match c.kind with | .group true _ => some c.id | _ => none
  let expanded := { initial with expanded := (groups ++ initial.expanded).eraseDups }
  let mut states := [("", initial), ("expanded", expanded)]
  for g in groups do
    states := states ++ [("group-" ++ fileName g, { initial with expanded := (g :: initial.expanded).eraseDups })]
  -- Expand tab combinations so nested tabs are visible in their parent's tab.
  let mut tabStates := [expanded]
  for c in sc.components do
    if c.kind == .tabs then
      let indices := (sc.components.filter (·.parent? == some c.id)).map (·.tab) |>.eraseDups
      let next := tabStates.flatMap fun s => indices.map fun n =>
        { s with tabSel := (c.id, n) :: s.tabSel.filter (·.1 != c.id) }
      if !next.isEmpty then tabStates := next
  for (s, n) in tabStates.zipIdx do states := states ++ [(s!"tabs-{n}", s)]
  let probes := expanded :: formulary.map fun d =>
    { expanded with captured :=
      [{ element := drugElement, slot := 0, value := .code d.name, byHuman := true, confirmed := true },
       { element := doseElement, slot := 0, value := .qty 999999 .mg, byHuman := true, confirmed := true }] ++ expanded.captured }
  for a in sp.alerts do
    if a.tier == .interruptive then
      match probes.find? (fun s => !(alertKeys facts s a.cond).isEmpty) with
      | none => pure ()
      | some s =>
        let key := (alertKeys facts s a.cond).headD ""
        states := states ++ [("popup-" ++ fileName a.id, { s with popup? := some (a.id, key) })]
  return states

/-- Prefer an explicit date; otherwise read the fixture directory's index.
Never substitute the host clock for a fixture's reference date. -/
def fixtureDate (path : System.FilePath) : IO String := do
  let index := path.parent.getD "." / "index.json"
  if ← index.pathExists then
    let j ← readJson Json index.toString
    let date := Fhir.str j "referenceDate"
    if date != "" then return date
  throw (IO.userError "supply --today YYYY-MM-DD or a --context file; fixture index has no referenceDate")

def run (args : List String) : IO UInt32 := do
  try
    let opts ← match options args with
      | .ok o => pure o
      | .error e => throw (IO.userError e)
    let required (k : String) : IO String :=
      match opts.lookup k with
      | some s => pure s
      | none => throw (IO.userError s!"missing {k}\n{usage}")
    let specPath ← required "--spec"
    let progPath ← required "--program"
    let bundlePath ← required "--fhir"
    let dir : System.FilePath := ← required "--out"
    let sp ← match specPath with
      | "v1" => pure Specs.V1.specV1
      | "tiny" => pure Examples.Tiny.spec
      | path => readJson Spec path
    let prog ← match progPath with
      | "canonical" => pure Canonical.canonicalV1
      | "tiny" => pure Examples.Tiny.program
      | path => readJson Program path
    let user ← match opts.lookup "--user" with
      | some path => readJson User path
      | none => pure { id := "screen-check", role := .physician }
    let ctx ← match opts.lookup "--context" with
      | some path => readJson FactsContext path
      | none => do
        let today ← match opts.lookup "--today" with
          | some d => pure d
          | none => fixtureDate bundlePath
        pure { today }
    let ctx := match opts.lookup "--today" with | some d => { ctx with today := d } | none => ctx
    let b ← readJson Json bundlePath
    let (facts, disp) ← match Fhir.parseBundle ctx b with
      | .ok r => pure r
      | .error e => throw (IO.userError e)
    IO.FS.createDirAll dir
    let mut count := 0
    for css in (["app/src/ehr.css", "../app/src/ehr.css"] : List System.FilePath) do
      if ← css.pathExists then
        IO.FS.writeFile (dir / "ehr.css") (← IO.FS.readFile css)
        break
    let mut names : List String := []
    for sc in prog.screens do
      for (variant, state) in variants sp prog facts user sc do
        let name := fileName sc.id ++ (if variant == "" then "" else "-" ++ variant)
        -- A duplicate or sanitized-colliding screen id must not overwrite a page.
        if names.contains name then throw (IO.userError s!"duplicate output name: {name}")
        names := name :: names
        let tree := (render sp prog facts disp user state).toPage
        IO.FS.writeFile (dir / (name ++ ".json")) (toJson tree).pretty
        IO.FS.writeFile (dir / (name ++ ".html")) ("<!doctype html><meta charset=\"utf-8\"><link rel=\"stylesheet\" href=\"ehr.css\">" ++ tree.toHtmlString)
        count := count + 1
    IO.println s!"rendered {count} page trees and HTML previews in {dir}"
    return 0
  catch e => IO.eprintln s!"render-screens: {e}"; return 1

end Ehr.Render.Cli
