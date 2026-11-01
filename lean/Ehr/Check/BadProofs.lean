import Ehr.Check.PatchWitness
import Ehr.Check.ViolationWitness
import Ehr.Check.MissingWitness
import Ehr.Check.LocalBadProofs
import Ehr.Check.Graph
import Ehr.Check.ReplayContext
import Ehr.Canonical.BadPrograms

-- The canonical template has over 1,500 components; kernel reduction traverses them.
set_option maxRecDepth 16384

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1

/-- Executing any finite human event list from a reachable state stays reachable. -/
theorem reachable_afterHuman (ep : Episode) (es : List Event) (s : State)
    (hs : Reachable ep s) : Reachable ep (ep.afterHuman s es) := by
  induction es generalizing s with
  | nil => exact hs
  | cons e es ih => exact ih _ (.step .human e hs)

/-- Every goto from outside the deleted refill decision remains outside it. -/
def refillKept : List ScreenId :=
  (unreachableRefill.screens.map (·.id)).filter (· != "w7Decision")

private def refillScreen : Screen := unreachableRefill.screens[42]?.getD default
private theorem refillScreenPresent : unreachableRefill.screens[42]?.isSome = true := by decide +kernel
private theorem refillCompPresent : refillScreen.components[25]?.isSome = true := by decide +kernel
@[irreducible] private def refillWitness : Screen × Component :=
  (refillScreen, refillScreen.components[25]?.getD default)
private theorem refillWitness_mem : refillWitness ∈ allComps unreachableRefill := by
  unfold refillWitness
  exact List.mem_flatMap.mpr ⟨refillScreen,
    getD_mem unreachableRefill.screens 42 refillScreenPresent,
    List.mem_map.mpr ⟨_, getD_mem refillScreen.components 25 refillCompPresent, rfl⟩⟩
private theorem refillKind : refillWitness.2.kind = .button (.commit "approveRefill") := by decide +kernel
private def refillCommit := (specV1.commit? "approveRefill").getD default
private theorem refillLookup : specV1.commit? "approveRefill" = some refillCommit := by decide +kernel
private theorem refillRole : unreachableRefill.role ∈ refillCommit.roles := by decide +kernel
private theorem refillRequired : "approveRefill" ∈ requiredCommits specV1 canonicalV1 unreachableRefill :=
  required_of_component specV1 canonicalV1 unreachableRefill refillWitness refillWitness_mem
    "approveRefill" refillKind refillCommit refillLookup refillRole
private theorem refillRequirement : requires approveRefill refillDecision ∈ specV1.entries := by decide +kernel
private theorem refillFields : (allComps unreachableRefill).all (fun sc =>
    (fieldOf? sc.2.kind).all (fun f => f.1 != "refillDecision" || sc.1.id == "w7Decision")) = true := by decide +kernel
private theorem refillNoIncoming : (allComps unreachableRefill).all (fun sc =>
    (gotoOf? sc.2.kind).all (· != "w7Decision")) = true := by
  apply List.all_eq_true.mpr
  intro sc member
  simp only [allComps, List.mem_flatMap, List.mem_map] at member
  obtain ⟨scr, hs, c, hc, rfl⟩ := member
  change scr ∈ (base 7).screens.map _ at hs
  obtain ⟨original, _, rfl⟩ := List.mem_map.mp hs
  have kept := (List.mem_filter.mp hc).2
  cases kind : c.kind <;> simp_all [gotoOf?]
  rename_i action
  cases action <;> simp_all [gotoOf?]
private theorem refillDifferentStart : unreachableRefill.start ≠ "w7Decision" := by decide +kernel

theorem bad07_not_satisfies : ¬ Satisfies specV1 none canonicalV1 unreachableRefill :=
  required_unreachable_violation specV1 none canonicalV1 unreachableRefill "approveRefill"
    refillRequired (requires approveRefill refillDecision) refillRequirement rfl "w7Decision"
    refillFields (no_incoming_no_depth unreachableRefill "w7Decision" specV1.design.maxDepth
      refillDifferentStart refillNoIncoming)

/-- Seed 1 reaches a shown Sign button with its allergy review unmet. -/
def hiddenEp : Episode := ⟨specV1, hiddenAllergies, replayFacts, replayUser hiddenAllergies⟩
def hiddenPath : List Event := [.click "home.work.w1Rooming", .click "w1Rooming.nav.w1Orders",
  .click "w1Orders.toSign", .click "w1Verify.continue"]
def hiddenAtSign : State := hiddenEp.afterHuman hiddenEp.start hiddenPath

private theorem hiddenButton : (hiddenEp.prog.compsOf hiddenAtSign.screen).any (fun c =>
    c.kind == .button (.commit "signOrders") &&
      compShown hiddenEp.spec hiddenEp.facts hiddenAtSign
        (hiddenEp.prog.compsOf hiddenAtSign.screen) c) = true := by decide +kernel

private theorem hiddenRequirement : showOrReceipt signOrders allergyList 240 prescribers ∈ specV1.reviews := by decide +kernel
private theorem hiddenReviewFalse : reviewMet specV1 hiddenAllergies replayFacts hiddenAtSign
    (showOrReceipt signOrders allergyList 240 prescribers) = false := by decide +kernel

theorem bad01_not_satisfies : ¬ Satisfies specV1 none canonicalV1 hiddenAllergies :=
  review_violation hiddenEp none canonicalV1 rfl hiddenAtSign
    (reachable_afterHuman hiddenEp hiddenPath hiddenEp.start .start) "signOrders" hiddenButton
    (showOrReceipt signOrders allergyList 240 prescribers) hiddenRequirement rfl rfl hiddenReviewFalse

#print axioms bad01_not_satisfies
#print axioms bad02_not_satisfies
#print axioms bad03_not_satisfies
#print axioms bad04_not_satisfies
#print axioms bad05_not_satisfies
#print axioms bad06_not_satisfies
#print axioms bad07_not_satisfies
#print axioms bad08_not_satisfies
#print axioms bad09_not_satisfies
#print axioms bad10_not_satisfies
#print axioms bad11_not_satisfies
#print axioms bad12_not_satisfies
#print axioms bad14_not_satisfies
end Ehr.Check
