import Ehr.Check.PatchWitness
import Ehr.Check.MacroBadProofs

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

comp_witness static2Witness, static2Member := prefilledIdentity[8][51]

private theorem static2Kind : fieldOf? static2Witness.2.kind = some ("patientIdReentry", .fixed 0, (.fromRecord "patientIdentity")) := by decide +kernel
private theorem static2Lookup : specV1.element? "patientIdReentry" = some patientIdReentry := by decide +kernel
private theorem static2Human : HumanMustEnter patientIdReentry := by decide

theorem bad02_not_satisfies : ¬ Satisfies specV1 none canonicalV1 prefilledIdentity :=
  rejects_human prefilledIdentity (humanPrefill_violation specV1 prefilledIdentity static2Witness static2Member
    "patientIdReentry" (.fixed 0) (.fromRecord "patientIdentity") static2Kind patientIdReentry static2Lookup static2Human (by decide))
#print axioms bad02_not_satisfies


end Ehr.Check
