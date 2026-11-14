import Lean
import Ehr.Core.Json
import Ehr.Render.Json
import Ehr.Render.Fhir
import Ehr.Tools.Samples

/-!
# TypeScript type generator

`lake exe gents [outDir]` loads the compiled `Ehr.Core.Types` and
`Ehr.Core.Json`, `Ehr.Render.Types`, and `Ehr.Render.Fhir` modules, reads every type declared
there, and writes matching TypeScript types to `<outDir>/ehr-types.ts` (default `outDir`: `generated`).
It also writes `<outDir>/ehr-samples.ts`: real JSON produced by Lean, typed
with the generated types, so `tsc` can check that the two agree.

The TypeScript mirrors Lean's derived JSON encoding exactly:
- a constructor without arguments is a string literal;
- a constructor with named arguments is `{ ctor: { arg: T; … } }`;
- a constructor with one unnamed argument is `{ ctor: T }`;
- `CriticalDraft` preserves its historical `[result, text]` array encoding;
- a structure is an object; an `Option` field named `foo?` becomes `foo?: T`
  (left out when `none`); other `Option` fields become `T | null`;
- `A × B` is `[A, B]`; `List A` is `A[]`; `Lean.Json` is `unknown`.

This is a build tool, not part of the verified core.
-/

open Lean

namespace Ehr.Tools.GenTS

/-- Modules whose types are exported. -/
def sourceModules : List Name := [`Ehr.Sim.Workflow.Types, `Ehr.Sim.Scheduling.Types, `Ehr.Sim.Resumption.Types, `Ehr.Multi.Critical, `Ehr.Core.Types, `Ehr.Core.Json, `Ehr.Render.Types, `Ehr.Render.Json, `Ehr.Render.Fhir]

/-- The TypeScript name of a Lean declaration: its last component. -/
def tsName (n : Name) : String :=
  match n with
  | .str _ s => s
  | _ => n.toString

/-- Add parentheses around a union type so `[]` binds correctly. -/
def wrap (t : String) : String :=
  if t.contains '|' then s!"({t})" else t

/-- Translate a Lean type to a TypeScript type. `known` holds the exported names. -/
partial def tsType (known : NameSet) (e : Expr) : Except String String := do
  match e with
  | .const n _ =>
    if n == ``String then return "string"
    else if n == ``Nat || n == ``Int then return "number"
    else if n == ``Bool then return "boolean"
    else if n == ``Lean.Json then return "unknown"
    else if known.contains n then return tsName n
    else throw s!"unsupported type constant {n}"
  | .app (.const ``Fin _) _ => return "number"
  | .app (.const ``List _) a => return s!"{wrap (← tsType known a)}[]"
  | .app (.const ``Option _) a => return s!"{← tsType known a} | null"
  | .app (.app (.const ``Prod _) a) b =>
    return s!"[{← tsType known a}, {← tsType known b}]"
  | _ => throw s!"unsupported type {e}"

/-- The argument binders of a constructor type (names and types). -/
def ctorArgs (ty : Expr) : Except String (List (Name × Expr)) := do
  match ty with
  | .forallE n t b _ =>
    if t.hasLooseBVars then throw s!"dependent constructor argument {n}"
    return (n, t) :: (← ctorArgs b)
  | _ => return []

/-- Format a docstring as a JSDoc comment with the given indent. -/
def jsDoc (indent : String) : Option String → String
  | none => ""
  | some d =>
    let lines := (d.trimAscii.toString.splitOn "\n").map (·.trimAsciiEnd.toString)
    let body := lines.map (fun l => if l.isEmpty then s!"{indent} *" else s!"{indent} * {l}")
    s!"{indent}/**\n{"\n".intercalate body}\n{indent} */\n"

/-- Kinds of declarations we export. -/
inductive Decl
  | alias (name : Name)
  | struct (name : Name)
  | induct (name : Name)

/-- Is this declaration an exported type? Returns how to export it. -/
def classify (env : Environment) (n : Name) : Option Decl :=
  if n.isInternal then none else
  match env.find? n with
  | some (.defnInfo d) =>
    if d.type == .sort 1 && d.value.isConst then some (.alias n) else none
  | some (.inductInfo _) =>
    if isStructure env n then some (.struct n) else some (.induct n)
  | _ => none

/-- Optional simulation metadata has its own generated augmentation module.
The clinical module also exports runtime enum tables, so even type-only source
changes would otherwise alter the certified painter fingerprint. -/
def simulatorField (n f : Name) : Bool :=
  (n == ``Ehr.Task && (f == `timing? || f == `workflowPlan?)) ||
  (n == ``Ehr.DaySchedule && [`clockMode?, `shifts?, `sourceDates?].contains f) ||
  (n == ``Ehr.TaskMetrics && (f == `interruptions? || f == `workflow?)) ||
  (n == ``Ehr.DayResult && f == `workload?)

/-- Emit one exported declaration. -/
def emitDecl (env : Environment) (known : NameSet) (fieldsMode : Nat := 0) : Decl → IO String
  | .alias n => do
    let some (.defnInfo d) := env.find? n | throw (IO.userError s!"{n}")
    let t ← IO.ofExcept (tsType known d.value)
    return s!"{jsDoc "" (← findDocString? env n)}export type {tsName n} = {t};\n"
  | .struct n => do
    if n == ``Ehr.CriticalDraft then
      return s!"{jsDoc "" (← findDocString? env n)}export type CriticalDraft = [result: string, text: string];\n"
    let fields := getStructureFields env n
    let mut out := s!"{jsDoc "" (← findDocString? env n)}export interface {tsName n} \{\n"
    for f in fields do
      if fieldsMode == 1 && simulatorField n f then continue
      if fieldsMode == 2 && !simulatorField n f then continue
      let some proj := getProjFnForField? env n f | throw (IO.userError s!"{n}.{f}")
      let some ci := env.find? proj | throw (IO.userError s!"{proj}")
      let fty := ci.type.bindingBody!
      let fname := f.toString
      let doc := jsDoc "  " (← findDocString? env proj)
      if (n == ``Ehr.Program && fname == "componentDefs") ||
          (n == ``Ehr.DesignRules &&
            ["unsignedDraftMinutes", "copyBudget", "maxTargetsPerViewport"].contains fname) then
        -- Custom JSON: default values may be omitted.
        out := out ++ s!"{doc}  {fname}?: {← IO.ofExcept (tsType known fty)};\n"
      else if fname.endsWith "?" then
        let jname := (fname.dropEnd 1).toString
        let inner ← match fty with
          | .app (.const ``Option _) a => IO.ofExcept (tsType known a)
          | _ => throw (IO.userError s!"{n}.{f}: `?` field is not an Option")
        out := out ++ s!"{doc}  {jname}?: {inner};\n"
      else
        out := out ++ s!"{doc}  {fname}: {← IO.ofExcept (tsType known fty)};\n"
    return out ++ "}\n"
  | .induct n => do
    let some (.inductInfo iv) := env.find? n | throw (IO.userError s!"{n}")
    if iv.numParams != 0 || iv.numIndices != 0 then
      throw (IO.userError s!"{n}: parameters are not supported")
    let mut alts : Array String := #[]
    let mut isEnum := true
    for c in iv.ctors do
      let some (.ctorInfo ci) := env.find? c | throw (IO.userError s!"{c}")
      let args ← IO.ofExcept (ctorArgs ci.type)
      let cname := tsName c
      let doc ← findDocString? env c
      let docLine := match doc with
        | some d =>
          let ls := (d.trimAscii.toString.splitOn "\n").map (fun (l : String) => l.trimAscii.toString)
          s!"  /** {" ".intercalate ls} */\n"
        | none => ""
      let alt ← match args with
        | [] => pure s!"\"{cname}\""
        | _ =>
          if args.all (fun (a, _) => !a.hasMacroScopes) then do
            let fs ← args.mapM fun (a, t) => do
              return s!"{a.toString}: {← IO.ofExcept (tsType known t)}"
            pure s!"\{ {cname}: \{ {"; ".intercalate fs} } }"
          else if let [(_, t)] := args then do
            pure s!"\{ {cname}: {← IO.ofExcept (tsType known t)} }"
          else do
            let ts ← args.mapM fun (_, t) => IO.ofExcept (tsType known t)
            pure s!"\{ {cname}: [{", ".intercalate ts}] }"
      if !args.isEmpty then isEnum := false
      alts := alts.push s!"{docLine}  | {alt}"
    let header := s!"{jsDoc "" (← findDocString? env n)}export type {tsName n} =\n"
    let mut out := header ++ "\n".intercalate alts.toList ++ ";\n"
    if isEnum then
      let names := iv.ctors.map (fun c => s!"\"{tsName c}\"")
      out := out ++ s!"/** All values of `{tsName n}`. */\nexport const {tsName n}Values = [{", ".intercalate names}] as const;\n"
    return out

/-- The name a declaration exports. -/
def Decl.name : Decl → Name
  | .alias n | .struct n | .induct n => n

/-- The source line of a declaration (for ordering), or 0 if unknown. -/
def declLine (env : Environment) (n : Name) : Nat :=
  let r := declRangeExt.find? (level := .exported) env n <|>
    declRangeExt.find? (level := .server) env n
  match r with
  | some r => r.range.pos.line
  | none => 0

/-- Collect exported declarations of the source modules, in declaration order. -/
def collect (env : Environment) : List Decl := Id.run do
  let mut out := #[]
  for m in sourceModules do
    let some idx := env.getModuleIdx? m | continue
    let mut here : Array Decl := #[]
    for n in env.header.moduleData[idx.toNat]!.constNames do
      if m == `Ehr.Multi.Critical && ![``Ehr.Multi.Critical.Result, ``Ehr.Multi.Critical.Resolution, ``Ehr.Multi.Critical.Ticket].contains n then continue
      if let some d := classify env n then
        here := here.push d
    out := out ++ here.qsort (fun a b => declLine env a.name < declLine env b.name)
  return out.toList

end Ehr.Tools.GenTS

open Ehr.Tools.GenTS in
/-- Entry point: `lake exe gents [outDir]`. -/
def main (args : List String) : IO UInt32 := do
  let dir : System.FilePath := args.headD "generated"
  initSearchPath (← findSysroot)
  let env ← importModules (sourceModules.toArray.map ({ module := · })) {}
    (loadExts := false)
  let decls := collect env
  let known := decls.foldl (fun s d => s.insert d.name) {}
  -- Fail generation if a module rename accidentally drops a public boundary.
  for n in [``Ehr.Render.Display, ``Ehr.Render.Html, ``Ehr.Render.PageNode,
            ``Ehr.ComponentDef, ``Ehr.Render.UiNode, ``Ehr.Render.UiScreen, ``Ehr.Render.Fhir.FactsInput,
            ``Ehr.PayloadContract, ``Ehr.DisplayReq, ``Ehr.PayloadView, ``Ehr.ExpiryReq, ``Ehr.OrderClock, ``Ehr.Validation, ``Ehr.ClinicalPredicate, ``Ehr.TemporalReq, ``Ehr.EventEvidence, ``Ehr.Task, ``Ehr.DaySchedule] do
    unless known.contains n do
      throw (IO.userError s!"missing required exported type {n}")
  let names := decls.map (fun d => tsName d.name)
  unless names.eraseDups.length == names.length do
    let duplicates := names.eraseDups.filter fun name => (names.filter (· == name)).length > 1
    throw (IO.userError ("TypeScript export name collision: " ++ ", ".intercalate duplicates))
  let mut text :=
    "// GENERATED by `lake exe gents` from lean/Ehr/Core/Types.lean and\n" ++
    "// lean/Ehr/Core/Json.lean, lean/Ehr/Render/Types.lean, and lean/Ehr/Render/Fhir.lean.\n" ++
    "// Do not edit by hand; regenerate instead.\n" ++
    "// The types mirror Lean's derived JSON encoding exactly.\n" ++
    "/* eslint-disable */\n\n"
  let simulation := decls.filter fun d => d.name.toString.startsWith "Ehr.Sim."
  for d in decls.filter (fun d => !d.name.toString.startsWith "Ehr.Sim.") do
    text := text ++ (← emitDecl env known 1 d) ++ "\n"
  let mut simText := "// GENERATED by `lake exe gents`; simulator metadata outside the clinical runtime.\n" ++
    "// These augmentations preserve the full Lean JSON types without changing enum-table source.\n" ++
    "import type {} from \"./ehr-types\";\n\n"
  for d in simulation do
    simText := simText ++ (← emitDecl env known 0 d) ++ "\n"
  simText := simText ++ "declare module \"./ehr-types\" {\n"
  for n in [``Ehr.Task, ``Ehr.DaySchedule, ``Ehr.TaskMetrics, ``Ehr.DayResult] do
    simText := simText ++ (← emitDecl env known 2 (.struct n)) ++ "\n"
  simText := simText ++ "}\n"
  IO.FS.createDirAll dir
  IO.FS.writeFile (dir / "ehr-types.ts") text
  IO.FS.writeFile (dir / "sim-types.ts") simText
  -- Samples: real Lean JSON, typed with the generated types.
  let samples := Ehr.Tools.Samples.all
  let typeNames := samples.map (fun s => (s.type.splitOn "[").headD s.type) |>.eraseDups
  let mut st :=
    "// GENERATED by `lake exe gents` from lean/Ehr/Tools/Samples.lean.\n" ++
    "// Real JSON written by Lean. `tsc --noEmit` on this file checks that it\n" ++
    "// matches the generated types. Do not edit by hand.\n" ++
    s!"import type \{ {", ".intercalate typeNames} } from \"./ehr-types\";\n\n"
  for s in samples do
    st := st ++ s!"export const {s.name}: {s.type} = {s.json.pretty};\n\n"
  IO.FS.writeFile (dir / "ehr-samples.ts") st
  IO.println s!"wrote {decls.length} types and {samples.length} samples to {dir}"
  return 0
