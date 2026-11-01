import Ehr.Check.MacroBadProofs

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

private theorem rejects_human (p : Program) (h : ¬ NoAutomationAttempts specV1 p) :
    ¬ Satisfies specV1 none canonicalV1 p := fun hs => h hs.2.2.2.2.1.1

private theorem static2ScreenBound : 8 < prefilledIdentity.screens.length := by decide +kernel
private theorem static2CompBound : 38 < (prefilledIdentity.screens[8]'static2ScreenBound).components.length := by decide +kernel
private def static2Witness : Screen × Component := indexedComp prefilledIdentity 8 static2ScreenBound 38 static2CompBound
private theorem static2Member : static2Witness ∈ allComps prefilledIdentity :=
  indexedComp_mem prefilledIdentity 8 static2ScreenBound 38 static2CompBound

private theorem static2Kind : fieldOf? static2Witness.2.kind = some ("patientIdReentry", .fixed 0, (.fromRecord "patientIdentity")) := by decide +kernel
private theorem static2Lookup : specV1.element? "patientIdReentry" = some patientIdReentry := by decide +kernel
private theorem static2Human : HumanMustEnter patientIdReentry := by decide

theorem bad02_not_satisfies : ¬ Satisfies specV1 none canonicalV1 prefilledIdentity :=
  rejects_human prefilledIdentity (humanPrefill_violation specV1 prefilledIdentity static2Witness static2Member
    "patientIdReentry" (.fixed 0) (.fromRecord "patientIdentity") static2Kind patientIdReentry static2Lookup static2Human (by decide))
#print axioms bad02_not_satisfies


end Ehr.Check
