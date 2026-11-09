import Ehr.Sim.Goals
import Ehr.Core.Interp
import Ehr.Examples.Tiny

/-!
# Goal tests on the tiny example

The tiny spec requires, for `signOrders`: patient-ID re-entry, weight, a drug,
a dose per order line, and a cosign for high-alert drugs.
-/

namespace Ehr.Sim.GoalsTests

open Ehr Ehr.Sim Ehr.Examples.Tiny

/-- One amoxicillin 500 mg order (the tiny patient is penicillin-allergic). -/
def amox : OrderChoice :=
  { drug := "amoxicillin", doseTenths := 5000, unit := .mg, route := "PO", freq := "BID" }

/-- A warfarin order (high-alert: needs a cosign). -/
def warf : OrderChoice :=
  { drug := "warfarin", doseTenths := 30, unit := .mg, route := "PO", freq := "daily" }

def gAmox : Goals := deriveGoals spec facts user .W1 { orders := [amox] } [amox] none
def gTwo : Goals := deriveGoals spec facts user .W1 { orders := [amox, warf] } [amox, warf] none

#guard gAmox.commits == ["signOrders"]
#guard gAmox.problems == []
-- ID re-entry, weight (20.0 kg from the record), drug and dose on slot 0.
#guard gAmox.values.map (fun g => (g.element, g.slot?)) ==
  [("patientIdReentry", none), ("weight", none), ("drug", some 0), ("dose", some 0)]
#guard (gAmox.values.find? (·.element == "patientIdReentry")).bind (·.value?) == some (.text "JD/F/34")
#guard (gAmox.values.find? (·.element == "weight")).bind (·.value?) == some (.qty 200 .kg)
-- The drug-allergy alert is expected to fire once.
#guard gAmox.expectedAcks == [("drugAllergy", "amoxicillin@3")]
-- Two orders: per-line drug and dose, plus a cosign (warfarin is high-alert).
#guard (gTwo.values.filter (·.element == "dose")).map (·.slot?) == [some 0, some 1]
#guard (gTwo.values.find? (·.element == "cosigner")).bind (·.value?) == some (.user "u1-second")
-- No goal commit for a workflow the spec lacks: reported as a problem.
#guard (deriveGoals spec facts user .W7 { refill? := some "approve" } [] none).problems.length == 1
-- A weight recorded in lb becomes the converted kg value (154.0 lb ↦ 69.9 kg).
#guard weightKgGoal { facts with weightToday? := some (1540, .lb) } == some (.qty 699 .kg)

/-- The tiny happy path for the amoxicillin order (with the allergy tab open,
the alert acknowledged). -/
def happy : State :=
  runAll spec program facts user .human (init spec program facts user)
    [.confirm "weightField", .click "toOrder", .enter "drugField" (.code "amoxicillin"),
     .enter "doseField" (.qty 5000 .mg), .click "toSign", .enter "patientIdField" (.text "JD/F/34"),
     .selectTab "signTabs" 1, .click "signButton", .ack "drugAllergy", .click "signButton"]

#guard goalsMet spec facts user gAmox happy
#guard !goalsMet spec facts user gAmox (init spec program facts user)
-- A different dose does not meet the goal.
#guard !goalsMet spec facts user gAmox
  (runAll spec program facts user .human happy [.click "backButton", .enter "doseField" (.qty 2500 .mg)])

-- An incompatible explicit dose stays fixed; no accepted-value substitution.
def incompatibleDose : ValueGoal :=
  { element := "dose", slot? := some 0, value? := some (.qty 50000 .units), commit := "signOrders" }
#guard (checkFit spec facts user incompatibleDose).1 == incompatibleDose
#guard !(checkFit spec facts user incompatibleDose).2.isEmpty
#guard !goalsMet spec facts user { gAmox with values := [incompatibleDose] } happy

-- Refill dose follows the focused prescription rather than a placeholder.
#guard taskValue facts user { orders := [warf] } none
  { id := "refillDose", label := "Refill dose", kind := .quantity .mg,
    enteredBy := [.physician], prefill := .never, friction := .safety,
    fhirTarget := "MedicationRequest.dosageInstruction" } == some (.qty 30 .mg)

-- Supplied section text is typed; other sections and older schedules keep the fixed phrase.
def hpiElement : ElementSpec :=
  { id := "hpi", label := "HPI", kind := .text, enteredBy := [.physician],
    prefill := .never, friction := .compliance, fhirTarget := "Composition.section.text" }
#guard taskValue facts user { noteSections := ["hpi"], noteTexts? := some [{ id := "hpi", text := "Two days of cough." }] } none
  hpiElement == some (.text "Two days of cough.")
#guard taskValue facts user { noteSections := ["hpi"], noteTexts? := some [{ id := "exam", text := "Clear." }] } none
  hpiElement == some (.text (noteText "hpi"))
#guard taskValue facts user { noteSections := ["hpi"] } none hpiElement == some (.text (noteText "hpi"))
#guard ((Lean.Json.parse "{\"orders\":[],\"administer\":[],\"ackResult\":false,\"immunizations\":[],\"noteSections\":[\"hpi\"]}" >>= Lean.fromJson? (α := TaskChoices)).toOption.map (·.noteTexts?)) == some none
#guard ((Lean.Json.parse "{\"orders\":[],\"administer\":[],\"ackResult\":false,\"immunizations\":[],\"noteSections\":[\"hpi\"],\"noteTexts\":[{\"id\":\"hpi\",\"text\":\"Cough.\"}]}" >>= Lean.fromJson? (α := TaskChoices)).toOption.map (·.noteTexts?)) == some (some [{ id := "hpi", text := "Cough." }])

end Ehr.Sim.GoalsTests
