import Ehr.Examples.TinyTests
import Ehr.Render.Json

/-!
# JSON samples

Values written by `lake exe gents` to `generated/ehr-samples.ts`, each typed
with its generated TypeScript type. Running `tsc` on that file checks that the
JSON Lean really produces matches the generated types.
-/

namespace Ehr.Tools.Samples

open Ehr.Examples Ehr.Examples.TinyTests

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

/-- A wire page with nested nodes, attributes, and text (the painter's input). -/
def samplePage : Ehr.Render.PageNode :=
  .node .div [{ name := "class", value := "ehr-shell" }]
    [.node .h1 [] [.text "Patient chart"],
     .node .button [{ name := "data-comp-id", value := "signButton" },
                   { name := "data-event", value := "click" }] [.text "Sign orders"]]

/-- All samples: data formats, plus interpreter states, views, and outputs. -/
def all : List Sample := [
  mk "sampleDisplay" "Display" Ehr.Render.Display.empty,
  mk "samplePage" "PageNode" samplePage,
  mk "sampleRenderInput" "RenderInput"
    ({ spec := Tiny.spec, program := Tiny.program, facts := Tiny.facts,
       display := Ehr.Render.Display.empty, user := Tiny.user, state := s0 } : Ehr.Render.RenderInput),
  mk "sampleFactsContext" "FactsContext"
    ({ today := "2026-10-31", encounterKind? := some "preop" } : Ehr.Render.FactsContext),
  mk "sampleFactsOutput" "FactsOutput"
    ({ facts := Tiny.facts, display := Ehr.Render.Display.empty } : Ehr.Render.FactsOutput),
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
                                  tasks := [sampleTask] } : DaySchedule),
  mk "tinySpecV1_1" "Spec" Tiny.specV1_1,
  mk "tinyProgramV1_1" "Program" Tiny.programV1_1,
  mk "tinyViewPriorAuth" "ScreenView" (view Tiny.specV1_1 Tiny.programV1_1 Tiny.facts Tiny.user afterPA.1),
  mk "tinyInitState" "State" s0,
  mk "tinyPopupState" "State" popped.1,
  mk "tinyViewInit" "ScreenView" (view Tiny.spec Tiny.program Tiny.facts Tiny.user s0),
  mk "tinyViewPopup" "ScreenView" (view Tiny.spec Tiny.program Tiny.facts Tiny.user popped.1),
  mk "tinyStepOutput" "StepOutput" ({ state := popped.1, result := popped.2 } : StepOutput),
  mk "tinyBatchCase" "BatchCase"
    ({ spec := Tiny.spec, program := Tiny.program, facts := Tiny.facts, user := Tiny.user,
       events := toSign "amoxicillin" 5000 } : BatchCase),
  mk "tinyBatchStep" "BatchStep"
    ({ case := 0, index := 0, state := popped.1, result := popped.2
       view := view Tiny.spec Tiny.program Tiny.facts Tiny.user popped.1 } : BatchStep)
]

end Ehr.Tools.Samples
