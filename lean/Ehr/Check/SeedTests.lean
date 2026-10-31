import Ehr.Check.BadProofs

/-! Permanent seeded regressions. Until content's template passes on its own,
rejection and replay tests are paired with mutation-specific rule tests and
negative property proofs. A shared template failure alone is not sufficient. -/
namespace Ehr.Check.Tests
open Ehr Ehr.Check Ehr.Canonical Ehr.Specs.V1

/-- The actual first rejection has a complete replay-validated navigation path. -/
def rejectedWithReplay (p : Program) : Bool :=
  match firstFinding (Ehr.Check.rules specV1 none canonicalV1 p) with
  | none => false
  | some finding => (counterexample specV1 p finding).2.2

#guard check specV1 none canonicalV1 (forPersona specV1 canonicalV1 "P3" .rn) == .ok

#guard Bad.programs.all (fun (_, p) => rejectedWithReplay p)

/-- A specific failing rule also has a replayable explanation, independently
of any earlier template failure. This does not relabel the actual verdict. -/
def mutationRejected (property : String) (p : Program) : Bool :=
  match (Ehr.Check.rules specV1 none canonicalV1 p).find? (fun r =>
      r.property == property && !r.passes) with
  | none => false
  | some r =>
    let f := (r.explain ()).getD { property, message := "rule failed" }
    (counterexample specV1 p f).2.2

#guard mutationRejected "reviewsBeforeCommit" Bad.hiddenAllergies
#guard mutationRejected "humanOnlyKept" Bad.prefilledIdentity
#guard mutationRejected "writesOnly" Bad.poundsAsWeight
#guard mutationRejected "humanOnlyKept" Bad.macroOverride
#guard mutationRejected "humanOnlyKept" Bad.selfCosign
#guard mutationRejected "units" Bad.staleWeight
#guard mutationRejected "completable" Bad.unreachableRefill
#guard mutationRejected "humanOnlyKept" Bad.forgedConsent
#guard mutationRejected "humanOnlyKept" Bad.hiddenAllergyAlert
#guard mutationRejected "wellFormed" Bad.inventedAlert
#guard mutationRejected "noRepeatInterruptions" Bad.repeatedInteraction
#guard mutationRejected "severityTiers" Bad.passivePopup
#guard mutationRejected "humanOnlyKept" Bad.macroNaloxone
end Ehr.Check.Tests
