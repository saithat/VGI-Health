import Ehr.Examples.TinyTests
import Ehr.Api

namespace Ehr.CoreTests
open Ehr.Examples.Tiny Ehr.Examples.TinyTests

def addLine : Component := { id := "add", kind := .button .newOrderLine }
def incomplete : State :=
  run atOrder [.enter "drugField" (.code "amoxicillin")]
#guard !currentLineComplete spec facts user incomplete
#guard clickCore spec program facts user .human incomplete addLine ==
  (incomplete, .blocked "finish this order line first")
#guard (clickCore spec program facts user .«macro» incomplete addLine).1 == incomplete
#guard currentLineComplete spec facts user atOrder
#guard (clickCore spec program facts user .human atOrder addLine).1.currentSlot == 1
#guard currentLineComplete spec facts user atSignAmox
#guard (clickCore spec program facts user .human atSignAmox addLine).1.currentSlot == 1
-- Inline alerts never acknowledge themselves; macros stop with a reason.
def inlineAlert : Component := { id := "alert", kind := .alert "drugAllergy" false }
#guard (clickCore spec program facts user .human atSignAmox inlineAlert).1.popup? ==
  some ("drugAllergy", "amoxicillin@3")
#guard (clickCore spec program facts user .human atSignAmox inlineAlert).1.acked == atSignAmox.acked
#guard (step spec program facts user .human atSignAmox (.click "drugAllergyAlert")).2 == .ok
#guard (clickAlert spec program facts atSignTab "drugAllergy").2 == .ignored
#guard (clickAlert spec program facts acked.1 "drugAllergy").2 == .ignored
#guard (clickAlert spec program facts atOrder "careGap").2 == .ignored
#guard (clickAlert spec program facts atOrder "unknown").2 == .ignored
#guard clickCore spec program facts user .«macro» atSignAmox inlineAlert ==
  (atSignAmox, .blocked "human only: acknowledge")
#guard (step spec program facts user .«macro» atSignAmox (.click "drugAllergyAlert")).2 ==
  .blocked "human only: acknowledge"
#guard (step spec program facts user .human popped.1 (.click "drugAllergyAlert")).1 == popped.1
#guard (step spec program facts user .human popped.1 (.ack "drugAllergy")).1.acked ==
  [("drugAllergy", "amoxicillin@3")]
-- Episode conditions are exact and per-line weight tests use that line's drug.
#guard !whenHolds facts atSignAmox (.encounter "preop")
#guard whenHolds { facts with encounterKind? := some "preop" } atSignAmox (.encounter "preop")
#guard !whenHolds { facts with encounterKind? := some "postop" } atSignAmox (.encounter "preop")
#guard whenHolds facts atSignAmox .weightBased
#guard !whenHolds facts (orderState "metformin" 5000 none) .weightBased
#guard lineMatches facts atSignAmox .weightBased 1 "amoxicillin"
#guard !lineMatches facts atSignAmox .weightBased 1 "metformin"

def weightSpec : ElementSpec := (spec.element? "weight").getD default
#guard prefillRecord { facts with record := [("weightYesterday", "20")] }
  s0 "weight" weightSpec 0 (.fromRecord "weightYesterday") == none
#guard (prefillRecord facts s0 "weight" weightSpec 0 (.fromRecord "weightToday")).isSome
#guard (prefillRecord { facts with weightToday? := some (440, .lb) }
  s0 "weight" weightSpec 0 (.fromRecord "weightToday")).map (·.value) == some (.qty 440 .lb)
#guard prefillRecord facts s0 "weight" { weightSpec with recordFact? := none } 0
  (.fromRecord "weightToday") == none

def passive : AlertSpec :=
  { id := "careGap", label := "Care gaps", cond := .careGap, tier := .passive
    commit := "signOrders", screens := ["W1"] }
#guard passive.targetsScreen { id := "renamed", title := "New layout", workflow := "W1", components := [] }
#guard !passive.targetsScreen { id := "order", title := "Other", workflow := "W5", components := [] }
-- Absolute caps prevent false low-dose alerts in heavy teenagers.
#guard [525, 696, 714].all fun kgTenths =>
  !doseOutOfRange { facts with weightToday? := some (kgTenths, .kg) }
    (orderState "albuterol" 50 none) 0 "albuterol"
#guard doseOutOfRange { facts with weightToday? := some (714, .kg) }
  (orderState "albuterol" 51 none) 0 "albuterol"
#guard doseOutOfRange { facts with weightToday? := some (714, .kg) }
  (orderState "albuterol" 49 none) 0 "albuterol"
#guard !doseOutOfRange { facts with weightToday? := some (200, .kg) }
  (orderState "albuterol" 30 none) 0 "albuterol"
#guard doseOutOfRange { facts with weightToday? := none }
  (orderState "albuterol" 51 none) 0 "albuterol"
#guard !doseOutOfRange { facts with weightToday? := some (1200, .kg) }
  (orderState "ibuprofen" 4000 none) 0 "ibuprofen"
#guard doseOutOfRange { facts with weightToday? := some (1200, .kg) }
  (orderState "ibuprofen" 4001 none) 0 "ibuprofen"
#guard doseOutOfRange { facts with weightToday? := some (1200, .kg) }
  (orderState "ibuprofen" 3999 none) 0 "ibuprofen"
#guard !doseOutOfRange { facts with weightToday? := some (1200, .kg) }
  (orderState "acetaminophen" 10000 none) 0 "acetaminophen"
#guard !doseOutOfRange { facts with weightToday? := some (900, .kg) }
  (orderState "ondansetron" 40 none) 0 "ondansetron"
#guard doseOutOfRange { facts with weightToday? := none }
  (orderState "ondansetron" 41 none) 0 "ondansetron"
#guard !doseOutOfRange { facts with weightToday? := some (200, .kg) }
  (orderState "ibuprofen" 2000 none) 0 "ibuprofen"
#guard doseOutOfRange { facts with weightToday? := some (200, .kg) }
  (orderState "ibuprofen" 999 none) 0 "ibuprofen"

def imaging : OrderChoice :=
  { drug := "", kind? := some .imaging, code? := some "70551", doseTenths := 0
    unit := .none, route := "", freq := "" }
#guard imaging.isPriorAuthService
#guard !({ drug := "amoxicillin", doseTenths := 5000, unit := .mg,
           route := "PO", freq := "tid" } : OrderChoice).isPriorAuthService
#guard roundTrips imaging
#guard roundTrips ({ orders := [imaging], painScore? := some 7, w6Step? := some .preop, refillReason? := some "early refill" } : TaskChoices)
#guard roundTrips ({ drug := "oxycodone", doseTenths := 50, unit := .mg, route := "PO", freq := "q6h", supplyDays? := some 3, curesExemptReason? := some "short supply", holdReason? := some "patient refused" } : OrderChoice)

def serviceState : State :=
  { atOrder with captured :=
    [{ element := "orderKind", slot := 0, value := .code "imaging", byHuman := true, confirmed := true },
     { element := "orderCode", slot := 0, value := .code "70551", byHuman := true, confirmed := true }] }
#guard hasOrderAt serviceState 0
#guard !hasOrderAt serviceState 1
#guard orderLines serviceState == []
#guard alertKeys facts serviceState .drugAllergy == []
#guard (requestPriorAuth specV1_1 user .human serviceState).2 ==
  .blocked "human entry required: priorAuthRequest"
-- Services can be entered through the same public interpreter, when the
-- release spec declares their fields; they are not just constructed states.
def serviceSpec : Spec :=
  { specV1_1 with elements := specV1_1.elements ++
      [{ id := "orderKind", label := "Order kind", kind := .coded "order-kind",
         enteredBy := [.physician], prefill := .defaultConfirm,
         friction := .compliance, fhirTarget := "ServiceRequest.category" },
       { id := "orderCode", label := "Service code", kind := .coded "service-code",
         enteredBy := [.physician], prefill := .defaultConfirm,
         friction := .compliance, fhirTarget := "ServiceRequest.code" }] }
def serviceProgram : Program :=
  { programV1_1 with screens := programV1_1.screens.map fun sc =>
      if sc.id == "order" then
        { sc with components := sc.components ++
          [{ id := "kindField", kind := .field "orderKind" .current .none },
           { id := "codeField", kind := .field "orderCode" .current .none }] }
      else sc }
def enteredService : State :=
  runAll serviceSpec serviceProgram facts user .human (init serviceSpec serviceProgram facts user)
    [.click "toOrder", .enter "kindField" (.code "procedure"),
     .enter "codeField" (.code "47562"), .enter "paField" (.flag true), .click "paRequest"]
#guard hasOrderAt enteredService 0
#guard orderLines enteredService == []
#guard (capturedAt? enteredService priorAuthElement 0).map (·.value) == some (.flag true)
-- A request click preserves every confirmed capture, even a false flag or
-- a value entered through another field; it cannot erase provenance.
def confirmedRequest : State :=
  { serviceState with captured := serviceState.captured ++
    [{ element := priorAuthElement, slot := 0, value := .flag false, byHuman := true, confirmed := true, provenance? := some "human field" }] }
#guard requestPriorAuth specV1_1 user .human confirmedRequest == (confirmedRequest, .ignored)
#guard requestPriorAuth specV1_1 user .«macro» confirmedRequest == (confirmedRequest, .ignored)
#guard requestPriorAuth specV1_1 user .human afterPA.1 == (afterPA.1, .ignored)
-- The convenience action remains usable for a spec that authorizes it.
def actionRequestSpec : Spec :=
  { version := "action-request", elements :=
      [{ id := priorAuthElement, label := "Request", kind := .flag,
         enteredBy := [.physician], prefill := .defaultConfirm,
         friction := .compliance, fhirTarget := "ServiceRequest" }],
    infos := [], commits := [], entries := [], reviews := [], alerts := [], design := spec.design }
#guard (requestPriorAuth actionRequestSpec user .human serviceState).2 == .ok
#guard (requestPriorAuth actionRequestSpec user .«macro» serviceState).2 == .ok
#guard (capturedAt? (requestPriorAuth actionRequestSpec user .«macro» serviceState).1
  priorAuthElement 0).map (·.confirmed) == some false
#guard requestPriorAuth actionRequestSpec user .human confirmedRequest == (confirmedRequest, .ignored)

namespace ScheduleII

/-- Example adoption of 21 CFR 1306.12(a), kept here for the content lane to
apply to its hospital specs: each Schedule II medication line has zero refills. -/
def zeroRefills : EntryReq :=
  { commit := "signOrders", element := "refills", when := .drugClass "scheduleII",
    perOrderLine := true, allowed? := some ["0"] }

def refills : ElementSpec :=
  { id := "refills", label := "Refills", kind := .quantity .none,
    enteredBy := [.physician], prefill := .defaultConfirm,
    friction := .compliance, fhirTarget := "MedicationRequest.dispenseRequest.numberOfRepeatsAllowed" }

def constrainedSpec : Spec :=
  { spec with
    elements := [(spec.element? "drug").getD default, refills]
    entries := [zeroRefills], reviews := [], alerts := [] }

def constrainedProgram : Program :=
  { program with start := "order", screens :=
      [{ id := "order", title := "Order", workflow := "W1", components :=
        [{ id := "drug", kind := .field "drug" .current .none },
         { id := "refills", kind := .field "refills" .current (.default "3") },
         { id := "sign", kind := .button (.commit "signOrders") },
         addLine] }], macros := [] }

def run (events : List Event) : State :=
  runAll constrainedSpec constrainedProgram facts user .human
    (init constrainedSpec constrainedProgram facts user) events

def bad : State := run [.enter "drug" (.code "hydromorphone"), .confirm "refills"]
def good : State := run [.enter "drug" (.code "hydromorphone"), .enter "refills" (.qty 0 .none)]
def sign (s : State) := step constrainedSpec constrainedProgram facts user .human s (.click "sign")

#guard roundTrips zeroRefills
#guard match decodeJson EntryReq "{\"commit\":\"signOrders\",\"element\":\"refills\",\"when\":\"always\",\"perOrderLine\":false}" with
  | .ok rq => rq == { commit := "signOrders", element := "refills" }
  | .error _ => false
#guard roundTrips constrainedSpec
#guard roundTrips ({ zeroRefills with allowed? := some [] } : EntryReq)
#guard whenHolds facts bad (.drugClass "scheduleII")
#guard !lineMatches facts bad (.drugClass "scheduleII") 0 "tramadol"
#guard !lineMatches facts bad (.drugClass "scheduleII") 0 "lorazepam"
#guard !lineMatches facts bad (.drugClass "scheduleII") 0 "alprazolam"
#guard !entryMet constrainedSpec facts user bad zeroRefills
#guard sign bad == (bad, .blocked "value not allowed: refills (allowed: 0)")
#guard (view constrainedSpec constrainedProgram facts user bad).blocked.contains
  ("sign", "value not allowed: refills (allowed: 0)")
#guard !(view constrainedSpec constrainedProgram facts user bad).enabled.contains "sign"
#guard !currentLineComplete constrainedSpec facts user bad
#guard (step constrainedSpec constrainedProgram facts user .human bad (.click "add")).2 ==
  .blocked "finish this order line first"
#guard (step constrainedSpec constrainedProgram facts user .«macro» bad (.click "add")).2 ==
  .blocked "finish this order line first"
#guard currentLineComplete constrainedSpec facts user good
#guard entryMet constrainedSpec facts user good zeroRefills
#guard (sign good).2 == .ok
#guard (sign good).1.commits == ["signOrders"]
-- Every Schedule II drug is constrained; Schedule IV and ordinary drugs are not.
#guard ["morphine", "hydromorphone", "oxycodone", "hydrocodone-acetaminophen"].all fun d =>
  (sign (run [.enter "drug" (.code d), .enter "refills" (.qty 30 .none)])).2 ==
    .blocked "value not allowed: refills (allowed: 0)"
#guard ["tramadol", "lorazepam", "alprazolam", "amoxicillin"].all fun d =>
  (sign (run [.enter "drug" (.code d), .confirm "refills"])).2 == .ok
-- Units and confirmation remain mandatory even when the number is allowed.
#guard !entryMet constrainedSpec facts user
  (run [.enter "drug" (.code "morphine"), .enter "refills" (.qty 0 .mg)]) zeroRefills
#guard !entryMet constrainedSpec facts user
  { good with captured := good.captured.map fun x => { x with confirmed := false } } zeroRefills
#guard !entryMet constrainedSpec facts user good { zeroRefills with allowed? := some [] }
#guard !entryMet constrainedSpec facts user good { zeroRefills with allowed? := some ["bad number"] }
#guard entryMet constrainedSpec facts user bad { zeroRefills with allowed? := none }
-- Whole-episode constraints use the same check, and inactive requirements do not block.
#guard !entryMet constrainedSpec facts user bad { zeroRefills with perOrderLine := false }
#guard entryMet constrainedSpec facts user good { zeroRefills with perOrderLine := false }
#guard entryMet constrainedSpec facts user (run []) zeroRefills
-- A good value on another line cannot satisfy the Schedule II line.
def otherSlot : State :=
  { bad with captured := bad.captured ++
      [{ element := "refills", slot := 1, value := .qty 0 .none, byHuman := true, confirmed := true }] }
#guard !entryMet constrainedSpec facts user otherSlot zeroRefills
#guard (sign otherSlot).2 == .blocked "value not allowed: refills (allowed: 0)"
-- Mixed lines: every matching line needs its own zero; nonmatching lines may have refills.
def mixed : State :=
  { good with currentSlot := 1, captured := good.captured ++
      [{ element := "drug", slot := 1, value := .code "oxycodone", byHuman := true, confirmed := true },
       { element := "refills", slot := 1, value := .qty 30 .none, byHuman := true, confirmed := true }] }
#guard !entryMet constrainedSpec facts user mixed zeroRefills
#guard entryMet constrainedSpec facts user
  { mixed with captured := setCaptured mixed.captured { element := "refills", slot := 1, value := .qty 0 .none, byHuman := true, confirmed := true } } zeroRefills
#guard entryMet constrainedSpec facts user
  { mixed with captured := setCaptured mixed.captured { element := "drug", slot := 1, value := .code "tramadol", byHuman := true, confirmed := true } } zeroRefills
-- An unconfirmed zero and a confirmed disallowed value cannot be combined.
#guard !entryMet constrainedSpec facts user
  { bad with captured := bad.captured ++
      [{ element := "refills", slot := 0, value := .qty 0 .none,
         byHuman := true, confirmed := false }] } zeroRefills
-- Existing kind validation is retained even if the allowlist contains false.
#guard !hasGoodEntry facts user
  { good with captured := [{ element := "refills", slot := 0, value := .flag false, byHuman := true, confirmed := true }] }
  { refills with kind := .flag } (some 0) (some ["false"])
-- The API's parsed JSON path uses the same hard stop and blocked reason.
#guard match decodeJson StepOutput (apiStep (encodeJson constrainedSpec) (encodeJson constrainedProgram)
    (encodeJson facts) (encodeJson user) (encodeJson bad) (encodeJson (Event.click "sign"))) with
  | .ok out => out.result == .blocked "value not allowed: refills (allowed: 0)"
  | .error _ => false
-- Coded and text constraints compare exact values, with no numeric coercion.
#guard entryValueAllowed { refills with kind := .text } (some ["0"]) (.text "0")
#guard !entryValueAllowed { refills with kind := .text } (some ["0"]) (.text "0.0")
#guard entryValueAllowed { refills with kind := .coded "refills" } (some ["0"]) (.code "0")
#guard !entryValueAllowed refills (some ["0"]) (.text "0")

end ScheduleII

namespace EventWindow

/-- Tiny: an assessment completed within 24 hours before a planned procedure. -/
def requirement : TemporalReq :=
  { id := "preop-assessment", subject := { event := "assessment-complete", artifactKey := "assessment" }
    anchor := { event := "procedure-start", artifactKey := "procedure" }
    minOffset := -1440, maxOffset := 0, deadline := 0 }
def context : Facts :=
  { facts with
    epochMinute? := some 10000, episodeId? := some "episode-1",
    artifactBindings? := some [{ key := "assessment", artifact := "a", version := 2 },
                               { key := "procedure", artifact := "p", version := 1 }],
    eventEvidence? := some [
      { event := "assessment-complete", patient := facts.patientId, episode := "episode-1"
        actor := "clinician", artifact := "a", version := 2, time := 8560 },
      { event := "procedure-start", patient := facts.patientId, episode := "episode-1"
        actor := "scheduler", artifact := "p", version := 1, time := 10000 }] }
def tinySpec : Spec :=
  { spec with
    entries := [], reviews := [], alerts := [],
    commits := [{ id := "signOrders", label := "Sign", roles := [.physician], temporal? := some [requirement] }] }
def stale : Facts :=
  { context with eventEvidence? := context.eventEvidence?.map (fun es => es.map fun e =>
      if e.event == "assessment-complete" then { e with time := 8559 } else e) }
#guard temporalStatus context atOrder requirement == .met
#guard temporalStatus stale atOrder requirement == .invalid
#guard temporalStatus { context with epochMinute? := some 10001 } atOrder requirement == .met
#guard temporalStatus { stale with epochMinute? := some 10001 } atOrder requirement == .overdue
#guard temporalStatus { context with episodeId? := some "other" } atOrder requirement == .missing
#guard temporalStatus { context with artifactBindings? := some [] } atOrder requirement == .missing
#guard temporalStatus { context with eventEvidence? := context.eventEvidence?.map (fun es => es ++ es) }
  atOrder requirement == .missing
#guard temporalStatus { context with eventEvidence? := context.eventEvidence?.map (fun es => es.map fun e =>
  if e.event == "assessment-complete" then { e with version := 1 } else e) } atOrder requirement == .missing
#guard temporalStatus { context with eventEvidence? := context.eventEvidence?.map (fun es => es.map fun e =>
  if e.event == "assessment-complete" then { e with patient := "other" } else e) } atOrder requirement == .missing
#guard !commitGuard tinySpec program stale user atOrder "signOrders"
#guard (clickCommit tinySpec program stale user atOrder "signOrders").1.commits == []
#guard commitGuard tinySpec program context user atOrder "signOrders"
#guard (clickCommit tinySpec program context user atOrder "signOrders").1.commits == ["signOrders"]
#guard (view tinySpec program stale user atOrder).obligations? ==
  some [{ commit := "signOrders", requirement := "preop-assessment", status := .invalid }]
#guard roundTrips requirement && roundTrips context
-- Friday to Monday: one business date crossed, even with duplicate calendar rows.
def calendarFacts : Facts :=
  { context with calendars? := some [{ id := "hospital", firstDay := 0, lastDay := 10, workingDays := [1, 2, 3, 4, 7, 7, 8] }] }
#guard timeDistance calendarFacts (.businessDays "hospital") (4 * 1440) (7 * 1440) == some 1
#guard timeDistance calendarFacts (.businessDays "hospital") (7 * 1440) (4 * 1440) == some (-1)
#guard timeDistance calendarFacts (.businessDays "hospital") 0 (11 * 1440) == none
#guard timeDistance context .minutes 10000 8560 == some (-1440)

end EventWindow

end Ehr.CoreTests
