import Ehr.Sim.BoundedTests

namespace Ehr.Sim.DiscoveryTests
open Ehr Ehr.Sim Ehr.Sim.Bounded Ehr.Sim.FeatureTests Ehr.Examples.Tiny
open Ehr.Sim.BoundedTests (prog schedule)
set_option maxRecDepth 100000
set_option maxHeartbeats 2000000

/-- Misleading branches and an opaque final caption force the paid fallback.
Search exists, but its Core event cannot teleport to or activate the target. -/
def trapButton (n : Nat) : Component :=
  { id := s!"trap{n}", label := "Acknowledge", kind := .button (.goto s!"trap{n}") }
def trapScreen (n : Nat) : Screen :=
  { id := s!"trap{n}", title := "Empty", workflow := "W2", components := [{ id := s!"back{n}", kind := .button .back }] }
def misleading : Program :=
  { prog with
    start := "root",
    screens := [
      { id := "root", title := "Root", workflow := "W2", components :=
        [{ id := "search", kind := .search "chart", label := "Search" }] ++
        (List.range 6).map trapButton ++
        [{ id := "find", label := "Q7", kind := .button (.goto "found") }] },
      { id := "found", title := "Found", workflow := "W2", components :=
        [{ id := "commit", tag := "sign", label := "Q8", kind := .button (.commit "ackResult") }] }
    ] ++ (List.range 6).map trapScreen }

def oneTask := { schedule with tasks := schedule.tasks.take 1 }
def noScent : Scent := fun _ _ => 0
def helped := Bounded.simulate fixtureSpec misleading params oneTask (fun _ => facts) 7 {} noScent
def noHelper := Bounded.simulate fixtureSpec misleading params oneTask (fun _ => facts) 7 {} noScent (fun _ _ => none)

def check (b : Bool) (msg : String) : IO Unit := unless b do throw (IO.userError msg)
#eval do
  check (helped.tasks.all (·.completed)) "opaque labels still complete through paid assistance"
  check (helped.effort.any (·.helpRequests > 0)) "help counted"
  check (helped.observations.any (fun o => o.kind == "help" && o.ms == waitMs + mentalMs)) "help wait/read charge retained"
  check (helped.trace.any (fun t => match t.event with | .search _ => true | _ => false)) "real search query typed"
  check (helped.trace.any (fun (t : TraceEvent) => t.event == Event.click "find" && t.result == StepResult.ok)) "guided navigation goes through interpreter"
  check (helped.trace.any (fun (t : TraceEvent) => t.event == Event.click "commit" && t.result == StepResult.ok)) "guarded commit executed"
  check (helped.assistance.any (fun h => h.targetControl == "commit" && h.targetLabel == "Q8" && h.labelMatch == 0)) "opaque target named in telemetry"
  check (noHelper.tasks.all (! ·.completed)) "failed helper cannot manufacture completion"
  check (encodeJson helped == encodeJson (Bounded.simulate fixtureSpec misleading params oneTask (fun _ => facts) 7 {} noScent)) "assisted trace is deterministic"
  let ctx : Context := { sp := fixtureSpec, prog, facts, user, goals := default }
  let r : Runner := { episode := { state := init fixtureSpec prog facts user, trace := [], complaints := [], rng := 0,       interruptions := [], actionIndex := 0, elapsedMs := 0, lastDevice := none }, memory := {}, effort := { task := "scan" } }
  let scanned := visualScan ctx task r
  let revisited := visualScan ctx task scanned
  check (scanned.effort.scannedItems > 0 && revisited.effort.scannedItems == scanned.effort.scannedItems) "unchanged labels are not repeatedly scanned"
  check (revisited.effort.cognitiveMs == scanned.effort.cognitiveMs) "backtracking does not charge a full reread"
  check (Discovery.fuel { ctx with prog := misleading } > Discovery.fuel ctx) "hard fuel scales with component count"
end Ehr.Sim.DiscoveryTests
