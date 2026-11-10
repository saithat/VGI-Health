import Ehr.Check.FullDisplayObstruction
import Ehr.Check.MissingWitness

/-!
A shared full-profile rejection witness for seeds whose whole-interpreter
kernel reduction exceeds the memory budget. This proves the original rejection
statements, not mutation-specific detection; FullSeedTests checks each mutation's
own rule and replay independently. No interpreter/specification is changed.
-/
set_option maxRecDepth 16384
set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Specs.V1

@[irreducible] private def signScreen : Screen := canonicalV1.screens[8]?.getD default
@[irreducible] private def signComponent : Component := signScreen.components[53]?.getD default
private theorem screenPresent : canonicalV1.screens[8]?.isSome = true := by decide +kernel
private theorem componentPresent : signScreen.components[53]?.isSome = true := by decide +kernel
private theorem componentKind : signComponent.kind = .button (.commit "signOrders") := by decide +kernel

/-- An unrestricted seed preset retains the canonical signing task, regardless
of its own screen patches or macro library. -/
theorem seed_signOrders_required (p : Program)
    (scope : ["P1", "P2", "P3", "P4", "P5"].contains p.presetOwner = false)
    (role : p.role ∈ ((specV1.commit? "signOrders").getD default).roles) : "signOrders" ∈ requiredCommits specV1 canonicalV1 p := by
  apply List.mem_filter.mpr
  constructor
  · apply List.mem_eraseDups.mpr
    apply List.mem_append_left
    apply List.mem_flatMap.mpr
    refine ⟨signScreen, List.mem_filter.mpr ⟨?_, ?_⟩, ?_⟩
    · unfold signScreen
      exact getD_mem canonicalV1.screens 8 screenPresent
    · simp only [presetScreen, scope, Bool.not_false, Bool.true_or]
    · apply List.mem_filterMap.mpr
      refine ⟨signComponent, ?_, ?_⟩
      · unfold signComponent
        exact getD_mem signScreen.components 53 componentPresent
      · simp only [componentKind]
  · have present : (specV1.commit? "signOrders").isSome = true := by decide +kernel
    cases lookup : specV1.commit? "signOrders" with
    | none => simp only [lookup, Option.isSome_none, Bool.false_eq_true] at present
    | some cs => simpa only [lookup, Option.getD_some, List.contains_iff_mem] using role

/-- Full-catalog completion permits evidence-free records but requires trusted
payloads. The seed's required signing task therefore refutes Satisfies. -/
theorem seed_payload_not_satisfies (p : Program)
    (scope : ["P1", "P2", "P3", "P4", "P5"].contains p.presetOwner = false)
    (role : p.role ∈ ((specV1.commit? "signOrders").getD default).roles) : ¬ Satisfies specV1 none canonicalV1 p :=
  v1_payload_domain_not_satisfies canonicalV1 p ⟨"signOrders", seed_signOrders_required p scope role⟩

#print axioms screenPresent
#print axioms componentPresent
#print axioms componentKind
#print axioms seed_signOrders_required
#print axioms seed_payload_not_satisfies
end Ehr.Check
