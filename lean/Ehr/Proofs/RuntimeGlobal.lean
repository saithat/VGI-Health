import Ehr.Proofs.RuntimeHydration
import Ehr.Proofs.RuntimeOrdinary

/-! Properties 2, 5 and 11 across workspace navigation, for programs with
patient selection run through the deployed API. The commit clauses hold in
their original (`Fixed…`) form, because no commit comes from a hydrating call.
The retention, human-entry and acknowledgment clauses hold in the *session*
form: with one patient's captures and acknowledgments read from the open chart
or from the patient's stored draft (`sessionCaptured`, `sessionAcked`). Their
original forms still fail on the Return click, which moves the chart's work
into the store; see `Ehr.Proofs.RuntimeDraftWitness`. No checker premise is
needed. Every definition and theorem here is a new specification for owner
review, outside Comparator. -/

namespace Ehr.Runtime
open Ehr Props

/-- New specification for owner review: what holds in every state a program
with patient selection reaches through the API, for any facts on any call. -/
structure Settled (sp : Spec) (s : State) : Prop where
  /-- A state that holds no hydrated chart holds no clinical work: no popup,
  capture, acknowledgment or commit. Unsigned work is in the draft store. -/
  idle : Workspace.chart? s = none →
    s.popup? = none ∧ s.captured = [] ∧ s.acked = [] ∧ s.commits = []
  /-- Every value for an element a human must enter is a confirmed human entry. -/
  human : Check.HumanCaptured sp s
  /-- An open popup is not acknowledged. -/
  unacked : ∀ q, s.popup? = some q → q ∉ s.acked

/-- Hydration keeps the reachable-state invariants. -/
theorem settled_bind (sp p f u s) (h : Settled sp s) :
    Settled sp (Workspace.bind sp p f u s) := by
  rcases bind_hydrates sp p f u s with hb | ⟨id, first, c, hb⟩
  · rw [hb]
    exact h
  · have hpop : (Workspace.bind sp p f u s).popup? = none := by
      rw [hb.eq]
      exact chart_popup _ first
    refine ⟨fun hn => ?_, ?_, fun q hq => ?_⟩
    · rw [hb.chart] at hn
      contradiction
    · rw [hb.eq]
      exact restore_humanCaptured (chart_humanCaptured ⟨sp, p, f, u⟩ first)
    · rw [hpop] at hq
      contradiction

/-- One API call keeps the reachable-state invariants. -/
theorem settled_step (i : StepInput) (henabled : Workspace.enabled i.program = true)
    (h : Settled i.spec i.state) : Settled i.spec (runStep i).state := by
  have hb := settled_bind i.spec i.program i.facts i.user i.state h
  cases call_shape i henabled with
  | handled hs =>
    obtain ⟨_, _, hs⟩ := hs
    rw [hs]
    exact ⟨hb.idle, hb.human, hb.unacked⟩
  | query q hq hs =>
    rw [hs]
    exact ⟨fun _ => hb.idle (chart_unselected hq), hb.human, hb.unacked⟩
  | leave ctx _ _ hs =>
    rw [hs]
    exact ⟨fun _ => ⟨rfl, rfl, rfl, rfl⟩, fun x hx => by simp [afterLeaving, Workspace.init] at hx,
      fun q hq => by simp [afterLeaving, Workspace.init] at hq⟩
  | core hbd _ hs =>
    rw [hs]
    obtain ⟨id, hid⟩ := bound_chart _ _ hbd
    refine ⟨fun hn => ?_, Check.step_humanCaptured _ _ _ _ _ _ _ hb.human,
      Check.popupUnacked_step ⟨i.spec, i.program, i.facts, i.user⟩ _ .human _ hb.unacked⟩
    rw [chart_of_context (step_context ..), hid] at hn
    contradiction

/-- New specification for owner review: the invariants hold in every state a
program with patient selection reaches through the API, with any facts on any
call. In particular the landing, list and lookup states hold no clinical work. -/
theorem reachable_settled (sp p u) (henabled : Workspace.enabled p = true) {s : State}
    (hs : Reachable sp p u s) : Settled sp s := by
  induction hs with
  | start f =>
    simp only [runInit, henabled, ↓reduceIte]
    exact ⟨fun _ => ⟨rfl, rfl, rfl, rfl⟩, fun x hx => by simp [Workspace.init] at hx,
      fun q hq => by simp [Workspace.init] at hq⟩
  | event f e _ ih => exact settled_step ⟨sp, p, f, u, _, e⟩ henabled ih
  | wait d _ ih => exact ⟨ih.idle, ih.human, ih.unacked⟩

section Call
variable (i : StepInput) (henabled : Workspace.enabled i.program = true)
  (hset : Settled i.spec i.state)
include henabled hset

/-- New specification for owner review: an open popup stays open until it is
acknowledged, on every API call from a reachable state, also across workspace
navigation (which is refused while a popup is open). -/
theorem popup_kept : ∀ q, i.state.popup? = some q →
    (runStep i).state.popup? = some q ∨ q ∈ (runStep i).state.acked := by
  intro q hq
  have hb : Workspace.bind i.spec i.program i.facts i.user i.state = i.state := by
    rcases bind_hydrates i.spec i.program i.facts i.user i.state with hb | ⟨id, first, c, hb⟩
    · exact hb
    · rw [(hset.idle hb.unheld).1] at hq
      contradiction
  cases call_shape i henabled with
  | handled hs =>
    obtain ⟨_, _, hs⟩ := hs
    rw [hs, hb]
    exact Or.inl hq
  | query q' _ hs =>
    rw [hs, hb]
    exact Or.inl hq
  | leave ctx _ hp hs =>
    rw [hb, hq] at hp
    contradiction
  | core _ _ hs =>
    rw [hs, hb]
    exact (Check.interruptsOnce_at ⟨i.spec, i.program, i.facts, i.user⟩ _ .human _).2 q hq

/-- New specification for owner review: **a new human-required value comes
from an entry event, across workspace navigation.** On every API call from a
reachable state, a value for an element a human must enter that is new in a
patient's session captures comes from an entry event. Hydration only moves
stored entries back into the chart. -/
theorem session_humanEntries (pid : String) :
    ∀ x ∈ sessionCaptured pid (runStep i).state, x ∉ sessionCaptured pid i.state →
      ∀ el, i.spec.element? x.element = some el → HumanMustEnter el →
        ∃ cid v, i.event = .enter cid v := by
  intro x hx hnew el hel hh
  have hsb := settled_bind i.spec i.program i.facts i.user i.state hset
  have fromBind : x ∈ sessionCaptured pid
      (Workspace.bind i.spec i.program i.facts i.user i.state) → False := fun hxb =>
    ((session_bind i.spec i.program i.facts i.user i.state pid).2.2 x hxb).elim hnew
      (fun ⟨first, hc⟩ => chart_noHuman ⟨i.spec, i.program, i.facts, i.user⟩ first x hc el hel hh)
  cases call_shape i henabled with
  | handled hs =>
    rw [(session_handled pid hs).2] at hx
    exact (fromBind hx).elim
  | query q hq hs =>
    rw [(session_query pid q hq hs).2] at hx
    exact (fromBind hx).elim
  | leave ctx hc _ hs =>
    rw [(session_leave pid ctx hc hs).2] at hx
    exact (fromBind hx).elim
  | core _ _ hs =>
    obtain ⟨hch, hd⟩ := session_core pid i.event hs
    by_cases hc : Workspace.chart? (Workspace.bind i.spec i.program i.facts i.user i.state) = some pid
    · rw [(session_open (hch.trans hc)).2, hs] at hx
      by_cases he : ∃ cid v, i.event = .enter cid v
      · exact he
      · have hold := Check.step_noNewHuman _ _ _ _ .human _ _ hsb.human (fun hn => he hn.2)
          x hx el hel hh
        exact (fromBind (by rw [(session_open hc).2]; exact hold)).elim
    · rw [(session_closed (hch ▸ hc)).2, hd] at hx
      exact (fromBind (by rw [(session_closed hc).2]; exact hx)).elim

end Call

/-- New specification for owner review: a commit comes from a click on a
commit button of the screen in the API state, for every program and call. -/
theorem commit_byClick (i : StepInput) (c : CommitId)
    (hnew : c ∉ i.state.commits) (hafter : c ∈ (runStep i).state.commits) :
    ∃ cid, i.event = .click cid ∧
      ∃ comp ∈ i.program.compsOf i.state.screen, comp.id = cid ∧ comp.kind = .button (.commit c) := by
  obtain ⟨hn, ha⟩ := commit_core i c hnew hafter
  have h := ((Check.onlyHumanCommitsAndAcks_at ⟨i.spec, i.program, i.facts, i.user⟩
    (inputState i) .human i.event).1 c ⟨hn, ha⟩).2
  rw [commit_input i c hafter] at h
  exact h

/-- New specification for owner review: property 2's retention clause across
workspace navigation, in the session form. The macro condition is read at the
effective input, which is the API state unless the call hydrates. -/
def SessionEnteredOnce (ep : Episode) : Prop :=
  FixedEveryStep ep fun s e s' =>
    (∀ cid v, e ≠ .enter cid v) →
    (∀ cid, e = .click cid →
      clickedMacro? ep.spec ep.prog ep.facts
        (inputState ⟨ep.spec, ep.prog, ep.facts, ep.user, s, e⟩) cid = none ∨
        (inputState ⟨ep.spec, ep.prog, ep.facts, ep.user, s, e⟩).popup?.isSome) →
    ∀ pid, ∀ x ∈ sessionCaptured pid s, x.confirmed = true →
      Workspace.restorable ep.spec ep.user x = true → x ∈ sessionCaptured pid s'

/-- New specification for owner review: property 5's per-step human-entry
clause across workspace navigation, in the session form. -/
def SessionHumanEntries (ep : Episode) : Prop :=
  FixedEveryStep ep fun s e s' => ∀ pid, ∀ x ∈ sessionCaptured pid s', x ∉ sessionCaptured pid s →
    ∀ el, ep.spec.element? x.element = some el → HumanMustEnter el → ∃ cid v, e = .enter cid v

/-- New specification for owner review: the commit clause of property 5's
`OnlyHumanCommitsAndAcks`, in its original runtime form. -/
def FixedCommitsByClick (ep : Episode) : Prop :=
  FixedEveryStep ep fun s e s' => ∀ c, Commits s s' c → ∃ cid, e = .click cid ∧
    ∃ comp ∈ ep.prog.compsOf s.screen, comp.id = cid ∧ comp.kind = .button (.commit c)

/-- New specification for owner review: the acknowledgment clause of property
5's `OnlyHumanCommitsAndAcks` across workspace navigation, in the session form. -/
def SessionAcksByAck (ep : Episode) : Prop :=
  FixedEveryStep ep fun s e s' => ∀ pid, sessionAcked pid s' ≠ sessionAcked pid s → ∃ a, e = .ack a

/-- New specification for owner review: property 11 across workspace
navigation. Persistence of acknowledgments is in the session form; the two
popup clauses are the original ones. -/
def SessionInterruptsOnce (ep : Episode) : Prop :=
  FixedEveryStep ep (fun s _ s' =>
    (∀ pid, ∀ a ∈ sessionAcked pid s, a ∈ sessionAcked pid s') ∧
    (∀ q, s.popup? = some q → s'.popup? = some q ∨ q ∈ s'.acked)) ∧
  FixedAlways ep fun s => ∀ q, s.popup? = some q → q ∉ s.acked

/-- New specification for owner review: the clauses of properties 2, 5 and
11 that hold across workspace navigation for a program with patient selection. -/
structure SelectionGlobal (ep : Episode) : Prop where
  /-- Property 2, commit clause, original runtime form. -/
  commitCapturesAll : FixedCommitCapturesAll ep
  /-- Property 2, retention clause, session form. -/
  enteredOnce : SessionEnteredOnce ep
  /-- Property 5, human-entry clause for the start, original runtime form. -/
  noneAtStart : ∀ x ∈ (runInit ⟨ep.spec, ep.prog, ep.facts, ep.user⟩).captured, ∀ el,
    ep.spec.element? x.element = some el → ¬ HumanMustEnter el
  /-- Property 5, per-step human-entry clause, session form. -/
  humanEntries : SessionHumanEntries ep
  /-- Property 5, commit clause, original runtime form. -/
  commitsByClick : FixedCommitsByClick ep
  /-- Property 5, acknowledgment clause, session form. -/
  acksByAck : SessionAcksByAck ep
  /-- Property 5, cosign clause, original runtime form. -/
  cosignIsSecondUser : FixedCosignIsSecondUser ep
  /-- Property 11: persistence in the session form, popup clauses original. -/
  interruptsOnce : SessionInterruptsOnce ep

/-- New specification for owner review: **properties 2, 5 and 11 across
workspace navigation.** For every program with patient selection, any facts
and any user, all fixed-facts API runs satisfy `SelectionGlobal`. No checker
acceptance is needed: these clauses hold for the interpreter from every state.
The per-call theorems behind it (`session_acks`, `session_captures`,
`session_humanEntries`, `popup_kept`, `commit_input`) also cover facts the
host replaces between calls. -/
theorem selection_global (ep : Episode) (henabled : Workspace.enabled ep.prog = true) :
    SelectionGlobal ep := by
  have settled {s : State} (hs : FixedReachable ep s) : Settled ep.spec s :=
    reachable_settled ep.spec ep.prog ep.user henabled (fixed_reachable hs)
  have input (s : State) (e : Event) (c : CommitId) (hc : Commits s (next ep s e) c) :
      inputState ⟨ep.spec, ep.prog, ep.facts, ep.user, s, e⟩ = s :=
    commit_input ⟨ep.spec, ep.prog, ep.facts, ep.user, s, e⟩ c hc.2
  refine {
    commitCapturesAll := fun s _ e c hc rq hrq hrc => ?_
    enteredOnce := fun s _ e hentry hmacro pid =>
      session_captures ⟨ep.spec, ep.prog, ep.facts, ep.user, s, e⟩ henabled pid hentry hmacro
    noneAtStart := fun x hx => by simp [runInit, henabled, Workspace.init] at hx
    humanEntries := fun s hs e pid =>
      session_humanEntries ⟨ep.spec, ep.prog, ep.facts, ep.user, s, e⟩ henabled (settled hs) pid
    commitsByClick := fun s _ e c hc =>
      commit_byClick ⟨ep.spec, ep.prog, ep.facts, ep.user, s, e⟩ c hc.1 hc.2
    acksByAck := fun s _ e pid =>
      (session_acks ⟨ep.spec, ep.prog, ep.facts, ep.user, s, e⟩ henabled pid).2
    cosignIsSecondUser := fun s _ e c hc rq hrq hrc el hel hk hw hp => ?_
    interruptsOnce := ⟨fun s hs e =>
      ⟨fun pid => (session_acks ⟨ep.spec, ep.prog, ep.facts, ep.user, s, e⟩ henabled pid).1,
       popup_kept ⟨ep.spec, ep.prog, ep.facts, ep.user, s, e⟩ henabled (settled hs)⟩,
      fun s hs => (settled hs).unacked⟩ }
  · have h := commit_entries ⟨ep.spec, ep.prog, ep.facts, ep.user, s, e⟩ c hc.1 hc.2 rq hrq hrc
    rw [input s e c hc] at h
    exact h
  · have hin := input s e c hc
    have h := T3_cosign_distinct ⟨ep.spec, ep.prog, ep.facts, ep.user, s, e⟩ c hc.1 hc.2 rq hrq hrc
      (by simpa using hp) (by rw [hin]; exact hw) el hel hk
    rw [hin] at h
    exact h

#print axioms settled_bind
#print axioms settled_step
#print axioms reachable_settled
#print axioms popup_kept
#print axioms session_humanEntries
#print axioms commit_byClick
#print axioms selection_global
end Ehr.Runtime
