import Ehr.Check.PatchWitness
import Ehr.Check.MacroBadProofs

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

private def static12Screen : Screen := passivePopup.screens[1]?.getD default
private theorem static12ScreenPresent : passivePopup.screens[1]?.isSome = true := by decide +kernel
private theorem static12CompPresent : static12Screen.components[22]?.isSome = true := by decide +kernel
@[irreducible] private def static12Witness : Screen × Component :=
  (static12Screen, static12Screen.components[22]?.getD default)
private theorem static12Member : static12Witness ∈ allComps passivePopup := by
  unfold static12Witness
  exact List.mem_flatMap.mpr ⟨static12Screen,
    getD_mem passivePopup.screens 1 static12ScreenPresent,
    List.mem_map.mpr ⟨_, getD_mem static12Screen.components 22 static12CompPresent, rfl⟩⟩

private theorem static12Kind : alertOf? static12Witness.2.kind = some ("careGapsInline", true) := by decide +kernel
private theorem passiveLookup : specV1.alert? "careGapsInline" = some careGapsInlineAlert := by decide +kernel

theorem bad12_not_satisfies : ¬ Satisfies specV1 none canonicalV1 passivePopup := by
  intro hs
  exact hs.2.2.2.2.2.2.2.2.2.2.2.1.1 static12Witness static12Member
    ("careGapsInline", true) (by simp [static12Kind]) rfl careGapsInlineAlert
    (by simp [passiveLookup]) (by decide)
#print axioms bad12_not_satisfies


end Ehr.Check
