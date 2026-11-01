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

-- Historical versions do not make unique current-version evidence ambiguous.
#guard temporalStatus { context with eventEvidence? := context.eventEvidence?.map (fun es =>
  es ++ es.map (fun e => { e with version := 0 })) } atOrder requirement == .met
-- 07:00 to 09:00 UTC crosses local midnight in UTC-8, although not UTC midnight.
#guard timeDistance { context with calendars? := some [{ id := "local", firstDay := -1, lastDay := 1, workingDays := [0], utcOffsets? := some [(-10000, -480)] }] } (.businessDays "local") 420 540 == some 1
#guard businessLocalDay { id := "local", firstDay := 0, lastDay := 2, workingDays := [], utcOffsets? := some [(0, -480), (1440, -420)] } 1860 == some 1
#guard businessLocalDay { id := "unknown-zone", firstDay := 0, lastDay := 2, workingDays := [], utcOffsets? := some [] } 600 == none
-- A zero business-date distance never substitutes for actual before/after ordering.
#guard !temporalOrdering { requirement with metric := .businessDays "hospital" } 10000 10001
#guard !temporalOrdering { requirement with metric := .businessDays "hospital", direction? := some .before } 10000 10001
#guard temporalOrdering { requirement with metric := .businessDays "hospital", direction? := some .after } 10000 10001
#guard !temporalOrdering { requirement with metric := .businessDays "hospital", direction? := some .after } 10000 9999
#guard temporalStatus { calendarFacts with epochMinute? := some 10001, eventEvidence? := calendarFacts.eventEvidence?.map (fun es => es.filter (·.event != "assessment-complete")) }
  atOrder { requirement with metric := .businessDays "hospital", direction? := some .before } == .overdue
end EventWindow

namespace PatientPredicate
open EventWindow

def minor : ClinicalPredicate := .ageBetween 0 17
def ageSource : ClinicalObservation :=
  { code := "birthDate", artifactKey := "assessment", artifact := "a", version := 2 }
def minorFacts : Facts := { context with clinical? := some { age? := some { years := 17, source := ageSource }, pregnancy? := some { ageSource with code := "negative" } } }
#guard clinicalEval minorFacts atOrder minor == some true
#guard clinicalEval { minorFacts with clinical? := some { age? := some { years := 18, source := ageSource } } } atOrder minor == some false
#guard clinicalEval facts atOrder (.not minor) == none
#guard whenHolds facts atOrder (.clinical minor)
#guard lineMatches facts atOrder (.clinical minor) 0 "metformin"
#guard clinicalEval minorFacts atOrder (.and minor (.factEquals .pregnancy "negative")) == some true
#guard clinicalEval minorFacts atOrder (.or minor (.riskEquals "suicide" "high")) == some true
#guard clinicalEval minorFacts atOrder (.and (.not minor) (.testEquals "HIV" "positive")) == some false
#guard clinicalEval { minorFacts with artifactBindings? := some [] } atOrder minor == none
#guard !(alertKeys minorFacts atOrder (.clinical (.not minor))).isEmpty == false
#guard !(alertKeys facts atOrder (.clinical minor)).isEmpty
#guard alertKeys facts atOrder (.clinical minor) != alertKeys minorFacts atOrder (.clinical minor)
-- Unknown minor status keeps the entry required; known adult status skips it.
def minorEntry : EntryReq := { commit := "signOrders", element := "patientIdReentry", when := .clinical minor }
#guard !entryMet spec facts user atOrder minorEntry
#guard entryMet spec { minorFacts with clinical? := some { age? := some { years := 18, source := ageSource } } } user atOrder minorEntry
#guard clinicalEval facts { atOrder with captured :=
  [{ element := "eligibility", slot := 2, value := .code "yes", byHuman := true, confirmed := true }] }
  (.capturedCode "eligibility" 2 "yes") == some true
#guard clinicalEval facts atOrder (.capturedCode "eligibility" 2 "yes") == none
#guard roundTrips (.clinical (.and minor (.not (.factEquals .pregnancy "positive"))) : When)
#guard roundTrips minorFacts
end PatientPredicate

namespace ValueValidation

def narrative : ElementSpec :=
  { id := "narrative", label := "Narrative", kind := .text, enteredBy := [.physician]
    prefill := .defaultConfirm, friction := .compliance, fhirTarget := "DocumentReference.description"
    validation? := some (.and .nonempty (.token 1 30 "abcdefghijklmnopqrstuvwxyz ")) }
def tinySpec : Spec :=
  { EventWindow.tinySpec with
    elements := [narrative], commits := [{ id := "signOrders", label := "Sign", roles := [.physician] }] }
def tinyProgram : Program :=
  { program with start := "validate", screens :=
    [{ id := "validate", title := "Validate", workflow := "W1", components :=
      [{ id := "narrative", kind := .field "narrative" (.fixed 0) (.default " ") },
       { id := "sign", kind := .button (.commit "signOrders") }] }] }
def initial : State := init tinySpec tinyProgram facts user
#guard initial.captured == []
#guard (step tinySpec tinyProgram facts user .human initial (.enter "narrative" (.text " "))).2 ==
  .blocked "invalid value for narrative"
#guard (step tinySpec tinyProgram facts user .human initial (.enter "narrative" (.text "reviewed"))).2 == .ok
#guard !validationHolds facts atOrder 0 (.text "   ") .nonempty
#guard validationHolds facts atOrder 0 (.text "2024-02-29") .isoDate
#guard !validationHolds facts atOrder 0 (.text "2025-02-29") .isoDate
#guard !validationHolds facts atOrder 0 (.text "2024-13-01") .isoDate
#guard validationHolds facts atOrder 0 (.text "0.5") (.decimal 1 false false)
#guard !validationHolds facts atOrder 0 (.text "01.5") (.decimal 1 false false)
#guard !validationHolds facts atOrder 0 (.text "1.0") (.decimal 1 false false)
#guard !validationHolds facts atOrder 0 (.qty 10 .mg) (.decimal 1 false false)
#guard validationHolds facts atOrder 0 (.text "1.00") (.decimal 2 false true)
#guard validationHolds facts atOrder 0 (.qty 50 .mg) (.quantityRange .mg 50 50)
#guard !validationHolds facts atOrder 0 (.qty 50 .lb) (.quantityRange .mg 0 100)
#guard validationHolds { facts with codeTables? := some [{ system := "ICD-10-CM", version := "2026", codes := ["J18.9"] }] }
  atOrder 0 (.code "J18.9") (.codeMember "ICD-10-CM" "2026")
#guard !validationHolds facts atOrder 0 (.code "J18.9") (.codeMember "ICD-10-CM" "2026")
#guard gtinValid "09506000134352"
#guard !gtinValid "09506000134353"
#guard udiValid "(01)09506000134352(17)261231(10)LOT-1(21)SERIAL"
#guard !udiValid "(01)09506000134352(17)260230"
#guard !udiValid "(01)09506000134352(10)A(10)B"

def calcState : State :=
  { atOrder with captured :=
    [{ element := "quantity", slot := 0, value := .qty 300 .units, byHuman := true, confirmed := true },
     { element := "dose", slot := 0, value := .qty 10 .units, byHuman := true, confirmed := true },
     { element := "freq", slot := 0, value := .code "bid", byHuman := true, confirmed := true },
     { element := "weight", slot := 0, value := .qty 200 .kg, byHuman := true, confirmed := true },
     { element := "formulation", slot := 0, value := .code "tablet", byHuman := true, confirmed := true }] }
#guard validationHolds facts calcState 0 (.qty 150 .none) (.supplyDaysCeil "quantity" "dose" "freq")
#guard !validationHolds facts calcState 1 (.qty 150 .none) (.supplyDaysCeil "quantity" "dose" "freq")
#guard validationHolds facts calcState 0 (.qty 2000 .mg) (.doseByWeight "weight" 100 5000 .mg)
#guard !validationHolds facts calcState 0 (.qty 2001 .mg) (.doseByWeight "weight" 100 5000 .mg)
#guard validationHolds facts calcState 0 (.qty 1 .units) (.weightBand 100 300)
#guard validationHolds facts calcState 0 (.qty 1 .units) (.formulationUnit "formulation" [("tablet", .units)])
#guard !validationHolds facts calcState 0 (.qty 1 .mL) (.formulationUnit "formulation" [("tablet", .units)])
def invalidCapture : State := { initial with captured :=
  [{ element := "narrative", slot := 0, value := .text " ", byHuman := true, confirmed := true }] }
#guard !commitGuard tinySpec tinyProgram facts user invalidCapture "signOrders"
#guard (view tinySpec tinyProgram facts user invalidCapture).items.any (fun i => i.validationError?.isSome)
#guard roundTrips narrative
#guard roundTrips (.and .udiGs1 (.supplyDaysCeil "quantity" "dose" "freq") : Validation)
-- Wrong/pending weight never falls back to a different recorded weight.
#guard !validationHolds { facts with weightToday? := some (200, .kg) }
  { calcState with captured := calcState.captured.map (fun x =>
    if x.element == "weight" then { x with confirmed := false } else x) }
  0 (.qty 1 .mg) (.weightBand 100 300)
#guard !validationHolds facts { calcState with captured := calcState.captured.map (fun x =>
  if x.element == "dose" then { x with value := .qty 0 .units } else x) }
  0 (.qty 150 .none) (.supplyDaysCeil "quantity" "dose" "freq")
#guard !defaultsOk { tinySpec with elements := [{ narrative with defaultValue? := some "reviewed" }] } tinyProgram
#guard prefillValueValid facts atOrder { narrative with defaultValue? := some "reviewed" } 0
  (.default "reviewed")
#guard !prefillValueValid facts atOrder { narrative with defaultValue? := some "reviewed" } 0
  (.default "other")
-- Public rejection keeps the exact original state and must match WASM.
def dateSpec : Spec := { tinySpec with elements := [{ narrative with validation? := some .isoDate }] }
#guard step dateSpec tinyProgram facts user .human initial (.enter "narrative" (.text "2025-02-29")) ==
  (initial, .blocked "invalid value for narrative")
#guard (step dateSpec tinyProgram facts user .human initial (.enter "narrative" (.text "2024-02-29"))).2 == .ok
#guard !isoDateValid "2024-2-29" && !isoDateValid "2024-02-029" && !isoDateValid "2024-02-29-"
end ValueValidation

namespace OrderExpiry

def epoch : ClockStamp :=
  { time := 0, year := 1970, month := 1, day := 1, minuteOfDay := 0, utcOffsetMinutes := 0, zone := "UTC" }
def order : OrderClock := { id := "order-1", patient := facts.patientId, issued := epoch }
def requirement : ExpiryReq :=
  { id := "order-expiry", orderKey := "order", anchor := .issued, duration := .minutes 60 }
def context : Facts :=
  { facts with epochMinute? := some 59, artifactBindings? := some [{ key := "order", artifact := "order-1", version := 1 }], orderClocks? := some [order] }
def tinySpec : Spec :=
  { EventWindow.tinySpec with commits :=
    [{ id := "signOrders", label := "Sign", roles := [.physician], expiry? := some [requirement] }] }
#guard stampValid epoch
#guard stampValid { epoch with time := -60, utcOffsetMinutes := 60 }
#guard !stampValid { epoch with time := 1 }
#guard expiryStatus context atOrder requirement == .met
#guard expiryStatus { context with epochMinute? := some 60 } atOrder requirement == .overdue
#guard expiryStatus { context with episodeId? := some "transfer-to-ward" } atOrder requirement == .met
#guard expiryStatus context { atOrder with currentSlot := 9 } requirement == .met
#guard expiryStatus context { atOrder with clock := 600 } requirement == .overdue
#guard !commitGuard tinySpec program { context with epochMinute? := some 60 } user atOrder "signOrders"
#guard (view tinySpec program { context with epochMinute? := some 60 } user atOrder).obligations? ==
  some [{ commit := "signOrders", requirement := "order-expiry", status := .overdue }]
def renewed : Facts :=
  { context with epochMinute? := some 60, orderClocks? := some [{ order with renewals := [{ event := "renew", time := 55, actor := "u2", version := 1 }] }] }
#guard expiryStatus renewed atOrder { requirement with renewal? := some { event := "renew", validForMinutes := 10 } } == .met
#guard expiryStatus { renewed with epochMinute? := some 65 } atOrder
  { requirement with renewal? := some { event := "renew", validForMinutes := 10 } } == .overdue
#guard expiryStatus renewed atOrder { requirement with renewal? := some { event := "renew", validForMinutes := 10 }, maxOriginalMinutes? := some 60 } == .overdue
#guard expiryStatus context atOrder { requirement with reassessment? := some { event := "assess", validForMinutes := 10 } } == .missing
-- January 31 + one month clamps to February 28, without a fixed 30-day approximation.
def jan31 : ClockStamp := { epoch with time := 43200, day := 31 }
def feb28 : ClockStamp := { epoch with time := 83520, month := 2, day := 28 }
def monthOrder : OrderClock :=
  { order with issued := jan31, monthCutoffs := [{ anchor := .issued, months := 1, stamp := feb28 }] }
#guard stampValid jan31 && stampValid feb28
#guard expiryCutoff monthOrder .issued jan31 (.calendarMonths 1) == some 83520
#guard expiryStatus { context with epochMinute? := some 83519, orderClocks? := some [monthOrder] }
  atOrder { requirement with duration := .calendarMonths 1 } == .met
#guard expiryStatus { context with epochMinute? := some 83520, orderClocks? := some [monthOrder] }
  atOrder { requirement with duration := .calendarMonths 1 } == .overdue
#guard roundTrips requirement && roundTrips monthOrder
end OrderExpiry

namespace StructuredDisplay

def contract : PayloadContract :=
  { fields := [{ field := "notice" }, { field := "attachment", ifAvailable := true }]
    identifiers := [.patient, .prescriber, .drug]
    rowFields := ["strength", "form", "quantity", "directions"], groupBy? := some "drugClass" }
def payload : InfoPayload :=
  { info := "controlled", patient := facts.patientId, artifactKey := "assessment", artifact := "a", version := 2
    fields := [("notice", "Signing has legal effect")], availability := [("attachment", false)]
    identifiers := [{ category := .patient, system := "MRN", value := "patient-1" },
                    { category := .prescriber, system := "NPI", value := "prescriber-1" },
                    { category := .drug, system := "RxNorm", value := "drug-1" }]
    rows := [{ id := "rx-1", slot := 0, fields := [("strength", "5 mg"), ("form", "tablet"),
      ("quantity", "10"), ("directions", "one daily"), ("drugClass", "scheduleII")] }] }
def requirement : DisplayReq :=
  { info := "controlled", scope := .commit "signOrders", pinned := true, selectionElement? := some "ready" }
def tinySpec : Spec :=
  { EventWindow.tinySpec with
    elements := [], infos := [{ id := "controlled", label := "Controlled signing", version := "", payload? := some contract }]
    commits := [{ id := "signOrders", label := "Sign", roles := [.physician], actionLabel? := some "Sign and transmit" }]
    displays? := some [requirement] }
def tinyProgram : Program :=
  { program with start := "display", screens :=
    [{ id := "display", title := "Signing", workflow := "W1", components :=
      [{ id := "details", kind := .table "controlled" },
       { id := "sign", kind := .button (.commit "signOrders"), label := "Sign and transmit" }] }] }
def context : Facts := { EventWindow.context with infoPayloads? := some [payload] }
def initial : State := init tinySpec tinyProgram context user
def selected : State := { initial with captured :=
  [{ element := "ready", slot := 0, value := .flag true, byHuman := true, confirmed := true }] }
#guard payloadComplete payload contract
#guard commitGuard tinySpec tinyProgram context user selected "signOrders"
#guard (step tinySpec tinyProgram context user .human selected (.click "sign")).1.commits == ["signOrders"]
#guard !payloadComplete { payload with fields := [] } contract
#guard !payloadComplete { payload with availability := [] } contract
#guard !payloadComplete { payload with identifiers := [] } contract
#guard !payloadComplete { payload with rows := payload.rows.map (fun r => { r with fields := [("strength", "5 mg")] }) } contract
#guard !commitGuard tinySpec tinyProgram { context with infoPayloads? := some [{ payload with version := 1 }] }
  user selected "signOrders"
#guard !commitGuard tinySpec tinyProgram { context with infoPayloads? := some [{ payload with fields := [] }] }
  user selected "signOrders"
#guard !commitGuard tinySpec { tinyProgram with screens := tinyProgram.screens.map (fun sc =>
  { sc with components := sc.components.map (fun c => if c.id == "sign" then { c with label := "Continue" } else c) }) }
  context user selected "signOrders"
#guard (payloadView tinySpec context selected "controlled").map (fun p => p.groups.map (·.key)) == some ["scheduleII"]
#guard (payloadView tinySpec context selected "controlled").map (fun p => p.groups.all (fun g => g.rows.all (·.selected))) == some true
#guard (payloadView tinySpec context initial "controlled").map (fun p => p.groups.any (fun g => g.rows.any (·.selected))) == some false
#guard (view tinySpec tinyProgram context user selected).items.any (fun i => i.payload?.isSome && i.pinned? == some true)
#guard !displayReqMet tinySpec { tinyProgram with screens := tinyProgram.screens.map (fun sc =>
  { sc with components := sc.components.map (fun c => if c.id == "details" then { c with size := .tiny } else c) }) }
  context selected requirement
-- Phase requirements activate on every commit in that phase, not just signOrders.
#guard displayActive { context with phase? := some { workflow := "W1", phase := "signing" } }
  selected (some "anotherCommit") { requirement with scope := .phase "W1" "signing" }
#guard !displayActive { context with phase? := some { workflow := "W1", phase := "rooming" } }
  selected (some "signOrders") { requirement with scope := .phase "W1" "signing" }
#guard displayActive context selected none { requirement with scope := .phase "W1" "signing" }
#guard roundTrips contract && roundTrips payload && roundTrips requirement
-- Artifact outputs share the validation AST; visibility alone cannot validate dates or numbers.
#guard !payloadComplete { payload with fields := [("date", "2025-02-29")] }
  { contract with fields := [{ field := "date", validation? := some .isoDate }] }
#guard payloadComplete { payload with fields := [("date", "2024-02-29")] }
  { contract with fields := [{ field := "date", validation? := some .isoDate }] }
#guard payloadComplete payload { contract with rowConstraints? := some [{ field := "quantity", kind? := some (.quantity .none), validation? := some (.quantityRange .none 10 100) }] }
#guard !payloadComplete payload { contract with rowConstraints? := some [{ field := "quantity", kind? := some (.quantity .none), validation? := some (.quantityRange .none 10 99) }] }
end StructuredDisplay

end Ehr.CoreTests
