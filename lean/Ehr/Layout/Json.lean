import Ehr.Layout.Check
import Ehr.Layout.Keyboard
namespace Ehr.Layout
open Lean

private def field [FromJson α] (j : Json) (key : String) (fallback : α) : Except String α :=
  match j.getObjVal? key with
  | .error _ => .ok fallback
  | .ok value => fromJson? value

private def sizing (j : Json) (key : String) (fallback : Sizing) : Except String Sizing := do
  let value ← field j key Json.null
  if value == Json.null then return fallback
  match value.getNat? with
  | .ok n => return .fixed n
  | .error _ =>
    match ← value.getStr? with
    | "fill" => return .fill
    | "hug" => return .hug
    | _ => throw s!"{key}: expected hug, fill or integer units"

private def tokenNat (tokens : List (String × Nat)) (j : Json) (key : String) (fallback : Nat) : Except String Nat := do
  let value ← field j key (toJson fallback)
  match value.getStr? with
  | .ok name => match tokens.lookup name with
    | some n => pure n
    | none => throw s!"{key}: unknown token {name}"
  | .error _ => fromJson? value

private def color (j : Json) (key : String) (fallback : Color) : Except String Color := do
  let value ← field j key (toJson fallback)
  match value.getStr? with
  | .ok name => match palette.lookup name with
    | some c => pure c
    | none => throw s!"{key}: unknown palette token {name}"
  | .error _ => fromJson? value

private def textSlot (j : Json) : Except String (Option TextSlot) := do
  let value ← field j "text" Json.null
  if value == Json.null then return none
  let scaleName ← field value "typeScale" "text-sm"
  let some scale := typeScale.lookup scaleName | throw s!"text.typeScale: unknown token {scaleName}"
  let font ← tokenNat fontNames value "font" 0
  return some { key := ← field value "key" "", maxLength := ← field value "maxLength" 0, maxLines := ← field value "maxLines" 1, overflow := ← field value "overflow" .wrap, safety := ← field value "safety" false, font, fontSize := ← field value "fontSize" scale.1, lineHeight := ← field value "lineHeight" scale.2 }

private def parseTracks (j : Json) : Except String (List Track) := do
  let tracks ← field j "tracks" ([] : List Json)
  tracks.mapM fun t => do
    match t.getNat? with
    | .ok n => pure (.fixed n)
    | .error _ =>
      match t.getStr? with
      | .ok value =>
        if value.endsWith "fr" then
          match (value.dropEnd 2).toString.toNat? with
          | some weight => pure (.fr weight)
          | none => throw s!"tracks: expected integer fractional weight in {value}"
        else throw s!"tracks: unknown token {value}"
      | .error _ =>
        match t.getObjValAs? Nat "fr" with
        | .ok weight => pure (.fr weight)
        | .error _ => throw "tracks: expected integer units, Nfr, or {fr: weight}"

private def style (j : Json) : Except String Style := do
  return { width := ← sizing j "width" .fill, height := ← sizing j "height" .hug,     min := ← field j "min" {}, max := ← field j "max" ⟨1000000000,1000000000⟩,     gap := ← tokenNat (spacing ++ spacing.map (fun (k,v) => ("space-"++k,v))) j "gap" 0, padding := ← tokenNat (spacing ++ spacing.map (fun (k,v) => ("space-"++k,v))) j "padding" 0,     align := ← field j "align" .start, wrap := ← field j "wrap" false,     columns := ← field j "columns" 1, tracks := ← parseTracks j, position := ← field j "position" {},     z := ← field j "z" 0, fg := ← color j "fg" {}, bg := ← color j "bg" ⟨255,255,255⟩,     radius := ← tokenNat radii j "radius" 0 }

/-- Bounded-depth total parser and component expansion. Excess depth/cycles
produce an error, never a silently missing subtree. Slots and variants expand
before layout; the resulting language has no privileged built-in components. -/
def parseNode (components slots : Json) : Nat → List Nat → Json → Except String Node
  | 0, _, _ => .error "layout/component expansion exceeds 256 levels (possible cycle)"
  | fuel+1, path, j => do
    let _ ← j.getObj?
    let tag ← j.getObjValAs? String "type"
    if tag == "Component" then
      let name ← j.getObjValAs? String "name"
      let definition ← components.getObjVal? name
      let variant ← field j "variant" "default"
      let body := ((definition.getObjVal? "variants").bind (·.getObjVal? variant)).toOption.getD definition
      let supplied ← field j "slots" (Json.mkObj [])
      return ← parseNode components supplied fuel path body
    if tag == "Slot" then
      return ← parseNode components slots fuel path (← slots.getObjVal? (← j.getObjValAs? String "name"))
    let kind ← match tag with
      | "Stack" => do
        let direction ← field j "direction" "column"
        if direction == "row" then pure (.stack .row)
        else if direction == "column" then pure (.stack .column)
        else throw "Stack.direction: expected row or column"
      | "Grid" | "InteractiveGrid" => pure .grid
      | "Absolute" => pure .absolute
      | "Scroll" => pure .scroll
      | "Frame" | "Text" | "Button" | "Rect" | "Circle" | "Wedge" | "Line" | "Polyline"
      | "Tabs" | "Dialog" | "Listbox" => pure .frame
      | _ => throw s!"unknown layout type: {tag}"
    let role := match tag with
      | "Tabs" => "tablist" | "Dialog" => "dialog" | "Listbox" => "listbox"
      | "InteractiveGrid" => "grid" | _ => ""
    let mark : Mark ← match tag with
      | "Circle" => pure .circle
      | "Wedge" => do pure <| .wedge (← field j "start" 0) (← field j "sweep" 1) (← field j "denominator" 1)
      | "Line" | "Polyline" => do pure <| .polyline (← field j "points" []) (← field j "stroke" 64)
      | _ => pure .rect
    let info : Meta := { id := ← field j "id" ("node-" ++ toString path),       source := ← field j "source" none, text := ← textSlot j,       target := ← field j "target" (tag == "Button"), banner := ← field j "banner" false,       interruptive := ← field j "interruptive" false, commit := ← field j "commit" false,       paint := ← field j "paint" (tag != "Absolute" && tag != "Stack" && tag != "Grid" && tag != "Scroll"),       role := ← field j "role" role, mark }
    let children ← field j "children" ([] : List Json)
    let kids ← children.zipIdx |>.mapM fun (child,i) => parseNode components slots fuel (path++[i]) child
    return .box kind (← style j) info kids

structure Request where
  tree : Json
  components : Json := Json.mkObj []
  content : Content := []
  expected : List (List Nat) := []
  viewport : Size := ⟨92160,57600⟩

instance : FromJson Request where
  fromJson? j := do
    return { tree := ← j.getObjVal? "tree", components := ← field j "components" (Json.mkObj []),       content := ← field j "content" [], expected := ← field j "expected" [],       viewport := ← field j "viewport" ⟨92160,57600⟩ }

/-- Runtime content failures are separate from universal slot-capacity checks;
never clip an out-of-contract value while claiming successful painting. -/
def contentErrors (data : Content) (ps : List Placed) : List Finding := ps.flatMap fun p =>
  p.info.text.toList.flatMap fun t =>
    if t.safety then [] else
    let s := (data.lookup t.key).getD ""
    (if s.toList.length > t.maxLength then
      [{ rule := "content", node := p.info.id, metric := "maxLength", actual := s.toList.length,
         required := t.maxLength, deficit := (s.toList.length : Int)-t.maxLength }] else []) ++
    ((s.toList.filter (fun c => !(supported t c))).eraseDups.map fun c =>
      { rule := "content", node := p.info.id, metric := "unsupported-font-glyph", actual := c.toNat })

theorem safety_contentErrors_empty (data : Content) (p : Placed) (t : TextSlot)
    (ht : p.info.text = some t) (hs : t.safety = true) : contentErrors data [p] = [] := by
  simp [contentErrors,ht,hs]

/-- Visible fallback diagnostics never change admission or refuse a value. -/
def realizationWarnings (drawn : List Drawn) : List Finding := drawn.flatMap fun d =>
  d.box.info.text.toList.flatMap fun t =>
    if !t.safety then [] else d.original.toList.flatMap fun s =>
      ((s.toList.filter (fun ch => !(supported t ch))).eraseDups.map fun ch =>
        { rule := "font", node := d.box.info.id, metric := "codepoint-escape", actual := ch.toNat, warning := true })

def drawnLineWidths (d : Drawn) : List Nat :=
  match d.box.info.text with
  | none => []
  | some t => d.lines.map fun s => textAdvance t s.toList

def drawnGlyphWidths (d : Drawn) : List (List Nat) :=
  match d.box.info.text with
  | none => []
  | some t => d.lines.map fun s => s.toList.map (advance t)

def lineWidths (data : Content) (p : Placed) : List Nat := drawnLineWidths (bind data p)

def paintTree (data : Content) : Tree → Json
  | ⟨p,kids⟩ => Json.mkObj [("drawn",toJson (bind data p)),
    ("children",toJson (kids.map (paintTree data)))]

def runRequest (r : Request) : Except String Json := do
  let n ← parseNode r.components (Json.mkObj []) 256 [] r.tree
  let ps := boxes r.viewport n
  let errors := contentErrors r.content ps
  return Json.mkObj [("accepted",toJson (check r.expected r.viewport ps && errors.isEmpty)),
    ("tree",paintTree r.content (layout ⟨{},r.viewport⟩ n)),
    ("viewport",toJson r.viewport), ("boxes",toJson (ps.map (bind r.content))),
    ("lineWidths",toJson (ps.map (lineWidths r.content))),
    ("findings",toJson (findings r.expected r.viewport ps ++ errors ++ realizationWarnings (ps.map (bind r.content))))]
#print axioms safety_contentErrors_empty
end Ehr.Layout
