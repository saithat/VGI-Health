import Ehr.Layout.Density
import Ehr.Sem.UrgentStrip

/-! # The pinned urgent strip discharges `Sem.StripLayout`

New specification for owner review. `Sem.UrgentStrip` proves that every active
urgent alert stays perceivable, assuming `StripLayout`: at every view the user
can reach, each fact of the strip is in the viewport, legible and unoccluded.
That assumption was evidence a browser had to supply. Here it follows from
layout acceptance.

A view is an accepted layout of some screen, at some scroll position. The
moment of that view is read off the placed boxes:

* in the viewport: the strip node's box is outside every scroll viewport and
  contained in the page viewport, so scrolling cannot move it;
* legible: its text slot is at least 12 px with 4.5:1 contrast and holds the
  node's complete text in its measured wrapping;
* unoccluded: no other painted box, a modal included, shares a pixel with it
  at any scroll position.

View changes (scrolling, tabs, navigation, a dialog opening or closing) lead to
another accepted layout of a screen with the same strip. The strip changes only
with the interpreter state, which `Sem.UrgentStrip` quantifies separately. -/
namespace Ehr.Layout.Strip
open Ehr Ehr.Render Ehr.Sem

/-- New specification for owner review: a painted layout accepted for a screen:
the `Realizes` contract (G1–G9, linked flags, complete text) and G11 for the
screen's urgent occurrences. -/
def StripAccepted (v : Size) (screen : UiScreen) (painted : List Drawn) : Prop :=
  Realizes screen v painted ∧ G11 v (urgentPaths (screenShape screen)) (painted.map Drawn.box)

/-- New specification for owner review: `d` is the painted box of the strip
node `node` (the `k`th node of `screen.urgent?`, by occurrence path). -/
def StripBox (screen : UiScreen) (painted : List Drawn) (node : UiNode) (d : Drawn) : Prop :=
  d ∈ painted ∧ ∃ k, (screen.urgent?.getD [])[k]? = some node ∧
    d.box.info.source = some [Range.urgentRoot screen + k]

/-- New specification for owner review: the box shows the node's complete text
at 12 px or more and 4.5:1 or more, in its measured wrapping. -/
def Legible (node : UiNode) (d : Drawn) : Prop :=
  ∃ t ∈ d.box.info.text, t.safety = true ∧ minFontUnits ≤ t.fontSize ∧
    contrastPass d.box.style.fg d.box.style.bg textTwiceRatio = true ∧
    d.original = some (semanticText node) ∧
    d.lines = textLines t d.box.rect.w (paintText t (semanticText node)) ∧
    SafetyRealized t d.box.rect.w (semanticText node)

/-- New specification for owner review: no other painted box shares a pixel
with the box at these scroll offsets. -/
def Unoccluded (painted : List Drawn) (offset : String → Int) (d : Drawn) : Prop :=
  ∀ q ∈ painted, q.box.info.paint = true → q.box.info.id ≠ d.box.info.id →
    ∀ x y : Int, ¬ (Pixels d.box offset x y ∧ Pixels q.box offset x y)

/-- New specification for owner review: what the placed boxes of a layout let a
user perceive of the strip, at scroll offsets `offset`. A fact is perceivable
through the box of a strip node observed as that fact. -/
def stripMoment (v : Size) (screen : UiScreen) (painted : List Drawn) (offset : String → Int) : Moment where
  inViewport f := ∃ node d, observe node = f ∧ StripBox screen painted node d ∧ visible v d.box
  legible f := ∃ node d, observe node = f ∧ StripBox screen painted node d ∧ Legible node d
  unoccluded f := ∃ node d, observe node = f ∧ StripBox screen painted node d ∧
    Unoccluded painted offset d

/-- The `k`th strip node's own part is an occurrence of the semantic inventory. -/
theorem urgent_entry (screen : UiScreen) (k : Nat) (node : UiNode)
    (hk : (screen.urgent?.getD [])[k]? = some node) :
    ([Range.urgentRoot screen + k], ownPart (screenCx screen) node) ∈ screenNodes screen := by
  have root : 3 ≤ Range.urgentRoot screen := by simp [Range.urgentRoot]; omega
  have roots : (screenRoots screen)[Range.urgentRoot screen + k - 2]? = some node := by
    have length : (navNode screen.nav :: (screen.workspace ++ screen.side ++ screen.modal.toList)).length =
        Range.urgentRoot screen - 2 := by
      simp [Range.urgentRoot]
      omega
    have split : screenRoots screen =
        (navNode screen.nav :: (screen.workspace ++ screen.side ++ screen.modal.toList)) ++ screen.urgent?.getD [] := by
      simp [screenRoots]
    rw [split, List.getElem?_append_right (by rw [length]; omega), length]
    have index : Range.urgentRoot screen + k - 2 - (Range.urgentRoot screen - 2) = k := by omega
    rw [index]
    exact hk
  unfold screenNodes prefixChildren
  apply List.mem_flatMap.mpr
  refine ⟨(semanticNodes (screenCx screen) node, Range.urgentRoot screen + k), ?_, ?_⟩
  · apply List.mem_zipIdx_iff_getElem?.mpr
    have chrome : (chromeEntries screen).length = 2 := rfl
    rw [List.getElem?_append_right (by rw [chrome]; omega), chrome, List.getElem?_map]
    simp [roots]
  · apply List.mem_map.mpr
    refine ⟨([], ownPart (screenCx screen) node), ?_, rfl⟩
    unfold semanticNodes
    exact List.mem_cons_self

/-- Every occurrence under a strip root has region `urgent`. -/
theorem region_urgent (screen : UiScreen) (k : Nat) :
    Range.regionOf screen [Range.urgentRoot screen + k] = .urgent := by
  have root : 3 ≤ Range.urgentRoot screen := by simp [Range.urgentRoot]; omega
  have h0 : ([Range.urgentRoot screen + k] == [0]) = false := by
    apply beq_eq_false_iff_ne.mpr
    intro h
    have := List.head_eq_of_cons_eq h
    omega
  have h1 : ([Range.urgentRoot screen + k] == [1]) = false := by
    apply beq_eq_false_iff_ne.mpr
    intro h
    have := List.head_eq_of_cons_eq h
    omega
  simp [Range.regionOf, h0, h1]

/-- The strip node's path is one of the urgent occurrence paths of the shape. -/
theorem urgent_path (screen : UiScreen) (k : Nat) (node : UiNode)
    (hk : (screen.urgent?.getD [])[k]? = some node) :
    [Range.urgentRoot screen + k] ∈ urgentPaths (screenShape screen) := by
  rw [Range.screenShape_normal]
  unfold urgentPaths
  apply List.mem_map.mpr
  refine ⟨Range.entryShape screen ([Range.urgentRoot screen + k], ownPart (screenCx screen) node), ?_, rfl⟩
  apply List.mem_filter.mpr
  refine ⟨List.mem_map.mpr ⟨_, urgent_entry screen k node hk, rfl⟩, ?_⟩
  simp [Range.entryShape, region_urgent]

/-- The text bound to the strip node's path is the node's own text. -/
theorem sourceValue_entry (screen : UiScreen) (k : Nat) (node : UiNode)
    (hk : (screen.urgent?.getD [])[k]? = some node) :
    sourceValue screen [Range.urgentRoot screen + k] = semanticText node := by
  rw [Range.sourceValue_entry screen _ _ (urgent_entry screen k node hk), ownPart_text]

/-- New specification for owner review: the part emitted with the strip
node's box is the node's own part. An alert's severity is not printed in its
text any more; it is this part's `kind`, and its `tone` is decided from it. -/
theorem strip_part (screen : UiScreen) (k : Nat) (node : UiNode)
    (hk : (screen.urgent?.getD [])[k]? = some node) :
    sourcePart screen [Range.urgentRoot screen + k] = some (ownPart (screenCx screen) node) :=
  Range.sourcePart_entry screen _ _ (urgent_entry screen k node hk)

/-- New specification for owner review: the part of a strip alert carries the
alert's label as text and its severity as kind and tone. -/
theorem strip_alert_part (screen : UiScreen) (k : Nat) (comp alertId label severity : String)
    (hk : (screen.urgent?.getD [])[k]? = some (.alert comp alertId label severity)) :
    ∃ part, sourcePart screen [Range.urgentRoot screen + k] = some part ∧ part.role = .alert ∧
      part.text = label ∧ part.kind = severity ∧ part.tone = severityTone severity :=
  ⟨_, strip_part screen k _ hk, rfl, rfl, rfl, rfl⟩

/-- New specification for owner review: in an accepted layout every strip node
has a box that is fixed in the viewport, legible and unoccluded at every
scroll position. -/
theorem accepted_box (v : Size) (screen : UiScreen) (painted : List Drawn)
    (accepted : StripAccepted v screen painted) (k : Nat) (node : UiNode)
    (hk : (screen.urgent?.getD [])[k]? = some node) (offset : String → Int) :
    ∃ d, StripBox screen painted node d ∧ visible v d.box ∧ Legible node d ∧
      Unoccluded painted offset d := by
  obtain ⟨⟨rules, _, bound⟩, pinned⟩ := accepted
  have entry := urgent_entry screen k node hk
  have g7 := rules.2.2.2.2.2.2.1
  have counted := g7.2.2.1 [Range.urgentRoot screen + k] (List.mem_map.mpr ⟨_, entry, rfl⟩)
  obtain ⟨p, hp⟩ := List.exists_mem_of_length_pos (show 0 < _ from by rw [counted]; decide)
  obtain ⟨member, flags⟩ := List.mem_filter.mp hp
  simp only [Bool.and_eq_true, beq_iff_eq] at flags
  obtain ⟨d, hd, rfl⟩ := List.mem_map.mp member
  have flagged := pinned.2 d.box member [Range.urgentRoot screen + k] (Option.mem_def.mpr flags.1)
    (urgent_path screen k node hk)
  obtain ⟨_, vis, apart⟩ := pinned.1 d.box member flagged
  obtain ⟨t, ht, safe, original, lines, realized⟩ :=
    bound d hd [Range.urgentRoot screen + k] (Option.mem_def.mpr flags.1)
  rw [sourceValue_entry screen k node hk] at original lines realized
  have fits := rules.2.2.2.1.2.1 d.box member t ht
  have contrast := (rules.2.2.2.2.2.1 d.box member).2.2
    (by rw [Option.mem_def.mp ht]; rfl)
  refine ⟨d, ⟨hd, k, hk, flags.1⟩, vis, ⟨t, ht, safe, fits.2.1, contrast, original, lines, realized⟩, ?_⟩
  intro q hq paint different x y
  exact separated_pixels d.box q.box
    (apart q.box (List.mem_map.mpr ⟨q, hq, rfl⟩) paint different) offset x y

/-- New specification for owner review: a view whose screen carries the strip
`urgent` and whose moment is read off an accepted layout of that screen. The
rest of the screen (`background`) and the scroll offsets are arbitrary. -/
def StripView (v : Size) (urgent : Option (List UiNode)) (view : View) : Prop :=
  ∃ (background : UiScreen) (painted : List Drawn) (offset : String → Int),
    StripAccepted v { background with urgent? := urgent } painted ∧
    view.screen = stripMeaning { background with urgent? := urgent } ∧
    view.moment = stripMoment v { background with urgent? := urgent } painted offset

/-- New specification for owner review: a view change leads to an accepted
layout of a screen with the same strip. Nothing is assumed about the view
left behind. -/
def stripEdge (v : Size) (urgent : Option (List UiNode)) : View → View → Prop :=
  fun _ next => StripView v urgent next

private theorem within_stripView (v : Size) (urgent : Option (List UiNode)) {n : Nat} {a c : View}
    (reach : Within (stripEdge v urgent) n a c) : StripView v urgent a → StripView v urgent c := by
  induction reach with
  | refl m => exact id
  | step edge _ ih => exact fun _ => ih edge

private theorem stripView_perceived (v : Size) (urgent : Option (List UiNode)) (view : View)
    (h : StripView v urgent view) :
    ∃ background : UiScreen, view.screen = stripMeaning { background with urgent? := urgent } ∧
      ∀ f ∈ (urgent.getD []).map observe,
        view.moment.inViewport f ∧ view.moment.legible f ∧ view.moment.unoccluded f := by
  obtain ⟨background, painted, offset, accepted, screenEq, momentEq⟩ := h
  refine ⟨background, screenEq, ?_⟩
  intro f hf
  obtain ⟨node, member, rfl⟩ := List.mem_map.mp hf
  obtain ⟨k, hk⟩ := List.mem_iff_getElem?.mp member
  obtain ⟨d, box, vis, legible, clear⟩ :=
    accepted_box v { background with urgent? := urgent } painted accepted k node hk offset
  rw [momentEq]
  exact ⟨⟨node, d, rfl, box, vis⟩, ⟨node, d, rfl, box, legible⟩, ⟨node, d, rfl, box, clear⟩⟩

/-- New specification for owner review: layout acceptance discharges
`Sem.StripLayout`. From an accepted layout of `ui`, at any scroll position,
every sequence of view changes keeps every fact of the urgent strip in the
viewport, legible and unoccluded. -/
theorem layoutAccepted_stripLayout (v : Size) (ui : UiScreen) (painted : List Drawn)
    (accepted : StripAccepted v ui painted) (offset : String → Int) :
    StripLayout ui (stripEdge v ui.urgent?) (stripMoment v ui painted offset) := by
  intro n target reach
  have start : StripView v ui.urgent? ⟨stripMeaning ui, stripMoment v ui painted offset⟩ :=
    ⟨ui, painted, offset, accepted, rfl, rfl⟩
  exact stripView_perceived v ui.urgent? target (within_stripView v ui.urgent? reach start)

/-- New specification for owner review: the fixed shell discharges
`StripLayout` for every screen it accepts whose urgent strip fits its pinned
band, at every supported viewport and scroll position. -/
theorem shell_stripLayout (v : Size) (hv : v ∈ viewports) (ui : UiScreen)
    (accepted : Shell.accepts (screenShape ui) = true)
    (fit : Shell.stripFits (screenShape ui) = true) (offset : String → Int) :
    ∃ painted, Shell.paint ui v = some painted ∧
      StripLayout ui (stripEdge v ui.urgent?) (stripMoment v ui painted offset) := by
  obtain ⟨painted, paintedEq, realized, pinned⟩ := Shell.certifiedClass_urgent ui accepted fit v hv
  exact ⟨painted, paintedEq, layoutAccepted_stripLayout v ui painted ⟨realized, pinned⟩ offset⟩

/-- New specification for owner review: the clinical screen with its urgent
strip, for any spec, program, patient facts, display, user and state: when the
strip fits the shell's pinned band, the shell's painting discharges
`StripLayout` with no further evidence. -/
theorem render_stripLayout (sp : Ehr.Spec) (program : Ehr.Program) (facts : Ehr.Facts)
    (display : Display) (user : Ehr.User) (state : Ehr.State) (v : Size) (hv : v ∈ viewports)
    (fit : Shell.stripFits (screenShape (withUrgentStrip sp facts user state
      (renderUi sp program facts display user state))) = true) (offset : String → Int) :
    ∃ painted, Shell.paint (withUrgentStrip sp facts user state
        (renderUi sp program facts display user state)) v = some painted ∧
      StripLayout (withUrgentStrip sp facts user state (renderUi sp program facts display user state))
        (stripEdge v (withUrgentStrip sp facts user state
          (renderUi sp program facts display user state)).urgent?)
        (stripMoment v (withUrgentStrip sp facts user state
          (renderUi sp program facts display user state)) painted offset) :=
  shell_stripLayout v hv _ (Range.strip_range sp program facts display user state) fit offset

/-- New specification for owner review: continuous perceivability without a
layout premise. For any state whose urgent strip fits the pinned band, the
shell's painting shows every active approved-urgent alert in the viewport,
legible and unoccluded, at every view reachable by scrolling, tab changes,
navigation or dialogs. Only the fit of the strip is checked per state. -/
theorem render_strip_continuous (sp : Ehr.Spec) (program : Ehr.Program) (facts : Ehr.Facts)
    (display : Display) (user : Ehr.User) (state : Ehr.State) (v : Size) (hv : v ∈ viewports)
    (fit : Shell.stripFits (screenShape (withUrgentStrip sp facts user state
      (renderUi sp program facts display user state))) = true) (offset : String → Int) :
    ∃ painted, Shell.paint (withUrgentStrip sp facts user state
        (renderUi sp program facts display user state)) v = some painted ∧
      ∀ n target, Within (stripEdge v (withUrgentStrip sp facts user state
            (renderUi sp program facts display user state)).urgent?) n
          ⟨stripMeaning (withUrgentStrip sp facts user state (renderUi sp program facts display user state)),
            stripMoment v (withUrgentStrip sp facts user state
              (renderUi sp program facts display user state)) painted offset⟩ target →
        ∀ rule ∈ sp.alerts, Specs.AlertUrgency.approvedTier rule.id = some .urgent →
          (∃ key, key ∈ alertKeys facts state rule.cond) →
          AlertShown target.screen target.moment rule.id (uiLabel rule.label "Clinical alert")
            (match rule.tier with
              | .interruptive => "interruptive" | .passive => "passive" | .removable => "removable") := by
  obtain ⟨painted, paintedEq, layout⟩ := render_stripLayout sp program facts display user state v hv fit offset
  exact ⟨painted, paintedEq,
    strip_continuous_perceivability sp facts user state _ _ _ layout⟩

/-! Fixed-shell regressions; new specification for owner review. Finite probes
of the executable definitions; the theorems are the certificate. They live in
this module so that the WASM build does not carry them. -/
section Regressions
private abbrev desk : Size := ⟨92160,57600⟩
private def probe (alerts buttons : Nat) (modal : Bool) : UiScreen :=
  { banner := [("Patient","Synthetic")], viewer? := some "Registered nurse", title := "Orders", side := [],
    nav := [("Chart",[("goOrders","Orders"),("goNotes","Notes")])],
    workspace := [.field "dose" "Dose" "text" (some "5") none none false false false,
      .tabs "panel" ["Vitals","Labs"] 0 [.text "Vitals body"],
      .button "sign" "Sign" "primary" true none none],
    modal := if modal then some (.section "notice" "Notice" [.button "notice" "Acknowledge" "ack" true none none]) else none,
    urgent? := some ((List.range alerts).map (fun i => .alert s!"urgent:{i}" s!"a{i}" s!"Allergy {i}" "interruptive") ++
      (List.range buttons).map (fun i => .button s!"a{i}" "Acknowledge" "ack" true none none)) }
private def probeBoxes (screen : UiScreen) : List Placed := Shell.classBoxes desk (screenShape screen)
private def probeOk (screen : UiScreen) : Bool := viewports.all fun v =>
  let shape := screenShape screen
  let ps := Shell.classBoxes v shape
  Shell.accepts shape && checkAll Density.shellCapacity (shapeSources shape) (urgentPaths shape) v ps &&
    decide (Linked shape ps)
-- Up to six urgent occurrences, at most two of them targets, are pinned at every size, also beside a modal.
-- Each alert carries its severity mark in its own occurrence.
#guard probeOk (probe 2 1 false) && probeOk (probe 2 1 true) && probeOk (probe 5 1 true) && probeOk (probe 4 2 false)
#guard probeOk (probe 3 0 true) && probeOk (probe 2 2 false)
-- Beyond that the shell still satisfies G1–G9 and G10 but not G11.
#guard !Shell.stripFits (screenShape (probe 6 1 false)) && !Shell.stripFits (screenShape (probe 1 3 false))
#guard !decide (G11 desk (urgentPaths (screenShape (probe 6 1 false))) (probeBoxes (probe 6 1 false)))
#guard check (shapeSources (screenShape (probe 6 1 false))) desk (probeBoxes (probe 6 1 false)) &&
  decide (G10 Density.shellCapacity desk (probeBoxes (probe 6 1 false)))
-- The strip rows sit between the commit row (104–128 px) and the body (from 272 px).
#guard ((probeBoxes (probe 2 1 true)).filter (·.info.urgent)).map (fun p => (p.rect.y,p.info.target)) ==
  [(8192,false),(9728,false),(11264,true)]
-- Body order: title and workspace first, then the navigation; each link and tab is a target row.
private def bodyRows (screen : UiScreen) : List (List Nat) :=
  ((probeBoxes screen).filter (fun p => !p.clips.isEmpty)).filterMap (·.info.source)
-- A field is its label row followed by its control row; the control is the target.
#guard bodyRows (probe 0 0 false) == [[1],[3],[3,0],[4],[4,0],[4,1],[4,2],[2],[2,0],[2,0,0],[2,0,1]]
#guard ((probeBoxes (probe 0 0 false)).filter (fun p => p.info.target && !p.clips.isEmpty)).filterMap (·.info.source) ==
  [[3,0],[4,0],[4,1],[2,0,0],[2,0,1]]
end Regressions

#print axioms urgent_entry
#print axioms region_urgent
#print axioms urgent_path
#print axioms sourceValue_entry
#print axioms strip_part
#print axioms strip_alert_part
#print axioms accepted_box
#print axioms within_stripView
#print axioms stripView_perceived
#print axioms layoutAccepted_stripLayout
#print axioms shell_stripLayout
#print axioms render_stripLayout
#print axioms render_strip_continuous
end Ehr.Layout.Strip
