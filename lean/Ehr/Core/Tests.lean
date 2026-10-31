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
end Ehr.CoreTests
