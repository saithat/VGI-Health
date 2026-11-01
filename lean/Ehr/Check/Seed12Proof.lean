import Ehr.Check.MacroBadProofs

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

private theorem static12ScreenBound : 1 < passivePopup.screens.length := by decide +kernel
private theorem static12CompBound : 47 < (passivePopup.screens[1]'static12ScreenBound).components.length := by decide +kernel
private def static12Witness : Screen × Component := indexedComp passivePopup 1 static12ScreenBound 47 static12CompBound
private theorem static12Member : static12Witness ∈ allComps passivePopup :=
  indexedComp_mem passivePopup 1 static12ScreenBound 47 static12CompBound

private theorem static12Kind : alertOf? static12Witness.2.kind = some ("careGapsInline", true) := by decide +kernel
private theorem passiveLookup : specV1.alert? "careGapsInline" = some careGapsInlineAlert := by decide +kernel

theorem bad12_not_satisfies : ¬ Satisfies specV1 none canonicalV1 passivePopup := by
  intro hs
  exact hs.2.2.2.2.2.2.2.2.2.2.2.1 static12Witness static12Member
    ("careGapsInline", true) (by simp [static12Kind]) rfl careGapsInlineAlert
    (by simp [passiveLookup]) (by decide)
#print axioms bad12_not_satisfies


end Ehr.Check
