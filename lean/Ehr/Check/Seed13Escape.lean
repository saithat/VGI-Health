import Ehr.Canonical.BadTests

/-! Diagnostic for the original seed-13 request. Removing the W1 CURES
paths does not remove another workflow's real, prescriber-reviewed receipt.
This counter-regression keeps the outstanding mutation issue reproducible. -/
namespace Ehr.Check
open Ehr Ehr.Canonical Ehr.Canonical.Tests

def seed13ReceiptPath : List Event :=
  [.click "w1Sign.home", .click "home.work.w3TrackBoard", .click "w3TrackBoard.open",
   .click "w3Triage.nav.w3Orders", .selectTab "w3Orders.orderInfo" 1,
   .click "w3Orders.review.curesReport", .click "w3Orders.home",
   .click "home.work.w1Rooming", .click "w1Rooming.nav.w1Orders",
   .click "w1Orders.toSign", .click "w1Verify.continue"]

def seed13WithReceipt : State :=
  more (run (opioidPath) Bad.noCures) seed13ReceiptPath Bad.noCures

#guard seed13WithReceipt.receipts.any (·.info == "curesReport")
#guard (finish seed13WithReceipt "w1Sign" "signOrders" Bad.noCures).commits == ["signOrders"]
end Ehr.Check
