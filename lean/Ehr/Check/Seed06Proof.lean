import Ehr.Check.MacroBadProofs

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

private theorem static6ScreenBound : 25 < staleWeight.screens.length := by decide +kernel
private theorem static6CompBound : 23 < (staleWeight.screens[25]'static6ScreenBound).components.length := by decide +kernel
private def static6Witness : Screen × Component := indexedComp staleWeight 25 static6ScreenBound 23 static6CompBound
private theorem static6Member : static6Witness ∈ allComps staleWeight :=
  indexedComp_mem staleWeight 25 static6ScreenBound 23 static6CompBound

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


end Ehr.Check
