import Ehr.Render.Api
import Ehr.Specs.CriticalResults
import Ehr.Examples.Tiny
import Ehr.Canonical.Urgency

namespace Ehr.Render.UrgencyTests
open Ehr

def ticket : Multi.Critical.Ticket :=
  { result := ⟨"panic-1", Examples.Tiny.facts.patientId, "Critical potassium 6.8 mmol/L", "P1", "P2", 0, 30, none⟩ }
def facts : Facts := { Examples.Tiny.facts with now := 0, criticalResults? := some [ticket] }
def user : User := ⟨"P1", .physician⟩
def sp : Spec := Specs.CriticalResults.specV1
def prog : Program := { Canonical.Urgency.canonicalV1 with patientSelection? := none }
def initial : State := runInit { spec := sp, program := prog, facts, user }
def event (s : State) (e : Event) (u : User := user) : State :=
  (runStep { spec := sp, program := prog, facts, user := u, state := s, event := e }).state
def received := event initial (.click "critical.receive:panic-1")
def documented := event received (.enter "critical.action:panic-1" (.text "Called patient; arranged emergency evaluation"))
def resolved := event documented (.click "critical.resolve:panic-1")
def timedOut : State := { initial with clock := 30 * 600 }
def coveringReceived := event timedOut (.click "critical.receive:panic-1") ⟨"P2", .physician⟩

#guard (CriticalRuntime.tickets facts initial).all (·.resolution.isNone)
#guard (event initial (.click "critical.resolve:panic-1")).criticalResults? == some [Multi.Critical.advance 0 ticket]
#guard (CriticalRuntime.tickets facts (event initial (.ack "criticalResult"))).all (·.resolution.isNone)
#guard (CriticalRuntime.tickets facts received).all (·.receivedBy.contains "P1")
#guard (CriticalRuntime.tickets facts resolved).all (·.resolution.isSome)
#guard (CriticalRuntime.tickets facts timedOut).all (·.escalatedAt == some 30)
#guard (CriticalRuntime.tickets facts coveringReceived).all (·.receivedBy.contains "P2")
#guard (CriticalRuntime.tickets facts (event initial (.click "critical.receive:panic-1") ⟨"stranger", .physician⟩)).all (·.receivedBy.isEmpty)

/-- Native-exported states for the same canonical workflow renderer as WASM. -/
def concurrent : State := { initial with
  captured := [{ element := "drug", slot := 0, value := .code "amoxicillin", byHuman := true, confirmed := true },
    { element := "drug", slot := 1, value := .code "warfarin", byHuman := true, confirmed := true },
    { element := "weight", slot := 0, value := .qty 1500 .lb, byHuman := true, confirmed := true },
    { element := "dose", slot := 0, value := .qty 999999 .mg, byHuman := true, confirmed := true }]
  popup? := some ("drugAllergyOrder", "amoxicillin@3") }

/-! Critical-result action text is a draft in `State.criticalDrafts?`; it is
never a clinical capture. The handler is refused while an alert popup is open. -/
def actionEvent : Event := .enter "critical.action:panic-1" (.text "Called patient; arranged emergency evaluation")
def output (s : State) (e : Event) : StepOutput :=
  runStep { spec := sp, program := prog, facts, user, state := s, event := e }

-- Text entry leaves `captured` unchanged and stores one draft per result.
#guard documented.captured == received.captured
#guard documented.captured.all (·.element != "critical.action:panic-1")
#guard documented.criticalDrafts? == some [{ result := "panic-1", text := "Called patient; arranged emergency evaluation" }]
#guard (event documented (.enter "critical.action:panic-1" (.text "Revised"))).criticalDrafts? == some [{ result := "panic-1", text := "Revised" }]
#guard documented.commits == received.commits && documented.acked == received.acked &&
  documented.receipts == received.receipts && documented.popup? == received.popup? &&
  documented.screen == received.screen
-- The receive / document / resolve flow resolves with the drafted action.
#guard (output documented (.click "critical.resolve:panic-1")).result == .ok
#guard (CriticalRuntime.tickets facts resolved).all fun t =>
  (t.resolution.map (·.action)) == some "Called patient; arranged emergency evaluation"
#guard resolved.captured == received.captured
#guard resolved.criticalDrafts? == none
#guard ((encodeJson resolved).splitOn "criticalDrafts").length == 1
-- Only the resolved result is removed; drafts for other results survive.
def withOtherDraft : State :=
  { documented with criticalDrafts? := some ({ result := "other", text := "Pending action" } :: documented.criticalDrafts?.getD []) }
#guard (event withOtherDraft (.click "critical.resolve:panic-1")).criticalDrafts? ==
  some [{ result := "other", text := "Pending action" }]
-- Refusals preserve every draft: missing receipt, wrong user, empty action,
-- already resolved ticket, and popup blocking (below).
def unreceivedDraft : State := event initial actionEvent
#guard (output unreceivedDraft (.click "critical.resolve:panic-1")).result != .ok
#guard (event unreceivedDraft (.click "critical.resolve:panic-1")).criticalDrafts? == unreceivedDraft.criticalDrafts?
#guard (event documented (.click "critical.resolve:panic-1") ⟨"stranger", .physician⟩).criticalDrafts? == documented.criticalDrafts?
def blankDraft : State := event received (.enter "critical.action:panic-1" (.text "  "))
#guard (output blankDraft (.click "critical.resolve:panic-1")).result != .ok
#guard (event blankDraft (.click "critical.resolve:panic-1")).criticalDrafts? == blankDraft.criticalDrafts?
def resolvedDraft : State := event resolved actionEvent
#guard (output resolvedDraft (.click "critical.resolve:panic-1")).result != .ok
#guard (event resolvedDraft (.click "critical.resolve:panic-1")).criticalDrafts? == resolvedDraft.criticalDrafts?
-- Receive and time-driven escalation never discard drafts.
#guard (event documented (.click "critical.receive:panic-1")).criticalDrafts? == documented.criticalDrafts?
#guard (event { documented with clock := 30 * 600 } (.click "critical.escalate:panic-1")).criticalDrafts? == documented.criticalDrafts?
-- Without a draft, resolution is refused.
#guard (CriticalRuntime.tickets facts (event received (.click "critical.resolve:panic-1"))).all (·.resolution.isNone)

-- Every handled event is refused under an open popup, with the state unchanged.
def modal : State := { received with popup? := some ("drugAllergyOrder", "amoxicillin@3") }
#guard [actionEvent, .click "critical.receive:panic-1", .click "critical.resolve:panic-1",
    .click "critical.escalate:panic-1"].all fun e =>
  output modal e == { state := modal, result := .blocked "popup: acknowledge the alert first" }
#guard (output { documented with popup? := modal.popup? } (.click "critical.resolve:panic-1")).state ==
  { documented with popup? := modal.popup? }
-- After the acknowledgment the same events are handled again.
def acknowledged : State := event modal (.ack "drugAllergyOrder")
#guard acknowledged.popup? == none && acknowledged.acked == [("drugAllergyOrder", "amoxicillin@3")]
#guard (output acknowledged actionEvent).result == .ok
#guard (CriticalRuntime.tickets facts
  (event (event acknowledged actionEvent) (.click "critical.resolve:panic-1"))).all (·.resolution.isSome)

-- A state without drafts has the encoding it had before the field existed,
-- and states serialized before this change still decode.
def legacyState : State :=
  { screen := "home", history := [], captured := [], receipts := [], acked := [], commits := [],
    expanded := [], tabSel := [], currentSlot := 0, clock := 0 }
def legacyJson : String :=
  "{\"acked\":[],\"captured\":[],\"clock\":0,\"commits\":[],\"currentSlot\":0,\"expanded\":[]," ++
  "\"history\":[],\"receipts\":[],\"screen\":\"home\",\"tabSel\":[]}"
#guard encodeJson legacyState == legacyJson
#guard (decodeJson State legacyJson).toOption == some legacyState
#guard [initial, received, timedOut, coveringReceived, concurrent, modal].all fun s =>
  s.criticalDrafts? == none && ((encodeJson s).splitOn "criticalDrafts").length == 1 &&
  (decodeJson State (encodeJson s)).toOption == some s
#guard roundTrips initial && roundTrips received && roundTrips documented && roundTrips resolved
-- The named Lean structure emits and decodes exactly the historical pair array.
#guard encodeJson ({ result := "panic-1", text := "Called patient; arranged emergency evaluation" } : CriticalDraft) ==
  encodeJson ("panic-1", "Called patient; arranged emergency evaluation")
def legacyDraftJson : String := legacyJson.dropEnd 1 |>.toString |>
  (· ++ ",\"criticalDrafts\":[[\"panic-1\",\"legacy action\"]]}")
#guard (decodeJson State legacyDraftJson).toOption ==
  some { legacyState with criticalDrafts? := some [{ result := "panic-1", text := "legacy action" }] }
#guard (decodeJson CriticalDraft "[\"panic-1\"]").toOption.isNone
#guard ((encodeJson documented).splitOn "\"criticalDrafts\":[[\"panic-1\",").length == 2

def ui (s : State) : UiScreen := runRenderUi {
  spec := sp, program := prog, facts, user, state := s, display := Display.empty }
#guard ((ui initial).urgent?.getD []).any fun n => match n with | .alert _ "criticalResult" .. => true | _ => false
#guard ((ui resolved).urgent?.getD []).all fun n => match n with | .alert _ "criticalResult" .. => false | _ => true

-- The rendered action field keeps its component id and shows the draft text.
def actionFieldText (s : State) : List (Option String) :=
  (criticalNodes facts user s).flatMap fun n => match n with
    | .section _ _ children => children.filterMap fun c => match c with
      | .field "critical.action:panic-1" _ _ value .. => some value
      | _ => none
    | _ => []
#guard actionFieldText received == [some ""]
#guard actionFieldText documented == [some "Called patient; arranged emergency evaluation"]
#guard actionFieldText resolved == []

-- A corrected source observation starts a new unresolved workflow; source
-- identity is independent of a UI acknowledgment or a previous action record.
#guard (CriticalRuntime.tickets { facts with criticalResults? := some [{ ticket with result := { ticket.result with source? := some "corrected lab source" } }] } resolved).all (·.resolution.isNone)

#guard ((ui concurrent).urgent?.getD []).length ≥ 9
#guard (ui concurrent).modal.isNone

def probes : List (String × UiScreen) :=
  [("critical-delivered", ui initial), ("critical-received", ui received),
   ("critical-documented", ui documented), ("critical-resolved", ui resolved),
   ("critical-escalated", ui timedOut), ("critical-covering", ui coveringReceived), ("urgent-concurrent", ui concurrent)]
end Ehr.Render.UrgencyTests
