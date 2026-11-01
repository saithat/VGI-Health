import Ehr.Check.MissingWitness

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

private theorem seed21ScreenBound : 8 < noControlledStrength.screens.length := by decide +kernel
private theorem seed21CompBound : 57 < (noControlledStrength.screens[8]'seed21ScreenBound).components.length := by decide +kernel
private def seed21Witness : Screen × Component := indexedComp noControlledStrength 8 seed21ScreenBound 57 seed21CompBound
private theorem seed21Member : seed21Witness ∈ allComps noControlledStrength :=
  indexedComp_mem noControlledStrength 8 seed21ScreenBound 57 seed21CompBound
private theorem seed21Kind : seed21Witness.2.kind = .button (.commit "signOrders") := by decide +kernel
private def seed21Commit := (specV1.commit? "signOrders").getD default
private theorem seed21Lookup : specV1.commit? "signOrders" = some seed21Commit := by decide +kernel
private theorem seed21Role : noControlledStrength.role ∈ seed21Commit.roles := by decide +kernel
private def seed21Req : EntryReq := { commit := "signOrders", element := "controlledProductStrength", when := .orderClass "controlled-II-IV", perOrderLine := true }
private theorem seed21Req_mem : seed21Req ∈ specV1.entries := by decide +kernel

/-- Seed 21: required `controlledProductStrength` has no field anywhere in the program. -/
theorem bad21_not_satisfies : ¬ Satisfies specV1 none canonicalV1 noControlledStrength :=
  missing_required_not_satisfies specV1 canonicalV1 noControlledStrength "signOrders"
    (required_of_component specV1 canonicalV1 noControlledStrength seed21Witness seed21Member "signOrders"
      seed21Kind seed21Commit seed21Lookup seed21Role) seed21Req seed21Req_mem rfl
    (fun pair mem slot pf => withoutElement_no_field (base 21) "controlledProductStrength" pair mem slot pf)
#print axioms bad21_not_satisfies
end Ehr.Check
