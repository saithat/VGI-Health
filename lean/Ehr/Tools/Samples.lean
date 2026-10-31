import Ehr.Examples.Tiny

/-!
# JSON samples

Values written by `lake exe gents` to `generated/ehr-samples.ts`, each typed
with its generated TypeScript type. Running `tsc` on that file checks that the
JSON Lean really produces matches the generated types.
-/

namespace Ehr.Tools.Samples

open Ehr.Examples

/-- A sample: TypeScript constant name, TypeScript type name, JSON value. -/
structure Sample where
  name : String
  type : String
  json : Lean.Json

/-- Build a sample from a Lean value. -/
def mk {α : Type} [Lean.ToJson α] (name type : String) (x : α) : Sample :=
  { name, type, json := Lean.toJson x }

/-- A sample task for the simulation formats. -/
def sampleTask : Task where
  id := "d1-p1-t1"
  day := 1
  persona := "P1"
  workflow := .W1
  patientId := "pt-1"
  startMin := 15
  choices := { orders := [{ drug := "amoxicillin", doseTenths := 5000, unit := .mg,
                            route := "PO", freq := "TID", indication? := some "J02.9" }] }
  todayResources := [Lean.Json.mkObj [("resourceType", "Observation")]]

/-- All samples (M1: data formats only). -/
def all : List Sample := [
  mk "tinySpec" "Spec" Tiny.spec,
  mk "tinyProgram" "Program" Tiny.program,
  mk "tinyFacts" "Facts" Tiny.facts,
  mk "tinyUser" "User" Tiny.user,
  mk "sampleEvents" "Event[]"
    [Event.click "toOrder", .selectTab "signTabs" 1, .enter "weightField" (.qty 725 .kg),
     .enter "drugField" (.code "amoxicillin"), .enter "cosignField" (.user "u2"),
     .enter "patientIdField" (.text "JD/F/34"), .confirm "weightField",
     .ack "drugAllergy", .scroll "sign", .search "amox"],
  mk "sampleResults" "StepResult[]" [StepResult.ok, .blocked "guard: weight", .ignored],
  mk "sampleCertificate" "Certificate" Tiny.sampleCertificate,
  mk "sampleTask" "Task" sampleTask,
  mk "sampleDay" "DaySchedule" ({ day := 1, persona := "P1", load := "normal",
                                  tasks := [sampleTask] } : DaySchedule)
]

end Ehr.Tools.Samples
