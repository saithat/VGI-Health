import Ehr.Check.PatchWitness
import Ehr.Check.MissingWitness

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

-- Indices are in the current unmodified canonical program. Membership in the
-- bad program follows structurally, avoiding reduction of its persona macros.
@[irreducible] private def seed23Screen : Screen := canonicalV1.screens[1]?.getD default
private theorem seed23ScreenPresent : canonicalV1.screens[1]?.isSome = true := by decide +kernel
private theorem seed23CompPresent : seed23Screen.components[52]?.isSome = true := by decide +kernel
@[irreducible] private def seed23Component : Component := seed23Screen.components[52]?.getD default
private theorem seed23Kind : seed23Component.kind = .button (.commit "recordTelehealthConsent") := by decide +kernel
private theorem seed23Source : HasComponent canonicalV1 seed23Component :=
  ⟨seed23Screen,
    by unfold seed23Screen; exact getD_mem canonicalV1.screens 1 seed23ScreenPresent,
    by unfold seed23Component; exact getD_mem seed23Screen.components 52 seed23CompPresent⟩
private theorem seed23Member : HasComponent noTelehealthConsent seed23Component := by
  apply hasComponent_withoutElement _ "telehealthConsentRecord" seed23Component
  · apply hasComponent_forPersona specV1 canonicalV1 "seed23" .physician seed23Component seed23Source
    · simp [roleComponentAllowed, seed23Kind]
      decide
    · simp [seed23Kind, macroOf?]
  · simp [seed23Kind, fieldOf?]
private def seed23Commit := (specV1.commit? "recordTelehealthConsent").getD default
private theorem seed23Lookup : specV1.commit? "recordTelehealthConsent" = some seed23Commit := by decide +kernel
private theorem seed23Role : noTelehealthConsent.role ∈ seed23Commit.roles := by decide +kernel
private def seed23Req : EntryReq := { commit := "recordTelehealthConsent", element := "telehealthConsentRecord", when := .always, perOrderLine := false, allowed? := some ["verbal", "written"] }
private theorem seed23Req_mem : seed23Req ∈ specV1.entries := by decide +kernel

/-- Seed 23: required `telehealthConsentRecord` has no field anywhere in the program. -/
theorem bad23_not_satisfies : ¬ Satisfies specV1 none canonicalV1 noTelehealthConsent := by
  obtain ⟨pair, member, component⟩ := hasComponent_pair seed23Member
  exact missing_required_not_satisfies specV1 canonicalV1 noTelehealthConsent "recordTelehealthConsent"
    (required_of_component specV1 canonicalV1 noTelehealthConsent pair member "recordTelehealthConsent"
      (by rw [component]; exact seed23Kind) seed23Commit seed23Lookup seed23Role) seed23Req seed23Req_mem rfl rfl
    (fun pair mem slot pf => withoutElement_no_field (base 23) "telehealthConsentRecord" pair mem slot pf)
#print axioms bad23_not_satisfies
#print axioms seed23ScreenPresent
#print axioms seed23CompPresent
#print axioms seed23Member
#print axioms seed23Kind
#print axioms seed23Source
#print axioms seed23Lookup
#print axioms seed23Role
#print axioms seed23Req_mem

end Ehr.Check
