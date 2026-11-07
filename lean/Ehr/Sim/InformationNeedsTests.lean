import Ehr.Sim.Bounded
import Ehr.Sim.InformationMinimum
import Ehr.Sim.MinClicksTests

namespace Ehr.Sim.Information.Tests
open Ehr Ehr.Render

def source : Source := { authority := .simulationAssumption, citation := "test", «assumption» := "test" }
def a : Sample := { measure := "Glucose", value := "102", unit := "mg/dL", minute := 100, time := "2026-11-02T09:00:00Z", flag := "N" }
def b : Sample := { a with value := "140", minute := 200, time := "2026-11-02T10:40:00Z", flag := "H" }
def c : Sample := { a with value := "80", minute := 150, time := "2026-11-02T09:50:00Z" }
def latest : Need := { id := "glucose", question := .latest "Glucose" "mg/dL" 120, gate := .commit "signNote", reads := ["labResults"], source, samples := [a, b] }
def node (rows : List Row) : UiNode := .info "lab" "Results" "labResults" "table" rows
#guard satisfied latest 200 [node [sampleCells b false]]
#guard !satisfied latest 321 [node [sampleCells b false]]
#guard !satisfied latest 199 [node [sampleCells b false]]
#guard !satisfied latest 200 [.text "Glucose 140 mg/dL"]
#guard !satisfied latest 200 [node [[("Test", "Glucose"), ("Value", "140")]]]
#guard !satisfied latest 200 [node [sampleCells { b with unit := "mmol/L" } false]]
#guard !satisfied latest 200 [node [sampleCells { b with time := a.time } false]]
#guard satisfied latest 200 [.presentation .trend [.chartReferences [] [node [sampleCells b false]]]]
#guard !satisfied latest 200 [.tabs "tabs" ["Summary"] 0 [.text "Glucose"]]

def trend := { latest with question := Question.trend "Glucose" "mg/dL" 120, samples := [a,b,c] }
#guard satisfied trend 200 [node ([a,c,b].map (sampleCells · false))]
#guard satisfied trend 200 [node ([b,c,a].map (sampleCells · false))]
#guard !satisfied trend 200 [node ([a,b,c].map (sampleCells · false))]
#guard !satisfied trend 200 [node [sampleCells b false]]
def flags := { latest with question := Question.flagged "Glucose" "mg/dL" 120 }
#guard !satisfied flags 200 [node ([a,b].map (sampleCells · false))]
#guard satisfied flags 200 [node ([a,b].map (sampleCells · true))]
#guard !satisfied flags 200 [node [sampleCells b true]]
def inventory : Need := { latest with question := .active "allergyList", reads := ["allergyList"], inventory := [[("Substance", "Penicillin"), ("Status", "inactive")]] }
#guard !satisfied inventory 200 [.info "allergy" "Allergies" "allergyList" "list" []]
#guard satisfied inventory 200 [.info "allergy" "Allergies" "allergyList" "list" inventory.inventory]
def flowNeed := { latest with question := Question.threshold "Glucose" "mg/dL" 120 1000, reads := ["flowsheetHistory"] }
#guard satisfied flowNeed 200 [.info "flow" "Flowsheet" "flowsheetHistory" "table"
  [[("Measure", b.measure), ("Unit", b.unit), (Fhir.acuteTimeColumn b.time, b.value)]]]
#guard !satisfied flowNeed 200 [.info "flow" "Flowsheet" "flowsheetHistory" "table"
  [[("Measure", b.measure), ("Unit", b.unit), ("10:40", b.value)]]]
#guard rowDepth latest 200 "labResults" [sampleCells a false, sampleCells b false] == 2
#guard asOfMinute { Display.empty with asOf := "2026-11-02" } 1520 ==
  asOfMinute { Display.empty with asOf := "2026-11-03" } 80
#guard numeric "6.46" && numeric "-0.125" && !numeric "Positive"
#guard sourceMinute "2026-11-02" == none
#guard sourceMinute "2026-11-02T09:00:00" == none
#guard sourceMinute "2026-11-02T25:00:00Z" == none
#guard sourceMinute "2026-11-02T09:00:00-08:00" == sourceMinute "2026-11-02T17:00:00Z"

open Ehr.Sim.MinClicksTests

def disp : Display := { Display.empty with asOf := "2026-11-02", labResults := [
  { code := "2345-7", name := "Glucose", value := "140", unit := "mg/dL", date := "2026-11-02T09:00:00Z", refRange := "", flag := "H", status := "final" }] }
def need := { latest with samples := displaySamples disp }
def qualitativeFacts := { microCtx.facts with infoPayloads? := some [{
  info := "resultDetail", patient := microCtx.facts.patientId, artifactKey := "test", artifact := "test", version := 1,
  rows := [{ id := "current", slot := 0, fields := [("test", "Pathology"), ("value", "Benign"), ("unit", "")] },
           { id := "older", slot := 1, fields := [("test", "Glucose"), ("value", "140"), ("unit", "mg/dL")] }] }] }
#guard (derive qualitativeFacts disp ["ackResult"] [] none true).isEmpty
def prog : Program := { microProgram with screens := microProgram.screens.map (fun (s : Screen) =>
  if s.id == "a" then { s with components := s.components ++ [{ id := "chart", kind := .button (.goto "c") }] } else s) ++
  [{ id := "c", title := "Results", workflow := "W1", components := [
    { id := "lab", kind := .table "labResults" }, { id := "back", kind := .button (.goto "a") }] }] }
def ctx : Context := { microCtx with prog, facts := { microCtx.facts with now := 540 }, goals := { microGoals with informationNeeds := [need], informationDisplay := disp } }
def start := init ctx.sp ctx.prog ctx.facts ctx.user
#guard (minimum ctx .clicks start 200).map (·.cost) == some 5
#guard (needPath ctx start need).isSome

def runner : EpisodeResult := { state := start, trace := [], complaints := [], rng := 0, interruptions := [], actionIndex := 0, elapsedMs := 0, lastDevice := none }
def task : Task := { PolicyTests.task with id := "lookup", startMin := 540 }
def read := lookupExpert ctx PolicyTests.p1 task runner need
#guard read.lookups.length == 1
#guard read.state.screen == "c"
def readyState := { start with screen := "b", captured := [
  { element := "x", slot := 0, value := .text "ok", byHuman := true, confirmed := true }] }
#guard (ctx.next readyState (.click "sign")).commits.contains "signNote"
def missing := emit ctx task { runner with state := readyState } (.click "sign") [.click]
#guard missing.state.commits.isEmpty
#guard missing.trace.getLast?.map (·.result) == some (.blocked "information need missing or stale")
-- An entry gate blocks even an otherwise valid human entry.
def entryCtx := { ctx with goals := { ctx.goals with informationNeeds := [{ need with gate := .entry "x" 0 }] } }
#guard (entryCtx.next start (.enter "x" (.text "ok"))).captured.any (·.element == "x")
#guard (emit entryCtx task runner (.enter "x" (.text "ok")) [.click]).state.captured.isEmpty
-- Reading on C, crossing to A and then B carries one source item twice.
def crossed := emit ctx task (emit ctx task read (.click "back") [.click]) (.click "next") [.click]
#guard crossed.lookups.map (·.memoryCarry) == [2]
#guard needsAllow ctx crossed crossed.state (.click "sign")
#guard !needsAllow ctx { crossed with state := { crossed.state with clock := 121 * 600 } }
  { crossed.state with clock := 121 * 600 } (.click "sign")
-- Missing source data leaves an unmet need; it never becomes a different question.
#guard (needPath { ctx with goals := { ctx.goals with informationDisplay := Display.empty } } start need).isNone

#print axioms presentation_preserves
#print axioms timeline_preserves
#print axioms references_preserve
#print axioms dated_preserves
#print axioms minimum_correct
end Ehr.Sim.Information.Tests
