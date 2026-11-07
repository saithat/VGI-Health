import Std

/-! NEW cache specifications for owner review. Abstract native replay is a pure
fold over a fixed version's facts and the authoritative session journal. This
assumption excludes changes to external directory/time/context inputs unless
they invalidate the cache or are independently rechecked by the final guard.
It is not a theorem about Store.reconstruct or native JSON serialization. -/
namespace Ehr.Commit.Protocol.Cache

variable {State Event : Type}

structure Cached (State : Type) where
  version : Nat
  value : State
  deriving DecidableEq, Repr

structure Session (State Event : Type) where
  base : Nat
  revision : Nat := 0
  journal : List Event := []
  cached : Option (Cached State) := none
  deriving DecidableEq, Repr

def replay (initial : Nat → State) (step : State → Event → State)
    (version : Nat) (events : List Event) : State := events.foldl step (initial version)

def Consistent (initial : Nat → State) (step : State → Event → State)
    (s : Session State Event) : Prop :=
  ∀ c, s.cached = some c → c.version = s.base ∧ c.value = replay initial step s.base s.journal

def reconstruct (initial : Nat → State) (step : State → Event → State)
    (s : Session State Event) : State :=
  match s.cached with
  | some c => if c.version = s.base then c.value else replay initial step s.base s.journal
  | none => replay initial step s.base s.journal

/-- A session event is revision-CAS protected and patient-version bound.
The incremental native step and journal/cache publication are one transaction. -/
def interact (initial : Nat → State) (step : State → Event → State)
    (s : Session State Event) (lockedVersion expectedRevision : Nat) (e : Event) :
    Option (Session State Event) :=
  if s.base = lockedVersion ∧ s.revision = expectedRevision then
    some { s with revision := s.revision + 1, journal := s.journal ++ [e], cached := some { version := lockedVersion, value := step (reconstruct initial step s) e } }
  else none

/-- Projecting commands advance base/revision and invalidate cached native data. -/
def projectingCommit (s : Session State Event) (newVersion : Nat) (e : Event) : Session State Event :=
  { base := newVersion, revision := s.revision + 1, journal := s.journal ++ [e] }

theorem reconstruct_fresh (initial : Nat → State) (step : State → Event → State)
    (s : Session State Event) (h : Consistent initial step s) :
    reconstruct initial step s = replay initial step s.base s.journal := by
  cases hc : s.cached with
  | none => simp [reconstruct, hc]
  | some c =>
    obtain ⟨version, value⟩ := h c hc
    simp [reconstruct, hc, version, value]

theorem interact_consistent (initial : Nat → State) (step : State → Event → State)
    (s next : Session State Event) (version revision : Nat) (e : Event)
    (safe : Consistent initial step s)
    (h : interact initial step s version revision e = some next) :
    Consistent initial step next := by
  unfold interact at h
  split at h
  · rename_i checks
    cases h
    intro c eq
    cases eq
    exact ⟨checks.1.symm, by simp [replay, List.foldl_append, reconstruct_fresh initial step s safe]⟩
  · contradiction

theorem projecting_commit_consistent (initial : Nat → State) (step : State → Event → State)
    (s : Session State Event) (version : Nat) (e : Event) :
    Consistent initial step (projectingCommit s version e) := by
  intro c impossible
  cases impossible

/-- A cache hit at a locked current version gives exactly the fresh native
state, so ANY guard on that state has the same decision. -/
theorem acceptance_equals_fresh (initial : Nat → State) (step : State → Event → State)
    (s : Session State Event) (version : Nat) (current : s.base = version)
    (safe : Consistent initial step s) (guard : Nat → State → Bool) :
    guard version (reconstruct initial step s) = guard version (replay initial step version s.journal) := by
  rw [reconstruct_fresh initial step s safe, current]

#print axioms reconstruct_fresh
#print axioms interact_consistent
#print axioms projecting_commit_consistent
#print axioms acceptance_equals_fresh

end Ehr.Commit.Protocol.Cache
