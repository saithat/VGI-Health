import Ehr.Check.SeedDomainWitness

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1

/-- The full-catalog payload-domain obstruction preserves this seeded rejection.
The missing-entry mutation is independently exercised by FullSeedTests. -/
theorem bad18_not_satisfies : ¬ Satisfies specV1 none canonicalV1 noOpTechnique :=
  seed_payload_not_satisfies noOpTechnique (by decide +kernel) (by decide +kernel)
#print axioms bad18_not_satisfies
end Ehr.Check
