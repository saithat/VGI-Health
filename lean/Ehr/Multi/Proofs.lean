import Ehr.Multi.Model

namespace Ehr.Multi

theorem initial_invariant : Invariant {} := by
  simp [Invariant, DosesUnique, BedsExclusive]

/-- Every action preserves dose history uniqueness and active bed exclusivity. -/
theorem step_invariant (s : State) (a : Action) (h : Invariant s) :
    Invariant (step s a) := by
  rcases h with ⟨hd, hb⟩
  cases a with
  | administer actor dose =>
    simp only [step]
    split
    · exact ⟨hd, hb⟩
    · rename_i fresh
      refine ⟨?_, hb⟩
      simpa [DosesUnique, List.nodup_cons] using
        (And.intro (by simpa using fresh) hd :
          dose ∉ s.administrations.map Prod.fst ∧ (s.administrations.map Prod.fst).Nodup)
  | assignBed actor patient bed =>
    simp only [step]
    split
    · exact ⟨hd, hb⟩
    · rename_i fresh
      refine ⟨hd, ?_⟩
      simpa [BedsExclusive, List.nodup_cons] using
        (And.intro (by simpa using fresh) hb :
          bed ∉ s.placements.map Prod.fst ∧ (s.placements.map Prod.fst).Nodup)
  | releaseBed actor patient bed =>
    refine ⟨hd, ?_⟩
    exact hb.sublist ((List.filter_sublist).map Prod.fst)

/-- Safety for arbitrary finite interleavings, from any safe initial store. -/
theorem run_invariant (s : State) (actions : List Action) (h : Invariant s) :
    Invariant (run s actions) := by
  induction actions generalizing s with
  | nil => exact h
  | cons a rest ih => exact ih (step s a) (step_invariant s a h)

/-- Safety for the inductive transition system, with no bound on actors/steps. -/
theorem reachable_invariant {s : State} (h : Reachable s) : Invariant s := by
  induction h with
  | initial => exact initial_invariant
  | next _ a ih => exact step_invariant _ a ih

theorem reachable_doses_unique {s : State} (h : Reachable s) : DosesUnique s :=
  (reachable_invariant h).1

theorem reachable_beds_exclusive {s : State} (h : Reachable s) : BedsExclusive s :=
  (reachable_invariant h).2

#print axioms initial_invariant
#print axioms step_invariant
#print axioms run_invariant
#print axioms reachable_invariant
#print axioms reachable_doses_unique
#print axioms reachable_beds_exclusive

end Ehr.Multi
