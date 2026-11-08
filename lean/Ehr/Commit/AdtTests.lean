import Ehr.Commit.Adt

namespace Ehr.Commit.Adt.Tests
private def baseline : State :=
  { patients := [{ id := "a" }, { id := "b" }]
    beds := [{ id := 401, unit := "4-west" }, { id := 402, unit := "4-west" }] }
private def admitted : State := apply baseline (.admit "a" 401)
private def moved : State := apply admitted (.transfer "a" 401 402)
example : valid baseline = true := by decide
example : guard baseline .admittingClerk (.admit "a" 401) = true := by decide
example : guard admitted .bedManager (.admit "b" 401) = false := by decide
example : guard admitted .bedManager (.assign "a" 402) = false := by decide
example : guard admitted .admittingClerk (.transfer "a" 401 402) = false := by decide
example : guard admitted .chargeNurse (.transfer "a" 401 402) = true := by decide
example : valid moved = true := by decide
example : (patient? moved "a").map (·.bed) = some (some 402) := by decide
example : bed? moved 401 = some { id := 401, unit := "4-west", phase := .dirty } := by decide
example : guard moved .bedManager (.ready 401) = false := by decide
example : guard (apply moved (.clean 401)) .bedManager (.ready 401) = true := by decide
example : guard moved .bedManager (.release "b" 402) = false := by decide
example : valid (apply moved (.discharge "a")) = true := by decide
private def stale : Input :=
  { state := baseline
    versions := [{ key := "patient:a", version := 1 }]
    expected := [{ key := "patient:a", version := 0 }]
    role := .bedManager
    command := .admit "a" 401 }
example : commit stale = none := by decide

private def both : State := apply admitted (.admit "b" 402)
private def swapped : State := apply both (.swap "a" "b" 401 402)
private def inactive : State := { both with beds := both.beds.map fun b => if b.id == 401 then { b with active := false } else b }
example : guard inactive .bedManager (.swap "a" "b" 401 402) = false := by decide
example : available { baseline with beds := baseline.beds.map fun b => { b with active := false } } 401 = false := by decide
example : guard both .bedManager (.swap "a" "b" 401 402) = true := by decide
example : valid swapped = true := by decide
example : owns swapped "a" 402 && owns swapped "b" 401 = true := by decide
example : guard both .bedManager (.transfer "a" 401 402) = false := by decide
example : guard both .bedManager (.transfer "b" 402 401) = false := by decide
example : guard both .admittingClerk (.swap "a" "b" 401 402) = false := by decide
example : guard both .bedManager (.swap "a" "a" 401 401) = false := by decide
example : guard swapped .bedManager (.cancelAdmit "a" 1) = false := by decide
example : guard admitted .bedManager (.cancelAdmit "a" 1) = true := by decide
example : guard admitted .bedManager (.cancelAdmit "a" 2) = false := by decide
example : guard moved .bedManager (.cancelAdmit "a" 1) = false := by decide
example : guard moved .bedManager (.cancelTransfer "a" 2) = false := by decide
private def originReady : State := apply (apply moved (.clean 401)) (.ready 401)
example : guard originReady .bedManager (.cancelTransfer "a" 2) = true := by decide
example : owns (apply originReady (.cancelTransfer "a" 2)) "a" 401 = true := by decide
example : guard (apply originReady (.admit "b" 401)) .bedManager (.cancelTransfer "a" 2) = false := by decide
example : guard (apply originReady (.discharge "a")) .bedManager (.cancelTransfer "a" 2) = false := by decide
private def discharged : State := apply admitted (.discharge "a")
example : guard discharged .bedManager (.cancelDischarge "a" 2 402) = true := by decide
example : guard discharged .bedManager (.cancelDischarge "a" 2 401) = false := by decide
example : (patient? (apply discharged (.cancelDischarge "a" 2 402)) "a").map (·.encounter) = some 1 := by decide
example : guard (apply discharged (.cancelDischarge "a" 2 402)) .bedManager (.cancelDischarge "a" 2 402) = false := by decide
end Ehr.Commit.Adt.Tests
