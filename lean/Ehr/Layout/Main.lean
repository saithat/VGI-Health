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
      else if ["family-check","family-paint"].contains ((json.getObjValAs? String "op").toOption.getD "") then
        let refs ← json.getObjValAs? (List FamilyReference) "references"
        let family ← parseFamily refs
        if (json.getObjValAs? String "op").toOption.getD "" == "family-check" then
          pure (Json.mkObj [("accepted",toJson (acceptFamily family)),("shapes",toJson (family.map Candidate.shape))])
        else
          let screen : Ehr.Render.UiScreen ← match json.getObjVal? "render" with
            | .ok r => do pure (Ehr.Render.runRenderUi (← fromJson? r))
            | .error _ => json.getObjValAs? Ehr.Render.UiScreen "screen"
          let viewport := (json.getObjValAs? Size "viewport").toOption.getD ⟨92160,57600⟩
          pure (familyOutput family screen viewport)
      else if (json.getObjValAs? String "op").toOption.getD "" == "port" then
        let screen ← json.getObjValAs? Ehr.Render.UiScreen "screen"
        let viewport := (json.getObjValAs? Size "viewport").toOption.getD ⟨92160,57600⟩
        let (n,data,expected) := portScreen viewport screen
        let ps := boxes viewport n
        let errors := contentErrors data ps
        pure (Json.mkObj [("accepted",toJson (check expected viewport ps && errors.isEmpty)),
          ("viewport",toJson viewport), ("tree",semanticPaintTree screen (layout ⟨{},viewport⟩ n)),
          ("boxes",toJson (ps.map (bindSemantic screen))), ("lineWidths",toJson (ps.map (fun p => drawnLineWidths (bindSemantic screen p)))),
          ("findings",toJson (findings expected viewport ps ++ errors ++ realizationWarnings (ps.map (bindSemantic screen))))])
      else
        let r ← fromJson? json
        runRequest r
    stdout.putStrLn ((match result with
      | .ok j => j | .error e => Json.mkObj [("error",toJson e)]).compress)
