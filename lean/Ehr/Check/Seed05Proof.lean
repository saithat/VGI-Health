import Ehr.Check.PatchWitness
import Ehr.Check.MacroBadProofs

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

private theorem rejects_human (p : Program) (h : ¬ NoAutomationAttempts specV1 p) :
    ¬ Satisfies specV1 none canonicalV1 p := fun hs => h hs.2.2.2.2.1.1

@[irreducible] private def static5Screen : Screen := selfCosign.screens[22]?.getD default
private theorem static5ScreenPresent : selfCosign.screens[22]?.isSome = true := by decide +kernel
private theorem static5CompPresent : static5Screen.components[16]?.isSome = true := by decide +kernel
@[irreducible] private def static5Witness : Screen × Component :=
  (static5Screen, static5Screen.components[16]?.getD default)
private theorem static5Member : static5Witness ∈ allComps selfCosign := by
  unfold static5Witness
  exact List.mem_flatMap.mpr ⟨static5Screen,
    (by unfold static5Screen; exact getD_mem selfCosign.screens 22 static5ScreenPresent),
    List.mem_map.mpr ⟨_, getD_mem static5Screen.components 16 static5CompPresent, rfl⟩⟩

private theorem static5Kind : fieldOf? static5Witness.2.kind = some ("highAlertCosign", .fixed 0, (.default "nurse1")) := by decide +kernel
private theorem static5Lookup : specV1.element? "highAlertCosign" = some highAlertCosign := by decide +kernel
private theorem static5Human : HumanMustEnter highAlertCosign := by decide

theorem bad05_not_satisfies : ¬ Satisfies specV1 none canonicalV1 selfCosign :=
  rejects_human selfCosign (humanPrefill_violation specV1 selfCosign static5Witness static5Member
    "highAlertCosign" (.fixed 0) (.default "nurse1") static5Kind highAlertCosign static5Lookup static5Human (by decide))
#print axioms bad05_not_satisfies


#print axioms rejects_human
#print axioms static5ScreenPresent
#print axioms static5CompPresent
#print axioms static5Member
#print axioms static5Kind
#print axioms static5Lookup
#print axioms static5Human

end Ehr.Check
