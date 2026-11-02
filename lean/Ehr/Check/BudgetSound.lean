import Ehr.Check.RuleSound

namespace Ehr.Check
open Ehr Ehr.Props

private theorem filter_flatMap_length_mono {α β : Type} (xs : List α)
    (p q : α → Bool) (f : α → List β)
    (h : ∀ x ∈ xs, p x = true → q x = true) :
    ((xs.filter p).flatMap f).length ≤ ((xs.filter q).flatMap f).length := by
  induction xs with
  | nil => simp
  | cons x xs ih =>
    have hi := ih (fun y hy => h y (by simp [hy]))
    simp only [List.length_flatMap] at hi
    by_cases hp : p x = true
    · have hq := h x (by simp) hp
      simpa [hp, hq] using Nat.add_le_add_left hi (f x).length
    · by_cases hq : q x = true <;> simp [hp, hq] <;> omega

/-- Counting additional reachable screen IDs never decreases the popup count. -/
theorem popupRequestCount_mono (p : Program) (a b : List ScreenId) (h : a ⊆ b) :
    popupRequestCount p a ≤ popupRequestCount p b := by
  apply filter_flatMap_length_mono
  intro scr _ ha
  simpa using h (List.contains_iff_mem.mp ha)

private theorem popupRequestCount_all (p : Program) (a : List ScreenId) :
    popupRequestCount p a ≤ popupRequestCount p (p.screens.map (·.id)) := by
  apply filter_flatMap_length_mono
  intro scr hs _
  simp only [List.contains_iff_mem, List.mem_map]
  exact ⟨scr, hs, rfl⟩

/-- The checker's conservative budget bound covers every actually reachable
candidate screen; the canonical lower bound contains only verified paths. -/
theorem alertBudget_sound (can p : Program)
    (h : popupRequestCount p (p.screens.map (·.id)) ≤
      popupRequestCount can (verifiedReachable can)) : AlertBudget can p := by
  intro rc rp hrc _
  apply Nat.le_trans (popupRequestCount_all p rp.eraseDups)
  apply Nat.le_trans h
  apply popupRequestCount_mono
  intro z hz
  apply List.mem_eraseDups.mpr
  exact (hrc z).mpr (verifiedReachable_sound can z hz)

/-- Accepted programs meet both popup and layout stability budgets (property 8). -/
theorem accepted_budgets (sp prev can p) (h : check sp prev can p = .ok) :
    WithinBudgets sp prev can p := by
  have hall := (check_ok_iff sp prev can p).mp h
  simp only [rules, List.mem_cons, forall_eq_or_imp, List.not_mem_nil] at hall
  rcases hall with ⟨_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, hb, hs⟩
  exact ⟨alertBudget_sound can p (of_decide_eq_true hb), of_decide_eq_true hs.1⟩

#print axioms popupRequestCount_mono
#print axioms alertBudget_sound
#print axioms accepted_budgets
end Ehr.Check
