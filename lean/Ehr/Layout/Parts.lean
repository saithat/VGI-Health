import Ehr.Layout.Range
import Ehr.Layout.Examples

/-! # Display parts are shown

New specifications for owner review. `Display` proves, for each kind of node,
that its parts carry every datum the node carries. This module connects that
to what is painted: every part of every node of a screen, at any depth, is an
occurrence of the inventory (`node_parts`), and a painting that realizes the
screen shows every occurrence completely (`Range.realized_part`). For the
clinical renderer and the fixed shell no premise is left (`render_parts_shown`).

The module is built with `ui-port-audit`; the WASM does not link it. -/
namespace Ehr.Layout.Parts
open Ehr Ehr.Render

/-- New specification for owner review: `child` under context `ccx` is a child
node of `node` under context `cx`. A value set passes its options, reference
curves their curves, and a patient pane its metadata and confirmations, to its
children, as `semanticNodes` does. -/
def ChildOf (cx : DisplayCx) (node : UiNode) (ccx : DisplayCx) (child : UiNode) : Prop :=
  match node with
  | .board _ cs | .datedTimeline _ _ _ cs | .timeline _ cs | .presentation _ cs
  | .rowAction _ _ cs | .section _ _ cs | .columns cs | .tabs _ _ _ cs =>
    child ∈ cs ∧ ccx = cx
  | .chartReferences refs cs => child ∈ cs ∧ ccx = { cx with references := refs }
  | .valueSet options custom cs => child ∈ cs ∧ ccx = cx.inValueSet options custom
  | .patientPane _ _ metadata cs modal => (child ∈ cs ∨ child ∈ modal) ∧ ccx = paneCx cx metadata cs modal
  | _ => False

/-- New specification for owner review: `sub` (under `scx`) is `node` (under
`cx`) or one of its descendants. -/
inductive Inside : DisplayCx → UiNode → DisplayCx → UiNode → Prop
  | here (cx : DisplayCx) (node : UiNode) : Inside cx node cx node
  | under {cx ccx scx : DisplayCx} {node child sub : UiNode} :
      ChildOf cx node ccx child → Inside ccx child scx sub → Inside cx node scx sub

private theorem prefixed (children : List (List Range.Entry)) (es : List Range.Entry) (member : es ∈ children)
    (path : List Nat) (part : Part) (inside : (path,part) ∈ es) :
    ∃ i, (i :: path, part) ∈ prefixChildren children := by
  obtain ⟨i, hi⟩ := List.mem_iff_getElem?.mp member
  refine ⟨i, List.mem_flatMap.mpr ⟨(es,i), List.mem_zipIdx_iff_getElem?.mpr (by simpa using hi), ?_⟩⟩
  exact List.mem_map.mpr ⟨(path,part), inside, rfl⟩

private theorem child_entries (cx ccx : DisplayCx) (node child : UiNode) (h : ChildOf cx node ccx child) :
    ∃ children : List (List Range.Entry), semanticNodes ccx child ∈ children ∧
      semanticNodes cx node = ([],ownPart cx node) :: prefixChildren (partEntries (leafParts cx node) ++ children) := by
  cases node <;> simp only [ChildOf] at h
  all_goals first
    | exact h.elim
    | (obtain ⟨member, rfl⟩ := h
       exact ⟨_, List.mem_map.mpr ⟨child, member, rfl⟩, by simp only [semanticNodes]⟩)
    | (rename_i patient banner metadata cs modal
       obtain ⟨member, rfl⟩ := h
       refine ⟨cs.map (semanticNodes (paneCx cx metadata cs modal)) ++ modal.map (semanticNodes (paneCx cx metadata cs modal)),
         ?_, by simp only [semanticNodes]⟩
       rcases member with member | member
       · exact List.mem_append_left _ (List.mem_map.mpr ⟨child, member, rfl⟩)
       · exact List.mem_append_right _ (List.mem_map.mpr ⟨child, member, rfl⟩))

/-- An occurrence of a child is an occurrence of its parent, one level down. -/
theorem child_nodes (cx ccx : DisplayCx) (node child : UiNode) (h : ChildOf cx node ccx child)
    (path : List Nat) (part : Part) (member : (path,part) ∈ semanticNodes ccx child) :
    ∃ i, (i :: path, part) ∈ semanticNodes cx node := by
  obtain ⟨children, inChildren, same⟩ := child_entries cx ccx node child h
  obtain ⟨i, hi⟩ := prefixed (partEntries (leafParts cx node) ++ children) _
    (List.mem_append_right _ inChildren) path part member
  exact ⟨i, by rw [same]; exact List.mem_cons_of_mem _ hi⟩

/-- An occurrence of a descendant is an occurrence of the node, further down. -/
theorem inside_nodes {cx scx : DisplayCx} {node sub : UiNode} (h : Inside cx node scx sub)
    (path : List Nat) (part : Part) (member : (path,part) ∈ semanticNodes scx sub) :
    ∃ pre, (pre ++ path, part) ∈ semanticNodes cx node := by
  induction h with
  | here cx node => exact ⟨[], member⟩
  | under child _ ih =>
    obtain ⟨pre, inner⟩ := ih member
    obtain ⟨i, outer⟩ := child_nodes _ _ _ _ child _ part inner
    exact ⟨i :: pre, outer⟩

/-- A node's own part and each of its display parts is one of its occurrences. -/
theorem own_nodes (cx : DisplayCx) (node : UiNode) : ([],ownPart cx node) ∈ semanticNodes cx node := by
  unfold semanticNodes
  exact List.mem_cons_self

private theorem nodes_shape (cx : DisplayCx) (node : UiNode) :
    ∃ children : List (List Range.Entry),
      semanticNodes cx node = ([],ownPart cx node) :: prefixChildren (partEntries (leafParts cx node) ++ children) :=
  ⟨_, by unfold semanticNodes; rfl⟩

theorem leaf_nodes (cx : DisplayCx) (node : UiNode) (part : Part) (member : part ∈ leafParts cx node) :
    ∃ i, ([i],part) ∈ semanticNodes cx node := by
  obtain ⟨children, shape⟩ := nodes_shape cx node
  obtain ⟨i, hi⟩ := prefixed (partEntries (leafParts cx node) ++ children) [([],part)]
    (List.mem_append_left _ (List.mem_map.mpr ⟨part, member, rfl⟩)) [] part (by simp)
  exact ⟨i, by rw [shape]; exact List.mem_cons_of_mem _ hi⟩

/-- New specification for owner review: every part of every node of a screen
is an occurrence of the semantic inventory: the own part and every display
part of each root node (navigation, workspace, side, modal, urgent strip) and
of each of their descendants, whatever the nesting. -/
theorem node_parts (screen : UiScreen) (root : UiNode) (isRoot : root ∈ screenRoots screen)
    (scx : DisplayCx) (sub : UiNode) (inside : Inside (screenCx screen) root scx sub) :
    (∃ path, (path, ownPart scx sub) ∈ screenNodes screen) ∧
    ∀ part ∈ leafParts scx sub, ∃ path, (path, part) ∈ screenNodes screen := by
  have lift (path : List Nat) (part : Part) (member : (path,part) ∈ semanticNodes scx sub) :
      ∃ full, (full, part) ∈ screenNodes screen := by
    obtain ⟨pre, inRoot⟩ := inside_nodes inside path part member
    obtain ⟨i, hi⟩ := prefixed (chromeEntries screen ++ (screenRoots screen).map (semanticNodes (screenCx screen)))
      _ (List.mem_append_right _ (List.mem_map.mpr ⟨root, isRoot, rfl⟩)) _ part inRoot
    exact ⟨_, hi⟩
  refine ⟨lift [] _ (own_nodes scx sub), ?_⟩
  intro part member
  obtain ⟨i, hi⟩ := leaf_nodes scx sub part member
  exact lift [i] part hi

/-- New specification for owner review: in any painting that realizes a
screen, every part of every node, at any depth, has a painted box that shows
its complete text under the safety-text contract. With the per-kind theorems
of `Display`, no label, value, unit, source, flag, row, cell, step or
selection of the screen is missing or abbreviated. -/
theorem realized_node_parts (screen : UiScreen) (v : Size) (painted : List Drawn)
    (realized : Realizes screen v painted) (root : UiNode) (isRoot : root ∈ screenRoots screen)
    (scx : DisplayCx) (sub : UiNode) (inside : Inside (screenCx screen) root scx sub) (part : Part)
    (member : part = ownPart scx sub ∨ part ∈ leafParts scx sub) :
    ∃ d ∈ painted, d.box.info.paint = true ∧ d.original = some part.text ∧
      ∃ t ∈ d.box.info.text, t.safety = true ∧
        d.lines = textLines t d.box.rect.w (paintText t part.text) ∧
        SafetyRealized t d.box.rect.w part.text := by
  obtain ⟨own, leaves⟩ := node_parts screen root isRoot scx sub inside
  obtain ⟨path, entry⟩ : ∃ path, (path, part) ∈ screenNodes screen := by
    rcases member with rfl | member
    · exact own
    · exact leaves part member
  obtain ⟨d, hd, _, paint, original, shown⟩ := Range.realized_part screen v painted realized path part entry
  exact ⟨d, hd, paint, original, shown⟩

/-- New specification for owner review: for any spec, program, patient facts,
display, user and state, reachable or not, and every supported viewport, the
fixed shell paints every part of the clinical screen completely. No coverage,
length or acceptance premise. -/
theorem render_parts_shown (sp : Ehr.Spec) (program : Ehr.Program) (facts : Ehr.Facts)
    (display : Display) (user : Ehr.User) (state : Ehr.State) (v : Size) (hv : v ∈ viewports) :
    ∃ painted, Range.uncheckedPaint (runRenderUi ⟨sp,program,facts,display,user,state⟩) v = some painted ∧
      ∀ path part, (path,part) ∈ screenNodes (runRenderUi ⟨sp,program,facts,display,user,state⟩) →
        ∃ d ∈ painted, d.box.info.source = some path ∧ d.box.info.paint = true ∧
          d.original = some part.text ∧
          ∃ t ∈ d.box.info.text, t.safety = true ∧
            d.lines = textLines t d.box.rect.w (paintText t part.text) ∧
            SafetyRealized t d.box.rect.w part.text := by
  obtain ⟨painted, paintedEq, realized⟩ :=
    Range.checkProgram_allStates sp program rfl facts display user state v hv
  exact ⟨painted, paintedEq, fun path part member => Range.realized_part _ v painted realized path part member⟩

/-- New specification for owner review: the review screen of `Examples` with
any banner, any table and Sign enabled or blocked with any reason is realized
by the fixed shell at every supported viewport. This is the conclusion
`layoutAccepted_reviewAllPayloads` had for the finite review family before
table cells and the blocked reason became occurrences of their own; a finite
family cannot cover tables of every size, the parameterized shell does. -/
theorem layoutAccepted_reviewAllPayloads_shell
    (banner : List (String × String)) (rows : List (List (String × String)))
    (enabled : Bool) (reason : Option String) (v : Size) (hv : v ∈ viewports) :
    ∃ painted, Range.uncheckedPaint (reviewScreen banner rows enabled reason) v = some painted ∧
      Realizes (reviewScreen banner rows enabled reason) v painted := by
  have covered : Shell.accepts (screenShape (reviewScreen banner rows enabled reason)) = true :=
    Range.smallModal_fits _ (by intro node member; simp [reviewScreen] at member)
  exact RenderFamily.sound Range.Library.fixedShell rfl _ covered v hv

#print axioms prefixed
#print axioms child_entries
#print axioms nodes_shape
#print axioms child_nodes
#print axioms inside_nodes
#print axioms own_nodes
#print axioms leaf_nodes
#print axioms node_parts
#print axioms realized_node_parts
#print axioms render_parts_shown
#print axioms layoutAccepted_reviewAllPayloads_shell
end Ehr.Layout.Parts
