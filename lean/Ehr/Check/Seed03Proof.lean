import Ehr.Check.MacroBadProofs

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

private theorem static3ScreenBound : 14 < poundsAsWeight.screens.length := by decide +kernel
private theorem static3CompBound : 22 < (poundsAsWeight.screens[14]'static3ScreenBound).components.length := by decide +kernel
private def static3Witness : Screen × Component := indexedComp poundsAsWeight 14 static3ScreenBound 22 static3CompBound
private theorem static3Member : static3Witness ∈ allComps poundsAsWeight :=
  indexedComp_mem poundsAsWeight 14 static3ScreenBound 22 static3CompBound

private theorem static3Kind : fieldOf? static3Witness.2.kind = some ("weightLb", .fixed 0, .none) := by decide +kernel
private theorem unknownPounds : specV1.element? "weightLb" = none := by decide +kernel

theorem bad03_not_satisfies : ¬ Satisfies specV1 none canonicalV1 poundsAsWeight := by
  intro hs
  have h := hs.2.2.1.1.1 static3Witness static3Member
    ("weightLb", .fixed 0, .none) (by simp [static3Kind])
  simp [unknownPounds] at h
#print axioms bad03_not_satisfies


end Ehr.Check
