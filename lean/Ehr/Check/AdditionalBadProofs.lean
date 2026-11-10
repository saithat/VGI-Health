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

theorem bad13_preop_not_satisfies : ¬ Satisfies specV1 none canonicalV1 noCures :=
  seed_payload_not_satisfies noCures (by decide +kernel) (by decide +kernel)

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

/-- The original rejection statement, using the full-profile payload-domain
obstruction within the memory budget. FullSeedTests checks this mutation's
controlled-review rule and replay separately. -/
theorem bad15_not_satisfies : ¬ Satisfies specV1 none canonicalV1 hiddenControlledDetails :=
  seed_payload_not_satisfies hiddenControlledDetails (by decide +kernel) (by decide +kernel)

/-- Seed 16's default-and-stranding mutation is also rejected. Its zero-refills
hard stop and inability to correct the value are checked in BadTests, and its
completion rule/replay in FullSeedTests. This kernel theorem shares the trusted
payload-domain obstruction rather than claiming mutation-specific detection. -/
theorem bad16_not_satisfies : ¬ Satisfies specV1 none canonicalV1 scheduleIIRefills :=
  seed_payload_not_satisfies scheduleIIRefills (by decide +kernel) (by decide +kernel)

#print axioms bad13_preop_not_satisfies
#print axioms bad15_not_satisfies
#print axioms bad16_not_satisfies
end Ehr.Check
