import Ehr.Sim.Policy
import Ehr.Check.EncounterRoleTests
namespace Ehr.Check.AttendingSimTests
open Ehr Ehr.Sim Ehr.Check.EncounterRoleTests

def params : PersonaParams :=
  { id := "P4", role := .np, keyboardShare := 50,
    reviewsAllergiesEarly := true, scansSidebar := true, backtrackRate := 0,
    searchWhenBuried := false, overrideRate := 0 }
def task : Task :=
  { id := "np-preop", day := 1, persona := "P4", workflow := .W6,
    patientId := preopChild.patientId, startMin := 0, interruptions := 0,
    choices := { w6Step? := some .preop, orders := [{ drug := "acetaminophen", doseTenths := 1000, unit := .mg, route := "oral", freq := "once" }] } }
def day := simulate Specs.V1.specV1 p4 params
  { day := 1, persona := "P4", load := "normal", tasks := [task] }
  (fun _ => preopChild) 7
#guard Specs.ruleProfile == .full || day.tasks.all (·.completed)
#guard Specs.ruleProfile == .full || day.trace.any (fun e =>
  e.actor? == some "simulated-attending" && e.ops.isEmpty &&
  e.responseDelayMinutes?.any (fun n => 1 ≤ n && n ≤ 5))
#guard Specs.ruleProfile == .full || (day.floor.zip day.tasks).all (fun (a,b) => below a b)
#guard day == simulate Specs.V1.specV1 p4 params
  { day := 1, persona := "P4", load := "normal", tasks := [task] } (fun _ => preopChild) 7
end Ehr.Check.AttendingSimTests
