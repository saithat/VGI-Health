import Ehr.Sim.MinClicks
import Ehr.Sim.PolicyTests

namespace Ehr.Sim.MinClicksTests
open Ehr Ehr.Sim Ehr.Examples.Tiny

/-- A small satisfiable instance of the real interpreter: one field, two
screens, a goal commit. Small enough for kernel `decide`. -/
def microSpec : Spec := { spec with
  elements := [{
    id := "x", label := "X", kind := .text, enteredBy := [.physician],
    prefill := .never, friction := .compliance, fhirTarget := "Composition.text" }]
  entries := [{ commit := "signOrders", element := "x" }]
  reviews := [], alerts := [] }
def microProgram : Program := { program with start := "a", macros := [], screens := [
  { id := "a", title := "A", workflow := "W1", components := [
    { id := "x", kind := .field "x" (.fixed 0) .none },
    { id := "next", kind := .button (.goto "b") }] },
  { id := "b", title := "B", workflow := "W1", components := [
    { id := "sign", kind := .button (.commit "signOrders") }] }] }
def microGoals : Goals := { commits := ["signOrders"], values := [
  { element := "x", value? := some (.text "ok"), commit := "signOrders" }], expectedAcks := [] }
def microCtx : Context := { sp := microSpec, prog := microProgram, facts, user, goals := microGoals }
def microStart := init microSpec microProgram facts user

def microAnswer := certifiedSearch microCtx .full .clicks microStart 100
#guard microAnswer.isSome
#guard microAnswer.map (·.cost) == some 3
#guard (minimum microCtx .keystrokes microStart 100).map (·.cost) == some 2
#guard (certifiedSearch microCtx .goalDirected .clicks microStart 100).map (·.cost) == microAnswer.map (·.cost)
#guard (certifiedSearch microCtx .navigationDirected .clicks microStart 100).map (·.cost) == microAnswer.map (·.cost)

/-- The hypotheses of T9 are met by the actual Dijkstra output. -/
theorem microSatisfiable : ∃ c, certifiedSearch microCtx .full .clicks microStart 100 = some c := by
  have h : microAnswer.isSome = true := by decide
  cases he : microAnswer with
  | none => simp [he] at h
  | some c => exact ⟨c, he⟩

/-- Instantiate the public CLI contract on a kernel-computed nonempty answer. -/
example : ∃ r, minimum microCtx .clicks microStart 100 = some r ∧
    MinimumCorrect microCtx .clicks microStart r := by
  have h : (minimum microCtx .clicks microStart 100).isSome = true := by decide
  cases hr : minimum microCtx .clicks microStart 100 with
  | none => simp [hr] at h
  | some r => exact ⟨r, rfl, T9_minimum microCtx .clicks microStart 100 none r hr⟩
example : (minimum microCtx .clicks microStart 100).map (·.cost) ≠ some 2 := by decide

/-- Removing an action makes the alleged path fail replay. -/
example : Certificate.replay (searchGraph microCtx .full .clicks) (forgetHistory microStart)
    [.click "next", .click "sign"] = none := by decide

/-- A wrong minimum cannot be certified, even with a valid path. -/
def wrongCandidate : Certificate.Candidate State Event :=
  { path := [.enter "x" (.text "ok"), .click "next", .click "sign"], cost := 2,
    visited := putDistance {} (forgetHistory microStart) 0 }
example : Certificate.accept (searchGraph microCtx .full .clicks) (forgetHistory microStart) wrongCandidate = false := by decide

/-- The removable reminder appears only in the variant that requests it. -/
def reminderSpec : Spec := { microSpec with alerts := [{
  id := "reminder", label := "Reminder",
  cond := .careGap, tier := .removable, commit := "signOrders" }] }
def reminderProgram : Program := { microProgram with screens := microProgram.screens.map fun (sc : Screen) =>
  if sc.id == "b" then { sc with components := sc.components ++ [
    { id := "reminder", kind := .alert "reminder" true }] } else sc }
def reminderCtx : Context := { microCtx with sp := reminderSpec, prog := reminderProgram }
#guard (minimum reminderCtx .clicks (init reminderSpec reminderProgram facts user) 1000).map (·.cost) == some 5
#guard (minimum microCtx .clicks microStart 1000).map (·.cost) == some 3

/-- Tiny simulation and search share the activation model, including a popup
trigger click plus its acknowledgment. -/
def microTask : Task := { PolicyTests.task with choices := { orders := [GoalsTests.amox] }, interruptions := 0 }
def microSchedule : DaySchedule := { PolicyTests.schedule with tasks := [microTask] }
def quietPersona := { PolicyTests.p1 with
  backtrackRate := 0, scansSidebar := false,
  reviewsAllergiesEarly := false, searchWhenBuried := false }
-- Use a scenario-derived x goal for simulation (any accepted text).
def noPrompt := simulate microSpec microProgram quietPersona microSchedule (fun _ => facts) 1
def withPrompt := simulate reminderSpec reminderProgram quietPersona microSchedule (fun _ => facts) 1
#guard noPrompt.tasks.all (·.completed)
#guard withPrompt.tasks.all (·.completed)
#guard (withPrompt.tasks.head?.map (·.clicks)).getD 0 == (noPrompt.tasks.head?.map (·.clicks)).getD 0 + 2

end Ehr.Sim.MinClicksTests
