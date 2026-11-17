import Ehr.Layout.FamilyJson
import Ehr.Layout.Window
import Ehr.Layout.BoardScreen
import Ehr.Layout.Session

namespace Ehr.Layout
open Lean

/-- New specification for owner review: the window a request asks for. Absent:
the default page sizes; `false`: no paging; an object may set `size` and
per-list `sizes` (`[[component, size], …]`), each kept within the bounds
`Window.minPageSize`–`Window.maxPageSize`. -/
def windowConfig (json : Json) : Except String Window.Config :=
  match json.getObjVal? "window" with
  | .error _ => pure {}
  | .ok (.bool false) => pure { enabled := false }
  | .ok (.bool true) | .ok .null => pure {}
  | .ok value => do
    let size := (value.getObjValAs? Nat "size").toOption.getD Window.defaultPageSize
    let sizes ← match value.getObjVal? "sizes" with
      | .error _ => pure []
      | .ok list => fromJson? (α := List (String × Nat)) list
    pure { size, sizes }

/-- A request's screen as the layout shows it: its bounded lists paged. -/
def windowed (cfg : Window.Config) (screen : Ehr.Render.UiScreen) : Ehr.Render.UiScreen :=
  Window.windowOnce cfg screen

def dispatch (json : Json) : Except String Json := do
  let cfg ← windowConfig json
  if (json.getObjValAs? String "op").toOption.getD "layout" == "keyboard" then
    let profile ← json.getObjValAs? String "profile"
    let state ← json.getObjValAs? Keyboard.State "state"
    let key ← json.getObjValAs? Keyboard.Key "key"
    let rows := (json.getObjValAs? Nat "rows").toOption.getD 1
    let cols := (json.getObjValAs? Nat "cols").toOption.getD 1
    pure (toJson (match profile with
      | "tabs" => Keyboard.tabs (rows*cols) state key
      | "dialog" => Keyboard.dialog (rows*cols) state key
      | "alert-dialog" => Keyboard.alertDialog (rows*cols) state key
      | "listbox" => Keyboard.listbox (rows*cols) state key
      | _ => Keyboard.grid rows cols state key))
  else if (json.getObjValAs? String "op").toOption.getD "" == "session" then
    -- New specification for owner review: the screen with its host session
    -- group (`withSession`), for layout and painting only.
    let screen ← json.getObjValAs? Ehr.Render.UiScreen "screen"
    pure (Json.mkObj [("screen",toJson (withSession screen)),("signOut",toJson signOutComp)])
  else if (json.getObjValAs? String "op").toOption.getD "" == "board-screen" then
    let panes ← json.getObjValAs? (List PatientScreen) "panes"
    if panes.any (fun p => p.patient == "") || !(decide ((panes.map (·.patient)).Nodup)) then
      throw "Unique patient sessions required"
    pure (toJson (boardScreen panes))
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
      ("stripCapacity",toJson Shell.stripCapacity),
      ("stripTargetCapacity",toJson Shell.stripTargetCapacity),
      ("findings",toJson (if dense then ([] : List Finding) else
        [{ rule := "G10", metric := "fixed-shell-capacity", actual := Density.shellCapacity,
           required := spec.design.maxTargetsPerViewport,
           deficit := (Density.shellCapacity : Int) - spec.design.maxTargetsPerViewport }])),
      ("program",toJson program.id)])
  else if (json.getObjValAs? String "op").toOption.getD "" == "program-paint" then
    let input ← json.getObjValAs? Ehr.Render.RenderInput "render"
    let v := (json.getObjValAs? Size "viewport").toOption.getD ⟨92160,57600⟩
    pure (programOutput input v (windowed cfg))
  else if (json.getObjValAs? String "op").toOption.getD "" == "structural-paint" then
    let screen ← json.getObjValAs? Ehr.Render.UiScreen "screen"
    let v := (json.getObjValAs? Size "viewport").toOption.getD ⟨92160,57600⟩
    pure (structuralOutput (windowed cfg screen) v)
  else if ["family-check","family-paint"].contains ((json.getObjValAs? String "op").toOption.getD "") then
    let refs ← json.getObjValAs? (List FamilyReference) "references"
    let family ← parseFamily (refs.map fun ref => { ref with screen := windowed cfg ref.screen })
    let limit := (json.getObjValAs? Nat "maxTargetsPerViewport").toOption.getD 15
    if (json.getObjValAs? String "op").toOption.getD "" == "family-check" then
      pure (Json.mkObj [("accepted",toJson (Density.acceptFamilyDensity limit family && family.all admitUrgent)),
        ("shapes",toJson (family.map Candidate.shape)),
        ("findings",toJson (family.flatMap fun (c : Candidate) => viewports.flatMap fun (v : Size) =>
          densityFindings limit v (boxes v (c.tree v)) ++
          urgentFindings v (urgentPaths c.shape) (boxes v (c.tree v))))])
    else
      let screen : Ehr.Render.UiScreen ← match json.getObjVal? "render" with
        | .ok r => do pure (Ehr.Render.runRenderUi (← fromJson? r))
        | .error _ => json.getObjValAs? Ehr.Render.UiScreen "screen"
      let viewport := (json.getObjValAs? Size "viewport").toOption.getD ⟨92160,57600⟩
      pure (familyOutput family (windowed cfg screen) viewport limit)
  else if (json.getObjValAs? String "op").toOption.getD "" == "port" then
    let screen := windowed cfg (← json.getObjValAs? Ehr.Render.UiScreen "screen")
    let viewport := (json.getObjValAs? Size "viewport").toOption.getD ⟨92160,57600⟩
    let limit := (json.getObjValAs? Nat "maxTargetsPerViewport").toOption.getD 15
    let (n,data,expected) := portScreen viewport screen
    let ps := boxes viewport n
    let errors := contentErrors data ps
    let urgent := urgentPaths (screenShape screen)
    let data := bindAll screen ps
    pure (Json.mkObj [("accepted",toJson (checkAll limit expected urgent viewport ps && errors.isEmpty)),
      ("viewport",toJson viewport), ("tree",semanticPaintTree screen (layout ⟨{},viewport⟩ n)),
      ("boxes",toJson data), ("parts",boxPartsJson screen ps),
      ("lineWidths",toJson (data.map drawnLineWidths)),
      ("findings",toJson (findings expected viewport ps ++ densityFindings limit viewport ps ++
        urgentFindings viewport urgent ps ++ errors ++ realizationWarnings data))])
  else if (json.getObjValAs? String "op").toOption.getD "" == "format" then
    -- New specification for owner review: the display formatters by name, so
    -- that native and WASM wording can be compared on any text.
    let name ← json.getObjValAs? String "name"
    let args ← json.getObjValAs? (List String) "args"
    let arg (i : Nat) : String := args.getD i ""
    let text ← match name with
      | "cleanClinicalText" => pure (Format.cleanClinicalText (arg 0))
      | "clinicalName" => pure (Format.clinicalName (arg 0))
      | "clinicalUnit" => pure (Format.clinicalUnit (arg 0))
      | "unit" => pure (Format.unit (arg 0))
      | "observationValue" => pure (Format.observationValue (arg 0))
      | "clinicalStatus" => pure (Format.clinicalStatus (arg 0))
      | "encounterClass" => pure (Format.encounterClass (arg 0))
      | "ageSex" => pure (Format.ageSex (arg 0))
      | "clinicalDuration" => pure (Format.clinicalDuration (arg 0))
      | "clinicalTime" => pure (Format.clinicalTime (arg 0))
      | "clinicalTimestamp" => pure (Format.clinicalTimestamp (arg 0))
      | "utcMinute" => pure (Format.utcMinute (arg 0))
      | "formatSig" => pure (Format.formatSig (arg 0))
      | "formatMedicationLine" => pure (Format.formatMedicationLine (arg 0) (arg 1))
      | "allergyDisplay" => pure (Format.allergyDisplay (arg 0))
      | "formatClinicalRecord" => pure (Format.formatClinicalRecord (arg 0))
      | "compactVitalRecord" => pure ((Format.compactVitalRecord (arg 0)).getD "")
      | "sectionCaption" => pure (Format.sectionCaption (arg 0))
      | "fieldCaption" => pure (Format.fieldCaption (arg 0))
      | "controlCaption" => pure (Format.controlCaption (arg 0))
      | "columnCaption" => pure (Format.columnCaption (arg 0))
      | "provenance" => pure (Format.provenance (arg 0))
      | "displayValue" => pure (Format.displayValue (arg 0))
      | "cellText" => pure (Format.cellText (arg 0) [] (arg 1) (arg 2))
      | "fieldValue" => pure (Format.fieldValue (arg 0) (arg 1))
      | "fieldPlaceholder" => pure (Format.fieldPlaceholder (arg 0) (arg 1))
      | "bannerField" => pure (Format.bannerField (arg 0) (arg 1))
      | "statusTone" => pure (Format.statusTone (arg 0))
      | "resultTone" => pure (Format.resultTone (arg 0))
      | "sectionTone" => pure (Format.sectionTone (arg 0))
      | "emptyInfo" => pure (Format.emptyInfo (arg 0))
      | other => throw s!"unknown formatter: {other}"
    pure (Json.mkObj [("text",toJson text)])
  else if (json.getObjValAs? String "op").toOption.getD "" == "inventory" then
    -- New specification for owner review: the semantic inventory of a screen:
    -- every display part with its occurrence path, and the erased shape.
    let screen : Ehr.Render.UiScreen ← match json.getObjVal? "render" with
      | .ok r => do pure (Ehr.Render.runRenderUi (← fromJson? r))
      | .error _ => json.getObjValAs? Ehr.Render.UiScreen "screen"
    let screen := windowed cfg screen
    pure (Json.mkObj [("inventory",inventoryJson screen),("shape",toJson (widgetShape screen))])
  else if (json.getObjValAs? String "op").toOption.getD "" == "window" then
    -- New specification for owner review: the screen as the layout shows it,
    -- with its bounded lists paged (`Window.windowScreen`).
    let screen : Ehr.Render.UiScreen ← match json.getObjVal? "render" with
      | .ok r => do pure (Ehr.Render.runRenderUi (← fromJson? r))
      | .error _ => json.getObjValAs? Ehr.Render.UiScreen "screen"
    pure (Json.mkObj [("screen",toJson (windowed cfg screen)),
      ("theorem",toJson "Ehr.Layout.WindowProofs.render_window_parts_shown")])
  else
    let r ← fromJson? json
    runRequest r

/-- Shared native/WASM JSON boundary for layout and proved keyboard transitions. -/
@[export ehr_layout]
def apiLayout (input : String) : String :=
  (match Json.parse input >>= dispatch with
    | .ok j => j
    | .error e => Json.mkObj [("error",toJson e)]).compress

end Ehr.Layout
