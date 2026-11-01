import Ehr.Render.Cli
import Ehr.Render.UiTests

/-! Export the exact API inputs used for native/WASM differential tests. -/
def main (args : List String) : IO Unit := do
  let dir : System.FilePath := args.headD "/tmp/vgi-render-api"
  let bundle := args[1]?.getD "../fixtures/synthea/Aaron_Ankunding_4966bd28.json"
  IO.FS.createDirAll dir
  let sp := Ehr.Specs.V1.specV1
  let prog := Ehr.Canonical.canonicalV1
  let user : Ehr.User := { id := "render-test", role := .physician }
  let context : Ehr.Render.FactsContext := { today := "2026-10-31" }
  let b ← Ehr.Render.Cli.readJson Lean.Json bundle
  let (facts, _) ← match Ehr.Render.Fhir.parseBundle context b with
    | .ok r => pure r | .error e => throw (IO.userError e)
  let cases := prog.screens.flatMap fun sc =>
    (Ehr.Render.Cli.variants sp prog facts user sc).map fun (name, s) => (sc.id ++ "-" ++ name, s)
  for (name, json) in [("spec", Lean.toJson sp), ("program", Lean.toJson prog),
      ("user", Lean.toJson user), ("context", Lean.toJson context), ("states", Lean.toJson cases)] do
    IO.FS.writeFile (dir / (name ++ ".json")) json.compress

  let cx := Ehr.Render.uiShellCtx
  let input : Ehr.Render.RenderInput :=
    { spec := cx.sp, program := cx.prog, facts := cx.facts, display := cx.disp, user := cx.user, state := cx.s }
  IO.FS.writeFile (dir / "clinical-ui-cases.json") (Lean.toJson
    [("captured-orders", input), ("empty-episode", { input with state := { input.state with captured := [] } })]).compress

  -- Regenerate the three adult P1 samples without dropping any program screens:
  -- use the release JSON and the actual interpreter's init/goTo prefills.
  let p1 ← Ehr.Render.Cli.readJson Ehr.Program "../releases/v1/personas/P1.json"
  let p1spec ← Ehr.Render.Cli.readJson Ehr.Spec "../releases/v1/spec.json"
  let (_, display) ← match Ehr.Render.Fhir.parseBundle context b with
    | .ok r => pure r | .error e => throw (IO.userError e)
  for id in ["w1Rooming", "w1Orders", "w1Sign"] do
    let state := (Ehr.goTo p1spec p1 facts (Ehr.init p1spec p1 facts user) id).1
    let input : Ehr.Render.RenderInput := { spec := p1spec, program := p1, facts, display, user, state }
    IO.FS.writeFile (dir / ("p1-input-" ++ id ++ ".json")) (Lean.toJson input).compress
    IO.FS.writeFile (dir / (id ++ ".json")) (Lean.toJson (Ehr.Render.runRenderUi input)).pretty
