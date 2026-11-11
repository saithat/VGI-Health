import Ehr.Api
import Ehr.Proofs.Alerts
import Ehr.Proofs.T2
import Ehr.Props.Basics

/-! Runtime coverage. Every declaration in this module is a new specification
for owner review; none is in the Comparator catalog. Facts are inputs, not
hidden state: the host may replace them between calls, including hydration
after a patient switch. A separate fixed-facts relation models ordinary runs. -/

namespace Ehr.Runtime
open Ehr Props Proofs

/-- New specification for owner review: host-driven reachability, with human
API events, arbitrary per-call facts, and clock advances. The spec, program and
signed-in user stay fixed. This overapproximates host fact loading. -/
inductive Reachable (sp : Spec) (p : Program) (u : User) : State → Prop
  | start (f : Facts) : Reachable sp p u (runInit ⟨sp, p, f, u⟩)
  | event {s : State} (f : Facts) (e : Event) : Reachable sp p u s →
      Reachable sp p u (runStep ⟨sp, p, f, u, s, e⟩).state
  | wait {s : State} (d : Nat) : Reachable sp p u s →
      Reachable sp p u { s with clock := s.clock + d }

/-- New specification for owner review: fixed-facts runtime reachability.
For ordinary programs this starts at `Ehr.init`, but events still use runStep. -/
inductive FixedReachable (ep : Episode) : State → Prop
  | start : FixedReachable ep (runInit ⟨ep.spec, ep.prog, ep.facts, ep.user⟩)
  | event {s : State} (e : Event) : FixedReachable ep s →
      FixedReachable ep (runStep ⟨ep.spec, ep.prog, ep.facts, ep.user, s, e⟩).state
  | wait {s : State} (d : Nat) : FixedReachable ep s →
      FixedReachable ep { s with clock := s.clock + d }

/-- New specification for owner review: fixed-facts runs are included in the
host-driven model, also when patient selection is enabled. -/
theorem fixed_reachable {ep : Episode} {s : State} (h : FixedReachable ep s) :
    Reachable ep.spec ep.prog ep.user s := by
  induction h with
  | start => exact .start ep.facts
  | event e _ ih => exact .event ep.facts e ih
  | wait d _ ih => exact .wait d ih

/-- New specification for owner review: the exact state supplied to the
clinical interpreter if this API call reaches it. Hydration precedes the event. -/
def inputState (i : StepInput) : State :=
  if Workspace.enabled i.program then
    Workspace.bind i.spec i.program i.facts i.user i.state else i.state

/-- New specification for owner review: fields in which wrappers cannot
manufacture clinical evidence. Captures deliberately are not included. -/
def evidence (s : State) := (s.commits, s.acked, s.receipts, s.popup?)

/-- New specification for owner review: already-bound workspace calls do not
hydrate or reset the interpreter state. -/
theorem bind_of_bound (sp p f u s) (h : Workspace.bound f s = true) :
    Workspace.bind sp p f u s = s := by
  cases hc : s.patientContext? with
  | none => simp [Workspace.bound, hc] at h
  | some c =>
    have he : c.bound? = c.patient? := by
      simp only [Workspace.bound, hc, Bool.and_eq_true, beq_iff_eq] at h
      exact h.1.2.symm
    simp [Workspace.bind, hc, he]

/-- New specification for owner review: the state with its two critical-result
workflow fields replaced and every other field kept. -/
def withCritical (s : State) (c : Option (List Multi.Critical.Ticket))
    (d : Option (List (String × String))) : State :=
  { s with criticalResults? := c, criticalDrafts? := d }

/-- New specification for owner review: a handled critical-result event
changes only the two critical workflow fields. In particular it preserves
`captured`, `commits`, `acked`, `receipts`, `popup?` and `screen`. -/
theorem critical_frame (f u s e out)
    (h : CriticalRuntime.handle f u s e = some out) :
    out.1 = withCritical s out.1.criticalResults? out.1.criticalDrafts? := by
  unfold CriticalRuntime.handle at h
  split at h
  · dsimp only [Bind.bind, Option.bind, Pure.pure] at h
    split at h
    · simp at h
    · dsimp only at h
      repeat' split at h
      all_goals cases h; rfl
  · dsimp only [Bind.bind, Option.bind, Pure.pure] at h
    split at h
    · simp at h
    · dsimp only at h
      repeat' split at h
      all_goals cases h; rfl
  · simp_all

/-- New specification for owner review: while an alert popup is open, every
event the critical-result handler matches is refused with the state unchanged,
using the interpreter's own popup message. -/
theorem critical_popup (f u s e out) (hp : s.popup?.isSome = true)
    (h : CriticalRuntime.handle f u s e = some out) :
    out = (s, .blocked "popup: acknowledge the alert first") := by
  unfold CriticalRuntime.handle at h
  split at h
  · dsimp only [Bind.bind, Option.bind, Pure.pure] at h
    split at h
    · simp at h
    · simpa only [hp, ↓reduceIte, Option.some.injEq, CriticalRuntime.popupBlocked, eq_comm] using h
  · dsimp only [Bind.bind, Option.bind, Pure.pure] at h
    split at h
    · simp at h
    · simpa only [hp, ↓reduceIte, Option.some.injEq, CriticalRuntime.popupBlocked, eq_comm] using h
  · simp_all

/-- New specification for owner review: a handled critical-result event adds
no commit, acknowledgment, receipt or popup. -/
theorem critical_evidence (f u s e out)
    (h : CriticalRuntime.handle f u s e = some out) :
    evidence out.1 = evidence s := by
  rw [critical_frame f u s e out h]
  rfl

/-- New specification for owner review: workspace event handling either calls
the clinical interpreter on the bound state, preserves its evidence, or clears
it on a workspace navigation action. This is relative to hydration, not the
original API input: hydration may load receipts from facts. -/
theorem workspace_shape (sp p f u s e) :
    (Workspace.step sp p f u s e).1 =
      (step sp p f u .human (Workspace.bind sp p f u s) e).1 ∨
    evidence (Workspace.step sp p f u s e).1 = evidence (Workspace.bind sp p f u s) ∨
    evidence (Workspace.step sp p f u s e).1 = ([], [], [], none) := by
  unfold Workspace.step
  cases e <;> dsimp only
  all_goals
    repeat' first
    | split
    | exact Or.inl rfl
    | exact Or.inr (Or.inl rfl)
    | exact Or.inr (Or.inr rfl)
    | contradiction

/-- New specification for owner review: the deployed call either returns the
inner interpreter's state, preserves its evidence, or clears that evidence.
This covers both ordinary and selection-enabled programs and every API state. -/
theorem step_shape (i : StepInput) :
    (runStep i).state = (step i.spec i.program i.facts i.user .human (inputState i) i.event).1 ∨
    evidence (runStep i).state = evidence (inputState i) ∨
    evidence (runStep i).state = ([], [], [], none) := by
  cases hw : Workspace.enabled i.program
  · simp only [runStep, inputState, hw, Bool.false_and, Bool.false_eq_true, ↓reduceIte]
    cases hh : CriticalRuntime.handle i.facts i.user i.state i.event with
    | none => exact Or.inl rfl
    | some out => exact Or.inr (Or.inl (critical_evidence _ _ _ _ _ hh))
  · cases hb : Workspace.bound i.facts i.state
    · simpa only [runStep, inputState, hw, hb, Bool.not_false, Bool.true_and,
        ↓reduceIte, Option.getD_none] using
        workspace_shape i.spec i.program i.facts i.user i.state i.event
    · have hi := bind_of_bound i.spec i.program i.facts i.user i.state hb
      simp only [runStep, inputState, hw, hb, Bool.not_true, Bool.and_false,
        Bool.false_eq_true, ↓reduceIte, hi]
      cases hh : CriticalRuntime.handle i.facts i.user i.state i.event with
      | none => simpa only [hh, Option.getD_none, hi] using
          workspace_shape i.spec i.program i.facts i.user i.state i.event
      | some out => exact Or.inr (Or.inl (critical_evidence _ _ _ _ _ hh))

/-- New specification for owner review: any new commit must come from the
inner interpreter; wrappers cannot add it. Newness is at the hydrated state. -/
theorem new_commit_core (i : StepInput) (c : CommitId)
    (hnew : c ∉ (inputState i).commits) (hafter : c ∈ (runStep i).state.commits) :
    (runStep i).state = (step i.spec i.program i.facts i.user .human (inputState i) i.event).1 := by
  rcases step_shape i with h | h | h
  · exact h
  · have he := congrArg (fun x => x.1) h
    change (runStep i).state.commits = (inputState i).commits at he
    exact False.elim (hnew (he ▸ hafter))
  · have he := congrArg (fun x => x.1) h
    change (runStep i).state.commits = [] at he
    rw [he] at hafter
    contradiction

/-- New specification for owner review: hydration either preserves evidence
or starts a fresh patient episode, loading only the host's prior receipts. -/
theorem bind_evidence (sp p f u s) :
    evidence (Workspace.bind sp p f u s) = evidence s ∨
    evidence (Workspace.bind sp p f u s) = ([], [], f.receipts, none) := by
  unfold Workspace.bind
  split
  · exact Or.inl rfl
  · split
    · exact Or.inl rfl
    · split
      · exact Or.inl rfl
      · right
        simp only [evidence, (goTo_safe ..).commits, (goTo_safe ..).acked,
          (goTo_safe ..).receipts, goTo_popup, Ehr.init,
          (prefillScreen_safe ..).commits, (prefillScreen_safe ..).acked,
          (prefillScreen_safe ..).receipts, prefillScreen_popup]

/-- New specification for owner review: hydration cannot add a commit. -/
theorem input_commits (i : StepInput) (c : CommitId)
    (hc : c ∈ (inputState i).commits) : c ∈ i.state.commits := by
  unfold inputState at hc
  split at hc
  · rcases bind_evidence i.spec i.program i.facts i.user i.state with h | h
    · have he : (Workspace.bind i.spec i.program i.facts i.user i.state).commits =
          i.state.commits := congrArg (fun x => x.1) h
      exact he ▸ hc
    · have he : (Workspace.bind i.spec i.program i.facts i.user i.state).commits = [] :=
        congrArg (fun x => x.1) h
      rw [he] at hc
      contradiction
  · exact hc

/-- New specification for owner review: hydration cannot add an
acknowledgment, even when it loads a different patient's prior receipts. -/
theorem input_acks (i : StepInput) (pair : AlertId × String)
    (hc : pair ∈ (inputState i).acked) : pair ∈ i.state.acked := by
  unfold inputState at hc
  split at hc
  · rcases bind_evidence i.spec i.program i.facts i.user i.state with h | h
    · have he : (Workspace.bind i.spec i.program i.facts i.user i.state).acked =
          i.state.acked := congrArg (fun x => x.2.1) h
      exact he ▸ hc
    · have he : (Workspace.bind i.spec i.program i.facts i.user i.state).acked = [] :=
        congrArg (fun x => x.2.1) h
      rw [he] at hc
      contradiction
  · exact hc

/-- New specification for owner review: hydration's only additional receipts
come from host facts; it does not manufacture review evidence. -/
theorem input_receipts (i : StepInput) (r : Receipt)
    (hc : r ∈ (inputState i).receipts) : r ∈ i.state.receipts ∨ r ∈ i.facts.receipts := by
  unfold inputState at hc
  split at hc
  · rcases bind_evidence i.spec i.program i.facts i.user i.state with h | h
    · have he : (Workspace.bind i.spec i.program i.facts i.user i.state).receipts =
          i.state.receipts := congrArg (fun x => x.2.2.1) h
      exact Or.inl (he ▸ hc)
    · have he : (Workspace.bind i.spec i.program i.facts i.user i.state).receipts =
          i.facts.receipts := congrArg (fun x => x.2.2.1) h
      exact Or.inr (he ▸ hc)
  · exact Or.inl hc

/-- New specification for owner review: hydration keeps or clears the popup. -/
theorem input_popup (i : StepInput) :
    (inputState i).popup? = i.state.popup? ∨ (inputState i).popup? = none := by
  unfold inputState
  split
  · rcases bind_evidence i.spec i.program i.facts i.user i.state with h | h
    · exact Or.inl (congrArg (fun x => x.2.2.2) h)
    · exact Or.inr (congrArg (fun x => x.2.2.2) h)
  · exact Or.inl rfl

#print axioms fixed_reachable
#print axioms bind_of_bound
#print axioms critical_frame
#print axioms critical_popup
#print axioms critical_evidence
#print axioms workspace_shape
#print axioms step_shape
#print axioms new_commit_core
#print axioms bind_evidence
#print axioms input_commits
#print axioms input_acks
#print axioms input_receipts
#print axioms input_popup
end Ehr.Runtime
