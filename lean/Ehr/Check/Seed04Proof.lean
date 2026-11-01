import Ehr.Check.MacroBadProofs

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

private theorem rejects_human (p : Program) (h : ¬ NoAutomationAttempts specV1 p) :
    ¬ Satisfies specV1 none canonicalV1 p := fun hs => h hs.2.2.2.2.1.1

private theorem static4ScreenBound : 18 < macroOverride.screens.length := by decide +kernel
private theorem static4CompBound : 57 < (macroOverride.screens[18]'static4ScreenBound).components.length := by decide +kernel
private def static4Witness : Screen × Component := indexedComp macroOverride 18 static4ScreenBound 57 static4CompBound
private theorem static4Member : static4Witness ∈ allComps macroOverride :=
  indexedComp_mem macroOverride 18 static4ScreenBound 57 static4CompBound

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


end Ehr.Check
