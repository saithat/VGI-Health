import Std

/-! Multi-actor critical-result workflow. Time is monotone model minutes.
Fairness requires delivery/timeout service at every minute; UI clicks are
neither a clock nor a transport service. Authentication remains external. -/
namespace Ehr.Multi.Critical

structure Result where
  id : String
  patient : String
  label : String
  responsible : String
  covering : String
  availableAt : Nat
  limit : Nat
  /-- Exact source snapshot identity; corrected data must not inherit resolution. -/
  source? : Option String := none
  deriving DecidableEq, Repr, Inhabited

structure Resolution where
  actor : String
  recordedAt : Nat
  action : String
  deriving DecidableEq, Repr, Inhabited

structure Ticket where
  result : Result
  deliveredAt : Option Nat := none
  receivedBy : List String := []
  acknowledgedBy : List String := []
  escalatedAt : Option Nat := none
  resolution : Option Resolution := none
  deriving DecidableEq, Repr, Inhabited

inductive Action where
  | receive
  | acknowledge
  | resolve (clinicalAction : String)
  deriving DecidableEq, Repr

/-- Immediate delivery upon availability; durable covering-clinician escalation
at the deadline if unresolved. No clinical resolution is manufactured. -/
def advance (now : Nat) (t : Ticket) : Ticket :=
  if now < t.result.availableAt then t else
  let delivered := { t with deliveredAt := some (t.deliveredAt.getD now) }
  if t.resolution.isNone && t.result.availableAt + t.result.limit ≤ now then
    { delivered with escalatedAt := some (t.escalatedAt.getD now) }
  else delivered

def authorized (t : Ticket) (actor : String) : Bool :=
  actor != "" && (actor == t.result.responsible ||
    (t.escalatedAt.isSome && actor == t.result.covering))

def step (now : Nat) (actor : String) (t : Ticket) (a : Action) : Ticket :=
  if !t.deliveredAt.isSome || !authorized t actor then t else
  match a with
  | .receive => { t with receivedBy := (actor :: t.receivedBy).eraseDups }
  | .acknowledge => { t with acknowledgedBy := (actor :: t.acknowledgedBy).eraseDups }
  | .resolve action =>
    if action.trimAscii.toString == "" || !t.receivedBy.contains actor || t.resolution.isSome then t
    else { t with resolution := some ⟨actor, now, action⟩ }

/-- Any finite interleaving of actors, followed by the fair minute service. -/
def minute (now : Nat) (t : Ticket) (actions : List (String × Action)) : Ticket :=
  advance now (actions.foldl (fun t a => step now a.1 t a.2) t)

theorem immediate_delivery (t : Ticket) :
    (advance t.result.availableAt t).deliveredAt.isSome = true := by
  simp only [advance, Nat.lt_irrefl, ↓reduceIte]
  split <;> rfl

/-- Fair minute service: each available minute performs delivery/timeout after
any finite actor interleaving at that minute. No clinician-response fairness. -/
def FairService (trace : Nat → Ticket) : Prop :=
  ∀ minute, ∃ before, trace minute = advance minute before ∧ before.result = (trace minute).result

theorem deadline (now : Nat) (t : Ticket)
    (due : t.result.availableAt + t.result.limit ≤ now) :
    (advance now t).resolution.isSome = true ∨ (advance now t).escalatedAt.isSome = true := by
  have available : ¬ now < t.result.availableAt := by omega
  simp only [advance, available, ↓reduceIte]
  cases h : t.resolution <;> simp [h, due]

/-- Fixed result identity: every fair trace meets its original deadline. -/
theorem eventually_resolved_or_escalated (trace : Nat → Ticket) (r : Result)
    (identity : ∀ n, (trace n).result = r) (fair : FairService trace) :
    ∃ n ≤ r.availableAt + r.limit,
      (trace n).resolution.isSome = true ∨ (trace n).escalatedAt.isSome = true := by
  let n := r.availableAt + r.limit
  refine ⟨n, Nat.le_refl _, ?_⟩
  obtain ⟨before, served, same⟩ := fair n
  have h := deadline n before (by simp [same, identity, n])
  rw [← served] at h
  exact h

theorem acknowledgment_never_resolves (now actor t) :
    (step now actor t .acknowledge).resolution = t.resolution := by
  simp only [step]; split <;> rfl

theorem receive_never_resolves (now actor t) :
    (step now actor t .receive).resolution = t.resolution := by
  simp only [step]; split <;> rfl

theorem timeout_never_resolves (now t) : (advance now t).resolution = t.resolution := by
  simp only [advance]; split <;> (try rfl)
  split <;> rfl

theorem resolution_requires_clinician_action (now actor t action) (before : t.resolution = none)
    (after : (step now actor t (.resolve action)).resolution.isSome = true) :
    authorized t actor = true ∧ t.receivedBy.contains actor = true ∧
      action.trimAscii.toString ≠ "" ∧
      (step now actor t (.resolve action)).resolution = some ⟨actor, now, action⟩ := by
  simp only [step] at after ⊢
  split at after <;> simp_all
  split at after <;> simp_all

#print axioms immediate_delivery
#print axioms deadline
#print axioms eventually_resolved_or_escalated
#print axioms acknowledgment_never_resolves
#print axioms receive_never_resolves
#print axioms timeout_never_resolves
#print axioms resolution_requires_clinician_action
end Ehr.Multi.Critical

namespace Ehr.Multi.Critical

/-- No recorded clinical action/escalation is dated in the future. -/
def PastRecords (now : Nat) (t : Ticket) : Prop :=
  (∀ atMinute ∈ t.escalatedAt, atMinute ≤ now) ∧
  (∀ record ∈ t.resolution, record.recordedAt ≤ now)

theorem advance_result (now t) : (advance now t).result = t.result := by
  simp only [advance]; split <;> (try rfl)
  split <;> rfl

theorem step_result (now actor t action) : (step now actor t action).result = t.result := by
  cases action <;> simp only [step] <;> split <;> (try rfl)
  split <;> rfl

theorem past_mono (t : Ticket) (before now : Nat) (le : before ≤ now)
    (past : PastRecords before t) : PastRecords now t := by
  exact ⟨fun n h => Nat.le_trans (past.1 n h) le,
    fun r h => Nat.le_trans (past.2 r h) le⟩

theorem advance_past (now t) (past : PastRecords now t) : PastRecords now (advance now t) := by
  simp only [advance]; split
  · exact past
  · split
    · rcases past with ⟨escalation, resolution⟩
      constructor
      · cases h : t.escalatedAt <;> simp_all
      · exact resolution
    · exact past

theorem step_past (now actor t action) (past : PastRecords now t) :
    PastRecords now (step now actor t action) := by
  cases action with
  | receive =>
    simp only [step]; split <;> exact past
  | acknowledge =>
    simp only [step]; split <;> exact past
  | resolve action =>
    simp only [step]; split
    · exact past
    · split
      · exact past
      · exact ⟨past.1, by simp⟩

def actorRound (now : Nat) : Ticket → List (String × Action) → Ticket
  | t, [] => t
  | t, a :: rest => actorRound now (step now a.1 t a.2) rest

theorem round_result (now t actions) : (actorRound now t actions).result = t.result := by
  induction actions generalizing t with
  | nil => rfl
  | cons a rest ih => rw [actorRound, ih, step_result]

theorem round_past (now t actions) (past : PastRecords now t) :
    PastRecords now (actorRound now t actions) := by
  induction actions generalizing t with
  | nil => exact past
  | cons a rest ih => exact ih _ (step_past now a.1 t a.2 past)

/-- Executable fair schedule, starting with a new result and allowing any
finite multi-actor interleaving at each minute. Each minute ends with service. -/
def trace (r : Result) (actors : Nat → List (String × Action)) : Nat → Ticket
  | 0 => advance 0 (actorRound 0 { result := r } (actors 0))
  | n + 1 => advance (n + 1) (actorRound (n + 1) (trace r actors n) (actors (n + 1)))

theorem trace_result (r actors n) : (trace r actors n).result = r := by
  induction n with
  | zero => simp [trace, advance_result, round_result]
  | succ n ih => simp [trace, advance_result, round_result, ih]

theorem trace_past (r actors n) : PastRecords n (trace r actors n) := by
  induction n with
  | zero => exact advance_past _ _ (round_past _ _ _ (by simp [PastRecords]))
  | succ n ih => exact advance_past _ _ (round_past _ _ _ (past_mono _ _ _ (by omega) ih))

theorem trace_fair (r actors) : FairService (trace r actors) := by
  intro n
  cases n with
  | zero => exact ⟨_, rfl, by simp [trace, advance_result, round_result]⟩
  | succ n => exact ⟨_, rfl, by simp [trace, advance_result, round_result]⟩

/-- Timestamped bound for every result under arbitrary actor interleavings of
the executable fair schedule: both status and recorded event time meet deadline. -/
theorem bounded_follow_through (r : Result) (actors : Nat → List (String × Action)) :
    ∃ n ≤ r.availableAt + r.limit,
      (∃ record, (trace r actors n).resolution = some record ∧ record.recordedAt ≤ r.availableAt + r.limit) ∨
      (∃ atMinute ≤ r.availableAt + r.limit, (trace r actors n).escalatedAt = some atMinute) := by
  obtain ⟨n, bound, done⟩ := eventually_resolved_or_escalated (trace r actors) r
    (trace_result r actors) (trace_fair r actors)
  refine ⟨n, bound, ?_⟩
  rcases done with resolved | escalated
  · cases h : (trace r actors n).resolution with
    | none => simp [h] at resolved
    | some record => exact Or.inl ⟨record, rfl, Nat.le_trans ((trace_past r actors n).2 record (by simp [h])) bound⟩
  · cases h : (trace r actors n).escalatedAt with
    | none => simp [h] at escalated
    | some atMinute => exact Or.inr ⟨atMinute, Nat.le_trans ((trace_past r actors n).1 atMinute (by simp [h])) bound, rfl⟩

#print axioms advance_result
#print axioms step_result
#print axioms past_mono
#print axioms advance_past
#print axioms step_past
#print axioms round_result
#print axioms round_past
#print axioms trace_result
#print axioms trace_past
#print axioms trace_fair
#print axioms bounded_follow_through
end Ehr.Multi.Critical
