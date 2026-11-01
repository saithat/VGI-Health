import Ehr.Check.MissingWitness

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

private theorem seed18ScreenBound : 37 < noOpTechnique.screens.length := by decide +kernel
private theorem seed18CompBound : 41 < (noOpTechnique.screens[37]'seed18ScreenBound).components.length := by decide +kernel
private def seed18Witness : Screen × Component := indexedComp noOpTechnique 37 seed18ScreenBound 41 seed18CompBound
private theorem seed18Member : seed18Witness ∈ allComps noOpTechnique :=
  indexedComp_mem noOpTechnique 37 seed18ScreenBound 41 seed18CompBound
private theorem seed18Kind : seed18Witness.2.kind = .button (.commit "signOpNote") := by decide +kernel
private def seed18Commit := (specV1.commit? "signOpNote").getD default
private theorem seed18Lookup : specV1.commit? "signOpNote" = some seed18Commit := by decide +kernel
private theorem seed18Role : noOpTechnique.role ∈ seed18Commit.roles := by decide +kernel
private def seed18Req : EntryReq := { commit := "signOpNote", element := "opTechnique", when := .always, perOrderLine := false }
private theorem seed18Req_mem : seed18Req ∈ specV1.entries := by decide +kernel

/-- Seed 18: required `opTechnique` has no field anywhere in the program. -/
theorem bad18_not_satisfies : ¬ Satisfies specV1 none canonicalV1 noOpTechnique :=
  missing_required_not_satisfies specV1 canonicalV1 noOpTechnique "signOpNote"
    (required_of_component specV1 canonicalV1 noOpTechnique seed18Witness seed18Member "signOpNote"
      seed18Kind seed18Commit seed18Lookup seed18Role) seed18Req seed18Req_mem rfl
    (fun pair mem slot pf => withoutElement_no_field (forPersona specV1 canonicalV1 "seed18" .surgeon) "opTechnique" pair mem slot pf)
#print axioms bad18_not_satisfies
end Ehr.Check
