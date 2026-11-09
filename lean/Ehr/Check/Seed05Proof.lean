import Ehr.Check.PatchWitness
import Ehr.Check.MacroBadProofs

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

comp_witness static5Witness, static5Member := selfCosign[22][14]

private theorem static5Kind : fieldOf? static5Witness.2.kind = some ("highAlertCosign", .fixed 0, (.default "nurse1")) := by decide +kernel
private theorem static5Lookup : specV1.element? "highAlertCosign" = some highAlertCosign := by decide +kernel
private theorem static5Human : HumanMustEnter highAlertCosign := by decide

theorem bad05_not_satisfies : ¬ Satisfies specV1 none canonicalV1 selfCosign :=
  rejects_human selfCosign (humanPrefill_violation specV1 selfCosign static5Witness static5Member
    "highAlertCosign" (.fixed 0) (.default "nurse1") static5Kind highAlertCosign static5Lookup static5Human (by decide))
#print axioms bad05_not_satisfies


end Ehr.Check
