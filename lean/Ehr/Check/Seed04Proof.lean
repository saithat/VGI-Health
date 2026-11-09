import Ehr.Check.PatchWitness
import Ehr.Check.MacroBadProofs

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

private theorem rejects_human (p : Program) (h : ¬ NoAutomationAttempts specV1 p) :
    ¬ Satisfies specV1 none canonicalV1 p := fun hs => h hs.2.2.2.2.1.1

@[irreducible] private def static4Screen : Screen := macroOverride.screens[18]?.getD default
private theorem static4ScreenPresent : macroOverride.screens[18]?.isSome = true := by decide +kernel
private theorem static4CompPresent : static4Screen.components[58]?.isSome = true := by decide +kernel
@[irreducible] private def static4Witness : Screen × Component :=
  (static4Screen, static4Screen.components[58]?.getD default)
private theorem static4Member : static4Witness ∈ allComps macroOverride := by
  unfold static4Witness
  exact List.mem_flatMap.mpr ⟨static4Screen,
    (by unfold static4Screen; exact getD_mem macroOverride.screens 18 static4ScreenPresent),
    List.mem_map.mpr ⟨_, getD_mem static4Screen.components 58 static4CompPresent, rfl⟩⟩

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


#print axioms rejects_human
#print axioms static4ScreenPresent
#print axioms static4CompPresent
#print axioms static4Member
#print axioms static4Macro_mem
#print axioms static4Step
#print axioms static4Id
#print axioms static4Kind

end Ehr.Check
