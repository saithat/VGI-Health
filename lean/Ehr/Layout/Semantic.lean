import Ehr.Layout.Json
import Ehr.Layout.Display
namespace Ehr.Layout
open Lean Ehr.Render

/-- Prefix each child occurrence by its sibling ordinal. -/
def prefixChildren (children : List (List (List Nat × Part))) : List (List Nat × Part) :=
  children.zipIdx.flatMap fun (es,i) => es.map fun (path,part) => (i::path,part)

/-- A part that is one occurrence: a child without children of its own. -/
def partEntries (parts : List Part) : List (List (List Nat × Part)) := parts.map fun part => [([],part)]

/-- New specification for owner review: the occurrences of a node are its own
part, then its further display parts (`leafParts`), then its child nodes. The
children of a node are numbered in that order, so a field's control is child 0
of the field and the body of a tabs node starts after its tab targets. A value
set passes its options, and a patient pane its metadata, to the nodes inside.

Every display part is an occurrence of its own with a unique path, even when
two nodes have identical component IDs or text. -/
def semanticNodes (cx : DisplayCx) (node : UiNode) : List (List Nat × Part) :=
  ([],ownPart cx node) :: prefixChildren (partEntries (leafParts cx node) ++ (match node with
  | .board _ cs | .datedTimeline _ _ _ cs | .timeline _ cs | .presentation _ cs
  | .chartReferences _ cs | .rowAction _ _ cs | .section _ _ cs | .columns cs | .tabs _ _ _ cs =>
    cs.map (semanticNodes cx)
  | .valueSet options custom cs => cs.map (semanticNodes (cx.inValueSet options custom))
  | .patientPane _ _ metadata cs modal =>
    cs.map (semanticNodes (cx.inPane metadata)) ++ modal.map (semanticNodes (cx.inPane metadata))
  | _ => []))

/-- Components that have an explicit confirmation button. -/
def confirmComps : UiNode → List String
  | .button comp _ "confirm" _ _ _ => [comp]
  | .board _ cs | .datedTimeline _ _ _ cs | .timeline _ cs | .presentation _ cs | .valueSet _ _ cs
  | .chartReferences _ cs | .rowAction _ _ cs | .section _ _ cs | .columns cs | .tabs _ _ _ cs =>
    cs.flatMap confirmComps
  | .patientPane _ _ _ cs modal => cs.flatMap confirmComps ++ modal.flatMap confirmComps
  | _ => []

/-- New specification for owner review: the navigation as occurrences: one
wrapper, one heading per group and one target per link (a button with role
`nav`, as in `uiNavAtoms`); the active link is flagged. -/
def navNode (nav : List (String × List (String × String))) : UiNode :=
  .section "navigation" "Navigation" (nav.map fun (title,items) =>
    .section title title (items.map fun (id,label) => .button id label "nav" true none none))

/-- The nodes of a screen after the banner and the title: the navigation, the
workspace, the side nodes, the modal and the urgent strip. -/
def screenRoots (screen : UiScreen) : List UiNode :=
  navNode screen.nav :: (screen.workspace ++ screen.side ++ screen.modal.toList ++ screen.urgent?.getD [])

/-- New specification for owner review: the field metadata of a screen that
its parts display: quick picks, source captions, entry hints, the active
navigation link and the components with an explicit confirmation button. -/
def screenCx (screen : UiScreen) : DisplayCx :=
  { fieldChoices := screen.fieldChoices?.getD [], fieldSources := screen.fieldSources?.getD [],
    sourceLabels := screen.sourceLabels?.getD [], entryHints := screen.entryHints?.getD [],
    activeNav := screen.activeNav?,
    confirms := (screen.workspace ++ screen.side ++ screen.modal.toList ++ screen.urgent?.getD []).flatMap confirmComps }

/-- New specification for owner review: the first two roots are the banner
(one part: patient fields and the signed-in clinician as runs, so that rule G1
keeps all of it on screen) and the title. -/
def chromeEntries (screen : UiScreen) : List (List (List Nat × Part)) :=
  [[([],bannerPart screen.banner screen.viewer?)],[([],{ role := .title, text := screen.title })]]

/-- New specification for owner review: the semantic inventory: every part a
user sees, each with its occurrence path. The roots are the banner `[0]`, the
title `[1]`, the navigation `[2]`, then the workspace from `[3]`, the side
nodes, the modal and the urgent strip. -/
def screenNodes (screen : UiScreen) : List (List Nat × Part) :=
  prefixChildren (chromeEntries screen ++ (screenRoots screen).map (semanticNodes (screenCx screen)))

/-- Erased semantic placement class. Content, labels, values, row counts and
font glyph repertoire do not occur in the family key. UiNode structure and
current-task/interaction identity do occur in it. -/
inductive Region | banner | title | body | side | footer | modal
  /-- New specification for owner review: an occurrence of `UiScreen.urgent?`,
  the strip of active urgent alerts and their acknowledgment. -/
  | urgent
  deriving Repr, DecidableEq, Inhabited, ToJson, FromJson

structure SlotShape where
  path : List Nat
  target : Bool
  region : Region
  lines : Nat
  deriving Repr, DecidableEq, Inhabited, ToJson, FromJson

abbrev ScreenShape := List SlotShape

def sourceKey (path : List Nat) : String := "source-" ++ toString path

/-- New specification for owner review: every occurrence under a root of
`screen.urgent?` (the roots after the modal) has region `urgent`, whatever the
node is; the strip is never classified as body, side or commit. -/
def screenShape (screen : UiScreen) : ScreenShape :=
  let entries := screenNodes screen
  let commit := (entries.find? (fun e => e.2.commit)).map Prod.fst
  let sideStart := 3 + screen.workspace.length
  let modalRoot := sideStart + screen.side.length
  let urgentStart := modalRoot + screen.modal.toList.length
  entries.map fun (path,part) =>
    let rootIndex := path.head?.getD 0
    let region := if path == [0] then Region.banner else if path == [1] then .title
      else if rootIndex ≥ urgentStart then .urgent
      else if some path == commit then .footer
      else if screen.modal.isSome && path.head? == some modalRoot then .modal
      else if rootIndex == 2 || (rootIndex ≥ sideStart && rootIndex < modalRoot) then .side else .body
    ⟨path,part.target,region,part.lines⟩

def shapeSources (shape : ScreenShape) : List (List Nat) := shape.map SlotShape.path

/-- New specification for owner review: the occurrence paths of the urgent
strip, the `urgent` argument of rule G11. -/
def urgentPaths (shape : ScreenShape) : List (List Nat) :=
  (shape.filter (fun s => s.region == .urgent)).map SlotShape.path

theorem screenShape_sources (screen : UiScreen) :
    shapeSources (screenShape screen) = (screenNodes screen).map Prod.fst := by
  simp [shapeSources, screenShape, List.map_map, Function.comp_def]

/-- A family key retains arbitrary structural growth even though text/table
payload sizes are erased. This exposes the limit of finite shape enumeration. -/
def flatScreen (n : Nat) : UiScreen :=
  { banner := [], nav := [], title := "", workspace := List.replicate n (.text ""), side := [], modal := none }

theorem screenShape_flat_length (n : Nat) : (screenShape (flatScreen n)).length = 3+n := by
  have hm (part : Part) : ((List.replicate n [(([] : List Nat), part)]).zipIdx 3).map (fun a => a.fst.length) =
      List.replicate n 1 := by
    calc
      _ = (((List.replicate n [(([] : List Nat), part)]).zipIdx 3).map Prod.fst).map List.length := by
        simp only [List.map_map, Function.comp_def]
      _ = _ := by simp [List.zipIdx_map_fst]
  simp [screenShape, flatScreen, screenNodes, chromeEntries, screenRoots, navNode, prefixChildren, semanticNodes,
    partEntries, leafParts, List.length_flatMap, hm, List.sum_replicate_nat, Nat.add_comm]
  omega

/-- New specification for owner review: urgent occurrences are pinned rows
between the title and the review scroller (see the comment in the body).

W1 reference geometry, evaluated solely on the erased semantic shape.
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
  let mut urgent : List Node := []
  -- New specification for owner review: urgent occurrences are fixed 30 px
  -- rows on a 32 px pitch between the title and the review scroller, which
  -- (with the modal layer) starts below them. A shape without urgent
  -- occurrences keeps the earlier geometry exactly.
  let reserve := (shape.filter (fun s => s.region == .urgent)).length*2048
  for entry in shape do
    let id := sourceKey entry.path
    let isBanner := entry.region == .banner
    let isTitle := entry.region == .title
    let isCommit := entry.region == .footer
    let isModal := entry.region == .modal
    let isUrgent := entry.region == .urgent
    let reservedLines := if isBanner then 5 else if isTitle then 1 else if isCommit then 3 else if isModal then 2 else if isUrgent then 1 else entry.lines
    let slot : TextSlot := { key := id, maxLength := 0, maxLines := reservedLines, overflow := .scroll, safety := true, font := if isTitle then 3 else 0, fontSize := if isTitle then 1280 else 896, lineHeight := if isTitle then 1920 else 1408 }
    let m : Meta := { id, source := some entry.path, target := entry.target, commit := isCommit, banner := isBanner, interruptive := isModal, urgent := isUrgent, text := some slot }
    let s : Style := { width := .fill, height := .fixed (reservedLines*slot.lineHeight+512), bg := if isBanner then ⟨241,245,249⟩ else if isCommit then ⟨29,78,216⟩ else ⟨255,255,255⟩, z := if isModal then 100 else 0, fg := if isCommit then ⟨255,255,255⟩ else ⟨15,23,42⟩, radius := 256 }
    match entry.region with
    | .banner => banner := banner ++ [.box .frame { s with position := ⟨1024,512⟩, width := .fixed (v.w-2048) } m []]
    | .title => title := title ++ [.box .frame { s with position := ⟨20480,8192⟩, width := .fixed (v.w-21504) } m []]
    | .footer => footer := footer ++ [.box .frame { s with position := ⟨20480,(v.h : Int)-6400⟩, width := .fixed (v.w-21504) } m []]
    | .modal => modal := modal ++ [.box .frame { s with position := ⟨20480,11264 + (reserve + modal.length*3584 : Nat)⟩, width := .fixed (v.w-21504) } m []]
    | .urgent => urgent := urgent ++ [.box .frame { s with position := ⟨20480,11264 + (urgent.length*2048 : Nat)⟩, width := .fixed (v.w-21504) } m []]
    | .side => side := side ++ [.box .frame s m []]
    | .body => body := body ++ [.box .frame s m []]
  let sidebar : Node := .box .scroll
    { position := ⟨1024,8192⟩, width := .fixed 17920, height := .fixed (v.h-14592), gap := 256 }
    { id := "sidebar-viewport", paint := false } side
  let scroll : Node := .box .scroll
    { position := ⟨20480,11264 + (reserve : Nat)⟩, width := .fixed (v.w-21504), height := .fixed (v.h-19456-reserve), gap := 384 }
    { id := "review-viewport", paint := false } body
  return .box .absolute { width := .fill, height := .fill }
    { id := "signing-root", paint := false } (banner ++ [sidebar] ++ title ++ urgent ++ [scroll] ++ footer ++ modal)

def screenContent (screen : UiScreen) : Content :=
  (screenNodes screen).map fun (path,part) => (sourceKey path,part.text)

/-- The text of every occurrence, by path. -/
def sourceTable (screen : UiScreen) : List (List Nat × String) :=
  (screenNodes screen).map fun (p,part) => (p,part.text)

def sourceValue (screen : UiScreen) (path : List Nat) : String :=
  ((sourceTable screen).lookup path).getD ""

/-- New specification for owner review: the part an occurrence path displays:
its role and state, emitted with every painted box. -/
def sourcePart (screen : UiScreen) (path : List Nat) : Option Part :=
  (screenNodes screen).lookup path

/-- Semantic sources bind by tree path, independently of agent-supplied text
keys. This prevents an accepted source box from painting another slot's value. -/
def bindSemantic (screen : UiScreen) (p : Placed) : Drawn :=
  match p.info.source, p.info.text with
  | some path, some t => bind [(t.key,sourceValue screen path)] p
  | _, _ => bind [] p

/-- `bindSemantic` against a table computed once. -/
def bindTable (table : List (List Nat × String)) (p : Placed) : Drawn :=
  match p.info.source, p.info.text with
  | some path, some t => bind [(t.key,(table.lookup path).getD "")] p
  | _, _ => bind [] p

/-- All boxes of a screen, bound with one inventory traversal. -/
def bindAll (screen : UiScreen) (ps : List Placed) : List Drawn :=
  let table := sourceTable screen
  ps.map (bindTable table)

theorem bindAll_eq (screen : UiScreen) (ps : List Placed) :
    bindAll screen ps = ps.map (bindSemantic screen) := rfl

/-- New specification for owner review: the part of each box, in box order:
what the painter draws there and how. A box without a semantic source has none. -/
def boxParts (screen : UiScreen) (ps : List Placed) : List (Option Part) :=
  let inventory := screenNodes screen
  ps.map fun p => p.info.source.bind fun path => inventory.lookup path

theorem boxParts_eq (screen : UiScreen) (ps : List Placed) :
    boxParts screen ps = ps.map fun p => p.info.source.bind (sourcePart screen) := rfl

/-- New specification for owner review: the number of painted glyph cells of
each run of a part, in order. A character the font lacks is painted as its
escape, which counts all its cells; a line break paints none. A painter tags
cells by these counts and never re-reads the text. -/
def runCells (t : TextSlot) (runs : List Run) : List Nat :=
  runs.map fun run => ((textAtoms t run.text).map fun atom => (atom.ink.filter (· != '\n')).length).sum

/-- The parts of the boxes as data; a part with runs also carries `cells`. -/
def boxPartsJson (screen : UiScreen) (ps : List Placed) : Json :=
  toJson ((ps.zip (boxParts screen ps)).map fun (p,part) =>
    match part, p.info.text with
    | some part, some t =>
      if part.runs.isEmpty then toJson part else (toJson part).setObjVal! "cells" (toJson (runCells t part.runs))
    | some part, none => toJson part
    | none, _ => Json.null)

def tablePaintTree (table : List (List Nat × String)) : Tree → Json
  | ⟨p,kids⟩ => Json.mkObj [("drawn",toJson (bindTable table p)),
    ("children",toJson (kids.map (tablePaintTree table)))]

def semanticPaintTree (screen : UiScreen) (tree : Tree) : Json := tablePaintTree (sourceTable screen) tree

/-- New specification for owner review: the inventory as data: every
occurrence path with its part, in reading order. -/
def inventoryJson (screen : UiScreen) : Json :=
  toJson ((screenNodes screen).map fun (path,part) => Json.mkObj [("path",toJson path),("part",toJson part)])

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
#print axioms bindAll_eq
#print axioms boxParts_eq
#print axioms bindSemantic_box
#print axioms bindSemantic_original
#print axioms screenShape_flat_length
#print axioms screenShape_sources
#print axioms port_geometry_shape
#print axioms portAccepted_rules
end Ehr.Layout
