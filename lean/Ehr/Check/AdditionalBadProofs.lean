import Ehr.Check.BadProofs
import Ehr.Check.DomainObstruction

set_option Elab.async false
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

private theorem noCuresButton : (noCuresPreopEp.prog.compsOf noCuresPreopSign.screen).any (fun c =>
    c.kind == .button (.commit "signOrders") &&
      compShown noCuresPreopEp.spec noCuresPreopEp.facts noCuresPreopSign
        (noCuresPreopEp.prog.compsOf noCuresPreopSign.screen) c) = true := by decide +kernel

private theorem preopRequirement : mustShow signOrders anticoagulantList (.encounter "preop") ∈ specV1.reviews := by decide +kernel
private theorem noCuresReviewFalse : reviewMet specV1 noCures preopFacts noCuresPreopSign
    (mustShow signOrders anticoagulantList (.encounter "preop")) = false := by decide +kernel

theorem bad13_preop_not_satisfies : ¬ Satisfies specV1 none canonicalV1 noCures :=
  review_violation noCuresPreopEp none canonicalV1 rfl noCuresPreopSign
    (reachable_afterHuman noCuresPreopEp hiddenPath noCuresPreopEp.start .start)
    "signOrders" noCuresButton (mustShow signOrders anticoagulantList (.encounter "preop"))
    preopRequirement rfl rfl noCuresReviewFalse

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

private theorem controlledButton : (hiddenControlledEp.prog.compsOf hiddenControlledSign.screen).any (fun c =>
    c.kind == .button (.commit "signOrders") &&
      compShown hiddenControlledEp.spec hiddenControlledEp.facts hiddenControlledSign
        (hiddenControlledEp.prog.compsOf hiddenControlledSign.screen) c) = true := by decide +kernel
private theorem controlledRequirement : controlledRxReview signOrders ∈ specV1.reviews := by decide +kernel
private theorem controlledReviewFalse : reviewMet specV1 hiddenControlledDetails replayFacts hiddenControlledSign
    (controlledRxReview signOrders) = false := by decide +kernel

/-- The controlled-order review is actually hidden on a reachable signing screen. -/
theorem bad15_not_satisfies : ¬ Satisfies specV1 none canonicalV1 hiddenControlledDetails :=
  review_violation hiddenControlledEp none canonicalV1 rfl hiddenControlledSign
    (reachable_afterHuman hiddenControlledEp hiddenControlledPath hiddenControlledEp.start .start)
    "signOrders" controlledButton (controlledRxReview signOrders) controlledRequirement rfl rfl controlledReviewFalse

#print axioms bad13_preop_not_satisfies
#print axioms bad15_not_satisfies
end Ehr.Check
