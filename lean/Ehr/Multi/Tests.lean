import Ehr.Multi.Proofs

namespace Ehr.Multi.Tests

/-- Two nurses attempting the same order occurrence for the same patient. -/
def dose : DoseKey := { patient := 7, order := 9, occurrence := 600 }

def competing : List Action :=
  [.administer 1 dose, .assignBed 1 7 42,
   .administer 2 dose, .assignBed 2 8 42]

#guard (run {} competing).administrations == [(dose, 1)]
#guard (run {} competing).placements == [(42, 7)]
#guard (run {} competing.reverse).administrations == [(dose, 2)]
#guard (run {} competing.reverse).placements == [(42, 8)]
#guard (run {} (competing ++ [.releaseBed 2 8 42])).placements == [(42, 7)]
#guard (run {} (competing ++ [.releaseBed 1 7 42, .assignBed 2 8 42])).placements == [(42, 8)]
#guard (run {} [.administer 1 dose, .administer 2 { dose with occurrence := 960 }]).administrations.length == 2

example : Reachable (run {} competing) := by
  exact .next (.next (.next (.next .initial (.administer 1 dose))
    (.assignBed 1 7 42)) (.administer 2 dose)) (.assignBed 2 8 42)

example : Invariant (run {} competing) := run_invariant {} competing initial_invariant

/-! Deliberately broken preparation/persistence split. Each actor saves a
ticket based on a stale read. Persistence does not recheck shared state. -/

structure BadState where
  shared : State := {}
  tickets : List (Nat × DoseKey) := []
  deriving Repr

inductive BadAction where
  | prepare (actor : Nat) (dose : DoseKey)
  | persist (actor : Nat) (dose : DoseKey)

/-- Intentionally unsafe, for the counterexample only. -/
def badStep (s : BadState) : BadAction → BadState
  | .prepare actor d =>
    if d ∈ s.shared.administrations.map Prod.fst then s
    else { s with tickets := (actor, d) :: s.tickets }
  | .persist actor d =>
    if (actor, d) ∈ s.tickets then
      { shared := { s.shared with administrations := (d, actor) :: s.shared.administrations }
        tickets := s.tickets.filter fun t => decide (t ≠ (actor, d)) }
    else s

/-- Both actors read unused before either persists. -/
def badSchedule : BadState :=
  ([.prepare 1 dose, .prepare 2 dose, .persist 1 dose, .persist 2 dose] : List BadAction)
    |>.foldl badStep {}

#guard badSchedule.shared.administrations == [(dose, 2), (dose, 1)]

theorem bad_schedule_violates : ¬ Invariant badSchedule.shared := by
  unfold Invariant DosesUnique BedsExclusive
  decide

theorem bed_collision_violates :
    ¬ Invariant { placements := [(42, 7), (42, 8)] } := by
  unfold Invariant DosesUnique BedsExclusive
  decide

#print axioms bad_schedule_violates
#print axioms bed_collision_violates

end Ehr.Multi.Tests
