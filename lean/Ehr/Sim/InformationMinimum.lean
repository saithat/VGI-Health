import Ehr.Sim.MinClicks

/-! An exact expert floor in the explicitly staged information-needs-v1 space:
read each need in catalog order, then perform ordinary goal-directed actions.
Read edges cost zero activations; their scroll/mental effort is reported by the
simulator. This is not a global minimum over interleaved review/action orders. -/
namespace Ehr.Sim.Information
open Ehr
structure SearchState where
  core : State
  readCount : Nat := 0
  deriving DecidableEq

abbrev Move := Option Event

def graph (ctx : Context) (obj : Objective) : Certificate.Graph SearchState Move := {
  next := fun s e => match e with
    | none => { s with readCount := s.readCount + 1 }
    | some e => { s with core := forgetHistory (ctx.next s.core e) }
  moves := fun s => match ctx.goals.informationNeeds[s.readCount]? with
    | some n => if !(needWitnesses ctx s.core n).isEmpty then [none]
      else (needNavigation ctx s.core).map some
    | none => (searchMoves ctx .navigationDirected s.core).map some
  goal := fun s => s.readCount == ctx.goals.informationNeeds.length && ctx.done s.core
  weight := fun s e => e.map (eventWeight ctx obj s.core) |>.getD 0
  hash := fun s => mix (stateHash s.core) s.readCount
}

structure Node where
  state : SearchState
  cost : Nat
  rev : List Move

def insert (n : Node) : List Node → List Node
  | [] => [n]
  | a :: rest => if n.cost ≤ a.cost then n :: a :: rest else a :: insert n rest

def put (g : Certificate.Graph SearchState Move) (v : Certificate.Table SearchState)
    (s : SearchState) (cost : Nat) : Certificate.Table SearchState :=
  v.insert (g.hash s) ((s, cost) :: ((v[g.hash s]?).getD []).filter (fun x => x.1 != s))

def search (g : Certificate.Graph SearchState Move) : Nat → List Node →
    Certificate.Table SearchState → Option (Certificate.Candidate SearchState Move)
  | 0, _, _ => none
  | _ + 1, [], _ => none
  | fuel + 1, a :: queue, table =>
    if Certificate.lookup g table a.state != some a.cost then search g fuel queue table
    else if g.goal a.state then some { path := a.rev.reverse, cost := a.cost, visited := table }
    else
      let (queue, table) := (g.moves a.state).foldl (fun (q, v) e =>
        let t := g.next a.state e
        let cost := a.cost + g.weight a.state e
        if (Certificate.lookup g v t).any (· ≤ cost) then (q, v)
        else (insert { state := t, cost, rev := e :: a.rev } q, put g v t cost)) (queue, table)
      search g fuel queue table

def minimum (ctx : Context) (obj : Objective) (start : State) (bound : Nat) :
    Option (Certificate.Candidate SearchState Move) :=
  let g := graph ctx obj
  let start : SearchState := { core := forgetHistory start }
  match search g bound [{ state := start, cost := 0, rev := [] }] (put g {} start 0) with
  | none => none
  | some c => if Certificate.accept g start c then some c else none

/-- Certificate acceptance proves an allowed replay and a least activation cost
in this staged space. Each non-read edge calls the public interpreter. -/
theorem minimum_correct (ctx obj start bound c) (h : minimum ctx obj start bound = some c) :
    (∃ t, Certificate.Run (graph ctx obj) { core := forgetHistory start } c.path t c.cost ∧
      (graph ctx obj).goal t = true) ∧
    (∀ es t cost, Certificate.Run (graph ctx obj) { core := forgetHistory start } es t cost →
      (graph ctx obj).goal t = true → c.cost ≤ cost) := by
  unfold minimum at h
  dsimp only at h
  split at h
  · contradiction
  · split at h
    · cases h; exact Certificate.exact_of_accept (by assumption)
    · contradiction

#print axioms minimum_correct
end Ehr.Sim.Information
