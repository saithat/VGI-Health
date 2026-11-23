import Ehr.Layout.Range

/-! # G10 (R5): action density for the fixed shell and for custom families

New specification for owner review. `G10` (in `Check`) bounds the active
targets in the first 1440×900 viewport and, at every scroll position of each
scroll viewport, the fixed targets together with the targets in the window. Here:

* `shell_density`: the fixed shell (`fixed-shell-v2`) satisfies G10 with limit
  `shellCapacity` (15) for arbitrary body lists, so `renderer_range` extends the
  bound to every output of the actual renderer (`render_density`).
* `acceptFamilyDensity`: custom agent layouts are refused when any supported
  viewport case breaks G10; acceptance implies G10 on every covered screen
  (`layoutAccepted_familyDensity`).
* `render_urgent`: every renderer output whose urgent strip fits the shell's
  pinned band is painted with G11. -/
set_option maxRecDepth 100000
set_option maxHeartbeats 400000
namespace Ehr.Layout.Density
open Lean Ehr.Render

/-- New specification for owner review: the largest number of active targets
the fixed shell can show at once at 1440×900, counting the fixed targets with
every scroll window. The body scroller is 612 px tall with 48 px rows on a
56 px pitch, so a window meets at most 12 rows; the fixed commit and at most
two pinned strip targets make 15. -/
def shellCapacity : Nat := 15

private theorem sorted_window : ∀ (l : List Nat) (b k : Nat), l.Pairwise (· < ·) →
    (∀ x ∈ l, b ≤ x ∧ x < b + k) → l.length ≤ k
  | [], _, _, _, _ => Nat.zero_le _
  | x :: xs, b, k, sorted, h => by
    have hx := h x List.mem_cons_self
    have tail := sorted_window xs (x+1) (b + k - (x+1)) (List.pairwise_cons.mp sorted).2 (by
      intro y hy
      have := (List.pairwise_cons.mp sorted).1 y hy
      have := h y (List.mem_cons_of_mem x hy)
      omega)
    simp only [List.length_cons]
    omega

private theorem zip_order (xs : List α) : xs.zipIdx.Pairwise (fun a b => a.2 < b.2) := by
  apply List.pairwise_iff_getElem.mpr
  intro i j hi hj hij
  simpa using hij

/-- Rows whose index is confined to `k` consecutive values number at most `k`. -/
private theorem rows_window (xs : List α) (f : α × Nat → Placed) (P : Placed → Bool) (b k : Nat)
    (h : ∀ x ∈ xs.zipIdx, P (f x) = true → b ≤ x.2 ∧ x.2 < b + k) :
    ((xs.zipIdx.map f).filter P).length ≤ k := by
  rw [List.filter_map, List.length_map]
  have sorted : ((xs.zipIdx.filter (P ∘ f)).map Prod.snd).Pairwise (· < ·) :=
    List.pairwise_map.mpr ((zip_order xs).filter _)
  have bound := sorted_window _ b k sorted (by
    intro i hi
    obtain ⟨x, hx, rfl⟩ := List.mem_map.mp hi
    have hx := List.mem_filter.mp hx
    exact h x hx.1 hx.2)
  simpa using bound

private abbrev desk : Size := ⟨92160,57600⟩

private theorem filter_nil_of (l : List Placed) (p : Placed → Bool) (h : ∀ x ∈ l, p x = false) :
    (l.filter p).length = 0 := by
  simp only [List.length_eq_zero_iff, List.filter_eq_nil_iff]
  intro x hx
  simp [h x hx]

private theorem modal_present (v first body commit) (ms us : Shell.Body) (ne : ms ≠ []) :
    (Shell.placements v first body commit ms us).any (·.info.interruptive) = true := by
  obtain ⟨e, rest, rfl⟩ := List.exists_cons_of_ne_nil ne
  apply List.any_eq_true.mpr
  refine ⟨Shell.modal v e 0, ?_, rfl⟩
  simp [Shell.placements, Shell.modalBoxes]

private theorem inactive_ordinary (ps : List Placed) (p : Placed) (modal : ps.any (·.info.interruptive) = true)
    (ordinary : p.info.interruptive = false) (notStrip : p.info.urgent = false) :
    activeTarget ps p = false := by
  simp [activeTarget, modal, ordinary, notStrip]

/-- At most as many strip rows pass a target-only count as there are strip targets. -/
private theorem strip_targets (v : Size) (us : Shell.Body) (P : Placed → Bool)
    (h : ∀ p, P p = true → p.info.target = true) :
    ((Shell.stripBoxes v us).filter P).length ≤ (us.filter (·.2)).length := by
  have fst : us.zipIdx.map Prod.fst = us := List.zipIdx_map_fst (l := us) (i := 0)
  calc ((Shell.stripBoxes v us).filter P).length
      = (us.zipIdx.filter (fun e => P (Shell.strip v e.1 e.2))).length := by
        simp [Shell.stripBoxes, List.filter_map, Function.comp_def]
    _ ≤ (us.zipIdx.filter (fun e => e.1.2)).length := by
        rw [← List.countP_eq_length_filter, ← List.countP_eq_length_filter]
        exact List.countP_mono_left (fun e _ he => h _ he)
    _ = ((us.zipIdx.map Prod.fst).filter (·.2)).length := by
        rw [List.filter_map, List.length_map]; rfl
    _ = (us.filter (·.2)).length := by rw [fst]

private def rowsOf (v : Size) (body : Shell.Body) : List Placed :=
  body.zipIdx.map (fun (e,i) => Structural.ordinary v e.1 e.2 i)

private theorem count_split (v : Size) (first : List Nat) (body : Shell.Body)
    (commit : Option (List Nat)) (ms us : Shell.Body) (P : Placed → Bool)
    (hs : P (Structural.scroller v) = false) (hb : P (Structural.banner v first) = false) :
    ((Shell.placements v first body commit ms us).filter P).length =
      ((rowsOf v body).filter P).length + ((commit.toList.map (Shell.footer v)).filter P).length +
        ((Shell.modalBoxes v ms).filter P).length + ((Shell.stripBoxes v us).filter P).length := by
  simp only [Shell.placements, Structural.placements, List.filter_cons, hs, hb, Bool.false_eq_true,
    ↓reduceIte, List.filter_append, List.length_append, rowsOf]
  omega

/-- New specification for owner review: the fixed shell meets G10 at its
capacity for arbitrary bodies, paths and target masks, with at most two modal
occurrences and at most `stripTargetCapacity` targets among the pinned urgent
rows `us`. Each scroll window is counted together with the fixed commit and
the pinned strip targets. With `us = []` this is the shell without a strip. -/
theorem shell_density (v : Size) (first : List Nat) (body : Shell.Body)
    (commit : Option (List Nat)) (ms us : Shell.Body) (limited : ms.length ≤ 2)
    (stripTargets : (us.filter (·.2)).length ≤ Shell.stripTargetCapacity) :
    G10 shellCapacity v (Shell.placements v first body commit ms us) := by
  intro hv
  subst hv
  generalize hps : Shell.placements desk first body commit ms us = ps
  have one : (commit.toList.map (Shell.footer desk)).length ≤ 1 := by cases commit <;> simp
  have count : (Shell.modalBoxes desk ms).length = ms.length := by simp [Shell.modalBoxes]
  simp only [Shell.stripTargetCapacity] at stripTargets
  -- Any count over the shell splits into body rows, the commit, the modals and the strip.
  have split : ∀ P : Placed → Bool, P (Structural.scroller desk) = false →
      P (Structural.banner desk first) = false →
      (ps.filter P).length = ((rowsOf desk body).filter P).length +
        ((commit.toList.map (Shell.footer desk)).filter P).length +
        ((Shell.modalBoxes desk ms).filter P).length +
        ((Shell.stripBoxes desk us).filter P).length := by
    intro P hs hb
    rw [← hps]
    exact count_split desk first body commit ms us P hs hb
  have noScroller : ∀ P : Placed → Bool, (activeTarget ps (Structural.scroller desk) && P (Structural.scroller desk)) = false := by
    intro P; simp [activeTarget, Structural.scroller]
  have noBanner : ∀ P : Placed → Bool, (activeTarget ps (Structural.banner desk first) && P (Structural.banner desk first)) = false := by
    intro P; simp [activeTarget, Structural.banner]
  have active := fun (P : Placed → Bool) => split (fun p => activeTarget ps p && P p) (noScroller P) (noBanner P)
  -- At most two pinned strip rows are targets, whatever else is counted.
  have stripLe : ∀ P : Placed → Bool,
      ((Shell.stripBoxes desk us).filter (fun p => activeTarget ps p && P p)).length ≤ 2 := by
    intro P
    refine Nat.le_trans (strip_targets desk us _ ?_) stripTargets
    intro p hp
    simp only [activeTarget, Bool.and_eq_true] at hp
    exact hp.1.1
  -- Body rows scroll, so none of them is a fixed target.
  have fixedRows : ((rowsOf desk body).filter (fun p => activeTarget ps p && p.clips.isEmpty)).length = 0 :=
    filter_nil_of _ _ (by
      intro x hx
      obtain ⟨⟨e,i⟩, _, rfl⟩ := List.mem_map.mp hx
      simp [Structural.ordinary])
  -- The commit, the modals and the strip are outside every scroll viewport.
  have windowFooter : ∀ c o, ((commit.toList.map (Shell.footer desk)).filter
      (fun p => activeTarget ps p && (scrollRegion p == some c && decide (InWindow c.2 o p)))).length = 0 := by
    intro c o
    exact filter_nil_of _ _ (by
      intro x hx
      obtain ⟨path, _, rfl⟩ := List.mem_map.mp hx
      simp [scrollRegion, Shell.footer])
  have windowModals : ∀ c o, ((Shell.modalBoxes desk ms).filter
      (fun p => activeTarget ps p && (scrollRegion p == some c && decide (InWindow c.2 o p)))).length = 0 := by
    intro c o
    exact filter_nil_of _ _ (by
      intro x hx
      obtain ⟨⟨e,i⟩, _, rfl⟩ := List.mem_map.mp hx
      simp [scrollRegion, Shell.modal])
  have windowStrip : ∀ c o, ((Shell.stripBoxes desk us).filter
      (fun p => activeTarget ps p && (scrollRegion p == some c && decide (InWindow c.2 o p)))).length = 0 := by
    intro c o
    exact filter_nil_of _ _ (by
      intro x hx
      obtain ⟨⟨e,i⟩, _, rfl⟩ := List.mem_map.mp hx
      simp [scrollRegion, Shell.strip])
  have windowEq : ∀ c o, windowTargets ps c o =
      ps.filter (fun p => activeTarget ps p && (scrollRegion p == some c && decide (InWindow c.2 o p))) := by
    intro c o
    unfold windowTargets
    congr 1
    funext p
    rw [Bool.and_assoc]
  have fixedEq : fixedTargets ps = ps.filter (fun p => activeTarget ps p && p.clips.isEmpty) := rfl
  have firstEq : firstViewportTargets desk ps =
      ps.filter (fun p => activeTarget ps p && decide (AtRest desk p)) := rfl
  -- It suffices to bound the first viewport, the fixed targets, and every window with them.
  suffices bounds : (firstViewportTargets desk ps).length ≤ shellCapacity ∧
      (fixedTargets ps).length ≤ shellCapacity ∧
      ∀ c o, (fixedTargets ps).length + (windowTargets ps c o).length ≤ shellCapacity by
    refine ⟨bounds.1, bounds.2.1, ?_⟩
    intro n hn
    obtain ⟨q, _, hq⟩ := List.mem_filterMap.mp hn
    cases hr : scrollRegion q with
    | none => simp [hr] at hq
    | some c =>
      simp only [hr, Option.map_some, Option.some.injEq] at hq
      rw [← hq]
      exact bounds.2.2 c _
  by_cases empty : ms = []
  · -- No modal: 12 body rows in any window, the commit and two strip targets.
    subst empty
    have noModal : ∀ P : Placed → Bool, ((Shell.modalBoxes desk ([] : Shell.Body)).filter P).length = 0 := by
      intro P; simp [Shell.modalBoxes]
    have footerLe := fun (P : Placed → Bool) =>
      Nat.le_trans (List.length_filter_le P (commit.toList.map (Shell.footer desk))) one
    have fixed : (fixedTargets ps).length ≤ 3 := by
      rw [fixedEq, active, fixedRows, noModal]
      have := footerLe (fun p => activeTarget ps p && p.clips.isEmpty)
      have := stripLe (fun p => p.clips.isEmpty)
      omega
    refine ⟨?_, by simp only [shellCapacity]; omega, ?_⟩
    · rw [firstEq, active, noModal]
      have rows : ((rowsOf desk body).filter (fun p => activeTarget ps p && decide (AtRest desk p))).length ≤ 11 :=
        rows_window body (fun (e,i) => Structural.ordinary desk e.1 e.2 i)
        (fun p => activeTarget ps p && decide (AtRest desk p)) 0 11 (by
          intro x _ hx
          simp only [Bool.and_eq_true, decide_eq_true_eq] at hx
          have meets := hx.2.2 ("0", Structural.clipRect desk) (by simp [Structural.ordinary])
          simp [Meets, Structural.ordinary, Structural.clipRect, Rect.bottom] at meets
          omega)
      have := footerLe (fun p => activeTarget ps p && decide (AtRest desk p))
      have := stripLe (fun p => decide (AtRest desk p))
      simp only [shellCapacity]
      omega
    · intro c o
      rw [windowEq, active, noModal, windowFooter, windowStrip]
      have rows : ((rowsOf desk body).filter
          (fun p => activeTarget ps p && (scrollRegion p == some c && decide (InWindow c.2 o p)))).length ≤ 12 :=
        rows_window body (fun (e,i) => Structural.ordinary desk e.1 e.2 i)
        (fun p => activeTarget ps p && (scrollRegion p == some c && decide (InWindow c.2 o p)))
        ((o - 3072) / 3584 + 1).toNat 12 (by
          intro x _ hx
          simp only [Bool.and_eq_true, beq_iff_eq, decide_eq_true_eq] at hx
          obtain ⟨_, region, inWindow⟩ := hx
          simp only [scrollRegion, Structural.ordinary, List.head?_cons, Option.some.injEq] at region
          subst region
          simp [InWindow, Structural.ordinary, Structural.clipRect, Rect.bottom, Rect.right] at inWindow
          omega)
      simp only [shellCapacity]
      omega
  · -- A modal is open: only its targets and the strip targets are active.
    have modal : ps.any (·.info.interruptive) = true := by
      rw [← hps]; exact modal_present desk first body commit ms us empty
    have rowsOff : ∀ P : Placed → Bool,
        ((rowsOf desk body).filter (fun p => activeTarget ps p && P p)).length = 0 := by
      intro P
      exact filter_nil_of _ _ (by
        intro x hx
        obtain ⟨⟨e,i⟩, _, rfl⟩ := List.mem_map.mp hx
        simp [inactive_ordinary ps (Structural.ordinary desk e.1 e.2 i) modal rfl rfl])
    have footerOff : ∀ P : Placed → Bool,
        ((commit.toList.map (Shell.footer desk)).filter (fun p => activeTarget ps p && P p)).length = 0 := by
      intro P
      exact filter_nil_of _ _ (by
        intro x hx
        obtain ⟨path, _, rfl⟩ := List.mem_map.mp hx
        simp [inactive_ordinary ps (Shell.footer desk path) modal rfl rfl])
    have total : ∀ P : Placed → Bool, (ps.filter (fun p => activeTarget ps p && P p)).length ≤ 4 := by
      intro P
      rw [active, rowsOff, footerOff]
      have := List.length_filter_le (fun p => activeTarget ps p && P p) (Shell.modalBoxes desk ms)
      have := stripLe P
      omega
    have fixed : (fixedTargets ps).length ≤ 4 := total (fun p => p.clips.isEmpty)
    have window : ∀ c o, (windowTargets ps c o).length = 0 := by
      intro c o
      rw [windowEq, active, rowsOff, footerOff, windowModals, windowStrip]
    refine ⟨?_, by simp only [shellCapacity]; omega, ?_⟩
    · have := total (fun p => decide (AtRest desk p))
      rw [firstEq]
      simp only [shellCapacity]
      omega
    · intro c o
      rw [window]
      simp only [shellCapacity]
      omega

/-- Every shape the fixed shell accepts meets G10 at its capacity. -/
theorem class_density (shape : ScreenShape) (accepted : Shell.accepts shape = true) (v : Size) :
    G10 shellCapacity v (Shell.classBoxes v shape) := by
  have fits : Shell.Fits shape := of_decide_eq_true accepted
  exact shell_density v _ _ _ _ _ (by simpa [Shell.Parts.modalData] using fits.1.2.2.2.2.2.1)
    (by simpa [Shell.Parts.stripData, List.filter_map, Function.comp_def] using fits.1.2.2.2.2.2.2.2.2)

/-- New specification for owner review: every output of the actual renderer,
for any spec, program, facts, display, user and state (reachable or not), is
painted by the fixed shell within G10 at its capacity. -/
theorem render_density (sp : Ehr.Spec) (program : Ehr.Program) (facts : Ehr.Facts)
    (display : Display) (user : Ehr.User) (state : Ehr.State) (v : Size) :
    ∀ painted, Range.uncheckedPaint (runRenderUi ⟨sp,program,facts,display,user,state⟩) v = some painted →
      G10 shellCapacity v (painted.map Drawn.box) := by
  intro painted h
  simp only [Range.uncheckedPaint, Option.some.injEq] at h
  subst h
  have same : ((Shell.classBoxes v (screenShape (runRenderUi ⟨sp,program,facts,display,user,state⟩))).map
      (bindSemantic (runRenderUi ⟨sp,program,facts,display,user,state⟩))).map Drawn.box =
      Shell.classBoxes v (screenShape (runRenderUi ⟨sp,program,facts,display,user,state⟩)) := by
    simp [List.map_map, Function.comp_def, bindSemantic_box]
  rw [same]
  exact class_density _ (Range.renderer_range sp program facts display user state) v

/-- New specification for owner review: every output of the actual renderer
whose urgent strip fits the shell's pinned band (`Shell.stripFits`) is painted
with G11, for any spec, program, facts, display, user and state (reachable or
not) and every supported viewport. -/
theorem render_urgent (sp : Ehr.Spec) (program : Ehr.Program) (facts : Ehr.Facts)
    (display : Display) (user : Ehr.User) (state : Ehr.State) (v : Size) (hv : v ∈ viewports)
    (fit : Shell.stripFits (screenShape (runRenderUi ⟨sp,program,facts,display,user,state⟩)) = true) :
    ∀ painted, Range.uncheckedPaint (runRenderUi ⟨sp,program,facts,display,user,state⟩) v = some painted →
      G11 v (urgentPaths (screenShape (runRenderUi ⟨sp,program,facts,display,user,state⟩)))
        (painted.map Drawn.box) := by
  intro painted h
  simp only [Range.uncheckedPaint, Option.some.injEq] at h
  subst h
  have same : ((Shell.classBoxes v (screenShape (runRenderUi ⟨sp,program,facts,display,user,state⟩))).map
      (bindSemantic (runRenderUi ⟨sp,program,facts,display,user,state⟩))).map Drawn.box =
      Shell.classBoxes v (screenShape (runRenderUi ⟨sp,program,facts,display,user,state⟩)) := by
    simp [List.map_map, Function.comp_def, bindSemantic_box]
  rw [same]
  exact Shell.class_urgent _ (Range.renderer_range sp program facts display user state) fit v hv

/-! ## Custom layout families -/

/-- New specification for owner review: G10 on every supported viewport case. -/
def admitDensity (limit : Nat) (c : Candidate) : Bool :=
  viewports.all fun v => decide (G10 limit v (boxes v (c.tree v)))

/-- New specification for owner review: G1–G7 family admission plus G10. -/
def acceptFamilyDensity (limit : Nat) (family : Family) : Bool :=
  acceptFamily family && family.all (admitDensity limit)

/-- New specification for owner review: family acceptance with a density limit
implies the full `Realizes` contract and G10 for every covered screen. -/
theorem layoutAccepted_familyDensity (limit : Nat) (family : Family)
    (h : acceptFamilyDensity limit family = true) (screen : UiScreen)
    (covered : Covered family screen) (v : Size) (hv : v ∈ viewports) :
    ∃ painted, familyPaint family screen v = some painted ∧ Realizes screen v painted ∧
      G10 limit v (painted.map Drawn.box) := by
  simp only [acceptFamilyDensity, Bool.and_eq_true] at h
  obtain ⟨painted, paint, realized⟩ := layoutAccepted_allScreens family h.1 screen covered v hv
  obtain ⟨c, hc, selected, _⟩ := select_covered family screen covered
  refine ⟨painted, paint, realized, ?_⟩
  have same : painted = (boxes v (c.tree v)).map (bindSemantic screen) := by
    simp [familyPaint, selected] at paint
    exact paint.symm
  have geom : painted.map Drawn.box = boxes v (c.tree v) := by
    simp [same, List.map_map, Function.comp_def, bindSemantic_box]
  rw [geom]
  have admitted := List.all_eq_true.mp h.2 c hc
  exact of_decide_eq_true (List.all_eq_true.mp admitted v hv)

/-! ## Program-level decision for the fixed shell -/

/-- New specification for owner review: the program's target-density limit is
at least the fixed shell's capacity. The decision is static: `render_density`
already bounds every rendered state, so no per-patient geometry is repeated. -/
def checkProgramDensity (sp : Ehr.Spec) (_program : Ehr.Program) : Bool :=
  decide (shellCapacity ≤ sp.design.maxTargetsPerViewport)

/-- New specification for owner review: acceptance implies, for every patient,
display, user and state (reachable or not) and every supported viewport, the
complete `Realizes` contract and G10 at the spec's limit. -/
theorem checkProgramDensity_sound (sp : Ehr.Spec) (program : Ehr.Program)
    (accepted : checkProgramDensity sp program = true) :
    ∀ (facts : Ehr.Facts) (display : Display) (user : Ehr.User) (state : Ehr.State),
      ∀ v ∈ viewports, ∃ painted,
        Range.uncheckedPaint (runRenderUi ⟨sp,program,facts,display,user,state⟩) v = some painted ∧
        Realizes (runRenderUi ⟨sp,program,facts,display,user,state⟩) v painted ∧
        G10 sp.design.maxTargetsPerViewport v (painted.map Drawn.box) := by
  intro facts display user state v hv
  obtain ⟨painted, paint, realized⟩ :=
    Range.checkProgram_allStates sp program (Range.checkProgram_accepts sp program) facts display user state v hv
  refine ⟨painted, paint, realized, ?_⟩
  exact G10_mono (of_decide_eq_true accepted) v _ (render_density sp program facts display user state v painted paint)

#print axioms sorted_window
#print axioms rows_window
#print axioms shell_density
#print axioms class_density
#print axioms render_density
#print axioms render_urgent
#print axioms layoutAccepted_familyDensity
#print axioms checkProgramDensity_sound
#print axioms zip_order
#print axioms filter_nil_of
#print axioms modal_present
#print axioms inactive_ordinary
#print axioms strip_targets
#print axioms count_split

end Ehr.Layout.Density
