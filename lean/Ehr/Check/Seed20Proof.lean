import Ehr.Check.PatchWitness
import Ehr.Check.MissingWitness

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

-- Indices are in the current unmodified canonical program. Membership in the
-- bad program follows structurally, avoiding reduction of its persona macros.
@[irreducible] private def seed20Screen : Screen := canonicalV1.screens[22]?.getD default
private theorem seed20ScreenPresent : canonicalV1.screens[22]?.isSome = true := by decide +kernel
private theorem seed20CompPresent : seed20Screen.components[28]?.isSome = true := by decide +kernel
@[irreducible] private def seed20Component : Component := seed20Screen.components[28]?.getD default
private theorem seed20Kind : seed20Component.kind = .button (.commit "administerMed") := by decide +kernel
private theorem seed20Source : HasComponent canonicalV1 seed20Component :=
  ⟨seed20Screen,
    by unfold seed20Screen; exact getD_mem canonicalV1.screens 22 seed20ScreenPresent,
    by unfold seed20Component; exact getD_mem seed20Screen.components 28 seed20CompPresent⟩
private theorem seed20Member : HasComponent noAdministrationTime seed20Component := by
  apply hasComponent_withoutElement _ "actualAdministrationTime" seed20Component
  · apply hasComponent_forPersona specV1 canonicalV1 "seed20" .rn seed20Component seed20Source
    · simp [roleComponentAllowed, seed20Kind]
      decide
    · simp [seed20Kind, macroOf?]
  · simp [seed20Kind, fieldOf?]
private def seed20Commit := (specV1.commit? "administerMed").getD default
private theorem seed20Lookup : specV1.commit? "administerMed" = some seed20Commit := by decide +kernel
private theorem seed20Role : noAdministrationTime.role ∈ seed20Commit.roles := by decide +kernel
private def seed20Req : EntryReq := { commit := "administerMed", element := "actualAdministrationTime", when := .always, perOrderLine := false }
private theorem seed20Req_mem : seed20Req ∈ specV1.entries := by decide +kernel

/-- Seed 20: required `actualAdministrationTime` has no field anywhere in the program. -/
theorem bad20_not_satisfies : ¬ Satisfies specV1 none canonicalV1 noAdministrationTime := by
  obtain ⟨pair, member, component⟩ := hasComponent_pair seed20Member
  exact missing_required_not_satisfies specV1 canonicalV1 noAdministrationTime "administerMed"
    (required_of_component specV1 canonicalV1 noAdministrationTime pair member "administerMed"
      (by rw [component]; exact seed20Kind) seed20Commit seed20Lookup seed20Role) seed20Req seed20Req_mem rfl rfl
    (fun pair mem slot pf => withoutElement_no_field (forPersona specV1 canonicalV1 "seed20" .rn) "actualAdministrationTime" pair mem slot pf)
#print axioms bad20_not_satisfies
#print axioms seed20ScreenPresent
#print axioms seed20CompPresent
#print axioms seed20Member
#print axioms seed20Kind
#print axioms seed20Source
#print axioms seed20Lookup
#print axioms seed20Role
#print axioms seed20Req_mem

end Ehr.Check
