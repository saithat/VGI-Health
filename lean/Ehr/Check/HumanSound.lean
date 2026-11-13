import Ehr.Check.RequestSound

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Proofs

/-- The stronger provenance class includes never-prefill elements. -/
def NoNewHuman (sp : Spec) (s t : State) : Prop :=
  ∀ x ∈ t.captured, ∀ el, sp.element? x.element = some el → HumanMustEnter el → x ∈ s.captured

private theorem NoNewHuman.refl (sp s) : NoNewHuman sp s s := fun _ hx _ _ _ => hx
private theorem NoNewHuman.trans {sp s t z} (h : NoNewHuman sp s t) (h' : NoNewHuman sp t z) :
    NoNewHuman sp s z := fun x hx el he hh => h x (h' x hx el he hh) el he hh

/-- Every captured human-required value is already a confirmed human entry. -/
def HumanCaptured (sp : Spec) (s : State) : Prop :=
  ∀ x ∈ s.captured, ∀ el, sp.element? x.element = some el → HumanMustEnter el →
    x.byHuman = true ∧ x.confirmed = true

private theorem NoNewHuman.preserves {sp s t} (h : NoNewHuman sp s t) (hi : HumanCaptured sp s) :
    HumanCaptured sp t := fun x hx el he hh => hi x (h x hx el he hh) el he hh

private theorem prefillField_noHuman (sp f s c) : NoNewHuman sp s (prefillField sp f s c) := by
  unfold prefillField
  split
  · rename_i e slot pf hk
    split
    · exact .refl _ _
    · rename_i req hreq
      dsimp only
      split
      · exact .refl _ _
      · rename_i hnot
        split
        · exact .refl _ _
        · rename_i new hnew
          intro x hx el hel hh
          simp only [List.mem_append, List.mem_singleton] at hx
          rcases hx with hx | rfl
          · exact hx
          · have he : x.element = e := prefillRecord_element hnew
            have heq : el = req := by simpa [he, hreq] using hel.symm
            subst el
            simp only [Bool.or_eq_true, beq_iff_eq, not_or] at hnot
            exact False.elim (hh.elim hnot.1.2 hnot.1.1)
  · exact .refl _ _

private theorem prefillScreen_noHuman (sp p f s) : NoNewHuman sp s (prefillScreen sp p f s) := by
  unfold prefillScreen
  generalize p.compsOf s.screen = cs
  induction cs generalizing s with
  | nil => exact .refl _ _
  | cons c cs ih => exact (prefillField_noHuman sp f s c).trans (ih _)

private theorem goTo_noHuman (sp p f s z) : NoNewHuman sp s (goTo sp p f s z).1 := by
  unfold goTo
  split
  · exact .refl _ _
  · exact prefillScreen_noHuman _ _ _ _

private theorem goBack_noHuman (sp p f s) : NoNewHuman sp s (goBack sp p f s).1 := by
  unfold goBack
  split
  · exact .refl _ _
  · exact prefillScreen_noHuman _ _ _ _

private theorem clickCore_noHuman (sp p f u actor s c) :
    NoNewHuman sp s (clickCore sp p f u actor s c).1 := by
  unfold clickCore
  split
  · cases actor
    · unfold clickAlert; repeat' (first | exact NoNewHuman.refl _ _ | split | dsimp only)
    · exact .refl _ _
  · exact goTo_noHuman _ _ _ _ _
  · exact goBack_noHuman _ _ _ _
  · cases actor
    · unfold clickCommit; repeat' (first | exact NoNewHuman.refl _ _ | split | dsimp only)
    · exact .refl _ _
  · cases actor
    · unfold markReviewed; repeat' (first | exact NoNewHuman.refl _ _ | split | dsimp only)
    · exact .refl _ _
  · split
    · exact prefillScreen_noHuman _ _ _ _
    · exact .refl _ _
  · exact requestPriorAuth_no_human_capture _ _ _ _ (epochNow f s)
  · exact .refl _ _
  · cases actor <;> exact .refl _ _
  · exact .refl _ _

private theorem enterCore_macro_noHuman (sp p f u s cid v) :
    NoNewHuman sp s (enterCore sp p f u .«macro» s cid v).1 := by
  unfold enterCore
  split
  · exact .refl _ _
  · split
    · split
      · exact .refl _ _
      · rename_i req hreq
        split
        · exact .refl _ _
        · dsimp only
          split
          · exact .refl _ _
          · rename_i hnot
            split
            · exact .refl _ _
            · intro x hx el hel hh
              simp only [setCaptured, List.mem_append, List.mem_filter, List.mem_singleton] at hx
              rcases hx with ⟨hx, _⟩ | rfl
              · exact hx
              · have heq : el = req := by simpa [storedCapture, hreq] using hel.symm
                subst el
                simp only [Bool.or_eq_true, beq_iff_eq, not_or] at hnot
                exact False.elim (hh.elim hnot.1 hnot.2)
    · cases v <;> exact fun _ hx _ _ _ => hx
    · exact .refl _ _

private theorem enterCore_human_quality (sp p f u s cid v) (hi : HumanCaptured sp s) :
    HumanCaptured sp (enterCore sp p f u .human s cid v).1 := by
  unfold enterCore
  split
  · exact hi
  repeat' (first | contradiction | exact hi | split | dsimp only)
  all_goals
    intro x hx el hel hh
    simp only [setCaptured, List.mem_append, List.mem_filter, List.mem_singleton] at hx
    rcases hx with ⟨hx, _⟩ | rfl
    · exact hi x hx el hel hh
    · exact ⟨rfl, rfl⟩

private theorem confirmCore_noHuman (sp p f u actor s cid) (hi : HumanCaptured sp s) :
    NoNewHuman sp s (confirmCore sp p f u actor s cid).1 := by
  unfold confirmCore
  repeat' (first | exact NoNewHuman.refl _ _ | split | dsimp only)
  intro x hx el hel hh
  obtain ⟨y, hy, rfl⟩ := List.mem_map.mp hx
  split
  · rename_i hcond
    simp only [hcond, ↓reduceIte] at hel
    have he : sp.element? y.element = some el := hel
    have hc := (hi y hy el he hh).2
    have heq : { y with confirmed := true } = y := by cases y; simp_all
    simpa only [heq] using hy
  · exact hy

private theorem stepCore_noHuman (sp p f u actor s e) (hi : HumanCaptured sp s)
    (hne : actor = .human → ∀ cid v, e ≠ .enter cid v) :
    NoNewHuman sp s (stepCore sp p f u actor s e).1 := by
  unfold stepCore
  split
  · exact .refl _ _
  · cases e with
    | click cid => simp only [stepEvent]; split; exact .refl _ _; exact clickCore_noHuman _ _ _ _ _ _ _
    | enter cid v =>
      cases actor
      · exact False.elim (hne rfl cid v rfl)
      · simp only [stepEvent]
        split
        · rw [reconcileCore_macro]; exact .refl _ _
        · exact enterCore_macro_noHuman _ _ _ _ _ _ _
    | confirm cid => exact confirmCore_noHuman _ _ _ _ _ _ _ hi
    | ack a => simp only [stepEvent]; unfold ackCore; repeat' (first | exact NoNewHuman.refl _ _ | split | dsimp only)
    | selectTab cid idx => simp only [stepEvent]; unfold selectTabCore; repeat' (first | exact NoNewHuman.refl _ _ | split | dsimp only)
    | scroll z => simp only [stepEvent]; split <;> exact .refl _ _
    | search q => simp only [stepEvent]; split <;> exact .refl _ _

private theorem macroStep_noHuman (sp p f u s st) (hi : HumanCaptured sp s) :
    NoNewHuman sp s (macroStep sp p f u s st).1 := by
  cases st with
  | setValue cid v => exact stepCore_noHuman _ _ _ _ _ _ _ hi (by intro h; contradiction)
  | click cid => exact stepCore_noHuman _ _ _ _ _ _ _ hi (by intro h; contradiction)
  | goto z => simp only [macroStep]; split; exact .refl _ _; exact goTo_noHuman _ _ _ _ _

private theorem runMacro_noHuman (sp p f u) (steps : List MacroStep) (i s)
    (hi : HumanCaptured sp s) : NoNewHuman sp s (runMacro sp p f u i s steps).1 := by
  induction steps generalizing i s with
  | nil => exact .refl _ _
  | cons st steps ih =>
    have ht := macroStep_noHuman sp p f u s st hi
    unfold runMacro
    split
    · rename_i t he
      rw [he] at ht
      exact ht.trans (ih _ _ (ht.preserves hi))
    · rename_i t r hr he
      rw [he] at ht
      exact ht

private theorem step_noHuman (sp p f u actor s e) (hi : HumanCaptured sp s)
    (hne : actor = .human → ∀ cid v, e ≠ .enter cid v) :
    NoNewHuman sp s (step sp p f u actor s e).1 := by
  unfold step
  split
  · split
    · exact runMacro_noHuman _ _ _ _ _ _ _ hi
    · exact stepCore_noHuman _ _ _ _ _ _ _ hi hne
  · exact stepCore_noHuman _ _ _ _ _ _ _ hi hne

/-- Navigation to a screen captures no new human-required value, from any state. -/
theorem goTo_noNewHuman (sp p f s z) : NoNewHuman sp s (goTo sp p f s z).1 :=
  goTo_noHuman sp p f s z

/-- A transition without new human-required values keeps them confirmed human entries. -/
theorem NoNewHuman.humanCaptured {sp s t} (h : NoNewHuman sp s t) (hi : HumanCaptured sp s) :
    HumanCaptured sp t := h.preserves hi

/-- One step from any state, reachable or not: a new human-required value
needs a human entry event. -/
theorem step_noNewHuman (sp p f u actor s e) (hi : HumanCaptured sp s)
    (hn : ¬ (actor = .human ∧ ∃ cid v, e = .enter cid v)) :
    NoNewHuman sp s (step sp p f u actor s e).1 :=
  step_noHuman _ _ _ _ _ _ _ hi (by grind)

/-- One step from any state, reachable or not, keeps every human-required
capture a confirmed human entry. -/
theorem step_humanCaptured (sp p f u actor s e) (hi : HumanCaptured sp s) :
    HumanCaptured sp (step sp p f u actor s e).1 := by
  by_cases hn : actor = .human ∧ ∃ cid v, e = .enter cid v
  · obtain ⟨rfl, cid, v, rfl⟩ := hn
    change HumanCaptured sp (stepCore sp p f u .human _ (.enter cid v)).1
    unfold stepCore
    split
    · exact hi
    · simp only [stepEvent]
      split
      · intro x hx el hel hh
        obtain ⟨y, hy, he, -, -, hb, hc⟩ := reconcileCore_captured sp u .human s cid v x hx
        rw [he] at hel
        obtain ⟨h1, h2⟩ := hi y hy el hel hh
        exact ⟨hb.trans h1, hc.trans h2⟩
      · exact enterCore_human_quality _ _ _ _ _ _ _ hi
  · exact (step_noNewHuman _ _ _ _ _ _ _ hi hn).preserves hi

/-- All reachable human-required captures are confirmed human entries. -/
theorem reachable_humanCaptured (ep : Episode) : Always ep (HumanCaptured ep.spec) := by
  intro s hs
  induction hs with
  | start =>
    exact (prefillScreen_noHuman _ _ _ _).preserves (by intro x hx; simp at hx)
  | step actor e _ ih => exact step_humanCaptured _ _ _ _ _ _ _ ih
  | wait d _ ih => exact ih

/-- A newly captured never-policy or human-only value can only come from an
actual human entry event; confirmations and macros cannot forge that entry. -/
theorem humanStepsByHuman (ep : Episode) : HumanStepsByHuman ep := by
  refine ⟨?_, ?_⟩
  · intro x hx el hel hh
    exact (by simpa using prefillScreen_noHuman ep.spec ep.prog ep.facts _ x hx el hel hh)
  · intro s hs actor e x hx hnew el hel hh
    by_cases hn : actor = .human ∧ ∃ cid v, e = .enter cid v
    · exact hn
    · exact False.elim (hnew (step_noHuman _ _ _ _ _ _ _
        (reachable_humanCaptured ep s hs) (by grind) x hx el hel hh))

#print axioms goTo_noNewHuman
#print axioms step_noNewHuman
#print axioms step_humanCaptured
#print axioms reachable_humanCaptured
#print axioms humanStepsByHuman
#print axioms clickCore_noHuman
#print axioms enterCore_human_quality

#print axioms enterCore_macro_noHuman
#print axioms stepCore_noHuman

end Ehr.Check
