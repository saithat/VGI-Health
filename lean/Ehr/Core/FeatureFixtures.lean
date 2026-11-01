import Ehr.Core.Tests

/-! Native-encoded inputs for Core/test-wasm-features.mjs. These exercise all
five rule feature groups and the original allowed-value/drug-class extension.
The fixtures use the same Tiny definitions as the kernel regression guards. -/
namespace Ehr.CoreFeatureFixtures

open Ehr Ehr.CoreTests Ehr.Examples.Tiny Ehr.Examples.TinyTests

def fixture (name : String) (sp : Spec) (prog : Program) (f : Facts) (s : State) (e : Event) : Lean.Json :=
  Lean.Json.mkObj [
    ("name", Lean.toJson name),
    ("init", Lean.toJson ({ spec := sp, program := prog, facts := f, user } : InitInput)),
    ("view", Lean.toJson ({ spec := sp, program := prog, facts := f, user, state := s } : ViewInput)),
    ("step", Lean.toJson ({ spec := sp, program := prog, facts := f, user, state := s, event := e } : StepInput))]

def signingState : State := { atOrder with screen := "sign" }
def patientSpec : Spec :=
  { EventWindow.tinySpec with
    entries := [PatientPredicate.minorEntry],
    commits := [{ id := "signOrders", label := "Sign", roles := [.physician] }] }

def fixtures : List Lean.Json := [
  fixture "business-before" { EventWindow.tinySpec with commits :=
    [{ id := "signOrders", label := "Sign", roles := [.physician], temporal? := some [{ EventWindow.requirement with metric := .businessDays "hospital", direction? := some .before, minOffset := -1 }] }] }
    program EventWindow.calendarFacts signingState (.click "signButton"),
  fixture "artifact-date-bad" { StructuredDisplay.tinySpec with infos :=
    [{ id := "controlled", label := "Controlled", version := "", payload? := some { StructuredDisplay.contract with fields := [{ field := "date", validation? := some .isoDate }] } }] }
    StructuredDisplay.tinyProgram { StructuredDisplay.context with infoPayloads? := some [{ StructuredDisplay.payload with fields := [("date", "2025-02-29")] }] }
    StructuredDisplay.selected (.click "sign"),
  fixture "clinical-alert" { patientSpec with alerts :=
    [{ id := "minor", label := "Minor", cond := .clinical PatientPredicate.minor,
       tier := .interruptive, commit := "signOrders" }] }
    program PatientPredicate.minorFacts { signingState with captured :=
      [{ element := "patientIdReentry", slot := 0, value := .text (identityText facts.identity), byHuman := true, confirmed := true }] }
    (.click "signButton"),
  fixture "schedule-II-good" ScheduleII.constrainedSpec ScheduleII.constrainedProgram facts ScheduleII.good (.click "sign"),
  fixture "schedule-II-bad" ScheduleII.constrainedSpec ScheduleII.constrainedProgram facts ScheduleII.bad (.click "sign"),
  fixture "iso-date-bad" { ValueValidation.tinySpec with elements :=
    [{ ValueValidation.narrative with validation? := some .isoDate }] }
    ValueValidation.tinyProgram facts ValueValidation.initial (.enter "narrative" (.text "2025-02-29")),
  fixture "udi-good" { ValueValidation.tinySpec with elements :=
    [{ ValueValidation.narrative with validation? := some .udiGs1 }] }
    ValueValidation.tinyProgram facts ValueValidation.initial (.enter "narrative" (.text "(01)09506000134352(17)261231(10)LOT-1")),
  fixture "month-expiry" { OrderExpiry.tinySpec with commits :=
    [{ id := "signOrders", label := "Sign", roles := [.physician], expiry? := some [{ OrderExpiry.requirement with duration := .calendarMonths 1 }] }] }
    program { OrderExpiry.context with epochMinute? := some 83520, orderClocks? := some [OrderExpiry.monthOrder] }
    signingState (.click "signButton"),
  fixture "event-valid" EventWindow.tinySpec program EventWindow.context signingState (.click "signButton"),
  fixture "event-stale" EventWindow.tinySpec program EventWindow.stale signingState (.click "signButton"),
  fixture "patient-minor" patientSpec program PatientPredicate.minorFacts signingState (.click "signButton"),
  fixture "patient-unknown" patientSpec program facts signingState (.click "signButton"),
  fixture "patient-adult" patientSpec program { PatientPredicate.minorFacts with clinical? := some { age? := some { years := 18, source := PatientPredicate.ageSource } } } signingState (.click "signButton"),
  fixture "validation-bad-entry" ValueValidation.tinySpec ValueValidation.tinyProgram facts ValueValidation.initial
    (.enter "narrative" (.text " ")),
  fixture "validation-good-entry" ValueValidation.tinySpec ValueValidation.tinyProgram facts ValueValidation.initial
    (.enter "narrative" (.text "reviewed")),
  fixture "validation-bad-sign" ValueValidation.tinySpec ValueValidation.tinyProgram facts ValueValidation.invalidCapture
    (.click "sign"),
  fixture "expiry-valid" OrderExpiry.tinySpec program OrderExpiry.context signingState (.click "signButton"),
  fixture "expiry-exact-cutoff" OrderExpiry.tinySpec program { OrderExpiry.context with epochMinute? := some 60 }
    signingState (.click "signButton"),
  fixture "display-complete" StructuredDisplay.tinySpec StructuredDisplay.tinyProgram StructuredDisplay.context
    StructuredDisplay.selected (.click "sign"),
  fixture "display-missing-field" StructuredDisplay.tinySpec StructuredDisplay.tinyProgram
    { StructuredDisplay.context with infoPayloads? := some [{ StructuredDisplay.payload with fields := [] }] }
    StructuredDisplay.selected (.click "sign")
] ++ (List.range 64).map (fun n => fixture ("timed-" ++ toString n)
  EventWindow.tinySpec program { EventWindow.context with epochMinute? := some (8500 + Int.ofNat n * 30) }
  { signingState with clock := n * 600 } (.click "signButton"))

end Ehr.CoreFeatureFixtures

def main (args : List String) : IO Unit :=
  IO.FS.writeFile (args.headD "/tmp/lean-feature-fixtures.json")
    (Lean.toJson Ehr.CoreFeatureFixtures.fixtures).compress
