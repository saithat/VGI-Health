import Ehr.Check.PatchWitness
import Ehr.Check.MissingWitness

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

-- Indices are in the current unmodified canonical program. Membership in the
-- bad program follows structurally, avoiding reduction of its persona macros.
@[irreducible] private def seed21Screen : Screen := canonicalV1.screens[8]?.getD default
private theorem seed21ScreenPresent : canonicalV1.screens[8]?.isSome = true := by decide +kernel
private theorem seed21CompPresent : seed21Screen.components[53]?.isSome = true := by decide +kernel
@[irreducible] private def seed21Component : Component := seed21Screen.components[53]?.getD default
private theorem seed21Kind : seed21Component.kind = .button (.commit "signOrders") := by decide +kernel
private theorem seed21Source : HasComponent canonicalV1 seed21Component :=
  ⟨seed21Screen,
    by unfold seed21Screen; exact getD_mem canonicalV1.screens 8 seed21ScreenPresent,
    by unfold seed21Component; exact getD_mem seed21Screen.components 53 seed21CompPresent⟩
private theorem seed21Member : HasComponent noControlledStrength seed21Component := by
  apply hasComponent_withoutElement _ "controlledProductStrength" seed21Component
  · apply hasComponent_forPersona specV1 canonicalV1 "seed21" .physician seed21Component seed21Source
    · simp [roleComponentAllowed, seed21Kind]
      decide
    · simp [seed21Kind, macroOf?]
  · simp [seed21Kind, fieldOf?]
private def seed21Commit := (specV1.commit? "signOrders").getD default
private theorem seed21Lookup : specV1.commit? "signOrders" = some seed21Commit := by decide +kernel
private theorem seed21Role : noControlledStrength.role ∈ seed21Commit.roles := by decide +kernel
private def seed21Req : EntryReq := { commit := "signOrders", element := "controlledProductStrength", when := .orderClass "controlled-II-IV", perOrderLine := true }
private theorem seed21Req_mem : seed21Req ∈ specV1.entries := by decide +kernel

/-- Seed 21: required `controlledProductStrength` has no field anywhere in the program. -/
theorem bad21_not_satisfies : ¬ Satisfies specV1 none canonicalV1 noControlledStrength := by
  obtain ⟨pair, member, component⟩ := hasComponent_pair seed21Member
  exact missing_required_not_satisfies specV1 canonicalV1 noControlledStrength "signOrders"
    (required_of_component specV1 canonicalV1 noControlledStrength pair member "signOrders"
      (by rw [component]; exact seed21Kind) seed21Commit seed21Lookup seed21Role) seed21Req seed21Req_mem rfl rfl
    (fun pair mem slot pf => withoutElement_no_field (base 21) "controlledProductStrength" pair mem slot pf)
#print axioms bad21_not_satisfies
#print axioms seed21ScreenPresent
#print axioms seed21CompPresent
#print axioms seed21Member
#print axioms seed21Kind
#print axioms seed21Source
#print axioms seed21Lookup
#print axioms seed21Role
#print axioms seed21Req_mem

end Ehr.Check
