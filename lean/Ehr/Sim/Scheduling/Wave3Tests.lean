import Ehr.Sim.Scheduling.CombinedTests

namespace Ehr.Sim.Scheduling.Wave3Tests
open Ehr Ehr.Sim Ehr.Sim.Resumption Ehr.Sim.FeatureTests
set_option maxRecDepth 100000
set_option maxHeartbeats 4000000

def offer := (offerHandover "task" "patient" "outgoing" "incoming" "shift ended" 10).get!
#guard responsibility offer == "outgoing"
#guard (acceptHandover offer "stranger" 11).isNone
#guard (acceptHandover offer "incoming" 9).isNone
#guard responsibility ((acceptHandover offer "incoming" 11).get!) == "incoming"
#guard (acceptHandover ((acceptHandover offer "incoming" 11).get!) "incoming" 12).isNone
#guard (offerHandover "task" "patient" "outgoing" "outgoing" "shift ended" 10).isNone

-- A bedside phase occupies the same serial server before guarded UI work.
-- The successor explicitly accepts queued work and starts with an empty memory.
def clinicalTask : Task := { task with timing? := some {
  arrivalMs := 0, readyMs := 0, clinicalServiceMs? := some 60000, boardingMs? := some 300000 } }
def later : Task := { clinicalTask with id := "next-day", day := 2 }
def day : DaySchedule := {
  day := 1, persona := "P1", load := "normal", tasks := [clinicalTask, later],
  shifts? := some [{id := "day", startMs := 0, endMs := 1000}, {id := "night", startMs := 1000, endMs := 1000000}],
  sourceDates? := some [(1,"2026-11-02"),(2,"2026-11-03")] }
def result := simulate fixtureSpec (fixtureProgram []) params day (fun _ => Ehr.Examples.Tiny.facts) 7 { mode := .fixedCost }
def legacy := simulate fixtureSpec (fixtureProgram []) params day (fun _ => Ehr.Examples.Tiny.facts) 7 { mode := .fixedCost, legacyModel := true }
#guard result.tasks.all (·.completed)
#guard result.workload?.get!.timings.head!.clocks?.get!.clinicalMs == 60000
#guard result.workload?.get!.timings[1]!.startMs?.get! ≥ result.workload?.get!.timings[0]!.finishMs?.get!
#guard result.workload?.get!.timings[1]!.handover?.get!.acceptedAtMs?.isSome
#guard result.workload?.get!.timings[1]!.actor? != result.workload?.get!.timings[0]!.actor?
#guard result.workload?.get!.timings.head!.ed?.get!.departureMs == result.workload?.get!.timings.head!.ed?.get!.decisionMs + 300000
#guard legacy.workload?.get!.timings.all (fun t => t.clocks?.get!.clinicalMs == 0 && t.handover?.isNone)
#guard legacy.workload?.get!.timings.head!.finishMs?.get! < result.workload?.get!.timings.head!.finishMs?.get!
#guard result.workload?.get!.timings.all fun row =>
  let c := row.clocks?.get!
  c.uiMs + c.readingMs + c.clinicalMs + c.communicationMs + c.passiveWaitMs + c.reorientationMs == row.finishMs?.get! - row.startMs?.get!
def bounded := Bounded.simulate fixtureSpec (fixtureProgram []) params day (fun _ => Ehr.Examples.Tiny.facts) 7
  {} Bounded.lexicalScent Discovery.helpDesk none { mode := .fixedCost }
#guard bounded.tasks.all (·.completed)
#guard bounded.actorMemories.length == 2
#guard (bounded.actorMemories.map (·.actor)).eraseDups.length == 2
#guard bounded.memory.actor == (fixtureProgram []).owner
#guard bounded.actorMemories.all (fun m => m.entries.all (fun e => e.exposures == 1))

-- Even a source snapshot carrying the predecessor's receipt cannot teach the
-- successor a private review. There is no review panel in this test program.
def receiptSpec := { fixtureSpec with reviews := [{commit := "ackResult", info := "allergyList", mode := .shownOrReceipt 100 [.physician]}] }
def sourceWithReceipt : Facts := { Ehr.Examples.Tiny.facts with receipts := [{
  info := "allergyList", dataVersion := Ehr.Examples.Tiny.facts.allergyVersion,
  time := 0, role := .physician, user := (fixtureProgram []).owner }] }
def privateResult := simulate receiptSpec (fixtureProgram []) params day (fun _ => sourceWithReceipt) 7 {mode := .fixedCost}
#guard privateResult.tasks.map (·.completed) == [true, false]
def privateBounded := Bounded.simulate receiptSpec (fixtureProgram []) params day (fun _ => sourceWithReceipt) 7
  {} Bounded.lexicalScent Discovery.helpDesk none {mode := .fixedCost}
#guard privateBounded.tasks.map (·.completed) == [true, false]

-- Length coefficients and actual extra scroll events, with an independent
-- per-item legacy opt-out. Typing remains the source text in both arms.
def textTask : Task := { task with choices := { task.choices with
  noteSections := ["assessment"], noteTexts? := some [{id := "assessment", text := String.ofList (List.replicate 3601 'x')}] } }
def textProgram := fixtureProgram [input "assessment"]
def textCtx : Context := {
  sp := fixtureSpec, prog := textProgram, facts := Ehr.Examples.Tiny.facts,
  user := Ehr.Examples.Tiny.user, goals := default }
def episode : EpisodeResult := {
  state := { (default : State) with screen := "s" }, trace := [], complaints := [],
  rng := 0, interruptions := [], actionIndex := 0, elapsedMs := 0, lastDevice := none }
def read := scrollTo textCtx textTask episode (.enter "assessmentField" (.text "x"))
#guard read.readingMs == 3601 * 50
#guard (read.trace.filter (fun t => match t.event with | .scroll _ => true | _ => false)).length == 2
#guard (scrollTo textCtx textTask read (.confirm "assessmentField")).readingMs == read.readingMs
#guard (scrollTo textCtx textTask { episode with resumption := {config := {lengthCosts := false}} } (.enter "assessmentField" (.text "x"))).readingMs == 0
#guard (scrollTo textCtx textTask { episode with resumption := {config := {legacyModel := true}} } (.enter "assessmentField" (.text "x"))).trace.isEmpty
#guard textReadMs 1800 == 90000
#guard textPages 1801 == 1
#guard activityRate .emergencyPhysician task == 6750
#guard activityRate .clinicPrescriber task != activityRate .clinicPrescriber {task with workflow := .W1}
#guard channelServiceMs .emergencyPhysician task .page != channelServiceMs .emergencyPhysician task .urgentResult
#guard (executeWork { Resumption.Tests.work .page with serviceMs? := some 28000 } 100 false).completedAtMs == 28100
#guard (executeWork { Resumption.Tests.work .page with serviceMs? := some 28000 } 100 false).steps == requiredSteps .page
-- A visible imported note pays its length once; hidden notes pay nothing.
def imported : Render.NoteRow := { (default : Render.NoteRow) with id := "chart-note", text := String.ofList (List.replicate 2000 'n') }
def chartEpisode := { episode with resumption := {config := {chartDisplay := fun _ => { Render.Display.empty with notes := [imported] }}} }
def chartCtx := { textCtx with prog := fixtureProgram [{id := "prior", kind := .panel "priorNotes"}] }
def chartRead := scrollTo chartCtx textTask chartEpisode (.click "commit")
#guard chartRead.readingMs == 100000
#guard (scrollTo textCtx textTask chartEpisode (.click "commit")).readingMs == 0
#guard (Resumption.Tests.serviced.2.2.metrics.handoffs?.getD []).all (fun h => h.acceptedAtMs?.isSome)
-- Missing new measurements must decode in Lean as well as in the TS reader.
def historicalMetrics := Lean.toJson ({} : InterruptionMetrics)
#guard !(historicalMetrics.getObjVal? "handoffs").isOk
#guard (Lean.fromJson? historicalMetrics : Except String InterruptionMetrics).isOk
-- Template/import and copy-forward keep full section values; only effort varies.
def authored (origin : String) (keys selections : Nat) : List NoteText :=
  [{id := "assessment", text := String.ofList (List.replicate 3601 'x'),
    authoring? := some {origin, typedCharacters := keys, selections}}]
def entryValue : Value := .text (String.ofList (List.replicate 3601 'x'))
def templateOps := noteEntryOps (authored "template" 0 2) "assessment" entryValue [.point, .click]
def copiedOps := noteEntryOps (authored "copied" 181 1) "assessment" entryValue [.point, .click]
#guard typedKeys (.enter "assessmentField" entryValue) templateOps == 0
#guard activation (.enter "assessmentField" entryValue) templateOps == 3
#guard typedKeys (.enter "assessmentField" entryValue) copiedOps == 181
#guard typedKeys (.enter "assessmentField" entryValue)
  (noteEntryOps (authored "freeText" 3601 0) "assessment" entryValue [.key]) == 3601
#guard sectionText {noteTexts? := some (authored "template" 0 2)} "assessment" == (String.ofList (List.replicate 3601 'x'))
#guard (scrollTo textCtx {textTask with choices := {textTask.choices with noteTexts? := some (authored "template" 0 2)}} episode
  (.enter "assessmentField" entryValue)).readingMs == read.readingMs
#print axioms noteEntryOps
#print axioms typedKeys
end Ehr.Sim.Scheduling.Wave3Tests
