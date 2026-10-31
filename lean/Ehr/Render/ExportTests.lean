import Ehr.Render.Cli

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
