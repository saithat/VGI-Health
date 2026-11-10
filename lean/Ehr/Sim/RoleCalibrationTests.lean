import Ehr.Sim.Scheduling.Wave3Tests

namespace Ehr.Sim.RoleCalibrationTests
open Ehr Ehr.Sim Ehr.Sim.FeatureTests
set_option maxRecDepth 100000
set_option maxHeartbeats 4000000

def schedule : DaySchedule := { day := 1, persona := "P1", load := "normal", tasks := [task] }
def control := simulate fixtureSpec (fixtureProgram []) params schedule (fun _ => Examples.Tiny.facts) 7 { mode := .fixedCost }
def zero := simulate fixtureSpec (fixtureProgram []) params schedule (fun _ => Examples.Tiny.facts) 7 { mode := .fixedCost, choiceLatencyMs := 0 }
def delayed := simulate fixtureSpec (fixtureProgram []) params schedule (fun _ => Examples.Tiny.facts) 7 { mode := .fixedCost, choiceLatencyMs := 2000 }
#guard encodeJson control == encodeJson zero
#guard delayed.tasks.all (·.completed)
#guard delayed.tasks.head!.klmDeciSec > control.tasks.head!.klmDeciSec
#guard delayed.trace.map (·.event) == control.trace.map (·.event)
#guard delayed.workload?.get!.timings.head!.clocks?.get!.uiMs > control.workload?.get!.timings.head!.clocks?.get!.uiMs

def offered (behavior arrival : Nat) :=
  (Resumption.initRuntime behavior task .physician [task.patientId] { arrivalSeed? := some arrival }).metrics.offered
#guard offered 1 11 == offered 99 11
-- Freshness still uses elapsed service before the event, not stale KLM time.
def runner : EpisodeResult := {
  state := default, trace := [], complaints := [], rng := 0,
  interruptions := [], actionIndex := 0, elapsedMs := 100,
  lastDevice := none, resumption := { config := {choiceLatencyMs := 60000} } }
#guard (choiceLatency runner [.point, .click]).elapsedMs == 100
#guard (choiceLatency runner [.think, .key, .think]).elapsedMs == 120100
def ctx : Context := { sp := fixtureSpec, prog := fixtureProgram [], facts := Examples.Tiny.facts, user := Examples.Tiny.user, goals := default }
#guard (emit ctx task (choiceLatency runner [.think]) (.scroll "home") [.think]).state.clock == (100 + 60000 + 1350) / 100

end Ehr.Sim.RoleCalibrationTests
