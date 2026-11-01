import Ehr.Props.Properties

namespace Ehr.Check
open Ehr Ehr.Props

/-- Only explicit popup requests can participate in a repeated-request pair. -/
def popupComponents (p : Program) : List (Screen × Component) :=
  (allComps p).filter fun sc => (alertOf? sc.2.kind).any (·.2)

/-- The original pairwise obligation, evaluated only on popup-request components.
Filtering first avoids a quadratic traversal of thousands of unrelated fields. -/
def FilteredPopupRequests (sp : Spec) (p : Program) : Prop :=
  ∀ s1 ∈ popupComponents p, ∀ s2 ∈ popupComponents p,
    ∀ a1 ∈ alertOf? s1.2.kind, ∀ a2 ∈ alertOf? s2.2.kind,
    a1.2 = true → a2.2 = true → a1.1 = a2.1 →
    (∀ al ∈ sp.alert? a1.1, al.tier = .interruptive) → s1.1.id = s2.1.id

instance (sp : Spec) (p : Program) : Decidable (FilteredPopupRequests sp p) := by
  unfold FilteredPopupRequests
  infer_instance

/-- The faster check is exactly the existing safety property, including the
original vacuous lookup behavior for undeclared alert IDs. -/
theorem filteredPopupRequests_iff (sp : Spec) (p : Program) :
    FilteredPopupRequests sp p ↔ PopupRequestedOnce sp p := by
  unfold FilteredPopupRequests PopupRequestedOnce
  constructor
  · intro h s1 hs1 s2 hs2 a1 ha1 a2 ha2 pop1 pop2 same tier
    have one : alertOf? s1.2.kind = some a1 := by simpa using ha1
    have two : alertOf? s2.2.kind = some a2 := by simpa using ha2
    have mem1 : s1 ∈ popupComponents p :=
      List.mem_filter.mpr ⟨hs1, by simp [one, pop1]⟩
    have mem2 : s2 ∈ popupComponents p :=
      List.mem_filter.mpr ⟨hs2, by simp [two, pop2]⟩
    exact h s1 mem1 s2 mem2 a1 ha1 a2 ha2 pop1 pop2 same tier
  · intro h s1 hs1 s2 hs2
    exact h s1 (List.mem_filter.mp hs1).1 s2 (List.mem_filter.mp hs2).1

#print axioms filteredPopupRequests_iff
end Ehr.Check
