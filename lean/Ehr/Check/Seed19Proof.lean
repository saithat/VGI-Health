import Ehr.Check.PatchWitness
import Ehr.Check.MissingWitness

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

private def seed19Screen : Screen := noVaccineProviderAddress.screens[29]?.getD default
private theorem seed19ScreenPresent : noVaccineProviderAddress.screens[29]?.isSome = true := by decide +kernel
private theorem seed19CompPresent : seed19Screen.components[20]?.isSome = true := by decide +kernel
@[irreducible] private def seed19Witness : Screen × Component :=
  (seed19Screen, seed19Screen.components[20]?.getD default)
private theorem seed19Member : seed19Witness ∈ allComps noVaccineProviderAddress := by
  unfold seed19Witness
  exact List.mem_flatMap.mpr ⟨seed19Screen,
    getD_mem noVaccineProviderAddress.screens 29 seed19ScreenPresent,
    List.mem_map.mpr ⟨_, getD_mem seed19Screen.components 20 seed19CompPresent, rfl⟩⟩
private theorem seed19Kind : seed19Witness.2.kind = .button (.commit "recordImmunization") := by decide +kernel
private def seed19Commit := (specV1.commit? "recordImmunization").getD default
private theorem seed19Lookup : specV1.commit? "recordImmunization" = some seed19Commit := by decide +kernel
private theorem seed19Role : noVaccineProviderAddress.role ∈ seed19Commit.roles := by decide +kernel
private def seed19Req : EntryReq := { commit := "recordImmunization", element := "vaccineProviderAddress", when := .always, perOrderLine := false }
private theorem seed19Req_mem : seed19Req ∈ specV1.entries := by decide +kernel

/-- Seed 19: required `vaccineProviderAddress` has no field anywhere in the program. -/
theorem bad19_not_satisfies : ¬ Satisfies specV1 none canonicalV1 noVaccineProviderAddress :=
  missing_required_not_satisfies specV1 canonicalV1 noVaccineProviderAddress "recordImmunization"
    (required_of_component specV1 canonicalV1 noVaccineProviderAddress seed19Witness seed19Member "recordImmunization"
      seed19Kind seed19Commit seed19Lookup seed19Role) seed19Req seed19Req_mem rfl
    (fun pair mem slot pf => withoutElement_no_field (forPersona specV1 canonicalV1 "seed19" .np) "vaccineProviderAddress" pair mem slot pf)
#print axioms bad19_not_satisfies
end Ehr.Check
