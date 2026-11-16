import Ehr.Layout.WidgetGeometry
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
  let shape := widgetShape ref.screen
  if ref.layouts.isEmpty then return ⟨shape,fun v => compileShape v shape⟩
  let layouts ← ref.layouts.mapM fun r => do
    let tree ← parseNode r.components (Json.mkObj []) 256 [] r.tree
    pure (r.viewport,tree)
  return ⟨shape,fun v => ((layouts.find? (fun p => p.1 == v)).map Prod.snd).getD invalidTree⟩

/-- New specification for owner review: why the fixed shell does not pin the
urgent strip of this shape (rule G11), with the counts and the capacities. -/
def shellStripFindings (shape : ScreenShape) : List Finding :=
  let n := (Shell.urgentSlots shape).length
  let t := ((Shell.urgentSlots shape).filter (·.target)).length
  (if Shell.stripCapacity < n then
    [{ rule := "G11", metric := "urgent-strip-capacity", actual := n, required := Shell.stripCapacity,
       deficit := (n : Int) - Shell.stripCapacity }] else []) ++
  (if Shell.stripTargetCapacity < t then
    [{ rule := "G11", metric := "urgent-strip-targets", actual := t, required := Shell.stripTargetCapacity,
       deficit := (t : Int) - Shell.stripTargetCapacity }] else [])

def familyOutput (family : Family) (screen : UiScreen) (v : Size) (limit : Nat := 15) : Json :=
  match family.find? (fun c => c.shape == widgetShape screen) with
  | none => Json.mkObj [("accepted",toJson false),("uncoveredShape",toJson (screenShape screen)),
      ("error",toJson "semantic shape not in admitted family; this is not a text-length or glyph failure")]
  | some c =>
    let ps := widgetBoxes screen (boxes v (c.tree v))
    let data := bindAll screen ps
    let layoutOk := checkAll limit (shapeSources c.shape) (urgentPaths c.shape) v ps
    Json.mkObj [("accepted",toJson (Density.acceptFamilyDensity limit family && family.all admitUrgent &&
        viewports.contains v && layoutOk)),
      ("viewport",toJson v),("boxes",toJson data),("parts",boxPartsJson screen ps),
      ("tree", match data with
        | [] => Json.null
        | root :: rest => Json.mkObj [("drawn",toJson root),("children",toJson
            (rest.map fun d => Json.mkObj [("drawn",toJson d),("children",toJson ([] : List Json))]))]),
      ("lineWidths",toJson (data.map drawnLineWidths)),
      ("findings",toJson (findings (shapeSources c.shape) v ps ++ densityFindings limit v ps ++
        urgentFindings v (urgentPaths c.shape) ps ++ realizationWarnings data)),
      ("layoutOk",toJson layoutOk),("linked",toJson (decide (Linked c.shape ps)))]
/-- Research-only class painter: runtime checks structural membership and the
viewport, not geometry, record lengths or glyph/string limits. -/
def structuralOutput (screen : UiScreen) (v : Size) : Json :=
  let shape := screenShape screen
  if !Shell.accepts shape then
    Json.mkObj [("accepted",toJson false),("uncoveredShape",toJson shape),
      ("error",toJson "fixed-shell class requires one banner, at most one commit, at most two modal occurrences and unique sources")]
  else
    let data := bindAll screen (Shell.classBoxes v shape)
    let tree := match data with
      | [] => Json.null
      | root :: rest => Json.mkObj [("drawn",toJson root),("children",toJson
          (rest.map fun d => Json.mkObj [("drawn",toJson d),("children",toJson ([] : List Json))]))]
    -- New specification for owner review: a screen whose urgent strip does not
    -- fit the pinned band is refused (G11); `Shell.class_urgent` covers the rest.
    Json.mkObj [("accepted",toJson (viewports.contains v && Shell.stripFits shape)),("viewport",toJson v),
      ("boxes",toJson data),("parts",boxPartsJson screen (Shell.classBoxes v shape)),
      ("tree",tree),("lineWidths",toJson (data.map drawnLineWidths)),
      ("findings",toJson (realizationWarnings data ++ shellStripFindings shape)),
      ("urgentPinned",toJson (Shell.stripFits shape)),("structuralClass",toJson "fixed-shell-v2")]

/-- Runtime path after a program/class certificate: bind the actual native
render without repeating per-patient class/geometry/content admission. -/
def programOutput (input : RenderInput) (v : Size) (window : UiScreen → UiScreen := id) : Json :=
  if !viewports.contains v then Json.mkObj [("accepted",toJson false),("error",toJson "unsupported viewport")]
  else
    let screen := window (runRenderUi input)
    -- `Range.uncheckedPaint` with the inventory computed once (`Range.uncheckedPaint_bound`).
    let data := bindAll screen (Shell.classBoxes v (screenShape screen))
    let tree := match data with
      | [] => Json.null
      | root :: rest => Json.mkObj [("drawn",toJson root),("children",toJson
          (rest.map fun d => Json.mkObj [("drawn",toJson d),("children",toJson ([] : List Json))]))]
    -- New specification for owner review: the program certificates are static;
    -- the urgent strip is decided per state (`Density.render_urgent`).
    let shape := screenShape screen
    Json.mkObj [("accepted",toJson (Range.checkProgram input.spec input.program &&
        Density.checkProgramDensity input.spec input.program && Shell.stripFits shape)),("viewport",toJson v),
      ("boxes",toJson data),("parts",boxPartsJson screen (Shell.classBoxes v shape)),("tree",tree),("lineWidths",toJson (data.map drawnLineWidths)),
      ("structuralClass",toJson "fixed-shell-v2"),
      ("rangeTheorem",toJson "Ehr.Layout.Range.layoutAccepted_program"),
      ("densityTheorem",toJson "Ehr.Layout.Density.checkProgramDensity_sound"),
      ("urgentTheorem",toJson "Ehr.Layout.Density.render_urgent"),
      ("urgentPinned",toJson (Shell.stripFits shape)),
      ("findings",toJson (realizationWarnings data ++ densityFindings input.spec.design.maxTargetsPerViewport v
        (data.map Drawn.box) ++ shellStripFindings shape))]

end Ehr.Layout
