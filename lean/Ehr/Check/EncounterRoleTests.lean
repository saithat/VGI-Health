import Ehr.Proofs.T3
import Ehr.Check.DomainObstruction
import Ehr.Check.EncounterSound
import Ehr.Canonical.CoreWorkflowTests

/-! Named executable witnesses use the actual persona programs and human events.
The general safety proof is kernel checked; walkthroughs use #guard to avoid
whole-canonical kernel reduction in the default build. -/
namespace Ehr.Check.EncounterRoleTests
open Ehr Ehr.Canonical Ehr.Canonical.CoreTests Ehr.Specs.V1

def p4 : Program := forPersona specV1 canonicalV1 "P4" .np
def p5 : Program := forPersona specV1 canonicalV1 "P5" .surgeon
def clinicFacts : Facts := { child with encounterKind? := some "clinic" }
def preopChild : Facts := { child with encounterKind? := some "preop" }

/-- An NP completes ordinary clinic prescribing on the P4 canonical. -/
def npClinicSigns : State :=
  finish (run w5Path p4 clinicFacts np) "w5Sign" "signOrders" p4 clinicFacts np
#guard Specs.ruleProfile == .full || npClinicSigns.commits == ["signOrders"]

/-- The same P4 signature is blocked in pre-op, before any entry or alert check. -/
def npPreopReady : State := run w5Path p4 preopChild np
#guard guardReason specV1 p4 preopChild np npPreopReady "signOrders" ==
  "Pre-op orders are signed by a physician or surgeon"
#guard (one npPreopReady (.click "w5Sign.commit.signOrders") p4 preopChild np).2 ==
  .blocked "Pre-op orders are signed by a physician or surgeon"

/-- All hypotheses of the general refusal theorem hold for the actual P4 episode. -/
example : ¬ Props.CommitHappens ⟨specV1, p4, preopChild, np⟩ (default : State) .human
    (.click "w5Sign.commit.signOrders") "signOrders" :=
  np_preop_never_signs p4 preopChild np rfl rfl (default : State) .human _

/-- A surgeon signs on P5 after the unchanged three pre-op captures. -/
def surgeonPreopReady : State := run preOpPath p5 preOpFacts surgeon
#guard Specs.ruleProfile == .full ||
  ["consentVerified", "hpUpdate", "medsToHold"].all fun e =>
    (cap surgeonPreopReady e).any (fun x => x.confirmed && x.byHuman)
def surgeonPreopSigns : State :=
  finish surgeonPreopReady "w6Sign" "signOrders" p5 preOpFacts surgeon
#guard Specs.ruleProfile == .full || surgeonPreopSigns.commits == ["signOrders"]

/-- The entry and permission rules use the same encounter matcher. -/
example (facts : Facts) (s : State) : whenHolds facts s (.encounter "preop") =
    encounterMatches facts.encounterKind? "preop" := rfl

-- Old JSON without the optional restriction still permits the ordinary role.
#guard (Lean.fromJson? (α := CommitSpec)
  (Lean.Json.mkObj [("id", "signOrders"), ("label", "Sign"),
    ("roles", Lean.toJson ([Role.np] : List Role))])).toOption.any
      (fun cs => cs.encounterRoles?.isNone && cs.encounterRoleAllowed (some "preop") .np)
end Ehr.Check.EncounterRoleTests
