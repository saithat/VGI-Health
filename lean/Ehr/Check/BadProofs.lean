import Ehr.Check.PinSound
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
  rejects_human _ (by decide)

theorem bad03_not_satisfies : ¬ Satisfies specV1 none canonicalV1 poundsAsWeight := by
  intro hs
  exact (by decide : ¬ DeclaredWritesInSpec specV1 poundsAsWeight) hs.2.2.1.1

/-- Lookups used only to name concrete regression witnesses. -/
def compAt (p : Program) (screen id : String) : Screen × Component :=
  let scr := (p.screen? screen).getD { id := "", title := "", workflow := "", components := [] }
  (scr, (scr.components.find? (·.id == id)).getD { id := "", kind := .banner })
def macAt (p : Program) (id : String) : Macro :=
  (p.macro? id).getD { id := "", label := "", steps := [] }

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

-- Kernel reduction includes the role projection and spec-driven link normalization.
set_option maxHeartbeats 1200000 in
theorem bad04_not_satisfies : ¬ Satisfies specV1 none canonicalV1 macroOverride :=
  macro_click_not_satisfies _ "badOverride" "w3Sign.commit.signOrders" "w3Sign" "signOrders"
    (by decide) (by decide) (by decide) (by decide) (by decide)

theorem bad05_not_satisfies : ¬ Satisfies specV1 none canonicalV1 selfCosign :=
  rejects_human _ (by decide)

-- Kernel reduction includes the role projection and spec-driven link normalization.
set_option maxHeartbeats 1200000 in
theorem bad06_not_satisfies : ¬ Satisfies specV1 none canonicalV1 staleWeight := by
  intro hs
  exact (by decide : ¬ QuantityPrefillsKeepUnits specV1 staleWeight) hs.2.2.2.2.2.2.1.1

/-- Every goto from outside the deleted refill decision remains outside it. -/
def refillKept : List ScreenId :=
  (unreachableRefill.screens.map (·.id)).filter (· != "w7Decision")

-- Kernel reduction includes the role projection and spec-driven link normalization.
set_option maxHeartbeats 1200000 in
theorem bad07_not_satisfies : ¬ Satisfies specV1 none canonicalV1 unreachableRefill := by
  intro hs
  have hd := hs.1.2.2.2.2.1 "approveRefill" (by decide)
    (requires approveRefill refillDecision) (by decide) rfl
  obtain ⟨sc, hsc, ⟨f, hf, hfid⟩, hops, hp, _⟩ := hd
  have hfield : ∀ sc ∈ allComps unreachableRefill, ∀ f ∈ fieldOf? sc.2.kind,
      f.1 = "refillDecision" → sc.1.id = "w7Decision" := by decide
  have hid := hfield sc hsc f hf hfid
  have hz := gotoPath_closed unreachableRefill refillKept (by decide) hp (by decide)
  rw [hid] at hz
  exact (by decide : "w7Decision" ∉ refillKept) hz

-- Kernel reduction includes the role projection and spec-driven link normalization.
set_option maxHeartbeats 1200000 in
theorem bad08_not_satisfies : ¬ Satisfies specV1 none canonicalV1 forgedConsent :=
  macro_set_not_satisfies _ "badConsent" "w6PreOp.consentVerified" "w6PreOp" "true"
    "consentVerified" (by decide) (by decide) (by decide) (by decide)
    ⟨.fixed 0, .none, by decide⟩ consentVerified (by decide) (by decide)

-- Kernel reduction includes the role projection and spec-driven link normalization.
set_option maxHeartbeats 1200000 in
theorem bad09_not_satisfies : ¬ Satisfies specV1 none canonicalV1 hiddenAllergyAlert :=
  macro_click_not_satisfies _ "badQuickAmox" "w1Sign.commit.signOrders" "w1Sign" "signOrders"
    (by decide) (by decide) (by decide) (by decide) (by decide)

-- Kernel reduction includes the role projection and spec-driven link normalization.
set_option maxHeartbeats 1200000 in
theorem bad10_not_satisfies : ¬ Satisfies specV1 none canonicalV1 inventedAlert := by
  intro hs
  exact (by decide : ¬ ReferencesResolve specV1 inventedAlert) hs.1.2.2.2.1

theorem bad11_not_satisfies : ¬ Satisfies specV1 none canonicalV1 repeatedInteraction := by
  intro hs
  have h := hs.2.2.2.2.2.2.2.2.2.2.1.1
    (compAt repeatedInteraction "w1Orders" "w1Orders.repeatInteraction") (by decide)
    (compAt repeatedInteraction "w1Sign" "w1Sign.alert.interaction") (by decide)
    ("interactionOrder", true) (by decide) ("interactionOrder", true) (by decide)
    rfl rfl rfl (by decide)
  exact (by decide : (compAt repeatedInteraction "w1Orders" "w1Orders.repeatInteraction").1.id ≠
    (compAt repeatedInteraction "w1Sign" "w1Sign.alert.interaction").1.id) h

theorem bad12_not_satisfies : ¬ Satisfies specV1 none canonicalV1 passivePopup := by
  intro hs
  exact (by decide : ¬ NoPassivePopupRequests specV1 passivePopup) hs.2.2.2.2.2.2.2.2.2.2.2.1

-- Kernel reduction includes the role projection and spec-driven link normalization.
set_option maxHeartbeats 1200000 in
theorem bad14_not_satisfies : ¬ Satisfies specV1 none canonicalV1 macroNaloxone :=
  macro_set_not_satisfies _ "badNaloxone" "w1Orders.naloxoneOffer" "w1Orders" "offered"
    "naloxoneOffer" (by decide) (by decide) (by decide) (by decide)
    ⟨.fixed 0, .none, by decide⟩ naloxoneOffer (by decide) (by decide)

/-- Seed 1 reaches a shown Sign button with its allergy review unmet. -/
def hiddenEp : Episode := ⟨specV1, hiddenAllergies, replayFacts, replayUser hiddenAllergies⟩
def hiddenPath : List Event := [.click "home.work.w1Rooming", .click "w1Rooming.nav.w1Orders",
  .click "w1Orders.toSign", .click "w1Verify.continue"]
def hiddenAtSign : State := hiddenEp.afterHuman hiddenEp.start hiddenPath

theorem bad01_not_satisfies : ¬ Satisfies specV1 none canonicalV1 hiddenAllergies := by
  intro hs
  have hr := (hs.2.2.2.1 replayFacts (replayUser hiddenAllergies) rfl).2
    hiddenAtSign (reachable_afterHuman hiddenEp hiddenPath hiddenEp.start .start)
    "signOrders" (by decide) (showOrReceipt signOrders allergyList 240 prescribers)
    (by decide) rfl rfl
  have hf : reviewMet specV1 hiddenAllergies replayFacts hiddenAtSign
      (showOrReceipt signOrders allergyList 240 prescribers) = false := by decide
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
