import Ehr.Check.Rules
import Ehr.Examples.Tiny

namespace Ehr.Check
open Ehr Ehr.Examples.Tiny

/-- A scalar witness chosen by the constraint checker is valid in every
patient/user context, including its exact quantity unit and checked flag. -/
theorem universallyValid_sound (facts : Facts) (user : User) (kind : ValueKind) (value : Value)
    (h : universallyValid kind value = true) : valueSatisfies facts user kind value = true := by
  cases kind <;> cases value <;> simp_all [universallyValid, valueSatisfies, valueAccepted]

private def constrainDose (values : List String) : Spec :=
  { spec with entries := spec.entries.map fun rq =>
      if rq.element == "dose" then { rq with allowed? := some values } else rq }

#guard entryValuesPossible spec "signOrders"
#guard entryValuesPossible (constrainDose ["0"]) "signOrders"
#guard !entryValuesPossible (constrainDose []) "signOrders"
#guard !entryValuesPossible (constrainDose ["not-a-number"]) "signOrders"

private def incompatible : Spec :=
  let sp := constrainDose ["0"]
  { sp with entries := sp.entries ++
      [{ commit := "signOrders", element := "dose", perOrderLine := true, allowed? := some ["1"] }] }
#guard !entryValuesPossible incompatible "signOrders"
#guard (completeFor incompatible program "signOrders").isSome

#print axioms universallyValid_sound
end Ehr.Check
