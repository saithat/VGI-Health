import Ehr.Check.Sound

namespace Ehr.Check
open Ehr Ehr.Props

/-- A passive alert for a workflow with no task in this program. -/
def unusedWorkflowSpec : Spec :=
  { emptySpec with
    commits := [{ id := "unused", label := "Optional task", roles := [.physician] }]
    alerts := [{
      id := "optionalReminder", label := "Reminder", cond := .careGap,
      tier := .passive, commit := "unused", screens := ["optionalWorkflow"] }]
    design := { emptySpec.design with catalog := ["banner", "alert"] } }


/-- The reference has an extra, unreachable workflow screen with no commits. -/
def unusedWorkflowCanonical : Program :=
  { emptyProgram with screens := emptyProgram.screens ++
      [{ id := "optional", title := "Optional", workflow := "optionalWorkflow",
         components := [{ id := "optional.banner", kind := .banner },
           { id := "optional.reminder", kind := .alert "optionalReminder" false }] }] }

/-- With no tasks, the candidate genuinely satisfies all thirteen properties.
The checker accepts it when compared with a reference having the same workflows. -/
theorem unusedWorkflow_self_satisfies :
    Satisfies unusedWorkflowSpec none emptyProgram emptyProgram :=
  satisfies_of_checked_completable _ _ _ _ (by decide) (by
    intro facts user _ _ s _ c hc
    simp [requiredCommitsFor, requiredCommits, presetScreen, Program.presetOwner, commitButtons, emptyProgram] at hc)

/-- Removing the unused reference workflow changes no semantic obligation:
there are no required commits and no requested popups. -/
theorem unusedWorkflow_satisfies :
    Satisfies unusedWorkflowSpec none unusedWorkflowCanonical emptyProgram := by
  obtain ⟨wf, cap, writes, reviews, human, _, units, budget, alerts, falseAlarms, once, tiers, nav⟩ :=
    unusedWorkflow_self_satisfies
  refine ⟨⟨wf.1, wf.2.1, wf.2.2.1, wf.2.2.2.1, ?_, wf.2.2.2.2.2⟩,
    cap, writes, reviews, human, ?_, units, ⟨?_, budget.2⟩, alerts, falseAlarms, once, tiers, nav⟩
  · intro c hc
    simp [requiredCommitsFor, requiredCommits, presetScreen, Program.presetOwner, commitButtons, unusedWorkflowCanonical, emptyProgram] at hc
  · intro facts user _ _ s _ c hc
    simp [requiredCommitsFor, requiredCommits, presetScreen, Program.presetOwner, commitButtons, unusedWorkflowCanonical, emptyProgram] at hc
  · intro rc rp _ _
    have zero (rs : List ScreenId) : popupRequestCount emptyProgram rs = 0 := by
      by_cases h : "home" ∈ rs <;> simp [popupRequestCount, emptyProgram, h]
    rw [zero]
    exact Nat.zero_le _

/-- The workflow-retention rule rejects this semantically safe program.
Thus a failed conservative rule plus a replayable navigation path is insufficient
for the BRIEF's full T7 claim of a named semantic violation. -/
theorem unusedWorkflow_rejected :
    check unusedWorkflowSpec none unusedWorkflowCanonical emptyProgram ≠ .ok := by decide

/-- Full semantic rejection soundness is false for the present conservative
checker. Keep this explicit rather than weakening a property or safety rule. -/
theorem T7_semantic_rejection_false :
    ¬ (∀ sp prev can p, check sp prev can p ≠ .ok → ¬ Satisfies sp prev can p) := by
  intro h
  exact h _ _ _ _ unusedWorkflow_rejected unusedWorkflow_satisfies

#print axioms unusedWorkflow_satisfies
#print axioms T7_semantic_rejection_false
end Ehr.Check
