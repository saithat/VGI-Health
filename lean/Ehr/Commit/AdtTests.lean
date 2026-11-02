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
example : patient? moved "a" = some { id := "a", admitted := true, bed := some 402 } := by decide
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
end Ehr.Commit.Adt.Tests
