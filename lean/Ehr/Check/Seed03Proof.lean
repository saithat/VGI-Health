import Ehr.Check.PatchWitness
import Ehr.Check.MacroBadProofs

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

comp_witness static3Witness, static3Member := poundsAsWeight[14][3]

private theorem static3Kind : fieldOf? static3Witness.2.kind = some ("weightLb", .fixed 0, .none) := by decide +kernel
private theorem unknownPounds : specV1.element? "weightLb" = none := by decide +kernel

theorem bad03_not_satisfies : ¬ Satisfies specV1 none canonicalV1 poundsAsWeight := by
  intro hs
  have h := hs.2.2.1.1.1 static3Witness static3Member
    ("weightLb", .fixed 0, .none) (by simp [static3Kind])
  simp [unknownPounds] at h
#print axioms bad03_not_satisfies


end Ehr.Check
