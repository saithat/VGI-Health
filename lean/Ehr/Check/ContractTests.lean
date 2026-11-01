import Ehr.Check.ContractSound
import Ehr.Core.Tests

namespace Ehr.Check.Tests
open Ehr Ehr.Check Ehr.CoreTests Ehr.Examples.Tiny

-- A sample record meeting evidence contracts must not establish total completion
-- over records with missing evidence, expired clocks or absent payloads.
#guard (additionalCompletionIssue EventWindow.tinySpec program "signOrders").isSome
#guard (additionalCompletionIssue ValueValidation.tinySpec ValueValidation.tinyProgram "signOrders").isSome
#guard (additionalCompletionIssue OrderExpiry.tinySpec program "signOrders").isSome
#guard (additionalCompletionIssue StructuredDisplay.tinySpec StructuredDisplay.tinyProgram "signOrders").isSome

#guard clinicalUsesCapture (.and (.factEquals .setting "inpatient") (.not (.capturedCode "risk" 0 "low")))
#guard !clinicalUsesCapture (.ageBetween 0 17)

/-- The completion rule never suppresses an additional-contract finding. -/
theorem completeFor_additional (sp : Spec) (p : Program) (c : CommitId)
    (h : completeFor sp p c = none) : additionalCompletionIssue sp p c = none := by
  unfold completeFor completeForWithReach at h
  cases hi : additionalCompletionIssue sp p c with
  | none => rfl
  | some issue => simp [hi] at h

#print axioms completeFor_additional
end Ehr.Check.Tests
