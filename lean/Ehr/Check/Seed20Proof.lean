import Ehr.Check.SeedDomainWitness

set_option maxRecDepth 16384
set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1

@[irreducible] private def medScreen : Screen := canonicalV1.screens[22]?.getD default
@[irreducible] private def medComponent : Component := medScreen.components[29]?.getD default
private theorem screenPresent : canonicalV1.screens[22]?.isSome = true := by decide +kernel
private theorem componentPresent : medScreen.components[29]?.isSome = true := by decide +kernel
private theorem componentKind : medComponent.kind = .button (.commit "administerMed") := by
  unfold medComponent medScreen
  decide +kernel

/-- The nursing seed retains a required administration task in the canonical.
This uses the canonical task family, independently of the missing-field patch. -/
private theorem administration_required :
    "administerMed" ∈ requiredCommits specV1 canonicalV1 noAdministrationTime := by
  apply List.mem_filter.mpr
  constructor
  · apply List.mem_eraseDups.mpr
    apply List.mem_append_left
    apply List.mem_flatMap.mpr
    refine ⟨medScreen, List.mem_filter.mpr ⟨?_, ?_⟩, ?_⟩
    · unfold medScreen
      exact getD_mem canonicalV1.screens 22 screenPresent
    · have scope : ["P1", "P2", "P3", "P4", "P5"].contains noAdministrationTime.presetOwner = false := by decide +kernel
      simp only [presetScreen, scope, Bool.not_false, Bool.true_or]
    · apply List.mem_filterMap.mpr
      refine ⟨medComponent, ?_, by simp only [componentKind]⟩
      unfold medComponent
      exact getD_mem medScreen.components 29 componentPresent
  · have present : (specV1.commit? "administerMed").isSome = true := by decide +kernel
    have role : noAdministrationTime.role ∈ ((specV1.commit? "administerMed").getD default).roles := by decide +kernel
    cases lookup : specV1.commit? "administerMed" with
    | none => simp only [lookup, Option.isSome_none, Bool.false_eq_true] at present
    | some cs => simpa only [lookup, Option.getD_some, List.contains_iff_mem] using role

/-- The full-catalog payload-domain obstruction preserves this seeded rejection.
The missing-entry mutation is independently exercised by FullSeedTests. -/
theorem bad20_not_satisfies : ¬ Satisfies specV1 none canonicalV1 noAdministrationTime :=
  v1_payload_domain_not_satisfies canonicalV1 noAdministrationTime ⟨"administerMed", administration_required⟩

#print axioms screenPresent
#print axioms componentPresent
#print axioms componentKind
#print axioms administration_required
#print axioms bad20_not_satisfies
end Ehr.Check
