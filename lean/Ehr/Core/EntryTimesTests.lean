import Ehr.Core.EntryTimes
import Ehr.Examples.Tiny

namespace Ehr.EntryTimes.Tests
open Ehr.Examples.Tiny

def weight := { spec.elements.head! with id := "weight", kind := .quantity .kg, observation? := some true, enteredBy := [.physician], prefill := .never }
def timedSpec : Spec := { spec with elements := spec.elements ++ [companion weight] }
def timedProgram : Program := { program with screens := program.screens.map fun sc =>
  if sc.id != program.start then sc else { sc with components := sc.components ++ [{
    id := "timeTaken", kind := .field "weight.observedAt" (.fixed 0) .none, label := "Time taken" }] } }
def timedFacts : Facts := { facts with epochMinute? := some 1000, encounterStart? := some 900 }
def start := init timedSpec timedProgram timedFacts user
def entered := (step timedSpec timedProgram timedFacts user .human start (.enter "weightField" (.qty 700 .kg))).1
def observed := step timedSpec timedProgram timedFacts user .human entered (.enter "timeTaken" (.text "950"))
#guard (entered.captured.find? (·.element == "weight")).bind (·.enteredAt?) == some 1000
#guard observed.2 == .ok
#guard (records timedSpec timedFacts observed.1).any (fun t => t.element == "weight" && t.observedAt == 950 && t.enteredAt == 1000)
#guard (step timedSpec timedProgram timedFacts user .human entered (.enter "timeTaken" (.text "1001"))).2 != .ok
#guard (step timedSpec timedProgram timedFacts user .human entered (.enter "timeTaken" (.text "899"))).2 != .ok
#guard (step timedSpec timedProgram timedFacts user .human entered (.enter "timeTaken" (.text "900"))).2 == .ok
#guard (step timedSpec timedProgram timedFacts user .human entered (.enter "timeTaken" (.text "1000"))).2 == .ok
#guard (step timedSpec timedProgram timedFacts user .«macro» entered (.enter "timeTaken" (.text "950"))).1 == entered
#guard (step timedSpec timedProgram timedFacts user .human observed.1 (.enter "weightField" (.qty 701 .kg))).1.captured.all (fun c => c.element != "weight.observedAt")
#guard !late timedSpec.design 0 1440
#guard late timedSpec.design 0 1441
#guard !late { timedSpec.design with lateEntryMinutes? := some 60 } 100 160
#guard late { timedSpec.design with lateEntryMinutes? := some 60 } 100 161
#guard !valid timedSpec { timedFacts with epochMinute? := some 999 } entered
#guard ((Lean.toJson ({ element := "x", slot := 0, value := .text "x", byHuman := true, confirmed := true } : Captured)).getObjVal? "enteredAt").toOption == none
#guard (Lean.fromJson? (Lean.Json.mkObj [("element", .str "x"), ("slot", Lean.toJson (0 : Nat)),
  ("value", Lean.toJson (Value.text "x")), ("byHuman", .bool true), ("confirmed", .bool true)]) : Except String Captured).toOption.bind (·.enteredAt?) == none
end Ehr.EntryTimes.Tests
