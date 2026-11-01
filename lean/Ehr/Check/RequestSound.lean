import Ehr.Check.GuardSound

namespace Ehr.Check
open Ehr Ehr.Props

private theorem setCaptured_keeps_confirmed (s : State) (new : Captured)
    (he : new.element = priorAuthElement) (hn : new.slot = s.currentSlot)
    (h : priorAuthCaptured s = false) (hl : linkedDependents s.captured priorAuthElement = []) (x : Captured) (hx : x ∈ s.captured)
    (hc : x.confirmed = true) : x ∈ setCaptured s.captured new := by
  apply List.mem_append.mpr
  apply Or.inl
  apply List.mem_filter.mpr
  refine ⟨hx, ?_⟩
  by_cases hxe : x.element = new.element
  · by_cases hxn : x.slot = new.slot
    · have hh : priorAuthCaptured s = true := by
        simp only [priorAuthCaptured, List.any_eq_true, Bool.and_eq_true, beq_iff_eq]
        exact ⟨x, hx, ⟨hxe.trans he, hxn.trans hn⟩, hc⟩
      rw [h] at hh
      contradiction
    · simp [hxn, he, hl]
  · have hne : x.element ≠ priorAuthElement := by simpa [he] using hxe
    simp [hne, he, hl]

/-- CR-6: request clicks preserve every previously confirmed capture exactly. -/
theorem requestPriorAuth_preserves_confirmed (sp : Spec) (u : User) (actor : Actor) (s : State)
    (x : Captured) (hx : x ∈ s.captured) (hc : x.confirmed = true) :
    x ∈ (requestPriorAuth sp u actor s).1.captured := by
  unfold requestPriorAuth
  repeat' (first | exact hx | split | dsimp only)
  all_goals
    apply setCaptured_keeps_confirmed s _ rfl rfl ?_ ?_ x hx hc <;> simp_all

/-- CR-6: a request convenience action cannot introduce a never-policy or
human-only value; such captures must use ordinary human field entry. -/
theorem requestPriorAuth_no_human_capture (sp : Spec) (u : User) (actor : Actor) (s : State) :
    ∀ x ∈ (requestPriorAuth sp u actor s).1.captured, ∀ el,
      sp.element? x.element = some el → HumanMustEnter el → x ∈ s.captured := by
  unfold requestPriorAuth
  repeat' (first | exact fun _ hx _ _ _ => hx | split | dsimp only)
  all_goals
    intro x hx el hel hh
    simp only [setCaptured, List.mem_append, List.mem_filter, List.mem_singleton] at hx
    rcases hx with ⟨hx, _⟩ | rfl
    · exact hx
    · simp_all [storedCapture, HumanMustEnter, Bool.or_eq_true]

#print axioms requestPriorAuth_preserves_confirmed
#print axioms requestPriorAuth_no_human_capture
end Ehr.Check
