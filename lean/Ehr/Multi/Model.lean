import Std

/-!
Shared workflow prototype. An action is one atomic service transaction, not a
UI click or a physical medication administration. No actor or schedule bound.
The executable step is also the transition relation used by the proofs.
-/

namespace Ehr.Multi

/-- A scheduled occurrence, independent of who attempts to administer it. -/
structure DoseKey where
  patient : Nat
  order : Nat
  occurrence : Nat
  deriving DecidableEq, Repr

/-- Shared persisted data: administration history and current bed placements. -/
structure State where
  administrations : List (DoseKey × Nat) := []
  placements : List (Nat × Nat) := []
  deriving DecidableEq, Repr

/-- Actor identity is recorded on administration; bed actions carry the actor
too. Authorization and dose correctness are outside these two invariants. -/
inductive Action where
  | administer (actor : Nat) (dose : DoseKey)
  | assignBed (actor patient bed : Nat)
  | releaseBed (actor patient bed : Nat)
  deriving DecidableEq, Repr

/-- Each dose key occurs at most once in the historical administration log. -/
def DosesUnique (s : State) : Prop := (s.administrations.map Prod.fst).Nodup

/-- Each bed occurs at most once among active placements. -/
def BedsExclusive (s : State) : Prop := (s.placements.map Prod.fst).Nodup

/-- Both safety requirements; arbitrary initial states need not satisfy them. -/
def Invariant (s : State) : Prop := DosesUnique s ∧ BedsExclusive s

/-- Recheck shared state at the transaction boundary. Rejected actions stutter;
release removes only this patient's placement, permitting later bed reuse. -/
def step (s : State) : Action → State
  | .administer actor dose =>
    if dose ∈ s.administrations.map Prod.fst then s
    else { s with administrations := (dose, actor) :: s.administrations }
  | .assignBed _ patient bed =>
    if bed ∈ s.placements.map Prod.fst then s
    else { s with placements := (bed, patient) :: s.placements }
  | .releaseBed _ patient bed =>
    { s with placements := s.placements.filter fun p => !(p.1 == bed && p.2 == patient) }

/-- Execute any finite interleaving of actors' actions. -/
def run (s : State) : List Action → State
  | [] => s
  | a :: rest => run (step s a) rest

/-- All states obtainable from an empty shared store, by the executable step. -/
inductive Reachable : State → Prop where
  | initial : Reachable {}
  | next {s : State} (h : Reachable s) (a : Action) : Reachable (step s a)

end Ehr.Multi
