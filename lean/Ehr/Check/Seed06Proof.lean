import Ehr.Check.PatchWitness
import Ehr.Check.MacroBadProofs

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

@[irreducible] private def static6Screen : Screen := staleWeight.screens[25]?.getD default
private theorem static6ScreenPresent : staleWeight.screens[25]?.isSome = true := by decide +kernel
private theorem static6CompPresent : static6Screen.components[6]?.isSome = true := by decide +kernel
@[irreducible] private def static6Witness : Screen × Component :=
  (static6Screen, static6Screen.components[6]?.getD default)
private theorem static6Member : static6Witness ∈ allComps staleWeight := by
  unfold static6Witness
  exact List.mem_flatMap.mpr ⟨static6Screen,
    (by unfold static6Screen; exact getD_mem staleWeight.screens 25 static6ScreenPresent),
    List.mem_map.mpr ⟨_, getD_mem static6Screen.components 6 static6CompPresent, rfl⟩⟩

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


#print axioms static6ScreenPresent
#print axioms static6CompPresent
#print axioms static6Member
#print axioms static6Kind
#print axioms weightLookup

end Ehr.Check
