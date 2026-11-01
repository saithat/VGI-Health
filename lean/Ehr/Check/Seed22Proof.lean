import Ehr.Check.AdditionalBadProofs

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

private def noticeEpisode : Episode :=
  ⟨specV1, hiddenSigningNotice, replayFacts, replayUser hiddenSigningNotice⟩
private def noticeState : State := noticeEpisode.afterHuman noticeEpisode.start hiddenControlledPath
private def noticeReq : ReviewReq :=
  { commit := "signOrders", info := "controlledSigningLegalNotice", mode := .shownOnCommit,
    when := .orderClass "controlled-II-IV" }
private theorem noticeReq_mem : noticeReq ∈ specV1.reviews := by decide +kernel

private theorem noticeButton : (hiddenSigningNotice.compsOf noticeState.screen).any (fun c =>
    c.kind == .button (.commit "signOrders") &&
      compShown specV1 replayFacts noticeState (hiddenSigningNotice.compsOf noticeState.screen) c) = true := by
  decide +kernel
private theorem noticeNotMet :
    reviewMet specV1 hiddenSigningNotice replayFacts noticeState noticeReq = false := by decide +kernel

/-- Seed 22 hides the required controlled-prescription signing notice while
leaving the signing button shown for a controlled order. -/
theorem bad22_not_satisfies : ¬ Satisfies specV1 none canonicalV1 hiddenSigningNotice :=
  review_violation noticeEpisode none canonicalV1 rfl noticeState
    (reachable_afterHuman noticeEpisode hiddenControlledPath noticeEpisode.start .start)
    "signOrders" noticeButton noticeReq noticeReq_mem rfl rfl noticeNotMet

#print axioms bad22_not_satisfies
end Ehr.Check
