import Ehr.Check.PatchWitness
import Ehr.Check.MacroBadProofs

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

private def static10Screen : Screen := inventedAlert.screens[5]?.getD default
private theorem static10ScreenPresent : inventedAlert.screens[5]?.isSome = true := by decide +kernel
private theorem static10CompPresent : static10Screen.components[1]?.isSome = true := by decide +kernel
@[irreducible] private def static10Witness : Screen × Component :=
  (static10Screen, static10Screen.components[1]?.getD default)
private theorem static10Member : static10Witness ∈ allComps inventedAlert := by
  unfold static10Witness
  exact List.mem_flatMap.mpr ⟨static10Screen,
    getD_mem inventedAlert.screens 5 static10ScreenPresent,
    List.mem_map.mpr ⟨_, getD_mem static10Screen.components 1 static10CompPresent, rfl⟩⟩

private theorem static10Kind : alertOf? static10Witness.2.kind = some ("doseRangeEveryOrder", true) := by decide +kernel
private theorem undeclaredAlert : ¬ (specV1.alert? "doseRangeEveryOrder").isSome := by decide +kernel

theorem bad10_not_satisfies : ¬ Satisfies specV1 none canonicalV1 inventedAlert := by
  intro hs
  exact undeclaredAlert (hs.1.2.2.2.1.2.2.2.2.1 static10Witness static10Member
    ("doseRangeEveryOrder", true) (by simp [static10Kind]))
#print axioms bad10_not_satisfies


end Ehr.Check
