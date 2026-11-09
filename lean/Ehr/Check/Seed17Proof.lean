import Ehr.Check.PatchWitness
import Ehr.Check.MissingWitness

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

-- Indices are in the current unmodified canonical program. Membership in the
-- bad program follows structurally, avoiding reduction of its persona macros.
@[irreducible] private def seed17Screen : Screen := canonicalV1.screens[15]?.getD default
private theorem seed17ScreenPresent : canonicalV1.screens[15]?.isSome = true := by decide +kernel
private theorem seed17CompPresent : seed17Screen.components[50]?.isSome = true := by decide +kernel
@[irreducible] private def seed17Component : Component := seed17Screen.components[50]?.getD default
private theorem seed17Kind : seed17Component.kind = .button (.commit "signRestraintOrder") := by decide +kernel
private theorem seed17Source : HasComponent canonicalV1 seed17Component :=
  ⟨seed17Screen,
    by unfold seed17Screen; exact getD_mem canonicalV1.screens 15 seed17ScreenPresent,
    by unfold seed17Component; exact getD_mem seed17Screen.components 50 seed17CompPresent⟩
private theorem seed17Member : HasComponent noRestraintCarePlan seed17Component := by
  apply hasComponent_withoutElement _ "restraintCarePlanChange" seed17Component
  · apply hasComponent_forPersona specV1 canonicalV1 "seed17" .physician seed17Component seed17Source
    · simp [roleComponentAllowed, seed17Kind]
      decide
    · simp [seed17Kind, macroOf?]
  · simp [seed17Kind, fieldOf?]
private def seed17Commit := (specV1.commit? "signRestraintOrder").getD default
private theorem seed17Lookup : specV1.commit? "signRestraintOrder" = some seed17Commit := by decide +kernel
private theorem seed17Role : noRestraintCarePlan.role ∈ seed17Commit.roles := by decide +kernel
private def seed17Req : EntryReq := { commit := "signRestraintOrder", element := "restraintCarePlanChange", when := .always, perOrderLine := false }
private theorem seed17Req_mem : seed17Req ∈ specV1.entries := by decide +kernel

/-- Seed 17: required `restraintCarePlanChange` has no field anywhere in the program. -/
theorem bad17_not_satisfies : ¬ Satisfies specV1 none canonicalV1 noRestraintCarePlan := by
  obtain ⟨pair, member, component⟩ := hasComponent_pair seed17Member
  exact missing_required_not_satisfies specV1 canonicalV1 noRestraintCarePlan "signRestraintOrder"
    (required_of_component specV1 canonicalV1 noRestraintCarePlan pair member "signRestraintOrder"
      (by rw [component]; exact seed17Kind) seed17Commit seed17Lookup seed17Role) seed17Req seed17Req_mem rfl rfl
    (fun pair mem slot pf => withoutElement_no_field (base 17) "restraintCarePlanChange" pair mem slot pf)
#print axioms bad17_not_satisfies
#print axioms seed17ScreenPresent
#print axioms seed17CompPresent
#print axioms seed17Member
#print axioms seed17Kind
#print axioms seed17Source
#print axioms seed17Lookup
#print axioms seed17Role
#print axioms seed17Req_mem

end Ehr.Check
