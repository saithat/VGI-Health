import Ehr.Check.PatchWitness
import Ehr.Check.MacroBadProofs

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

comp_witness static6Witness, static6Member := staleWeight[25][3]

private theorem static6Kind : fieldOf? static6Witness.2.kind =
    some ("weight", .fixed 0, .fromRecord "weightYesterday") := by decide +kernel
private theorem weightLookup : specV1.element? "weight" = some weight := by decide +kernel

theorem bad06_not_satisfies : ¬ Satisfies specV1 none canonicalV1 staleWeight := by
  intro hs
  have h := hs.2.2.2.2.2.2.1.1 static6Witness static6Member
    ("weight", .fixed 0, .fromRecord "weightYesterday") (by simp [static6Kind])
    weight (by simp [weightLookup]) (by decide) "weightYesterday" (by decide)
  exact (by decide : "weightYesterday" ≠ "weightToday") h
#print axioms bad06_not_satisfies


end Ehr.Check
