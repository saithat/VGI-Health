import Ehr.Check.MacroBadProofs

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

private theorem static11ScreenBound : 5 < repeatedInteraction.screens.length := by decide +kernel
private theorem static11CompBound : 1 < (repeatedInteraction.screens[5]'static11ScreenBound).components.length := by decide +kernel
private def static11Witness : Screen × Component := indexedComp repeatedInteraction 5 static11ScreenBound 1 static11CompBound
private theorem static11Member : static11Witness ∈ allComps repeatedInteraction :=
  indexedComp_mem repeatedInteraction 5 static11ScreenBound 1 static11CompBound

private theorem static111ScreenBound : 8 < repeatedInteraction.screens.length := by decide +kernel
private theorem static111CompBound : 34 < (repeatedInteraction.screens[8]'static111ScreenBound).components.length := by decide +kernel
private def static111Witness : Screen × Component := indexedComp repeatedInteraction 8 static111ScreenBound 34 static111CompBound
private theorem static111Member : static111Witness ∈ allComps repeatedInteraction :=
  indexedComp_mem repeatedInteraction 8 static111ScreenBound 34 static111CompBound

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
