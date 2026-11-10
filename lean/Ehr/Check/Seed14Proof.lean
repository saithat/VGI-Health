import Ehr.Check.PatchWitness
import Ehr.Check.MacroBadProofs

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

private def static14Screen : Screen := canonicalSource[5]?.getD default
private theorem static14ScreenPresent : canonicalSource[5]?.isSome = true := by decide +kernel
private theorem static14CompPresent : static14Screen.components[67]?.isSome = true := by decide +kernel
@[irreducible] private def static14Witness : Screen × Component :=
  (static14Screen, static14Screen.components[67]?.getD default)
private def static14Macro : Macro := { id := "badNaloxone", label := "Oxycodone 30 mg q4h + naloxone offered", steps := [.setValue "w1Orders.drug" "oxycodone", .setValue "w1Orders.dose" "30", .setValue "w1Orders.freq" "q4h", .setValue "w1Orders.naloxoneOffer" "offered"] }
private theorem static14Macro_mem : static14Macro ∈ macroNaloxone.macros := by
  change static14Macro ∈ (base 14).macros ++ [static14Macro]
  exact List.mem_append_right (base 14).macros (List.mem_singleton_self static14Macro)
private theorem static14Step : MacroStep.setValue "w1Orders.naloxoneOffer" "offered" ∈ static14Macro.steps := by decide
private theorem static14Id : static14Witness.2.id = "w1Orders.naloxoneOffer" := by decide +kernel
private theorem static14Kind : fieldOf? static14Witness.2.kind = some ("naloxoneOffer", .fixed 0, .none) := by decide +kernel
private theorem naloxoneLookup : specV1.element? "naloxoneOffer" = some naloxoneOffer := by decide +kernel

private theorem static14ComponentKind : static14Witness.2.kind =
    .field "naloxoneOffer" (.fixed 0) .none := by decide +kernel

private theorem static14Member : HasComponent macroNaloxone static14Witness.2 := by
  have source : HasComponent canonicalV1 static14Witness.2 :=
    canonical_keeps_plain_field static14Witness.2
      (blueprint_keeps_field canonicalSource static14Screen static14Witness.2
        (getD_mem canonicalSource 5 static14ScreenPresent) (by decide +kernel)
        (by unfold static14Witness; exact getD_mem static14Screen.components 67 static14CompPresent)
        "naloxoneOffer" (.fixed 0) .none static14ComponentKind
        (by decide +kernel) (by decide +kernel) (by decide +kernel) (by decide +kernel) (by decide +kernel))
      "naloxoneOffer" (.fixed 0) .none static14ComponentKind naloxoneOffer naloxoneLookup rfl rfl
  have projected := hasComponent_forPersona specV1 canonicalV1 "seed14" .physician static14Witness.2 source
    (by simp [roleComponentAllowed, static14ComponentKind, naloxoneLookup]; decide)
    (by simp [macroOf?, static14ComponentKind])
  have added := hasComponent_addMacro (base 14) static14Macro static14Witness.2 projected
  have patched := hasComponent_updateScreen ((base 14).addMacro static14Macro) "w1Orders"
    (fun scr => scr.insertAfter "w1Orders.banner"
      [macroBtn scr.id "autoNaloxone" "badNaloxone" "Oxycodone 30 mg q4h + naloxone offered"])
    static14Witness.2 added (fun scr hc => insertAfter_keeps scr _ _ static14Witness.2 hc)
  exact hasComponent_seed 14 _ static14Witness.2 patched

/-- The macro itself tries to enter the human-only naloxone offer. -/
theorem bad14_not_satisfies : ¬ Satisfies specV1 none canonicalV1 macroNaloxone := by
  intro hs
  obtain ⟨sc, member, same⟩ := hasComponent_pair static14Member
  exact macroSet_violation specV1 macroNaloxone static14Macro sc "w1Orders.naloxoneOffer" "offered"
    "naloxoneOffer" static14Macro_mem static14Step member (by rw [same, static14Id])
    (.fixed 0) .none (by rw [same]; exact static14Kind)
    naloxoneOffer naloxoneLookup (by decide) hs.2.2.2.2.1.1
#print axioms bad14_not_satisfies
#print axioms static14ScreenPresent
#print axioms static14CompPresent
#print axioms static14Macro_mem
#print axioms static14Step
#print axioms static14Id
#print axioms static14Kind
#print axioms naloxoneLookup
#print axioms static14ComponentKind
#print axioms static14Member

end Ehr.Check
