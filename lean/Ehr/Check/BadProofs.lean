import Ehr.Check.GuardSound
import Ehr.Check.MacroBadProofs
import Ehr.Check.Graph
import Ehr.Check.ReplayContext
import Ehr.Canonical.BadPrograms

-- The canonical template has over 1,500 components; kernel reduction traverses them.
set_option maxRecDepth 16384

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1

/-- Executing any finite human event list from a reachable state stays reachable. -/
theorem reachable_afterHuman (ep : Episode) (es : List Event) (s : State)
    (hs : Reachable ep s) : Reachable ep (ep.afterHuman s es) := by
  induction es generalizing s with
  | nil => exact hs
  | cons e es ih => exact ih _ (.step .human e hs)

private theorem rejects_human (p : Program) (h : ¬ NoAutomationAttempts specV1 p) :
    ¬ Satisfies specV1 none canonicalV1 p := fun hs => h hs.2.2.2.2.1.1

-- The negative proofs below name the mutation's actual violated clause.
-- They do not rely on the template's unrelated role-permission failure.
theorem bad02_not_satisfies : ¬ Satisfies specV1 none canonicalV1 prefilledIdentity :=
  rejects_human _ (by decide +kernel)

theorem bad03_not_satisfies : ¬ Satisfies specV1 none canonicalV1 poundsAsWeight := by
  intro hs
  exact (by decide +kernel : ¬ DeclaredWritesInSpec specV1 poundsAsWeight) hs.2.2.1.1

/-- Lookups used only to name concrete regression witnesses. -/
def compAt (p : Program) (screen id : String) : Screen × Component :=
  let scr := (p.screen? screen).getD { id := "", title := "", workflow := "", components := [] }
  (scr, (scr.components.find? (·.id == id)).getD { id := "", kind := .banner })
def macAt (p : Program) (id : String) : Macro :=
  (p.macro? id).getD { id := "", label := "", steps := [] }

private theorem compAt_mem (p : Program) (screen id : String)
    (hc : ((p.compsOf screen).find? (·.id == id)).isSome = true) :
    compAt p screen id ∈ allComps p := by
  cases hs : p.screen? screen with
  | none => simp [Program.compsOf, hs] at hc
  | some scr =>
    cases hf : scr.components.find? (·.id == id) with
    | none => simp [Program.compsOf, hs, hf] at hc
    | some c =>
      simp only [compAt, hs, Option.getD_some, hf]
      simp only [allComps, List.mem_flatMap, List.mem_map]
      exact ⟨scr, List.mem_of_find?_eq_some hs, c, List.mem_of_find?_eq_some hf, rfl⟩

private theorem compAt_id (p : Program) (screen id : String)
    (hc : ((p.compsOf screen).find? (·.id == id)).isSome = true) :
    (compAt p screen id).2.id = id := by
  cases hs : p.screen? screen with
  | none => simp [Program.compsOf, hs] at hc
  | some scr =>
    cases hf : scr.components.find? (·.id == id) with
    | none => simp [Program.compsOf, hs, hf] at hc
    | some c =>
      simp only [compAt, hs, Option.getD_some, hf]
      exact by simpa using List.find?_some hf

private theorem macro_click_not_satisfies (p : Program) (mid cid screen cm : String)
    (hm : macAt p mid ∈ p.macros)
    (hst : MacroStep.click cid ∈ (macAt p mid).steps)
    (hc : compAt p screen cid ∈ allComps p)
    (hid : (compAt p screen cid).2.id = cid)
    (hcm : commitOf? (compAt p screen cid).2.kind = some cm) :
    ¬ Satisfies specV1 none canonicalV1 p := by
  apply rejects_human
  intro h
  have hn := ((h.2 _ hm _ hst _ hc).2 (by simp [clickTarget?, hid])).1
  rw [hcm] at hn
  contradiction

private theorem macro_set_not_satisfies (p : Program) (mid cid screen value eid : String)
    (hm : macAt p mid ∈ p.macros)
    (hst : MacroStep.setValue cid value ∈ (macAt p mid).steps)
    (hc : compAt p screen cid ∈ allComps p)
    (hid : (compAt p screen cid).2.id = cid)
    (hf : ∃ slot pf, fieldOf? (compAt p screen cid).2.kind = some (eid, slot, pf))
    (el : ElementSpec) (hel : specV1.element? eid = some el) (hh : HumanMustEnter el) :
    ¬ Satisfies specV1 none canonicalV1 p := by
  apply rejects_human
  intro h
  obtain ⟨slot, pf, hf⟩ := hf
  exact (h.2 _ hm _ hst _ hc).1 (by simp [setTarget?, hid])
    (eid, slot, pf) (by simp [hf]) el (by simp [hel]) hh

-- The role projection and spec-driven links make elaboration of these concrete terms expensive.
set_option maxHeartbeats 1200000 in
theorem bad04_not_satisfies : ¬ Satisfies specV1 none canonicalV1 macroOverride :=
  macro_click_not_satisfies _ "badOverride" "w3Sign.commit.signOrders" "w3Sign" "signOrders"
    (by decide +kernel) (by decide +kernel)
    (compAt_mem _ _ _ (by decide +kernel)) (compAt_id _ _ _ (by decide +kernel)) (by decide +kernel)

theorem bad05_not_satisfies : ¬ Satisfies specV1 none canonicalV1 selfCosign :=
  rejects_human _ (by decide +kernel)

-- The role projection and spec-driven links make elaboration of these concrete terms expensive.
set_option maxHeartbeats 1200000 in
theorem bad06_not_satisfies : ¬ Satisfies specV1 none canonicalV1 staleWeight := by
  intro hs
  exact (by decide +kernel : ¬ QuantityPrefillsKeepUnits specV1 staleWeight) hs.2.2.2.2.2.2.1.1

/-- Every goto from outside the deleted refill decision remains outside it. -/
def refillKept : List ScreenId :=
  (unreachableRefill.screens.map (·.id)).filter (· != "w7Decision")

-- The role projection and spec-driven links make elaboration of these concrete terms expensive.
set_option maxHeartbeats 1200000 in
theorem bad07_not_satisfies : ¬ Satisfies specV1 none canonicalV1 unreachableRefill := by
  intro hs
  have hd := hs.1.2.2.2.2.1 "approveRefill" (by decide +kernel)
    (requires approveRefill refillDecision) (by decide +kernel) rfl
  obtain ⟨sc, hsc, ⟨f, hf, hfid⟩, hops, hp, _⟩ := hd
  have hfields : (allComps unreachableRefill).all (fun sc =>
      (fieldOf? sc.2.kind).all (fun f => f.1 != "refillDecision" || sc.1.id == "w7Decision")) = true := by
    decide +kernel
  have hid := List.all_eq_true.mp hfields sc hsc
  have hfield : fieldOf? sc.2.kind = some f := by simpa using hf
  change f.1 = "refillDecision" at hfid
  simp only [hfield, Option.all_some, hfid, bne_self_eq_false, Bool.false_or, beq_iff_eq] at hid
  have hz := gotoPath_closed unreachableRefill refillKept (by decide +kernel) hp (by decide +kernel)
  rw [hid] at hz
  exact (by decide +kernel : "w7Decision" ∉ refillKept) hz

-- The role projection and spec-driven links make elaboration of these concrete terms expensive.
set_option maxHeartbeats 1200000 in
theorem bad10_not_satisfies : ¬ Satisfies specV1 none canonicalV1 inventedAlert := by
  intro hs
  have hr := hs.1.2.2.2.1.2.2.2.2.1
    (compAt inventedAlert "w1Orders" "w1Orders.everyDose")
    (compAt_mem _ _ _ (by decide +kernel)) ("doseRangeEveryOrder", true) (by decide +kernel)
  exact (by decide +kernel : ¬ (specV1.alert? "doseRangeEveryOrder").isSome) hr

theorem bad11_not_satisfies : ¬ Satisfies specV1 none canonicalV1 repeatedInteraction := by
  intro hs
  have h := hs.2.2.2.2.2.2.2.2.2.2.1.1
    (compAt repeatedInteraction "w1Orders" "w1Orders.repeatInteraction")
      (compAt_mem _ _ _ (by decide +kernel))
    (compAt repeatedInteraction "w1Sign" "w1Sign.alert.interaction")
      (compAt_mem _ _ _ (by decide +kernel))
    ("interactionOrder", true) (by decide +kernel) ("interactionOrder", true) (by decide +kernel)
    rfl rfl rfl (by decide +kernel)
  exact (by decide +kernel : (compAt repeatedInteraction "w1Orders" "w1Orders.repeatInteraction").1.id ≠
    (compAt repeatedInteraction "w1Sign" "w1Sign.alert.interaction").1.id) h

theorem bad12_not_satisfies : ¬ Satisfies specV1 none canonicalV1 passivePopup := by
  intro hs
  exact (by decide +kernel : ¬ NoPassivePopupRequests specV1 passivePopup) hs.2.2.2.2.2.2.2.2.2.2.2.1

-- The role projection and spec-driven links make elaboration of these concrete terms expensive.
set_option maxHeartbeats 1200000 in
theorem bad14_not_satisfies : ¬ Satisfies specV1 none canonicalV1 macroNaloxone :=
  macro_set_not_satisfies _ "badNaloxone" "w1Orders.naloxoneOffer" "w1Orders" "offered"
    "naloxoneOffer" (by decide +kernel) (by decide +kernel)
    (compAt_mem _ _ _ (by decide +kernel)) (compAt_id _ _ _ (by decide +kernel))
    ⟨.fixed 0, .none, by decide +kernel⟩ naloxoneOffer (by decide +kernel) (by decide +kernel)

/-- Seed 1 reaches a shown Sign button with its allergy review unmet. -/
def hiddenEp : Episode := ⟨specV1, hiddenAllergies, replayFacts, replayUser hiddenAllergies⟩
def hiddenPath : List Event := [.click "home.work.w1Rooming", .click "w1Rooming.nav.w1Orders",
  .click "w1Orders.toSign", .click "w1Verify.continue"]
def hiddenAtSign : State := hiddenEp.afterHuman hiddenEp.start hiddenPath

theorem bad01_not_satisfies : ¬ Satisfies specV1 none canonicalV1 hiddenAllergies := by
  intro hs
  have hr := (hs.2.2.2.1 replayFacts (replayUser hiddenAllergies) rfl).2
    hiddenAtSign (reachable_afterHuman hiddenEp hiddenPath hiddenEp.start .start)
    "signOrders" (by decide +kernel) (showOrReceipt signOrders allergyList 240 prescribers)
    (by decide +kernel) rfl rfl
  have hf : reviewMet specV1 hiddenAllergies replayFacts hiddenAtSign
      (showOrReceipt signOrders allergyList 240 prescribers) = false := by decide +kernel
  have ht := (reviewMet_iff hiddenEp hiddenAtSign _).mpr hr
  change reviewMet specV1 hiddenAllergies replayFacts hiddenAtSign _ = true at ht
  rw [hf] at ht
  contradiction

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
