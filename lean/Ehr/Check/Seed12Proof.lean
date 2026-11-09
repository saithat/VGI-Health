import Ehr.Check.PatchWitness
import Ehr.Check.MacroBadProofs

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

comp_witness static12Witness, static12Member := passivePopup[1][22]

private theorem static12Kind : alertOf? static12Witness.2.kind = some ("careGapsInline", true) := by decide +kernel
private theorem passiveLookup : specV1.alert? "careGapsInline" = some careGapsInlineAlert := by decide +kernel

theorem bad12_not_satisfies : ¬ Satisfies specV1 none canonicalV1 passivePopup := by
  intro hs
  exact hs.2.2.2.2.2.2.2.2.2.2.2.1.1 static12Witness static12Member
    ("careGapsInline", true) (by simp [static12Kind]) rfl careGapsInlineAlert
    (by simp [passiveLookup]) (by decide)
#print axioms bad12_not_satisfies


end Ehr.Check
