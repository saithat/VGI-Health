import Ehr.Layout.Engine
import Ehr.Layout.Contrast
namespace Ehr.Layout
open Lean

/-- Bounding viewport of all visible positions under scrolling. For objects in
the same scroll space the checker uses their content rectangles instead. -/
def envelope (p : Placed) : Rect := ((p.clips.getLast?).map Prod.snd).getD p.rect

def separated (a b : Placed) : Prop :=
  if a.clips.map Prod.fst = b.clips.map Prod.fst then Apart a.rect b.rect else Apart (envelope a) (envelope b)
instance (a b : Placed) : Decidable (separated a b) := by unfold separated; infer_instance

def visible (v : Size) (p : Placed) : Prop := p.clips = [] ∧ Contains (viewportRect v) p.rect
instance (v p) : Decidable (visible v p) := by unfold visible; infer_instance

def InRect (r : Rect) (x y : Int) : Prop :=
  r.x ≤ x ∧ x < r.right ∧ r.y ≤ y ∧ y < r.bottom

/-- Conservative pixel semantics: content moves by the sum of ancestor scroll
offsets and is clipped to its outermost fixed viewport. Inner clips can only
remove pixels, so this overapproximation also covers nested scrolling. -/
def scrollAmount (p : Placed) (offset : String → Int) : Int :=
  ((p.clips.map Prod.fst).map offset).sum

def Pixels (p : Placed) (offset : String → Int) (x y : Int) : Prop :=
  InRect p.rect x (y+scrollAmount p offset) ∧ InRect (envelope p) x y

theorem apart_pixels (a b : Rect) (x y : Int) (h : Apart a b) :
    ¬ (InRect a x y ∧ InRect b x y) := by
  simp only [Apart, InRect, Rect.right, Rect.bottom] at *
  omega

theorem separated_pixels (a b : Placed) (h : separated a b) (offset : String → Int) (x y : Int) :
    ¬ (Pixels a offset x y ∧ Pixels b offset x y) := by
  unfold separated at h
  split at h
  next same =>
    have hs : scrollAmount a offset = scrollAmount b offset := by simp only [scrollAmount, same]
    intro hp
    exact apart_pixels _ _ x (y+scrollAmount b offset) h ⟨by simpa only [hs] using hp.1.1,hp.2.1⟩
  next different =>
    intro hp
    exact apart_pixels _ _ x y h ⟨hp.1.2,hp.2.2⟩

/-- G1: exactly one fixed banner; all painted peers are separated from it at
all scroll offsets (including peers with higher stacking order). -/
def G1 (v : Size) (ps : List Placed) : Prop :=
  (ps.filter (·.info.banner)).length = 1 ∧
  ∀ p ∈ ps, p.info.banner = true → visible v p ∧
    ∀ q ∈ ps, q.info.paint = true → q.info.id ≠ p.info.id → separated p q

/-- G2: every active interruptive box is fixed, viewport-contained and above
all ordinary paint. Dispatch blocks every target outside the active modal. -/
def G2 (v : Size) (ps : List Placed) : Prop :=
  ∀ p ∈ ps, p.info.interruptive = true → visible v p ∧
    ∀ q ∈ ps, q.info.paint = true → q.info.interruptive = false → q.style.z < p.style.z

def activeTarget (ps : List Placed) (p : Placed) : Bool :=
  p.info.target && (!(ps.any (·.info.interruptive)) || p.info.interruptive)

/-- G3 uses content rectangles within a shared scroller, and whole scroll
viewports across independent scrollers: conservative over every scroll offset. -/
def G3 (ps : List Placed) : Prop :=
  (∀ p ∈ ps, p.info.target = true → 1536 ≤ p.rect.w ∧ 1536 ≤ p.rect.h) ∧
  ps.Pairwise (fun p q => activeTarget ps p = true → activeTarget ps q = true → separated p q)

def activePaint (ps : List Placed) (p : Placed) : Bool :=
  !(ps.any (·.info.interruptive)) || p.info.interruptive || p.info.banner

/-- G4 checks declared capacity, vertical reserve, safety policy and parent
scroll clipping. Pixel glyph containment additionally trusts the pinned font
metrics; wrap completeness is proved independently by `wrap_complete`. -/
def textFits (p : Placed) (t : TextSlot) : Prop :=
  t.font < Fonts.tables.size ∧ 0 < t.fontSize ∧
  (t.fontSize * Fonts.lineExtent[t.font]?.getD 2000 + 999)/1000 ≤ t.lineHeight ∧
  0 < capacity t p.rect.w ∧ 0 < t.maxLines ∧
  t.maxLines*t.lineHeight ≤ p.rect.h ∧
  (t.safety = true → t.overflow = .scroll ∧ escapeReady t = true) ∧
  (t.overflow = .wrap → t.maxLength ≤ t.maxLines*capacity t p.rect.w)

def G4 (v : Size) (ps : List Placed) : Prop :=
  (∀ p ∈ ps, p.info.paint = true → Contains (viewportRect v) (envelope p)) ∧
  (∀ p ∈ ps, ∀ t ∈ p.info.text, textFits p t) ∧
  ∀ p ∈ ps, p.info.text.isSome = true → activePaint ps p = true →
    ∀ q ∈ ps, q.info.paint = true → q.info.id ≠ p.info.id → activePaint ps q = true →
      (p.style.z < q.style.z ∨ (p.style.z = q.style.z ∧ q.info.id ∉ p.parents)) → separated p q

/-- G5: every page box, or its fixed scroll viewport, has contained horizontal
extent; scrolled text may be taller, but cannot introduce page x overflow. -/
def G5 (v : Size) (ps : List Placed) : Prop :=
  ∀ p ∈ ps, 0 ≤ (envelope p).x ∧ (envelope p).right ≤ v.w ∧
    (p.clip ≠ none → (envelope p).x ≤ p.rect.x ∧ p.rect.right ≤ (envelope p).right)

/-- G6: text 4.5:1, large (≥24px, or ≥18⅔px at weight≥700) 3:1;
interactive components 3:1. The opaque local background is part of the mark,
so arbitrary underlying layers cannot change its computed contrast. -/
def G6 (ps : List Placed) : Prop :=
  ∀ p ∈ ps, (p.info.target = true → contrastPass p.style.fg p.style.bg 6 = true) ∧
    ∀ t ∈ p.info.text,
      contrastPass p.style.fg p.style.bg
        (if t.fontSize ≥ 1536 || (t.font ≥ 3 && t.font ≤ 5 && t.fontSize ≥ 1195) then 6 else 9) = true

/-- G7: each semantic tree-path occurrence appears once; no invented sources.
Painted node IDs are also unique, so diagnostic and event identities are honest. -/
def G7 (expected : List (List Nat)) (ps : List Placed) : Prop :=
  (ps.map (·.info.id)).Nodup ∧ expected.Nodup ∧
  (∀ path ∈ expected, (ps.filter (fun p => p.info.source == some path && p.info.paint)).length = 1) ∧
  ∀ p ∈ ps, ∀ path ∈ p.info.source, path ∈ expected ∧ p.info.paint = true

/-- G8: document order is top-to-bottom then left-to-right. Within a common
scroll space use content positions; across regions use their outer viewports,
so hidden overflow does not reorder the fixed shell. Separate z layers have
separate active reading regions (the modal dispatcher blocks ordinary targets). -/
def before (a b : Rect) : Prop := a.y < b.y ∨ (a.y = b.y ∧ a.x ≤ b.x)

def G8 (ps : List Placed) : Prop :=
  (ps.filter (fun p => p.info.paint && (p.info.target || p.info.text.isSome))).Pairwise
    (fun p q => p.style.z = q.style.z →
      if p.clips.map Prod.fst = q.clips.map Prod.fst then before p.rect q.rect
      else before (envelope p) (envelope q))

/-- G9: if any current-task commit is present, exactly one is fixed and visible
at 1440×900. A screen with no current-task commit is exempt. -/
def G9 (v : Size) (ps : List Placed) : Prop :=
  v = ⟨92160,57600⟩ → (ps.any (·.info.commit) = true) →
    (ps.filter (·.info.commit)).length = 1 ∧
    ∀ p ∈ ps, p.info.commit = true → p.info.target = true ∧ visible v p

theorem G9_exempt (v : Size) (ps : List Placed) (absent : ps.any (·.info.commit) = false) :
    G9 v ps := by
  intro _ present
  simp [absent] at present

/-! ### G10 (R5): action density. New specification for owner review. -/

/-- New specification for owner review: two rectangles share painted area. -/
def Meets (a b : Rect) : Prop := a.x < b.right ∧ b.x < a.right ∧ a.y < b.bottom ∧ b.y < a.bottom
instance (a b : Rect) : Decidable (Meets a b) := by unfold Meets; infer_instance

/-- New specification for owner review: with every scroll offset at zero (the
first viewport), the box has area inside the page viewport and inside each
enclosing scroll viewport. -/
def AtRest (v : Size) (p : Placed) : Prop :=
  Meets (viewportRect v) p.rect ∧ ∀ c ∈ p.clips, Meets c.2 p.rect
instance (v p) : Decidable (AtRest v p) := by unfold AtRest; infer_instance

/-- New specification for owner review: active targets visible in the first viewport. -/
def firstViewportTargets (v : Size) (ps : List Placed) : List Placed :=
  ps.filter fun p => activeTarget ps p && decide (AtRest v p)

/-- New specification for owner review: the innermost scroll viewport of a box. -/
def scrollRegion (p : Placed) : Option (String × Rect) := p.clips.head?

/-- New specification for owner review: in content coordinates, scroll viewport
`r` scrolled down by `o` shows the band `[r.y + o, r.bottom + o)`. -/
def InWindow (r : Rect) (o : Int) (p : Placed) : Prop :=
  r.x < p.rect.right ∧ p.rect.x < r.right ∧ r.y + o < p.rect.bottom ∧ p.rect.y < r.bottom + o
instance (r o p) : Decidable (InWindow r o p) := by unfold InWindow; infer_instance

/-- New specification for owner review: active targets of scroll viewport `c`
visible at scroll offset `o`. -/
def windowTargets (ps : List Placed) (c : String × Rect) (o : Int) : List Placed :=
  ps.filter fun p => activeTarget ps p && scrollRegion p == some c && decide (InWindow c.2 o p)

/-- The offset whose window starts on the last row of `q`. The densest window
of a region is always one of these (`G10_window`). -/
def windowAt (c : String × Rect) (q : Placed) : Int := q.rect.bottom - 1 - c.2.y

/-- Target counts of the finitely many candidate scroll windows. -/
def windowCounts (ps : List Placed) : List Nat :=
  ps.filterMap fun q => (scrollRegion q).map fun c => (windowTargets ps c (windowAt c q)).length

/-- G10 (R5), new specification for owner review: at 1440×900 the first
viewport, and every scroll position of each scroll viewport, contain at most
`limit` active targets. Other sizes impose no density constraint. -/
def G10 (limit : Nat) (v : Size) (ps : List Placed) : Prop :=
  v = ⟨92160,57600⟩ →
    (firstViewportTargets v ps).length ≤ limit ∧ ∀ n ∈ windowCounts ps, n ≤ limit
instance (limit v ps) : Decidable (G10 limit v ps) := by unfold G10; infer_instance

private theorem filter_length_mono (l : List α) (p q : α → Bool)
    (h : ∀ a ∈ l, p a = true → q a = true) : (l.filter p).length ≤ (l.filter q).length := by
  induction l with
  | nil => simp
  | cons a l ih =>
    have ih' := ih (fun b hb => h b (List.mem_cons_of_mem a hb))
    by_cases hp : p a = true
    · simp [hp, h a List.mem_cons_self hp]; omega
    · cases hq : q a <;> simp [hp, hq] <;> omega

private theorem lowest_bottom (l : List Placed) (ne : l ≠ []) :
    ∃ q ∈ l, ∀ p ∈ l, q.rect.bottom ≤ p.rect.bottom := by
  induction l with
  | nil => contradiction
  | cons a l ih =>
    by_cases empty : l = []
    · subst empty; exact ⟨a, by simp, by simp⟩
    · obtain ⟨q, hq, low⟩ := ih empty
      by_cases le : a.rect.bottom ≤ q.rect.bottom
      · refine ⟨a, by simp, ?_⟩
        intro p hp
        rcases List.mem_cons.mp hp with rfl | hp
        · exact Int.le_refl _
        · exact Int.le_trans le (low p hp)
      · refine ⟨q, List.mem_cons_of_mem a hq, ?_⟩
        intro p hp
        rcases List.mem_cons.mp hp with rfl | hp
        · omega
        · exact low p hp

/-- New specification for owner review: every scroll offset of every scroll
viewport, not only the finitely many checked candidates, satisfies the bound. -/
theorem G10_window (limit : Nat) (v : Size) (ps : List Placed) (h : G10 limit v ps)
    (hv : v = ⟨92160,57600⟩) (c : String × Rect) (o : Int) :
    (windowTargets ps c o).length ≤ limit := by
  by_cases empty : windowTargets ps c o = []
  · simp [empty]
  obtain ⟨q, hq, low⟩ := lowest_bottom _ empty
  have qmem := List.mem_filter.mp hq
  simp only [Bool.and_eq_true, beq_iff_eq, decide_eq_true_eq] at qmem
  obtain ⟨qps, ⟨⟨_, qregion⟩, qwin⟩⟩ := qmem
  have counted : (windowTargets ps c (windowAt c q)).length ∈ windowCounts ps := by
    unfold windowCounts
    exact List.mem_filterMap.mpr ⟨q, qps, by simp [qregion]⟩
  refine Nat.le_trans ?_ ((h hv).2 _ counted)
  unfold windowTargets
  apply filter_length_mono
  intro p _ hp
  simp only [Bool.and_eq_true, beq_iff_eq, decide_eq_true_eq] at hp ⊢
  refine ⟨hp.1, ?_⟩
  have pin : p ∈ windowTargets ps c o := by
    unfold windowTargets
    exact List.mem_filter.mpr ⟨‹_›, by simp only [Bool.and_eq_true, beq_iff_eq, decide_eq_true_eq]; exact hp⟩
  have lowp := low p pin
  obtain ⟨x1, x2, y1, y2⟩ := hp.2
  obtain ⟨_, _, qy1, _⟩ := qwin
  simp only [InWindow, windowAt, Rect.bottom, Rect.right] at *
  omega

/-- New specification for owner review: the first-viewport half of G10. -/
theorem G10_first (limit : Nat) (v : Size) (ps : List Placed) (h : G10 limit v ps)
    (hv : v = ⟨92160,57600⟩) : (firstViewportTargets v ps).length ≤ limit := (h hv).1

/-- A larger limit never refuses an accepted layout. -/
theorem G10_mono {small large : Nat} (le : small ≤ large) (v : Size) (ps : List Placed)
    (h : G10 small v ps) : G10 large v ps := by
  intro hv
  exact ⟨Nat.le_trans (h hv).1 le, fun n hn => Nat.le_trans ((h hv).2 n hn) le⟩

instance (v ps) : Decidable (G1 v ps) := by unfold G1; infer_instance
instance (v ps) : Decidable (G2 v ps) := by unfold G2; infer_instance
instance (ps) : Decidable (G3 ps) := by unfold G3; infer_instance
instance (p t) : Decidable (textFits p t) := by unfold textFits; infer_instance
instance (v ps) : Decidable (G4 v ps) := by unfold G4; infer_instance
instance (v ps) : Decidable (G5 v ps) := by unfold G5; infer_instance
instance (ps) : Decidable (G6 ps) := by unfold G6; infer_instance
instance (expected ps) : Decidable (G7 expected ps) := by unfold G7; infer_instance
instance (a b) : Decidable (before a b) := by unfold before; infer_instance
instance (ps) : Decidable (G8 ps) := by unfold G8; infer_instance
instance (v ps) : Decidable (G9 v ps) := by unfold G9; infer_instance

def Rules (expected : List (List Nat)) (v : Size) (ps : List Placed) : Prop :=
  G1 v ps ∧ G2 v ps ∧ G3 ps ∧ G4 v ps ∧ G5 v ps ∧ G6 ps ∧ G7 expected ps ∧ G8 ps ∧ G9 v ps
instance (e v ps) : Decidable (Rules e v ps) := by unfold Rules; infer_instance

/-- Reflection is the gate; warnings never convert a failed rule to acceptance. -/
def check (expected : List (List Nat)) (v : Size) (ps : List Placed) : Bool := decide (Rules expected v ps)

theorem layoutAccepted_rules (expected v ps) (h : check expected v ps = true) : Rules expected v ps := by
  exact of_decide_eq_true h

/-- New specification for owner review: G1–G9 plus G10 with a density limit. -/
def checkDensity (limit : Nat) (expected : List (List Nat)) (v : Size) (ps : List Placed) : Bool :=
  check expected v ps && decide (G10 limit v ps)

theorem layoutAccepted_density (limit expected v ps) (h : checkDensity limit expected v ps = true) :
    Rules expected v ps ∧ G10 limit v ps := by
  simp only [checkDensity, Bool.and_eq_true, decide_eq_true_eq] at h
  exact ⟨layoutAccepted_rules expected v ps h.1, h.2⟩

/-- Universal over bound content for a fixed semantic template. This theorem
makes no claim that every EHR state has the same tree shape as the template. -/
theorem layoutAccepted_geometry (expected v n) (h : check expected v (boxes v n) = true)
    (data : Content) : Rules expected v (((boxes v n).map (bind data)).map Drawn.box) := by
  have hb : (((boxes v n).map (bind data)).map Drawn.box) = boxes v n := by
    simp [List.map_map, bind, Function.comp_def]
  rw [hb]
  exact layoutAccepted_rules expected v (boxes v n) h

/-- Check every supported desktop size once, independent of patient data. -/
def acceptTemplate (expected : List (List Nat)) (n : Node) : Bool :=
  viewports.all (fun v => check expected v (boxes v n))

theorem layoutAccepted_allViewports (e n) (h : acceptTemplate e n = true)
    (v : Size) (hv : v ∈ viewports) (data : Content) :
    Rules e v (((boxes v n).map (bind data)).map Drawn.box) := by
  exact layoutAccepted_geometry e v n (List.all_eq_true.mp h v hv) data

theorem layoutAccepted_textComplete (e v ps) (h : check e v ps = true)
    (p : Placed) (hp : p ∈ ps) (t : TextSlot) (ht : t ∈ p.info.text)
    (s : String) (bound : s.toList.length ≤ t.maxLength) (policy : t.overflow = .wrap) :
    ((textLines t p.rect.w s).map String.toList).flatten = s.toList := by
  have fits := (layoutAccepted_rules e v ps h).2.2.2.1.2.1 p hp t ht
  have hc := fits.2.2.2.2.2.2.2 policy
  apply wrap_complete t p.rect.w s policy
  exact Nat.le_trans bound (Nat.le_trans hc (Nat.mul_le_mul_left _ (Nat.le_max_right _ _)))

/-- No maximum string length, paragraph count or line count is assumed here.
Each Unicode scalar has a preserved source atom; the complete measured visual
spelling (including explicit escapes) is wrapped inside a vertical scroller. -/
def SafetyRealized (t : TextSlot) (w : Nat) (s : String) : Prop :=
  t.overflow = .scroll ∧ escapeReady t = true ∧
  (textAtoms t s).map TextAtom.original = s.toList ∧
  (scrollParagraphs t w (paintText t s)).map (fun lines => (lines.map String.toList).flatten) =
    ((paintText t s).splitOn "\n").map String.toList ∧
  (∀ c ∈ (paintText t s).toList, supported t c = true) ∧
  ∀ line ∈ textLines t w (paintText t s), textAdvance t line.toList ≤ w

theorem layoutAccepted_safety (e v ps) (h : check e v ps = true)
    (p : Placed) (hp : p ∈ ps) (t : TextSlot) (ht : t ∈ p.info.text)
    (safety : t.safety = true) (s : String) : SafetyRealized t p.rect.w s := by
  have fits := (layoutAccepted_rules e v ps h).2.2.2.1.2.1 p hp t ht
  rcases fits with ⟨_,_,_,cap,_,_,hs,_⟩
  obtain ⟨policy,ready⟩ := hs safety
  exact ⟨policy,ready,textAtoms_preserve t s,scroll_complete t p.rect.w (paintText t s),
    paintText_supported t s safety ready,fun line hl => scroll_line_width t p.rect.w (paintText t s) line policy cap hl⟩

theorem layoutAccepted_bannerPixels (e v ps) (h : check e v ps = true)
    (p q : Placed) (hp : p ∈ ps) (hq : q ∈ ps) (banner : p.info.banner = true)
    (paint : q.info.paint = true) (different : q.info.id ≠ p.info.id)
    (offset : String → Int) (x y : Int) : ¬ (Pixels p offset x y ∧ Pixels q offset x y) := by
  exact separated_pixels p q (((layoutAccepted_rules e v ps h).1.2 p hp banner).2 q hq paint different) offset x y

theorem layoutAccepted_textPixels (e v ps) (h : check e v ps = true)
    (p q : Placed) (hp : p ∈ ps) (hq : q ∈ ps) (text : p.info.text.isSome = true)
    (active : activePaint ps p = true) (paint : q.info.paint = true)
    (different : q.info.id ≠ p.info.id) (qactive : activePaint ps q = true)
    (above : p.style.z < q.style.z ∨ (p.style.z = q.style.z ∧ q.info.id ∉ p.parents))
    (offset : String → Int) (x y : Int) : ¬ (Pixels p offset x y ∧ Pixels q offset x y) := by
  exact separated_pixels p q ((layoutAccepted_rules e v ps h).2.2.2.1.2.2 p hp text active q hq paint different qactive above) offset x y

/-- Pointer/keyboard dispatch semantics: an active interruptive layer blocks
all other targets, independent of coordinates and stacking mistakes. -/
def dispatchable (ps : List Placed) (id : String) : Bool :=
  ps.any fun p => p.info.id == id && p.info.target &&
    (!(ps.any (·.info.interruptive)) || p.info.interruptive)

theorem modal_blocks (ps : List Placed) (id : String)
    (active : ps.any (·.info.interruptive) = true)
    (ordinary : ∀ p ∈ ps, p.info.id = id → p.info.interruptive = false) :
    dispatchable ps id = false := by
  simp only [dispatchable, active, Bool.not_true, Bool.false_or]
  apply Bool.eq_false_iff.mpr
  intro h
  obtain ⟨p,hp,h⟩ := List.any_eq_true.mp h
  simp only [Bool.and_eq_true, beq_iff_eq] at h
  have := ordinary p hp h.1.1
  simp_all

structure Finding where
  rule : String
  node : String := ""
  other : String := ""
  metric : String
  actual : Int := 0
  required : Int := 0
  deficit : Int := 0
  warning : Bool := false
  deriving Repr, ToJson

def overlapArea (a b : Rect) : Nat :=
  (min a.right b.right - max a.x b.x).toNat * (min a.bottom b.bottom - max a.y b.y).toNat

private def containmentFindings (rule : String) (v : Size) (p : Placed) : List Finding :=
  let r := envelope p
  [("left",-r.x),("top",-r.y),("right",r.right-v.w),("bottom",r.bottom-v.h)].filterMap fun (metric,deficit) =>
    if deficit > 0 then some { rule, node := p.info.id, metric, actual := deficit, deficit } else none

def findings (e : List (List Nat)) (v : Size) (ps : List Placed) : List Finding := Id.run do
  let flags := [("G1",decide (G1 v ps)),("G2",decide (G2 v ps)),("G3",decide (G3 ps)),
    ("G4",decide (G4 v ps)),("G5",decide (G5 v ps)),("G6",decide (G6 ps)),
    ("G7",decide (G7 e ps)),("G8",decide (G8 ps)),("G9",decide (G9 v ps))]
  let mut out := flags.filterMap fun (rule,ok) => if ok then none else some { rule, metric := "rule-failed" }
  for p in ps do
    if p.info.target then
      for (name,n) in [("width",p.rect.w),("height",p.rect.h)] do
        if n < 1792 then
          out := out ++ [{ rule := "G3", node := p.info.id, metric := name, actual := n, required := 1536, deficit := (1536 : Int)-n, warning := n ≥ 1536 }]
    for t in p.info.text.toList do
      if t.safety && t.overflow != .scroll then
        out := out ++ [{ rule := "G4", node := p.info.id, metric := "unbounded-safety-requires-vertical-wrap" }]
      if t.safety && !escapeReady t then
        out := out ++ [{ rule := "G4", node := p.info.id, metric := "safety-escape-alphabet-missing" }]
      let cap := t.maxLines*capacity t p.rect.w
      if t.overflow == .wrap && cap < t.maxLength+8 then
        out := out ++ [{ rule := "G4", node := p.info.id, metric := "character-capacity", actual := cap, required := t.maxLength, deficit := (t.maxLength : Int)-cap, warning := cap ≥ t.maxLength }]
  let banners := (ps.filter (·.info.banner)).length
  if banners != 1 then
    out := out ++ [{ rule := "G1", metric := "banner-count", actual := banners, required := 1, deficit := (1 : Int)-banners }]
  for p in ps do
    if p.info.paint then out := out ++ containmentFindings "G4" v p
    if p.info.interruptive then
      out := out ++ containmentFindings "G2" v p
      for q in ps do
        if q.info.paint && !q.info.interruptive && q.style.z ≥ p.style.z then
          out := out ++ [{ rule := "G2", node := p.info.id, other := q.info.id, metric := "z-order", actual := p.style.z, required := q.style.z+1, deficit := q.style.z+1-p.style.z }]
    for t in p.info.text.toList do
      let (n,d) := contrastBound p.style.fg p.style.bg
      let ratio := if t.fontSize ≥ 1536 || (t.font ≥ 3 && t.font ≤ 5 && t.fontSize ≥ 1195) then 3000000 else 4500000
      let lower := n*1000000/d
      if lower < ratio+250000 then
        out := out ++ [{ rule := "G6", node := p.info.id, metric := "contrast-lower-millionths", actual := lower, required := ratio, deficit := (ratio : Int)-lower, warning := lower ≥ ratio }]
  for (p,i) in ps.zipIdx do
    for q in ps.drop (i+1) do
      if p.info.banner && q.info.paint && !decide (separated p q) then
        out := out ++ [{ rule := "G1", node := p.info.id, other := q.info.id, metric := "overlap-area", actual := overlapArea (envelope p) (envelope q) }]
      if activeTarget ps p && activeTarget ps q && !decide (separated p q) then
        out := out ++ [{ rule := "G3", node := p.info.id, other := q.info.id, metric := "overlap-area", actual := overlapArea p.rect q.rect }]
      if p.info.paint && q.info.paint && p.info.source.isNone && q.info.source.isNone && !decide (Apart p.rect q.rect) then
        out := out ++ [{ rule := "exploit", node := p.info.id, other := q.info.id, metric := "overlap-area", actual := overlapArea p.rect q.rect, warning := true }]
  for path in e do
    let count := (ps.filter (fun p => p.info.source == some path && p.info.paint)).length
    if count != 1 then
      out := out ++ [{ rule := "G7", node := toString path, metric := "source-count", actual := count, required := 1, deficit := (1 : Int)-count }]
  if v == ⟨92160,57600⟩ then
    let count := (ps.filter (·.info.commit)).length
    if count > 1 then
      out := out ++ [{ rule := "G9", metric := "current-commit-count", actual := count, required := 1, deficit := (1 : Int)-count }]
  return out

/-- New specification for owner review: G10 diagnostics with counts. A region
reports its densest candidate window; `deficit` is the excess over the limit. -/
def densityFindings (limit : Nat) (v : Size) (ps : List Placed) : List Finding :=
  if v != ⟨92160,57600⟩ then [] else
  let first := (firstViewportTargets v ps).length
  let firstOut : List Finding := if limit < first then
    [{ rule := "G10", metric := "first-viewport-targets", actual := first, required := limit,
       deficit := (first : Int) - limit }] else []
  let worst := ps.foldl (fun (acc : List (String × String × Nat)) q =>
    match scrollRegion q with
    | none => acc
    | some c =>
      let n := (windowTargets ps c (windowAt c q)).length
      match acc.find? (·.1 == c.1) with
      | some (_, _, m) => if m < n then (c.1, q.info.id, n) :: acc.filter (·.1 != c.1) else acc
      | none => (c.1, q.info.id, n) :: acc) []
  firstOut ++ (worst.reverse.filterMap fun (region, top, n) =>
    if limit < n then
      some { rule := "G10", node := region, other := top, metric := "scroll-window-targets",
             actual := n, required := limit, deficit := (n : Int) - limit }
    else none)

/-- Largest first-viewport and scroll-window active-target counts (measurement). -/
def densityCounts (v : Size) (ps : List Placed) : Nat × Nat :=
  ((firstViewportTargets v ps).length, (windowCounts ps).foldl max 0)

#print axioms G9_exempt
#print axioms apart_pixels
#print axioms separated_pixels
#print axioms layoutAccepted_bannerPixels
#print axioms layoutAccepted_textPixels
#print axioms layoutAccepted_safety
#print axioms layoutAccepted_rules
#print axioms layoutAccepted_geometry
#print axioms layoutAccepted_allViewports
#print axioms layoutAccepted_textComplete
#print axioms modal_blocks
#print axioms G10_window
#print axioms G10_first
#print axioms G10_mono
#print axioms layoutAccepted_density
end Ehr.Layout
