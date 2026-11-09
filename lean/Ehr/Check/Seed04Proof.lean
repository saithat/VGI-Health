import Ehr.Check.PatchWitness
import Ehr.Check.MacroBadProofs

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

comp_witness static4Witness, static4Member := macroOverride[18][57]

private def static4Macro : Macro := { id := "badOverride", label := "Override interaction and sign", steps := [.click "w3Sign.alert.interaction", .click "w3Sign.commit.signOrders"] }
private theorem static4Macro_mem : static4Macro ∈ macroOverride.macros := by
  change static4Macro ∈ (base 4).macros ++ [static4Macro]
  exact List.mem_append_right (base 4).macros (List.mem_singleton_self static4Macro)
private theorem static4Step : MacroStep.click "w3Sign.commit.signOrders" ∈ static4Macro.steps := by decide
private theorem static4Id : static4Witness.2.id = "w3Sign.commit.signOrders" := by decide +kernel
private theorem static4Kind : commitOf? static4Witness.2.kind = some "signOrders" := by decide +kernel

theorem bad04_not_satisfies : ¬ Satisfies specV1 none canonicalV1 macroOverride :=
  rejects_human macroOverride (macroClick_violation specV1 macroOverride static4Macro static4Witness "w3Sign.commit.signOrders" "signOrders"
    static4Macro_mem static4Step static4Member static4Id static4Kind)
#print axioms bad04_not_satisfies


end Ehr.Check
