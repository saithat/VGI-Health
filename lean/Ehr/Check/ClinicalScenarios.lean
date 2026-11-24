import Ehr.Check.LandmarkEncounters
import Ehr.Check.ReviewProbes
import Ehr.Check.ServiceEncounters

namespace Ehr.Check.ReviewTrace
open Ehr Ehr.Props EntryWitness

/-- New specification for owner review. Applicable completion, review and
receipt contracts of the clinical release schema and canonical workload. -/
def clinicalCases (sp : Spec) (canonical p : Program) : List Case := Id.run do
  unless ["v1", "v2", "v3"].contains sp.version && (sp.element? "claimDiagnosis").isSome do return []
  -- A general completion counterexample may supply its own single-commit
  -- comparison program. The suite binds a clinical release persona canonical.
  let anchors := commitButtons canonical
  unless anchors.contains "signOrders" || anchors.contains "administerMed" do return []
  let persona := canonical.presetOwner
  let boundPersona := ["P1", "P2", "P3", "P4", "P5"].contains persona
  let contract := if boundPersona then canonical else {canonical with screens := canonical.screens.filter (presetScreen p.presetOwner)}
  let cms := (commitButtons contract).eraseDups
  let workflows := contract.screens.map (·.workflow)
  return cms.flatMap (fun cm => reviewCases sp p cm ++ alertCases sp p workflows cm ++ correctionCases sp p cm) ++
    (if cms.contains "signOrders" then receiptCases sp p ++ curesCases sp p ++ [changedAllergy sp p, prescriptionDetails sp p, incompleteLine sp p, automationCase sp p] else []) ++
    (if cms.contains "ackResult" && (sp.alert? "criticalResult").isSome then criticalCases sp p else []) ++
    (if cms.contains "approveRefill" then refillCases sp p else []) ++
    serviceCases sp p ++ landmarkCases sp p (cms.contains "administerMed") ++ [resetCase sp p (cms.contains "administerMed")]

/-- New specification for owner review. Failure identifies the first encounter
and unmet checkpoint. Success carries the proofs for the entire catalog. -/
def certifyCases : (cs : List Case) →
    Except String (PLift (∀ c ∈ cs, Realized c.input.toInitInput c.task))
  | [] => .ok ⟨by simp⟩
  | c :: cs => do
    let ok ← match h : diagnose c.input.toInitInput c.task with
      | some msg => .error (c.name ++ ": " ++ msg)
      | none => .ok (PLift.up (diagnose_sound h))
    let tail ← certifyCases cs
    return ⟨by
      intro x hx
      rcases List.mem_cons.mp hx with rfl | hx
      · exact ok.down
      · exact tail.down x hx⟩

end Ehr.Check.ReviewTrace
