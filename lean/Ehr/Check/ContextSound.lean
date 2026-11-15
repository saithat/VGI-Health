import Ehr.Check.RuleSound
import Ehr.Check.PinSound
import Ehr.Check.NavigationSound

/-! R4/R6 checker soundness. New specifications, outside Comparator. -/
namespace Ehr.Check
open Ehr Ehr.Props

/-- R4's bounded search returns genuine goto paths from the commit screen. -/
theorem contextDestinations_sound (sp p a z) (h : z ∈ contextDestinations sp p a) :
    ∃ hops, GotoPath p a hops z ∧ hops.length ≤ sp.design.maxDepth := by
  simp only [contextDestinations, List.mem_map, List.mem_filter,
    Bool.and_eq_true, decide_eq_true_eq] at h
  obtain ⟨zh, ⟨_, hp, hn⟩, rfl⟩ := h
  exact ⟨_, isGotoPath_sound p _ _ _ hp, by simpa using hn⟩

/-- A checked reveal preserves visibility for every patient's facts and state. -/
theorem contextShownAux_sound (sp : Spec) (facts : Facts) (s : State) (comps : List Component) (layout : State) (fuel : Nat) (c : Component)
    (h : contextShownAux comps layout fuel c = true) :
    layoutShownAux sp facts { s with expanded := layout.expanded, tabSel := layout.tabSel } comps fuel c = true := by
  induction fuel generalizing c with
  | zero => simp [contextShownAux] at h
  | succ fuel ih =>
    simp only [contextShownAux, Bool.and_eq_true, bne_iff_ne, beq_iff_eq] at h
    have hv : ownVisible sp facts { s with expanded := layout.expanded, tabSel := layout.tabSel } c = true := by
      simp [ownVisible, h.1.1, h.1.2]
    simp only [layoutShownAux, hv, Bool.true_and]
    cases hp : c.parent? with
    | none => simp
    | some id =>
      simp only [hp] at h ⊢
      cases hf : comps.find? (·.id == id) with
      | none => simp [hf] at h
      | some par =>
        simp only [hf, Bool.and_eq_true] at h ⊢
        have ho : parentOpen { s with expanded := layout.expanded, tabSel := layout.tabSel } par c =
            parentOpen layout par c := by cases par.kind <;> rfl
        exact ⟨ho ▸ h.2.1, ih par h.2.2⟩

/-- A provider can display the info by changing only expansion and tab state. -/
theorem contextProvider_sound (sp p z i) (h : contextProvider p z i = true)
    (facts : Facts) (user : User) (s : State) (hs : s.screen = z) : ∃ expanded tabs,
      InfoShown ⟨sp, p, facts, user⟩ { s with expanded := expanded, tabSel := tabs } i := by
  unfold contextProvider at h
  cases hz : p.screen? z with
  | none => simp [hz] at h
  | some scr =>
    simp only [hz, Option.any_some, List.any_eq_true, Bool.and_eq_true] at h
    obtain ⟨c, hc, hi, hvis⟩ := h
    refine ⟨(contextLayout scr.components c).expanded, (contextLayout scr.components c).tabSel, ?_⟩
    apply (infoShown_iff _ _ i).mp
    simp only [infoShown, Program.compsOf, hs, hz]
    exact List.any_eq_true.mpr ⟨c, hc, by
      simp only [Bool.and_eq_true]
      exact ⟨hi, by simpa only [layoutShown, hs] using contextShownAux_sound sp facts s _ _ _ c hvis⟩⟩

/-- Executable context retention implies the R4 property. -/
theorem contextRetained_sound (sp p) (h : contextRetained sp p = true) :
    ContextRetained sp p := by
  intro scr hscr c hc cm hcm
  have hr := List.all_eq_true.mp (List.all_eq_true.mp h scr hscr) c hc
  have hm : (commitOf? c.kind).isNone = false := by
    cases hh : commitOf? c.kind with
    | none => simp [hh] at hcm
    | some x => rfl
  simp only [hm, Bool.false_or] at hr
  simp only [Bool.and_eq_true, decide_eq_true_eq] at hr
  refine ⟨hr.1, ?_⟩
  intro i hi
  have ha := List.all_eq_true.mp hr.2 i hi
  simp only [contextAvailable, Bool.and_eq_true, List.any_eq_true] at ha
  obtain ⟨declared, z, hz, hp⟩ := ha
  obtain ⟨hops, hpath, hbound⟩ := contextDestinations_sound sp p scr.id z hz
  exact ⟨declared, z, hops, hpath, hbound, contextProvider_sound sp p z i hp⟩

/-- New specification R4: accepted programs retain the declared context. -/
theorem accepted_contextRetained (sp prev can p) (h : check sp prev can p = .ok) :
    ContextRetained sp p := by
  have hall := (check_ok_iff sp prev can p).mp h
  simp only [rules, List.mem_cons, forall_eq_or_imp, List.not_mem_nil] at hall
  rcases hall with ⟨_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, hcontext, _⟩
  simp only [Bool.and_eq_true] at hcontext
  exact contextRetained_sound sp p hcontext.2

/-- New specification R4: acceptance requires an explicit context policy or
the historical hospital defaults, independently of whether any commit exists. -/
theorem accepted_contextsDeclared (sp prev can p) (h : check sp prev can p = .ok) :
    Specs.DesignPolicies.contextsDeclared sp = true := by
  have hall := (check_ok_iff sp prev can p).mp h
  simp only [rules, List.mem_cons, forall_eq_or_imp, List.not_mem_nil] at hall
  rcases hall with ⟨_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, hcontext, _⟩
  simp only [Bool.and_eq_true] at hcontext
  exact hcontext.1

/-- New specification R6/D5: accepted programs have honest bounded nav labels. -/
theorem accepted_navigationLabels (sp prev can p) (h : check sp prev can p = .ok) :
    Render.NavigationLabelsHonest sp p := by
  have hall := (check_ok_iff sp prev can p).mp h
  simp only [rules, List.mem_cons, forall_eq_or_imp, List.not_mem_nil] at hall
  rcases hall with ⟨_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, hlabels, _⟩
  exact of_decide_eq_true hlabels

/-- D5's existing navigation guarantees and its R6 extension hold together. -/
theorem accepted_D5 (sp prev can p) (h : check sp prev can p = .ok) :
    NavigationSane p ∧ Render.NavigationLabelsHonest sp p :=
  ⟨accepted_navigation sp prev can p h, accepted_navigationLabels sp prev can p h⟩

#print axioms contextDestinations_sound
#print axioms contextShownAux_sound
#print axioms contextProvider_sound
#print axioms contextRetained_sound
#print axioms accepted_contextRetained
#print axioms accepted_contextsDeclared
#print axioms accepted_navigationLabels
#print axioms accepted_D5
end Ehr.Check
