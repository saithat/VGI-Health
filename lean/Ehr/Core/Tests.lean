import Ehr.Examples.TinyTests

namespace Ehr.CoreTests
open Ehr.Examples.Tiny Ehr.Examples.TinyTests

def addLine : Component := { id := "add", kind := .button .newOrderLine }
def incomplete : State :=
  run atOrder [.enter "drugField" (.code "amoxicillin")]
#guard !currentLineComplete spec facts user incomplete
#guard clickCore spec program facts user .human incomplete addLine ==
  (incomplete, .blocked "finish this order line first")
#guard (clickCore spec program facts user .«macro» incomplete addLine).1 == incomplete
#guard currentLineComplete spec facts user atOrder
#guard (clickCore spec program facts user .human atOrder addLine).1.currentSlot == 1
#guard currentLineComplete spec facts user atSignAmox
#guard (clickCore spec program facts user .human atSignAmox addLine).1.currentSlot == 1
-- Inline alerts never acknowledge themselves; macros stop with a reason.
def inlineAlert : Component := { id := "alert", kind := .alert "drugAllergy" false }
#guard clickCore spec program facts user .human atSignAmox inlineAlert == (atSignAmox, .ignored)
#guard clickCore spec program facts user .«macro» atSignAmox inlineAlert ==
  (atSignAmox, .blocked "human only: acknowledge")
#guard (step spec program facts user .«macro» atSignAmox (.click "drugAllergyAlert")).2 ==
  .blocked "human only: acknowledge"
#guard (step spec program facts user .human popped.1 (.click "drugAllergyAlert")).1 == popped.1
#guard (step spec program facts user .human popped.1 (.ack "drugAllergy")).1.acked ==
  [("drugAllergy", "amoxicillin@3")]
-- Episode conditions are exact and per-line weight tests use that line's drug.
#guard !whenHolds facts atSignAmox (.encounter "preop")
#guard whenHolds { facts with encounterKind? := some "preop" } atSignAmox (.encounter "preop")
#guard !whenHolds { facts with encounterKind? := some "postop" } atSignAmox (.encounter "preop")
#guard whenHolds facts atSignAmox .weightBased
#guard !whenHolds facts (orderState "metformin" 5000 none) .weightBased
#guard lineMatches facts atSignAmox .weightBased 1 "amoxicillin"
#guard !lineMatches facts atSignAmox .weightBased 1 "metformin"

def weightSpec : ElementSpec := (spec.element? "weight").getD default
#guard prefillRecord { facts with record := [("weightYesterday", "20")] }
  s0 "weight" weightSpec 0 (.fromRecord "weightYesterday") == none
#guard (prefillRecord facts s0 "weight" weightSpec 0 (.fromRecord "weightToday")).isSome
#guard (prefillRecord { facts with weightToday? := some (440, .lb) }
  s0 "weight" weightSpec 0 (.fromRecord "weightToday")).map (·.value) == some (.qty 440 .lb)
#guard prefillRecord facts s0 "weight" { weightSpec with recordFact? := none } 0
  (.fromRecord "weightToday") == none

def passive : AlertSpec :=
  { id := "careGap", label := "Care gaps", cond := .careGap, tier := .passive
    commit := "signOrders", screens := ["W1"] }
#guard passive.targetsScreen { id := "renamed", title := "New layout", workflow := "W1", components := [] }
#guard !passive.targetsScreen { id := "order", title := "Other", workflow := "W5", components := [] }
end Ehr.CoreTests
