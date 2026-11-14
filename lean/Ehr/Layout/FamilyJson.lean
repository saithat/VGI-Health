import Ehr.Layout.Density
namespace Ehr.Layout
open Lean Ehr.Render

structure FamilyReference where
  screen : UiScreen
  /-- Empty selects the reference compiler. Otherwise each supported viewport
  has an explicit untrusted JSON tree; missing viewports fail G1 admission. -/
  layouts : List Request := []

instance : FromJson FamilyReference where
  fromJson? j := do
    let screen ← j.getObjValAs? UiScreen "screen"
    let layouts ← match j.getObjVal? "layouts" with
      | .error _ => pure []
      | .ok value => fromJson? value
    return { screen, layouts }

def invalidTree : Node := .box .frame {} { id := "missing-viewport", paint := false } []

def parseFamily (refs : List FamilyReference) : Except String Family := refs.mapM fun ref => do
  let shape := screenShape ref.screen
  if ref.layouts.isEmpty then return ⟨shape,fun v => compileShape v shape⟩
  let layouts ← ref.layouts.mapM fun r => do
    let tree ← parseNode r.components (Json.mkObj []) 256 [] r.tree
    pure (r.viewport,tree)
  return ⟨shape,fun v => ((layouts.find? (fun p => p.1 == v)).map Prod.snd).getD invalidTree⟩

def familyOutput (family : Family) (screen : UiScreen) (v : Size) (limit : Nat := 15) : Json :=
  match selectCandidate family screen with
  | none => Json.mkObj [("accepted",toJson false),("uncoveredShape",toJson (screenShape screen)),
      ("error",toJson "semantic shape not in admitted family; this is not a text-length or glyph failure")]
  | some c =>
    let ps := boxes v (c.tree v)
    let data := ps.map (bindSemantic screen)
    let layoutOk := checkDensity limit (shapeSources c.shape) v ps
    Json.mkObj [("accepted",toJson (Density.acceptFamilyDensity limit family && viewports.contains v)),
      ("viewport",toJson v),("boxes",toJson data),
      ("tree",semanticPaintTree screen (layout ⟨{},v⟩ (c.tree v))),
      ("lineWidths",toJson (data.map drawnLineWidths)),
      ("findings",toJson (findings (shapeSources c.shape) v ps ++ densityFindings limit v ps ++
        realizationWarnings data)),
      ("layoutOk",toJson layoutOk),("linked",toJson (decide (Linked c.shape ps)))]
/-- Research-only class painter: runtime checks structural membership and the
viewport, not geometry, record lengths or glyph/string limits. -/
def structuralOutput (screen : UiScreen) (v : Size) : Json :=
  let shape := screenShape screen
  if !Shell.accepts shape then
    Json.mkObj [("accepted",toJson false),("uncoveredShape",toJson shape),
      ("error",toJson "fixed-shell class requires one banner, at most one commit, at most two modal occurrences and unique sources")]
  else
    let data := (Shell.classBoxes v shape).map (bindSemantic screen)
    let tree := match data with
      | [] => Json.null
      | root :: rest => Json.mkObj [("drawn",toJson root),("children",toJson
          (rest.map fun d => Json.mkObj [("drawn",toJson d),("children",toJson ([] : List Json))]))]
    Json.mkObj [("accepted",toJson (viewports.contains v)),("viewport",toJson v),
      ("boxes",toJson data),("tree",tree),("lineWidths",toJson (data.map drawnLineWidths)),
      ("findings",toJson (realizationWarnings data)),("structuralClass",toJson "fixed-shell-v2")]

/-- Runtime path after a program/class certificate: bind the actual native
render without repeating per-patient class/geometry/content admission. -/
def programOutput (input : RenderInput) (v : Size) : Json :=
  if !viewports.contains v then Json.mkObj [("accepted",toJson false),("error",toJson "unsupported viewport")]
  else
    let screen := runRenderUi input
    let data := (Range.uncheckedPaint screen v).getD []
    let tree := match data with
      | [] => Json.null
      | root :: rest => Json.mkObj [("drawn",toJson root),("children",toJson
          (rest.map fun d => Json.mkObj [("drawn",toJson d),("children",toJson ([] : List Json))]))]
    Json.mkObj [("accepted",toJson (Range.checkProgram input.spec input.program &&
        Density.checkProgramDensity input.spec input.program)),("viewport",toJson v),
      ("boxes",toJson data),("tree",tree),("lineWidths",toJson (data.map drawnLineWidths)),
      ("structuralClass",toJson "fixed-shell-v2"),
      ("rangeTheorem",toJson "Ehr.Layout.Range.layoutAccepted_program"),
      ("densityTheorem",toJson "Ehr.Layout.Density.checkProgramDensity_sound"),
      ("findings",toJson (realizationWarnings data ++ densityFindings input.spec.design.maxTargetsPerViewport v
        (data.map Drawn.box)))]

end Ehr.Layout
