import Ehr.Canonical.Personas
import Ehr.Specs.CriticalResults
import Ehr.Check.Check

/-! Additive canonical successor for the follow-through specs. Original release
programs and the proofs about them remain intact. -/
namespace Ehr.Canonical.Urgency
open Ehr

def augment (p : Program) : Program :=
  { p with screens := p.screens.map fun s =>
    if Specs.CriticalResults.alert.targetsScreen s then
      { s with components := s.components ++
        [alertC s.id "workflowAlert.criticalResult" "criticalResult"
          Specs.CriticalResults.alert.label false] }
    else s }

def canonicalV1 := augment Canonical.canonicalV1
def canonicalV2 := augment Canonical.canonicalV2
def canonicalV3 := augment Canonical.canonicalV3

def releases : List (String × Spec × Program) :=
  [("v1", Specs.CriticalResults.specV1, canonicalV1),
   ("v2", Specs.CriticalResults.specV2, canonicalV2),
   ("v3", Specs.CriticalResults.specV3, canonicalV3)]

set_option maxRecDepth 16384 in
set_option maxHeartbeats 8000000 in
-- The all-workflow template contains fields for multiple roles; deployment
-- uses role projections. Every successor role baseline must pass the checker.
#guard releases.all fun (_, sp, p) => personaRoles.all fun (persona, role) =>
  let roleProgram := forPersona sp p persona role
  Check.check sp none roleProgram roleProgram == .ok
end Ehr.Canonical.Urgency
