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
#guard controlled.values.any (fun g => g.element == "refills" && g.value? == some (.qty 0 .none))
#guard controlled.waivers.map (·.value?) == [some (.code "ed-7-day")]
-- The ideal UI shows CURES for free; exemption entry is optional there.
#guard floorMetrics "c" Specs.V1.specV1 controlledFacts user controlled ==
  floorMetrics "c" Specs.V1.specV1 controlledFacts user { controlled with waivers := [] }
#guard curesReason { opioid with
  supplyDays? := some 8,
  curesExemptReason? := some "postoperative-supply-7-days-or-less" } == none
#guard curesReason { opioid with
  supplyDays? := some 5,
  curesExemptReason? := some "postoperative-supply-7-days-or-less" } == some "surgery-7-day"
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

/-- Keep the catalog regression's original federal bindings explicit while
production temporarily uses core. These are the actual catalog declarations,
including the per-line stop from the series artifact. -/
def catalogSpec : Spec := { Specs.V1.specV1 with
  elements := Specs.V1.specV1.elements ++ [
    Specs.Rules.Federal.refillScheduleEligibility, Specs.Rules.Federal.earliestFillDate]
  entries := Specs.V1.specV1.entries ++ [Specs.Rules.Federal.entrie118,
    Specs.Rules.Federal.entrie119, Specs.Rules.Federal.entrie123]
  commits := Specs.V1.specV1.commits ++ [Specs.Rules.Federal.signScheduleIISeries] }
def catalogProgram : Program := { Canonical.canonicalV1 with
  screens := Canonical.canonicalV1.screens.map fun sc =>
    if sc.id == "w7Decision" then { sc with components := sc.components ++ [
      Canonical.field sc.id "requestedDrug" "drug" "Requested drug",
      Canonical.field sc.id "eligibility" "refillScheduleEligibility" "Refill schedule eligibility"] }
    else sc }

/-- The current spec binds refill approval to the requested drug. Its
interaction floor follows that capture. A modification is a new prescription
and must pass ordinary signing, including Schedule II's zero-refill gate. -/
def refillGoals := deriveGoals catalogSpec facts user .W7
  { refill? := some "approve", orders := [GoalsTests.warf] } [GoalsTests.warf] none
#guard refillGoals.values.any (fun g => g.element == "drug" && g.value? == some (.code "warfarin"))
#guard refillGoals.values.any (fun g => g.element == "refillScheduleEligibility" &&
  g.value? == some (.code "notScheduleII"))
def interactingFacts := { facts with currentMedClasses := ["nsaid"] }
def interactingRefill := deriveGoals catalogSpec interactingFacts user .W7
  { refill? := some "approve", orders := [GoalsTests.warf] } [GoalsTests.warf] none
#guard interactingRefill.expectedAcks == [("interactionRefill", "warfarin@" ++ toString facts.medsVersion)]
def modifiedRefill := deriveGoals Specs.V1.specV1 facts user .W7
  { refill? := some "modify", orders := [opioid] } [opioid] none
#guard modifiedRefill.commits == ["signOrders"]
#guard modifiedRefill.values.any (fun g => g.element == "dose" && g.value? == some (.qty 50 .mg))
#guard modifiedRefill.values.any (fun g => g.element == "refills" && g.value? == some (.qty 0 .none))
#guard !modifiedRefill.values.any (·.element == "refillScheduleEligibility")
def multiControlled := deriveGoals catalogSpec facts user .W1
  { orders := [opioid, GoalsTests.warf] } [opioid, GoalsTests.warf] none
-- Advancing must satisfy Core's cross-artifact line stop. The last line
-- needs no series-only date when it is signed as an ordinary prescription.
#guard multiControlled.values.any (fun g => g.element == "earliestFillDate" && g.slot? == some 0)
#guard !multiControlled.values.any (fun g => g.element == "earliestFillDate" && g.slot? == some 1)
def deniedRefill := deriveGoals Specs.V1.specV1 facts user .W7
  { refill? := some "deny", refillReason? := some "early-refill" } [] none
#guard deniedRefill.commits == ["denyRefill"]
#guard deniedRefill.values.any (fun g => g.element == "refillDenyReason" && g.value? == some (.code "early-refill"))
#guard deniedRefill.expectedAcks == []

def refillResource : Lean.Json := (Lean.Json.parse
  "{\"resourceType\":\"Task\",\"for\":{\"reference\":\"Patient/p\"},\"focus\":{\"reference\":\"#rx\"},\"contained\":[{\"resourceType\":\"MedicationRequest\",\"id\":\"rx\",\"subject\":{\"reference\":\"Patient/p\"},\"medicationCodeableConcept\":{\"coding\":[{\"code\":\"11289\"}],\"text\":\"warfarin\"},\"dosageInstruction\":[{\"route\":{\"text\":\"PO\"},\"timing\":{\"code\":{\"text\":\"daily\"}},\"doseAndRate\":[{\"doseQuantity\":{\"value\":3,\"unit\":\"mg\"}}]}]}]}").toOption.getD .null
def renewalTask : Task := {
  PolicyTests.task with
  patientId := "p"
  workflow := .W7
  choices := { refill? := some "approve" }
  todayResources := [refillResource] }
#guard (refillPrescription renewalTask).map (·.drug) == some "warfarin"
#guard (taskChoices renewalTask).orders == [GoalsTests.warf]
#guard ((taskEpisodes facts renewalTask).head?.map (·.facts.medToGive?)) == some facts.medToGive?
-- Reject ambiguous, unrelated and missing requests instead of selecting a home med.
#guard refillPrescription { renewalTask with patientId := "another-patient" } == none
#guard refillPrescription { renewalTask with todayResources := [refillResource, refillResource] } == none
#guard taskEpisodes facts { renewalTask with todayResources := [] } |>.isEmpty
#guard (taskChoices { renewalTask with choices := {
  refill? := some "modify", orders := [{ GoalsTests.warf with doseTenths := 20 }] } }).orders.map
  (·.doseTenths) == [20]
-- Canonical full-catalog simulations require the same trusted record evidence
-- as PolicyTests; the Tiny programs below keep their original minimal facts.
def renewalDay := simulate catalogSpec catalogProgram
  { PolicyTests.p1 with backtrackRate := 0 }
  { PolicyTests.schedule with tasks := [renewalTask] } (fun _ =>
    if Specs.ruleProfile == .full then Canonical.FeatureExamples.withEvidence interactingFacts else interactingFacts) 123
#guard let day := renewalDay
  day.tasks.all (·.completed) &&
  (day.floor.zip day.tasks).all (fun (a, b) => below a b) &&
  day.trace.any (fun e => e.event == .ack "interactionRefill")
def denialDay := simulate Specs.V1.specV1 Canonical.canonicalV1
  { PolicyTests.p1 with backtrackRate := 0 }
  { PolicyTests.schedule with tasks := [{ renewalTask with choices := {
      refill? := some "deny", refillReason? := some "early-refill" } }] } (fun _ => PolicyTests.canonicalFacts) 123
#guard let day := denialDay
  day.tasks.all (·.completed) && day.trace.any (fun e => match e.event with
    | .click id => id == "w7Decision.commit.denyRefill" | _ => false)

/-- ED and result workflows can use shared note/order composers through
Home. Workflow labels must not make otherwise reachable goals unreachable. -/
def sharedTask : Task := { PolicyTests.task with
  workflow := .W3,
  choices := { orders := [GoalsTests.amox], noteSections := ["hpi", "exam", "mdm"], disposition? := some "admit" } }
def sharedDay := simulate Specs.V1.specV1 Canonical.canonicalV1
  { PolicyTests.p1 with reviewsAllergiesEarly := false, backtrackRate := 0 }
  { PolicyTests.schedule with tasks := [sharedTask] } (fun _ => PolicyTests.canonicalFacts) 123
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
/-- Legacy fixed-cost mode: each declared interruption is one wait. -/
def legacyInterruptions : Resumption.InterruptionConfig := { mode := .fixedCost, legacyModel := true }
def fastDay := simulate spec fastProgram PolicyTests.p1 pairedSchedule (fun _ => facts) 123 legacyInterruptions
def slowDay := simulate spec program PolicyTests.p1 pairedSchedule (fun _ => facts) 123 legacyInterruptions
#guard fastDay.tasks.all (·.completed) && slowDay.tasks.all (·.completed)
#guard (fastDay.trace.flatMap (·.ops) |>.filter (· == .wait)).length == 7
#guard (slowDay.trace.flatMap (·.ops) |>.filter (· == .wait)).length == 7
#guard (fastDay.floor.zip fastDay.tasks).all (fun (a, b) => below a b)

/-- Real-work mode (the wave-3 default clock): interruptions are exogenous
arrivals served as communication work on the serial clock, never fixed waits.
The offered work is identical for both layouts. -/
def fastReal := simulate spec fastProgram PolicyTests.p1 pairedSchedule (fun _ => facts) 123
def slowReal := simulate spec program PolicyTests.p1 pairedSchedule (fun _ => facts) 123
#guard fastReal.tasks.all (·.completed) && slowReal.tasks.all (·.completed)
#guard (fastReal.trace.flatMap (·.ops) |>.filter (· == .wait)).length == 0
#guard (slowReal.trace.flatMap (·.ops) |>.filter (· == .wait)).length == 0
#guard (fastReal.tasks ++ slowReal.tasks).all fun t =>
  t.interruptions?.any (·.model == "interrupting-work-v3")
#guard fastReal.tasks.map (·.interruptions?.map (·.offered)) ==
  slowReal.tasks.map (·.interruptions?.map (·.offered))
#guard (fastReal.floor.zip fastReal.tasks).all (fun (a, b) => below a b)
#guard (fastReal.tasks ++ slowReal.tasks).all fun t => t.interruptions?.any fun m =>
  !m.offered.isEmpty && m.handled + m.deferred == m.offered.length

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
