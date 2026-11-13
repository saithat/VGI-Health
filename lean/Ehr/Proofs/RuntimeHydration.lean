import Ehr.Proofs.RuntimeSession
import Ehr.Proofs.RuntimeProperties

/-! The API call that hydrates a patient chart. Hydration happens on the first
call after selection, and that call's event is applied to the freshly loaded
chart, which the clinician has not seen. The call therefore refuses an
acknowledgment and a commit click with `Workspace.loading`. So no commit and no
new acknowledgment comes from a hydrating call, and at every commit the
effective input is the API state itself. Every definition and theorem here is
a new specification for owner review, outside Comparator. -/

namespace Ehr.Runtime
open Ehr Props

/-- The fresh chart has no commit. -/
theorem chart_commits (ep : Episode) (first : ScreenId) : (chart ep first).commits = [] := by
  simp only [chart, Episode.start, (Proofs.goTo_safe ..).commits, Ehr.init,
    (Proofs.prefillScreen_safe ..).commits]

section Hydrating
variable (i : StepInput) (henabled : Workspace.enabled i.program = true)
  (hy : Workspace.hydrates i.spec i.program i.facts i.user i.state = true)
include henabled hy

/-- New specification for owner review: **the hydrating call refuses commits
and acknowledgments.** For a program with patient selection, if the call
hydrates the chart and its event is an acknowledgment or a click on a commit
button of the hydrated chart's screen (`loadingEvent`), and is not workspace
navigation, the API returns the hydrated chart and `blocked "Chart is
loading"`. -/
theorem hydrating_refuses
    (hn : workspaceEvent i.program i.facts (inputState i) i.event = false)
    (hl : loadingEvent i.program (inputState i) i.event = true) :
    runStep i = { state := inputState i, result := Workspace.loading } := by
  have hin : inputState i = Workspace.bind i.spec i.program i.facts i.user i.state := by
    simp only [inputState, henabled, ↓reduceIte]
  have hunbound : Workspace.bound i.facts i.state = false := by
    simp only [Workspace.hydrates, Bool.and_eq_true, Bool.not_eq_true'] at hy
    exact hy.1
  rw [hin] at hn hl ⊢
  simp only [runStep, henabled, hunbound, Bool.not_false, Bool.and_self, ↓reduceIte,
    Option.getD_none, workspace_first i.spec i.program i.facts i.user i.state i.event hy hn, hl]

/-- New specification for owner review: the hydrating call refuses every
acknowledgment. -/
theorem hydrating_ack (a : AlertId) (he : i.event = .ack a) :
    runStep i = { state := inputState i, result := Workspace.loading } :=
  hydrating_refuses i henabled hy (by rw [he]; rfl) (by rw [he]; rfl)

/-- New specification for owner review: loading refuses every reconciliation
control, including a valid decision for a restored tagged line. -/
theorem hydrating_reconcile (n : Nat) (v : Value) (he : i.event = .enter (reconcileComp n) v) :
    runStep i = { state := inputState i, result := Workspace.loading } := by
  have hn : reconcileComp n ≠ "workspace.search" := by
    intro h
    have k := congrArg (fun id : String => "reconcile.line|".toList.isPrefixOf id.toList) h
    simp [reconcileComp, String.toList_append] at k
  apply hydrating_refuses i henabled hy
  · rw [he]
    cases v <;> simp [workspaceEvent, hn]
  · rw [he]
    simp [loadingEvent, reconcileReservedId, reconcileComp, String.toList_append]

/-- New specification for owner review: on the hydrating call, every other
event that is not workspace navigation is one human interpreter step on the
hydrated chart, as before. -/
theorem hydrating_applies
    (hn : workspaceEvent i.program i.facts (inputState i) i.event = false)
    (hl : loadingEvent i.program (inputState i) i.event = false) :
    runStep i =
      { state := (step i.spec i.program i.facts i.user .human (inputState i) i.event).1,
        result := (step i.spec i.program i.facts i.user .human (inputState i) i.event).2 } := by
  have hin : inputState i = Workspace.bind i.spec i.program i.facts i.user i.state := by
    simp only [inputState, henabled, ↓reduceIte]
  have hunbound : Workspace.bound i.facts i.state = false := by
    simp only [Workspace.hydrates, Bool.and_eq_true, Bool.not_eq_true'] at hy
    exact hy.1
  rw [hin] at hn hl ⊢
  simp only [runStep, henabled, hunbound, Bool.not_false, Bool.and_self, ↓reduceIte,
    Option.getD_none, workspace_first i.spec i.program i.facts i.user i.state i.event hy hn, hl,
    Bool.false_eq_true]

/-- New specification for owner review: **a hydrating call adds no commit
and no acknowledgment**, for every event. The returned state has no commit,
and each of its acknowledgments is one stored for the selected patient, which
hydration restored. -/
theorem hydrating_adds_nothing :
    (runStep i).state.commits = [] ∧
    ∀ a ∈ (runStep i).state.acked, a ∈ (pending i.state).acked := by
  obtain ⟨id, first, c, h⟩ := hydrates_hydrated _ _ _ _ _ hy
  have hc : (Workspace.bind i.spec i.program i.facts i.user i.state).commits = [] := by
    rw [h.eq]
    exact chart_commits _ first
  have ha : (Workspace.bind i.spec i.program i.facts i.user i.state).acked =
      (pending i.state).acked := by
    rw [h.eq, h.pending]
    rfl
  cases call_shape i henabled with
  | handled hs =>
    obtain ⟨_, _, hs⟩ := hs
    rw [hs]
    exact ⟨hc, fun a hm => ha ▸ hm⟩
  | query q _ hs =>
    rw [hs]
    exact ⟨hc, fun a hm => ha ▸ hm⟩
  | leave ctx _ _ hs =>
    rw [hs]
    exact ⟨rfl, fun a hm => nomatch hm⟩
  | core _ hload hs =>
    have hat := Check.onlyHumanCommitsAndAcks_at ⟨i.spec, i.program, i.facts, i.user⟩
      (Workspace.bind i.spec i.program i.facts i.user i.state) .human i.event
    have hl := hload hy
    rw [hs]
    constructor
    · apply List.eq_nil_iff_forall_not_mem.mpr
      intro cm hm
      obtain ⟨_, cid, he, comp, hcomp, hid, hk⟩ := hat.1 cm ⟨by rw [hc]; nofun, hm⟩
      rw [he] at hl
      have ht : Workspace.commitClick i.program
          (Workspace.bind i.spec i.program i.facts i.user i.state) cid = true := by
        simp only [Workspace.commitClick, List.any_eq_true]
        exact ⟨comp, hcomp, by simp [hid, hk]⟩
      rw [loadingEvent, ht] at hl
      contradiction
    · have hsame : (step i.spec i.program i.facts i.user .human
          (Workspace.bind i.spec i.program i.facts i.user i.state) i.event).1.acked =
          (Workspace.bind i.spec i.program i.facts i.user i.state).acked := by
        refine Classical.byContradiction fun hne => ?_
        obtain ⟨_, a, he⟩ := hat.2 hne
        rw [he] at hl
        contradiction
      intro a hm
      rw [hsame, ha] at hm
      exact hm

end Hydrating

/-- New specification for owner review: **the acknowledgments of a hydrated
chart are exactly those stored for the patient.** Acknowledgments are keyed by
alert and alert key, and the key carries the fact the alert fired on. So an
alert whose fact changed while the chart was closed has a new key, which is
not in the hydrated chart's acknowledgments (`start_unacked`), and it
interrupts again. -/
theorem start_acked (E : BoundEpisode) (hyd : E.Hydrates) :
    E.start.acked = (pending E.opened).acked := by
  obtain ⟨first, c, h⟩ := start_eq E hyd
  rw [h]
  rfl

/-- New specification for owner review: an alert key that was not
acknowledged before the clinician left the chart is not acknowledged in the
hydrated chart. With `EpisodeInterruptiveHandled`, no commit of that alert's
commit happens while the key fires and is not acknowledged in this episode. -/
theorem start_unacked (E : BoundEpisode) (hyd : E.Hydrates) (pair : AlertId × String)
    (h : pair ∉ (pending E.opened).acked) : pair ∉ E.start.acked := by
  rw [start_acked E hyd]
  exact h

/-- New specification for owner review: a hydrated chart has no commit and
no popup. Signed work is not restored; it is in the record. -/
theorem start_fresh (E : BoundEpisode) (hyd : E.Hydrates) :
    E.start.commits = [] ∧ E.start.popup? = none := by
  obtain ⟨first, c, h⟩ := start_eq E hyd
  rw [h]
  exact ⟨chart_commits _ first, chart_popup _ first⟩

/-- New specification for owner review: **at a commit the effective input is
the API state.** If the state an API call returns holds a commit, the call did
not hydrate a chart. So the commit theorems stated at `inputState` are about
the state the client sent, which the client could paint before the event.
Holds for every program. -/
theorem commit_input (i : StepInput) (c : CommitId) (hafter : c ∈ (runStep i).state.commits) :
    inputState i = i.state := by
  cases henabled : Workspace.enabled i.program
  · simp only [inputState, henabled, Bool.false_eq_true, ↓reduceIte]
  · simp only [inputState, henabled, ↓reduceIte]
    rcases bind_hydrates i.spec i.program i.facts i.user i.state with h | ⟨id, first, ctx, h⟩
    · exact h
    · rw [(hydrating_adds_nothing i henabled h.hydrates).1] at hafter
      contradiction

#print axioms chart_commits
#print axioms hydrating_reconcile
#print axioms hydrating_refuses
#print axioms hydrating_ack
#print axioms hydrating_applies
#print axioms hydrating_adds_nothing
#print axioms start_acked
#print axioms start_unacked
#print axioms start_fresh
#print axioms commit_input
end Ehr.Runtime
