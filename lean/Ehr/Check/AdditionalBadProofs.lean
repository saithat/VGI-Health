import Ehr.Check.BadProofs
import Ehr.Check.DomainObstruction
import Ehr.Check.FullDisplayObstruction

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1

set_option maxRecDepth 16384

/-- Seed 13's former pre-op display witness is repaired by required-review
pinning. Its rejection theorem retains the shared full-profile payload-domain
obstruction. The CURES mutation is independently checked by FullSeedTests's
completion regression; this theorem does not establish CURES-specific detection. -/
def noCuresPreopEp : Episode :=
  ⟨specV1, noCures, preopFacts, replayUser noCures⟩

def noCuresPreopSign : State :=
  noCuresPreopEp.afterHuman noCuresPreopEp.start hiddenPath

private theorem noCuresButton : (noCuresPreopEp.prog.compsOf noCuresPreopSign.screen).any (fun c =>
    c.kind == .button (.commit "signOrders") &&
      compShown noCuresPreopEp.spec noCuresPreopEp.facts noCuresPreopSign
        (noCuresPreopEp.prog.compsOf noCuresPreopSign.screen) c) = true := by decide +kernel

private theorem noCuresRequired : "signOrders" ∈ requiredCommits specV1 canonicalV1 noCures := by
  obtain ⟨c, hc, hk⟩ := List.any_eq_true.mp noCuresButton
  have kind : c.kind = .button (.commit "signOrders") :=
    beq_iff_eq.mp (Bool.and_eq_true.mp hk).1
  change c ∈ noCures.compsOf noCuresPreopSign.screen at hc
  cases hs : noCures.screen? noCuresPreopSign.screen with
  | none => simp [Program.compsOf, hs] at hc
  | some scr =>
    have member : (scr, c) ∈ allComps noCures :=
      List.mem_flatMap.mpr ⟨scr, List.mem_of_find?_eq_some hs,
        List.mem_map.mpr ⟨c, by simpa [Program.compsOf, hs] using hc, rfl⟩⟩
    exact required_of_component specV1 canonicalV1 noCures (scr, c) member "signOrders"
      kind signOrders (by decide +kernel) (by decide +kernel)

theorem bad13_preop_not_satisfies : ¬ Satisfies specV1 none canonicalV1 noCures :=
  v1_payload_domain_not_satisfies canonicalV1 noCures ⟨"signOrders", noCuresRequired⟩

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
#print axioms noCuresButton
#print axioms noCuresRequired
#print axioms controlledButton
#print axioms controlledRequirement
#print axioms controlledReviewFalse

end Ehr.Check
