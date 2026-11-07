import Ehr.Layout.Family
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

def familyOutput (family : Family) (screen : UiScreen) (v : Size) : Json :=
  match selectCandidate family screen with
  | none => Json.mkObj [("accepted",toJson false),("uncoveredShape",toJson (screenShape screen)),
      ("error",toJson "semantic shape not in admitted family; this is not a text-length or glyph failure")]
  | some c =>
    let ps := boxes v (c.tree v)
    let data := ps.map (bindSemantic screen)
    let layoutOk := check (shapeSources c.shape) v ps
    Json.mkObj [("accepted",toJson (acceptFamily family && viewports.contains v)),
      ("viewport",toJson v),("boxes",toJson data),
      ("tree",semanticPaintTree screen (layout ⟨{},v⟩ (c.tree v))),
      ("lineWidths",toJson (data.map drawnLineWidths)),
      ("findings",toJson (findings (shapeSources c.shape) v ps ++ realizationWarnings data)),
      ("layoutOk",toJson layoutOk),("linked",toJson (decide (Linked c.shape ps)))]
end Ehr.Layout
