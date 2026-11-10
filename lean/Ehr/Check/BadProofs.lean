import Ehr.Check.SeedDomainWitness
import Ehr.Check.LocalBadProofs
import Ehr.Check.ReplayContext

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1

/-- Executing any finite human event list from a reachable state stays reachable. -/
theorem reachable_afterHuman (ep : Episode) (es : List Event) (s : State)
    (hs : Reachable ep s) : Reachable ep (ep.afterHuman s es) := by
  induction es generalizing s with
  | nil => exact hs
  | cons e es ih => exact ih _ (.step .human e hs)

/-- Every goto from outside the deleted refill decision remains outside it. -/
def refillKept : List ScreenId :=
  (unreachableRefill.screens.map (·.id)).filter (· != "w7Decision")

/-- Seed 7 is rejected by the full-profile payload-domain obstruction.
Its stranded refill task is independently checked by FullSeedTests. -/
theorem bad07_not_satisfies : ¬ Satisfies specV1 none canonicalV1 unreachableRefill :=
  seed_payload_not_satisfies unreachableRefill (by decide +kernel) (by decide +kernel)

/-- Seed 1 reaches a shown Sign button with its allergy review unmet. -/
def hiddenEp : Episode := ⟨specV1, hiddenAllergies, replayFacts, replayUser hiddenAllergies⟩
def hiddenPath : List Event := [.click "home.work.w1Rooming", .click "w1Rooming.nav.w1Orders",
  .click "w1Orders.toSign", .click "w1Verify.continue"]
def hiddenAtSign : State := hiddenEp.afterHuman hiddenEp.start hiddenPath

/-- Seed 1 is rejected by the full-profile payload-domain obstruction.
FullSeedTests independently checks the hidden-allergy review and its replay. -/
theorem bad01_not_satisfies : ¬ Satisfies specV1 none canonicalV1 hiddenAllergies :=
  seed_payload_not_satisfies hiddenAllergies (by decide +kernel) (by decide +kernel)

#print axioms bad01_not_satisfies
#print axioms bad02_not_satisfies
#print axioms bad03_not_satisfies
#print axioms bad04_not_satisfies
#print axioms bad05_not_satisfies
#print axioms bad06_not_satisfies
#print axioms bad07_not_satisfies
#print axioms bad08_not_satisfies
#print axioms bad09_not_satisfies
#print axioms bad10_not_satisfies
#print axioms bad11_not_satisfies
#print axioms bad12_not_satisfies
#print axioms bad14_not_satisfies
#print axioms reachable_afterHuman
end Ehr.Check
