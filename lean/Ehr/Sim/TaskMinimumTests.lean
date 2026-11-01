import Ehr.Sim.TaskMinimum
import Ehr.Sim.MinClicksTests

namespace Ehr.Sim.TaskMinimumTests
open Ehr Ehr.Sim Ehr.Sim.MinClicksTests Ehr.Examples.Tiny

def twice := [microCtx, microCtx]
#guard (jointMinimum twice .clicks 1000).map (·.cost) == some 6
#guard (jointMinimum twice .keystrokes 1000).map (·.cost) == some 4
#guard (jointMinimum twice .clicks 1000).map (fun r => (Ehr.Sim.episodePaths r.path).length) == some 2

/-- A kernel-computed, satisfiable instance of the actual joint-task theorem. -/
example : ∃ r, jointMinimum twice .clicks 1000 = some r ∧ JointCorrect twice .clicks r := by
  have h : (jointMinimum twice .clicks 1000).isSome = true := by decide
  cases hr : jointMinimum twice .clicks 1000 with
  | none => simp [hr] at h
  | some r => exact ⟨r, rfl, T9_jointMinimum twice .clicks 1000 none r hr⟩
example : (jointMinimum twice .clicks 1000).map (·.cost) ≠ some 5 := by decide
-- An unchecked reset cannot skip the first episode's clinical goals.
example : Certificate.replay (taskGraph twice .full .clicks) (taskNorm (taskInitial twice)) [none] = none := by decide

/-- An optional first-episode review can save later navigation. The joint
answer must consider it even though it is not in the first episode's optimum. -/
def firstProgram : Program := { microProgram with screens := microProgram.screens.map fun (sc : Screen) =>
  if sc.id == "b" then { sc with components := sc.components ++ [
    { id := "allergy", kind := .panel "allergyList" },
    { id := "review", kind := .button (.markReviewed "allergyList") }] } else sc }
def first : Context := { microCtx with prog := firstProgram }
def secondSpec : Spec := { microSpec with entries := [], reviews := [
  { commit := "signOrders", info := "allergyList", mode := .shownOrReceipt 720 [.physician] }] }
def secondProgram : Program := { microProgram with start := "c", screens := [
  { id := "c", title := "Commit", workflow := "W4", components := [
    { id := "sign", kind := .button (.commit "signOrders") },
    { id := "toReview", kind := .button (.goto "d") }] },
  { id := "d", title := "Review", workflow := "W4", components := [
    { id := "allergy", kind := .panel "allergyList" },
    { id := "review", kind := .button (.markReviewed "allergyList") },
    { id := "toCommit", kind := .button (.goto "c") }] }] }
def second : Context := { microCtx with
  sp := secondSpec, prog := secondProgram,
  goals := { commits := ["signOrders"], values := [], expectedAcks := [] } }
#guard (minimum first .clicks (init first.sp first.prog facts user) 1000).map (·.cost) == some 3
#guard (minimum second .clicks (init second.sp second.prog facts user) 1000).map (·.cost) == some 4
#guard (jointMinimum [first, second] .clicks 5000 (some .full)).map (·.cost) == some 5
#guard (jointMinimum [first, second] .clicks 5000 (some .goalDirected)).map (·.cost) == some 5
-- The faster space is honestly narrower; it does not claim the full optimum.
#guard (jointMinimum [first, second] .clicks 5000 (some .navigationDirected)).map (·.cost) == some 7

end Ehr.Sim.TaskMinimumTests
