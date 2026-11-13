import Ehr.Core.EntryTimes

namespace Ehr.EntryTimes

/-- New specification for owner review: the prior-authorization convenience
capture also carries the clock passed by clickCore, for either actor. -/
theorem prior_auth_new_enteredAt (sp : Spec) (user : User) (actor : Actor)
    (s : State) (time : Option Int) (c : Captured)
    (hc : c ∈ (requestPriorAuth sp user actor s time).1.captured) :
    c ∈ s.captured ∨ c.enteredAt? = time := by
  unfold requestPriorAuth at hc
  repeat' (first | exact Or.inl hc | split at hc | dsimp only at hc)
  all_goals
    simp only [setCaptured, List.mem_append, List.mem_filter, List.mem_singleton] at hc
    rcases hc with ⟨hc, _⟩ | rfl
    · exact Or.inl hc
    · exact Or.inr rfl

/-- New specification for owner review: every new screen prefill carries the
trusted entry clock. Together with enter_new_enteredAt and the convenience
capture lemma, this covers every value-creation site in the interpreter. -/
theorem prefill_field_new_enteredAt (sp : Spec) (facts : Facts) (s : State)
    (field : Component) (c : Captured)
    (hc : c ∈ (prefillField sp facts s field).captured) :
    c ∈ s.captured ∨ c.enteredAt? = epochNow facts s := by
  unfold prefillField at hc
  repeat' (first | exact Or.inl hc | split at hc | dsimp only at hc)
  simp only [List.mem_append, List.mem_singleton] at hc
  rcases hc with hc | rfl
  · exact Or.inl hc
  · exact Or.inr (prefill_enteredAt _ _ _ _ _ _ _ ‹_›)

#print axioms prior_auth_new_enteredAt
#print axioms prefill_field_new_enteredAt
end Ehr.EntryTimes
