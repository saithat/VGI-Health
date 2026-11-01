import Ehr.Check.GuardSound

namespace Ehr.Check
open Ehr Ehr.Props

/-- Select a regression witness by position, so proofs do not scan unrelated
screens or compare entire generated screens for equality. -/
def indexedComp (p : Program) (n : Nat) (hn : n < p.screens.length)
    (i : Nat) (hi : i < p.screens[n].components.length) : Screen × Component :=
  (p.screens[n], p.screens[n].components[i])

theorem indexedComp_mem (p : Program) (n : Nat) (hn : n < p.screens.length)
    (i : Nat) (hi : i < p.screens[n].components.length) :
    indexedComp p n hn i hi ∈ allComps p := by
  exact List.mem_flatMap.mpr ⟨p.screens[n], List.getElem_mem hn,
    List.mem_map.mpr ⟨p.screens[n].components[i], List.getElem_mem hi, rfl⟩⟩

/-- A single macro click targeting a commit violates the human-action policy. -/
theorem macroClick_violation (sp : Spec) (p : Program) (m : Macro)
    (sc : Screen × Component) (cid cm : String)
    (hm : m ∈ p.macros) (hst : MacroStep.click cid ∈ m.steps)
    (hc : sc ∈ allComps p) (hid : sc.2.id = cid)
    (hcm : commitOf? sc.2.kind = some cm) : ¬ NoAutomationAttempts sp p := by
  intro h
  have hn := ((h.2 m hm _ hst sc hc).2 (by simp [clickTarget?, hid])).1
  rw [hcm] at hn
  contradiction

/-- A single macro write targeting a human-required field violates the policy. -/
theorem macroSet_violation (sp : Spec) (p : Program) (m : Macro)
    (sc : Screen × Component) (cid value eid : String)
    (hm : m ∈ p.macros) (hst : MacroStep.setValue cid value ∈ m.steps)
    (hc : sc ∈ allComps p) (hid : sc.2.id = cid)
    (slot : Slot) (pf : Prefill) (hf : fieldOf? sc.2.kind = some (eid, slot, pf))
    (el : ElementSpec) (hel : sp.element? eid = some el) (hh : HumanMustEnter el) :
    ¬ NoAutomationAttempts sp p := by
  intro h
  exact (h.2 m hm _ hst sc hc).1 (by simp [setTarget?, hid])
    (eid, slot, pf) (by simp [hf]) el (by simp [hel]) hh

/-- A single prefilled human field suffices to refute the whole policy. -/
theorem humanPrefill_violation (sp : Spec) (p : Program) (sc : Screen × Component)
    (hc : sc ∈ allComps p) (eid : String) (slot : Slot) (pf : Prefill)
    (hf : fieldOf? sc.2.kind = some (eid, slot, pf)) (el : ElementSpec)
    (hel : sp.element? eid = some el) (hh : HumanMustEnter el) (hp : pf ≠ .none) :
    ¬ NoAutomationAttempts sp p := by
  intro h
  exact hp (h.1 sc hc (eid, slot, pf) (by simp [hf]) el (by simp [hel]) hh)

/-- Exhibit a shown commit without deciding equality of complete view items.
Only the component kind and its actual visibility are evaluated. -/
theorem commitButtonShown_of_any (ep : Episode) (s : State) (commit : CommitId)
    (h : (ep.prog.compsOf s.screen).any (fun c =>
      c.kind == .button (.commit commit) &&
        compShown ep.spec ep.facts s (ep.prog.compsOf s.screen) c) = true) :
    CommitButtonShown ep s commit := by
  obtain ⟨c, hc, ht⟩ := List.any_eq_true.mp h
  simp only [Bool.and_eq_true, beq_iff_eq] at ht
  exact ⟨itemView ep.spec ep.facts s (ep.prog.compsOf s.screen) c,
    List.mem_map.mpr ⟨c, hc, rfl⟩, ht.2, ht.1⟩

#print axioms indexedComp_mem
#print axioms macroClick_violation
#print axioms macroSet_violation
#print axioms humanPrefill_violation
end Ehr.Check
