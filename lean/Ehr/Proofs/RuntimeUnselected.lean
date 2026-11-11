import Ehr.Proofs.RuntimeGlobal

/-! No patient data before a patient is selected. For a program with patient
selection, the API view of a state without a selected patient shows only
workspace navigation and lookup. Every definition and theorem here is a new
specification for owner review, outside Comparator. -/

namespace Ehr.Runtime
open Ehr

/-- New specification for owner review: no patient is selected in the state.
This is the landing view, an activity list and Patient Lookup. -/
def Unselected (s : State) : Prop := s.patientContext?.bind (·.patient?) = none

instance (s : State) : Decidable (Unselected s) := by
  unfold Unselected; infer_instance

/-- A state without a selected patient is bound to no patient's facts. -/
theorem unselected_unbound (f : Facts) {s : State} (h : Unselected s) :
    Workspace.bound f s = false := by
  cases hc : s.patientContext? with
  | none => simp only [Workspace.bound, hc]
  | some c =>
    have hp : c.patient? = none := by simpa [Unselected, hc] using h
    simp [Workspace.bound, hc, hp]

/-- New specification for owner review: **the view shows no patient data.**
"Patient data" in `runView` is made precise by four clauses.

* `noItems`: the view has no item, so no chart component, field value, info
  panel, review or alert is shown.
* `noBlocked`: the view reports no blocked commit, so no guard result for a
  patient is shown.
* `controls`: every enabled control is one that `Workspace.action?` resolves:
  an activity list, Patient Lookup, or opening a patient from the day list or
  the lookup results.
* `directoryOnly`: the whole view is a function of the program, the screen
  name, the patient-selection context (activity and lookup query) and the
  facts' patient directory. No other part of the facts (the selected patient's
  clinical facts, receipts, alerts) and no other part of the state (captures,
  acknowledgments, commits, receipts, popup, stored drafts, critical-result
  fields) can change it, and neither can the spec or the user.

The directory itself (names, record numbers and list rows of the day's
patients) is workspace navigation and lookup data, not chart data. -/
structure WorkspaceOnly (i : ViewInput) : Prop where
  /-- No item is shown. -/
  noItems : (runView i).items = []
  /-- No blocked commit is reported. -/
  noBlocked : (runView i).blocked = []
  /-- Every enabled control is workspace navigation or opens a patient. -/
  controls : ∀ id ∈ (runView i).enabled,
    (Workspace.action? i.program i.facts i.state id).isSome = true
  /-- The view depends only on the program, the screen name, the selection
  context and the patient directory. -/
  directoryOnly : ∀ (sp : Spec) (f : Facts) (u : User) (s : State),
    f.patientDirectory? = i.facts.patientDirectory? →
    s.patientContext? = i.state.patientContext? → s.screen = i.state.screen →
    runView ⟨sp, i.program, f, u, s⟩ = runView i

/-- The view of a chart that is not bound has no item and no blocked commit.
This also covers a selected patient whose chart is not yet hydrated. -/
theorem unbound_view (i : ViewInput) (henabled : Workspace.enabled i.program = true)
    (hunbound : Workspace.bound i.facts i.state = false) :
    (runView i).items = [] ∧ (runView i).blocked = [] := by
  simp only [runView, henabled, hunbound, Bool.not_false, Bool.and_self, ↓reduceIte, and_self]

/-- New specification for owner review: **no patient data is shown before a
patient is selected.** For a program with patient selection, the API view of
every state without a selected patient is `WorkspaceOnly`, for any spec,
facts and user. The premise is on the state alone; by `reachable_settled`
such a state, when reached through the API, also holds no capture,
acknowledgment, commit or popup. -/
theorem unselected_view (i : ViewInput) (henabled : Workspace.enabled i.program = true)
    (h : Unselected i.state) : WorkspaceOnly i := by
  have hunbound := unselected_unbound i.facts h
  refine ⟨(unbound_view i henabled hunbound).1, (unbound_view i henabled hunbound).2, ?_, ?_⟩
  · intro id hid
    simp only [runView, henabled, hunbound, Bool.not_false, Bool.and_self, ↓reduceIte,
      List.mem_map] at hid
    obtain ⟨c, hc, rfl⟩ := hid
    have hnone : (i.state.patientContext?.bind (·.patient?)).isNone = true := by
      rw [h]
      rfl
    simp only [Workspace.action?, hnone, ↓reduceIte, Option.isSome_map, List.find?_isSome]
    exact ⟨c, hc, beq_self_eq_true _⟩
  · intro sp f u s hdir hctx hscreen
    have hs : Unselected s := by
      unfold Unselected
      rw [hctx]
      exact h
    simp only [runView, henabled, hunbound, unselected_unbound f hs, Bool.not_false,
      Bool.and_self, ↓reduceIte, Workspace.activity, Workspace.activities, Workspace.navigation,
      Workspace.openControls, Workspace.rows, Workspace.patient?, hdir, hctx, hscreen]

/-- New specification for owner review: the deployed initial state of a
program with patient selection has no selected patient. -/
theorem runInit_unselected (i : InitInput) (henabled : Workspace.enabled i.program = true) :
    Unselected (runInit i) := by
  simp only [runInit, henabled, ↓reduceIte]
  rfl

#print axioms unselected_unbound
#print axioms unbound_view
#print axioms unselected_view
#print axioms runInit_unselected
end Ehr.Runtime
