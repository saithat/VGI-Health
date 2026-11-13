import Ehr.Proofs.RuntimeContext
import Ehr.Proofs.RuntimeRefinement
import Ehr.Proofs.RuntimeFrom

/-! Bound patient episodes for programs with patient selection. One episode is
the time one clinician keeps one patient's chart open: from the hydration of
the chart until the clinician leaves or switches it. Every definition and
theorem here is a new specification for owner review, outside Comparator. -/

namespace Ehr.Runtime
open Ehr Props

/-- New specification for owner review: the parameters of one bound patient
episode. `spec`, `prog`, `facts` and `user` are fixed for the whole episode;
`facts` are the selected patient's facts. `opened` is the API state in which
the patient has been opened but the chart is not yet hydrated, as
`Workspace.openPatient` leaves it. -/
structure BoundEpisode extends Episode where
  /-- The API state before hydration: a patient is selected but not bound. -/
  opened : State

namespace BoundEpisode

/-- New specification for owner review: the first state of the episode, the
hydrated chart. `Workspace.bind` builds it from a fresh `init`, goes to the
selected clinical screen, restores the workspace clock and binds the patient.
It then restores the patient's stored draft: the human entries and the
acknowledgments of the chart as the clinician last left it. It is the
effective input of the hydrating API call, not an API output. -/
def start (E : BoundEpisode) : State :=
  Workspace.bind E.spec E.prog E.facts E.user E.opened

/-- New specification for owner review: hydration succeeds. The program has
patient selection, `opened` is not bound to the facts' source patient, and
binding it gives a state that is. So `Workspace.bind` took its hydrating
branch: a patient is selected, the facts are that patient's, and the directory
resolves the patient uniquely. -/
structure Hydrates (E : BoundEpisode) : Prop where
  /-- The program uses patient selection. -/
  enabled : Workspace.enabled E.prog = true
  /-- Before hydration the chart is not bound. -/
  unbound : Workspace.bound E.facts E.opened = false
  /-- After hydration the chart is bound to the facts' source patient. -/
  bound : Workspace.bound E.facts E.start = true

/-- New specification for owner review: the state an API call returns in the episode. -/
def next (E : BoundEpisode) (s : State) (e : Event) : State := Runtime.next E.toEpisode s e

end BoundEpisode

/-- New specification for owner review: the events that `Workspace.step`
handles as workspace navigation in a bound chart. A click on a control that
`Workspace.action?` resolves (an activity list, Patient Lookup, Return to the
list; opening another patient is offered only when no patient is selected),
and an entry into the workspace search box. Every other event goes to the
clinical interpreter. A navigation click is refused while an alert popup is
open; it is excluded here all the same. -/
def workspaceEvent (p : Program) (f : Facts) (s : State) : Event → Bool
  | .click id => (Workspace.action? p f s id).isSome
  | .enter comp (.text _) => comp == "workspace.search"
  | _ => false

/-- New specification for owner review: the event keeps the clinician in the
chart: it is not workspace navigation in state `s`. -/
def BoundEpisode.Stays (E : BoundEpisode) (s : State) (e : Event) : Prop :=
  workspaceEvent E.prog E.facts s e = false

instance (E : BoundEpisode) (s : State) (e : Event) : Decidable (E.Stays s e) := by
  unfold BoundEpisode.Stays; infer_instance

/-- New specification for owner review: the events that the call hydrating a
chart refuses with `Workspace.loading`: an acknowledgment, and a click on a
commit button of the hydrated chart's screen. The clinician has not seen the
chart that call loads. -/
def loadingEvent (p : Program) (s : State) : Event → Bool
  | .click id => Workspace.commitClick p s id
  | .ack _ => true
  | .enter cid _ => reconcileReservedId cid
  | _ => false

/-- New specification for owner review: **the states of one bound patient
episode.** They are the hydrated chart `E.start`; the state the hydrating API
call returns; every state a later API call returns for an event that is not
workspace navigation; and those states with the clock advanced. Facts, spec,
program and user are fixed, so the bound patient is fixed.

Excluded: the unselected landing view, list and lookup states, the opened but
not yet hydrated state `E.opened`, and every transition that leaves or
switches the chart (Return to the list, an activity list, Patient Lookup,
opening another patient). A later hydration starts another episode with its
own `BoundEpisode`. If hydration does not succeed, no state is in the episode. -/
inductive InEpisode (E : BoundEpisode) : State → Prop
  /-- The hydrated chart. -/
  | hydrated : E.Hydrates → InEpisode E E.start
  /-- The state returned by the API call that hydrates the chart. Its event is
  applied to the hydrated chart, unless it is refused (`loadingEvent`); then
  the call returns the hydrated chart. -/
  | first (e : Event) : E.Hydrates → E.Stays E.start e → InEpisode E (E.next E.opened e)
  /-- A later API call with an event that is not workspace navigation. -/
  | event {s : State} (e : Event) : InEpisode E s → E.Stays s e → InEpisode E (E.next s e)
  /-- Time passes. -/
  | wait {s : State} (d : Nat) : InEpisode E s → InEpisode E { s with clock := s.clock + d }

/-- A state is in an episode only if hydration succeeded. -/
theorem InEpisode.hydrates {E : BoundEpisode} {s : State} (h : InEpisode E s) : E.Hydrates := by
  induction h with
  | hydrated hyd => exact hyd
  | first _ hyd _ => exact hyd
  | event _ _ _ ih => exact ih
  | wait _ _ ih => exact ih

/-- A bound chart has a selected patient. -/
theorem bound_patient (f : Facts) (s : State) (h : Workspace.bound f s = true) :
    (s.patientContext?.bind (·.patient?)).isSome = true := by
  cases hc : s.patientContext? with
  | none => simp [Workspace.bound, hc] at h
  | some c =>
    simp only [Workspace.bound, hc, Bool.and_eq_true] at h
    simpa only [Option.bind_some] using h.1.1

/-- New specification for owner review: in a bound chart, an event that is
not workspace navigation is exactly one human step of the clinical interpreter. -/
theorem workspace_core (sp p f u s e) (hb : Workspace.bound f s = true)
    (hn : workspaceEvent p f s e = false) :
    Workspace.step sp p f u s e = step sp p f u .human s e := by
  have hpat := bound_patient f s hb
  have hy : Workspace.hydrates sp p f u s = false := by
    simp only [Workspace.hydrates, hb, Bool.not_true, Bool.false_and]
  unfold Workspace.step
  simp only [hy, bind_of_bound sp p f u s hb]
  have hnone : (s.patientContext?.bind (·.patient?)).isNone = false := by
    cases hc : s.patientContext?.bind (·.patient?) with
    | none => simp [hc] at hpat
    | some _ => rfl
  cases e with
  | click id =>
    have ha : Workspace.action? p f s id = none := by
      simpa only [workspaceEvent, Option.isSome_eq_false_iff, Option.isNone_iff_eq_none] using hn
    simp only [ha, hb, Bool.not_true, Bool.false_and, Bool.false_eq_true, ↓reduceIte]
  | enter comp v =>
    cases v <;> by_cases hs : comp = "workspace.search" <;>
      simp_all [workspaceEvent, loadingEvent] <;> rfl
  | search q => simp only [hnone, hb, Bool.false_eq_true, ↓reduceIte]
  | _ => simp only [hb, Bool.not_true, Bool.false_eq_true, ↓reduceIte]

/-- New specification for owner review: on the call that hydrates a chart,
an event that is not workspace navigation is refused with the hydrated chart
returned if it is an acknowledgment or a commit click, and is otherwise
exactly one human step of the clinical interpreter on the hydrated chart. -/
theorem workspace_first (sp p f u s e) (hy : Workspace.hydrates sp p f u s = true)
    (hn : workspaceEvent p f (Workspace.bind sp p f u s) e = false) :
    Workspace.step sp p f u s e =
      if loadingEvent p (Workspace.bind sp p f u s) e
      then (Workspace.bind sp p f u s, Workspace.loading)
      else step sp p f u .human (Workspace.bind sp p f u s) e := by
  have hb : Workspace.bound f (Workspace.bind sp p f u s) = true := by
    simp only [Workspace.hydrates, Bool.and_eq_true] at hy
    exact hy.2
  have hpat := bound_patient f _ hb
  have hnone : ((Workspace.bind sp p f u s).patientContext?.bind (·.patient?)).isNone = false := by
    cases hc : (Workspace.bind sp p f u s).patientContext?.bind (·.patient?) with
    | none => simp [hc] at hpat
    | some _ => rfl
  unfold Workspace.step
  simp only [hy]
  cases e with
  | click id =>
    have ha : Workspace.action? p f (Workspace.bind sp p f u s) id = none := by
      simpa only [workspaceEvent, Option.isSome_eq_false_iff, Option.isNone_iff_eq_none] using hn
    simp only [ha, hb, loadingEvent, Bool.not_true, Bool.true_and, Bool.false_eq_true, ↓reduceIte]
    rfl
  | enter comp v =>
    cases v <;> by_cases hs : comp = "workspace.search" <;>
      simp_all [workspaceEvent, loadingEvent] <;> rfl
  | search q => simp only [hnone, hb, loadingEvent, Bool.false_eq_true, ↓reduceIte]
  | ack a => simp only [hb, loadingEvent, Bool.not_true, Bool.false_eq_true, ↓reduceIte]
  | _ => simp only [hb, loadingEvent, Bool.not_true, Bool.false_eq_true, ↓reduceIte]

/-- New specification for owner review: workspace navigation that is not
refused leaves the chart: the returned state is not bound to any patient's
facts. So no later state of the same run is in this episode until another
hydration. -/
theorem navigation_leaves (sp p f u s id action) (f' : Facts)
    (ha : Workspace.action? p f (Workspace.bind sp p f u s) id = some action)
    (hpop : (Workspace.bind sp p f u s).popup? = none) :
    Workspace.bound f' (Workspace.step sp p f u s (.click id)).1 = false := by
  unfold Workspace.step
  simp only [ha, hpop, Option.isSome_none, Bool.false_eq_true, ↓reduceIte]
  cases action <;> simp [Workspace.bound, Workspace.openPatient, Workspace.showList, Workspace.init]

/-- An API call whose state is the critical handler's or the interpreter's is,
up to the critical workflow fields, no step or the core human step. -/
theorem handled_or_core (ep : Episode) (s : State) (e : Event)
    (h : next ep s e = ((CriticalRuntime.handle ep.facts ep.user s e).getD
      (step ep.spec ep.prog ep.facts ep.user .human s e)).1) :
    forgetCritical (next ep s e) = forgetCritical s ∨
    forgetCritical (next ep s e) = ep.next .human (forgetCritical s) e := by
  cases hh : CriticalRuntime.handle ep.facts ep.user s e with
  | some out =>
    rw [h, hh, Option.getD_some, critical_frame ep.facts ep.user s e out hh]
    exact Or.inl rfl
  | none =>
    have hs := step_critical ep.spec ep.prog ep.facts ep.user .human (forgetCritical s) e
      s.criticalResults? s.criticalDrafts?
    have hf := step_critical ep.spec ep.prog ep.facts ep.user .human (forgetCritical s) e none none
    right
    rw [h, hh, Option.getD_none]
    change forgetCritical (step ep.spec ep.prog ep.facts ep.user .human
      (withCritical (forgetCritical s) s.criticalResults? s.criticalDrafts?) e).1 = _
    rw [hs]
    exact (congrArg Prod.fst hf).symm

variable (E : BoundEpisode)

/-- New specification for owner review: in a bound chart of a program with
patient selection, each API call with an event that is not workspace
navigation is, up to the critical workflow fields, either no step (a handled
critical-result event) or the core human step. -/
theorem episode_step (henabled : Workspace.enabled E.prog = true) (s : State) (e : Event)
    (hb : Workspace.bound E.facts s = true) (hn : E.Stays s e) :
    forgetCritical (E.next s e) = forgetCritical s ∨
    forgetCritical (E.next s e) = E.toEpisode.next .human (forgetCritical s) e := by
  apply handled_or_core
  simp only [next, runStep, henabled, hb, Bool.not_true, Bool.and_false, Bool.false_eq_true,
    ↓reduceIte, workspace_core E.spec E.prog E.facts E.user s e hb hn]

/-- New specification for owner review: the hydrating API call. An
acknowledgment or a commit click is refused and the call returns the hydrated
chart. Every other event that is not workspace navigation is applied to the
hydrated chart as one core human step. The critical-result handler is not
offered an event before the chart is bound. -/
theorem first_step (hyd : E.Hydrates) (e : Event) (hn : E.Stays E.start e) :
    E.next E.opened e =
      if loadingEvent E.prog E.start e then E.start else E.toEpisode.next .human E.start e := by
  have hy : Workspace.hydrates E.spec E.prog E.facts E.user E.opened = true := by
    simp only [Workspace.hydrates, hyd.unbound, Bool.not_false, Bool.true_and]
    exact hyd.bound
  simp only [BoundEpisode.next, next, runStep, hyd.enabled, hyd.unbound, Bool.not_false,
    Bool.and_self, ↓reduceIte, Option.getD_none]
  rw [workspace_first E.spec E.prog E.facts E.user E.opened e hy hn]
  change (if loadingEvent E.prog E.start e = true then (E.start, Workspace.loading)
      else step E.spec E.prog E.facts E.user .human E.start e).1 =
    if loadingEvent E.prog E.start e = true then E.start else E.toEpisode.next .human E.start e
  cases loadingEvent E.prog E.start e <;> rfl

/-- New specification for owner review: every state of an episode has the
patient context of the hydrated chart. No event inside the episode changes the
selected or the bound patient. -/
theorem episode_context {s : State} (h : InEpisode E s) :
    s.patientContext? = E.start.patientContext? := by
  induction h with
  | hydrated _ => rfl
  | first e hyd hn =>
    rw [first_step E hyd e hn]
    split
    · rfl
    · exact step_context ..
  | @event s e hs hn ih =>
    have hb : Workspace.bound E.facts s = true :=
      (bound_of_context E.facts ih).trans hs.hydrates.bound
    rcases episode_step E hs.hydrates.enabled s e hb hn with h | h
    · exact (congrArg State.patientContext? h).trans ih
    · exact (congrArg State.patientContext? h).trans ((step_context ..).trans ih)
  | wait d _ ih => exact ih

/-- New specification for owner review: every state of an episode is bound to
the facts' source patient. -/
theorem episode_bound {s : State} (h : InEpisode E s) : Workspace.bound E.facts s = true :=
  (bound_of_context E.facts (episode_context E h)).trans h.hydrates.bound

/-- New specification for owner review: a state that is not bound to the
episode's facts is in no state of the episode. This covers the unselected
landing view and every list or lookup state. -/
theorem unbound_not_inEpisode {s : State} (h : Workspace.bound E.facts s = false) :
    ¬ InEpisode E s := fun hs => by
  rw [episode_bound E hs] at h
  contradiction

/-- New specification for owner review: a state without a selected patient is
in no episode at all, whatever the spec, program, facts and user. -/
theorem unselected_not_inEpisode {s : State}
    (h : (s.patientContext?.bind (·.patient?)).isSome = false) (E : BoundEpisode) :
    ¬ InEpisode E s := fun hs => by
  rw [bound_patient E.facts s (episode_bound E hs)] at h
  contradiction

/-- New specification for owner review: in every state of an episode the API
view is the interpreter's view of the chart. -/
theorem episode_runView {s : State} (h : InEpisode E s) :
    runView ⟨E.spec, E.prog, E.facts, E.user, s⟩ = E.toEpisode.screen s := by
  simp only [runView, episode_bound E h, Bool.not_true, Bool.and_false, Bool.false_eq_true,
    ↓reduceIte, Episode.screen]

#print axioms InEpisode.hydrates
#print axioms bound_patient
#print axioms workspace_core
#print axioms workspace_first
#print axioms navigation_leaves
#print axioms handled_or_core
#print axioms episode_step
#print axioms first_step
#print axioms episode_context
#print axioms episode_bound
#print axioms unbound_not_inEpisode
#print axioms unselected_not_inEpisode
#print axioms episode_runView

end Ehr.Runtime
