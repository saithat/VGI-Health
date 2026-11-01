import Ehr.Check.MacroBadProofs

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

private theorem rejects_human (p : Program) (h : ¬ NoAutomationAttempts specV1 p) :
    ¬ Satisfies specV1 none canonicalV1 p := fun hs => h hs.2.2.2.2.1.1

private theorem static5ScreenBound : 22 < selfCosign.screens.length := by decide +kernel
private theorem static5CompBound : 32 < (selfCosign.screens[22]'static5ScreenBound).components.length := by decide +kernel
private def static5Witness : Screen × Component := indexedComp selfCosign 22 static5ScreenBound 32 static5CompBound
private theorem static5Member : static5Witness ∈ allComps selfCosign :=
  indexedComp_mem selfCosign 22 static5ScreenBound 32 static5CompBound

private theorem static5Kind : fieldOf? static5Witness.2.kind = some ("highAlertCosign", .fixed 0, (.default "nurse1")) := by decide +kernel
private theorem static5Lookup : specV1.element? "highAlertCosign" = some highAlertCosign := by decide +kernel
private theorem static5Human : HumanMustEnter highAlertCosign := by decide

theorem bad05_not_satisfies : ¬ Satisfies specV1 none canonicalV1 selfCosign :=
  rejects_human selfCosign (humanPrefill_violation specV1 selfCosign static5Witness static5Member
    "highAlertCosign" (.fixed 0) (.default "nurse1") static5Kind highAlertCosign static5Lookup static5Human (by decide))
#print axioms bad05_not_satisfies


end Ehr.Check
