import Ehr.Commit.Mar
import Ehr.Commit.Tests
import Ehr.Sim.Goals
import Ehr.Specs.V1

namespace Ehr.Commit.Mar.Tests
open Lean Render.Fhir

def dose : Multi.DoseKey := { patient := 1, order := 9, occurrence := 600 }
def otherDose : Multi.DoseKey := { patient := 1, order := 9, occurrence := 960 }
def history : List Event :=
  [.barcodeScanned dose "nurse-a" "patient" "pt-1",
   .barcodeScanned dose "nurse-a" "medication" "amoxicillin",
   .held dose "nurse-a" "NPO", .refused dose "nurse-b" "patient refused",
   .doubleCheckCosign dose "nurse-a" "nurse-b", .administered dose 1 "nurse-a",
   .administered dose 2 "nurse-b", .administered otherDose 2 "nurse-b"]

#guard (reduce {} history).shared.administrations == [(otherDose, 2), (dose, 1)]
#guard (reduce {} history).events == history
#guard (reduce {} [.held dose "nurse-a" "NPO"]).shared == ({} : Multi.State)
#guard (reduce {} [.refused dose "nurse-b" "refused"]).shared == ({} : Multi.State)

/-- Distinct actors cannot add a second administration of one occurrence. -/
example : Invariant (reduce {} history) := reduce_invariant _ _ Multi.initial_invariant

/-- Boundary fixture: captures are the simulator's explicit value goals. Human
UI authorization is separately covered by Commit.Tests and MAR service tests. -/
def medication (outcome : AdministrationOutcome) (notify := false) : OrderChoice :=
  { drug := "amoxicillin", doseTenths := 5000, unit := .mg, route := "PO", freq := "BID"
    administration? := some {
      outcome := outcome
      reason := "documented-reason"
      occurrence := "pt1:order9:600"
      scheduledMin := 600
      windowEndMin := 630
      attemptMin := 620
      reoffer := true
      notifyPrescriber := notify } }

def goalCaptures (m : OrderChoice) : Ehr.State :=
  let gs := Sim.deriveGoals Specs.V1.specV1 Commit.Tests.currentFacts
    { id := "nurse", role := .rn } .W4 { administer := [m] } [] (some m)
  let captures := gs.values.filterMap fun g =>
    g.value?.map fun value =>
      { element := g.element, slot := g.slot?.getD 0, value := value,
        byHuman := true, confirmed := true : Captured }
  { Commit.Tests.staged with captured := captures }

def input (state : State := {}) : Input :=
  { state := state
    version := 1
    expectedVersion := 1
    actor := 1
    dose := dose
    request := { Commit.Tests.request with user := { id := "nurse", role := .rn } }
    medicationRequest := "order9"
    encounter := "enc-1"
    time := "2026-11-02T10:20:00Z"
    resourceId := "mar1" }

def mapped (m : OrderChoice) : Option Event := outcomeEvent (input {}) (goalCaptures m)

#guard mapped (medication .given) == some (.administered dose 1 "nurse")
#guard mapped (medication .held) == some (.held dose "nurse" "documented-reason; re-offered within window")
#guard mapped (medication .refused) == some (.refused dose "nurse" "documented-reason; re-offered within window")
#guard mapped (medication .notGiven) == some (.notGiven dose "nurse" "documented-reason; re-offered within window")
#guard mapped (medication .delayed) == some (.delayed dose "nurse" "documented-reason; re-offered within window")
-- The historical regression remains explicit, alongside typed refusal.
#guard Sim.administrationStatus { medication .given with administration? := none, holdReason? := some "patient-refused" } == "refused"
#guard Sim.administrationStatus { medication .given with administration? := none, holdReason? := some "npo" } == "held"

#guard (reduce {} [.delayed dose "nurse" "unavailable", .notGiven dose "nurse" "expired"]).shared == ({} : Multi.State)
#guard (reduce {} [.refused dose "nurse" "declined", .refused dose "nurse" "declined again",
  .administered dose 1 "nurse", .administered dose 2 "other"]).shared.administrations == [(dose, 1)]
#guard (reduce {} [.delayed dose "nurse" "off unit", .administered dose 1 "nurse",
  .administered dose 2 "other"]).shared.administrations == [(dose, 1)]

#guard [AdministrationOutcome.held, .refused, .notGiven, .delayed].all fun outcome =>
  field (resource (input {}) (goalCaptures (medication outcome))) "dosage" == .null
#guard str (resource (input {}) (goalCaptures (medication .delayed))) "status" == "on-hold"
#guard acuteAdministrationStatus (resource (input {}) (goalCaptures (medication .delayed))) == "Delayed"
#guard acuteAdministrationStatus (resource (input {}) (goalCaptures (medication .refused))) == "Refused"
#guard acuteAdministrationStatus (resource (input {}) (goalCaptures (medication .held))) == "Held"
#guard acuteAdministrationStatus (resource (input {}) (goalCaptures (medication .notGiven))) == "Not given"

-- Escalation requires its own nursing documentation episode, tied to the dose.
def escalation := Sim.episodes Commit.Tests.currentFacts .W4 { administer := [medication .refused true] }
#guard escalation.length == 2
#guard escalation[1].choices.administer.isEmpty
#guard Sim.taskCommits Specs.V1.specV1 .W4 escalation[1].choices == ["chartAssessment"]
#guard Sim.taskValue Commit.Tests.currentFacts { id := "nurse", role := .rn }
  escalation[1].choices escalation[1].med? Specs.V1.nursingAssessment ==
    some (.text (Sim.administrationFollowup (medication .refused true)))

end Ehr.Commit.Mar.Tests
