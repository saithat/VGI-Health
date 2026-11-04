import Ehr.Sim.Bounded
import Ehr.Sim.FeatureTests

namespace Ehr.Sim.BoundedTests
open Ehr Ehr.Sim Ehr.Sim.Bounded Ehr.Sim.FeatureTests Ehr.Examples.Tiny
set_option maxRecDepth 100000
set_option maxHeartbeats 2000000

def entry : MemoryEntry := { key := "sign", intent := "commit:ackResult", control := "commit",   place := { screen := "s" }, exposures := 4, lastDay := 1 }
#guard strength 1 entry == 2000
#guard strength 2 entry < strength 1 entry
#guard strength 100 entry < 1400
#guard strength 1 { entry with exposures := 9 } > strength 1 entry
#guard decisionMs 20 100 < decisionMs 20 1
#guard decisionMs 40 10 > decisionMs 2 10
#guard relearningCost [150, 120] [100, 100] == 70
#guard relearningCost [90] [100] == -10
#guard seededPreferences 7 "actor" == seededPreferences 7 "actor"

def prog := { fixtureProgram [] with screens := [{ id := "s", title := "Result", workflow := "W2",   components := [{ id := "commit", tag := "sign", label := "Acknowledge", kind := .button (.commit "ackResult") }] }] }
def moved := { prog with version := 2, screens := [{ id := "s", title := "Result", workflow := "W2",   components := [{ id := "banner", kind := .banner },     { id := "renamedCommit", tag := "sign", label := "Acknowledge", kind := .button (.commit "ackResult") }] }] }
def schedule : DaySchedule := { day := 1, persona := "P1", load := "normal",   tasks := (List.range 5).map fun n => { task with id := s!"learn{n}" } }
def trained := Bounded.simulate fixtureSpec prog params schedule (fun _ => facts) 7
def afterSchedule : DaySchedule := { day := 2, persona := "P1", load := "normal",   tasks := [{ task with day := 2, id := "after" }] }
def changed := Bounded.simulate fixtureSpec moved params afterSchedule (fun _ => facts) 7 trained.memory

def check (b : Bool) (msg : String) : IO Unit := unless b do throw (IO.userError msg)
#eval do
  check (trained.tasks.all (·.completed)) "training completes"
  check ((trained.memory.entries.find? (fun (m : MemoryEntry) => m.key == "sign")).any (fun (m : MemoryEntry) => m.exposures == 5)) "use strengthens; stable tag key"
  check (changed.tasks.all (·.completed)) "moved control discovered"
  check (changed.effort.any (·.misses == 1)) "confident stale position incurs exactly one miss"
  check (changed.trace.any (fun (t : TraceEvent) => t.result == StepResult.ignored)) "miss passed through interpreter"
  check (changed.observations.any (·.kind == "search")) "miss followed by visual search"
  check ((changed.memory.entries.find? (fun (m : MemoryEntry) => m.key == "sign")).any (fun (m : MemoryEntry) => m.control == "renamedCommit" && m.exposures == 1)) "new placement resets practice after discovery"
  check (encodeJson changed == encodeJson (Bounded.simulate fixtureSpec moved params afterSchedule (fun _ => facts) 7 trained.memory)) "seed reproduces trace, effort and memory"
  check (encodeJson trained.expert == encodeJson (Ehr.Sim.simulate fixtureSpec prog params schedule (fun _ => facts) 7)) "expert reference unchanged"
  check (roundTrips trained.memory) "memory JSON round trip"
  check ((ratePrograms {} prog moved []).score == 0) "neutral preferences indifferent"
  check (!(ratePrograms { changeSensitivity := 100 } prog moved [{ usedTags := ["sign"], costMs := 0 }]).chooseAfter) "familiar moves penalized"
  let guarded := Bounded.simulate minorSpec (fixtureProgram []) params schedule (fun _ => clinicalFacts 17) 7
  check (guarded.tasks.all (! ·.completed)) "missing required field cannot bypass guard"
end Ehr.Sim.BoundedTests
