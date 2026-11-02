import Ehr.Render.Cli
import Ehr.Render.UiTests

/-! Export the exact API inputs used for native/WASM differential tests.
Optional third/fourth arguments select a historical spec/program JSON pair;
the default always covers the current compiled canonical. P1 app samples always
use the current release, independently of the selected differential corpus. -/
def main (args : List String) : IO Unit := do
  let dir : System.FilePath := args.headD "/tmp/vgi-render-api"
  let bundle := args[1]?.getD "../fixtures/synthea/Aaron_Ankunding_4966bd28.json"
  IO.FS.createDirAll dir
  let sp ← match args[2]? with
    | some path => Ehr.Render.Cli.readJson Ehr.Spec path
    | none => pure Ehr.Specs.V1.specV1
  let prog ← match args[3]? with
    | some path => Ehr.Render.Cli.readJson Ehr.Program path
    | none => pure Ehr.Canonical.canonicalV1
  let user : Ehr.User := { id := "render-test", role := .physician }
  let context : Ehr.Render.FactsContext := { today := "2026-10-31" }
  let b ← Ehr.Render.Cli.readJson Lean.Json bundle
  let (facts, _) ← match Ehr.Render.Fhir.parseBundle context b with
    | .ok r => pure r | .error e => throw (IO.userError e)
  let cases := prog.screens.flatMap fun sc =>
    (Ehr.Render.Cli.variants sp prog facts user sc).map fun (name, s) => (sc.id ++ "-" ++ name, s)
  IO.println s!"Exporting {cases.length} variants across all {prog.screens.length} canonical screens"
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
  let mut ordered := (Ehr.goTo p1spec p1 facts (Ehr.init p1spec p1 facts user) "w1Orders").1
  -- Populate a synthetic prescription through real human enter events. Missing,
  -- hidden or blocked fields fail the export rather than manufacturing captures.
  for (element, text) in [("drug", "amoxicillin"), ("dose", "500"), ("route", "PO"),
      ("freq", "bid"), ("duration", "7 days"), ("quantity", "14"), ("refills", "0"),
      ("prescriptionDirections", "Take one capsule by mouth twice daily for 7 days"),
      ("controlledPrescriberName", "Morgan Patel (synthetic)"),
      ("prescriberFederalRegistration", "DEMO-REG-001")] do
    -- Full-profile signing fields are absent from the default core profile.
    -- Never add them to the spec or synthesize a capture just for a sample.
    let some el := p1spec.element? element | continue
    let some it := (Ehr.view p1spec p1 facts user ordered).items.find? (fun it =>
      it.shown && match it.comp.kind with | .field e _ _ => e == element | _ => false)
      | throw (IO.userError s!"sample field not shown: {element}")
    -- Native-unit medication doses need the unit selected by the actual state.
    let inputKind := if el.kind == .medicationDose then
      .quantity ((Ehr.doseInputUnit? ordered it.slot).getD .none) else el.kind
    let some value := Ehr.parseValue inputKind text | throw (IO.userError s!"invalid sample value: {element}")
    let (next, result) := Ehr.step p1spec p1 facts user .human ordered (.enter it.comp.id value)
    if result != .ok then throw (IO.userError s!"sample entry blocked: {element}: {reprStr result}")
    ordered := next
  for id in ["w1Rooming", "w1Orders", "w1Sign"] do
    let base := if id == "w1Rooming" then Ehr.init p1spec p1 facts user else ordered
    let state := (Ehr.goTo p1spec p1 facts base id).1
    let input : Ehr.Render.RenderInput := { spec := p1spec, program := p1, facts, display, user, state }
    IO.FS.writeFile (dir / ("p1-input-" ++ id ++ ".json")) (Lean.toJson input).compress
    IO.FS.writeFile (dir / (id ++ ".json")) (Lean.toJson (Ehr.Render.runRenderUi input)).pretty
