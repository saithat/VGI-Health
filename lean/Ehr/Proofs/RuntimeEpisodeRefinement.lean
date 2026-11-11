import Ehr.Proofs.RuntimeEpisode

/-! Refinement of a bound patient episode by the core interpreter, started at
the hydrated chart instead of `init`, and the transfer of state invariants and
per-step properties to the API. Every definition and theorem here is a new
specification for owner review, outside Comparator. -/

namespace Ehr.Runtime
open Ehr Props

/-- New specification for owner review: the clinical part of a hydrated
chart: the core start state after one direct navigation to `first`. No click
is made and no screen between the start screen and `first` is prefilled. -/
def chart (ep : Episode) (first : ScreenId) : State :=
  (goTo ep.spec ep.prog ep.facts ep.start first).1

/-- Hydration returns its input, or the chart with the selected patient's
stored draft restored, the workspace clock, a patient context and the
draft store without that draft. -/
theorem bind_cases (sp p f u s) :
    Workspace.bind sp p f u s = s ∨
    ∃ first c, Workspace.bind sp p f u s =
      { Workspace.restore sp u (chart ⟨sp, p, f, u⟩ first) (pending s) with
        clock := s.clock, patientContext? := some c, patientDrafts? := remaining s } := by
  unfold Workspace.bind
  split
  · exact Or.inl rfl
  · rename_i c hc
    have hp : pending s = Workspace.draft s (c.patient?.getD "") := by
      simp only [pending, hc, Option.bind_some]
    have hr : remaining s = Workspace.others s (c.patient?.getD "") := by
      simp only [remaining, hc, Option.bind_some]
    rw [hp, hr]
    repeat' (first | exact Or.inl rfl | exact Or.inr ⟨_, _, rfl⟩ | split)

variable (E : BoundEpisode)

/-- New specification for owner review: the shape of the hydrated chart. It
is `chart` for the screen `Workspace.bind` selects, with the stored draft of
the selected patient restored (`Workspace.restore`: the human entries and the
acknowledgments), the clock of the opened state, a patient context and the
opened state's draft store without that draft. Every other field is the
chart's. -/
theorem start_eq (hyd : E.Hydrates) :
    ∃ first c, E.start =
      { Workspace.restore E.spec E.user (chart E.toEpisode first) (pending E.opened) with
        clock := E.opened.clock, patientContext? := some c,
        patientDrafts? := remaining E.opened } := by
  rcases bind_cases E.spec E.prog E.facts E.user E.opened with h | h
  · have hb := hyd.bound
    rw [BoundEpisode.start, h, hyd.unbound] at hb
    contradiction
  · exact h

/-- The chart has no critical workflow data. -/
theorem chart_critical (ep : Episode) (first : ScreenId) :
    forgetCritical (chart ep first) = chart ep first := by
  have h := congrArg Prod.fst (goTo_critical ep.spec ep.prog ep.facts ep.start first none none)
  have hi : withCritical ep.start none none = ep.start := init_critical ..
  rw [hi] at h
  exact h.symm

/-- The hydrated chart has no critical workflow data. -/
theorem start_critical (hyd : E.Hydrates) : forgetCritical E.start = E.start := by
  obtain ⟨first, c, h⟩ := start_eq E hyd
  rw [h]
  exact congrArg (fun x : State =>
    { Workspace.restore E.spec E.user x (pending E.opened) with
      clock := E.opened.clock, patientContext? := some c,
      patientDrafts? := remaining E.opened })
    (chart_critical E.toEpisode first)

/-- New specification for owner review: **refinement within an episode.**
Forgetting the critical workflow fields of any state of a bound patient
episode gives a state the core interpreter reaches from the hydrated chart
with the same facts. The patient context is kept as it is: no core step reads
or writes it. The start is `E.start`, not `init`; see `episode_not_core`. -/
theorem episode_refines {s : State} (hs : InEpisode E s) :
    ReachableFrom E.toEpisode E.start (forgetCritical s) := by
  induction hs with
  | hydrated hyd => rw [start_critical E hyd]; exact .start
  | first e hyd hn =>
    have h := congrArg Prod.fst
      (step_critical E.spec E.prog E.facts E.user .human E.start e none none)
    rw [first_step E hyd e hn]
    split
    · rw [start_critical E hyd]
      exact .start
    change ReachableFrom E.toEpisode E.start (forgetCritical (E.toEpisode.next .human E.start e))
    have hc : forgetCritical (E.toEpisode.next .human E.start e) =
        E.toEpisode.next .human (forgetCritical E.start) e := h.symm
    rw [hc, start_critical E hyd]
    exact .step .human e .start
  | @event s e hs hn ih =>
    rcases episode_step E hs.hydrates.enabled s e (episode_bound E hs) hn with h | h
    · exact h ▸ ih
    · exact h ▸ .step .human e ih
  | wait d _ ih => exact .wait d ih

/-- New specification for owner review: every state of an episode agrees with
a state the core reaches from the hydrated chart on every field except
`criticalResults?` and `criticalDrafts?`. -/
theorem episode_agrees {s : State} (hs : InEpisode E s) :
    ∃ t, ReachableFrom E.toEpisode E.start t ∧
      s = withCritical t s.criticalResults? s.criticalDrafts? :=
  ⟨forgetCritical s, episode_refines E hs, rfl⟩

/-- New specification for owner review: no core run from `init` has a patient
context. -/
theorem core_context (ep : Episode) {s : State} (hs : Props.Reachable ep s) :
    s.patientContext? = none := by
  induction hs with
  | start => exact init_context ..
  | step actor e _ ih => exact (step_context ..).trans ih
  | wait d _ ih => exact ih

/-- New specification for owner review: no state of a bound patient episode
is `Props.Reachable` as it is. The patient context alone separates them, so a
refinement by `Props.Reachable` must at least forget that field. -/
theorem episode_not_core {s : State} (hs : InEpisode E s) : ¬ Props.Reachable E.toEpisode s := by
  intro hr
  have hb := episode_bound E hs
  simp [Workspace.bound, core_context E.toEpisode hr] at hb

/-- New specification for owner review: `Props.Always` over the states of one
bound patient episode. -/
def EpisodeAlways (E : BoundEpisode) (P : State → Prop) : Prop :=
  ∀ s, InEpisode E s → P s

/-- New specification for owner review: `Props.EveryStep` for the human API
calls of one bound patient episode. `Q s e s'` relates a state, an event that
is not workspace navigation there, and the state the API returns. The first
clause is the hydrating call: `s` is its effective input, the hydrated chart
`E.start`, not the API input `E.opened`; a refused acknowledgment or commit
click returns `E.start` itself. The second clause is every later
call. Calls that leave or switch the chart are not covered. -/
def EpisodeEveryStep (E : BoundEpisode) (Q : State → Event → State → Prop) : Prop :=
  (E.Hydrates → ∀ e, E.Stays E.start e → Q E.start e (E.next E.opened e)) ∧
  ∀ s, InEpisode E s → ∀ e, E.Stays s e → Q s e (E.next s e)

/-- New specification for owner review: a state invariant of core runs from
the hydrated chart that does not read the critical workflow fields holds in
every state of the episode. -/
theorem episode_always {P : State → Prop} (hblind : ∀ s, P (forgetCritical s) → P s)
    (hp : E.Hydrates → AlwaysFrom E.toEpisode E.start P) : EpisodeAlways E P :=
  fun s hs => hblind s (hp hs.hydrates _ (episode_refines E hs))

/-- New specification for owner review: a property of core human steps from
the hydrated chart that does not read the critical workflow fields, and that
holds when the state does not change, holds for every API call of the episode. -/
theorem episode_everyStep {Q : State → Event → State → Prop}
    (hblind : ∀ s e s', Q (forgetCritical s) e (forgetCritical s') → Q s e s')
    (hstutter : ∀ s e, Q s e s)
    (hp : E.Hydrates → ∀ s, ReachableFrom E.toEpisode E.start s →
      ∀ e, Q s e (E.toEpisode.next .human s e)) :
    EpisodeEveryStep E Q := by
  refine ⟨fun hyd e hn => ?_, fun s hs e hn => ?_⟩
  · rw [first_step E hyd e hn]
    split
    · exact hstutter _ e
    · exact hp hyd _ .start e
  · apply hblind
    rcases episode_step E hs.hydrates.enabled s e (episode_bound E hs) hn with h | h
    · exact h ▸ hstutter _ e
    · exact h ▸ hp hs.hydrates _ (episode_refines E hs) e

#print axioms bind_cases
#print axioms start_eq
#print axioms chart_critical
#print axioms start_critical
#print axioms episode_refines
#print axioms episode_agrees
#print axioms core_context
#print axioms episode_not_core
#print axioms episode_always
#print axioms episode_everyStep
end Ehr.Runtime
