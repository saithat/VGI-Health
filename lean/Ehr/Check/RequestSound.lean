import Ehr.Check.GuardSound

namespace Ehr.Check
open Ehr Ehr.Props

private theorem setCaptured_keeps_confirmed (s : State) (new : Captured)
    (he : new.element = priorAuthElement) (hn : new.slot = s.currentSlot)
    (h : priorAuthCaptured s = false) (x : Captured) (hx : x ∈ s.captured)
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
    · simp [hxn]
  · simp [hxe]

/-- CR-6: request clicks preserve every previously confirmed capture exactly. -/
theorem requestPriorAuth_preserves_confirmed (sp : Spec) (u : User) (actor : Actor) (s : State)
    (x : Captured) (hx : x ∈ s.captured) (hc : x.confirmed = true) :
    x ∈ (requestPriorAuth sp u actor s).1.captured := by
  unfold requestPriorAuth
  split
  · exact hx
  · split
    · exact hx
    · split
      · exact hx
      · split
        · exact hx
        · rename_i hcap
          have hfalse : priorAuthCaptured s = false := by simpa using hcap
          split <;> split
          all_goals first
            | exact hx
            | exact setCaptured_keeps_confirmed s _ rfl rfl hfalse x hx hc

/-- CR-6: a request convenience action cannot introduce a never-policy or
human-only value; such captures must use ordinary human field entry. -/
theorem requestPriorAuth_no_human_capture (sp : Spec) (u : User) (actor : Actor) (s : State) :
    ∀ x ∈ (requestPriorAuth sp u actor s).1.captured, ∀ el,
      sp.element? x.element = some el → HumanMustEnter el → x ∈ s.captured := by
  unfold requestPriorAuth
  split
  · exact fun _ hx _ _ _ => hx
  · rename_i req hreq
    split
    · exact fun _ hx _ _ _ => hx
    · split
      · exact fun _ hx _ _ _ => hx
      · split
        · exact fun _ hx _ _ _ => hx
        · split <;> split
          all_goals first
            | exact fun _ hx _ _ _ => hx
            | (rename_i hnot
               intro x hx el hel hh
               simp only [setCaptured, List.mem_append, List.mem_filter, List.mem_singleton] at hx
               rcases hx with ⟨hx, _⟩ | rfl
               · exact hx
               · have heq : el = req := by simpa [hreq] using hel.symm
                 subst el
                 simp only [HumanMustEnter] at hh
                 simp only [Bool.or_eq_true, beq_iff_eq, not_or] at hnot
                 exact False.elim (hh.elim hnot.1 hnot.2))

#print axioms requestPriorAuth_preserves_confirmed
#print axioms requestPriorAuth_no_human_capture
end Ehr.Check
