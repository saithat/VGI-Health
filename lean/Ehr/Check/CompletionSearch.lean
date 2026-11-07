import Ehr.Check.CompletionModel

/-! Bounded certificate production. Only the small certificate predicates are
trusted by the soundness theorems; bugs in exploration or rank assignment can
produce unknown, never an unchecked positive or negative result. -/
namespace Ehr.Check.CompletionModel
open Ehr.Sim.Certificate
variable {α ε : Type}

def put [DecidableEq α] (g : Graph α ε) (v : Candidate α) (s : α) (n : Nat) : Candidate α :=
  let key := g.hash s
  v.insert key ((s, n) :: ((v[key]?).getD []).filter (fun row => row.1 != s))

structure Node (α ε : Type) where
  state : α
  revPath : List ε
  deriving Inhabited

/-- Breadth-first discovery. State identity uses equality, never just hashes.
The state budget bounds discovered states as well as processed states. -/
def explore [DecidableEq α] (g : Graph α ε) (bound : Nat) :
    Nat → Nat → Array (Node α ε) → Candidate α → Option (Array (Node α ε) × Candidate α)
  | 0, index, nodes, seen => if index == nodes.size then some (nodes, seen) else none
  | fuel + 1, index, nodes, seen =>
    if h : index < nodes.size then
      let node := nodes[index]
      let (nodes, seen) := (g.moves node.state).foldl (fun (nodes, seen) e =>
        let next := g.next node.state e
        if (lookup g seen next).isSome then (nodes, seen)
        else (nodes.push { state := next, revPath := e :: node.revPath }, put g seen next nodes.size)) (nodes, seen)
      if bound < nodes.size then none
      else explore g bound fuel (index + 1) nodes seen
    else some (nodes, seen)

/-- Reverse edges are computed from the same graph as certificate validation. -/
def predecessors [Inhabited α] [DecidableEq α] (g : Graph α ε) (nodes : Array (Node α ε))
    (seen : Candidate α) : Array (List Nat) := Id.run do
  let mut parents := Array.replicate nodes.size []
  for i in [:nodes.size] do
    for e in g.moves nodes[i]!.state do
      if let some j := lookup g seen (g.next nodes[i]!.state e) then
        parents := parents.modify j (i :: ·)
  return parents

/-- Reverse BFS from all goals. Missing ranks form a candidate losing region. -/
def reverseBfs (parents : Array (List Nat)) :
    Nat → Nat → Array Nat → Array (Option Nat) → Array (Option Nat)
  | 0, _, _, ranks => ranks
  | fuel + 1, index, queue, ranks =>
    if h : index < queue.size then
      let i := queue[index]
      let rank := (ranks[i]?.join).getD 0
      let (queue, ranks) := (parents[i]?.getD []).foldl (fun (queue, ranks) parent =>
        if (ranks[parent]?.join).isSome then (queue, ranks)
        else (queue.push parent, ranks.setIfInBounds parent (some (rank + 1)))) (queue, ranks)
      reverseBfs parents fuel (index + 1) queue ranks
    else ranks

def recoveryRanks [Inhabited α] (g : Graph α ε) (nodes : Array (Node α ε))
    (parents : Array (List Nat)) : Array (Option Nat) := Id.run do
  let mut ranks := Array.replicate nodes.size none
  let mut queue := #[]
  for i in [:nodes.size] do
    if g.goal nodes[i]!.state then
      ranks := ranks.setIfInBounds i (some 0)
      queue := queue.push i
  return reverseBfs parents (nodes.size + 1) 0 queue ranks

/-- A losing region is closed and contains no goal. -/
def losing [DecidableEq α] (g : Graph α ε) (v : Candidate α) : Bool :=
  closed g v && v.toList.all (fun (_, bucket) => bucket.all (fun row => !g.goal row.1))

theorem losing_never_goal [DecidableEq α] {g : Graph α ε} {v : Candidate α}
    (h : losing g v = true) {s es t cost n} (root : lookup g v s = some n)
    (run : Run g s es t cost) : g.goal t = false := by
  have hh := Bool.and_eq_true_iff.mp h
  obtain ⟨k, hk⟩ := run_closed hh.1 run n root
  obtain ⟨bucket, hb, hm⟩ := lookup_mem hk
  simpa using List.all_eq_true.mp (List.all_eq_true.mp hh.2 _ hb) _ hm

/-- Check both the stem reaching a trap and the whole closed losing region. -/
def reject [DecidableEq α] [DecidableEq ε] (g : Graph α ε) (start : α)
    (stem : List ε) (bad : Candidate α) : Bool :=
  match replay g start stem with
  | none => false
  | some (s, _) => (lookup g bad s).isSome && losing g bad

theorem rejected_trap [DecidableEq α] [DecidableEq ε] {g : Graph α ε} {start : α}
    {stem : List ε} {bad : Candidate α} (h : reject g start stem bad = true) :
    ∃ s n, Run g start stem s n ∧
      ∀ es t cost, Run g s es t cost → g.goal t = false := by
  unfold reject at h
  cases hr : replay g start stem with
  | none => simp [hr] at h
  | some result =>
    rcases result with ⟨s, n⟩
    have hh := Bool.and_eq_true_iff.mp (show (lookup g bad s).isSome && losing g bad = true by simpa [hr] using h)
    cases hs : lookup g bad s with
    | none => simp [hs] at hh
    | some k => exact ⟨s, n, replay_run hr, fun _ _ _ run => losing_never_goal hh.2 hs run⟩

inductive Outcome (α ε : Type) where
  | accepted (certificate : Candidate α) (states edges : Nat)
  | rejected (stem : List ε) (losingRegion : Candidate α) (states edges : Nat)
  | unknown

/-- Exhaustive finite search followed by independent positive/negative
certificate validation. The caller must report unknown as a refusal. -/
def check [Inhabited α] [DecidableEq α] [DecidableEq ε] (g : Graph α ε) (start : α)
    (bound : Nat := 20000) : Outcome α ε := Id.run do
  let some (nodes, seen) := explore g bound bound 0 #[{ state := start, revPath := [] }] (put g {} start 0)
    | return .unknown
  let parents := predecessors g nodes seen
  let ranks := recoveryRanks g nodes parents
  let mut good := ({} : Candidate α)
  let mut bad := ({} : Candidate α)
  let mut trap := none
  let mut edges := 0
  for i in [:nodes.size] do
    let node := nodes[i]!
    edges := edges + (g.moves node.state).length
    match ranks[i]?.join with
    | some n => good := put g good node.state n
    | none =>
      bad := put g bad node.state 0
      if trap.isNone then trap := some node.revPath.reverse
  if accept g start good then return .accepted good nodes.size edges
  if let some stem := trap then
    if reject g start stem bad then return .rejected stem bad nodes.size edges
  return .unknown

theorem check_accepted [Inhabited α] [DecidableEq α] [DecidableEq ε] {g : Graph α ε} {start bound v states edges}
    (h : check g start bound = .accepted v states edges) : accept g start v = true := by
  unfold check at h
  simp only [Id.run, bind, pure] at h
  split at h
  · split at h
    next accepted => cases h; exact accepted
    next =>
      split at h
      · split at h <;> contradiction
      · contradiction
  · contradiction

theorem check_rejected [Inhabited α] [DecidableEq α] [DecidableEq ε] {g : Graph α ε} {start bound stem bad states edges}
    (h : check g start bound = .rejected stem bad states edges) : reject g start stem bad = true := by
  unfold check at h
  simp only [Id.run, bind, pure] at h
  split at h
  · split at h
    · contradiction
    · split at h
      · split at h
        next rejected => cases h; exact rejected
        next => contradiction
      · contradiction
  · contradiction

#print axioms accepted_AG_EF
#print axioms rejected_trap
#print axioms check_accepted
#print axioms check_rejected
end Ehr.Check.CompletionModel
