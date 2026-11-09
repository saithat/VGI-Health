import Ehr.Check.PatchWitness
import Ehr.Check.MacroBadProofs

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

comp_witness static11Witness, static11Member := repeatedInteraction[5][1]

comp_witness static111Witness, static111Member := repeatedInteraction[8][8]

private theorem static11Kind : alertOf? static11Witness.2.kind = some ("interactionOrder", true) := by decide +kernel
private theorem static111Kind : alertOf? static111Witness.2.kind = some ("interactionOrder", true) := by decide +kernel
private theorem interactionInterruptive : ∀ al ∈ specV1.alert? "interactionOrder", al.tier = .interruptive := by decide +kernel
private theorem distinctInteractionScreens : static11Witness.1.id ≠ static111Witness.1.id := by decide +kernel

theorem bad11_not_satisfies : ¬ Satisfies specV1 none canonicalV1 repeatedInteraction := by
  intro hs
  exact distinctInteractionScreens (hs.2.2.2.2.2.2.2.2.2.2.1.1 static11Witness static11Member
    static111Witness static111Member ("interactionOrder", true) (by simp [static11Kind])
    ("interactionOrder", true) (by simp [static111Kind]) rfl rfl rfl interactionInterruptive)
#print axioms bad11_not_satisfies


end Ehr.Check
