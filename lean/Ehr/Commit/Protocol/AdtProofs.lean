import Ehr.Commit.Protocol.AdtModel

namespace Ehr.Commit.Protocol.AdtModel
open Ehr.Commit

/-- These statements are new owner-review specifications, not clinical policy. -/
def EffectsRecorded (d : Durable) : Prop :=
  ∀ e ∈ d.events, ∃ a ∈ d.receipts, a.id = e.request.id ∧
    a.payload = e.request.payload ∧ ∃ n, a.answer = .accepted n
def AcceptedRecorded (d : Durable) : Prop :=
  ∀ a ∈ d.receipts, ∀ n, a.answer = .accepted n →
    ∃ e ∈ d.events, e.request.id = a.id ∧ e.request.payload = a.payload

def HistoryCorrect (baseline : Adt.State) : List Event → Prop
  | [] => True
  | e :: es =>
    let prior : Durable := { board := foldLog baseline es, events := es }
    e.before = versions prior ∧ decide prior e.request = .accepted (es.length + 1) ∧
    e.writes = changed prior.board (Adt.apply prior.board e.request.command) ∧ HistoryCorrect baseline es

structure Invariant (baseline : Adt.State) (d : Durable) : Prop where
  valid : Adt.Invariant d.board
  projection : d.board = foldLog baseline d.events
  unique : (d.events.map (·.request.id)).Nodup
  effects : EffectsRecorded d
  accepted : AcceptedRecorded d
  history : HistoryCorrect baseline d.events

private theorem decide_accepted (d : Durable) (r : Request) (n : Nat)
    (h : decide d r = .accepted n) :
    Adt.Invariant (Adt.apply d.board r.command) ∧ n = d.events.length + 1 := by
  unfold decide at h
  split at h
  · contradiction
  · split at h
    · contradiction
    · cases hc : Adt.commit (input d r) with
      | none => simp [hc] at h
      | some a =>
        simp only [hc] at h
        split at h
        · contradiction
        · have ha := Adt.accepted_guard_at_written_versions (input d r) a hc
          exact ⟨by simpa [input, ha.2.2.1] using ha.2.2.2, by simpa using h.symm⟩

private theorem receipt_fresh (d : Durable) (r : Request) (h : receipt d r = none) :
    ∀ a ∈ d.receipts, a.id ≠ r.id := by
  simpa [receipt] using List.find?_eq_none.mp h

theorem retry_stable (d : Durable) (r : Request) (a : Receipt)
    (h : receipt d r = some a) (payload : a.payload = r.payload) :
    publish d r = (d, a.answer) := by simp [publish, h, payload]

theorem changed_payload_no_effect (d : Durable) (r : Request) (a : Receipt)
    (h : receipt d r = some a) (payload : a.payload ≠ r.payload) :
    publish d r = (d, .payloadConflict) := by simp [publish, h, payload]

theorem receipt_persistent (d : Durable) (r other : Request) (a : Receipt)
    (h : receipt d r = some a) : receipt (publish d other).1 r = some a := by
  cases ho : receipt d other with
  | some existing => simpa [publish, ho] using h
  | none =>
    have mem : a ∈ d.receipts := List.mem_of_find?_eq_some h
    have id : a.id = r.id := by simpa [receipt] using List.find?_some h
    have different : other.id ≠ r.id := by
      intro eq
      exact receipt_fresh d other ho a mem (id.trans eq.symm)
    have differentB : (other.id == r.id) = false := by simpa using different
    change d.receipts.find? (fun a => a.id == r.id) = some a at h
    cases hd : decide d other <;> simp only [publish, ho, hd] <;>
      simpa [receipt, List.find?, differentB] using h

theorem refusal_no_effect (d : Durable) (r : Request)
    (fresh : receipt d r = none) (refused : ∀ n, decide d r ≠ .accepted n) :
    (publish d r).1.board = d.board ∧ (publish d r).1.events = d.events := by
  cases hd : decide d r <;> simp_all [publish]

theorem publish_invariant (baseline : Adt.State) (d : Durable) (r : Request)
    (h : Invariant baseline d) : Invariant baseline (publish d r).1 := by
  cases hr : receipt d r with
  | some a => simpa [publish, hr] using h
  | none =>
    have fresh := receipt_fresh d r hr
    have notEvent : r.id ∉ d.events.map (·.request.id) := by
      simp only [List.mem_map]
      rintro ⟨e, mem, eq⟩
      obtain ⟨a, amem, ae, _, _⟩ := h.effects e mem
      exact fresh a amem (ae.trans eq)
    cases hd : decide d r with
    | accepted n =>
      obtain ⟨valid, serial⟩ := decide_accepted d r n hd
      simp only [publish, hr, hd]
      refine ⟨valid, ?_, ?_, ?_, ?_, ?_⟩
      · simp [foldLog, h.projection]
      · simpa [List.nodup_cons] using And.intro notEvent h.unique
      · intro e mem
        simp only [List.mem_cons] at mem
        rcases mem with eq | mem
        · subst e; exact ⟨_, List.mem_cons_self, rfl, rfl, n, rfl⟩
        · obtain ⟨a, amem, aid, ap, an⟩ := h.effects e mem
          exact ⟨a, List.mem_cons_of_mem _ amem, aid, ap, an⟩
      · intro a mem k eq
        simp only [List.mem_cons] at mem
        rcases mem with eqA | mem
        · subst a; exact ⟨_, List.mem_cons_self, rfl, rfl⟩
        · obtain ⟨e, emem, eid, ep⟩ := h.accepted a mem k eq
          exact ⟨e, List.mem_cons_of_mem _ emem, eid, ep⟩
      · dsimp [HistoryCorrect]
        rw [← h.projection]
        exact ⟨rfl, by simpa [decide, input, versions, version, serial] using hd, rfl, h.history⟩
    | refused | conflict | payloadConflict =>
      all_goals
        simp only [publish, hr, hd]
        refine ⟨h.valid, h.projection, h.unique, ?_, ?_, h.history⟩
        · intro e mem
          obtain ⟨a, amem, aid, ap, an⟩ := h.effects e mem
          exact ⟨a, List.mem_cons_of_mem _ amem, aid, ap, an⟩
        · intro a mem n eq
          simp only [List.mem_cons] at mem
          rcases mem with eqA | mem
          · subst a; contradiction
          · exact h.accepted a mem n eq

theorem initial_invariant (baseline : Adt.State) (valid : Adt.Invariant baseline) :
    Invariant baseline (initial baseline) := by
  exact ⟨valid, rfl, List.nodup_nil, by simp [EffectsRecorded, initial],
    by simp [AcceptedRecorded, initial], trivial⟩

/-- Every executable interleaving stutters or performs one atomic publication. -/
theorem advance_publication (m next : Machine) (i : Nat) (op : Op)
    (h : advance m i op = some next) :
    next.durable = m.durable ∨ ∃ r, next.durable = (publish m.durable r).1 := by
  cases get : m.txs[i]? with
  | none => simp [advance, get] at h
  | some t =>
    cases op <;> simp only [advance, get, bind, Option.bind] at h
    all_goals
      repeat' split at h
      all_goals try simp_all only [Option.some.injEq, reduceCtorEq]
    all_goals first
      | (left; trivial)
      | (left; rfl)
      | (left; subst next; rfl)
      | (right; refine ⟨t.request, ?_⟩; subst next; rfl)

inductive Reachable (baseline : Adt.State) (requests : List Request) : Machine → Prop where
  | initial : Reachable baseline requests { durable := initial baseline, txs := requests.map fun r => { request := r } }
  | step {m next : Machine} : Reachable baseline requests m →
      advance m i op = some next → Reachable baseline requests next

theorem machine_invariant {baseline : Adt.State} {requests : List Request} {m : Machine}
    (valid : Adt.Invariant baseline) (h : Reachable baseline requests m) : Invariant baseline m.durable := by
  induction h with
  | initial => exact initial_invariant baseline valid
  | step _ action ih =>
    rcases advance_publication _ _ _ _ action with eq | ⟨r, eq⟩
    · simpa [eq] using ih
    · simpa [eq] using publish_invariant baseline _ r ih

theorem projections_equal_fold {baseline : Adt.State} {requests : List Request} {m : Machine}
    (valid : Adt.Invariant baseline) (h : Reachable baseline requests m) :
    m.durable.board = foldLog baseline m.durable.events := (machine_invariant valid h).projection

theorem no_duplicate_accepted {baseline : Adt.State} {requests : List Request} {m : Machine}
    (valid : Adt.Invariant baseline) (h : Reachable baseline requests m) :
    (m.durable.events.map (·.request.id)).Nodup := (machine_invariant valid h).unique

theorem bed_exclusivity {baseline : Adt.State} {requests : List Request} {m : Machine}
    (valid : Adt.Invariant baseline) (h : Reachable baseline requests m)
    (b₁ b₂ : Adt.Bed) (h₁ : b₁ ∈ m.durable.board.beds) (h₂ : b₂ ∈ m.durable.board.beds)
    (idEq : b₁.id = b₂.id) (p₁ p₂ : String)
    (o₁ : b₁.occupant = some p₁) (o₂ : b₂.occupant = some p₂) : p₁ = p₂ :=
  Adt.bed_one_patient _ (machine_invariant valid h).valid b₁ b₂ h₁ h₂ idEq p₁ p₂ o₁ o₂

theorem patient_one_bed {baseline : Adt.State} {requests : List Request} {m : Machine}
    (valid : Adt.Invariant baseline) (h : Reachable baseline requests m)
    (p : Adt.Patient) (hp : p ∈ m.durable.board.patients)
    (b₁ b₂ : Adt.Bed) (h₁ : b₁ ∈ m.durable.board.beds) (h₂ : b₂ ∈ m.durable.board.beds)
    (o₁ : b₁.occupant = some p.id) (o₂ : b₂.occupant = some p.id) : b₁.id = b₂.id :=
  Adt.patient_one_bed _ (machine_invariant valid h).valid p hp b₁ b₂ h₁ h₂ o₁ o₂

theorem no_lost_accepted {baseline : Adt.State} {requests : List Request} {m : Machine}
    (valid : Adt.Invariant baseline) (h : Reachable baseline requests m) :
    AcceptedRecorded m.durable := (machine_invariant valid h).accepted

theorem no_phantom_effect {baseline : Adt.State} {requests : List Request} {m : Machine}
    (valid : Adt.Invariant baseline) (h : Reachable baseline requests m) :
    EffectsRecorded m.durable := (machine_invariant valid h).effects

theorem guards_and_writes_on_replaced_versions {baseline : Adt.State} {requests : List Request} {m : Machine}
    (valid : Adt.Invariant baseline) (h : Reachable baseline requests m) :
    HistoryCorrect baseline m.durable.events := (machine_invariant valid h).history

/-- Every individual private stream write leaves every durable field intact. -/
theorem partial_write_private (m next : Machine) (i : Nat)
    (h : advance m i .write = some next) : next.durable = m.durable := by
  cases get : m.txs[i]? with
  | none => simp [advance, get] at h
  | some t =>
    simp only [advance, get, bind, Option.bind] at h
    repeat' split at h
    all_goals simp_all only [Option.some.injEq, reduceCtorEq]
    all_goals subst next; rfl

#print axioms no_lost_accepted
#print axioms no_phantom_effect
#print axioms guards_and_writes_on_replaced_versions
#print axioms partial_write_private
#print axioms decide_accepted
#print axioms receipt_fresh
#print axioms retry_stable
#print axioms changed_payload_no_effect
#print axioms receipt_persistent
#print axioms refusal_no_effect
#print axioms publish_invariant
#print axioms initial_invariant
#print axioms advance_publication
#print axioms machine_invariant
#print axioms projections_equal_fold
#print axioms no_duplicate_accepted
#print axioms bed_exclusivity
#print axioms patient_one_bed
end Ehr.Commit.Protocol.AdtModel
