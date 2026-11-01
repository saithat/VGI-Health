import Ehr.Check.DoseSound
import Ehr.Canonical.CoreWorkflowTests

namespace Ehr.Check.DoseTests
open Ehr Ehr.Specs.V1 Ehr.Canonical.CoreTests

def drugAt (drug : String) (slot : Nat := 0) : State :=
  { (default : State) with captured := [{ element := "drug", slot, value := .code drug, byHuman := true, confirmed := true }] }

-- Small kernel checks, including a cross-line mismatch and the unchanged kg rule.
example : elementValueValid adult (drugAt "heparin") dose 0 (.qty 50000 .mg) = false := by decide
example : elementValueValid adult (drugAt "heparin") dose 0 (.qty 50000 .units) = true := by decide
example : elementValueValid adult (drugAt "heparin" 1) dose 0 (.qty 50000 .units) = false := by decide
example : valueSatisfies adult physician (.quantity .kg) (.qty 700 .lb) = false := by decide

#guard elementValueValid adult (drugAt "insulin lispro") dose 0 (.qty 40 .units)
#guard elementValueValid adult (drugAt "albuterol") dose 0 (.qty 1800 .mcg)
#guard elementValueValid adult (drugAt "albuterol") dose 0 (.qty 25 .mg)
#guard !elementValueValid adult (drugAt "lisinopril") dose 0 (.qty 100 .units)
#guard !elementValueValid adult (drugAt "unknown") dose 0 (.qty 100 .mg)
#guard !elementValueValid adult (drugAt "heparin") dose 0 (.qty 10 .mL)
#guard parseElementValue (drugAt "insulin lispro") dose 0 "4" == some (.qty 40 .units)

def inhaler (amount : Nat) : State := { (drugAt "albuterol") with
  captured := (drugAt "albuterol").captured ++ [{ element := "dose", slot := 0, value := .qty amount .mcg, byHuman := true, confirmed := true }] }
#guard !doseOutOfRange adult (inhaler 1800) 0 "albuterol"
#guard !doseOutOfRange adult (inhaler 50000) 0 "albuterol"
#guard doseOutOfRange adult (inhaler 50001) 0 "albuterol"

-- Changing the selector never reinterprets a previously captured number.
def changed : State := { (drugAt "albuterol") with captured :=
  (drugAt "albuterol").captured ++
  [{ element := "doseUnit", slot := 0, value := .code "mcg", byHuman := true, confirmed := true }] }
#guard !elementValueValid adult changed dose 0 (.qty 1800 .mg)
#guard elementValueValid adult changed dose 0 (.qty 1800 .mcg)
#guard parseElementValue changed dose 0 "180" == some (.qty 1800 .mcg)
#guard Specs.Rules.Features.elementCalculatedPediatricDose.kind == .quantity .mg
def pediatricState : State := { (default : State) with captured :=
  [{ element := "weight", slot := 0, value := .qty 200 .kg, byHuman := true, confirmed := true }] }
#guard elementValueValid child pediatricState Specs.Rules.Features.elementCalculatedPediatricDose 0 (.qty 9000 .mg)
#guard !elementValueValid child pediatricState Specs.Rules.Features.elementCalculatedPediatricDose 0 (.qty 9000 .units)
#guard ((specForProfile .full).element? "dose").any (fun el => el.kind == .medicationDose)
#guard ((specForProfile .full).commit? "signOrders").any (fun cs =>
  cs.encounterRoles?.any (fun rules => rules.any (fun rule => rule.cosign? == some "attendingCosign")))
-- A cosign route must never hide a new, unattested pre-op obligation.
#guard entryRelevantForRole specV1 .np
  { commit := "signOrders", element := "hpUpdate", when := .encounter "preop" }
#guard !entryRelevantForRole specV1 .np
  { commit := "signOrders", element := "hpUpdate", when := .encounter "preop", waivedBy? := some "attendingCosign" }
-- A changed selector cannot strand an invalid line behind Add order.
def lineSpec : Spec := { specV1 with elements := [drug, dose, doseUnit], entries :=
  [ { commit := "signOrders", element := "drug", perOrderLine := true },
    { commit := "signOrders", element := "dose", perOrderLine := true },
    { commit := "signOrders", element := "doseUnit", perOrderLine := true } ] }
def mixedLine : State := { changed with captured := changed.captured ++
  [{ element := "dose", slot := 0, value := .qty 1800 .mg, byHuman := true, confirmed := true }] }
def fixedLine : State := { changed with captured := changed.captured ++
  [{ element := "dose", slot := 0, value := .qty 1800 .mcg, byHuman := true, confirmed := true }] }
#guard !currentLineComplete lineSpec adult physician mixedLine
#guard currentLineComplete lineSpec adult physician fixedLine
end Ehr.Check.DoseTests
