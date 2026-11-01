import Ehr.Canonical.BadTests

/-!
Removing one workflow's CURES paths can leave another valid review receipt.
This regression preserves that case so rejection cannot rely on the missing
paths alone.
-/
namespace Ehr.Check
open Ehr Ehr.Canonical Ehr.Canonical.Tests

/-- The old W1-only mutation, retained to document why seed 13 was strengthened. -/
def oldW1NoCures : Program :=
  ((Bad.base 13).updateScreen "w1Sign" fun s => s.dropComp "w1Sign.cures")
  |>.updateScreen "w1Orders" fun s =>
    { s with components := s.components.filter fun c =>
        !["w1Orders.orderInfo.curesReport", "w1Orders.review.curesReport"].contains c.id &&
        c.id != "w1Orders.controlled" && c.parent? != some "w1Orders.controlled" }

def seed13ReceiptPath : List Event :=
  [.click "w1Sign.home", .click "home.work.w3TrackBoard", .click "w3TrackBoard.open",
   .click "w3Triage.nav.w3Orders", .selectTab "w3Orders.orderInfo" 1,
   .click "w3Orders.review.curesReport", .click "w3Orders.home",
   .click "home.work.w1Rooming", .click "w1Rooming.nav.w1Orders",
   .click "w1Orders.toSign", .click "w1Verify.continue"]

def seed13WithReceipt : State :=
  more (run (opioidPath) oldW1NoCures) seed13ReceiptPath oldW1NoCures

#guard seed13WithReceipt.receipts.any (·.info == "curesReport")
#guard (finish seed13WithReceipt "w1Sign" "signOrders" oldW1NoCures).commits == ["signOrders"]
end Ehr.Check
