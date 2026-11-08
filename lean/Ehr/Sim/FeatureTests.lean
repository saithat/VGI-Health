import Ehr.Sim.Policy
import Ehr.Sim.MinClicks
import Ehr.Examples.Tiny

/-! Simulator adoption of the five current Core contract groups. All runs use
public interpreter transitions and trusted Facts; no production rule is edited. -/
namespace Ehr.Sim.FeatureTests
open Ehr Ehr.Sim Ehr.Examples.Tiny

def params : PersonaParams :=
  { id := "P1", role := .physician, keyboardShare := 100, reviewsAllergiesEarly := false,
    scansSidebar := false, backtrackRate := 0, searchWhenBuried := false,
    overrideRate := 0 }

def fixtureSpec : Spec := { spec with
  elements := [], entries := [], reviews := [], alerts := [],
  commits := [{ id := "ackResult", label := "Acknowledge", roles := [.physician] }] }

def field (id : String) (kind : ValueKind) : ElementSpec :=
  { id, label := id, kind, enteredBy := [.physician], prefill := .never,
    friction := .safety, fhirTarget := "Observation.value" }

def input (id : String) : Component :=
  { id := id ++ "Field", kind := .field id (.fixed 0) .none }

def fixtureProgram (components : List Component := []) : Program := { program with
  start := "s", macros := [], screens := [{
    id := "s", title := "Result", workflow := "W2",
    components := components ++ [{
      id := "commit", label := "Acknowledge", kind := .button (.commit "ackResult") }] }] }

def choices : TaskChoices := { ackResult := true }

def task : Task := {
  id := "feature", day := 1, persona := "P1", workflow := .W2,
  patientId := facts.patientId, startMin := 0, choices }

def replay (sp : Spec) (prog : Program) (f : Facts) (ch := choices) (interruptions := 0) : DayResult :=
  simulate sp prog params {
    day := 1, persona := "P1", load := "normal",
    tasks := [{ task with choices := ch, interruptions }] } (fun _ => f) 123 { mode := .fixedCost }

def completed (day : DayResult) : Bool := day.tasks.length == 1 && day.tasks.all (·.completed)
def withinFloor (day : DayResult) : Bool := (day.floor.zip day.tasks).all (fun (a, b) => below a b)

def binding : ArtifactBinding := { key := "encounter", artifact := "enc-1", version := 2 }
def observation (code : String) : ClinicalObservation :=
  { code, artifactKey := binding.key, artifact := binding.artifact, version := binding.version }
def clinicalFacts (age : Nat) : Facts := { facts with
  artifactBindings? := some [binding], clinical? := some {
    age? := some { years := age, source := observation "age" }, setting? := some (observation "inpatient") } }

def minorSpec : Spec := { fixtureSpec with
  elements := [field "minorConsent" .flag], entries := [
    { commit := "ackResult", element := "minorConsent", when := .clinical (.ageBetween 0 17) }] }
def minorProgram := fixtureProgram [input "minorConsent"]
def goals (sp : Spec) (f : Facts) (ch := choices) := deriveGoals sp f user .W2 ch [] none
#guard (goals minorSpec (clinicalFacts 17)).values.map (·.element) == ["minorConsent"]
#guard (goals minorSpec (clinicalFacts 18)).values.isEmpty
#guard (goals minorSpec facts).values.map (·.element) == ["minorConsent"]
#guard (goals minorSpec { clinicalFacts 18 with artifactBindings? := some [{ binding with version := 3 }] }).values.length == 1
#guard completed (replay minorSpec minorProgram (clinicalFacts 17))
#guard completed (replay minorSpec minorProgram (clinicalFacts 18))
#guard completed (replay minorSpec minorProgram facts)
#guard withinFloor (replay minorSpec minorProgram (clinicalFacts 17))

-- A condition-only scenario choice is captured through the actual UI. A known
-- false condition omits consent; an unknown condition never does.
def conditionalSpec : Spec := { fixtureSpec with
  elements := [field "dispositionChoice" (.coded "disposition"), field "minorConsent" .flag], entries := [{ commit := "ackResult",
                                                                                                            element := "minorConsent", when := .clinical (.capturedCode "dispositionChoice" 0 "admit") }] }
def conditionalProgram := fixtureProgram [input "dispositionChoice", input "minorConsent"]
def admitChoices : TaskChoices := { choices with disposition? := some "admit" }
def dischargeChoices : TaskChoices := { choices with disposition? := some "discharge" }
#guard (goals conditionalSpec facts admitChoices).values.length == 2
#guard (goals conditionalSpec facts dischargeChoices).values.map (·.element) == ["dispositionChoice"]
#guard (goals conditionalSpec facts).values.map (·.element) == ["minorConsent"]
#guard completed (replay conditionalSpec conditionalProgram facts admitChoices)
#guard completed (replay conditionalSpec conditionalProgram facts dischargeChoices)
#guard withinFloor (replay conditionalSpec conditionalProgram facts dischargeChoices)
#guard !completed (replay conditionalSpec (fixtureProgram [input "minorConsent"]) facts dischargeChoices)

-- An any-slot entry must not erase the predicate's exact-slot obligation.
-- The earlier slot-zero field is deliberately visible before slot one.
def exactSlotSpec : Spec := { conditionalSpec with entries := [
  { commit := "ackResult", element := "dispositionChoice" },
  { commit := "ackResult", element := "minorConsent",
    when := .clinical (.capturedCode "dispositionChoice" 1 "admit") }] }
def exactSlotProgram := fixtureProgram [input "dispositionChoice",
  { id := "choiceOne", kind := .field "dispositionChoice" (.fixed 1) .none }, input "minorConsent"]
#guard (goals exactSlotSpec facts dischargeChoices).values.map (·.slot?) == [some 1]
#guard completed (replay exactSlotSpec exactSlotProgram facts dischargeChoices)
#guard withinFloor (replay exactSlotSpec exactSlotProgram facts dischargeChoices)
#guard (replay exactSlotSpec exactSlotProgram facts dischargeChoices).trace.any
  (·.event == .enter "choiceOne" (.code "discharge"))

-- Temporal evidence is trusted external input, with current artifact identity.
def event (id : String) (time : Int) : EventEvidence :=
  { event := id, patient := facts.patientId, episode := "episode-1",
    actor := "external-clinician", artifact := binding.artifact, version := binding.version,
    time }
def window : TemporalReq :=
  { id := "assessment-before-procedure", subject := { event := "assessment", artifactKey := binding.key },
    anchor := { event := "procedure", artifactKey := binding.key }, minOffset := -60,
    maxOffset := 0, deadline := 0 }
def timeSpec : Spec := { fixtureSpec with commits := [{
  id := "ackResult", label := "Acknowledge", roles := [.physician], temporal? := some [window] }] }
def timeFacts : Facts := { clinicalFacts 17 with episodeId? := some "episode-1",
                                                 epochMinute? := some 1000, eventEvidence? := some [event "assessment" 950,
                                                 event "procedure" 990] }
#guard completed (replay timeSpec (fixtureProgram) timeFacts)
#guard withinFloor (replay timeSpec (fixtureProgram) timeFacts)
#guard !completed (replay timeSpec (fixtureProgram) { timeFacts with eventEvidence? := none })
#guard (replay timeSpec (fixtureProgram) { timeFacts with eventEvidence? := some [event "procedure" 990] }).complaints.any
  (· == "ackResult: obligation assessment-before-procedure is Ehr.ObligationStatus.overdue")
#guard !completed (replay timeSpec (fixtureProgram) { timeFacts with
  eventEvidence? := some [event "assessment" 929, event "procedure" 990] })
#guard !completed (replay timeSpec (fixtureProgram) { timeFacts with
  eventEvidence? := some [{ event "assessment" 950 with version := 1 }, event "procedure" 990] })
#guard !completed (replay timeSpec (fixtureProgram) { timeFacts with
  eventEvidence? := some [event "assessment" 1001, event "procedure" 990] })

def conditionalTime : Spec := { timeSpec with commits := [{
  id := "ackResult", label := "Acknowledge", roles := [.physician], temporal? := some [{ window with when? := some (.ageBetween 0 17) }] }] }
#guard completed (replay conditionalTime (fixtureProgram) (clinicalFacts 18))
#guard !completed (replay conditionalTime (fixtureProgram) facts)
-- Conditional evidence can be bypassed only after the scenario's chosen
-- discriminator has really been captured, never just in hypothetical facts.
def choiceTime : Spec := { timeSpec with
  elements := [field "dispositionChoice" (.coded "disposition")],
  commits := [{ id := "ackResult", label := "Acknowledge", roles := [.physician],
                temporal? := some [{ window with when? := some (.capturedCode "dispositionChoice" 0 "admit") }] }] }
#guard completed (replay choiceTime (fixtureProgram [input "dispositionChoice"]) facts dischargeChoices)
#guard !completed (replay choiceTime (fixtureProgram) facts dischargeChoices)
#guard !completed (replay choiceTime (fixtureProgram [input "dispositionChoice"]) facts admitChoices)
#guard withinFloor (replay choiceTime (fixtureProgram [input "dispositionChoice"]) facts dischargeChoices)

-- History alone cannot affect a temporal guard. Changing evidence can.
example : guardReason timeSpec (fixtureProgram) timeFacts user
    (withHistory (init timeSpec (fixtureProgram) timeFacts user) ["previous"]) "ackResult" =
    guardReason timeSpec (fixtureProgram) timeFacts user
      (init timeSpec (fixtureProgram) timeFacts user) "ackResult" := guardReason_history ..
#guard guardBase timeSpec (fixtureProgram) timeFacts user (init timeSpec (fixtureProgram) timeFacts user) "ackResult"
#guard !guardBase timeSpec (fixtureProgram) { timeFacts with eventEvidence? := none } user
  (init timeSpec (fixtureProgram) timeFacts user) "ackResult"

-- Validation uses Core for both candidate entry and completion. An explicit
-- clinical choice violating the validation remains a conflict, never rewritten.
def rangeSpec : Spec := { fixtureSpec with elements := [{ field "count" (.quantity .none) with
  validation? := some (.quantityRange .none 70 90) }], entries := [{ commit := "ackResult", element := "count" }] }
#guard (goals rangeSpec facts).values.any (·.value? == some (.qty 70 .none))
#guard completed (replay rangeSpec (fixtureProgram [input "count"]) facts)
#guard withinFloor (replay rangeSpec (fixtureProgram [input "count"]) facts)
def codeSpec : Spec := { fixtureSpec with elements := [{ field "dispositionChoice" (.coded "disposition") with
  validation? := some (.codeMember "dispositions" "1") }], entries := [{ commit := "ackResult", element := "dispositionChoice" }] }
def codeFacts : Facts := { facts with codeTables? := some [{ system := "dispositions", version := "1", codes := ["discharge"] }] }
#guard completed (replay codeSpec (fixtureProgram [input "dispositionChoice"]) codeFacts)
#guard !completed (replay codeSpec (fixtureProgram [input "dispositionChoice"]) codeFacts admitChoices)
#guard (goals codeSpec codeFacts admitChoices).values.any (·.value? == some (.code "admit"))
#guard !(goals codeSpec codeFacts admitChoices).problems.isEmpty

-- A valid program prefill remains a legal way to satisfy an unspecified
-- validated goal even when the generic candidate policy has no date value.
def dateSpec : Spec := { fixtureSpec with
  elements := [{ field "documentDate" .text with prefill := .defaultConfirm, validation? := some .isoDate }],
  entries := [{ commit := "ackResult", element := "documentDate" }] }
def dateProgram := fixtureProgram [{ id := "date", kind := .field "documentDate" (.fixed 0) (.default "2026-01-01") }]
#guard completed (replay dateSpec dateProgram facts)
#guard (replay dateSpec dateProgram facts).trace.any (·.event == .confirm "date")

-- Relational entry waits for its source, even when output is earlier in the UI.
def relationalSpec : Spec := { fixtureSpec with
  elements := [field "weight" (.quantity .kg), { field "calculated" (.quantity .mg) with
    validation? := some (.doseByWeight "weight" 20 1000 .mg) }], entries := [{ commit := "ackResult", element := "calculated" }, { commit := "ackResult", element := "weight" }] }
#guard completed (replay relationalSpec (fixtureProgram [input "calculated", input "weight"]) facts)

-- A collapsed structured payload is a navigation goal even without a ReviewReq.
def displaySpec : Spec := { fixtureSpec with infos := [{
  id := "result", label := "Result", version := "", payload? := some {
    fields := [{ field := "summary", validation? := some .nonempty }] } }], displays? := some [{ info := "result", scope := .commit "ackResult" }] }
def displayProgram := fixtureProgram [
  { id := "details", kind := .group true true },
  { id := "resultPanel", parent? := some "details", kind := .panel "result" }]
def displayFacts : Facts := { timeFacts with infoPayloads? := some [{
  info := "result", patient := facts.patientId, artifactKey := binding.key, artifact := binding.artifact, version := binding.version, fields := [("summary", "Complete")] }] }
#guard completed (replay displaySpec displayProgram displayFacts)
#guard !completed (replay displaySpec displayProgram { displayFacts with infoPayloads? := none })

-- Durable expiry is checked after KLM time and interruptions, not just at
-- policy selection. A new episode cannot renew or reset the original clock.
def stamp : ClockStamp := {
  time := 0, year := 1970, month := 1, day := 1,
  minuteOfDay := 0, utcOffsetMinutes := 0, zone := "UTC" }
def expirySpec : Spec := { fixtureSpec with commits := [{ id := "ackResult", label := "Acknowledge", roles := [.physician], expiry? := some [{ id := "order-lifetime", orderKey := binding.key, anchor := .issued, duration := .minutes 1 }] }] }
def expiryFacts : Facts := { timeFacts with epochMinute? := some 0, orderClocks? := some [{
  id := binding.artifact, patient := facts.patientId, issued := stamp }] }
#guard completed (replay expirySpec (fixtureProgram) expiryFacts)
#guard !completed (replay expirySpec (fixtureProgram) expiryFacts choices 1)
#guard (replay expirySpec (fixtureProgram) expiryFacts choices 1).complaints.any
  (· == "ackResult: obligation order-lifetime is Ehr.ObligationStatus.overdue")
#guard (replay expirySpec (fixtureProgram) expiryFacts choices 1).trace.flatMap (·.ops) |>.contains .wait

-- Fixed-clock minimum search still certifies a real temporal completion.
def timeContext : Context := {
  sp := timeSpec, prog := fixtureProgram, facts := timeFacts, user, goals := goals timeSpec timeFacts }
#guard (minimum timeContext .clicks (init timeSpec (fixtureProgram) timeFacts user) 20 (some .full)).isSome
#guard (minimum { timeContext with facts := { timeFacts with eventEvidence? := none } }
  .clicks (init timeSpec (fixtureProgram) timeFacts user) 20 (some .full)).isNone

end Ehr.Sim.FeatureTests
