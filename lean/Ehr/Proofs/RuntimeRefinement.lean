import Ehr.Proofs.RuntimeBlindStep

/-! Popup blocking for the deployed API, and the refinement of ordinary
fixed-facts runs by the core interpreter. An ordinary program is one without
patient selection (`Workspace.enabled = false`). Every definition and theorem
here is a new specification for owner review, outside Comparator. -/

namespace Ehr.Runtime
open Ehr Props Proofs

/-- New specification for owner review: for an ordinary program the
interpreter sees the API state itself; nothing is hydrated. -/
theorem inputState_ordinary (i : StepInput) (hord : Workspace.enabled i.program = false) :
    inputState i = i.state := by
  simp only [inputState, hord, Bool.false_eq_true, ↓reduceIte]

/-- New specification for owner review: for an ordinary program the API view
is the interpreter's view. -/
theorem runView_ordinary (i : ViewInput) (hord : Workspace.enabled i.program = false) :
    runView i = view i.spec i.program i.facts i.user i.state := by
  simp only [runView, hord, Bool.false_and, Bool.false_eq_true, ↓reduceIte]

/-- New specification for owner review: the interpreter refuses every human
event other than an acknowledgment while a popup is open, including a click on
a macro button, and leaves the state unchanged. -/
theorem step_popup_blocks (sp p f u s e) (hpop : s.popup?.isSome = true)
    (hack : e.isAck = false) :
    step sp p f u .human s e = (s, .blocked "popup: acknowledge the alert first") := by
  obtain ⟨open?, hp⟩ := Option.isSome_iff_exists.mp hpop
  cases e <;>
    simp only [step, stepCore, hp, hack, Option.isSome_some, Bool.not_false, Bool.and_self, ↓reduceIte]

/-- New specification for owner review: **popup blocking for ordinary
programs.** While a popup is open, an API call with any event other than an
acknowledgment returns the same state and the interpreter's popup refusal.
This includes every critical-result handler event. -/
theorem popup_blocks_ordinary (i : StepInput) (hord : Workspace.enabled i.program = false)
    (hpop : i.state.popup?.isSome = true) (hack : i.event.isAck = false) :
    runStep i = { state := i.state, result := .blocked "popup: acknowledge the alert first" } := by
  cases hh : CriticalRuntime.handle i.facts i.user i.state i.event with
  | none =>
    simp only [runStep, hord, Bool.false_and, Bool.false_eq_true, ↓reduceIte, hh, Option.getD_none,
      step_popup_blocks i.spec i.program i.facts i.user i.state i.event hpop hack]
  | some out =>
    simp only [runStep, hord, Bool.false_and, Bool.false_eq_true, ↓reduceIte, hh, Option.getD_some,
      critical_popup i.facts i.user i.state i.event out hpop hh]

/-- New specification for owner review: the clinical record that an open
popup protects. -/
structure Record where
  captured : List Captured
  commits : List CommitId
  acked : List (AlertId × String)
  receipts : List Receipt
  popup? : Option (AlertId × String)

/-- New specification for owner review: the protected clinical record of a state. -/
def record (s : State) : Record :=
  { captured := s.captured, commits := s.commits, acked := s.acked, receipts := s.receipts,
    popup? := s.popup? }

/-- New specification for owner review: with a popup open after hydration,
workspace event handling changes no protected field. Workspace navigation is
refused; a lookup query may still change the patient-selection context. -/
theorem workspace_popup_blocks (sp p f u s e)
    (hpop : (Workspace.bind sp p f u s).popup?.isSome = true) (hack : e.isAck = false) :
    record (Workspace.step sp p f u s e).1 = record (Workspace.bind sp p f u s) := by
  have hcore := step_popup_blocks sp p f u (Workspace.bind sp p f u s) e hpop hack
  unfold Workspace.step
  cases e <;> dsimp only
  all_goals
    repeat' first
    | rfl
    | contradiction
    | rw [hcore]
    | split

/-- New specification for owner review: **popup blocking for every program.**
While a popup is open at the effective input, an API call with any event other
than an acknowledgment leaves `captured`, `commits`, `acked`, `receipts` and
`popup?` as they are at the effective input. For an ordinary program or an
already-bound workspace state the effective input is the API state. -/
theorem popup_blocks (i : StepInput) (hpop : (inputState i).popup?.isSome = true)
    (hack : i.event.isAck = false) :
    record (runStep i).state = record (inputState i) := by
  cases hw : Workspace.enabled i.program
  · rw [inputState_ordinary i hw] at hpop ⊢
    rw [popup_blocks_ordinary i hw hpop hack]
  · have hin : inputState i = Workspace.bind i.spec i.program i.facts i.user i.state := by
      simp only [inputState, hw, ↓reduceIte]
    rw [hin] at hpop ⊢
    cases hb : Workspace.bound i.facts i.state
    · simpa only [runStep, hw, hb, Bool.not_false, Bool.and_self, ↓reduceIte, Option.getD_none] using
        workspace_popup_blocks i.spec i.program i.facts i.user i.state i.event hpop hack
    · have hi := bind_of_bound i.spec i.program i.facts i.user i.state hb
      cases hh : CriticalRuntime.handle i.facts i.user i.state i.event with
      | none =>
        simpa only [runStep, hw, hb, Bool.not_true, Bool.and_false, Bool.false_eq_true, ↓reduceIte,
          hh, Option.getD_none] using
          workspace_popup_blocks i.spec i.program i.facts i.user i.state i.event hpop hack
      | some out =>
        rw [hi] at hpop ⊢
        simp only [runStep, hw, hb, Bool.not_true, Bool.and_false, Bool.false_eq_true, ↓reduceIte,
          hh, Option.getD_some, critical_popup i.facts i.user i.state i.event out hpop hh]

/-- New specification for owner review: the state an API call returns in an
episode. -/
def next (ep : Episode) (s : State) (e : Event) : State :=
  (runStep ⟨ep.spec, ep.prog, ep.facts, ep.user, s, e⟩).state

/-- New specification for owner review: for an ordinary program, each API
call is, up to the critical workflow fields, either no step at all (a handled
critical-result event) or the core human step. -/
theorem ordinary_step (ep : Episode) (hord : Workspace.enabled ep.prog = false)
    (s : State) (e : Event) :
    forgetCritical (next ep s e) = forgetCritical s ∨
    forgetCritical (next ep s e) = ep.next .human (forgetCritical s) e := by
  cases hh : CriticalRuntime.handle ep.facts ep.user s e with
  | some out =>
    have hn : next ep s e = out.1 := by
      simp only [next, runStep, hord, Bool.false_and, Bool.false_eq_true, ↓reduceIte, hh,
        Option.getD_some]
    rw [hn, critical_frame ep.facts ep.user s e out hh]
    exact Or.inl rfl
  | none =>
    have hn : next ep s e = (step ep.spec ep.prog ep.facts ep.user .human s e).1 := by
      simp only [next, runStep, hord, Bool.false_and, Bool.false_eq_true, ↓reduceIte, hh,
        Option.getD_none]
    have hs := step_critical ep.spec ep.prog ep.facts ep.user .human (forgetCritical s) e
      s.criticalResults? s.criticalDrafts?
    have hf := step_critical ep.spec ep.prog ep.facts ep.user .human (forgetCritical s) e none none
    right
    rw [hn]
    change forgetCritical (step ep.spec ep.prog ep.facts ep.user .human
      (withCritical (forgetCritical s) s.criticalResults? s.criticalDrafts?) e).1 = _
    rw [hs]
    exact (congrArg Prod.fst hf).symm

/-- New specification for owner review: **refinement.** For an ordinary
program with fixed facts, forgetting the critical workflow fields of any state
reached through the API gives a state the core interpreter reaches. -/
theorem ordinary_refines (ep : Episode) (hord : Workspace.enabled ep.prog = false)
    (s : State) (hs : FixedReachable ep s) : Props.Reachable ep (forgetCritical s) := by
  induction hs with
  | start =>
    have hi : runInit ⟨ep.spec, ep.prog, ep.facts, ep.user⟩ = ep.start := by
      simp only [runInit, hord, Bool.false_eq_true, ↓reduceIte, Episode.start]
    rw [hi, Episode.start, init_critical]
    exact .start
  | @event s e _ ih =>
    rcases ordinary_step ep hord s e with h | h
    · exact h ▸ ih
    · exact h ▸ .step .human e ih
  | wait d _ ih => exact .wait d ih

/-- New specification for owner review: every state an ordinary fixed-facts
API run reaches agrees with a core reachable state on every field except
`criticalResults?` and `criticalDrafts?`. -/
theorem ordinary_agrees (ep : Episode) (hord : Workspace.enabled ep.prog = false)
    (s : State) (hs : FixedReachable ep s) :
    ∃ t, Props.Reachable ep t ∧ s = withCritical t s.criticalResults? s.criticalDrafts? :=
  ⟨forgetCritical s, ordinary_refines ep hord s hs, rfl⟩

/-- New specification for owner review: the runtime analogue of
`Props.Always`, over fixed-facts API runs. -/
def FixedAlways (ep : Episode) (P : State → Prop) : Prop :=
  ∀ s, FixedReachable ep s → P s

/-- New specification for owner review: the runtime analogue of
`Props.EveryStep` for the human API. `P s e s'` relates a state reached through
the API, an event, and the state the API returns for it. -/
def FixedEveryStep (ep : Episode) (P : State → Event → State → Prop) : Prop :=
  ∀ s, FixedReachable ep s → ∀ e, P s e (next ep s e)

/-- New specification for owner review: a core state invariant that does not
read the critical workflow fields holds in every ordinary fixed-facts API run. -/
theorem ordinary_always (ep : Episode) (hord : Workspace.enabled ep.prog = false)
    {P : State → Prop} (hblind : ∀ s, P (forgetCritical s) → P s) (hp : Always ep P) :
    FixedAlways ep P :=
  fun s hs => hblind s (hp _ (ordinary_refines ep hord s hs))

/-- New specification for owner review: a core property of human steps that
does not read the critical workflow fields, and that holds when the state does
not change, holds for every API call of an ordinary fixed-facts run. -/
theorem ordinary_everyStep (ep : Episode) (hord : Workspace.enabled ep.prog = false)
    {Q : State → Event → State → Prop}
    (hblind : ∀ s e s', Q (forgetCritical s) e (forgetCritical s') → Q s e s')
    (hstutter : ∀ s e, Q s e s)
    (hp : ∀ s, Props.Reachable ep s → ∀ e, Q s e (ep.next .human s e)) :
    FixedEveryStep ep Q := by
  intro s hs e
  apply hblind
  rcases ordinary_step ep hord s e with h | h
  · exact h ▸ hstutter _ e
  · exact h ▸ hp _ (ordinary_refines ep hord s hs) e

#print axioms inputState_ordinary
#print axioms runView_ordinary
#print axioms step_popup_blocks
#print axioms popup_blocks_ordinary
#print axioms workspace_popup_blocks
#print axioms popup_blocks
#print axioms ordinary_step
#print axioms ordinary_refines
#print axioms ordinary_agrees
#print axioms ordinary_always
#print axioms ordinary_everyStep
end Ehr.Runtime
