import Ehr.Check.CompletionSearch

namespace Ehr.Check.CompletionModel.Tests
open Ehr.Sim.Certificate

/-- One successful branch and one closed self-loop trap. Merely finding the
successful path must not pass AG EF. Hash collisions are deliberate. -/
def fork : Graph Nat Nat :=
  { next := fun _ e => e, moves := fun s => if s == 0 then [1, 2] else if s == 2 then [2] else [],
    goal := (· == 1), weight := fun _ _ => 1, hash := fun _ => 0 }

#guard match check fork 0 20 with
  | .rejected es _ 3 3 => es == [2]
  | _ => false

/-- A cycle is safe when an exit to completion remains available. -/
def cycleExit : Graph Nat Nat := { fork with moves := fun s =>
  if s == 0 then [1, 2] else if s == 2 then [0, 2] else [] }

#guard match check cycleExit 0 20 with
  | .accepted _ 3 4 => true
  | _ => false
#guard match check cycleExit 0 1 with | .unknown => true | _ => false
#guard match check fork 0 0 with | .unknown => true | _ => false

def incomplete : Candidate Nat := put fork (put fork {} 0 1) 1 0
#guard !accept fork 0 incomplete
#guard !accept fork 0 {}
#guard !reject fork 0 [1] (put fork {} 1 0)
#guard !reject fork 0 [3] (put fork {} 3 0)
#guard reject fork 0 [2] (put fork {} 2 0)

/-- Post-completion edges are checked too; a goal is not silently made terminal. -/
def leavesGoal : Graph Nat Nat := { fork with moves := fun s =>
  if s == 1 then [2] else (fork.moves s) }
#guard match check leavesGoal 1 20 with | .rejected [2] _ _ _ => true | _ => false

/-- Unbounded state discovery returns unknown rather than certifying a prefix. -/
def infinite : Graph Nat Unit :=
  { next := fun s _ => s + 1, moves := fun _ => [()], goal := fun _ => false,
    weight := fun _ _ => 1, hash := id }
#guard match check infinite 0 8 with | .unknown => true | _ => false

end Ehr.Check.CompletionModel.Tests
