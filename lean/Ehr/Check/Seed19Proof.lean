import Ehr.Check.PatchWitness
import Ehr.Check.MissingWitness

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

-- Indices are in the current unmodified canonical program. Membership in the
-- bad program follows structurally, avoiding reduction of its persona macros.
@[irreducible] private def seed19Screen : Screen := canonicalV1.screens[30]?.getD default
private theorem seed19ScreenPresent : canonicalV1.screens[30]?.isSome = true := by decide +kernel
private theorem seed19CompPresent : seed19Screen.components[23]?.isSome = true := by decide +kernel
@[irreducible] private def seed19Component : Component := seed19Screen.components[23]?.getD default
private theorem seed19Kind : seed19Component.kind = .button (.commit "recordImmunization") := by decide +kernel
private theorem seed19Source : HasComponent canonicalV1 seed19Component :=
  ⟨seed19Screen,
    by unfold seed19Screen; exact getD_mem canonicalV1.screens 30 seed19ScreenPresent,
    by unfold seed19Component; exact getD_mem seed19Screen.components 23 seed19CompPresent⟩
private theorem seed19Member : HasComponent noVaccineProviderAddress seed19Component := by
  apply hasComponent_withoutElement _ "vaccineProviderAddress" seed19Component
  · apply hasComponent_forPersona specV1 canonicalV1 "seed19" .np seed19Component seed19Source
    · simp [roleComponentAllowed, seed19Kind]
      decide
    · simp [seed19Kind, macroOf?]
  · simp [seed19Kind, fieldOf?]
private def seed19Commit := (specV1.commit? "recordImmunization").getD default
private theorem seed19Lookup : specV1.commit? "recordImmunization" = some seed19Commit := by decide +kernel
private theorem seed19Role : noVaccineProviderAddress.role ∈ seed19Commit.roles := by decide +kernel
private def seed19Req : EntryReq := { commit := "recordImmunization", element := "vaccineProviderAddress", when := .always, perOrderLine := false }
private theorem seed19Req_mem : seed19Req ∈ specV1.entries := by decide +kernel

/-- Seed 19: required `vaccineProviderAddress` has no field anywhere in the program. -/
theorem bad19_not_satisfies : ¬ Satisfies specV1 none canonicalV1 noVaccineProviderAddress := by
  obtain ⟨pair, member, component⟩ := hasComponent_pair seed19Member
  exact missing_required_not_satisfies specV1 canonicalV1 noVaccineProviderAddress "recordImmunization"
    (required_of_component specV1 canonicalV1 noVaccineProviderAddress pair member "recordImmunization"
      (by rw [component]; exact seed19Kind) seed19Commit seed19Lookup seed19Role) seed19Req seed19Req_mem rfl rfl
    (fun pair mem slot pf => withoutElement_no_field (forPersona specV1 canonicalV1 "seed19" .np) "vaccineProviderAddress" pair mem slot pf)
#print axioms bad19_not_satisfies
#print axioms seed19ScreenPresent
#print axioms seed19CompPresent
#print axioms seed19Member
#print axioms seed19Kind
#print axioms seed19Source
#print axioms seed19Lookup
#print axioms seed19Role
#print axioms seed19Req_mem

end Ehr.Check
