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

/-- Seed 22 is rejected by the full-profile payload-domain obstruction.
FullSeedTests independently checks its hidden signing-notice rule and replay. -/
theorem bad22_not_satisfies : ¬ Satisfies specV1 none canonicalV1 hiddenSigningNotice :=
  seed_payload_not_satisfies hiddenSigningNotice (by decide +kernel) (by decide +kernel)

#print axioms bad22_not_satisfies
#print axioms noticeReq_mem
end Ehr.Check
