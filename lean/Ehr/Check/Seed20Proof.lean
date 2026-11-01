import Ehr.Check.PatchWitness
import Ehr.Check.MissingWitness

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

private def seed20Screen : Screen := noAdministrationTime.screens[22]?.getD default
private theorem seed20ScreenPresent : noAdministrationTime.screens[22]?.isSome = true := by decide +kernel
private theorem seed20CompPresent : seed20Screen.components[25]?.isSome = true := by decide +kernel
@[irreducible] private def seed20Witness : Screen × Component :=
  (seed20Screen, seed20Screen.components[25]?.getD default)
private theorem seed20Member : seed20Witness ∈ allComps noAdministrationTime := by
  unfold seed20Witness
  exact List.mem_flatMap.mpr ⟨seed20Screen,
    getD_mem noAdministrationTime.screens 22 seed20ScreenPresent,
    List.mem_map.mpr ⟨_, getD_mem seed20Screen.components 25 seed20CompPresent, rfl⟩⟩
private theorem seed20Kind : seed20Witness.2.kind = .button (.commit "administerMed") := by decide +kernel
private def seed20Commit := (specV1.commit? "administerMed").getD default
private theorem seed20Lookup : specV1.commit? "administerMed" = some seed20Commit := by decide +kernel
private theorem seed20Role : noAdministrationTime.role ∈ seed20Commit.roles := by decide +kernel
private def seed20Req : EntryReq := { commit := "administerMed", element := "actualAdministrationTime", when := .always, perOrderLine := false }
private theorem seed20Req_mem : seed20Req ∈ specV1.entries := by decide +kernel

/-- Seed 20: required `actualAdministrationTime` has no field anywhere in the program. -/
theorem bad20_not_satisfies : ¬ Satisfies specV1 none canonicalV1 noAdministrationTime :=
  missing_required_not_satisfies specV1 canonicalV1 noAdministrationTime "administerMed"
    (required_of_component specV1 canonicalV1 noAdministrationTime seed20Witness seed20Member "administerMed"
      seed20Kind seed20Commit seed20Lookup seed20Role) seed20Req seed20Req_mem rfl
    (fun pair mem slot pf => withoutElement_no_field (forPersona specV1 canonicalV1 "seed20" .rn) "actualAdministrationTime" pair mem slot pf)
#print axioms bad20_not_satisfies
end Ehr.Check
