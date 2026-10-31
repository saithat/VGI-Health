import Ehr.Check.PinSound
import Ehr.Props.Examples

namespace Ehr.Check.Tests
open Ehr Ehr.Check Ehr.Props Ehr.Examples.Tiny Ehr.Props.Examples

#guard check spec none goodProgram goodProgram == .ok
#guard match firstFinding (rules spec none goodProgram program) with
  | some f => f.property == "noFalseAlarms" && (counterexample spec program f).2.2
  | none => false

/-- CR-1 lets a current-slot composer add lines without stranding unfinished ones. -/
def withAddLine : Program :=
  { goodProgram with screens := [roomingScreen, orderScreen, goodSignScreen] }

#guard check spec none withAddLine withAddLine == .ok

/-- Current-slot fields cannot repair an unrelated fixed slot after advancing. -/
def mismatchedSlots : Program :=
  { withAddLine with screens := withAddLine.screens.map fun scr =>
      { scr with components := scr.components.map fun c =>
          if c.id == "drugField" then { c with kind := .field "drug" (.fixed 7) .none }
          else c } }
#guard (completeFor spec mismatchedSlots "signOrders").isSome

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
