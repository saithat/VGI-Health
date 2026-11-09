import Ehr.Check.PatchWitness
import Ehr.Canonical.BadPrograms

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

comp_witness witness, member := defaultRefillEligibility[42][20]
private theorem kind : fieldOf? witness.2.kind =
    some ("refillScheduleEligibility", .fixed 0, .default "notScheduleII") := by decide +kernel
private def element := (specV1.element? "refillScheduleEligibility").getD default
private theorem lookup : specV1.element? "refillScheduleEligibility" = some element := by decide +kernel
private theorem human : HumanMustEnter element := by decide +kernel

/-- Seed 24 attempts to default the human schedule-eligibility attestation. -/
theorem bad24_not_satisfies : ¬ Satisfies specV1 none canonicalV1 defaultRefillEligibility := by
  intro hs
  exact humanPrefill_violation specV1 defaultRefillEligibility witness member
    "refillScheduleEligibility" (.fixed 0) (.default "notScheduleII") kind
    element lookup human (by decide) hs.2.2.2.2.1.1

#print axioms bad24_not_satisfies
end Ehr.Check
