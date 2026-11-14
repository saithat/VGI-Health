import Ehr.Examples.Tiny
import Ehr.Props.Properties

/-! R7: a shortcut copy on night N becomes the sole control on night N+1. -/
namespace Ehr.Examples.TwoNightMoveTests
open Ehr Ehr.Props Ehr.Examples.Tiny

def original : Component :=
  { id := "original", tag := "two-night-control", kind := .button .back }
def shortcut : Component := { original with id := "shortcut", copyOf? := some original.id }
def base : Program := { program with screens := [
  { id := "old", title := "Old", workflow := "W1", components := [original] },
  { id := "new", title := "New", workflow := "W1", components := [] }] }
def nightN : Program := { base with screens := base.screens.map fun s =>
  if s.id == "new" then { s with components := [shortcut] } else s }
def nightNext : Program := { nightN with screens := nightN.screens.map fun s =>
  if s.id == "old" then { s with components := [] }
  else { s with components := s.components.map fun c => { c with copyOf? := none } } }
-- Deleting the original alone leaves copyOf pointing at a missing control.
-- This used to evade movedTags and even a zero StabilityBudget (R7 spec fix).
def orphanNext : Program := { nightN with screens := nightN.screens.map fun s =>
  if s.id == "old" then { s with components := [] } else s }

#guard movedTags base nightN == []
#guard movedTags nightN nightNext == [original.tag]
#guard !decide (StabilityBudget { spec with design := { spec.design with stabilityBudget := 0 } }
  (some nightN) nightNext)
#guard decide (StabilityBudget { spec with design := { spec.design with stabilityBudget := 1 } }
  (some nightN) nightNext)
#guard movedTags nightN orphanNext == [original.tag]
#guard !decide (StabilityBudget { spec with design := { spec.design with stabilityBudget := 0 } }
  (some nightN) orphanNext)
#guard decide (StabilityBudget { spec with design := { spec.design with stabilityBudget := 1 } }
  (some nightN) orphanNext)
#guard decide (StabilityBudget { spec with design := { spec.design with stabilityBudget := 0 } }
  (some base) nightN)

end Ehr.Examples.TwoNightMoveTests
