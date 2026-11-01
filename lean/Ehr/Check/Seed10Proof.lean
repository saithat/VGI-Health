import Ehr.Check.MacroBadProofs

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

private theorem static10ScreenBound : 5 < inventedAlert.screens.length := by decide +kernel
private theorem static10CompBound : 1 < (inventedAlert.screens[5]'static10ScreenBound).components.length := by decide +kernel
private def static10Witness : Screen × Component := indexedComp inventedAlert 5 static10ScreenBound 1 static10CompBound
private theorem static10Member : static10Witness ∈ allComps inventedAlert :=
  indexedComp_mem inventedAlert 5 static10ScreenBound 1 static10CompBound

private theorem static10Kind : alertOf? static10Witness.2.kind = some ("doseRangeEveryOrder", true) := by decide +kernel
private theorem undeclaredAlert : ¬ (specV1.alert? "doseRangeEveryOrder").isSome := by decide +kernel

theorem bad10_not_satisfies : ¬ Satisfies specV1 none canonicalV1 inventedAlert := by
  intro hs
  exact undeclaredAlert (hs.1.2.2.2.1.2.2.2.2.1 static10Witness static10Member
    ("doseRangeEveryOrder", true) (by simp [static10Kind]))
#print axioms bad10_not_satisfies


end Ehr.Check
