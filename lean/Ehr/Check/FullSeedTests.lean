import Ehr.Canonical.BadPrograms
import Ehr.Check.Check

/-!
Seeded rejection and replay tests for the full rule catalog.
Each mutation also has its own rule check and negative property proof;
a shared template failure does not establish detection.
-/
namespace Ehr.Check.FullSeedTests
open Ehr Ehr.Check Ehr.Canonical Ehr.Specs.V1

/-- The actual first rejection has a complete replay-validated navigation path. -/
def rejectedWithReplay (p : Program) : Bool :=
  match firstFinding (Ehr.Check.rules specV1 none canonicalV1 p) with
  | none => false
  | some finding => (counterexample specV1 p finding).2.2

-- The expanded baselines now pass review pinning and D5. Universal completion
-- remains blocked by absent trusted payloads; CHECK-2026-11-01 documents the
-- exact obligation and DisplayObstruction proves why panels alone cannot fix it.
#guard rejectedWithReplay (forPersona specV1 canonicalV1 "P3" .rn)

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
#guard mutationRejected "reviewsBeforeCommit" Bad.hiddenControlledDetails
#guard mutationRejected "completable" Bad.scheduleIIRefills
#guard mutationRejected "completable" Bad.noRestraintCarePlan
#guard mutationRejected "completable" Bad.noOpTechnique
#guard mutationRejected "completable" Bad.noVaccineProviderAddress
#guard mutationRejected "completable" Bad.noAdministrationTime
#guard mutationRejected "completable" Bad.noControlledStrength
#guard mutationRejected "reviewsBeforeCommit" Bad.hiddenSigningNotice
#guard mutationRejected "completable" Bad.noTelehealthConsent
#guard mutationRejected "humanOnlyKept" Bad.defaultRefillEligibility
end Ehr.Check.FullSeedTests
