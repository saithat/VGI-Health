import Ehr.Check.PatchWitness
import Ehr.Check.MacroBadProofs

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

@[irreducible] private def static11Screen : Screen := repeatedInteraction.screens[5]?.getD default
private theorem static11ScreenPresent : repeatedInteraction.screens[5]?.isSome = true := by decide +kernel
private theorem static11CompPresent : static11Screen.components[1]?.isSome = true := by decide +kernel
@[irreducible] private def static11Witness : Screen × Component :=
  (static11Screen, static11Screen.components[1]?.getD default)
private theorem static11Member : static11Witness ∈ allComps repeatedInteraction := by
  unfold static11Witness
  exact List.mem_flatMap.mpr ⟨static11Screen,
    (by unfold static11Screen; exact getD_mem repeatedInteraction.screens 5 static11ScreenPresent),
    List.mem_map.mpr ⟨_, getD_mem static11Screen.components 1 static11CompPresent, rfl⟩⟩

@[irreducible] private def static111Screen : Screen := repeatedInteraction.screens[8]?.getD default
private theorem static111ScreenPresent : repeatedInteraction.screens[8]?.isSome = true := by decide +kernel
private theorem static111CompPresent : static111Screen.components[9]?.isSome = true := by decide +kernel
@[irreducible] private def static111Witness : Screen × Component :=
  (static111Screen, static111Screen.components[9]?.getD default)
private theorem static111Member : static111Witness ∈ allComps repeatedInteraction := by
  unfold static111Witness
  exact List.mem_flatMap.mpr ⟨static111Screen,
    (by unfold static111Screen; exact getD_mem repeatedInteraction.screens 8 static111ScreenPresent),
    List.mem_map.mpr ⟨_, getD_mem static111Screen.components 9 static111CompPresent, rfl⟩⟩

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


#print axioms static11ScreenPresent
#print axioms static11CompPresent
#print axioms static11Member
#print axioms static111ScreenPresent
#print axioms static111CompPresent
#print axioms static111Member
#print axioms static11Kind
#print axioms static111Kind
#print axioms interactionInterruptive
#print axioms distinctInteractionScreens

end Ehr.Check
