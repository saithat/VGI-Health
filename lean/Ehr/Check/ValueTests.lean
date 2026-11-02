import Ehr.Check.Rules
import Ehr.Examples.Tiny
import Ehr.Props.Examples

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

private def wrongLinkedUnit : Program :=
  { program with screens := program.screens.map fun scr =>
      { scr with components := scr.components.map fun c =>
          if c.id == "doseField" then { c with kind := .field "dose" .current (.linked "weight") }
          else c } }
#guard !linkedSourcesTyped spec wrongLinkedUnit

/-- An extra fixed-slot writer can invalidate an archived current-slot line.
Its receipt-hidden input cannot serve as the guaranteed repair route. -/
private def hiddenArchivedDose : Program :=
  { Ehr.Props.Examples.goodProgram with
    screens := [roomingScreen, orderScreen, Ehr.Props.Examples.goodSignScreen].map fun scr =>
      let scr := Ehr.Props.Examples.pinTinyAlerts scr
      if scr.id == "order" then
        { scr with components := scr.components ++
            [{ id := "oldDose", kind := .field "dose" (.fixed 0) .none,
               visibility := .unlessReceipt "allergyList" }] }
      else scr }
#guard (repairSlots spec hiddenArchivedDose "signOrders").contains (.fixed 0)
#guard (completeVia spec hiddenArchivedDose "signOrders" "sign").isSome

#print axioms universallyValid_sound
end Ehr.Check
