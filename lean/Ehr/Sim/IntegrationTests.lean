import Ehr.Sim.PolicyTests
import Ehr.Sim.MinClicksTests
import Ehr.Cli.Sim

namespace Ehr.Sim.IntegrationTests
open Ehr Ehr.Sim Ehr.Examples.Tiny

def opioid : OrderChoice := {
  drug := "oxycodone", doseTenths := 50, unit := .mg,
  route := "PO", freq := "q6h", supplyDays? := some 3,
  curesExemptReason? := some "ed-supply-7-days-or-less" }
def controlledChoices : TaskChoices := { orders := [opioid], w6Step? := some .preop }
def controlledFacts := episodeFacts facts controlledChoices
def controlled := deriveGoals Specs.V1.specV1 controlledFacts user .W6 controlledChoices [opioid] none
#guard controlledFacts.encounterKind? == some "preop"
#guard controlled.commits == ["signOrders"]
#guard controlled.values.any (·.element == "consentVerified")
#guard controlled.values.any (·.element == "hpUpdate")
#guard controlled.waivers.map (·.value?) == [some (.code "ed-7-day")]
-- The ideal UI shows CURES for free; exemption entry is optional there.
#guard floorMetrics "c" Specs.V1.specV1 controlledFacts user controlled ==
  floorMetrics "c" Specs.V1.specV1 controlledFacts user { controlled with waivers := [] }
#guard curesReason { opioid with
  supplyDays? := some 6,
  curesExemptReason? := some "postoperative-supply-7-days-or-less" } == none
#guard curesReason { opioid with
  supplyDays? := some 5,
  curesExemptReason? := some "postoperative-supply-7-days-or-less" } == some "surgery-5-day"
#guard taskCuresReason { orders := [opioid, { opioid with curesExemptReason? := none }] } == none
#guard orderValue "duration" opioid == some (.code "3 days")
#guard orderValue "prn" opioid == some (.code "false")

def vaccines : TaskChoices := { immunizations := ["150", "20"], noteSections := ["hpi"] }
#guard (episodes facts .W5 vaccines).length == 3
#guard ((episodes facts .W5 vaccines).drop 1).map (·.choices.immunizations) == [["150"], ["20"]]
#guard (episodes facts .W5 { noteSections := ["visGiven"] }).length == 1
#guard ((episodes facts .W5 { noteSections := ["visGiven"] }).head?.map
  (fun ep => taskCommits Specs.V1.specV1 .W5 ep.choices)) == some ["signNote"]
def meds : TaskChoices := { administer := [opioid, GoalsTests.warf], noteSections := ["assessment"] }
#guard (episodes facts .W4 meds).length == 3
#guard (episodes facts .W4 meds).map (fun ep => taskCommits Specs.V1.specV1 .W4 ep.choices) ==
  [["administerMed"], ["administerMed"], ["chartAssessment"]]

/-- A refill's uncaptured proposed order cannot create a popup floor item.
The floor is derived from goal captures, not from the observed runtime trace. -/
def refillGoals := deriveGoals Specs.V1.specV1 facts user .W7
  { refill? := some "modify", orders := [GoalsTests.warf] } [GoalsTests.warf] none
#guard !refillGoals.values.any (·.element == "drug")
#guard refillGoals.expectedAcks == []
#guard refillGoals.values.any (fun g => g.element == "refillDose" && g.value? == some (.qty 30 .mg))

/-- ED and result workflows can use shared note/order composers through
Home. Workflow labels must not make otherwise reachable goals unreachable. -/
def sharedTask : Task := { PolicyTests.task with
  workflow := .W3,
  choices := { orders := [GoalsTests.amox], noteSections := ["hpi", "exam", "mdm"], disposition? := some "admit" } }
def sharedDay := simulate Specs.V1.specV1 Canonical.canonicalV1
  { PolicyTests.p1 with reviewsAllergiesEarly := false, backtrackRate := 0 }
  { PolicyTests.schedule with tasks := [sharedTask] } (fun _ => facts) 123
#guard sharedDay.tasks.all (·.completed)
#guard (sharedDay.floor.zip sharedDay.tasks).all (fun (a, b) => below a b)

/-- A persona that does not review early still creates a necessary receipt. -/
def receiptProgram : Program := { program with screens := program.screens.map fun (sc : Screen) =>
  if sc.id == "sign" then { sc with components := sc.components.filter (·.id != "signAllergies") } else sc }
def receiptDay := simulate spec receiptProgram
  { PolicyTests.p1 with reviewsAllergiesEarly := false, backtrackRate := 0 }
  PolicyTests.schedule (fun _ => facts) 1
#guard receiptDay.tasks.all (·.completed)
#guard (receiptDay.floor.zip receiptDay.tasks).all (fun (a, b) => below a b)

def staleCtx : Context := {
  sp := spec, prog := receiptProgram, facts := { facts with now := 1000 },
  user, goals := GoalsTests.gAmox }
def prior : Receipt := { info := "allergyList", dataVersion := 3, time := 0, role := .physician, user := "u1" }
def receiptState : State := { init spec receiptProgram facts user with screen := "sign", receipts := [prior] }
#guard (receiptComplaints staleCtx receiptState "signOrders").any (·.startsWith "allergyList: age")
#guard (receiptComplaints staleCtx { receiptState with receipts := [{ prior with dataVersion := 2 }] }
  "signOrders").any (·.startsWith "allergyList: data version")
#guard (receiptComplaints staleCtx { receiptState with receipts := [{ prior with time := 1000, role := .surgeon }] }
  "signOrders").any (·.startsWith "allergyList: role")

/-- Interruption workload survives consolidation of every screen. -/
def fastProgram : Program := { program with start := "fast", screens := [
  { id := "fast", title := "Task", workflow := "W1", components :=
    (roomingScreen.components ++ orderScreen.components ++ signScreen.components).map fun c =>
      { c with parent? := none, hotkey? := some "K" } }] }
def pairedSchedule := { PolicyTests.schedule with tasks := [{ PolicyTests.task with interruptions := 7 }] }
def fastDay := simulate spec fastProgram PolicyTests.p1 pairedSchedule (fun _ => facts) 123
def slowDay := simulate spec program PolicyTests.p1 pairedSchedule (fun _ => facts) 123
#guard fastDay.tasks.all (·.completed) && slowDay.tasks.all (·.completed)
#guard (fastDay.trace.flatMap (·.ops) |>.filter (· == .wait)).length == 7
#guard (slowDay.trace.flatMap (·.ops) |>.filter (· == .wait)).length == 7
#guard (fastDay.floor.zip fastDay.tasks).all (fun (a, b) => below a b)

def scanSpec := { MinClicksTests.microSpec with elements := [
  {
    id := "x", label := "Wristband", kind := .scan "wristband", enteredBy := [.physician],
    prefill := .never, friction := .safety, humanOnly := true, fhirTarget := "Provenance" }] }
def scanGoals := { MinClicksTests.microGoals with values := [
  { element := "x", value? := some (.code facts.patientId), commit := "signOrders" }] }
def scanCtx : Context := { MinClicksTests.microCtx with sp := scanSpec, goals := scanGoals }
#guard (minimum scanCtx .clicks (init scanSpec scanCtx.prog facts user) 100).map (·.cost) == some 2
#guard (minimum scanCtx .keystrokes (init scanSpec scanCtx.prog facts user) 100).map (·.cost) == some 0

#guard Cli.Sim.dateOf 1 == "2026-11-02" && Cli.Sim.dateOf 6 == "2026-11-09" &&
  Cli.Sim.dateOf 10 == "2026-11-13"
end Ehr.Sim.IntegrationTests
