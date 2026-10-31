import Std.Data.TreeMap.Lemmas

/-!
A shortest-path certificate independent of the search algorithm. C1 gives the
start distance zero. C2 closes every edge below the claimed answer and says
that every such source is a non-goal. Replay separately checks a real allowed
path at the claimed cost. Hashes select buckets only; equality checks states.
-/
namespace Ehr.Sim.Certificate

structure Graph (α ε : Type) where
  next : α → ε → α
  moves : α → List ε
  goal : α → Bool
  weight : α → ε → Nat
  hash : α → Nat

abbrev Table (α : Type) := Std.TreeMap Nat (List (α × Nat))

def lookup [DecidableEq α] (g : Graph α ε) (v : Table α) (s : α) : Option Nat :=
  (((v[g.hash s]?).getD []).find? (fun x => decide (x.1 = s))).map (·.2)

/-- Every edge below D is covered at distance at most the source plus weight. -/
def closed [DecidableEq α] (g : Graph α ε) (v : Table α) (d : Nat) : Bool :=
  v.toList.all fun (_, bucket) => bucket.all fun (s, n) =>
    n ≥ d || (!g.goal s && (g.moves s).all fun e =>
      (lookup g v (g.next s e)).any (fun n' => n' ≤ n + g.weight s e))

 theorem lookup_mem [DecidableEq α] {g : Graph α ε} {v : Table α} {s : α} {n : Nat}
    (h : lookup g v s = some n) :
    ∃ bucket, (g.hash s, bucket) ∈ v.toList ∧ (s, n) ∈ bucket := by
  unfold lookup at h
  cases hv : v[g.hash s]? with
  | none => simp [hv] at h
  | some bucket =>
    simp only [hv, Option.getD_some] at h
    cases hf : bucket.find? (fun x => decide (x.1 = s)) with
    | none => simp [hf] at h
    | some p =>
      have hp : p.1 = s := by simpa using List.find?_some hf
      have hn : p.2 = n := by simpa [hf] using h
      refine ⟨bucket, Std.TreeMap.mem_toList_iff_getElem?_eq_some.mpr hv, ?_⟩
      have hp' : p = (s, n) := by cases p; simp_all
      rw [← hp']
      exact List.mem_of_find?_eq_some hf

 theorem closed_at [DecidableEq α] {g : Graph α ε} {v : Table α} {d s n}
    (hc : closed g v d = true) (hs : lookup g v s = some n) (hn : n < d) :
    g.goal s = false ∧ ∀ e ∈ g.moves s,
      ∃ n', lookup g v (g.next s e) = some n' ∧ n' ≤ n + g.weight s e := by
  obtain ⟨bucket, hb, hm⟩ := lookup_mem hs
  have h := List.all_eq_true.mp (List.all_eq_true.mp hc (g.hash s, bucket) hb) (s, n) hm
  simp only [Bool.or_eq_true, decide_eq_true_eq, Bool.and_eq_true, Bool.not_eq_true] at h
  have h := h.resolve_left (by omega)
  refine ⟨by simpa using h.1, ?_⟩
  intro e he
  have he' := List.all_eq_true.mp h.2 e he
  cases hl : lookup g v (g.next s e) with
  | none => simp [hl] at he'
  | some n' => exact ⟨n', rfl, by simpa [hl] using he'⟩

/-- A real run of the supplied graph, with its accumulated integer weight. -/
inductive Run (g : Graph α ε) : α → List ε → α → Nat → Prop
  | nil (s) : Run g s [] s 0
  | cons {s e es t n} : e ∈ g.moves s → Run g (g.next s e) es t n →
      Run g s (e :: es) t (g.weight s e + n)

 theorem below_nonGoal [DecidableEq α] {g : Graph α ε} {v : Table α} {d}
    (hc : closed g v d = true) {s es t cost} (run : Run g s es t cost) :
    ∀ n, lookup g v s = some n → n + cost < d → g.goal t = false := by
  induction run with
  | nil s =>
    intro n hs hn
    exact (closed_at hc hs (by omega)).1
  | @cons s e es t cost he hr ih =>
    intro n hs hn
    obtain ⟨_, he'⟩ := closed_at hc hs (by omega)
    obtain ⟨n', hl, hn'⟩ := he' e he
    exact ih n' hl (by omega)

/-- The certificate excludes every allowed goal run cheaper than D, including
zero-weight edges (scans or navigation in the keystroke metric). -/
theorem lower_bound [DecidableEq α] {g : Graph α ε} {v : Table α} {d start}
    (h0 : lookup g v start = some 0) (hc : closed g v d = true)
    {es t cost} (run : Run g start es t cost) (goal : g.goal t = true) : d ≤ cost := by
  by_cases h : d ≤ cost
  · exact h
  have hn := below_nonGoal hc run 0 h0 (by omega)
  simp [goal] at hn

/-- Replay is through `g.next`, never a second implementation of transitions. -/
def replay [DecidableEq ε] (g : Graph α ε) : α → List ε → Option (α × Nat)
  | s, [] => some (s, 0)
  | s, e :: es =>
    if e ∈ g.moves s then
      (replay g (g.next s e) es).map fun (t, n) => (t, g.weight s e + n)
    else none

 theorem replay_run [DecidableEq ε] {g : Graph α ε} {s es t n}
    (h : replay g s es = some (t, n)) : Run g s es t n := by
  induction es generalizing s n with
  | nil =>
    simp only [replay, Option.some.injEq, Prod.mk.injEq] at h
    rcases h with ⟨rfl, rfl⟩
    exact .nil s
  | cons e es ih =>
    simp only [replay] at h
    split at h
    next he =>
      cases hr : replay g (g.next s e) es with
      | none => simp [hr] at h
      | some pair =>
        obtain ⟨u, cost⟩ := pair
        simp only [hr, Option.map_some, Option.some.injEq, Prod.mk.injEq] at h
        rcases h with ⟨rfl, rfl⟩
        exact .cons he (ih hr)
    next => simp at h

structure Candidate (α ε : Type) where
  path : List ε
  cost : Nat
  visited : Table α

/-- Only a checked path and a checked lower bound may leave the search. -/
def accept [DecidableEq α] [DecidableEq ε] (g : Graph α ε) (start : α)
    (c : Candidate α ε) : Bool :=
  lookup g c.visited start == some 0 && closed g c.visited c.cost &&
    (replay g start c.path).any (fun (t, n) => g.goal t && n == c.cost)

/-- T9's generic certificate theorem: the returned path reaches a goal at D,
and every allowed goal-reaching run costs at least D. -/
theorem exact_of_accept [DecidableEq α] [DecidableEq ε]
    {g : Graph α ε} {start : α} {c : Candidate α ε} (h : accept g start c = true) :
    (∃ t, Run g start c.path t c.cost ∧ g.goal t = true) ∧
    (∀ es t n, Run g start es t n → g.goal t = true → c.cost ≤ n) := by
  simp only [accept, Bool.and_eq_true, beq_iff_eq] at h
  obtain ⟨⟨h0, hc⟩, hp⟩ := h
  constructor
  · cases hr : replay g start c.path with
    | none => simp [hr] at hp
    | some pair =>
      obtain ⟨t, n⟩ := pair
      simp only [hr, Option.any_some, Bool.and_eq_true, beq_iff_eq] at hp
      obtain ⟨hg, rfl⟩ := hp
      exact ⟨t, replay_run hr, hg⟩
  · intro es t n run hg
    exact lower_bound h0 hc run hg

#print axioms exact_of_accept
end Ehr.Sim.Certificate
