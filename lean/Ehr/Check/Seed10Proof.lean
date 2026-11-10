import Ehr.Check.PatchWitness
import Ehr.Check.MacroBadProofs

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

comp_witness static10Witness, static10Member := inventedAlert[5][1]

private theorem static10Kind : alertOf? static10Witness.2.kind = some ("doseRangeEveryOrder", true) := by decide +kernel
private theorem undeclaredAlert : ¬ (specV1.alert? "doseRangeEveryOrder").isSome := by decide +kernel

theorem bad10_not_satisfies : ¬ Satisfies specV1 none canonicalV1 inventedAlert := by
  intro hs
  exact undeclaredAlert (hs.1.2.2.2.1.2.2.2.2.1 static10Witness static10Member
    ("doseRangeEveryOrder", true) (by simp [static10Kind]))
#print axioms bad10_not_satisfies


end Ehr.Check
