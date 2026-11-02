import Lean
import Std

/-! Native ADT authority. One command publishes one whole-state successor.
SQL correspondence, physical location and clinical disposition remain outside
these administrative proofs. Validation checks both sides of each placement. -/
namespace Ehr.Commit.Adt
open Lean

inductive Phase where
  | ready | occupied | dirty | cleaning
  deriving DecidableEq, Repr, ToJson, FromJson
structure Patient where
  id : String
  admitted : Bool := false
  bed : Option Nat := none
  deriving DecidableEq, Repr, ToJson, FromJson
structure Bed where
  id : Nat
  unit : String
  phase : Phase := .ready
  occupant : Option String := none
  deriving DecidableEq, Repr, ToJson, FromJson
structure State where
  patients : List Patient
  beds : List Bed
  deriving DecidableEq, Repr, ToJson, FromJson

/-- Unique IDs; patient placements and occupied beds agree in both directions;
non-admitted patients cannot hold beds; occupied beds reference known patients. -/
def valid (s : State) : Bool :=
  decide (s.patients.map Patient.id).Nodup && decide (s.beds.map Bed.id).Nodup &&
  s.patients.all (fun p =>
    (p.bed.isNone || p.admitted) &&
    s.beds.all (fun b => (b.occupant == some p.id) == (p.bed == some b.id)) &&
    (p.bed.isNone || s.beds.any (fun b => p.bed == some b.id))) &&
  s.beds.all (fun b =>
    ((b.phase == .occupied) == b.occupant.isSome) &&
    (b.occupant.isNone || s.patients.any (fun p => b.occupant == some p.id)))
def Invariant (s : State) : Prop := valid s = true

inductive Role where
  | chargeNurse | bedManager | admittingClerk
  deriving DecidableEq, Repr, ToJson, FromJson
inductive Command where
  | admit (patient : String) (bed : Nat)
  | assign (patient : String) (bed : Nat)
  | transfer (patient : String) (source target : Nat)
  | release (patient : String) (bed : Nat)
  | discharge (patient : String)
  | clean (bed : Nat)
  | ready (bed : Nat)
  deriving DecidableEq, Repr, ToJson, FromJson

def patient? (s : State) (id : String) : Option Patient := s.patients.find? (·.id == id)
def bed? (s : State) (id : Nat) : Option Bed := s.beds.find? (·.id == id)
def available (s : State) (id : Nat) : Bool :=
  (bed? s id).any (fun b => b.phase == .ready && b.occupant.isNone)
def owns (s : State) (id : String) (bed : Nat) : Bool :=
  (patient? s id).any (fun p => p.admitted && p.bed == some bed) &&
  (bed? s bed).any (fun b => b.occupant == some id && b.phase == .occupied)

/-- Administrative policy, separate from protected clinical hospital specs. -/
def permitted (role : Role) (c : Command) : Bool :=
  match role, c with
  | .admittingClerk, .admit .. | .admittingClerk, .assign .. => true
  | .admittingClerk, _ => false
  | _, _ => true
def guard (s : State) (role : Role) (c : Command) : Bool :=
  valid s && permitted role c && match c with
  | .admit id bed => (patient? s id).any (fun p => !p.admitted && p.bed.isNone) && available s bed
  | .assign id bed => (patient? s id).any (fun p => p.admitted && p.bed.isNone) && available s bed
  | .transfer id source target => source != target && owns s id source && available s target
  | .release id bed => owns s id bed
  | .discharge id => (patient? s id).any (·.admitted)
  | .clean bed => (bed? s bed).any (fun b => b.phase == .dirty && b.occupant.isNone)
  | .ready bed => (bed? s bed).any (fun b => b.phase == .cleaning && b.occupant.isNone)

def move (s : State) (id : String) (admitted : Bool) (target : Option Nat) : State :=
  { patients := s.patients.map (fun p => if p.id == id then { p with admitted, bed := target } else p)
    beds := s.beds.map (fun b =>
      if target == some b.id then { b with phase := .occupied, occupant := some id }
      else if b.occupant == some id then { b with phase := .dirty, occupant := none }
      else b) }

/-- Transfer has no separately publishable release/assign intermediate. -/
def apply (s : State) : Command → State
  | .admit id bed | .assign id bed | .transfer id _ bed => move s id true (some bed)
  | .release id _ => move s id true none
  | .discharge id => move s id false none
  | .clean bed => { s with beds := s.beds.map (fun b => if b.id == bed then { b with phase := .cleaning } else b) }
  | .ready bed => { s with beds := s.beds.map (fun b => if b.id == bed then { b with phase := .ready } else b) }
structure Version where
  key : String
  version : Nat
  deriving DecidableEq, Repr, ToJson, FromJson
structure Input where
  state : State
  versions : List Version
  expected : List Version
  role : Role
  command : Command
  deriving FromJson
structure Accepted where
  state : State
  readVersions : List Version
  command : Command
  deriving ToJson

/-- Executable postcondition validation rejects inconsistent baselines and
reducer outputs. The service persists only this accepted result. -/
def commit (i : Input) : Option Accepted :=
  if i.versions == i.expected && guard i.state i.role i.command && valid (apply i.state i.command)
  then some { state := apply i.state i.command, readVersions := i.versions, command := i.command }
  else none

theorem accepted_guard_at_written_versions (i : Input) (a : Accepted)
    (h : commit i = some a) :
    a.readVersions = i.expected ∧ guard i.state i.role i.command = true ∧
    a.state = apply i.state i.command ∧ Invariant a.state := by
  unfold commit at h
  split at h
  · rename_i checked
    have hc := Bool.and_eq_true_iff.mp checked
    have hv := Bool.and_eq_true_iff.mp hc.1
    cases h
    exact ⟨by simpa using hv.1, hv.2, rfl, hc.2⟩
  · contradiction

theorem commit_invariant (i : Input) (a : Accepted) (h : commit i = some a) : Invariant a.state :=
  (accepted_guard_at_written_versions i a h).2.2.2

theorem bed_exclusivity (s : State) (h : Invariant s) : (s.beds.map Bed.id).Nodup := by
  have h := (Bool.and_eq_true_iff.mp (Bool.and_eq_true_iff.mp
    (Bool.and_eq_true_iff.mp h).1).1).2
  simpa using h

theorem patient_one_bed (s : State) (h : Invariant s) (p : Patient) (hp : p ∈ s.patients)
    (b₁ b₂ : Bed) (h₁ : b₁ ∈ s.beds) (h₂ : b₂ ∈ s.beds)
    (o₁ : b₁.occupant = some p.id) (o₂ : b₂.occupant = some p.id) : b₁.id = b₂.id := by
  have allp := (Bool.and_eq_true_iff.mp (Bool.and_eq_true_iff.mp h).1).2
  have one := List.all_eq_true.mp allp p hp
  have allb := (Bool.and_eq_true_iff.mp (Bool.and_eq_true_iff.mp one).1).2
  have hb₁ := List.all_eq_true.mp allb b₁ h₁
  have hb₂ := List.all_eq_true.mp allb b₂ h₂
  have e₁ : p.bed = some b₁.id := by simpa [o₁] using hb₁
  have e₂ : p.bed = some b₂.id := by simpa [o₂] using hb₂
  exact Option.some.inj (e₁.symm.trans e₂)

/-- Even two separately supplied bed records with the same ID cannot represent
conflicting occupants in a valid board. -/
theorem bed_one_patient (s : State) (h : Invariant s) (b₁ b₂ : Bed)
    (h₁ : b₁ ∈ s.beds) (h₂ : b₂ ∈ s.beds) (idEq : b₁.id = b₂.id)
    (p₁ p₂ : String) (o₁ : b₁.occupant = some p₁) (o₂ : b₂.occupant = some p₂) : p₁ = p₂ := by
  obtain ⟨i, hi, ei⟩ := List.mem_iff_getElem.mp h₁
  obtain ⟨j, hj, ej⟩ := List.mem_iff_getElem.mp h₂
  have hn := bed_exclusivity s h
  have ij : i = j := hn.eq_of_getElem_eq (by simpa using hi) (by simpa using hj)
    (by simpa only [List.getElem_map, ei, ej] using idEq)
  subst j
  have beq : b₁ = b₂ := ei.symm.trans ej
  exact Option.some.inj (o₁.symm.trans ((congrArg Bed.occupant beq).trans o₂))

/-- SQL readers must observe either complete pre-state or complete post-state.
That storage refinement is tested; the native step returns only this move. -/
theorem transfer_atomic (i : Input) (a : Accepted) (p : String) (src dst : Nat)
    (hc : i.command = .transfer p src dst) (h : commit i = some a) :
    a.state = move i.state p true (some dst) ∧ Invariant a.state := by
  have ha := accepted_guard_at_written_versions i a h
  exact ⟨by simpa [hc, apply] using ha.2.2.1, ha.2.2.2⟩

/-- The transferred patient's successor explicitly holds the destination; the
single returned snapshot never leaves that patient unplaced. -/
theorem transfer_holds_target (i : Input) (a : Accepted) (p : Patient) (src dst : Nat)
    (hp : p ∈ i.state.patients) (hc : i.command = .transfer p.id src dst)
    (h : commit i = some a) :
    { p with admitted := true, bed := some dst } ∈ a.state.patients := by
  have ha := (transfer_atomic i a p.id src dst hc h).1
  rw [ha]
  apply List.mem_map.mpr
  exact ⟨p, hp, by simp⟩

inductive Reachable (initial : State) : State → Prop where
  | initial : Reachable initial initial
  | next {s : State} (prior : Reachable initial s) (i : Input) (a : Accepted)
      (current : i.state = s) (accepted : commit i = some a) : Reachable initial a.state

theorem reachable_invariant (initial s : State) (safe : Invariant initial)
    (reachable : Reachable initial s) : Invariant s := by
  cases reachable with
  | initial => exact safe
  | next _ i a _ accepted => exact commit_invariant i a accepted

#print axioms accepted_guard_at_written_versions
#print axioms commit_invariant
#print axioms bed_exclusivity
#print axioms patient_one_bed
#print axioms bed_one_patient
#print axioms transfer_holds_target
#print axioms reachable_invariant
#print axioms transfer_atomic
end Ehr.Commit.Adt
