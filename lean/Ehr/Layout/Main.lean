import Ehr.Layout.FamilyJson
open Lean Ehr.Layout
/-- Isolated JSONL research executable; never deploys or writes clinical data. -/
def main : IO Unit := do
  let stdin ← IO.getStdin
  let stdout ← IO.getStdout
  repeat
    let line ← stdin.getLine
    if line.isEmpty then break
    let result := do
      let json ← Json.parse line
      if (json.getObjValAs? String "op").toOption.getD "layout" == "keyboard" then
        let profile ← json.getObjValAs? String "profile"
        let state ← json.getObjValAs? Keyboard.State "state"
        let key ← json.getObjValAs? Keyboard.Key "key"
        let rows := (json.getObjValAs? Nat "rows").toOption.getD 1
        let cols := (json.getObjValAs? Nat "cols").toOption.getD 1
        pure (toJson (match profile with
          | "tabs" => Keyboard.tabs (rows*cols) state key
          | "dialog" => Keyboard.dialog (rows*cols) state key
          | "listbox" => Keyboard.listbox (rows*cols) state key
          | _ => Keyboard.grid rows cols state key))
      else if (json.getObjValAs? String "op").toOption.getD "" == "program-check" then
        let spec ← json.getObjValAs? Ehr.Spec "spec"
        let program ← json.getObjValAs? Ehr.Program "program"
        let dense := Density.checkProgramDensity spec program
        pure (Json.mkObj [("accepted",toJson (Range.checkProgram spec program && dense)),
          ("scope",toJson "fixed-shell-v2 layout admission"),
          ("theorem",toJson "Ehr.Layout.Range.checkProgram_sound"),
          ("densityTheorem",toJson "Ehr.Layout.Density.checkProgramDensity_sound"),
          ("maxTargetsPerViewport",toJson spec.design.maxTargetsPerViewport),
          ("shellCapacity",toJson Density.shellCapacity),
          ("findings",toJson (if dense then ([] : List Finding) else
            [{ rule := "G10", metric := "fixed-shell-capacity", actual := Density.shellCapacity,
               required := spec.design.maxTargetsPerViewport,
               deficit := (Density.shellCapacity : Int) - spec.design.maxTargetsPerViewport }])),
          ("program",toJson program.id)])
      else if (json.getObjValAs? String "op").toOption.getD "" == "program-paint" then
        let input ← json.getObjValAs? Ehr.Render.RenderInput "render"
        let v := (json.getObjValAs? Size "viewport").toOption.getD ⟨92160,57600⟩
        pure (programOutput input v)
      else if (json.getObjValAs? String "op").toOption.getD "" == "structural-paint" then
        let screen ← json.getObjValAs? Ehr.Render.UiScreen "screen"
        let v := (json.getObjValAs? Size "viewport").toOption.getD ⟨92160,57600⟩
        pure (structuralOutput screen v)
      else if ["family-check","family-paint"].contains ((json.getObjValAs? String "op").toOption.getD "") then
        let refs ← json.getObjValAs? (List FamilyReference) "references"
        let family ← parseFamily refs
        let limit := (json.getObjValAs? Nat "maxTargetsPerViewport").toOption.getD 15
        if (json.getObjValAs? String "op").toOption.getD "" == "family-check" then
          pure (Json.mkObj [("accepted",toJson (Density.acceptFamilyDensity limit family)),
            ("shapes",toJson (family.map Candidate.shape)),
            ("findings",toJson (family.flatMap fun (c : Candidate) => viewports.flatMap fun (v : Size) =>
              densityFindings limit v (boxes v (c.tree v))))])
        else
          let screen : Ehr.Render.UiScreen ← match json.getObjVal? "render" with
            | .ok r => do pure (Ehr.Render.runRenderUi (← fromJson? r))
            | .error _ => json.getObjValAs? Ehr.Render.UiScreen "screen"
          let viewport := (json.getObjValAs? Size "viewport").toOption.getD ⟨92160,57600⟩
          pure (familyOutput family screen viewport limit)
      else if (json.getObjValAs? String "op").toOption.getD "" == "port" then
        let screen ← json.getObjValAs? Ehr.Render.UiScreen "screen"
        let viewport := (json.getObjValAs? Size "viewport").toOption.getD ⟨92160,57600⟩
        let limit := (json.getObjValAs? Nat "maxTargetsPerViewport").toOption.getD 15
        let (n,data,expected) := portScreen viewport screen
        let ps := boxes viewport n
        let errors := contentErrors data ps
        pure (Json.mkObj [("accepted",toJson (checkDensity limit expected viewport ps && errors.isEmpty)),
          ("viewport",toJson viewport), ("tree",semanticPaintTree screen (layout ⟨{},viewport⟩ n)),
          ("boxes",toJson (ps.map (bindSemantic screen))), ("lineWidths",toJson (ps.map (fun p => drawnLineWidths (bindSemantic screen p)))),
          ("findings",toJson (findings expected viewport ps ++ densityFindings limit viewport ps ++ errors ++
            realizationWarnings (ps.map (bindSemantic screen))))])
      else
        let r ← fromJson? json
        runRequest r
    stdout.putStrLn ((match result with
      | .ok j => j | .error e => Json.mkObj [("error",toJson e)]).compress)
