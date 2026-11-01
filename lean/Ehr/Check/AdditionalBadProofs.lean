import Ehr.Check.BadProofs
import Ehr.Check.DomainObstruction

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1

set_option maxRecDepth 16384

/-- Seed 13 is genuinely invalid in the current all-encounters domain, but
this witness is the shared pre-op display defect, NOT its intended CURES
mutation. Other workflows still provide CURES paths, so this theorem must not
be presented as a proof that removing the W1 paths breaks completability. -/
def noCuresPreopEp : Episode :=
  ⟨specV1, noCures, preopFacts, replayUser noCures⟩

def noCuresPreopSign : State :=
  noCuresPreopEp.afterHuman noCuresPreopEp.start hiddenPath

theorem bad13_preop_not_satisfies : ¬ Satisfies specV1 none canonicalV1 noCures := by
  intro hs
  have hr := (hs.2.2.2.1 preopFacts (replayUser noCures) rfl).2
    noCuresPreopSign (reachable_afterHuman noCuresPreopEp hiddenPath noCuresPreopEp.start .start)
    "signOrders" (by decide +kernel) (mustShow signOrders anticoagulantList (.encounter "preop"))
    (by decide +kernel) rfl rfl
  have hf : reviewMet specV1 noCures preopFacts noCuresPreopSign
      (mustShow signOrders anticoagulantList (.encounter "preop")) = false := by decide +kernel
  have ht := (reviewMet_iff noCuresPreopEp noCuresPreopSign _).mpr hr
  change reviewMet specV1 noCures preopFacts noCuresPreopSign _ = true at ht
  rw [hf] at ht
  contradiction

/-- Seed 15 reaches a shown Sign button for a controlled order while the
actual order-summary component remains inside its collapsed group. -/
def hiddenControlledEp : Episode :=
  ⟨specV1, hiddenControlledDetails, replayFacts, replayUser hiddenControlledDetails⟩
def hiddenControlledPath : List Event :=
  [.click "home.work.w1Rooming", .click "w1Rooming.nav.w1Orders",
   .enter "w1Orders.drug" (.code "oxycodone"),
   .click "w1Orders.toSign", .click "w1Verify.continue"]
def hiddenControlledSign : State :=
  hiddenControlledEp.afterHuman hiddenControlledEp.start hiddenControlledPath

/-- Select the actual page item without deciding equality of entire view
items (which also compute all captured values and presentation metadata). -/
private theorem commitShown_of_any (ep : Episode) (s : State) (commit : CommitId)
    (h : (ep.prog.compsOf s.screen).any (fun c =>
      c.kind == .button (.commit commit) &&
        compShown ep.spec ep.facts s (ep.prog.compsOf s.screen) c) = true) :
    CommitButtonShown ep s commit := by
  obtain ⟨c, hc, ht⟩ := List.any_eq_true.mp h
  simp only [Bool.and_eq_true, beq_iff_eq] at ht
  obtain ⟨hk, hs⟩ := ht
  exact ⟨itemView ep.spec ep.facts s (ep.prog.compsOf s.screen) c,
    List.mem_map.mpr ⟨c, hc, rfl⟩, hs, hk⟩

-- Kernel reduction traverses the full role-projected canonical fixture.
set_option maxHeartbeats 1200000 in
theorem bad15_not_satisfies : ¬ Satisfies specV1 none canonicalV1 hiddenControlledDetails := by
  intro hs
  have hr := (hs.2.2.2.1 replayFacts (replayUser hiddenControlledDetails) rfl).2
    hiddenControlledSign
    (reachable_afterHuman hiddenControlledEp hiddenControlledPath hiddenControlledEp.start .start)
    "signOrders" (commitShown_of_any _ _ _ (by decide +kernel)) (controlledRxReview signOrders)
    (by decide +kernel) rfl rfl
  have hf : reviewMet specV1 hiddenControlledDetails replayFacts hiddenControlledSign
      (controlledRxReview signOrders) = false := by decide +kernel
  have ht := (reviewMet_iff hiddenControlledEp hiddenControlledSign _).mpr hr
  change reviewMet specV1 hiddenControlledDetails replayFacts hiddenControlledSign _ = true at ht
  rw [hf] at ht
  contradiction

#print axioms bad13_preop_not_satisfies
#print axioms bad15_not_satisfies
end Ehr.Check
