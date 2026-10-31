import Ehr.Sim.Policy
import Ehr.Sim.GoalsTests
import Ehr.Specs.V1
import Ehr.Canonical.Program

namespace Ehr.Sim.PolicyTests
open Ehr Ehr.Sim Ehr.Examples.Tiny

def p1 : PersonaParams :=
  { id := "P1", role := .physician, keyboardShare := 70,
    reviewsAllergiesEarly := true, scansSidebar := true, backtrackRate := 40,
    searchWhenBuried := true, overrideRate := 300 }

def task : Task := {
  id := "visit", day := 1, persona := "P1", workflow := .W1,
  patientId := facts.patientId, startMin := 0, choices := { orders := [GoalsTests.amox] },
  interruptions := 3 }
def schedule : DaySchedule := { day := 1, persona := "P1", load := "normal", tasks := [task] }
def day : DayResult := simulate spec program p1 schedule (fun _ => facts) 123
#guard day.tasks.all (·.completed)
#guard day == simulate spec program p1 schedule (fun _ => facts) 123
#guard (day.floor.zip day.tasks).all (fun (a, b) => below a b)
#guard (day.trace.flatMap (·.ops) |>.filter (· == .wait)).length == 3
#guard day.complaints == []

def canonicalTask : Task := { task with
  choices := { orders := [GoalsTests.amox], noteSections := ["hpi", "ros", "exam", "assessmentPlan"] } }
def canonicalDay : DayResult := simulate Specs.V1.specV1 Canonical.canonicalV1 p1
  { schedule with tasks := [canonicalTask] } (fun _ => facts) 123
#guard canonicalDay.tasks.all (·.completed)
#guard (canonicalDay.floor.zip canonicalDay.tasks).all (fun (a, b) => below a b)

end Ehr.Sim.PolicyTests
