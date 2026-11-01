import Ehr.Check.MissingWitness

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

private theorem seed23ScreenBound : 60 < noTelehealthConsent.screens.length := by decide +kernel
private theorem seed23CompBound : 13 < (noTelehealthConsent.screens[60]'seed23ScreenBound).components.length := by decide +kernel
private def seed23Witness : Screen × Component := indexedComp noTelehealthConsent 60 seed23ScreenBound 13 seed23CompBound
private theorem seed23Member : seed23Witness ∈ allComps noTelehealthConsent :=
  indexedComp_mem noTelehealthConsent 60 seed23ScreenBound 13 seed23CompBound
private theorem seed23Kind : seed23Witness.2.kind = .button (.commit "recordTelehealthConsent") := by decide +kernel
private def seed23Commit := (specV1.commit? "recordTelehealthConsent").getD default
private theorem seed23Lookup : specV1.commit? "recordTelehealthConsent" = some seed23Commit := by decide +kernel
private theorem seed23Role : noTelehealthConsent.role ∈ seed23Commit.roles := by decide +kernel
private def seed23Req : EntryReq := { commit := "recordTelehealthConsent", element := "telehealthConsentRecord", when := .always, perOrderLine := false, allowed? := some ["verbal", "written"] }
private theorem seed23Req_mem : seed23Req ∈ specV1.entries := by decide +kernel

/-- Seed 23: required `telehealthConsentRecord` has no field anywhere in the program. -/
theorem bad23_not_satisfies : ¬ Satisfies specV1 none canonicalV1 noTelehealthConsent :=
  missing_required_not_satisfies specV1 canonicalV1 noTelehealthConsent "recordTelehealthConsent"
    (required_of_component specV1 canonicalV1 noTelehealthConsent seed23Witness seed23Member "recordTelehealthConsent"
      seed23Kind seed23Commit seed23Lookup seed23Role) seed23Req seed23Req_mem rfl
    (fun pair mem slot pf => withoutElement_no_field (base 23) "telehealthConsentRecord" pair mem slot pf)
#print axioms bad23_not_satisfies
end Ehr.Check
