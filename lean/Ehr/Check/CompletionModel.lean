import Ehr.Sim.Certificate

/-!
AG EF certificates for finite, explicitly enumerated transition systems.
The producer is untrusted. Acceptance checks a closed set containing the start
and a strictly descending recovery rank at every non-goal state. Neither a
successful path nor exhaustion of a search budget is an acceptance certificate.
Hashes select equality-checked buckets only.
-/
namespace Ehr.Check.CompletionModel
open Ehr.Sim.Certificate

/-- A set of states with recovery ranks, stored in equality-checked buckets. -/
abbrev Candidate (α : Type) := Table α

/-- Every allowed edge stays inside the supplied finite set. -/
def closed [DecidableEq α] (g : Graph α ε) (v : Candidate α) : Bool :=
  v.toList.all fun (_, bucket) => bucket.all fun (s, _) =>
    (g.moves s).all fun e => (lookup g v (g.next s e)).isSome

/-- Every non-goal has an allowed successor with strictly smaller rank. -/
def descending [DecidableEq α] (g : Graph α ε) (v : Candidate α) : Bool :=
  v.toList.all fun (_, bucket) => bucket.all fun (s, n) =>
    g.goal s || (g.moves s).any fun e =>
      (lookup g v (g.next s e)).any (· < n)

/-- The complete finite certificate check. A bound hit cannot pass this check. -/
def accept [DecidableEq α] (g : Graph α ε) (start : α) (v : Candidate α) : Bool :=
  (lookup g v start).isSome && closed g v && descending g v

theorem closed_at [DecidableEq α] {g : Graph α ε} {v : Candidate α} {s n}
    (h : closed g v = true) (hs : lookup g v s = some n) :
    ∀ e ∈ g.moves s, ∃ k, lookup g v (g.next s e) = some k := by
  obtain ⟨bucket, hb, hm⟩ := lookup_mem hs
  have row := List.all_eq_true.mp (List.all_eq_true.mp h _ hb) _ hm
  intro e he
  have hit := List.all_eq_true.mp row e he
  cases hv : lookup g v (g.next s e) with
  | none => simp [hv] at hit
  | some k => exact ⟨k, rfl⟩

theorem descending_at [DecidableEq α] {g : Graph α ε} {v : Candidate α} {s n}
    (h : descending g v = true) (hs : lookup g v s = some n) :
    g.goal s = true ∨ ∃ e ∈ g.moves s, ∃ k,
      lookup g v (g.next s e) = some k ∧ k < n := by
  obtain ⟨bucket, hb, hm⟩ := lookup_mem hs
  have row := List.all_eq_true.mp (List.all_eq_true.mp h _ hb) _ hm
  rcases Bool.or_eq_true_iff.mp row with goal | progress
  · exact .inl goal
  · obtain ⟨e, he, hit⟩ := List.any_eq_true.mp progress
    right
    cases hv : lookup g v (g.next s e) with
    | none => simp [hv] at hit
    | some k => exact ⟨e, he, k, hv, by simpa [hv] using hit⟩

theorem run_closed [DecidableEq α] {g : Graph α ε} {v : Candidate α}
    (h : closed g v = true) {s es t cost} (run : Run g s es t cost) :
    ∀ n, lookup g v s = some n → ∃ k, lookup g v t = some k := by
  induction run with
  | nil s => exact fun n hs => ⟨n, hs⟩
  | cons he _ ih =>
    intro n hs
    obtain ⟨k, hk⟩ := closed_at h hs _ he
    exact ih k hk

theorem recovery [DecidableEq α] {g : Graph α ε} {v : Candidate α}
    (h : descending g v = true) (n : Nat) : ∀ s, lookup g v s = some n →
      ∃ es t cost, Run g s es t cost ∧ g.goal t = true := by
  induction n using Nat.strongRecOn with
  | ind n ih =>
    intro s hs
    rcases descending_at h hs with goal | ⟨e, he, k, hk, less⟩
    · exact ⟨[], s, 0, .nil s, goal⟩
    · obtain ⟨es, t, cost, run, goal⟩ := ih k less _ hk
      exact ⟨e :: es, t, g.weight s e + cost, .cons he run, goal⟩

/-- Acceptance proves AG EF goal, including arbitrarily long runs and cycles.
Completion is terminal only if the supplied graph says so; its outgoing edges
are checked as well. No fairness or termination assumption is used. -/
theorem accepted_AG_EF [DecidableEq α] {g : Graph α ε} {start : α} {v : Candidate α}
    (h : accept g start v = true) {es s cost} (run : Run g start es s cost) :
    ∃ repair t n, Run g s repair t n ∧ g.goal t = true := by
  have hh := Bool.and_eq_true_iff.mp h
  obtain ⟨root, hc⟩ := Bool.and_eq_true_iff.mp hh.1
  have hd := hh.2
  cases hr : lookup g v start with
  | none => simp [hr] at root
  | some k =>
    obtain ⟨n, hn⟩ := run_closed hc run k hr
    exact recovery hd n s hn

/-- A non-complete covered state has an actual state-changing allowed move;
ignored/blocked self-loops alone cannot satisfy the rank certificate. -/
theorem accepted_no_dead_end [DecidableEq α] {g : Graph α ε} {start : α} {v : Candidate α}
    (h : accept g start v = true) {es s cost} (run : Run g start es s cost)
    (ng : g.goal s = false) : ∃ e ∈ g.moves s, g.next s e ≠ s := by
  have hh := Bool.and_eq_true_iff.mp h
  have hh' := Bool.and_eq_true_iff.mp hh.1
  cases hr : lookup g v start with
  | none => simp [hr] at hh'
  | some k =>
    obtain ⟨n, hn⟩ := run_closed hh'.2 run k hr
    rcases descending_at hh.2 hn with goal | ⟨e, he, m, hm, less⟩
    · simp [ng] at goal
    · refine ⟨e, he, ?_⟩
      intro eq
      rw [eq, hn] at hm
      cases Option.some.inj hm
      omega

theorem run_append {g : Graph α ε} {s xs t n ys u m}
    (a : Run g s xs t n) (b : Run g t ys u m) :
    Run g s (xs ++ ys) u (n + m) := by
  induction a with
  | nil => simpa using b
  | cons he _ ih => simpa [Nat.add_assoc] using Run.cons he (ih b)

/-- Interaction predicates share the very same covered states and edges. -/
def edgesHold (g : Graph α ε) (v : Candidate α) (rule : α → ε → α → Bool) : Bool :=
  v.toList.all fun (_, bucket) => bucket.all fun (s, _) =>
    (g.moves s).all fun e => rule s e (g.next s e)

theorem accepted_edges [DecidableEq α] {g : Graph α ε} {start v rule}
    (h : accept g start v = true) (hr : edgesHold g v rule = true)
    {es s cost} (run : Run g start es s cost) :
    ∀ e ∈ g.moves s, rule s e (g.next s e) = true := by
  have hh := Bool.and_eq_true_iff.mp h
  have hc := Bool.and_eq_true_iff.mp hh.1
  cases root : lookup g v start with
  | none => simp [root] at hc
  | some k =>
    obtain ⟨n, hn⟩ := run_closed hc.2 run k root
    obtain ⟨bucket, hb, hm⟩ := lookup_mem hn
    exact List.all_eq_true.mp (List.all_eq_true.mp (List.all_eq_true.mp hr _ hb) _ hm)

#print axioms accepted_AG_EF
#print axioms accepted_no_dead_end
#print axioms accepted_edges
end Ehr.Check.CompletionModel
