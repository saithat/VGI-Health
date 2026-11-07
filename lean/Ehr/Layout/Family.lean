import Ehr.Layout.Semantic
import Ehr.Render.Api
import Ehr.Props.Basics

/-! Finite, data-erased admission families and the bridge to the actual EHR
renderer. Admission happens once on each structural case and viewport. Runtime
binding never re-checks string lengths or a patient's layout in a browser.
Coverage is explicit; this module does not assume all EHR states have one shape. -/
namespace Ehr.Layout
open Lean Ehr.Render

structure Candidate where
  shape : ScreenShape
  tree : Size → Node
  deriving Inhabited

abbrev Family := List Candidate

/-- An untrusted designer cannot omit a real commit flag to claim G9 exemption,
relabel a target as static, or replace a semantic value by a non-safety slot.
Nonsemantic ornaments remain free; they cannot invent a patient banner/commit. -/
def SourceLinked (shape : ScreenShape) (p : Placed) : Prop :=
  match p.info.source with
    | none => p.info.banner = false ∧ p.info.commit = false
    | some path => ∃ slot ∈ shape, slot.path = path ∧
        p.info.target = slot.target ∧ p.info.banner = (slot.region == .banner) ∧
        p.info.commit = (slot.region == .footer) ∧ p.info.interruptive = (slot.region == .modal) ∧
        ∃ t ∈ p.info.text, t.safety = true
instance (shape p) : Decidable (SourceLinked shape p) := by
  unfold SourceLinked
  split <;> infer_instance

def Linked (shape : ScreenShape) (ps : List Placed) : Prop := ∀ p ∈ ps, SourceLinked shape p
instance (shape ps) : Decidable (Linked shape ps) := by unfold Linked; infer_instance

def admitCandidate (c : Candidate) : Bool := viewports.all fun v =>
  check (shapeSources c.shape) v (boxes v (c.tree v)) && decide (Linked c.shape (boxes v (c.tree v)))

def acceptFamily (family : Family) : Bool := family.all admitCandidate

def selectCandidate (family : Family) (screen : UiScreen) : Option Candidate :=
  family.find? (fun c => c.shape == screenShape screen)

def familyPaint (family : Family) (screen : UiScreen) (v : Size) : Option (List Drawn) :=
  (selectCandidate family screen).map fun c => (boxes v (c.tree v)).map (bindSemantic screen)

/-- Finite shape coverage, not a content bound or a per-patient acceptance
hypothesis. Adding more reference shapes is checkable without Lean compilation. -/
def Covered (family : Family) (screen : UiScreen) : Prop :=
  ∃ c ∈ family, c.shape = screenShape screen

def familyCapacity (family : Family) : Nat := (family.map (fun c => c.shape.length)).sum

private theorem candidate_length_le (family : Family) (c : Candidate) (member : c ∈ family) :
    c.shape.length ≤ familyCapacity family := by
  induction family with
  | nil => simp at member
  | cons x xs ih =>
    simp only [List.mem_cons] at member
    rcases member with rfl | member
    · simp [familyCapacity]
    · have bound := ih member
      simp only [familyCapacity, List.map_cons, List.sum_cons] at *
      omega

/-- A finite enumerated family cannot cover all possible UiScreens. This does
not rule out a coverage proof for a particular EHR program; it rules out treating
finite probes as a universal coverage proof for arbitrary structural growth. -/
theorem finiteFamily_missingShape (family : Family) : ∃ screen, ¬ Covered family screen := by
  refine ⟨flatScreen (familyCapacity family+1),?_⟩
  intro covered
  obtain ⟨c,hc,same⟩ := covered
  have bound := candidate_length_le family c hc
  rw [same, screenShape_flat_length] at bound
  omega

/-- The exact semantic and safety guarantees delivered for a concrete screen.
The original Unicode text is emitted in full even when its pinned-font spelling
contains explicit code-point escapes. No source-length bound appears. -/
def Realizes (screen : UiScreen) (v : Size) (painted : List Drawn) : Prop :=
  Rules ((screenNodes screen).map Prod.fst) v (painted.map Drawn.box) ∧
  Linked (screenShape screen) (painted.map Drawn.box) ∧
  ∀ d ∈ painted, ∀ path ∈ d.box.info.source, ∃ t ∈ d.box.info.text,
    t.safety = true ∧ d.original = some (sourceValue screen path) ∧
    d.lines = textLines t d.box.rect.w (paintText t (sourceValue screen path)) ∧
    SafetyRealized t d.box.rect.w (sourceValue screen path)

theorem accepted_candidate (family : Family) (h : acceptFamily family = true)
    (c : Candidate) (hc : c ∈ family) (v : Size) (hv : v ∈ viewports) :
    check (shapeSources c.shape) v (boxes v (c.tree v)) = true ∧ Linked c.shape (boxes v (c.tree v)) := by
  have hall := List.all_eq_true.mp (List.all_eq_true.mp h c hc) v hv
  simp only [Bool.and_eq_true] at hall
  exact ⟨hall.1, of_decide_eq_true hall.2⟩

theorem select_covered (family : Family) (screen : UiScreen) (covered : Covered family screen) :
    ∃ c ∈ family, selectCandidate family screen = some c ∧ c.shape = screenShape screen := by
  have existsSome : (selectCandidate family screen).isSome := by
    apply List.find?_isSome.mpr
    obtain ⟨c,hc,hs⟩ := covered
    exact ⟨c,hc,by simp [hs]⟩
  cases hs : selectCandidate family screen with
  | none => simp [hs] at existsSome
  | some c =>
    have hm : c ∈ family := List.mem_of_find?_eq_some hs
    have he : (c.shape == screenShape screen) = true := List.find?_some (p := fun x : Candidate => x.shape == screenShape screen) hs
    exact ⟨c,hm,rfl,by simpa using he⟩

/-- Strongest content-universal result: every UiScreen of any admitted semantic
shape, all source strings (without length or glyph hypotheses), every supported
viewport. No acceptance check on this particular screen is a premise. -/
theorem layoutAccepted_allScreens (family : Family) (h : acceptFamily family = true)
    (screen : UiScreen) (covered : Covered family screen) (v : Size) (hv : v ∈ viewports) :
    ∃ painted, familyPaint family screen v = some painted ∧ Realizes screen v painted := by
  obtain ⟨c,hc,selected,same⟩ := select_covered family screen covered
  obtain ⟨checked,linked⟩ := accepted_candidate family h c hc v hv
  refine ⟨(boxes v (c.tree v)).map (bindSemantic screen),by simp [familyPaint,selected],?_⟩
  have geom : ((boxes v (c.tree v)).map (bindSemantic screen)).map Drawn.box = boxes v (c.tree v) := by
    simp [List.map_map,Function.comp_def,bindSemantic_box]
  refine ⟨?_,?_,?_⟩
  · rw [geom, ← screenShape_sources, ← same]
    exact layoutAccepted_rules _ _ _ checked
  · rw [geom, ← same]
    exact linked
  · intro d hd path hp
    obtain ⟨p,hpMem,rfl⟩ := List.mem_map.mp hd
    have hbox := bindSemantic_box screen p
    rw [hbox] at hp ⊢
    have hs : p.info.source = some path := Option.mem_def.mp hp
    have hl := linked p hpMem
    unfold SourceLinked at hl
    rw [hs] at hl
    obtain ⟨slot,_,_,_,_,_,_,t,ht,hsafe⟩ := hl
    have htEq : p.info.text = some t := Option.mem_def.mp ht
    have painted := bindSemantic_original screen p path t hs htEq
    exact ⟨t,ht,hsafe,painted.1,painted.2,layoutAccepted_safety _ _ _ checked p hpMem t ht hsafe _⟩

private theorem shape_path_unique (shape : ScreenShape) (unique : (shapeSources shape).Nodup)
    (a b : SlotShape) (ha : a ∈ shape) (hb : b ∈ shape) (same : a.path = b.path) : a = b := by
  induction shape with
  | nil => simp at ha
  | cons x xs ih =>
    simp only [shapeSources, List.map_cons, List.nodup_cons] at unique
    simp only [List.mem_cons] at ha hb
    rcases ha with rfl | ha <;> rcases hb with rfl | hb
    · rfl
    · exact False.elim (unique.1 (List.mem_map.mpr ⟨b,hb,same.symm⟩))
    · exact False.elim (unique.1 (List.mem_map.mpr ⟨a,ha,same⟩))
    · exact ih unique.2 ha hb

/-- The G9 exemption cannot be obtained by hiding a real current-task source:
source completeness and linkage force its commit flag and viewport placement. -/
theorem realized_currentCommit_visible (screen : UiScreen) (v : Size) (painted : List Drawn)
    (h : Realizes screen v painted) (slot : SlotShape) (member : slot ∈ screenShape screen)
    (current : slot.region = .footer) (primary : v = ⟨92160,57600⟩) :
    ∃ d ∈ painted, d.box.info.source = some slot.path ∧ d.box.info.commit = true ∧
      d.box.info.target = true ∧ visible v d.box := by
  have g7 := h.1.2.2.2.2.2.2.1
  have paths : (shapeSources (screenShape screen)).Nodup := by
    rw [screenShape_sources]
    exact g7.2.1
  have sourceMember : slot.path ∈ (screenNodes screen).map Prod.fst := by
    rw [← screenShape_sources]
    exact List.mem_map.mpr ⟨slot,member,rfl⟩
  have counted := g7.2.2.1 slot.path sourceMember
  obtain ⟨p,hp⟩ := List.exists_mem_of_length_pos (show 0 < _ from by rw [counted]; decide)
  have hp' := List.mem_filter.mp hp
  have hs : p.info.source = some slot.path := by
    have hflags := hp'.2
    simp only [Bool.and_eq_true, beq_iff_eq] at hflags
    exact hflags.1
  have linked := h.2.1 p hp'.1
  unfold SourceLinked at linked
  rw [hs] at linked
  obtain ⟨other,ho,hpath,_,_,commit,_,_⟩ := linked
  have same := shape_path_unique _ paths other slot ho member hpath
  have committed : p.info.commit = true := by simpa [same,current] using commit
  have present : ((painted.map Drawn.box).any (·.info.commit)) = true :=
    List.any_eq_true.mpr ⟨p,hp'.1,committed⟩
  have g9 := h.1.2.2.2.2.2.2.2.2 primary present
  have vis := g9.2 p hp'.1 committed
  obtain ⟨d,hd,rfl⟩ := List.mem_map.mp hp'.1
  exact ⟨d,hd,hs,committed,vis⟩

/-- Total partial-correctness result: no coverage premise. Every result is
proved, or the exact missing structural case is diagnosed. A missing shape is
never misreported as a length/glyph violation or as successful painting. -/
theorem familyPaint_sound (family : Family) (accepted : acceptFamily family = true)
    (screen : UiScreen) (v : Size) (hv : v ∈ viewports) :
    match familyPaint family screen v with
    | none => ¬ Covered family screen
    | some painted => Realizes screen v painted := by
  classical
  by_cases covered : Covered family screen
  · obtain ⟨painted,hp,realized⟩ := layoutAccepted_allScreens family accepted screen covered v hv
    rw [hp]
    exact realized
  · have absent : selectCandidate family screen = none := by
      cases hs : selectCandidate family screen with
      | none => rfl
      | some c =>
        have hm : c ∈ family := List.mem_of_find?_eq_some hs
        have he : (c.shape == screenShape screen) = true :=
          List.find?_some (p := fun x : Candidate => x.shape == screenShape screen) hs
        exact False.elim (covered ⟨c,hm,by simpa using he⟩)
    simpa [familyPaint,absent] using covered

/-- All EHR patients/displays/users/states, including unreachable ones, without
any string bound or coverage premise. This is a partial renderer theorem: the
none branch explicitly identifies a missing semantic shape. -/
theorem layoutAccepted_allStates (sp : Ehr.Spec) (program : Ehr.Program) (family : Family)
    (accepted : acceptFamily family = true) :
    ∀ (facts : Ehr.Facts) (display : Display) (user : Ehr.User) (state : Ehr.State),
      ∀ v ∈ viewports,
      match familyPaint family (runRenderUi ⟨sp,program,facts,display,user,state⟩) v with
      | none => ¬ Covered family (runRenderUi ⟨sp,program,facts,display,user,state⟩)
      | some painted => Realizes (runRenderUi ⟨sp,program,facts,display,user,state⟩) v painted := by
  intro facts display user state v hv
  exact familyPaint_sound family accepted _ v hv

/-- A certified rendering family may be a finite descriptor or a proved
parameterized structural compiler. Every instance supplies the same Realizes
contract; this extends representation without changing any G1–G9 predicate. -/
class RenderFamily (F : Type) where
  admitted : F → Bool
  covered : F → UiScreen → Prop
  paint : F → UiScreen → Size → Option (List Drawn)
  sound : ∀ family, admitted family = true → ∀ screen, covered family screen →
    ∀ v ∈ viewports, ∃ painted, paint family screen v = some painted ∧ Realizes screen v painted

instance : RenderFamily Family where
  admitted := acceptFamily
  covered := Covered
  paint := familyPaint
  sound := layoutAccepted_allScreens

/-- This is the remaining structural-coverage obligation for an EHR program.
It quantifies over actual init/step/macro/wait reachability, every patient Facts,
every Display and user. It does not restrict source strings or row counts. -/
def RenderCovered {F : Type} [RenderFamily F] (sp : Ehr.Spec) (program : Ehr.Program) (family : F) : Prop :=
  ∀ (facts : Ehr.Facts) (display : Display) (user : Ehr.User) (state : Ehr.State),
    Ehr.Props.Reachable ⟨sp,program,facts,user⟩ state →
    RenderFamily.covered family (runRenderUi ⟨sp,program,facts,display,user,state⟩)

/-- EHR bridge: all patients, displays, users, reachable states and supported
viewports, assuming a separately proved structural coverage certificate. The
coverage premise is deliberately visible and is not discharged by sampling. -/
theorem layoutAccepted_allPatients {F : Type} [RenderFamily F]
    (sp : Ehr.Spec) (program : Ehr.Program) (family : F)
    (accepted : RenderFamily.admitted family = true) (coverage : RenderCovered sp program family) :
    ∀ (facts : Ehr.Facts) (display : Display) (user : Ehr.User) (state : Ehr.State),
      Ehr.Props.Reachable ⟨sp,program,facts,user⟩ state →
      ∀ v ∈ viewports, ∃ painted,
        RenderFamily.paint family (runRenderUi ⟨sp,program,facts,display,user,state⟩) v = some painted ∧
        Realizes (runRenderUi ⟨sp,program,facts,display,user,state⟩) v painted := by
  intro facts display user state reachable v hv
  exact RenderFamily.sound family accepted _ (coverage facts display user state reachable) v hv

/-- Definitional compatibility with the original finite-family coverage
obligation: no quantifier or accepted finite layout is weakened. -/
theorem RenderCovered_finite_iff (sp : Ehr.Spec) (program : Ehr.Program) (family : Family) :
    RenderCovered sp program family ↔
      ∀ (facts : Ehr.Facts) (display : Display) (user : Ehr.User) (state : Ehr.State),
        Ehr.Props.Reachable ⟨sp,program,facts,user⟩ state →
        Covered family (runRenderUi ⟨sp,program,facts,display,user,state⟩) := Iff.rfl

theorem layoutAccepted_allPatients_finite (sp : Ehr.Spec) (program : Ehr.Program) (family : Family)
    (accepted : acceptFamily family = true) (coverage : RenderCovered sp program family) :
    ∀ (facts : Ehr.Facts) (display : Display) (user : Ehr.User) (state : Ehr.State),
      Ehr.Props.Reachable ⟨sp,program,facts,user⟩ state →
      ∀ v ∈ viewports, ∃ painted,
        familyPaint family (runRenderUi ⟨sp,program,facts,display,user,state⟩) v = some painted ∧
        Realizes (runRenderUi ⟨sp,program,facts,display,user,state⟩) v painted :=
  layoutAccepted_allPatients sp program family accepted coverage

#print axioms RenderCovered_finite_iff
#print axioms layoutAccepted_allPatients_finite

#print axioms candidate_length_le
#print axioms finiteFamily_missingShape
#print axioms shape_path_unique
#print axioms realized_currentCommit_visible
#print axioms accepted_candidate
#print axioms select_covered
#print axioms layoutAccepted_allScreens
#print axioms familyPaint_sound
#print axioms layoutAccepted_allStates
#print axioms layoutAccepted_allPatients
end Ehr.Layout
