import Ehr.Layout.Window
import Ehr.Layout.Parts

/-! # Bounded lists on the screen

New specifications for owner review. `Window` states the paging contract for
one list. This module states it for screens: why an unbounded list is bad on
the fixed shell's geometry (the certified painter of every renderer output),
that the pager's events reach the interpreter's view state and the renderer
passes it on, that the fixed shell paints every part of the windowed screen
completely (the windowed `render_parts_shown`), that every record of a paged
list is shown on its own page, and that the windowed inventory is bounded by
the screen's structure and the page sizes, whatever the record counts.

These are statements about the layout model. They do not say that a page size,
a record order or the flagged classification is clinically right. The module
is built with `ui-port-audit`; the WASM does not link it. -/
namespace Ehr.Layout.WindowProofs
open Ehr Ehr.Render Ehr.Layout.Window

/-! ## Why an unbounded list is bad

In the fixed shell every occurrence is its own 48 px row on a 56 px pitch in
one body scroller starting at 272 px (`Structural.ordinary`). -/

/-- New specification for owner review: reveal cost grows with position. Any
part of body row `i` is in the scroll window only at a scroll offset of more
than `56·i + 288 − H` px (in 1/64 px units: `3584·i + 18432 − H`), where `H` is
the viewport height. The offset grows linearly with the row. -/
theorem shell_reveal_offset (v : Size) (hv : v ∈ viewports) (path : List Nat) (target : Bool) (i : Nat)
    (o : Int) (inView : InWindow (Structural.clipRect v) o (Structural.ordinary v path target i)) :
    (3584 * i + 18432 : Int) - v.h < o := by
  have big : 51200 ≤ v.h := by
    simp only [viewports, List.mem_cons, List.not_mem_nil, or_false] at hv
    rcases hv with rfl | rfl | rfl <;> decide
  simp only [InWindow, Structural.ordinary, Structural.clipRect, Rect.bottom, Rect.right] at inView
  omega

/-- New specification for owner review: scrolling in steps of at most `s` needs
at least `o / s` steps to reach offset `o`. -/
theorem scroll_steps (steps : List Int) (s : Int) (bounded : ∀ d ∈ steps, d ≤ s) :
    steps.sum ≤ steps.length * s := by
  induction steps with
  | nil => simp
  | cons d rest ih =>
    simp only [List.sum_cons, List.length_cons]
    have h1 := bounded d List.mem_cons_self
    have h2 := ih (fun e he => bounded e (List.mem_cons_of_mem _ he))
    have cast : ((rest.length + 1 : Nat) : Int) = (rest.length : Int) + 1 := by omega
    rw [cast, Int.add_mul, Int.one_mul]
    omega

/-- New specification for owner review: a body row at index 15 or later lies
entirely outside the first viewport at every supported viewport (no pixel of
it meets the body scroller at rest). -/
theorem shell_buried_row (v : Size) (hv : v ∈ viewports) (path : List Nat) (target : Bool) (i : Nat)
    (far : 15 ≤ i) : ¬ AtRest v (Structural.ordinary v path target i) := by
  have small : v.h ≤ 69120 := by
    simp only [viewports, List.mem_cons, List.not_mem_nil, or_false] at hv
    rcases hv with rfl | rfl | rfl <;> decide
  have big : 51200 ≤ v.h := by
    simp only [viewports, List.mem_cons, List.not_mem_nil, or_false] at hv
    rcases hv with rfl | rfl | rfl <;> decide
  intro rest
  have clip := rest.2 ("0", Structural.clipRect v) (by simp [Structural.ordinary])
  simp only [Meets, Structural.ordinary, Structural.clipRect, Rect.bottom, Rect.right] at clip
  omega

/-- New specification for owner review: a screen holding one list. -/
def listScreen (rows : List (List (String × String))) : UiScreen :=
  { banner := [], nav := [], title := "Results", side := [], modal := none,
    workspace := [.info "results" "Results" "results" "table" rows] }

theorem prefixChildren_length (children : List (List (List Nat × Part))) :
    (prefixChildren children).length = (children.map List.length).sum := by
  unfold prefixChildren
  rw [List.length_flatMap]
  have same : (children.zipIdx.map fun (x : List (List Nat × Part) × Nat) =>
      (match x with | (es, i) => es.map fun (pp : List Nat × Part) => match pp with | (path, part) => (i :: path, part)).length) =
      (children.zipIdx.map Prod.fst).map List.length := by
    rw [List.map_map]; congr 1; funext x; cases x; simp
  rw [same, List.zipIdx_map_fst]

private theorem partEntries_length (parts : List Part) : ((partEntries parts).map List.length).sum = parts.length := by
  induction parts with
  | nil => rfl
  | cons p rest ih =>
    show (1 :: (partEntries rest).map List.length).sum = rest.length + 1
    rw [List.sum_cons, ih]; omega

/-- An occurrence's own part and display parts are occurrences of their own. -/
theorem semanticNodes_length (cx : DisplayCx) (node : UiNode) :
    1 + (leafParts cx node).length ≤ (semanticNodes cx node).length := by
  obtain ⟨kids, shape⟩ : ∃ kids : List (List (List Nat × Part)),
      semanticNodes cx node = ([],ownPart cx node) :: prefixChildren (partEntries (leafParts cx node) ++ kids) :=
    ⟨_, by unfold semanticNodes; rfl⟩
  rw [shape, List.length_cons, prefixChildren_length, List.map_append, List.sum_append, partEntries_length]
  omega

private theorem length_le_sum {β : Type} (l : List β) (f : β → Nat) (h : ∀ x ∈ l, 1 ≤ f x) :
    l.length ≤ (l.map f).sum := by
  induction l with
  | nil => simp
  | cons x rest ih =>
    simp only [List.length_cons, List.map_cons, List.sum_cons]
    have := h x List.mem_cons_self
    have := ih (fun y hy => h y (List.mem_cons_of_mem _ hy))
    omega

private theorem length_le_flatMap {β γ : Type} (l : List β) (g : β → List γ) (h : ∀ x ∈ l, 1 ≤ (g x).length) :
    l.length ≤ (l.flatMap g).length := by
  induction l with
  | nil => simp
  | cons x rest ih =>
    simp only [List.flatMap_cons, List.length_append, List.length_cons]
    have := h x List.mem_cons_self
    have := ih (fun y hy => h y (List.mem_cons_of_mem _ hy))
    omega

/-- A list of records, each with a cell, has at least one part per record. -/
theorem infoParts_length (infoId display : String) (rows : List (List (String × String)))
    (cells : ∀ row ∈ rows, row ≠ []) : rows.length ≤ (infoParts infoId display rows).length := by
  have nonempty : ∀ x ∈ rows.zipIdx, 1 ≤ x.1.length := by
    intro x hx
    have := cells x.1 (List.mem_of_getElem? (List.mem_zipIdx_iff_getElem?.mp hx))
    cases hrow : x.1 with
    | nil => exact absurd hrow this
    | cons => simp
  unfold infoParts
  split
  · rename_i empty; simp at empty; simp [empty]
  · split
    · calc rows.length = rows.zipIdx.length := List.length_zipIdx.symm
        _ ≤ _ := length_le_flatMap _ _ ?_
        _ ≤ _ := (List.sublist_append_right _ _).length_le
      intro x hx
      cases x with
      | mk row r =>
        have := nonempty (row, r) hx
        simpa using this
    · calc rows.length = rows.zipIdx.length := List.length_zipIdx.symm
        _ ≤ _ := length_le_flatMap _ _ ?_
      intro x hx
      cases x with
      | mk row r =>
        have one := nonempty (row, r) hx
        have := length_le_flatMap row.zipIdx (fun (pair : (String × String) × Nat) =>
          match pair with | (cell, c) => [labelCell r c cell.1, valueCell infoId row r c cell]) (fun _ _ => by simp)
        simp only [List.length_zipIdx] at this one
        exact Nat.le_trans one this

/-- New specification for owner review: screen size is unbounded in the data.
The inventory of a screen holding one list has at least one occurrence per
record, whatever the record count; checking and painting work with it. -/
theorem inventory_unbounded (rows : List (List (String × String))) (cells : ∀ row ∈ rows, row ≠ []) :
    rows.length ≤ (screenNodes (listScreen rows)).length := by
  have root := semanticNodes_length (screenCx (listScreen rows)) (.info "results" "Results" "results" "table" rows)
  have parts := infoParts_length "results" "table" rows cells
  simp only [leafParts, List.length_append] at root
  simp only [screenNodes, screenRoots, listScreen, prefixChildren_length, List.map_append, List.map_cons,
    List.map_nil, List.sum_append, List.sum_cons, List.sum_nil, List.append_nil, List.nil_append,
    Option.toList, Option.getD] at *
  omega

/-- The fixed shell gives every body occurrence its own row: a shape it accepts
has a body row at every index up to its length less ten (the banner, the
commit, two modal and six strip occurrences). -/
theorem shell_deep_row (v : Size) (shape : ScreenShape) (fits : Shell.accepts shape = true) (i : Nat)
    (deep : i + 10 < shape.length) :
    ∃ path target, Structural.ordinary v path target i ∈ Shell.classBoxes v shape := by
  have f : Shell.Fits shape := of_decide_eq_true fits
  obtain ⟨good, perm, _⟩ := f
  have len := perm.length_eq
  have modal := good.2.2.2.2.2.1
  have strip := good.2.2.2.2.2.2.2.1
  simp only [Shell.Parts.slots, List.length_cons, List.length_append] at len
  have commit : ((Shell.splitShape shape).commit.toList).length ≤ 1 := by
    cases (Shell.splitShape shape).commit <;> simp
  have body : i < (Shell.splitShape shape).bodyData.length := by
    simp only [Shell.Parts.bodyData, List.length_map]
    simp only [Shell.stripCapacity] at strip
    omega
  refine ⟨((Shell.splitShape shape).bodyData[i]).1, ((Shell.splitShape shape).bodyData[i]).2, ?_⟩
  unfold Shell.classBoxes Shell.placements
  apply List.mem_append_left
  unfold Structural.placements
  apply List.mem_cons_of_mem; apply List.mem_cons_of_mem
  apply List.mem_map.mpr
  exact ⟨((Shell.splitShape shape).bodyData[i], i), List.mem_zipIdx_iff_getElem?.mpr (by simp [body]), rfl⟩

/-- New specification for owner review: reveal cost has no bound independent
of the record count. For every bound `B` there is a list whose fixed-shell
painting has a body row that is in view only at a scroll offset beyond `B`. -/
theorem reveal_unbounded (v : Size) (hv : v ∈ viewports) (B : Int) :
    ∃ rows : List (List (String × String)), ∃ path target i,
      Structural.ordinary v path target i ∈ Shell.classBoxes v (screenShape (listScreen rows)) ∧
      ∀ o, InWindow (Structural.clipRect v) o (Structural.ordinary v path target i) → B < o := by
  let n := B.toNat + v.h + 11
  let rows := List.replicate n [("Value", "1")]
  have cells : ∀ row ∈ rows, row ≠ [] := by
    intro row hrow; rw [List.eq_of_mem_replicate hrow]; simp
  have many : n ≤ (screenShape (listScreen rows)).length := by
    rw [← List.length_map (f := SlotShape.path), ← shapeSources, screenShape_sources, List.length_map]
    simpa [rows] using inventory_unbounded rows cells
  have fits : Shell.accepts (screenShape (listScreen rows)) = true :=
    Range.smallModal_fits _ (by intro node member; simp [listScreen] at member)
  obtain ⟨path, target, box⟩ := shell_deep_row v _ fits (n - 11) (by omega)
  refine ⟨rows, path, target, n - 11, box, fun o inView => ?_⟩
  have := shell_reveal_offset v hv path target (n - 11) o inView
  have : (n - 11 : Nat) = B.toNat + v.h := by omega
  have hB : B ≤ (B.toNat : Int) := Int.self_le_toNat B
  omega

/-- New specification for owner review: the witness list of the buried-record
statement: sixteen records, each flagged high. -/
def buriedScreen : UiScreen := listScreen (List.replicate 16 [("Flag", "H")])

set_option maxRecDepth 100000 in
set_option maxHeartbeats 4000000 in
set_option cbv.maxSteps 4000000 in
theorem buried_flagged : ((screenNodes buriedScreen).lookup [3, 16]).map
    (fun p => p.role == .badge && p.tone == "high" && p.row == some 15) = some true ∧
    flaggedRow [("Flag", "H")] = true := by
  decide_cbv

set_option maxRecDepth 100000 in
set_option maxHeartbeats 4000000 in
set_option cbv.maxSteps 4000000 in
theorem buried_rows : viewports.all (fun v => (Shell.classBoxes v (screenShape buriedScreen)).any
    (fun p => p.info.source == some [3, 16] && !decide (AtRest v p))) = true := by
  decide_cbv

/-- New specification for owner review: without a bound a flagged record can
be buried. At every supported viewport the fixed shell paints the last record
of `buriedScreen`, flagged high, in a body row entirely outside the first
viewport: no pixel of it meets the body scroller at rest. -/
theorem critical_buried (v : Size) (hv : v ∈ viewports) :
    ∃ p ∈ Shell.classBoxes v (screenShape buriedScreen), p.info.source = some [3, 16] ∧ ¬ AtRest v p ∧
      ∃ part, (screenNodes buriedScreen).lookup [3, 16] = some part ∧ part.role = .badge ∧ part.tone = "high" := by
  have all := List.all_eq_true.mp buried_rows v hv
  obtain ⟨p, member, hp⟩ := List.any_eq_true.mp all
  simp only [Bool.and_eq_true, beq_iff_eq, Bool.not_eq_true', decide_eq_false_iff_not] at hp
  obtain ⟨part, found, flags⟩ := Option.map_eq_some_iff.mp buried_flagged.1
  simp only [Bool.and_eq_true, beq_iff_eq] at flags
  exact ⟨p, member, hp.1, hp.2, part, found, flags.1.1, flags.1.2⟩

/-! ## The pager's events and the view state -/

/-- New specification for owner review: the pager's event goes through the
interpreter's event path. For a shown list component and no open popup, the
human event `selectTab comp p` is applied and selects page `p`; only the view
state changes. -/
theorem selectTab_selects_page (sp : Spec) (prog : Program) (facts : Facts) (user : User) (s : State)
    (comp : CompId) (p : Nat) (c : Component) (shown : shownComp? sp prog facts s comp = some c)
    (list : (∃ i, c.kind = .panel i) ∨ (∃ i, c.kind = .table i) ∨ (∃ i, c.kind = .trend i) ∨
      (∃ i, c.kind = .priorAuth i))
    (noPopup : s.popup? = none) :
    step sp prog facts user .human s (.selectTab comp p) =
      ({ s with tabSel := (comp, p) :: s.tabSel.filter (·.1 != comp) }, .ok) ∧
    State.tabOf { s with tabSel := (comp, p) :: s.tabSel.filter (·.1 != comp) } comp = p := by
  constructor
  · rcases list with ⟨i, hk⟩ | ⟨i, hk⟩ | ⟨i, hk⟩ | ⟨i, hk⟩ <;>
      simp [step, stepCore, noPopup, stepEvent, selectTabCore, shown, hk]
  · simp [State.tabOf]

/-- New specification for owner review: the same guard as every other event:
while a popup is open the pager's event is refused. -/
theorem selectTab_blocked (sp : Spec) (prog : Program) (facts : Facts) (user : User) (s : State)
    (comp : CompId) (p : Nat) (popup : s.popup?.isSome = true) :
    (step sp prog facts user .human s (.selectTab comp p)).2 = .blocked "popup: acknowledge the alert first" := by
  simp [step, stepCore, popup, Event.isAck]

private theorem lookup_of_graph {κ : Type} [BEq κ] [LawfulBEq κ] (f : κ → Nat) :
    ∀ (l : List (κ × Nat)) (key : κ), (∀ e ∈ l, e.2 = f e.1) → (∃ e ∈ l, e.1 = key) →
      l.lookup key = some (f key)
  | [], _, _, ⟨_, h, _⟩ => by simp at h
  | (k, v) :: rest, key, graph, found => by
    by_cases same : key = k
    · subst same
      simp only [List.lookup, beq_self_eq_true]
      exact congrArg some (graph (key, v) List.mem_cons_self)
    · have tail : ∃ e ∈ rest, e.1 = key := by
        obtain ⟨e, he, ek⟩ := found
        rcases List.mem_cons.mp he with rfl | h
        · exact absurd ek.symm same
        · exact ⟨e, h, ek⟩
      have hb : (key == k) = false := by simp [same]
      simp only [List.lookup, hb]
      exact lookup_of_graph f rest key (fun e he => graph e (List.mem_cons_of_mem _ he)) tail

/-- New specification for owner review: the renderer passes the view state on.
For a shown list component on page `p ≠ 0`, the rendered screen asks for page `p`. -/
theorem uiPages_asks (cx : Ctx) (it : ItemView) (member : it ∈ cx.v.items) (shown : it.shown = true)
    (list : (∃ i, it.comp.kind = .panel i) ∨ (∃ i, it.comp.kind = .table i) ∨ (∃ i, it.comp.kind = .trend i) ∨
      (∃ i, it.comp.kind = .priorAuth i))
    (nonzero : cx.s.tabOf it.comp.id ≠ 0) :
    ((uiPages cx).getD []).lookup it.comp.id = some (cx.s.tabOf it.comp.id) := by
  have key : ∀ l : List (CompId × Nat), (∀ e ∈ l, e.2 = cx.s.tabOf e.1) →
      (it.comp.id, cx.s.tabOf it.comp.id) ∈ l →
      ((if l.isEmpty then none else some l).getD []).lookup it.comp.id = some (cx.s.tabOf it.comp.id) := by
    intro l graph entry
    cases l with
    | nil => cases entry
    | cons x xs => exact lookup_of_graph (fun c => cx.s.tabOf c) (x :: xs) _ graph ⟨_, entry, rfl⟩
  simp only [uiPages]
  apply key
  · intro e he
    obtain ⟨jt, _, hj⟩ := List.mem_filterMap.mp he
    split at hj <;> (try split at hj) <;> (cases hj) <;> rfl
  · apply List.mem_filterMap.mpr
    refine ⟨it, member, ?_⟩
    rcases list with ⟨i, hk⟩ | ⟨i, hk⟩ | ⟨i, hk⟩ | ⟨i, hk⟩ <;> simp [hk, shown, nonzero]

/-- The urgent strip keeps the rendered pages. -/
theorem withUrgentStrip_pages (sp : Spec) (facts : Facts) (user : User) (s : State) (base : UiScreen) :
    (withUrgentStrip sp facts user s base).pages? = base.pages? := rfl

/-! ## The fixed shell paints the windowed screen completely -/

theorem windowScreen_modal (cfg : Config) (screen : UiScreen) : (windowScreen cfg screen).modal = screen.modal := by
  unfold windowScreen
  by_cases h : cfg.enabled
  · simp only [h, Bool.not_true, Bool.false_eq_true, ↓reduceIte]
  · simp [h]

theorem window_smallModal (cfg : Config) (sp : Ehr.Spec) (program : Ehr.Program) (facts : Ehr.Facts)
    (display : Display) (user : Ehr.User) (state : Ehr.State) :
    Range.SmallModal (windowScreen cfg (runRenderUi ⟨sp,program,facts,display,user,state⟩)) := by
  intro node member
  rw [windowScreen_modal] at member
  exact Range.render_modal_small sp program facts display user state node member _

/-- New specification for owner review: `Parts.render_parts_shown` for the
windowed screen. For any spec, program, patient, display, user and state, and
every supported viewport, the fixed shell paints the screen as the window shows
it, realizes it (G1–G9 and the complete source values), and every part of its
inventory, the pager's parts included, has a painted box showing its complete
text. No coverage, length or acceptance premise. -/
theorem render_window_parts_shown (cfg : Config) (sp : Ehr.Spec) (program : Ehr.Program) (facts : Ehr.Facts)
    (display : Display) (user : Ehr.User) (state : Ehr.State) (v : Size) (hv : v ∈ viewports) :
    ∃ painted, Range.uncheckedPaint (windowScreen cfg (runRenderUi ⟨sp,program,facts,display,user,state⟩)) v =
        some painted ∧
      Realizes (windowScreen cfg (runRenderUi ⟨sp,program,facts,display,user,state⟩)) v painted ∧
      ∀ path part, (path,part) ∈ screenNodes (windowScreen cfg (runRenderUi ⟨sp,program,facts,display,user,state⟩)) →
        ∃ d ∈ painted, d.box.info.source = some path ∧ d.box.info.paint = true ∧
          d.original = some part.text ∧
          ∃ t ∈ d.box.info.text, t.safety = true ∧
            d.lines = textLines t d.box.rect.w (paintText t part.text) ∧
            SafetyRealized t d.box.rect.w part.text := by
  have covered := Range.smallModal_fits _ (window_smallModal cfg sp program facts display user state)
  obtain ⟨painted, eq, realized⟩ := RenderFamily.sound Range.Library.fixedShell rfl _ covered v hv
  exact ⟨painted, eq, realized, fun path part member => Range.realized_part _ v painted realized path part member⟩

/-! ## Every record is shown on its own page -/

/-- The children of a container that a window descends into (not a board or a
patient pane). -/
def containerChildren : UiNode → List UiNode
  | .datedTimeline _ _ _ cs | .timeline _ cs | .presentation _ cs | .valueSet _ _ cs
  | .chartReferences _ cs | .rowAction _ _ cs | .section _ _ cs | .columns cs | .tabs _ _ _ cs => cs
  | _ => []

/-- New specification for owner review: `sub` is `node` or nested in it through
containers, not through a board or a patient pane. -/
inductive Reach : UiNode → UiNode → Prop
  | here (node : UiNode) : Reach node node
  | step {node child sub : UiNode} : child ∈ containerChildren node → Reach child sub → Reach node sub

private theorem window_child (cfg : Config) (e : String → String → Bool) (a : String → Nat)
    (cx : DisplayCx) (node child : UiNode) (member : child ∈ containerChildren node) :
    ∃ ccx, Parts.ChildOf cx (windowNode cfg e a node) ccx (windowNode cfg e a child) := by
  cases node <;> simp only [containerChildren, List.not_mem_nil] at member
  all_goals first
    | exact ⟨_, by simp only [windowNode, Parts.ChildOf]; exact ⟨List.mem_map.mpr ⟨child, member, rfl⟩, rfl⟩⟩

/-- A window keeps every nested list reachable, through windowed containers. -/
theorem window_inside (cfg : Config) (e : String → String → Bool) (a : String → Nat) {node sub : UiNode}
    (reach : Reach node sub) : ∀ cx, ∃ scx, Parts.Inside cx (windowNode cfg e a node) scx (windowNode cfg e a sub) := by
  induction reach with
  | here node => intro cx; exact ⟨cx, .here _ _⟩
  | step member _ ih =>
    intro cx
    obtain ⟨ccx, child⟩ := window_child cfg e a cx _ _ member
    obtain ⟨scx, inside⟩ := ih ccx
    exact ⟨scx, .under child inside⟩

/-- A paged list nested in a node gives that node a window. -/
theorem windowsOf_reach (cfg : Config) (e : String → String → Bool) (a : String → Nat) {node sub : UiNode}
    (reach : Reach node sub) (comp label infoId display : String) (rows : List (List (String × String)))
    (isList : sub = .info comp label infoId display rows) (h : paged cfg e comp infoId rows = true) :
    windowOf cfg comp rows (a comp) ∈ windowsOf cfg e a node := by
  induction reach with
  | here node => subst isList; simp [windowsOf, h]
  | @step node child sub member _ ih =>
    have inner := ih isList
    cases node <;> simp only [containerChildren, List.not_mem_nil] at member
    all_goals first
      | (simp only [windowsOf]; exact List.mem_flatMap.mpr ⟨child, member, inner⟩)

theorem askPage_eligible (screen : UiScreen) (comp : String) (p : Nat) :
    eligibleIn (askPage screen comp p) = eligibleIn screen := rfl

theorem askPage_asked (screen : UiScreen) (comp : String) (p : Nat) :
    askedIn (askPage screen comp p) comp = p := by
  simp [askedIn, askPage, List.lookup]

/-- New specification for owner review: nothing is lost by paging. For every
paged list of a screen's workspace or side (outside a board or a patient pane),
every record `i` and every cell of it: when the view state asks for the record's
page `i / k`, the windowed inventory has the cell as a display part at row
`i % k` and its column, with the record's complete value. With
`render_window_parts_shown` it is painted in full. -/
theorem window_record_shown (cfg : Config) (enabled : cfg.enabled = true) (screen : UiScreen) (root : UiNode)
    (isRoot : root ∈ screen.workspace ∨ root ∈ screen.side)
    (comp label infoId display : String) (rows : List (List (String × String)))
    (reach : Reach root (.info comp label infoId display rows))
    (h : paged cfg (eligibleIn screen) comp infoId rows = true)
    (i : Nat) (row : List (String × String)) (hi : rows[i]? = some row)
    (c : Nat) (cell : String × String) (hc : row[c]? = some cell) :
    ∃ path p, (path, p) ∈ screenNodes (windowScreen cfg (askPage screen comp (i / cfg.sizeOf comp))) ∧
      p.row = some (i % cfg.sizeOf comp) ∧ p.col = some c ∧ p.raw = cell.2 ∧
      p.text = Format.cellText infoId row cell.1 cell.2 := by
  generalize hA : askPage screen comp (i / cfg.sizeOf comp) = asked
  have hAsked : askedIn asked comp = i / cfg.sizeOf comp := by rw [← hA]; exact askPage_asked _ _ _
  have hElig : eligibleIn asked = eligibleIn screen := by rw [← hA]; rfl
  have hWork : asked.workspace = screen.workspace := by rw [← hA]; rfl
  have hSide : asked.side = screen.side := by rw [← hA]; rfl
  have hPaged : paged cfg (eligibleIn asked) comp infoId rows = true := by rw [hElig]; exact h
  have win : windowOf cfg comp rows (askedIn asked comp) ∈
      (asked.workspace ++ asked.side).flatMap (windowsOf cfg (eligibleIn asked) (askedIn asked)) :=
    List.mem_flatMap.mpr ⟨root, by rw [hWork, hSide]; rcases isRoot with r | r <;> simp [r],
      windowsOf_reach cfg _ _ reach comp label infoId display rows rfl hPaged⟩
  have nonempty : ((asked.workspace ++ asked.side).flatMap
      (windowsOf cfg (eligibleIn asked) (askedIn asked))).isEmpty = false := by
    cases hw : (asked.workspace ++ asked.side).flatMap (windowsOf cfg (eligibleIn asked) (askedIn asked)) with
    | nil => rw [hw] at win; cases win
    | cons => rfl
  have shape : windowScreen cfg asked =
      { asked with workspace := asked.workspace.map (windowNode cfg (eligibleIn asked) (askedIn asked)),
                   side := asked.side.map (windowNode cfg (eligibleIn asked) (askedIn asked)),
                   windows? := some ((asked.workspace ++ asked.side).flatMap
                     (windowsOf cfg (eligibleIn asked) (askedIn asked))) } := by
    unfold windowScreen
    simp only [enabled, Bool.not_true, Bool.false_eq_true, ↓reduceIte, nonempty]
  obtain ⟨scx, inside⟩ := window_inside cfg (eligibleIn asked) (askedIn asked) reach
    (screenCx (windowScreen cfg asked))
  have rootMember : windowNode cfg (eligibleIn asked) (askedIn asked) root ∈ screenRoots (windowScreen cfg asked) := by
    rw [shape]
    rw [← hWork, ← hSide] at isRoot
    rcases isRoot with r | r
    · exact List.mem_cons_of_mem _ (List.mem_append_left _ (List.mem_append_left _ (List.mem_append_left _
        (List.mem_map.mpr ⟨root, r, rfl⟩))))
    · exact List.mem_cons_of_mem _ (List.mem_append_left _ (List.mem_append_left _ (List.mem_append_right _
        (List.mem_map.mpr ⟨root, r, rfl⟩))))
  obtain ⟨_, leaves⟩ := Parts.node_parts _ _ rootMember scx _ inside
  obtain ⟨p, member, prow, pcol, praw, ptext, _⟩ :=
    record_shown cfg scx (eligibleIn asked) (askedIn asked) comp label infoId display rows hPaged i row hi hAsked c cell hc
  obtain ⟨path, entry⟩ := leaves p member
  exact ⟨path, p, entry, prow, pcol, praw, ptext⟩

/-! ## The windowed inventory does not grow with the records

New specifications for owner review. A paged list's display parts are its
window parts (six, whatever its records) and the cells of the page shown; rich
presentations over it (a trend, a time grid, cards) read the same page. So the
windowed inventory depends on the pages shown, not on how many records each
list has: records outside the shown pages change the window's numbers (the
position, the page count, the flagged count), never the number of parts. -/

private theorem sum_mul {α : Type} (cs : List α) (h : α → Nat) (C : Nat) :
    (cs.map fun c => h c * C).sum = (cs.map h).sum * C := by
  induction cs with
  | nil => simp
  | cons c rest ih => simp only [List.map_cons, List.sum_cons, ih, Nat.add_mul]

private theorem sum_le_mul {β : Type} (l : List β) (f : β → Nat) (W : Nat) (h : ∀ x ∈ l, f x ≤ W) :
    (l.map f).sum ≤ l.length * W := by
  induction l with
  | nil => simp
  | cons x rest ih =>
    simp only [List.map_cons, List.sum_cons, List.length_cons, Nat.succ_mul]
    have := h x List.mem_cons_self
    have := ih (fun y hy => h y (List.mem_cons_of_mem _ hy))
    omega

theorem windowParts_length (cx : DisplayCx) (comp : String) : (windowParts cx comp).length ≤ 6 := by
  unfold windowParts; split <;> simp [pagerParts]

/-- A list's parts: at most two per cell, and one when it is empty. -/
theorem infoParts_length_le (infoId display : String) (rows : List (List (String × String))) (W : Nat)
    (widths : ∀ row ∈ rows, row.length ≤ W) :
    (infoParts infoId display rows).length ≤ 1 + 2 * (rows.length * W) := by
  have cellsum : (rows.zipIdx.map fun (x : List (String × String) × Nat) => x.1.length).sum ≤ rows.length * W := by
    have := sum_le_mul rows.zipIdx (fun x => x.1.length) W (fun x hx =>
      widths x.1 (List.mem_of_getElem? (List.mem_zipIdx_iff_getElem?.mp hx)))
    simpa using this
  unfold infoParts
  split
  · unfold optionList; split <;> simp
  · rename_i nonempty
    have pos : 0 < rows.length := by
      cases rows with
      | nil => simp at nonempty
      | cons => simp
    split
    · rw [List.length_append, List.length_map, List.length_zipIdx, List.length_flatMap]
      have head : (rows.headD []).length ≤ W := by
        cases rows with
        | nil => simp
        | cons r rest => exact widths r List.mem_cons_self
      have same : (rows.zipIdx.map fun (x : List (String × String) × Nat) =>
          (match x with | (row, r) => row.zipIdx.map fun (y : (String × String) × Nat) =>
            match y with | (cell, c) => valueCell infoId row r c cell).length) =
          rows.zipIdx.map fun (x : List (String × String) × Nat) => x.1.length := by
        congr 1; funext x; cases x; simp
      rw [same]
      have := Nat.le_mul_of_pos_left W pos
      omega
    · rw [List.length_flatMap]
      have same : (rows.zipIdx.map fun (x : List (String × String) × Nat) =>
          (match x with | (row, r) => row.zipIdx.flatMap fun (y : (String × String) × Nat) =>
            match y with | (cell, c) => [labelCell r c cell.1, valueCell infoId row r c cell]).length) =
          rows.zipIdx.map fun (x : List (String × String) × Nat) => 2 * x.1.length := by
        congr 1; funext x; cases x with
        | mk row r =>
          simp only [List.length_flatMap, List.length_cons, List.length_nil]
          have := sum_mul row.zipIdx (fun _ => 1) 2
          simp only [Nat.one_mul] at this
          rw [this]
          have : (row.zipIdx.map fun (_ : (String × String) × Nat) => 1).sum = row.length := by
            have := sum_le_mul row.zipIdx (fun _ => 1) 1 (fun _ _ => Nat.le_refl 1)
            have := length_le_sum row.zipIdx (fun _ => 1) (fun _ _ => Nat.le_refl 1)
            simp only [List.length_zipIdx, Nat.mul_one] at *
            omega
          simp only [this]; omega
      rw [same]
      have := sum_mul rows.zipIdx (fun x => x.1.length) 2
      rw [show (rows.zipIdx.map fun (x : List (String × String) × Nat) => 2 * x.1.length) =
        rows.zipIdx.map (fun x => x.1.length * 2) by congr 1; funext x; omega, this]
      omega

theorem info_length (cx : DisplayCx) (comp label infoId display : String) (rows : List (List (String × String))) :
    (semanticNodes cx (.info comp label infoId display rows)).length =
      1 + (windowParts cx comp).length + (infoParts infoId display rows).length := by
  simp only [semanticNodes, leafParts, List.length_cons, prefixChildren_length, List.append_nil,
    partEntries_length, List.length_append]
  omega

/-- A context's window parts: six for a list it pages, none otherwise. -/
theorem windowParts_count (cx : DisplayCx) (comp : String) :
    (windowParts cx comp).length = if (cx.windows.map (·.comp)).contains comp then 6 else 0 := by
  unfold windowParts
  split
  · rename_i w found
    have sat := List.find?_some found
    have member := List.mem_of_find?_eq_some found
    simp only [beq_iff_eq] at sat
    have hc : (cx.windows.map (·.comp)).contains comp = true :=
      List.elem_eq_true_of_mem (List.mem_map.mpr ⟨w, member, sat⟩)
    rw [if_pos hc]; rfl
  · rename_i none
    have absent : (cx.windows.map (·.comp)).contains comp = false := by
      apply Bool.eq_false_iff.mpr
      intro hc
      obtain ⟨w, member, rfl⟩ := List.mem_map.mp (List.elem_iff.mp hc)
      exact absurd (by simp : (w.comp == w.comp) = true) (List.find?_eq_none.mp none w member)
    rw [if_neg (by rw [absent]; exact Bool.false_ne_true)]; rfl

private theorem sum_congr (cs : List UiNode) (f g : UiNode → Nat) (h : ∀ c ∈ cs, f c = g c) :
    (cs.map f).sum = (cs.map g).sum := by
  rw [List.map_congr_left h]

/-- New specification for owner review: under two contexts whose windows name
the same lists, a node has the same number of occurrences, whatever the
windows' numbers (positions, page counts, flagged counts). -/
theorem windows_length (node : UiNode) : ∀ (cx : DisplayCx) (ws : List UiWindow),
    ws.map (·.comp) = cx.windows.map (·.comp) →
    (semanticNodes { cx with windows := ws } node).length = (semanticNodes cx node).length := by
  induction node using UiNode.rec
    (motive_2 := fun cs => ∀ c ∈ cs, ∀ (cx : DisplayCx) (ws : List UiWindow), ws.map (·.comp) = cx.windows.map (·.comp) →
      (semanticNodes { cx with windows := ws } c).length = (semanticNodes cx c).length) with
  | info comp label infoId display rows =>
    intro cx ws same
    rw [info_length, info_length, windowParts_count, windowParts_count]
    simp only [same]
  | patientPane patient banner metadata cs ms ih im =>
    intro cx ws same
    have e : paneCx { cx with windows := ws } metadata cs ms = { paneCx cx metadata cs ms with windows := ws } := rfl
    have hc := sum_congr cs _ _ fun c h => ih c h (paneCx cx metadata cs ms) ws same
    have hm := sum_congr ms _ _ fun c h => im c h (paneCx cx metadata cs ms) ws same
    have leaf : leafParts { cx with windows := ws } (.patientPane patient banner metadata cs ms) =
      leafParts cx (.patientPane patient banner metadata cs ms) := rfl
    simp only [semanticNodes, List.length_cons, prefixChildren_length, List.map_append, List.sum_append,
      partEntries_length, List.map_map, Function.comp_def, e, leaf] at *
    omega
  | chartReferences refs cs ih =>
    intro cx ws same
    have each : ∀ c ∈ cs, (semanticNodes { { cx with windows := ws } with references := refs } c).length =
        (semanticNodes { cx with references := refs } c).length :=
      fun c h => ih c h { cx with references := refs } ws same
    have hc := sum_congr cs _ _ each
    have leaf : leafParts { cx with windows := ws } (.chartReferences refs cs) = leafParts cx (.chartReferences refs cs) := rfl
    simp only [semanticNodes, List.length_cons, prefixChildren_length, List.map_append, List.sum_append,
      partEntries_length, List.map_map, Function.comp_def, leaf] at *
    omega
  | valueSet options custom cs ih =>
    intro cx ws same
    have e : ({ cx with windows := ws } : DisplayCx).inValueSet options custom =
      { cx.inValueSet options custom with windows := ws } := rfl
    have hc := sum_congr cs _ _ fun c h => ih c h (cx.inValueSet options custom) ws same
    have leaf : leafParts { cx with windows := ws } (.valueSet options custom cs) = leafParts cx (.valueSet options custom cs) := rfl
    simp only [semanticNodes, List.length_cons, prefixChildren_length, List.map_append, List.sum_append,
      partEntries_length, List.map_map, Function.comp_def, e, leaf] at *
    omega
  | nil => exact absurd ‹_ ∈ ([] : List UiNode)› List.not_mem_nil
  | cons node cs ih im =>
    rename_i c member cx ws same
    rcases List.mem_cons.mp member with rfl | member
    · exact ih cx ws same
    · exact im c member cx ws same
  | board urgent cs ih =>
    intro cx ws same
    have hc := sum_congr cs _ _ fun c h => ih c h cx ws same
    have leaf : leafParts { cx with windows := ws } (.board urgent cs) = leafParts cx (.board urgent cs) := rfl
    simp only [semanticNodes, List.length_cons, prefixChildren_length, List.map_append, List.sum_append,
      partEntries_length, List.map_map, Function.comp_def, leaf] at *
    omega
  | datedTimeline title dated undated cs ih =>
    intro cx ws same
    have hc := sum_congr cs _ _ fun c h => ih c h cx ws same
    have leaf : leafParts { cx with windows := ws } (.datedTimeline title dated undated cs) =
      leafParts cx (.datedTimeline title dated undated cs) := rfl
    simp only [semanticNodes, List.length_cons, prefixChildren_length, List.map_append, List.sum_append,
      partEntries_length, List.map_map, Function.comp_def, leaf] at *
    omega
  | timeline title cs ih =>
    intro cx ws same
    have hc := sum_congr cs _ _ fun c h => ih c h cx ws same
    have leaf : leafParts { cx with windows := ws } (.timeline title cs) = leafParts cx (.timeline title cs) := rfl
    simp only [semanticNodes, List.length_cons, prefixChildren_length, List.map_append, List.sum_append,
      partEntries_length, List.map_map, Function.comp_def, leaf] at *
    omega
  | presentation kind cs ih =>
    intro cx ws same
    have hc := sum_congr cs _ _ fun c h => ih c h cx ws same
    have leaf : leafParts { cx with windows := ws } (.presentation kind cs) = leafParts cx (.presentation kind cs) := rfl
    simp only [semanticNodes, List.length_cons, prefixChildren_length, List.map_append, List.sum_append,
      partEntries_length, List.map_map, Function.comp_def, leaf] at *
    omega
  | rowAction target row cs ih =>
    intro cx ws same
    have hc := sum_congr cs _ _ fun c h => ih c h cx ws same
    have leaf : leafParts { cx with windows := ws } (.rowAction target row cs) = leafParts cx (.rowAction target row cs) := rfl
    simp only [semanticNodes, List.length_cons, prefixChildren_length, List.map_append, List.sum_append,
      partEntries_length, List.map_map, Function.comp_def, leaf] at *
    omega
  | «section» id title cs ih =>
    intro cx ws same
    have hc := sum_congr cs _ _ fun c h => ih c h cx ws same
    have leaf : leafParts { cx with windows := ws } (.section id title cs) = leafParts cx (.section id title cs) := rfl
    simp only [semanticNodes, List.length_cons, prefixChildren_length, List.map_append, List.sum_append,
      partEntries_length, List.map_map, Function.comp_def, leaf] at *
    omega
  | columns cs ih =>
    intro cx ws same
    have hc := sum_congr cs _ _ fun c h => ih c h cx ws same
    have leaf : leafParts { cx with windows := ws } (.columns cs) = leafParts cx (.columns cs) := rfl
    simp only [semanticNodes, List.length_cons, prefixChildren_length, List.map_append, List.sum_append,
      partEntries_length, List.map_map, Function.comp_def, leaf] at *
    omega
  | tabs id labels selected cs ih =>
    intro cx ws same
    have hc := sum_congr cs _ _ fun c h => ih c h cx ws same
    have leaf : leafParts { cx with windows := ws } (.tabs id labels selected cs) = leafParts cx (.tabs id labels selected cs) := rfl
    simp only [semanticNodes, List.length_cons, prefixChildren_length, List.map_append, List.sum_append,
      partEntries_length, List.map_map, Function.comp_def, leaf] at *
    omega
  | _ =>
    intro cx ws _
    unfold semanticNodes
    rfl

/-- New specification for owner review: a screen's inventory has the same size
under any windows that name the same lists. -/
theorem windows_inventory (A : UiScreen) (ws : List UiWindow) (same : ws.map (·.comp) = (A.windows?.getD []).map (·.comp)) :
    (screenNodes { A with windows? := some ws }).length = (screenNodes A).length := by
  have cx : screenCx { A with windows? := some ws } = { screenCx A with windows := ws } := rfl
  have each := sum_congr (screenRoots A) _ _ fun c _ => windows_length c (screenCx A) ws same
  have roots : screenRoots { A with windows? := some ws } = screenRoots A := rfl
  have chrome : chromeEntries { A with windows? := some ws } = chromeEntries A := rfl
  simp only [screenNodes, prefixChildren_length, List.map_append, List.sum_append, List.map_map,
    Function.comp_def, cx, roots, chrome] at *
  omega

/-- New specification for owner review: screen size no longer grows with the
data. A screen holding one list of more than a page of records has the same
windowed inventory size however many records follow: `inventory_unbounded`
says the unwindowed inventory grows with every record. -/
theorem list_inventory_independent (rows more : List (List (String × String))) (long : defaultPageSize < rows.length) :
    (screenNodes (windowScreen {} (listScreen (rows ++ more)))).length =
      (screenNodes (windowScreen {} (listScreen rows))).length := by
  have k : ({} : Config).sizeOf "results" = defaultPageSize := by
    simp [Config.sizeOf, defaultPageSize, minPageSize, maxPageSize]
  have elig : ∀ xs : List (List (String × String)), eligibleIn (listScreen xs) "results" "results" = true := by
    intro xs; simp [eligibleIn, pageable, screenInfoComps, listScreen, infoComps]
  have asked : ∀ xs : List (List (String × String)), askedIn (listScreen xs) = fun _ => 0 := by
    intro xs; funext c; simp [askedIn, listScreen]
  have page : ∀ xs : List (List (String × String)), defaultPageSize < xs.length →
      windowScreen {} (listScreen xs) =
        { listScreen (pageRows xs defaultPageSize 0) with
            windows? := some [windowOf {} "results" xs 0] } := by
    intro xs hx
    have hp : paged {} (eligibleIn (listScreen xs)) "results" "results" xs = true := by
      simp only [paged, elig, k, Bool.true_and, decide_eq_true_eq]; exact hx
    have c0 : clampPage xs.length defaultPageSize 0 = 0 := by simp [clampPage]
    have ws : (listScreen xs).workspace = [.info "results" "Results" "results" "table" xs] := rfl
    have sd : (listScreen xs).side = [] := rfl
    simp only [windowScreen, Bool.not_true, Bool.false_eq_true, ↓reduceIte, ws, sd, List.map_cons, List.map_nil,
      List.append_nil, List.flatMap_cons, List.flatMap_nil, windowsOf, windowNode, hp, asked, k, c0]
    simp [windowOf, listScreen]
  have more' : defaultPageSize < (rows ++ more).length := by simp; omega
  rw [page _ more', page _ long]
  have take : pageRows (rows ++ more) defaultPageSize 0 = pageRows rows defaultPageSize 0 := by
    simp only [pageRows, Nat.zero_mul, List.drop_zero]
    exact List.take_append_of_le_length (by omega)
  rw [take]
  have e1 := windows_inventory { listScreen (pageRows rows defaultPageSize 0) with windows? := some [windowOf {} "results" rows 0] }
    [windowOf {} "results" (rows ++ more) 0] (by simp [windowOf])
  simpa using e1

#print axioms windowParts_length
#print axioms infoParts_length_le
#print axioms info_length
#print axioms windowParts_count
#print axioms windows_length
#print axioms windows_inventory
#print axioms list_inventory_independent
#print axioms shell_reveal_offset
#print axioms scroll_steps
#print axioms shell_buried_row
#print axioms prefixChildren_length
#print axioms semanticNodes_length
#print axioms infoParts_length
#print axioms inventory_unbounded
#print axioms shell_deep_row
#print axioms reveal_unbounded
#print axioms buried_flagged
#print axioms buried_rows
#print axioms critical_buried
#print axioms selectTab_selects_page
#print axioms selectTab_blocked
#print axioms lookup_of_graph
#print axioms uiPages_asks
#print axioms withUrgentStrip_pages
#print axioms windowScreen_modal
#print axioms window_smallModal
#print axioms render_window_parts_shown
#print axioms window_child
#print axioms window_inside
#print axioms windowsOf_reach
#print axioms askPage_eligible
#print axioms askPage_asked
#print axioms window_record_shown
end Ehr.Layout.WindowProofs
