import Ehr.Layout.Json
import Ehr.Render.Json
namespace Ehr.Layout
open Lean Ehr.Render

/-- Prefix each child occurrence by its sibling ordinal. -/
def prefixChildren (children : List (List (List Nat × UiNode))) : List (List Nat × UiNode) :=
  children.zipIdx.flatMap fun (es,i) => es.map fun (path,node) => (i::path,node)

/-- Every UiNode occurrence, including wrappers and selected-tab bodies. Paths
identify occurrences even when two nodes have identical component IDs/text. -/
def semanticNodes (node : UiNode) : List (List Nat × UiNode) :=
  ([],node) :: (match node with
  | .board _ cs | .datedTimeline _ _ _ cs | .timeline _ cs | .presentation _ cs
  | .valueSet _ _ cs | .chartReferences _ cs | .rowAction _ _ cs
  | .section _ _ cs | .columns cs | .tabs _ _ _ cs => prefixChildren (cs.map semanticNodes)
  | .patientPane _ _ _ cs modal =>
    prefixChildren (cs.map semanticNodes ++ modal.map semanticNodes)
  | _ => [])

/-- Preserve all non-child payload in a readable slot. Container metadata is
retained as JSON where no clinical caption exists; no clinical rows are elided. -/
def semanticText : UiNode → String
  | .text s => s
  | .section _ title _ | .timeline title _ => title
  | .columns _ => ""
  | .presentation _ _ => ""
  | .tabs _ labels selected _ => String.intercalate " | " labels ++ s!" (selected {selected+1})"
  | .field _ label _ value unit provenance pending human required =>
    label ++ ": " ++ value.getD "" ++ " " ++ unit.getD "" ++ " " ++ provenance.getD "" ++
    (if pending then " — confirmation pending" else "") ++ (if human then " — human entry" else "") ++
    (if required then " — required" else "")
  | .info _ label _ _ rows => label ++ "  " ++
    String.intercalate "  " (rows.map fun row => String.intercalate " | " (row.map fun (k,v) => k ++ ": " ++ v))
  | .alert _ _ label severity => label ++ " (" ++ severity ++ ")"
  | .button _ label _ enabled reason hotkey => label ++
    (if enabled then "" else " — blocked: " ++ reason.getD "") ++ (hotkey.map ("  " ++ ·)).getD ""
  | .stepper steps current => (toJson (steps,current)).compress
  | .board urgent _ => (toJson urgent).compress
  | .datedTimeline title dated undated _ => title ++ " " ++ (toJson (dated,undated)).compress
  | .patientPane patient banner metadata _ _ => patient ++ " " ++ (toJson (banner,metadata)).compress
  | .valueSet options custom _ => (toJson (options,custom)).compress
  | .chartReferences references _ => (toJson references).compress
  | .rowAction target row _ => target ++ s!" row {row}"

def semanticTarget : UiNode → Bool
  | .button .. | .field .. => true
  | _ => false

def semanticCommit : UiNode → Bool
  | .button _ _ "primary" _ _ _ => true
  | _ => false

def screenNodes (screen : UiScreen) : List (List Nat × UiNode) :=
  prefixChildren (([UiNode.text (String.intercalate "  " (screen.banner.map fun (k,v) => k ++ ": " ++ v)),
    .text screen.title, .text (String.intercalate "  " (screen.nav.map fun (title,items) => title ++ ": " ++ String.intercalate " | " (items.map Prod.snd)))] ++ screen.workspace ++ screen.side ++
    screen.modal.toList ++ screen.urgent?.getD []).map semanticNodes)

/-- Erased semantic placement class. Content, labels, values, row counts and
font glyph repertoire do not occur in the family key. UiNode structure and
current-task/interaction identity do occur in it. -/
inductive Region | banner | title | body | side | footer | modal
  deriving Repr, DecidableEq, Inhabited, ToJson, FromJson

structure SlotShape where
  path : List Nat
  target : Bool
  region : Region
  lines : Nat
  deriving Repr, DecidableEq, Inhabited, ToJson, FromJson

abbrev ScreenShape := List SlotShape

def sourceKey (path : List Nat) : String := "source-" ++ toString path

def screenShape (screen : UiScreen) : ScreenShape :=
  let entries := screenNodes screen
  let commit := (entries.find? (fun e => semanticCommit e.2)).map Prod.fst
  let sideStart := 3 + screen.workspace.length
  let modalRoot := sideStart + screen.side.length
  entries.map fun (path,node) =>
    let rootIndex := path.head?.getD 0
    let region := if path == [0] then Region.banner else if path == [1] then .title
      else if some path == commit then .footer
      else if screen.modal.isSome && path.head? == some modalRoot then .modal
      else if rootIndex == 2 || (rootIndex ≥ sideStart && rootIndex < modalRoot) then .side else .body
    let lines := match node with
      | .section .. | .columns .. | .presentation .. | .text .. | .tabs .. => 1
      | .info .. => 3
      | _ => 2
    ⟨path,semanticTarget node,region,lines⟩

def shapeSources (shape : ScreenShape) : List (List Nat) := shape.map SlotShape.path

theorem screenShape_sources (screen : UiScreen) :
    shapeSources (screenShape screen) = (screenNodes screen).map Prod.fst := by
  simp [shapeSources, screenShape, List.map_map, Function.comp_def]

/-- A family key retains arbitrary structural growth even though text/table
payload sizes are erased. This exposes the limit of finite shape enumeration. -/
def flatScreen (n : Nat) : UiScreen :=
  { banner := [], nav := [], title := "", workspace := List.replicate n (.text ""), side := [], modal := none }

theorem screenShape_flat_length (n : Nat) : (screenShape (flatScreen n)).length = 3+n := by
  have hm : ((List.replicate n [(([] : List Nat), UiNode.text "")]).zipIdx 3).map (fun a => a.fst.length) = List.replicate n 1 := by
    calc
      _ = (((List.replicate n [(([] : List Nat), UiNode.text "")]).zipIdx 3).map Prod.fst).map List.length := by simp only [List.map_map, Function.comp_def]
      _ = _ := by simp [List.zipIdx_map_fst]
  simp [screenShape, flatScreen, screenNodes, prefixChildren, semanticNodes,
    List.length_flatMap, hm, List.sum_replicate_nat, Nat.add_comm]
  omega

/-- W1 reference geometry, evaluated solely on the erased semantic shape.
Every safety slot is an unbounded vertical text scroller; no patient string is
consulted during geometry computation. Arbitrary designs remain separate Nodes
and are admitted by the same checker through `Family`. -/
def compileShape (v : Size) (shape : ScreenShape) : Node := Id.run do
  let mut body : List Node := []
  let mut side : List Node := []
  let mut title : List Node := []
  let mut footer : List Node := []
  let mut banner : List Node := []
  let mut modal : List Node := []
  for entry in shape do
    let id := sourceKey entry.path
    let isBanner := entry.region == .banner
    let isTitle := entry.region == .title
    let isCommit := entry.region == .footer
    let isModal := entry.region == .modal
    let reservedLines := if isBanner then 5 else if isTitle then 1 else if isCommit then 3 else if isModal then 2 else entry.lines
    let slot : TextSlot := { key := id, maxLength := 0, maxLines := reservedLines, overflow := .scroll, safety := true, font := if isTitle then 3 else 0, fontSize := if isTitle then 1280 else 896, lineHeight := if isTitle then 1920 else 1408 }
    let m : Meta := { id, source := some entry.path, target := entry.target, commit := isCommit, banner := isBanner, interruptive := isModal, text := some slot }
    let s : Style := { width := .fill, height := .fixed (reservedLines*slot.lineHeight+512), bg := if isBanner then ⟨241,245,249⟩ else if isCommit then ⟨29,78,216⟩ else ⟨255,255,255⟩, z := if isModal then 100 else 0, fg := if isCommit then ⟨255,255,255⟩ else ⟨15,23,42⟩, radius := 256 }
    match entry.region with
    | .banner => banner := banner ++ [.box .frame { s with position := ⟨1024,512⟩, width := .fixed (v.w-2048) } m []]
    | .title => title := title ++ [.box .frame { s with position := ⟨20480,8192⟩, width := .fixed (v.w-21504) } m []]
    | .footer => footer := footer ++ [.box .frame { s with position := ⟨20480,(v.h : Int)-6400⟩, width := .fixed (v.w-21504) } m []]
    | .modal => modal := modal ++ [.box .frame { s with position := ⟨20480,11264 + (modal.length*3584 : Nat)⟩, width := .fixed (v.w-21504) } m []]
    | .side => side := side ++ [.box .frame s m []]
    | .body => body := body ++ [.box .frame s m []]
  let sidebar : Node := .box .scroll
    { position := ⟨1024,8192⟩, width := .fixed 17920, height := .fixed (v.h-14592), gap := 256 }
    { id := "sidebar-viewport", paint := false } side
  let scroll : Node := .box .scroll
    { position := ⟨20480,11264⟩, width := .fixed (v.w-21504), height := .fixed (v.h-19456), gap := 384 }
    { id := "review-viewport", paint := false } body
  return .box .absolute { width := .fill, height := .fill }
    { id := "signing-root", paint := false } (banner ++ [sidebar] ++ title ++ [scroll] ++ footer ++ modal)

def screenContent (screen : UiScreen) : Content :=
  (screenNodes screen).map fun (path,node) => (sourceKey path,semanticText node)

def sourceValue (screen : UiScreen) (path : List Nat) : String :=
  (((screenNodes screen).map fun (p,node) => (p,semanticText node)).lookup path).getD ""

/-- Semantic sources bind by tree path, independently of agent-supplied text
keys. This prevents an accepted source box from painting another slot's value. -/
def bindSemantic (screen : UiScreen) (p : Placed) : Drawn :=
  match p.info.source, p.info.text with
  | some path, some t => bind [(t.key,sourceValue screen path)] p
  | _, _ => bind [] p

def semanticPaintTree (screen : UiScreen) : Tree → Json
  | ⟨p,kids⟩ => Json.mkObj [("drawn",toJson (bindSemantic screen p)),
    ("children",toJson (kids.map (semanticPaintTree screen)))]

theorem bindSemantic_box (screen : UiScreen) (p : Placed) :
    (bindSemantic screen p).box = p := by
  unfold bindSemantic
  split <;> rfl

theorem bindSemantic_original (screen : UiScreen) (p : Placed) (path : List Nat) (t : TextSlot)
    (hs : p.info.source = some path) (ht : p.info.text = some t) :
    (bindSemantic screen p).original = some (sourceValue screen path) ∧
    (bindSemantic screen p).lines = textLines t p.rect.w (paintText t (sourceValue screen path)) := by
  simp [bindSemantic, hs, ht, bind]

def portScreen (v : Size) (screen : UiScreen) : Node × Content × List (List Nat) :=
  (compileShape v (screenShape screen),screenContent screen,shapeSources (screenShape screen))

theorem port_geometry_shape (v : Size) (a b : UiScreen) (same : screenShape a = screenShape b) :
    (portScreen v a).1 = (portScreen v b).1 := by simp [portScreen, same]

/-- This soundness claim is conditional on checking the generated screen. It
covers all bound content for that semantic shape; it is not an unconditional
acceptance theorem for arbitrary EHR states/programs. -/
theorem portAccepted_rules (v screen) (h : let (n,_,e) := portScreen v screen; check e v (boxes v n) = true) :
    let (n,_,e) := portScreen v screen; Rules e v (boxes v n) := by
  exact layoutAccepted_rules _ _ _ h
#print axioms bindSemantic_box
#print axioms bindSemantic_original
#print axioms screenShape_flat_length
#print axioms screenShape_sources
#print axioms port_geometry_shape
#print axioms portAccepted_rules
end Ehr.Layout
