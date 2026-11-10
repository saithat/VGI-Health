import Ehr.Sim.Workflow.Types
namespace Ehr.Sim.Workflow

def accepted (p : WorkflowPlan) : Bool := !p.owner.isEmpty &&
  (p.delegateTo?.isNone || (p.delegateAccepted && p.delegateTo?.any (! ·.isEmpty)))

def beforePhases (p : WorkflowPlan) : List String :=
  ["claim"] ++ (if p.delegateTo?.isSome then ["offer-delegation", "accept-delegation", "delegate-review", "return-to-owner"] else []) ++
  match p.kind with
  | .refill => ["review-prescription", "review-monitoring"]
  | .alert => ["inspect-alert", "review-alternatives"]
  | .advice => ["read-advice", "review-chart"]
  | .result => ["review-result", "synthesize-chart"]
  | .call => ["identify-caller", "assess-call"]
  | .consult => ["review-consult", "synthesize-chart"]
  | .chart => ["synthesize-chart", "author-note"]
  | .pharmacy => ["read-clarification", "reconcile-prescription"]
  | .dispensing => ["verify-prescription", "prepare-dispense"]
  | .reconciliation => ["retrieve-external-record", "reconcile-discrepancies"]
  | .prescription => ["review-existing-rx", "amend-or-cancel"]
  | .coordination => ["identify-care-team", "coordinate-plan"]

def afterPhases (p : WorkflowPlan) : List String :=
  (match p.kind with
  | .refill | .pharmacy | .prescription => ["pharmacy-response", "notify-patient"]
  | .result => ["follow-through", "notify-patient"]
  | .dispensing => ["record-dispense", "notify-care-team"]
  | _ => ["document-response", "notify-care-team"]) ++ ["close"]

/-- The clinical decision remains the real guarded UI episode. No workflow
phase can authorize it or close a failed clinical task. -/
def finish (p : WorkflowPlan) (clinicalComplete : Bool) (decision : String := "review") : WorkflowReport :=
  let ok := accepted p && clinicalComplete
  { phases := if !accepted p then ["claim", "delegation-pending"] else
      beforePhases p ++ ["decision:" ++ decision, if clinicalComplete then "guarded-clinical-complete" else "clinical-incomplete"] ++
      (if ok then afterPhases p else [])
    owner := p.owner
    clinicalComplete := clinicalComplete
    closed := ok
    activeMs := if accepted p then (beforePhases p |>.length) * p.phaseMs +
      (if ok then (afterPhases p |>.length) * p.phaseMs else 0) else 0
    waitingMs := if ok then p.responseWaitMs else 0 }

theorem closed_requires_clinical (p : WorkflowPlan) (done : Bool) (h : (finish p done).closed = true) :
    done = true := by
  have hh : accepted p = true ∧ done = true := by simpa [finish] using h
  exact hh.2

theorem closed_requires_owner (p : WorkflowPlan) (done : Bool) (h : (finish p done).closed = true) :
    accepted p = true := by
  have hh : accepted p = true ∧ done = true := by simpa [finish] using h
  exact hh.1

#print axioms closed_requires_clinical
#print axioms closed_requires_owner
end Ehr.Sim.Workflow
