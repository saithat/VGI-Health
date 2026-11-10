import Ehr.Check.PatchWitness
import Ehr.Check.MissingWitness

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

-- Indices are in the current unmodified canonical program. Membership in the
-- bad program follows structurally, avoiding reduction of its persona macros.
@[irreducible] private def seed18Screen : Screen := canonicalV1.screens[39]?.getD default
private theorem seed18ScreenPresent : canonicalV1.screens[39]?.isSome = true := by decide +kernel
private theorem seed18CompPresent : seed18Screen.components[30]?.isSome = true := by decide +kernel
@[irreducible] private def seed18Component : Component := seed18Screen.components[30]?.getD default
private theorem seed18Kind : seed18Component.kind = .button (.commit "signOpNote") := by decide +kernel
private theorem seed18Source : HasComponent canonicalV1 seed18Component :=
  ⟨seed18Screen,
    by unfold seed18Screen; exact getD_mem canonicalV1.screens 39 seed18ScreenPresent,
    by unfold seed18Component; exact getD_mem seed18Screen.components 30 seed18CompPresent⟩
private theorem seed18Member : HasComponent noOpTechnique seed18Component := by
  apply hasComponent_withoutElement _ "opTechnique" seed18Component
  · apply hasComponent_forPersona specV1 canonicalV1 "seed18" .surgeon seed18Component seed18Source
    · simp [roleComponentAllowed, seed18Kind]
      decide
    · simp [seed18Kind, macroOf?]
  · simp [seed18Kind, fieldOf?]
private def seed18Commit := (specV1.commit? "signOpNote").getD default
private theorem seed18Lookup : specV1.commit? "signOpNote" = some seed18Commit := by decide +kernel
private theorem seed18Role : noOpTechnique.role ∈ seed18Commit.roles := by decide +kernel
private def seed18Req : EntryReq := { commit := "signOpNote", element := "opTechnique", when := .always, perOrderLine := false }
private theorem seed18Req_mem : seed18Req ∈ specV1.entries := by decide +kernel

/-- Seed 18: required `opTechnique` has no field anywhere in the program. -/
theorem bad18_not_satisfies : ¬ Satisfies specV1 none canonicalV1 noOpTechnique := by
  obtain ⟨pair, member, component⟩ := hasComponent_pair seed18Member
  exact missing_required_not_satisfies specV1 canonicalV1 noOpTechnique "signOpNote"
    (required_of_component specV1 canonicalV1 noOpTechnique pair member "signOpNote"
      (by rw [component]; exact seed18Kind) seed18Commit seed18Lookup seed18Role) seed18Req seed18Req_mem rfl rfl
    (fun pair mem slot pf => withoutElement_no_field (forPersona specV1 canonicalV1 "seed18" .surgeon) "opTechnique" pair mem slot pf)
#print axioms bad18_not_satisfies
#print axioms seed18ScreenPresent
#print axioms seed18CompPresent
#print axioms seed18Member
#print axioms seed18Kind
#print axioms seed18Source
#print axioms seed18Lookup
#print axioms seed18Role
#print axioms seed18Req_mem

end Ehr.Check
