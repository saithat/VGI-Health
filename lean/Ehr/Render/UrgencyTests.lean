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

def ui (s : State) : UiScreen := runRenderUi {
  spec := sp, program := prog, facts, user, state := s, display := Display.empty }
#guard ((ui initial).urgent?.getD []).any fun n => match n with | .alert _ "criticalResult" .. => true | _ => false
#guard ((ui resolved).urgent?.getD []).all fun n => match n with | .alert _ "criticalResult" .. => false | _ => true

-- A corrected source observation starts a new unresolved workflow; source
-- identity is independent of a UI acknowledgment or a previous action record.
#guard (CriticalRuntime.tickets { facts with criticalResults? := some [{ ticket with result := { ticket.result with source? := some "corrected lab source" } }] } resolved).all (·.resolution.isNone)

/-- Native-exported states for the same canonical workflow renderer as WASM. -/
def concurrent : State := { initial with
  captured := [{ element := "drug", slot := 0, value := .code "amoxicillin", byHuman := true, confirmed := true },
    { element := "drug", slot := 1, value := .code "warfarin", byHuman := true, confirmed := true },
    { element := "weight", slot := 0, value := .qty 1500 .lb, byHuman := true, confirmed := true },
    { element := "dose", slot := 0, value := .qty 999999 .mg, byHuman := true, confirmed := true }]
  popup? := some ("drugAllergyOrder", "amoxicillin@3") }
#guard ((ui concurrent).urgent?.getD []).length ≥ 9
#guard (ui concurrent).modal.isNone

def probes : List (String × UiScreen) :=
  [("critical-delivered", ui initial), ("critical-received", ui received),
   ("critical-documented", ui documented), ("critical-resolved", ui resolved),
   ("critical-escalated", ui timedOut), ("critical-covering", ui coveringReceived), ("urgent-concurrent", ui concurrent)]
end Ehr.Render.UrgencyTests
