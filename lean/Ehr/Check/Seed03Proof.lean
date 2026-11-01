import Ehr.Check.PatchWitness
import Ehr.Check.MacroBadProofs

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

private def static3Screen : Screen := poundsAsWeight.screens[14]?.getD default
private theorem static3ScreenPresent : poundsAsWeight.screens[14]?.isSome = true := by decide +kernel
private theorem static3CompPresent : static3Screen.components[3]?.isSome = true := by decide +kernel
@[irreducible] private def static3Witness : Screen × Component :=
  (static3Screen, static3Screen.components[3]?.getD default)
private theorem static3Member : static3Witness ∈ allComps poundsAsWeight := by
  unfold static3Witness
  exact List.mem_flatMap.mpr ⟨static3Screen,
    getD_mem poundsAsWeight.screens 14 static3ScreenPresent,
    List.mem_map.mpr ⟨_, getD_mem static3Screen.components 3 static3CompPresent, rfl⟩⟩

private theorem static3Kind : fieldOf? static3Witness.2.kind = some ("weightLb", .fixed 0, .none) := by decide +kernel
private theorem unknownPounds : specV1.element? "weightLb" = none := by decide +kernel

theorem bad03_not_satisfies : ¬ Satisfies specV1 none canonicalV1 poundsAsWeight := by
  intro hs
  have h := hs.2.2.1.1.1 static3Witness static3Member
    ("weightLb", .fixed 0, .none) (by simp [static3Kind])
  simp [unknownPounds] at h
#print axioms bad03_not_satisfies


end Ehr.Check
