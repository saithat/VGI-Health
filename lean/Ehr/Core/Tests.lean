import Ehr.Examples.TinyTests

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
    [{ element := priorAuthElement, slot := 0, value := .flag false,
       byHuman := true, confirmed := true, provenance? := some "human field" }] }
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
end Ehr.CoreTests
