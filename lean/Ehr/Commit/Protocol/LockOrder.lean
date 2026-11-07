import Std

/-! NEW owner-review lock-order specification. Rank resources by class:
request < session < stream; within streams use the service's C/ASCII key order.
Transactions acquire one request, optionally one session, then distinct sorted
streams. There are no lock upgrades. Provisioning/offline writers, predicate
locks, SQL internals and physical progress are outside this result. -/
namespace Ehr.Commit.Protocol.LockOrder

/-- A waiting transaction holds a prefix of its strictly ordered lock plan. -/
structure Waiting where
  held : List Nat
  next : Nat
  rest : List Nat
  ordered : (held ++ next :: rest).Pairwise (· < ·)

def WaitsFor (a b : Waiting) : Prop := a.next ∈ b.held

theorem wait_increases (a b : Waiting) (wait : WaitsFor a b) : a.next < b.next := by
  have cross := (List.pairwise_append.mp b.ordered).2.2
  exact cross a.next wait b.next (by simp)

/-- No finite circular wait, for any number of transactions and resources.
The hypotheses describe each blocked participant's ordered acquisition prefix;
this does not prove the host obeys that plan or guarantee eventual response. -/
theorem no_wait_cycle (n : Nat) (nonempty : 0 < n) (tx : Nat → Waiting)
    (edges : ∀ i, i < n → WaitsFor (tx i) (tx (i+1)))
    (closed : (tx n).next = (tx 0).next) : False := by
  have increasing : ∀ k, k < n → (tx 0).next < (tx (k+1)).next := by
    intro k hk
    induction k with
    | zero => exact wait_increases _ _ (edges 0 hk)
    | succ k ih =>
      exact Nat.lt_trans (ih (by omega)) (wait_increases _ _ (edges (k+1) hk))
  have last := increasing (n-1) (by omega)
  have eq : n-1+1 = n := by omega
  rw [eq, closed] at last
  exact Nat.lt_irrefl _ last

#print axioms wait_increases
#print axioms no_wait_cycle
end Ehr.Commit.Protocol.LockOrder
