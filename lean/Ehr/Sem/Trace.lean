import Ehr.Sem.Bridge

/-! Layout-independent temporal obligations remain about interpreter effects.
Event-count bounds below are deliberately separate from physical view costs. -/
namespace Ehr.Sem
open Ehr Render

/-- Exact finite human event cost to a resulting state. -/
def HumanTrace (ep : Props.Episode) (s t : State) (steps : Nat) : Prop :=
  ∃ events : List Event, events.length = steps ∧ t = ep.afterHuman s events

/-- Completion has an explicit finite event bound for each reachable obligation.
This does not invent a uniform bound or assert physical action exposure. -/
def Completable (spec : Spec) (canonical prog : Program) : Prop :=
  ∀ facts user, user.role = prog.role → Props.RecordAllowsScans spec facts →
    let ep : Props.Episode := ⟨spec, prog, facts, user⟩
    Props.Always ep fun s => ∀ c ∈ Props.requiredCommitsFor spec canonical prog facts user,
      c ∉ s.commits → ∃ steps t, HumanTrace ep s t steps ∧ c ∈ t.commits

theorem completable_iff (spec canonical prog) :
    Completable spec canonical prog ↔ Props.Completable spec canonical prog := by
  constructor
  · intro h facts user role scans s reachable c required missing
    obtain ⟨steps, t, ⟨events, _, rfl⟩, done⟩ := h facts user role scans s reachable c required missing
    exact ⟨events, done⟩
  · intro h facts user role scans
    dsimp only
    intro s reachable c required missing
    obtain ⟨events, done⟩ := h facts user role scans s reachable c required missing
    exact ⟨events.length, _, ⟨events, rfl, rfl⟩, done⟩

/-- Clinical trace obligations plus exact applicable review content in every
reachable, nonmodal signing view. Uses the abstract exposure moment. -/
def ReviewsBeforeCommit (spec : Spec) (prog : Program) : Prop :=
  ∀ facts user, user.role = prog.role →
    Props.CommitReviewsMet ⟨spec, prog, facts, user⟩ ∧
    ∀ disp, Props.Always ⟨spec, prog, facts, user⟩ fun s =>
      let cx : Ctx := { sp := spec, prog, facts, disp, user, s }
      (rendered cx).modal = none → Reviews (meaning (rendered cx)) exposed
        ((uiRequiredReviews cx).map fun r => (r.info, uiRows cx r.info))

theorem reviewsBeforeCommit_of_widget (spec prog) (h : Props.ReviewsBeforeCommit spec prog) :
    ReviewsBeforeCommit spec prog := by
  intro facts user role
  refine ⟨(h facts user role).1, ?_⟩
  intro disp s _
  dsimp only
  intro nonmodal
  exact D2_semantic _ nonmodal

#print axioms completable_iff
#print axioms reviewsBeforeCommit_of_widget
end Ehr.Sem
