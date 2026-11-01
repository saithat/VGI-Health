import Ehr.Check.TinyRejections
import Ehr.Check.PatchWitness
import Ehr.Check.ViolationWitness
import Ehr.Check.MissingWitness
import Ehr.Check.PinSound
import Ehr.Check.ReleaseChecks
import Ehr.Check.MonotonicityObstruction
import Ehr.Check.Monotonicity
import Ehr.Check.ContractSound
import Ehr.Check.ContractTests
import Ehr.Check.NavigationSound
import Ehr.Check.NavigationTests
import Ehr.Check.EntryConstruction
import Ehr.Check.RejectionObstruction
import Ehr.Check.RequestSound
import Ehr.Check.PartialSound
import Ehr.Check.SeveritySound
import Ehr.Check.BudgetSound
import Ehr.Check.DomainObstruction
import Ehr.Check.DisplayObstruction
import Ehr.Check.CertificationTests
import Ehr.Check.WritesSound
import Ehr.Check.EnterOnceSound
import Ehr.Check.HumanSound
import Ehr.Check.HumanEventsSound
import Ehr.Check.AlertSound
import Ehr.Check.ValueTests
import Ehr.Check.ValueWitness
import Ehr.Check.Sound
import Ehr.Check.SeedTests
import Ehr.Props.Examples

namespace Ehr.Check.Tests
open Ehr Ehr.Check Ehr.Props Ehr.Examples.Tiny Ehr.Props.Examples

#guard check spec none goodProgram goodProgram == .ok
example : NavigationSane goodProgram := accepted_navigation spec none goodProgram goodProgram (by decide)
#guard match firstFinding (rules spec none goodProgram program) with
  | some f => f.property == "noFalseAlarms" && (counterexample spec program f).2.2
  | none => false

/-- CR-1 lets a current-slot composer add lines without stranding unfinished ones. -/
def withAddLine : Program :=
  { goodProgram with screens := [roomingScreen, orderScreen, goodSignScreen].map pinTinyAlerts }

#guard check spec none withAddLine withAddLine == .ok

/-- Current-slot fields cannot repair an unrelated fixed slot after advancing. -/
def mismatchedSlots : Program :=
  { withAddLine with screens := withAddLine.screens.map fun scr =>
      { scr with components := scr.components.map fun c =>
          if c.id == "drugField" then { c with kind := .field "drug" (.fixed 7) .none }
          else c } }
#guard (completeFor spec mismatchedSlots "signOrders").isSome

/-- CR-6 is integrated: the extended catalog and safe request action certify. -/
def withRequest : Program :=
  { goodProgram with screens := goodProgram.screens.map fun scr =>
      if scr.id == "order" then
        { scr with components := scr.components ++
            [{ id := "request", kind := .button .requestPriorAuth }] }
      else scr }
#guard withRequest.inCatalog specV1_1
#guard check specV1_1 none goodProgram withRequest == .ok

def automatedRequest : Program :=
  { withRequest with macros := withRequest.macros ++
      [{ id := "autoRequest", label := "Auto request", steps := [.click "request"] }] }
#guard match firstFinding (Ehr.Check.rules specV1_1 none goodProgram automatedRequest) with
  | some f => f.property == "humanOnlyKept" && (counterexample specV1_1 automatedRequest f).2.2
  | none => false

/-- The acceptance theorem has concrete, satisfiable hypotheses. -/
example : CatalogOnly spec goodProgram ∧ SpecIdsUnique spec ∧ IdsUnique goodProgram := by
  have h := accepted_structural spec none goodProgram goodProgram (by decide)
  exact ⟨h.1, h.2.1, h.2.2.1⟩

def hiddenReview : Finding where
  property := "reviewsBeforeCommit"
  message := "allergies hidden"
  screen? := some "sign"
  click? := some "signButton"

example : ValidCounterexample spec program (counterexample spec program hiddenReview).1 :=
  T7_counterexample_replays _ _ _
end Ehr.Check.Tests
