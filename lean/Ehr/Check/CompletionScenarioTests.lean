import Ehr.Check.CompletionScenario
import Ehr.Sim.MinClicksTests

namespace Ehr.Check.CompletionModel.Tests
open Ehr Ehr.Sim Ehr.Sim.MinClicksTests Ehr.Sim.Certificate

def microCheck (space : SearchSpace) :=
  check (scenarioGraph microCtx (planningMoves microCtx space)) (forgetHistory microStart) 100

/- Existing minimum-click success is insufficient: navigating to the sign
screen before entering X leaves no return route in this two-screen program. -/
#guard match microCheck .full with
  | .rejected [.click "next"] _ _ _ => true
  | _ => false

/- The restricted planner forbids that premature navigation. Its narrower
AG EF claim holds, and must not be reported as arbitrary-event completion. -/
#guard match microCheck .navigationDirected with | .accepted _ _ _ => true | _ => false

def microAlphabet : List Event := [.enter "x" (.text "ok"), .click "next", .click "sign"]
#guard match check (scenarioGraph microCtx (alphabetMoves microCtx microAlphabet))
    (forgetHistory microStart) 100 with
  | .rejected [.click "next"] _ _ _ => true
  | _ => false

def microTrap := forgetHistory (microCtx.next microStart (.click "next"))
def microLosing : Candidate State :=
  put (scenarioGraph microCtx (alphabetMoves microCtx microAlphabet)) {} microTrap 0

/-- The concrete trap and its closed losing region also check in the kernel,
independently of the native explorer and reverse BFS. -/
theorem micro_trap_certificate : reject (scenarioGraph microCtx (alphabetMoves microCtx microAlphabet))
    (forgetHistory microStart) [.click "next"] microLosing = true := by decide

theorem micro_trap : ∃ s n,
    Run (scenarioReal microCtx (alphabetMoves microCtx microAlphabet)) microStart [.click "next"] s n ∧
    ∀ es t cost, Run (scenarioReal microCtx (alphabetMoves microCtx microAlphabet)) s es t cost → microCtx.done t = false :=
  rejected_scenario microCtx _ micro_trap_certificate

/-- Repair the trap with a return route; the exact alphabet now permits
all safe interleavings, including premature navigation and repeated edits. -/
def repairedCtx : Context := { microCtx with prog := { microProgram with
  screens := microProgram.screens.map fun sc => if sc.id == "b" then
    { sc with components := sc.components ++ [{ id := "return", kind := .button (.goto "a") }] }
    else sc } }
def repairedAlphabet : List Event := microAlphabet ++ [.click "return"]
def repairedMoves := alphabetMoves repairedCtx repairedAlphabet
def repairedStart := init repairedCtx.sp repairedCtx.prog repairedCtx.facts repairedCtx.user
def repairedCheck := check (scenarioGraph repairedCtx repairedMoves) (forgetHistory repairedStart) 100

#guard match repairedCheck with | .accepted _ _ _ => true | _ => false

/-- Independent six-state certificate, checked by kernel reduction. -/
def repairedCertificate : Candidate State :=
  let base := forgetHistory repairedStart
  let entered : Captured := { element := "x", slot := 0, value := .text "ok", byHuman := true, confirmed := true }
  [({ base with screen := "a" }, 3), ({ base with screen := "b" }, 4),
   ({ base with screen := "a", captured := [entered] }, 2),
   ({ base with screen := "b", captured := [entered] }, 1),
   ({ base with screen := "a", captured := [entered], commits := ["signNote"] }, 0),
   ({ base with screen := "b", captured := [entered], commits := ["signNote"] }, 0)].foldl
    (fun table row => put (scenarioGraph repairedCtx repairedMoves) table row.1 row.2) {}

theorem repaired_certificate_accepts : accept (scenarioGraph repairedCtx repairedMoves)
    (forgetHistory repairedStart) repairedCertificate = true := by decide

/-- Instantiate the public soundness theorem on a kernel-checked real task. -/
theorem micro_recovery {es s n}
    (reach : Run (scenarioReal repairedCtx repairedMoves) repairedStart es s n) :
    ∃ repair t cost, Run (scenarioReal repairedCtx repairedMoves) s repair t cost ∧
      repairedCtx.done (runAll repairedCtx.sp repairedCtx.prog repairedCtx.facts repairedCtx.user .human s repair) = true :=
  accepted_scenario repairedCtx repairedMoves repaired_certificate_accepts reach

#print axioms repaired_certificate_accepts
#print axioms micro_recovery
#print axioms micro_trap_certificate
#print axioms micro_trap
end Ehr.Check.CompletionModel.Tests
