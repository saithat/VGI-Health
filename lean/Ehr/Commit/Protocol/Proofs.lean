import Ehr.Commit.Protocol.Model

namespace Ehr.Commit.Protocol

/-- Every effect has a matching durable accepted receipt. Together with the
reverse direction this gives no lost accepted command and no phantom effect. -/
def EffectsRecorded (d : Durable) : Prop :=
  ∀ e ∈ d.events, ∃ a ∈ d.receipts, a.id = e.request.id ∧
    a.payload = e.request.payload ∧ ∃ n, a.answer = .accepted n

/-- The log's before-version vector and guard are checked on its exact prefix. -/
def HistoryCorrect : List Event → Prop
  | [] => True
  | e :: es =>
    let prior : Durable := { events := es, projection := foldLog es }
    e.before = readVersions prior e.request ∧
    decide prior e.request = .accepted (es.length + 1) ∧ HistoryCorrect es

def StrongInvariant (d : Durable) : Prop :=
  Invariant d ∧ EffectsRecorded d ∧ HistoryCorrect d.events

private theorem effect_safe (s : Multi.State) (r : Request) (h : Multi.Invariant s) :
    Multi.Invariant (effect s r) := by
  cases ha : r.action with
  | none => simpa [effect, ha] using h
  | some a => simpa [effect, ha] using Multi.step_invariant s a h

private theorem decide_accepted (d : Durable) (r : Request) (n : Nat)
    (h : decide d r = .accepted n) :
    r.native = true ∧ r.expected = readVersions d r ∧
    r.sessionVersion = version d r.patient ∧ r.revision = r.sessionRevision ∧
    n = d.events.length + 1 := by
  unfold decide at h
  split at h
  · contradiction
  · split at h
    · contradiction
    · split at h
      · contradiction
      · simp_all

/-- Matching intent always recovers the identical durable answer, including a
refusal, even after session expiry/crash. Authorization remains a host check. -/
theorem retry_stable (d : Durable) (r : Request) (a : Receipt)
    (h : receipt d r = some a) (payload : a.payload = r.payload) :
    publish d r = (d, a.answer) := by simp [publish, h, payload]

theorem changed_payload_no_effect (d : Durable) (r : Request) (a : Receipt)
    (h : receipt d r = some a) (payload : a.payload ≠ r.payload) :
    publish d r = (d, .payloadConflict) := by simp [publish, h, payload]

/-- Refused/stale fresh requests change only the request ledger. -/
theorem refusal_no_effect (d : Durable) (r : Request)
    (fresh : receipt d r = none) (refused : ∀ n, decide d r ≠ .accepted n) :
    (publish d r).1.events = d.events ∧ (publish d r).1.projection = d.projection ∧
    (publish d r).1.patientProjection = d.patientProjection := by
  cases hd : decide d r <;> simp_all [publish]

/-- An arbitrary advisory cache cannot turn a fresh native refusal into a new
accepted effect. This is the model's final-fresh-guard contract. -/
theorem cache_cannot_bypass (d : Durable) (r : Request) (fresh : receipt d r = none)
    (refused : r.native = false) :
    (publish d r).1.events = d.events ∧ (publish d r).1.projection = d.projection ∧
    (publish d r).1.patientProjection = d.patientProjection := by
  apply refusal_no_effect d r fresh
  intro n accepted
  have := (decide_accepted d r n accepted).1
  simp_all

private theorem receipt_fresh (d : Durable) (r : Request) (h : receipt d r = none) :
    ∀ a ∈ d.receipts, a.id ≠ r.id := by
  simpa [receipt] using (List.find?_eq_none.mp h)

/-- Once durable, a request answer cannot change under any later request. -/
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
    have differentB : (other.id == r.id) = false := by
      cases hb : other.id == r.id with
      | false => rfl
      | true => exact False.elim (different (by simpa using hb))
    change d.receipts.find? (fun a => a.id == r.id) = some a at h
    cases hd : decide d other <;> simp only [publish, ho, hd] <;>
      simpa [receipt, List.find?, differentB] using h

/-- All durable safety invariants preserved by the executable publication step. -/
theorem publish_invariant (d : Durable) (r : Request) (h : StrongInvariant d) :
    StrongInvariant (publish d r).1 := by
  rcases h with ⟨⟨hp, hu, hg, hm, ha⟩, he, hh⟩
  change d.projection = foldLog d.events at hp
  cases hr : receipt d r with
  | some a =>
    simp only [publish, hr]
    exact ⟨⟨hp, hu, hg, hm, ha⟩, he, hh⟩
  | none =>
    have fresh := receipt_fresh d r hr
    have notEvent : r.id ∉ d.events.map (fun e => e.request.id) := by
      simp only [List.mem_map]
      rintro ⟨e, mem, eq⟩
      obtain ⟨a, amem, ae, _, _⟩ := he e mem
      exact fresh a amem (ae.trans eq)
    cases hd : decide d r with
    | accepted n =>
      obtain ⟨native, _, _, _, serial⟩ := decide_accepted d r n hd
      simp only [publish, hr, hd]
      refine ⟨⟨?_, ?_, ?_, ?_, ?_⟩, ?_, ?_⟩
      · simp [ProjectionCorrect, foldLog, hp]
      · simpa [NoDuplicateEffect, List.nodup_cons] using And.intro notEvent hu
      · intro e mem
        simp only [List.mem_cons] at mem
        rcases mem with eq | mem
        · simpa [eq] using native
        · exact hg e mem
      · exact effect_safe d.projection r hm
      · intro a mem k eq
        simp only [List.mem_cons] at mem
        rcases mem with eqA | mem
        · subst a
          exact ⟨_, List.mem_cons_self, rfl, rfl⟩
        · obtain ⟨e, emem, eid, ep⟩ := ha a mem k eq
          exact ⟨e, List.mem_cons_of_mem _ emem, eid, ep⟩
      · intro e mem
        simp only [List.mem_cons] at mem
        rcases mem with eq | mem
        · subst e
          exact ⟨_, List.mem_cons_self, rfl, rfl, n, rfl⟩
        · obtain ⟨a, amem, aid, ap, an⟩ := he e mem
          exact ⟨a, List.mem_cons_of_mem _ amem, aid, ap, an⟩
      · dsimp [HistoryCorrect]
        have pr : decide { events := d.events, projection := foldLog d.events } r = decide d r := by
          simp [decide, readVersions, version, ← hp]
        exact ⟨rfl, by simpa [pr, serial] using hd, hh⟩
    | refused | conflict | payloadConflict =>
      all_goals
        simp only [publish, hr, hd]
        refine ⟨⟨hp, hu, hg, hm, ?_⟩, ?_, hh⟩
        · intro a mem n eq
          simp only [List.mem_cons] at mem
          rcases mem with eqA | mem
          · subst a; contradiction
          · exact ha a mem n eq
        · intro e mem
          obtain ⟨a, amem, aid, ap, an⟩ := he e mem
          exact ⟨a, List.mem_cons_of_mem _ amem, aid, ap, an⟩

theorem publish_patient_projection (d : Durable) (r : Request) (h : PatientProjectionCorrect d) :
    PatientProjectionCorrect (publish d r).1 := by
  change d.patientProjection = foldPatientLog d.events at h
  cases hr : receipt d r with
  | some a => simpa [PatientProjectionCorrect, publish, hr] using h
  | none =>
    cases hd : decide d r <;> simp only [publish, hr, hd]
    all_goals simp [PatientProjectionCorrect, foldPatientLog, h]

inductive Reachable : Durable → Prop where
  | initial : Reachable {}
  | publish {d : Durable} : Reachable d → (r : Request) → Reachable (Protocol.publish d r).1

theorem initial_invariant : StrongInvariant {} := by
  simp [StrongInvariant, Invariant, ProjectionCorrect, NoDuplicateEffect, NativeGuarded,
    AcceptedRecorded, EffectsRecorded, HistoryCorrect, foldLog, Multi.initial_invariant]

theorem reachable_invariant {d : Durable} (h : Reachable d) : StrongInvariant d := by
  induction h with
  | initial => exact initial_invariant
  | publish _ r ih => exact publish_invariant _ r ih

/-- Opaque clinical successors have the same atomic log/projection property;
this does not establish the semantics of the host FHIR transformation. -/
theorem patient_projections_equal_fold {d : Durable} (h : Reachable d) : PatientProjectionCorrect d := by
  induction h with
  | initial => rfl
  | publish _ r ih => exact publish_patient_projection _ r ih

theorem no_duplicate_accepted {d : Durable} (h : Reachable d) : NoDuplicateEffect d :=
  (reachable_invariant h).1.2.1

theorem projections_equal_fold {d : Durable} (h : Reachable d) : ProjectionCorrect d :=
  (reachable_invariant h).1.1

theorem bed_exclusivity_and_dose_at_most_once {d : Durable} (h : Reachable d) :
    Multi.Invariant d.projection := (reachable_invariant h).1.2.2.2.1

theorem no_lost_accepted {d : Durable} (h : Reachable d) : AcceptedRecorded d :=
  (reachable_invariant h).1.2.2.2.2

theorem no_phantom_effect {d : Durable} (h : Reachable d) : EffectsRecorded d :=
  (reachable_invariant h).2.1

theorem guards_on_replaced_versions {d : Durable} (h : Reachable d) :
    HistoryCorrect d.events := (reachable_invariant h).2.2

/-- Every fine-grained service step either stutters durably or performs exactly
one publication. This connects the machine to the unbounded durable proofs. -/
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

inductive MachineReachable (requests : List Request) : Machine → Prop where
  | initial : MachineReachable requests { txs := requests.map fun r => { request := r } }
  | step {m next : Machine} : MachineReachable requests m →
      advance m i op = some next → MachineReachable requests next

/-- No bound on the number of clients, distinct requests, crashes or retries. -/
theorem machine_invariant {requests : List Request} {m : Machine}
    (h : MachineReachable requests m) : StrongInvariant m.durable := by
  induction h with
  | initial => exact initial_invariant
  | step _ action ih =>
    rcases advance_publication _ _ _ _ action with eq | ⟨r, eq⟩
    · simpa [eq] using ih
    · simpa [eq] using publish_invariant _ r ih

theorem machine_patient_projection {requests : List Request} {m : Machine}
    (h : MachineReachable requests m) : PatientProjectionCorrect m.durable := by
  induction h with
  | initial => rfl
  | step _ action ih =>
    rcases advance_publication _ _ _ _ action with eq | ⟨r, eq⟩
    · simpa [eq] using ih
    · simpa [eq] using publish_patient_projection _ r ih

#print axioms publish_patient_projection
#print axioms patient_projections_equal_fold
#print axioms machine_patient_projection

#print axioms effect_safe
#print axioms decide_accepted
#print axioms receipt_fresh
#print axioms receipt_persistent
#print axioms advance_publication
#print axioms machine_invariant

#print axioms retry_stable
#print axioms changed_payload_no_effect
#print axioms refusal_no_effect
#print axioms cache_cannot_bypass
#print axioms publish_invariant
#print axioms initial_invariant
#print axioms reachable_invariant
#print axioms no_duplicate_accepted
#print axioms projections_equal_fold
#print axioms bed_exclusivity_and_dose_at_most_once
#print axioms no_lost_accepted
#print axioms no_phantom_effect
#print axioms guards_on_replaced_versions

end Ehr.Commit.Protocol
