import Ehr.Check.MacroBadProofs

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

private theorem rejects_human (p : Program) (h : ¬ NoAutomationAttempts specV1 p) :
    ¬ Satisfies specV1 none canonicalV1 p := fun hs => h hs.2.2.2.2.1.1

private theorem static14ScreenBound : 5 < macroNaloxone.screens.length := by decide +kernel
private theorem static14CompBound : 75 < (macroNaloxone.screens[5]'static14ScreenBound).components.length := by decide +kernel
private def static14Witness : Screen × Component := indexedComp macroNaloxone 5 static14ScreenBound 75 static14CompBound
private theorem static14Member : static14Witness ∈ allComps macroNaloxone :=
  indexedComp_mem macroNaloxone 5 static14ScreenBound 75 static14CompBound

private def static14Macro : Macro := { id := "badNaloxone", label := "Oxycodone 30 mg q4h + naloxone offered", steps := [.setValue "w1Orders.drug" "oxycodone", .setValue "w1Orders.dose" "30", .setValue "w1Orders.freq" "q4h", .setValue "w1Orders.naloxoneOffer" "offered"] }
private theorem static14Macro_mem : static14Macro ∈ macroNaloxone.macros := by
  change static14Macro ∈ (base 14).macros ++ [static14Macro]
  exact List.mem_append_right (base 14).macros (List.mem_singleton_self static14Macro)
private theorem static14Step : MacroStep.setValue "w1Orders.naloxoneOffer" "offered" ∈ static14Macro.steps := by decide
private theorem static14Id : static14Witness.2.id = "w1Orders.naloxoneOffer" := by decide +kernel
private theorem static14Kind : fieldOf? static14Witness.2.kind = some ("naloxoneOffer", .fixed 0, .none) := by decide +kernel
private theorem naloxoneLookup : specV1.element? "naloxoneOffer" = some naloxoneOffer := by decide +kernel

theorem bad14_not_satisfies : ¬ Satisfies specV1 none canonicalV1 macroNaloxone :=
  rejects_human macroNaloxone (macroSet_violation specV1 macroNaloxone static14Macro static14Witness "w1Orders.naloxoneOffer" "offered"
    "naloxoneOffer" static14Macro_mem static14Step static14Member static14Id (.fixed 0) .none static14Kind
    naloxoneOffer naloxoneLookup (by decide))
#print axioms bad14_not_satisfies

end Ehr.Check
