import Ehr.Check.MissingWitness

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

private theorem seed17ScreenBound : 43 < noRestraintCarePlan.screens.length := by decide +kernel
private theorem seed17CompBound : 30 < (noRestraintCarePlan.screens[43]'seed17ScreenBound).components.length := by decide +kernel
private def seed17Witness : Screen × Component := indexedComp noRestraintCarePlan 43 seed17ScreenBound 30 seed17CompBound
private theorem seed17Member : seed17Witness ∈ allComps noRestraintCarePlan :=
  indexedComp_mem noRestraintCarePlan 43 seed17ScreenBound 30 seed17CompBound
private theorem seed17Kind : seed17Witness.2.kind = .button (.commit "signRestraintOrder") := by decide +kernel
private def seed17Commit := (specV1.commit? "signRestraintOrder").getD default
private theorem seed17Lookup : specV1.commit? "signRestraintOrder" = some seed17Commit := by decide +kernel
private theorem seed17Role : noRestraintCarePlan.role ∈ seed17Commit.roles := by decide +kernel
private def seed17Req : EntryReq := { commit := "signRestraintOrder", element := "restraintCarePlanChange", when := .always, perOrderLine := false }
private theorem seed17Req_mem : seed17Req ∈ specV1.entries := by decide +kernel

/-- Seed 17: required `restraintCarePlanChange` has no field anywhere in the program. -/
theorem bad17_not_satisfies : ¬ Satisfies specV1 none canonicalV1 noRestraintCarePlan :=
  missing_required_not_satisfies specV1 canonicalV1 noRestraintCarePlan "signRestraintOrder"
    (required_of_component specV1 canonicalV1 noRestraintCarePlan seed17Witness seed17Member "signRestraintOrder"
      seed17Kind seed17Commit seed17Lookup seed17Role) seed17Req seed17Req_mem rfl
    (fun pair mem slot pf => withoutElement_no_field (base 17) "restraintCarePlanChange" pair mem slot pf)
#print axioms bad17_not_satisfies
end Ehr.Check
